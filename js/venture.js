/* =========================================================================
   venture.js — Phase 7 Venture Builder
   --------------------------------------------------------------------------
   Player runs their own startup. Cash flows in from personal banks and
   external investors; users + valuation grow from spend; monthly burn
   ticks down cash. When valuation crosses Rp 10 T, player can IPO and the
   startup mutates the global market by becoming a new Category-1 stock.
   ========================================================================= */

(function (global) {
  'use strict';
  const JI = global.JI || (global.JI = {});

  /* ---------- Constants ---------- */
  const FOUNDING_BURN     = 50_000_000;          // Rp 50 jt / month at Seed
  const PITCH_MIN_VAL     = 5_000_000_000;       // Rp 5 miliar
  const IPO_THRESHOLD     = 10_000_000_000_000;  // Rp 10 triliun
  const BURN_INTERVAL     = 30;                  // days between burns
  const SECTORS           = ['Tech', 'F&B', 'Finance'];

  // Valuation -> Stage thresholds (ascending)
  const STAGE_TIERS = [
    { stage: 'Seed',      min: 0 },
    { stage: 'Series A',  min: 5_000_000_000 },
    { stage: 'Series B',  min: 50_000_000_000 },
    { stage: 'Series C',  min: 500_000_000_000 },
    { stage: 'Unicorn',   min: 1_400_000_000_000 },
    { stage: 'Decacorn',  min: 14_000_000_000_000 },
  ];

  function stageFor(valuation) {
    let s = 'Seed';
    for (const t of STAGE_TIERS) if (valuation >= t.min) s = t.stage;
    return s;
  }

  /* ---------- Helpers ---------- */
  function getStartup(state) { return state && state.myStartup; }

  function isOperating(state) { return !!getStartup(state); }

  function canFound(state) { return !isOperating(state); }

  function canPitch(state) {
    const s = getStartup(state);
    return !!s && s.valuation >= PITCH_MIN_VAL && s.playerOwnership > 20;
  }

  function canIPO(state) {
    const s = getStartup(state);
    return !!s && s.valuation >= IPO_THRESHOLD;
  }

  /* ---------- Found a startup ---------- */
  function foundStartup(state, name, sector) {
    if (!canFound(state)) {
      return { ok: false, error: 'Anda sudah memiliki startup aktif.' };
    }
    const cleanName = (name || '').trim();
    if (cleanName.length < 2 || cleanName.length > 30) {
      return { ok: false, error: 'Nama startup harus 2-30 karakter.' };
    }
    if (!SECTORS.includes(sector)) {
      return { ok: false, error: 'Sektor tidak valid.' };
    }
    state.myStartup = {
      name: cleanName,
      sector,
      valuation: 0,
      startupCash: 0,
      monthlyBurn: FOUNDING_BURN,
      users: 0,
      stage: 'Seed',
      playerOwnership: 100,
      foundedDay: state.totalDays,
      lastBurnDay: state.totalDays,
      pitchCount: 0,
      burnCount: 0,
    };
    return { ok: true, startup: state.myStartup };
  }

  /* ---------- Action 1: Suntik Dana Pribadi ----------
     Move cash from a player bank into startupCash. */
  function injectPersonalFunds(state, bankId, amount) {
    const startup = getStartup(state);
    if (!startup) return { ok: false, error: 'Belum ada startup.' };

    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return { ok: false, error: 'Nominal harus lebih besar dari 0.' };

    const bank = JI.getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };
    if (bank.balance < amt) {
      return { ok: false, error: `Saldo ${bank.shortName} tidak mencukupi.` };
    }

    bank.balance -= amt;
    startup.startupCash += amt;
    // Personal injection nudges valuation upward (you have runway).
    const valuationBoost = Math.floor(amt * 0.2);
    startup.valuation += valuationBoost;
    startup.stage = stageFor(startup.valuation);

    JI.recomputeNetWorth(state);
    return { ok: true, amount: amt, valuationBoost };
  }

  /* ---------- Action 2: Bakar Uang (Marketing) ----------
     Burns 50% of startupCash. Adds users + valuation. Burn rate +10%. */
  function burnCash(state) {
    const startup = getStartup(state);
    if (!startup) return { ok: false, error: 'Belum ada startup.' };
    if (startup.startupCash < 1_000_000) {
      return { ok: false, error: 'Saldo startup terlalu kecil untuk kampanye marketing (min Rp 1 jt).' };
    }
    const burned = Math.floor(startup.startupCash * 0.5);
    if (burned <= 0) return { ok: false, error: 'Kas startup tidak cukup.' };

    startup.startupCash -= burned;

    // Users acquired: 1 user per Rp ~5.000-15.000 spent (CAC), modulated by stage.
    const cac = JI.randomFloat(5_000, 15_000);
    const newUsers = Math.max(1, Math.floor(burned / cac));
    startup.users += newUsers;

    // Valuation boost: 1.5x - 3.5x of burned cash (venture multiplier).
    const valMult = JI.randomFloat(1.5, 3.5);
    const valBoost = Math.floor(burned * valMult);
    startup.valuation += valBoost;

    // Permanent +10% to monthly burn (scaling pains).
    startup.monthlyBurn = Math.floor(startup.monthlyBurn * 1.1);

    startup.burnCount += 1;
    startup.stage = stageFor(startup.valuation);

    return { ok: true, burned, newUsers, valBoost, newBurn: startup.monthlyBurn };
  }

  /* ---------- Action 3: Pitching Investor Luar ----------
     Inject external cash, +1.5x valuation, dilute player 15-20%. */
  function pitchInvestor(state) {
    const startup = getStartup(state);
    if (!startup) return { ok: false, error: 'Belum ada startup.' };
    if (startup.valuation < PITCH_MIN_VAL) {
      return {
        ok: false,
        error: `Investor belum tertarik. Naikkan valuasi ke minimum ${JI.formatIDRCompact(PITCH_MIN_VAL)}.`,
      };
    }
    const dilution = +(JI.randomFloat(15, 20)).toFixed(2); // 15-20 %
    if (startup.playerOwnership - dilution < 1) {
      return { ok: false, error: 'Kepemilikan tidak cukup untuk dilusi lagi (min 1%).' };
    }

    // Round size scales with stage. Investors inject ~10-25% of valuation cash.
    const stageMult = ({
      'Seed':      0.5,
      'Series A':  1.0,
      'Series B':  1.5,
      'Series C':  2.0,
      'Unicorn':   2.5,
      'Decacorn':  3.0,
    })[startup.stage] || 1.0;

    const injection = Math.floor(startup.valuation * JI.randomFloat(0.10, 0.25) * stageMult);

    startup.startupCash      += injection;
    startup.valuation         = Math.floor(startup.valuation * 1.5);
    startup.playerOwnership   = +(startup.playerOwnership - dilution).toFixed(2);
    startup.pitchCount       += 1;
    startup.stage             = stageFor(startup.valuation);

    return { ok: true, injection, dilution, newOwnership: startup.playerOwnership };
  }

  /* ---------- Monthly burn — called from loop on Next Day ----------
     Returns a result the loop can render as a notification. */
  function processMonthlyBurn(state) {
    const startup = getStartup(state);
    if (!startup) return null;
    const lastBurn = startup.lastBurnDay || startup.foundedDay;
    if ((state.totalDays - lastBurn) < BURN_INTERVAL) return null;

    startup.lastBurnDay = state.totalDays;
    startup.startupCash -= startup.monthlyBurn;

    if (startup.startupCash < 0) {
      const name = startup.name;
      const valuation = startup.valuation;
      // BANKRUPT — startup wiped per spec.
      state.myStartup = null;
      return { burn: true, bankrupt: true, name, valuation };
    }
    return { burn: true, bankrupt: false, amount: startup.monthlyBurn, name: startup.name };
  }

  /* ---------- Generate a unique ticker for the startup IPO ---------- */
  function generateTicker(state, startupName) {
    const taken = new Set((JI.ASSETS || []).map(a => a.ticker));
    const base = startupName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'NWCO';
    let candidate = base.padEnd(4, 'X').slice(0, 4);
    if (!taken.has(candidate)) return candidate;
    for (let i = 1; i < 100; i++) {
      const c2 = (base.slice(0, 3) + i).slice(0, 4);
      if (!taken.has(c2)) return c2;
    }
    return 'NEW' + Math.floor(Math.random() * 100);
  }

  /* ---------- The Mega IPO ----------
     - Mints a stock asset for the startup.
     - Grants the player ownership% of outstanding shares.
     - Clears state.myStartup. */
  function ipoStartup(state) {
    const startup = getStartup(state);
    if (!startup) return { ok: false, error: 'Belum ada startup.' };
    if (!canIPO(state)) {
      return {
        ok: false,
        error: `Valuasi belum mencapai threshold IPO (min ${JI.formatIDRCompact(IPO_THRESHOLD)}).`,
      };
    }

    const ticker = generateTicker(state, startup.name);
    // Outstanding shares: 1 billion units → readable share price.
    const outstandingShares = 1_000_000_000;
    const initialPrice = Math.max(100, Math.floor(startup.valuation / outstandingShares));

    const sectorMap = { 'Tech': 'Tech', 'F&B': 'Consumer', 'Finance': 'Bank' };
    const sector = sectorMap[startup.sector] || 'Tech';

    const asset = JI.addDynamicAsset(state, {
      ticker,
      name: startup.name,
      category: 'stock',
      sector,
      initialPrice,
      volatility: 0.026,
    });

    // Player allotment from their ownership %.
    const playerShares = Math.floor((startup.playerOwnership / 100) * outstandingShares);
    if (playerShares > 0 && asset) {
      JI.addToPortfolio(state, ticker, playerShares, initialPrice);
    }

    // Optional: a celebratory log entry.
    state.eventLog = state.eventLog || [];
    state.eventLog.unshift({
      day: state.totalDays,
      id: 'startup_ipo',
      title: `🎉 ${startup.name} IPO di ${ticker}`,
      type: 'positive',
    });

    // Save data we want to keep for the success modal then clear startup.
    const result = {
      ok: true,
      ticker,
      name: startup.name,
      ownership: startup.playerOwnership,
      shares: playerShares,
      price: initialPrice,
      valuation: startup.valuation,
    };
    state.myStartup = null;
    JI.recomputeNetWorth(state);
    return result;
  }

  /* ---------- Reset (debug / cheat) ---------- */
  function resetStartup(state) {
    state.myStartup = null;
    return { ok: true };
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    VENTURE_SECTORS: SECTORS,
    VENTURE_PITCH_MIN_VAL: PITCH_MIN_VAL,
    VENTURE_IPO_THRESHOLD: IPO_THRESHOLD,
    VENTURE_BURN_INTERVAL: BURN_INTERVAL,
    foundStartup,
    injectPersonalFunds,
    burnCash,
    pitchInvestor,
    processMonthlyBurn,
    ipoStartup,
    canFound,
    canPitch,
    canIPO,
    isVentureOperating: isOperating,
    resetStartup,
    stageFor,
  });
})(window);
