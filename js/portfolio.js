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

  function ownedUnits(state, ticker) {
    const pos = findPosition(state, ticker);
    return pos ? pos.qty : 0;
  }

  /* Phase 6: Bandar / Hostile Takeover helpers (Local Stocks ONLY).
     - availableSupply = outstandingShares - ownedUnits
     - ownershipPct    = ownedUnits / outstandingShares  (0..1)
     - isBandar        = ownershipPct >= 0.5
  */
  function availableSupply(state, ticker) {
    const asset = JI.getAsset(ticker);
    if (!asset || asset.category !== 'stock' || !asset.outstandingShares) {
      return Infinity;
    }
    return Math.max(0, asset.outstandingShares - ownedUnits(state, ticker));
  }

  function ownershipPct(state, ticker) {
    const asset = JI.getAsset(ticker);
    if (!asset || !asset.outstandingShares) return 0;
    return ownedUnits(state, ticker) / asset.outstandingShares;
  }

  function isBandar(state, ticker) {
    return ownershipPct(state, ticker) >= 0.5;
  }

  function ownershipLabel(state, ticker) {
    const asset = JI.getAsset(ticker);
    if (!asset || asset.category !== 'stock' || !asset.outstandingShares) {
      return null;
    }
    const pct = ownershipPct(state, ticker);
    return isBandar(state, ticker)
      ? 'Pemegang Saham Pengendali (Bandar)'
      : pct > 0 ? 'Pemegang Saham Minoritas' : null;
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

    /* Phase 6: enforce circulating supply for the 15 Local Stocks. */
    if (asset.category === 'stock' && asset.outstandingShares) {
      const avail = availableSupply(state, ticker);
      if (q > avail) {
        const sup = asset.outstandingShares.toLocaleString('id-ID');
        return {
          ok: false,
          error: `Suplai beredar habis! Hanya ${avail.toLocaleString('id-ID')} dari ${sup} lembar yang tersisa untuk dibeli.`,
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
     Phase 6: "Goreng Saham" — Bandar Perk (>=50% ownership)
     Cost: Rp 5.000.000.000 (5 Miliar) deducted from richest bank.
     Effect: queues a +40% guaranteed price spike for the targeted
             stock by pushing into state.pendingNewsEffects (applied
             on the NEXT calculateNextDayPrices call).
     ============================================================ */
  const GORENG_COST = 5_000_000_000;
  const GORENG_MULTIPLIER = 0.40;

  function gorengSaham(state, ticker) {
    const asset = JI.getAsset(ticker);
    if (!asset || asset.category !== 'stock') {
      return { ok: false, error: 'Hanya saham IDX yang bisa di-goreng.' };
    }
    if (!isBandar(state, ticker)) {
      return {
        ok: false,
        error: 'Anda harus memegang minimal 50% (Bandar) untuk goreng saham ini.',
      };
    }

    // Prevent stacking multiple goreng on the same ticker for the same day.
    state.pendingNewsEffects = state.pendingNewsEffects || [];
    if (state.pendingNewsEffects.some(e => e.ticker === ticker && e.source === 'goreng')) {
      return { ok: false, error: 'Saham ini sudah Anda goreng untuk besok. Tunggu efeknya.' };
    }

    const bank = richestBank(state);
    if (!bank || bank.balance < GORENG_COST) {
      return {
        ok: false,
        error: `Butuh ${JI.formatIDR(GORENG_COST)} cash di rekening terkaya untuk operasi goreng.`,
      };
    }

    bank.balance -= GORENG_COST;
    state.pendingNewsEffects.push({
      ticker,
      multiplier: GORENG_MULTIPLIER,
      source: 'goreng',
    });

    // Surface a "leaked" news headline today so the player can SEE the
    // Bandar move in their News feed (price impact still lands tomorrow).
    const news = {
      day: state.totalDays,
      ticker,
      name: asset.name,
      category: 'stock',
      sentiment: 'bullish',
      multiplier: GORENG_MULTIPLIER,
      headline: `[GORENG] Saham ${asset.name} Diborong Pihak Misterius Jelang Penutupan!`,
      body: `Bursa Saham · ${ticker} — Bandar saham bermain. Volume meledak, harga diperkirakan melonjak +40% besok.`,
      source: 'goreng',
    };
    state.todaysNews = state.todaysNews || [];
    state.todaysNews.push(news);
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(news);
    if (state.newsHistory.length > 200) state.newsHistory.length = 200;

    if (typeof JI.recomputeNetWorth === 'function') JI.recomputeNetWorth(state);

    return {
      ok: true,
      ticker,
      cost: GORENG_COST,
      multiplier: GORENG_MULTIPLIER,
      bankName: bank.shortName || bank.name,
    };
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    buyAsset,
    sellAsset,
    findPosition,
    positionSnapshot,
    portfolioMarketValue,
    // Phase 6
    ownedUnits,
    availableSupply,
    ownershipPct,
    isBandar,
    ownershipLabel,
    gorengSaham,
    GORENG_COST,
    GORENG_MULTIPLIER,
  });
})(window);
