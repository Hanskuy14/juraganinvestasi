/* =========================================================================
   portfolio.js — buy/sell mechanics.

   Phase 5 CRITICAL RULE
   ---------------------
   companyXP is awarded ONLY here, ONLY on a profitable sellAsset() call.
   Formula:
       profit = (currentPrice - averageBuyPrice) * units
       if (profit > 0)  xp = 50 + floor(profit / 1_000_000)
       else             xp = 0  (cut-loss earns no XP)

   No XP is awarded on buys, on holding, or on the Next Day loop.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Helpers ---------- */
  function findPosition(state, ticker) {
    return (state.portfolio || []).find(p => p.ticker === ticker) || null;
  }

  /* Pick the bank with the highest balance for crediting / debiting cash. */
  function richestBank(state) {
    if (!state.banks || state.banks.length === 0) return null;
    return state.banks.reduce((best, b) =>
      (best == null || b.balance > best.balance) ? b : best, null);
  }

  function bankById(state, id) {
    return (state.banks || []).find(b => b.id === id) || null;
  }

  /* Choose a debit bank: explicit id if given & sufficient, else any with enough,
     else the richest (allowing potential overdraft to negative). */
  function chooseDebitBank(state, preferredId, amount) {
    if (preferredId) {
      const b = bankById(state, preferredId);
      if (b && b.balance >= amount) return b;
    }
    const cap = (state.banks || []).find(b => b.balance >= amount);
    if (cap) return cap;
    return richestBank(state);
  }

  /* ============================================================
     BUY
     ============================================================ */
  function buyAsset(state, ticker, qty, opts = {}) {
    const asset = JI.getAsset(ticker);
    if (!asset) return { ok: false, error: 'Aset tidak ditemukan.' };

    const q = Math.max(0, Math.floor(Number(qty) || 0));
    if (q <= 0) return { ok: false, error: 'Jumlah unit harus lebih dari 0.' };

    /* Phase 6 — circulating supply cap on local stocks. */
    if (asset.category === 'stock' && asset.outstandingShares) {
      const avail = typeof JI.availableSupply === 'function'
        ? JI.availableSupply(state, ticker)
        : Infinity;
      if (q > avail) {
        const totalShares = asset.outstandingShares.toLocaleString('id-ID');
        const availStr = avail.toLocaleString('id-ID');
        return {
          ok: false,
          error: `Supply ${ticker} tidak cukup. Beredar ${totalShares} lembar, sisa ${availStr}.`,
        };
      }
    }

    const price = JI.getCurrentPrice(state, ticker);
    if (!price || price <= 0) {
      return { ok: false, error: 'Harga aset belum tersedia.' };
    }

    const cost = price * q;
    const debit = chooseDebitBank(state, opts.fromBankId, cost);
    if (!debit) return { ok: false, error: 'Tidak ada rekening untuk pembayaran.' };
    if (debit.balance < cost) {
      return {
        ok: false,
        error: `Saldo ${debit.shortName} tidak cukup. Butuh ${JI.formatIDR(cost)}.`,
      };
    }

    debit.balance -= cost;

    let pos = findPosition(state, ticker);
    if (!pos) {
      pos = { ticker, qty: 0, avgPrice: 0 };
      state.portfolio.push(pos);
    }
    const newQty = pos.qty + q;
    // weighted average price
    pos.avgPrice = Math.round(((pos.avgPrice * pos.qty) + (price * q)) / newQty);
    pos.qty = newQty;

    JI.recomputeNetWorth(state);

    return {
      ok: true,
      ticker,
      qty: q,
      price,
      cost,
      bankId: debit.id,
      bankName: debit.shortName,
      avgPrice: pos.avgPrice,
      totalQty: pos.qty,
    };
  }

  /* ============================================================
     SELL  (the only place that awards XP in Phase 5)
     ============================================================ */
  function sellAsset(state, ticker, qty, opts = {}) {
    const asset = JI.getAsset(ticker);
    if (!asset) return { ok: false, error: 'Aset tidak ditemukan.' };

    const pos = findPosition(state, ticker);
    if (!pos || pos.qty <= 0) {
      return { ok: false, error: 'Anda tidak memegang aset ini.' };
    }

    const q = Math.max(0, Math.floor(Number(qty) || 0));
    if (q <= 0) return { ok: false, error: 'Jumlah unit harus lebih dari 0.' };
    if (q > pos.qty) {
      return { ok: false, error: `Hanya memiliki ${pos.qty} unit ${ticker}.` };
    }

    const currentPrice = JI.getCurrentPrice(state, ticker);
    if (!currentPrice || currentPrice <= 0) {
      return { ok: false, error: 'Harga aset belum tersedia.' };
    }

    const proceeds = currentPrice * q;
    const profit   = (currentPrice - pos.avgPrice) * q; // can be negative

    // Credit proceeds to chosen / richest bank
    const credit = opts.toBankId
      ? bankById(state, opts.toBankId)
      : richestBank(state);
    if (!credit) {
      return { ok: false, error: 'Tidak ada rekening tujuan untuk pencairan dana.' };
    }
    credit.balance += proceeds;

    // Reduce / remove position
    pos.qty -= q;
    if (pos.qty === 0) {
      const idx = state.portfolio.indexOf(pos);
      if (idx >= 0) state.portfolio.splice(idx, 1);
    }

    /* ---------- Phase 5 XP Rule ---------- */
    let xpAwarded = 0;
    let leveledUp = false;
    if (profit > 0) {
      xpAwarded = 50 + Math.floor(profit / 1_000_000);
      leveledUp = JI.awardXP(state, xpAwarded);
    }
    // Cut-loss (profit <= 0) earns 0 XP. No deduction either.

    JI.recomputeNetWorth(state);

    return {
      ok: true,
      ticker,
      qty: q,
      price: currentPrice,
      proceeds,
      profit,
      bankId: credit.id,
      bankName: credit.shortName,
      xpAwarded,
      leveledUp,
    };
  }

  /* ============================================================
     GORENG SAHAM (Phase 6)
     A Bandar (>=50% owner of a local stock) can spend Rp 5 Miliar to
     "goreng" their position: this debits the richest bank (no overdraft,
     no split — same rule as Mega Infrastruktur), queues a guaranteed
     +40% multiplier into state.pendingNewsEffects (lands NEXT day),
     and pushes a [GORENG] headline into the news feed the SAME day.
     One-shot per ticker — once gorenged it's blocked forever.
     ============================================================ */
  const GORENG_COST = 5_000_000_000; // Rp 5 Miliar
  const GORENG_MULT = 0.40;          // +40% next day

  function gorengSaham(state, ticker) {
    const asset = JI.getAsset(ticker);
    if (!asset || asset.category !== 'stock' || !asset.outstandingShares) {
      return { ok: false, error: 'Hanya saham lokal IDX yang bisa digoreng.' };
    }

    if (typeof JI.isBandar !== 'function' || !JI.isBandar(state, ticker)) {
      const pct = (typeof JI.ownershipPct === 'function')
        ? (JI.ownershipPct(state, ticker) * 100).toFixed(2)
        : '0.00';
      return {
        ok: false,
        error: `Status Bandar belum aktif (kepemilikan ${pct}% / butuh ≥50%).`,
      };
    }

    state.gorengedTickers = state.gorengedTickers || {};
    if (state.gorengedTickers[ticker]) {
      return { ok: false, error: `${ticker} sudah pernah digoreng. Sekali jalan saja.` };
    }

    const bank = richestBank(state);
    if (!bank) return { ok: false, error: 'Tidak ada rekening untuk pembayaran.' };
    if (bank.balance < GORENG_COST) {
      return {
        ok: false,
        error: `Saldo ${bank.shortName} tidak cukup. Butuh ${JI.formatIDR(GORENG_COST)} cash di satu rekening.`,
      };
    }

    // Debit (no split, no overdraft).
    bank.balance -= GORENG_COST;
    state.gorengedTickers[ticker] = {
      day: state.totalDays || 1,
      bankId: bank.id,
    };

    // Queue +40% multiplier for tomorrow.
    state.pendingNewsEffects = state.pendingNewsEffects || [];
    state.pendingNewsEffects.push({
      ticker,
      multiplier: GORENG_MULT,
      sourceDay: state.totalDays || 1,
      source: 'goreng',
    });

    // Surface a [GORENG] headline TODAY in the news feed.
    if (typeof JI.buildGorengHeadline === 'function') {
      const headline = JI.buildGorengHeadline(state, ticker);
      if (headline) {
        state.todaysNews = Array.isArray(state.todaysNews) ? state.todaysNews : [];
        state.todaysNews.unshift(headline);
        state.newsHistory = Array.isArray(state.newsHistory) ? state.newsHistory : [];
        state.newsHistory.unshift(headline);
        if (state.newsHistory.length > 200) state.newsHistory.length = 200;
      }
    }

    JI.recomputeNetWorth(state);

    return {
      ok: true,
      ticker,
      cost: GORENG_COST,
      multiplier: GORENG_MULT,
      bankId: bank.id,
      bankName: bank.shortName || bank.name,
    };
  }

  /* ============================================================
     Read helpers
     ============================================================ */
  function positionSnapshot(state, pos) {
    const px = JI.getCurrentPrice(state, pos.ticker);
    const marketValue = px * pos.qty;
    const costBasis   = pos.avgPrice * pos.qty;
    const pnl         = marketValue - costBasis;
    const pnlPct      = costBasis > 0 ? pnl / costBasis : 0;
    return { ticker: pos.ticker, qty: pos.qty, avgPrice: pos.avgPrice,
             currentPrice: px, marketValue, costBasis, pnl, pnlPct };
  }

  function portfolioMarketValue(state) {
    return (state.portfolio || []).reduce((a, p) => {
      const px = JI.getCurrentPrice(state, p.ticker);
      return a + px * p.qty;
    }, 0);
  }

  /* ============================================================
     ADD (Phase 7) — grant shares without debiting any bank.
     Used by: e-IPO allotments, the player's own Startup IPO.
     ============================================================ */
  function addToPortfolio(state, ticker, qty, avgPrice) {
    const q = Math.max(0, Math.floor(Number(qty) || 0));
    const p = Math.max(1, Math.floor(Number(avgPrice) || 0));
    if (q <= 0) return null;
    if (!state.portfolio) state.portfolio = [];

    let pos = findPosition(state, ticker);
    if (!pos) {
      pos = { ticker, qty: 0, avgPrice: 0 };
      state.portfolio.push(pos);
    }
    const newQty = pos.qty + q;
    pos.avgPrice = Math.round(((pos.avgPrice * pos.qty) + (p * q)) / newQty);
    pos.qty = newQty;
    JI.recomputeNetWorth(state);
    return pos;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    buyAsset,
    sellAsset,
    addToPortfolio,
    findPosition,
    positionSnapshot,
    portfolioMarketValue,
    // Phase 6 — Bandar / Goreng Saham
    gorengSaham,
    GORENG_COST,
    GORENG_MULT,
  });
})(window);
