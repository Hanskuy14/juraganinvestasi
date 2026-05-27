/* =========================================================================
   state.js — Central gameState + persistence + level system.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const STORAGE_KEY = 'juragan_investasi_state_v1';
  const STARTING_CAPITAL = 150_000_000; // Rp 150jt
  const STATE_VERSION = 3;
  const DEFAULT_DAILY_OPS_COST = 500_000; // Rp 500rb / hari (placeholder)

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

      // ----- Market & Portfolio (populated by market.js) -----
      assetPrices: {},        // ticker -> currentPrice
      priceHistory: {},       // ticker -> [last 60 closes]
      portfolio: [],          // [{ticker, qty, avgPrice}]

      // ----- News -----
      newsHistory: [],        // [{day, ticker, headline, sentiment, category, multiplier}]
      todaysNews: [],         // shortcut to today's headlines
      // Phase 6: news generated TODAY queues effects here; effects are
      // applied at the START of the NEXT calculateNextDayPrices() call.
      // Shape: [{ ticker, multiplier, source: 'news'|'goreng' }]
      pendingNewsEffects: [],

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
        // Phase 6: Mega Infrastruktur ownership counts (qty per type)
        infrastructure: { spbu: 0, garment: 0, hotel: 0, rsi: 0, tol: 0 },
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

  /* ---------- Migrations ----------
     v1 -> v2: add Phase 5 fields without nuking the player's banks/level.
     v2 -> v3: add Phase 6 fields (delayed news, mega infrastructure). */
  function migrate(state) {
    if (!state) return defaultState();
    if (!state.version || state.version < 2) {
      const fresh = defaultState();
      const merged = {
        ...fresh,
        ...state,
        // Re-add fields that may have been missing in v1.
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
      state = merged;
    }
    if (state.version < 3) {
      // Phase 6 fields
      state.pendingNewsEffects = Array.isArray(state.pendingNewsEffects)
        ? state.pendingNewsEffects : [];
      state.physicalAssets = state.physicalAssets || {
        properties: [], cars: [], motorcycles: [], officeCapacity: 0,
      };
      if (!state.physicalAssets.infrastructure ||
          typeof state.physicalAssets.infrastructure !== 'object') {
        state.physicalAssets.infrastructure = {
          spbu: 0, garment: 0, hotel: 0, rsi: 0, tol: 0,
        };
      } else {
        // Ensure all 5 keys exist.
        ['spbu','garment','hotel','rsi','tol'].forEach(k => {
          if (state.physicalAssets.infrastructure[k] == null) {
            state.physicalAssets.infrastructure[k] = 0;
          }
        });
      }
      state.version = 3;
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
     Banks balance + portfolio market value + Mega Infrastructure book value
     − active loan + CC debt.
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
    const infraValue = (typeof JI.totalInfrastructureValue === 'function')
      ? JI.totalInfrastructureValue(state)
      : 0;
    state.totalNetWorth = bankSum + portfolioValue + infraValue - loanDebt - ccDebt;
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
