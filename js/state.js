/* =========================================================================
   state.js — Central gameState + persistence + level system.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const STORAGE_KEY = 'juragan_investasi_state_v1';
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
      version: 1,
      totalDays: 1,
      totalNetWorth: STARTING_CAPITAL,

      // Banks created by banking.js init when state is fresh.
      banks: [],

      // Phase 2/3 placeholders
      portfolio: [],          // {ticker, qty, avgPrice, ...}
      newsHistory: [],        // [{day, headline, body, impact}]
      taxLiabilities: [],     // [{day, type, amount, paid}]
      hiredEmployees: [],     // [{id, role, salary, hiredOn}]
      physicalAssets: {
        properties:    [],    // [{id, name, value, ...}]
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
     Phase 1 scope: banks balance - active loan remaining.
     (Portfolio/assets folded in during later phases.)
  */
  function recomputeNetWorth(state) {
    const bankSum = (state.banks || []).reduce((a, b) => a + (b.balance || 0), 0);
    const loanDebt = (state.banks || []).reduce(
      (a, b) => a + (b.loan && b.loan.isActive ? b.loan.remaining : 0),
      0
    );
    const ccDebt = (state.banks || []).reduce(
      (a, b) => a + (b.creditCard ? b.creditCard.used || 0 : 0),
      0
    );
    state.totalNetWorth = bankSum - loanDebt - ccDebt;
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

  /* ---------- Bootstrap ---------- */
  function initState() {
    let state = loadState();
    if (!state || state.version !== 1) {
      state = defaultState();
    }
    JI.gameState = state;
    return state;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    STARTING_CAPITAL,
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
  });
})(window);
