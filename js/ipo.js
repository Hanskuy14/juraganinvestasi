/* =========================================================================
   ipo.js — Phase 7 Dynamic e-IPO Ordering & Allotment (Penjatahan)
   --------------------------------------------------------------------------
   * 15 hardcoded NPC companies sit in `state.ipoPool`.
   * Each Next Day there is a 5% chance to spawn one into `state.activeIPOs`.
   * Player can place ONE order per active IPO (cash held in escrow).
   * Each Next Day, every ordered IPO has a 10% chance to officially list:
       - Allotment percentage drawn from a hype-tier band.
       - Allotted Rp -> shares at offering price -> player portfolio.
       - Unallotted Rp refunded to the source bank.
       - Company is moved into the global market (Category 1 / stock).
   * Once moved, the company is removed from ipoPool AND activeIPOs forever.
   ========================================================================= */

(function (global) {
  'use strict';
  const JI = global.JI || (global.JI = {});

  /* ---------- Spawn / list probabilities ---------- */
  const SPAWN_CHANCE   = 0.05;  // 5% per Next Day
  const LIST_CHANCE    = 0.10;  // 10% per Next Day per ordered IPO

  /* ---------- Allotment bands (random pct of order filled) ---------- */
  const ALLOTMENT_BANDS = {
    High:   { min: 5,  max: 30  },  // hot IPO -> tiny piece
    Medium: { min: 25, max: 60  },
    Low:    { min: 50, max: 100 },  // unloved -> big piece
  };

  /* ---------- The 15 unlisted NPC companies ---------- */
  const IPO_POOL_DEFS = [
    { ticker: 'FOOD', name: 'FoodNusantara',     sector: 'Consumer', offeringPrice: 850,  outstandingShares: 30_000_000, hypeLevel: 'High'   },
    { ticker: 'BATT', name: 'BateraiMaju',        sector: 'Energy',   offeringPrice: 600,  outstandingShares: 25_000_000, hypeLevel: 'High'   },
    { ticker: 'AERO', name: 'AeroSpaceID',        sector: 'Industri', offeringPrice: 950,  outstandingShares: 15_000_000, hypeLevel: 'High'   },
    { ticker: 'GOLD', name: 'TambangEmas',        sector: 'Mining',   offeringPrice: 720,  outstandingShares: 20_000_000, hypeLevel: 'Medium' },
    { ticker: 'MEDS', name: 'RumahSakitJaya',     sector: 'Pharma',   offeringPrice: 500,  outstandingShares: 18_000_000, hypeLevel: 'Medium' },
    { ticker: 'TANI', name: 'TaniSuper',          sector: 'Consumer', offeringPrice: 250,  outstandingShares: 50_000_000, hypeLevel: 'Low'    },
    { ticker: 'KOSM', name: 'KosmetikJaya',       sector: 'Consumer', offeringPrice: 680,  outstandingShares: 12_000_000, hypeLevel: 'High'   },
    { ticker: 'BAJA', name: 'BajaNusantara',      sector: 'Mining',   offeringPrice: 400,  outstandingShares: 35_000_000, hypeLevel: 'Low'    },
    { ticker: 'TECH', name: 'TechMasaDepan',      sector: 'Tech',     offeringPrice: 1000, outstandingShares: 10_000_000, hypeLevel: 'High'   },
    { ticker: 'SWIT', name: 'SawitMakmur',        sector: 'Consumer', offeringPrice: 320,  outstandingShares: 40_000_000, hypeLevel: 'Medium' },
    { ticker: 'PROP', name: 'PropertiIndah',      sector: 'Property', offeringPrice: 480,  outstandingShares: 22_000_000, hypeLevel: 'Medium' },
    { ticker: 'FAST', name: 'LogistikCepat',      sector: 'Logistik', offeringPrice: 300,  outstandingShares: 45_000_000, hypeLevel: 'Low'    },
    { ticker: 'AMAN', name: 'AsuransiAman',       sector: 'Bank',     offeringPrice: 550,  outstandingShares: 28_000_000, hypeLevel: 'Low'    },
    { ticker: 'BANK', name: 'BankRakyat',         sector: 'Bank',     offeringPrice: 780,  outstandingShares: 32_000_000, hypeLevel: 'Medium' },
    { ticker: 'MART', name: 'RetailMaju',         sector: 'Consumer', offeringPrice: 100,  outstandingShares: 50_000_000, hypeLevel: 'Low'    },
  ];

  /* ---------- One-time pool initialization ----------
     Skip tickers that already exist as listed assets (extreme safety). */
  function ensureIPOPool(state) {
    if (Array.isArray(state.ipoPool)) return;
    const taken = new Set((JI.ASSETS || []).map(a => a.ticker));
    state.ipoPool = IPO_POOL_DEFS
      .filter(c => !taken.has(c.ticker))
      .map(c => ({ ...c }));
    state.activeIPOs = state.activeIPOs || [];
    state.ipoHistory = state.ipoHistory || [];
  }

  /* ---------- Lookups ---------- */
  function getActiveIPO(state, ticker) {
    return (state.activeIPOs || []).find(c => c.ticker === ticker) || null;
  }

  function hypeBadgeClass(hype) {
    return ({ High: 'hype-high', Medium: 'hype-medium', Low: 'hype-low' })[hype] || 'hype-low';
  }

  /* ---------- Spawn one IPO from pool to active (Next Day) ---------- */
  function maybeSpawnIPO(state) {
    ensureIPOPool(state);
    if (!state.ipoPool.length) return null;
    if (Math.random() >= SPAWN_CHANCE) return null;

    const idx = Math.floor(Math.random() * state.ipoPool.length);
    const company = state.ipoPool.splice(idx, 1)[0];

    // Add fresh fields the order/listing flow needs.
    company.spawnedDay = state.totalDays;
    company.playerOrder = null; // {amountRupiah, bankId, orderedDay}

    state.activeIPOs.push(company);
    return company;
  }

  /* ---------- Place an order on an active IPO ----------
     Cash is taken IMMEDIATELY from the chosen bank (escrow).
     One order per company. */
  function placeOrder(state, ticker, amountRupiah, bankId) {
    ensureIPOPool(state);
    const ipo = getActiveIPO(state, ticker);
    if (!ipo) return { ok: false, error: 'IPO tidak ditemukan / sudah listing.' };
    if (ipo.playerOrder) return { ok: false, error: 'Anda sudah memesan IPO ini.' };

    const amt = Math.floor(Number(amountRupiah) || 0);
    if (amt < ipo.offeringPrice) {
      return { ok: false, error: `Pesanan minimum 1 lembar (${JI.formatIDR(ipo.offeringPrice)}).` };
    }
    const bank = JI.getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };
    if (bank.balance < amt) {
      return { ok: false, error: `Saldo ${bank.shortName} tidak mencukupi.` };
    }

    bank.balance -= amt;
    ipo.playerOrder = {
      amountRupiah: amt,
      bankId: bank.id,
      orderedDay: state.totalDays,
    };

    JI.recomputeNetWorth(state);
    return { ok: true, ticker, amount: amt, bankName: bank.shortName };
  }

  /* ---------- Cancel a pending order — returns escrow ---------- */
  function cancelOrder(state, ticker) {
    const ipo = getActiveIPO(state, ticker);
    if (!ipo || !ipo.playerOrder) return { ok: false, error: 'Tidak ada pesanan aktif.' };

    const bank = JI.getBank(state, ipo.playerOrder.bankId) || JI.getBank(state, (state.banks[0] || {}).id);
    const amt = ipo.playerOrder.amountRupiah;
    if (bank) bank.balance += amt;
    ipo.playerOrder = null;
    JI.recomputeNetWorth(state);
    return { ok: true, refunded: amt, bankName: bank ? bank.shortName : '-' };
  }

  /* ---------- Helper: list an IPO and settle the player order ----------
     Mutates state.activeIPOs (removes the company), pushes to dynamic
     market, refunds unallotted escrow, and credits allotted shares. */
  function _listIPO(state, ipo) {
    // 1. Mutate global market — new Category-1 stock asset.
    const asset = JI.addDynamicAsset(state, {
      ticker: ipo.ticker,
      name: ipo.name,
      category: 'stock',
      sector: ipo.sector || 'Lainnya',
      initialPrice: ipo.offeringPrice,
      volatility: 0.026,
    });

    let refundedAmount = 0;
    let allottedShares = 0;
    let allottedAmount = 0;
    let allotPct = 0;
    let bankName = '';

    // 2. If the player ordered, settle penjatahan.
    if (ipo.playerOrder) {
      const order = ipo.playerOrder;
      const band = ALLOTMENT_BANDS[ipo.hypeLevel] || ALLOTMENT_BANDS.Medium;
      allotPct = JI.randomFloat(band.min, band.max); // %
      allottedAmount = Math.floor(order.amountRupiah * (allotPct / 100));
      allottedShares = Math.floor(allottedAmount / ipo.offeringPrice);
      const cashUsed = allottedShares * ipo.offeringPrice;
      refundedAmount = order.amountRupiah - cashUsed;

      // Refund the unallotted portion to the original bank.
      const bank = JI.getBank(state, order.bankId) || JI.getBank(state, (state.banks[0] || {}).id);
      if (bank) {
        bank.balance += refundedAmount;
        bankName = bank.shortName;
      }

      // Credit allotted shares.
      if (asset && allottedShares > 0) {
        JI.addToPortfolio(state, ipo.ticker, allottedShares, ipo.offeringPrice);
      }
    }

    // 3. Remove from activeIPOs forever.
    const idx = state.activeIPOs.findIndex(c => c.ticker === ipo.ticker);
    if (idx >= 0) state.activeIPOs.splice(idx, 1);

    // 4. Log
    state.ipoHistory = state.ipoHistory || [];
    state.ipoHistory.unshift({
      day: state.totalDays,
      ticker: ipo.ticker,
      name: ipo.name,
      type: 'list',
      hadOrder: !!ipo.playerOrder,
      allotPct: +allotPct.toFixed(1),
      allottedShares,
      allottedAmount,
      refundedAmount,
      bankName,
    });
    if (state.ipoHistory.length > 30) state.ipoHistory.length = 30;

    JI.recomputeNetWorth(state);

    return {
      ticker: ipo.ticker,
      name: ipo.name,
      hadOrder: !!ipo.playerOrder,
      allotPct: +allotPct.toFixed(1),
      allottedShares,
      allottedAmount,
      refundedAmount,
      bankName,
      offeringPrice: ipo.offeringPrice,
    };
  }

  /* ---------- Process listing rolls (Next Day) ----------
     Returns array of listing-result objects for UI notifications. */
  function processListings(state) {
    ensureIPOPool(state);
    if (!state.activeIPOs || !state.activeIPOs.length) return [];

    const results = [];
    // Walk a snapshot so we can mutate activeIPOs safely.
    const snapshot = state.activeIPOs.slice();
    for (const ipo of snapshot) {
      // Only ordered IPOs can list (per spec).
      if (!ipo.playerOrder) continue;
      if (Math.random() >= LIST_CHANCE) continue;
      results.push(_listIPO(state, ipo));
    }
    return results;
  }

  /* ---------- Read helpers for UI ---------- */
  function poolRemaining(state)    { ensureIPOPool(state); return (state.ipoPool   || []).length; }
  function activeIPOCount(state)   { ensureIPOPool(state); return (state.activeIPOs|| []).length; }
  function pendingOrderCount(state){
    ensureIPOPool(state);
    return (state.activeIPOs || []).filter(c => !!c.playerOrder).length;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    IPO_SPAWN_CHANCE:  SPAWN_CHANCE,
    IPO_LIST_CHANCE:   LIST_CHANCE,
    IPO_ALLOTMENT_BANDS: ALLOTMENT_BANDS,
    IPO_POOL_DEFS,
    ensureIPOPool,
    getActiveIPO,
    hypeBadgeClass,
    maybeSpawnIPO,
    placeOrder,
    cancelOrder,
    processListings,
    poolRemaining,
    activeIPOCount,
    pendingOrderCount,
  });
})(window);
