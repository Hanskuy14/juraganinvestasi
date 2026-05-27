/* =========================================================================
   state.js — Central gameState + persistence + level system.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const STORAGE_KEY = 'juragan_investasi_state_v1';
  const STATE_VERSION = 4; // Phase 4
  const STARTING_CAPITAL = 150_000_000; // Rp 150jt
  const DAILY_OPS_COST  = 150_000;      // Rp 150rb / day

  /* ---------- Company titles by level (Phase 3 spec) ----------
     Level 1-3   : Retail Trader
     Level 4-6   : Boutique Firm
     Level 7-9   : Hedge Fund
     Level 10+   : Conglomerate Tycoon
  */
  const TITLE_TIERS = [
    { min: 1,  max: 3,        title: 'Retail Trader',      icon: '👤' },
    { min: 4,  max: 6,        title: 'Boutique Firm',      icon: '🏢' },
    { min: 7,  max: 9,        title: 'Hedge Fund',         icon: '💎' },
    { min: 10, max: Infinity, title: 'Conglomerate Tycoon',icon: '👑' },
  ];

  /* Kept for backward compatibility — populated as a flat list. */
  const COMPANY_TITLES = [
    'Retail Trader','Retail Trader','Retail Trader',
    'Boutique Firm','Boutique Firm','Boutique Firm',
    'Hedge Fund','Hedge Fund','Hedge Fund',
    'Conglomerate Tycoon',
  ];

  /* XP curve per Phase 3 spec: companyXP >= companyLevel * 1000. */
  function xpToNext(level) {
    return Math.max(1, Math.floor(level)) * 1000;
  }

  function getCompanyTitle(level) {
    const tier = TITLE_TIERS.find(t => level >= t.min && level <= t.max)
              || TITLE_TIERS[TITLE_TIERS.length - 1];
    return tier.title;
  }

  function getCompanyTitleTier(level) {
    return TITLE_TIERS.find(t => level >= t.min && level <= t.max)
        || TITLE_TIERS[TITLE_TIERS.length - 1];
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

      // Tax (Phase 3)
      taxLiabilities: [],        // [{id, type, baseAmount, owedAmount, dueDay, paid, paidDay, createdDay}]
      taxStats: {
        totalPPhPaid: 0,
        totalAnnualPaid: 0,
        totalPenaltiesPaid: 0,
      },

      // HRD (Phase 3)
      hiredEmployees: [],        // [{id, role, tier, salary, hiredOn}]

      // Physical assets
      physicalAssets: {
        properties:    [],       // [{instanceId, key, name, capacity, value, purchaseDay}]
        cars:          [],
        motorcycles:   [],
        officeCapacity: 0,
      },

      // Company progression
      companyLevel: 1,
      companyXP: 0,

      // Lifetime broker / market metrics (Phase 3)
      brokerStats: {
        totalFeesPaid: 0,
        totalCashbackEarned: 0,
        totalRealizedPnL: 0,
        profitableSells: 0,
        losingSells: 0,
      },

      // Phase 4
      vc: {
        activeStartups: [],   // [{id, name, sector, seekingAmount, ...}]
        lastRotationDay: 0,
        investments: [],      // [{id, startupId, amount, openedDay, maturityDay, lockDays, fromBankId}]
        maturedHistory: [],   // [{startupName, outcome, multiplier, originalAmount, payout, day}]
      },
      ipo: {
        isPublic: false,
        ipoDay: null,
        lastDividendDay: null,
      },
      eventHistory: [],            // Black Swan log
      activeEventModifier: null,   // {eventId, day, title, severity} — set the day a Black Swan fires

      // Bookkeeping for the day-loop
      lastMonthProcessed: 0,     // last "month index" for which monthly ops ran

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
     Phase 4 scope:
       liquid           = bank balances
       portfolio        = sum(qty * currentMarketPrice)
       physical         = sum(properties + cars + motorcycles)
       depositoLocked   = sum(active deposito principal — locked but still ours)
       vcAtRisk         = sum(active VC investment principal)
       debts            = active loan remaining + credit-card used
     netWorth = liquid + portfolio + physical + depositoLocked + vcAtRisk − debts
  */
  function recomputeNetWorth(state) {
    const banks = state.banks || [];
    const bankSum = banks.reduce((a, b) => a + (b.balance || 0), 0);
    const loanDebt = banks.reduce(
      (a, b) => a + (b.loan && b.loan.isActive ? b.loan.remaining : 0), 0);
    const ccDebt = banks.reduce(
      (a, b) => a + (b.creditCard ? b.creditCard.used || 0 : 0), 0);
    const depositoLocked = banks.reduce(
      (a, b) => a + ((b.depositos || []).reduce(
        (x, d) => x + (d.isMatured ? 0 : (d.principal || 0)), 0)),
      0);

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

    const vcAtRisk = (state.vc && Array.isArray(state.vc.investments))
      ? state.vc.investments.reduce((a, i) => a + (i.amount || 0), 0)
      : 0;

    state.totalNetWorth =
      bankSum + portfolioValue + physicalValue + depositoLocked + vcAtRisk
      - loanDebt - ccDebt;
    return state.totalNetWorth;
  }

  /* ---------- XP / Level (Phase 3 spec) ----------
     Threshold: companyLevel * 1000.
     Returns: { leveledUp, levelsGained, newLevel, newTitle }
  */
  function awardXP(state, amount) {
    state.companyXP += Math.max(0, Math.floor(amount));
    let levelsGained = 0;
    while (state.companyXP >= xpToNext(state.companyLevel)) {
      state.companyXP -= xpToNext(state.companyLevel);
      state.companyLevel += 1;
      levelsGained += 1;
      if (state.companyLevel > 99) break; // safety
    }
    return {
      leveledUp: levelsGained > 0,
      levelsGained,
      newLevel: state.companyLevel,
      newTitle: getCompanyTitle(state.companyLevel),
    };
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

    // Phase 3 fields
    state.taxLiabilities = state.taxLiabilities || [];
    state.taxStats       = state.taxStats       || def.taxStats;
    state.hiredEmployees = state.hiredEmployees || [];
    state.brokerStats    = state.brokerStats    || def.brokerStats;
    if (typeof state.lastMonthProcessed !== 'number') state.lastMonthProcessed = 0;

    // Phase 4 fields
    state.vc           = state.vc           || def.vc;
    state.vc.activeStartups   = state.vc.activeStartups   || [];
    state.vc.investments      = state.vc.investments      || [];
    state.vc.maturedHistory   = state.vc.maturedHistory   || [];
    if (typeof state.vc.lastRotationDay !== 'number') state.vc.lastRotationDay = 0;

    state.ipo          = state.ipo          || def.ipo;
    if (typeof state.ipo.isPublic !== 'boolean') state.ipo.isPublic = false;

    state.eventHistory = state.eventHistory || [];
    if (state.activeEventModifier === undefined) state.activeEventModifier = null;

    // Bank-level Phase 4 fields
    (state.banks || []).forEach(b => {
      if (!Array.isArray(b.history))   b.history = [];
      if (!Array.isArray(b.depositos)) b.depositos = [];
    });

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
    DAILY_OPS_COST,
    STATE_VERSION,
    COMPANY_TITLES,
    TITLE_TIERS,
    xpToNext,
    getCompanyTitle,
    getCompanyTitleTier,
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
