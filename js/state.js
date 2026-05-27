/* =========================================================================
   state.js — Central gameState + persistence + level system.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const STORAGE_KEY = 'juragan_investasi_state_v1';
  const STATE_VERSION = 2; // bumped in Phase 2
  const STARTING_CAPITAL = 150_000_000; // Rp 150jt

  /* ---------- Company titles by level ---------- */
  const COMPANY_TITLES = [
    /* L1  */ 'CV. Pemula',
    /* L2  */ 'CV. Berkembang',
    /* L3  */ 'PT. Investor Muda',
    /* L4  */ 'PT. Mitra Modal',
    /* L5  */ 'PT. Juragan Investasi',
    /* L6  */ 'PT. Holding Nusantara',
    /* L7  */ 'PT. Tycoon Capital',
    /* L8  */ 'PT. Conglomerate Group',
    /* L9  */ 'PT. Magnate Holdings',
    /* L10 */ 'PT. Imperium Kapitalis',
  ];

  /* XP needed to reach next level (index = current level - 1). */
  function xpToNext(level) {
    // Smooth curve: 1000, 2500, 5000, 8500, 13000, ...
    return 500 * level * (level + 1);
  }

  function getCompanyTitle(level) {
    const idx = JI.clamp(level - 1, 0, COMPANY_TITLES.length - 1);
    return COMPANY_TITLES[idx];
  }

  /* ---------- Default state factory ---------- */
  function defaultState() {
    return {
      version: STATE_VERSION,
      totalDays: 1,
      totalNetWorth: STARTING_CAPITAL,

      // Banks created by banking.js init when state is fresh.
      banks: [],

      // Market — current per-asset prices keyed by ticker.
      // Populated by market.js initMarket().
      marketAssets: {},          // { BBCA: { price, prevPrice, change, ... }, ... }
      marketHistory: {},         // { BBCA: [p1, p2, ...] (last N) }

      // Portfolio holdings.
      portfolio: [],             // [{ticker, category, qty, avgPrice, totalCost}]

      // News
      newsHistory: [],           // [{day, headline, body, targets}]
      dailyNews: [],             // current day's news (subset of newsHistory)
      lastNewsDay: 0,

      taxLiabilities: [],
      hiredEmployees: [],

      physicalAssets: {
        properties:    [],       // [{instanceId, key, name, capacity, value, purchaseDay}]
        cars:          [],
        motorcycles:   [],
        officeCapacity: 0,
      },

      // Company progression
      companyLevel: 1,
      companyXP: 0,

      // UI
      activeTab: 'home',
      meta: {
        createdAt: Date.now(),
      },
    };
  }

  /* ---------- Persistence ---------- */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load state:', e);
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ---------- Net worth recompute ----------
     Phase 2 scope:
       liquid     = bank balances
       portfolio  = sum(qty * currentMarketPrice)
       physical   = sum(value of properties + cars + motorcycles)
       debts      = active loan remaining + credit-card used
     netWorth    = liquid + portfolio + physical − debts
  */
  function recomputeNetWorth(state) {
    const banks = state.banks || [];
    const bankSum = banks.reduce((a, b) => a + (b.balance || 0), 0);
    const loanDebt = banks.reduce(
      (a, b) => a + (b.loan && b.loan.isActive ? b.loan.remaining : 0), 0);
    const ccDebt = banks.reduce(
      (a, b) => a + (b.creditCard ? b.creditCard.used || 0 : 0), 0);

    const portfolio = state.portfolio || [];
    const market = state.marketAssets || {};
    const portfolioValue = portfolio.reduce((sum, h) => {
      const m = market[h.ticker];
      const price = m ? m.price : (h.avgPrice || 0);
      return sum + price * h.qty;
    }, 0);

    const phys = state.physicalAssets || {};
    const sumValue = arr => (arr || []).reduce((a, x) => a + (x.value || 0), 0);
    const physicalValue =
      sumValue(phys.properties) + sumValue(phys.cars) + sumValue(phys.motorcycles);

    state.totalNetWorth = bankSum + portfolioValue + physicalValue - loanDebt - ccDebt;
    return state.totalNetWorth;
  }

  /* ---------- XP / Level ---------- */
  function awardXP(state, amount) {
    state.companyXP += Math.max(0, Math.floor(amount));
    let leveled = false;
    while (state.companyLevel < COMPANY_TITLES.length &&
           state.companyXP >= xpToNext(state.companyLevel)) {
      state.companyXP -= xpToNext(state.companyLevel);
      state.companyLevel += 1;
      leveled = true;
    }
    return leveled;
  }

  /* ---------- Migration ---------- */
  function migrateState(state) {
    if (!state || typeof state !== 'object') return defaultState();

    // Add missing top-level fields without wiping existing data.
    const def = defaultState();
    Object.keys(def).forEach(k => {
      if (state[k] === undefined) state[k] = def[k];
    });

    // physicalAssets shape
    state.physicalAssets = state.physicalAssets || def.physicalAssets;
    ['properties', 'cars', 'motorcycles'].forEach(k => {
      if (!Array.isArray(state.physicalAssets[k])) state.physicalAssets[k] = [];
    });
    if (typeof state.physicalAssets.officeCapacity !== 'number') {
      state.physicalAssets.officeCapacity = 0;
    }

    state.marketAssets   = state.marketAssets   || {};
    state.marketHistory  = state.marketHistory  || {};
    state.portfolio      = state.portfolio      || [];
    state.newsHistory    = state.newsHistory    || [];
    state.dailyNews      = state.dailyNews      || [];
    if (typeof state.lastNewsDay !== 'number') state.lastNewsDay = 0;

    state.version = STATE_VERSION;
    return state;
  }

  /* ---------- Bootstrap ---------- */
  function initState() {
    let state = loadState();
    if (!state) {
      state = defaultState();
    } else {
      state = migrateState(state);
    }
    JI.gameState = state;
    return state;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    STARTING_CAPITAL,
    STATE_VERSION,
    COMPANY_TITLES,
    xpToNext,
    getCompanyTitle,
    defaultState,
    loadState,
    saveState,
    resetState,
    recomputeNetWorth,
    awardXP,
    initState,
    migrateState,
  });
})(window);
