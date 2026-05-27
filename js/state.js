/* =========================================================================
   state.js — Central gameState + persistence + level system.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const STORAGE_KEY = 'juragan_investasi_state_v1';
  const STARTING_CAPITAL = 150_000_000; // Rp 150jt (legacy fallback)
  const STATE_VERSION = 3;
  const DEFAULT_DAILY_OPS_COST = 500_000; // Rp 500rb / hari (placeholder)

  // Phase 7 — custom starting capital bounds
  const MIN_STARTING_CAPITAL = 10_000_000;             // Rp 10 juta
  const MAX_STARTING_CAPITAL = 100_000_000_000_000;    // Rp 100 triliun

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
      totalNetWorth: 0,

      // Phase 7 — Player identity
      playerName: '',
      playerGender: 'Bapak',     // 'Bapak' | 'Ibu'
      startingCapital: 0,        // user-chosen Modal Awal

      // Banks created by banking.js after onboarding completes.
      banks: [],

      // ----- Market & Portfolio (populated by market.js) -----
      assetPrices: {},        // ticker -> currentPrice
      priceHistory: {},       // ticker -> [last 60 closes]
      portfolio: [],          // [{ticker, qty, avgPrice}]

      // Phase 7 — assets created at runtime (player IPO, e-IPO listings).
      // Each entry: { ticker, name, category, sector, initialPrice, volatility }
      dynamicAssets: [],

      // ----- News -----
      newsHistory: [],        // [{day, ticker, headline, sentiment, category}]
      todaysNews: [],         // shortcut to today's headlines

      // ----- Random events -----
      eventLog: [],           // [{day, id, title, type}]
      pendingEvent: null,     // event currently waiting to be acknowledged in UI

      // ----- Tax & Ops -----
      unpaidFinalTax: 0,      // Rp; cleared by Tax Amnesty event
      annualTax: 0,           // Rp; cleared by Tax Amnesty event
      dailyOpsCost: DEFAULT_DAILY_OPS_COST,
      opsCostMultiplierToday: 1, // reset every Next Day; events can spike (e.g. x5)

      // ----- HRD / Aset placeholders (kept from prior phases) -----
      hiredEmployees: [],
      physicalAssets: {
        properties:    [],
        cars:          [],
        motorcycles:   [],
        officeCapacity: 0,
      },

      // Phase 7 — Venture Builder
      myStartup: null,           // see venture.js for shape

      // Phase 7 — e-IPO marketplace (populated by ipo.js on first run)
      ipoPool: null,             // array of company defs not yet spawned
      activeIPOs: [],            // companies currently accepting orders
      ipoHistory: [],            // log of listing/refund events

      // Company progression
      companyLevel: 1,
      companyXP: 0,

      // UI
      activeTab: 'home',
      meta: {
        createdAt: Date.now(),
        initialized: false,    // false until pre-game menu submitted
      },
    };
  }

  /* ---------- Migrations ----------
     v1 -> v2: add Phase 5 fields without nuking the player's banks/level.
     v2 -> v3: add Phase 7 fields (player identity, venture, IPO). Existing
               saves with banks already populated are considered initialized. */
  function migrate(state) {
    if (!state) return defaultState();

    // v1 -> v2 (carried over from prior phase)
    if (!state.version || state.version < 2) {
      const fresh = defaultState();
      state = {
        ...fresh,
        ...state,
        assetPrices:        state.assetPrices  || {},
        priceHistory:       state.priceHistory || {},
        portfolio:          Array.isArray(state.portfolio) ? state.portfolio : [],
        newsHistory:        Array.isArray(state.newsHistory) ? state.newsHistory : [],
        todaysNews:         [],
        eventLog:           Array.isArray(state.eventLog) ? state.eventLog : [],
        pendingEvent:       null,
        unpaidFinalTax:     state.unpaidFinalTax || 0,
        annualTax:          state.annualTax || 0,
        dailyOpsCost:       state.dailyOpsCost || DEFAULT_DAILY_OPS_COST,
        opsCostMultiplierToday: 1,
        version: 2,
      };
    }

    // v2 -> v3: Phase 7
    if (state.version < 3) {
      const meta = state.meta || { createdAt: Date.now() };
      // Existing saves that have banks should be treated as already onboarded.
      const wasInitialized = Array.isArray(state.banks) && state.banks.length > 0;
      state = {
        ...state,
        playerName:       state.playerName       || (wasInitialized ? 'Juragan' : ''),
        playerGender:     state.playerGender     || 'Bapak',
        startingCapital:  state.startingCapital  || (wasInitialized ? STARTING_CAPITAL : 0),
        dynamicAssets:    Array.isArray(state.dynamicAssets) ? state.dynamicAssets : [],
        myStartup:        state.myStartup || null,
        ipoPool:          Array.isArray(state.ipoPool) ? state.ipoPool : null,
        activeIPOs:       Array.isArray(state.activeIPOs) ? state.activeIPOs : [],
        ipoHistory:       Array.isArray(state.ipoHistory) ? state.ipoHistory : [],
        meta: {
          ...meta,
          initialized: meta.initialized != null ? meta.initialized : wasInitialized,
        },
        version: 3,
      };
    }

    return state;
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
     Banks balance + portfolio market value − active loan + CC debt.
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
    const portfolioValue = (state.portfolio || []).reduce((a, p) => {
      const px = (state.assetPrices || {})[p.ticker] || 0;
      return a + px * (p.qty || 0);
    }, 0);
    state.totalNetWorth = bankSum + portfolioValue - loanDebt - ccDebt;
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
      state = migrate(state);
    }
    JI.gameState = state;
    return state;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    STARTING_CAPITAL,
    MIN_STARTING_CAPITAL,
    MAX_STARTING_CAPITAL,
    STATE_VERSION,
    DEFAULT_DAILY_OPS_COST,
    COMPANY_TITLES,
    xpToNext,
    getCompanyTitle,
    defaultState,
    migrate,
    loadState,
    saveState,
    resetState,
    recomputeNetWorth,
    awardXP,
    initState,
  });
})(window);
