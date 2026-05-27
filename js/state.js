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
    return 500 * level * (level + 1);
  }

  function getCompanyTitle(level) {
    const idx = JI.clamp(level - 1, 0, COMPANY_TITLES.length - 1);
    return COMPANY_TITLES[idx];
  }

  /* Display title accounts for IPO state. */
  function getDisplayTitle(state) {
    if (state && state.ipo && state.ipo.isPublic) return 'Public Listed Company';
    return getCompanyTitle(state ? state.companyLevel : 1);
  }

  /* ---------- Default state factory ---------- */
  function defaultState() {
    return {
      version: 2,
      totalDays: 1,
      totalNetWorth: STARTING_CAPITAL,

      banks: [],

      portfolio: [],
      newsHistory: [],
      taxLiabilities: [],
      hiredEmployees: [],
      physicalAssets: {
        properties:    [],
        cars:          [],
        motorcycles:   [],
        officeCapacity: 0,
      },

      // Phase 4
      vc: {
        activeStartups: [],   // [{id,name,sector,seekingAmount,refreshedOn}]
        lastRotationDay: 0,
        investments: [],      // [{id, startupId, startupName, sector, amount, openedDay, maturityDay, lockDays, fromBankId}]
        maturedHistory: [],   // [{startupName, outcome, multiplier, originalAmount, payout, day}]
      },
      ipo: {
        isPublic: false,
        ipoDay: null,
        lastDividendDay: null,
      },
      market: null,           // initialized by market.js
      activeEventModifier: null, // {eventId, day, expiresInDays, modifier}
      eventHistory: [],       // [{day, eventId, title}]

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

  /* ---------- Migration: ensure new fields on older states ---------- */
  function migrateState(state) {
    if (!state) return state;

    if (typeof state.totalDays !== 'number') state.totalDays = 1;
    if (!Array.isArray(state.banks)) state.banks = [];

    // Bank-level new fields
    state.banks.forEach(b => {
      if (!Array.isArray(b.history)) b.history = [];
      if (!Array.isArray(b.depositos)) b.depositos = [];
    });

    if (!state.physicalAssets) {
      state.physicalAssets = { properties: [], cars: [], motorcycles: [], officeCapacity: 0 };
    }
    if (typeof state.physicalAssets.officeCapacity !== 'number') {
      state.physicalAssets.officeCapacity = 0;
    }
    if (!Array.isArray(state.hiredEmployees)) state.hiredEmployees = [];

    if (!state.vc) {
      state.vc = { activeStartups: [], lastRotationDay: 0, investments: [], maturedHistory: [] };
    }
    if (!state.ipo) {
      state.ipo = { isPublic: false, ipoDay: null, lastDividendDay: null };
    }
    if (state.activeEventModifier === undefined) state.activeEventModifier = null;
    if (!Array.isArray(state.eventHistory)) state.eventHistory = [];

    // Market initialized later by market.js (needs JI.makeDefaultMarket)
    state.version = 2;
    return state;
  }

  /* ---------- Net worth recompute ----------
     Banks balance + portfolio (stocks/crypto) + physical assets + VC at-risk amount
     − active loan remaining − credit card debt − active deposito principal (locked but counted as asset).
     Note: deposito principal is a locked bank asset — we count it as part of net worth.
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
    const depositoLocked = (state.banks || []).reduce(
      (a, b) => a + ((b.depositos || []).reduce(
        (x, d) => x + (d.isMatured ? 0 : d.principal), 0)),
      0
    );

    let portfolioValue = 0;
    if (state.portfolio && state.market) {
      state.portfolio.forEach(pos => {
        const asset = JI.findMarketAsset && JI.findMarketAsset(state, pos.ticker);
        if (asset) portfolioValue += pos.qty * asset.price;
      });
    }

    let assetValue = 0;
    if (state.physicalAssets && Array.isArray(state.physicalAssets.properties)) {
      assetValue += state.physicalAssets.properties.reduce((a, p) => a + (p.value || 0), 0);
    }

    const vcAtRisk = (state.vc && Array.isArray(state.vc.investments))
      ? state.vc.investments.reduce((a, i) => a + (i.amount || 0), 0) : 0;

    state.totalNetWorth = bankSum + depositoLocked + portfolioValue + assetValue + vcAtRisk - loanDebt - ccDebt;
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
    COMPANY_TITLES,
    xpToNext,
    getCompanyTitle,
    getDisplayTitle,
    defaultState,
    loadState,
    saveState,
    resetState,
    migrateState,
    recomputeNetWorth,
    awardXP,
    initState,
  });
})(window);
