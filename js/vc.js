/* =========================================================================
   vc.js — Venture Capital: 15-startup pool, 3 active at a time, custom
   investment with 90–120 day lock, RNG outcomes (70 / 20 / 10).
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Hardcoded startup pool (exactly 15) ---------- */
  const STARTUP_POOL = [
    { id: 'kopisenja',     name: 'KopiSenja',     sector: 'F&B',         icon: '☕' },
    { id: 'warungtech',    name: 'WarungTech',    sector: 'SaaS',        icon: '🛠️' },
    { id: 'ojekterbang',   name: 'OjekTerbang',   sector: 'Mobility',    icon: '🛵' },
    { id: 'tanimaju',      name: 'TaniMaju',      sector: 'AgriTech',    icon: '🌾' },
    { id: 'sehatklinik',   name: 'SehatKlinik',   sector: 'HealthTech',  icon: '🩺' },
    { id: 'edunusantara',  name: 'EduNusantara',  sector: 'EdTech',      icon: '📚' },
    { id: 'juragankos',    name: 'JuraganKos',    sector: 'PropTech',    icon: '🏠' },
    { id: 'kasircepet',    name: 'KasirCepet',    sector: 'FinTech',     icon: '💳' },
    { id: 'dapurcloud',    name: 'DapurCloud',    sector: 'F&B',         icon: '🍳' },
    { id: 'ternaklele',    name: 'TernakLele',    sector: 'AgriTech',    icon: '🐟' },
    { id: 'laundrygo',     name: 'LaundryGo',     sector: 'Services',    icon: '🧺' },
    { id: 'tiketliburan',  name: 'TiketLiburan',  sector: 'Travel',      icon: '✈️' },
    { id: 'sampahpintar',  name: 'SampahPintar',  sector: 'CleanTech',   icon: '♻️' },
    { id: 'bajubekas',     name: 'BajuBekas',     sector: 'Re-commerce', icon: '👕' },
    { id: 'bengkelonline', name: 'BengkelOnline', sector: 'Automotive',  icon: '🔧' },
  ];

  const ROTATION_DAYS   = 30;
  const ACTIVE_COUNT    = 3;
  const LOCK_MIN_DAYS   = 90;
  const LOCK_MAX_DAYS   = 120;

  /* Outcome probabilities (must sum to 1.0) */
  const P_BANKRUPT    = 0.70;
  const P_ACQUISITION = 0.20;
  const P_UNICORN     = 0.10;

  /* ---------- Pool helpers ---------- */
  function lookup(id) {
    return STARTUP_POOL.find(s => s.id === id);
  }

  function makeListing(seed) {
    // Each listing has a random "seeking amount" range to add flavor.
    const seeking = (10 + JI.randomInt(0, 90)) * 1_000_000; // Rp 10jt - 100jt
    return {
      id: seed.id,
      name: seed.name,
      sector: seed.sector,
      icon: seed.icon,
      seekingAmount: seeking,
      pitch: pitchFor(seed),
      refreshedOn: 0,
    };
  }

  function pitchFor(seed) {
    const map = {
      kopisenja:     'Jaringan coffee shop premium dengan model "ghost kitchen".',
      warungtech:    'POS SaaS untuk 5 juta warung mikro di Indonesia.',
      ojekterbang:   'Layanan eVTOL urban mobility B2B antar-kantor.',
      tanimaju:      'Marketplace input pertanian + agronomy AI.',
      sehatklinik:   'Klinik tele-medicine dengan jaringan 500 mitra dokter.',
      edunusantara:  'Bimbel adaptive-learning untuk siswa SMA.',
      juragankos:    'Aggregator kos-kosan profesional dengan smart-lock.',
      kasircepet:    'Cash-in/out merchant terdesentralisasi.',
      dapurcloud:    'Cloud kitchen multi-brand di 12 kota Tier-2.',
      ternaklele:    'Smart farming kolam lele berbasis IoT.',
      laundrygo:     'On-demand laundry pickup dengan driver fleet.',
      tiketliburan:  'OTA niche untuk paket wisata Nusantara.',
      sampahpintar:  'Tokenisasi sampah daur ulang untuk komunitas.',
      bajubekas:     'C2C re-commerce thrift fashion premium.',
      bengkelonline: 'Bengkel-on-call untuk roda 2 dan roda 4.',
    };
    return map[seed.id] || `Startup di sektor ${seed.sector}.`;
  }

  /* ---------- Initial / forced rotation ---------- */
  function rotateActiveStartups(state) {
    if (!state.vc) state.vc = { activeStartups: [], lastRotationDay: 0, investments: [], maturedHistory: [] };

    // Pick 3 distinct random pool members
    const pool = [...STARTUP_POOL];
    const picks = [];
    while (picks.length < ACTIVE_COUNT && pool.length > 0) {
      const idx = JI.randomInt(0, pool.length - 1);
      const seed = pool.splice(idx, 1)[0];
      const listing = makeListing(seed);
      listing.refreshedOn = state.totalDays;
      picks.push(listing);
    }
    state.vc.activeStartups   = picks;
    state.vc.lastRotationDay  = state.totalDays;
    return picks;
  }

  function maybeRotate(state) {
    if (!state.vc) return rotateActiveStartups(state);
    if (!state.vc.activeStartups || state.vc.activeStartups.length === 0) {
      return rotateActiveStartups(state);
    }
    if (state.totalDays - state.vc.lastRotationDay >= ROTATION_DAYS) {
      return rotateActiveStartups(state);
    }
    return null;
  }

  /* ---------- Invest ---------- */
  let nextInvestmentId = 1;
  function freshInvestmentId(state) {
    // Use the longest-running counter we can to avoid collisions across reloads.
    const max = Math.max(0, ...((state.vc?.investments || []).map(i => i._n || 0)));
    nextInvestmentId = Math.max(nextInvestmentId, max + 1);
    return nextInvestmentId++;
  }

  /**
   * Invest a custom IDR amount in one of the active startups, drawing cash
   * from a chosen bank.
   */
  function invest(state, startupId, amount, fromBankId) {
    const startup = (state.vc?.activeStartups || []).find(s => s.id === startupId);
    if (!startup) return { ok: false, error: 'Startup ini sedang tidak menggalang dana.' };

    const amt = Math.floor(Number(amount) || 0);
    if (amt < 1_000_000) {
      return { ok: false, error: 'Minimum investasi Rp 1.000.000.' };
    }

    const debit = JI.bankDebit(state, fromBankId, amt, `Investasi VC: ${startup.name}`);
    if (!debit.ok) return debit;

    const lockDays = JI.randomInt(LOCK_MIN_DAYS, LOCK_MAX_DAYS);
    const inv = {
      _n: freshInvestmentId(state),
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      startupId: startup.id,
      startupName: startup.name,
      sector: startup.sector,
      icon: startup.icon,
      amount: amt,
      openedDay: state.totalDays,
      lockDays: lockDays,
      maturityDay: state.totalDays + lockDays,
      fromBankId: fromBankId,
    };
    state.vc.investments.push(inv);

    JI.recomputeNetWorth(state);
    JI.awardXP(state, Math.min(200, Math.floor(amt / 5_000_000)));
    return { ok: true, investment: inv };
  }

  /* ---------- Outcome RNG ---------- */
  function rollOutcome() {
    const r = Math.random();
    if (r < P_BANKRUPT) {
      return { kind: 'Bankrupt', multiplier: 0 };
    }
    if (r < P_BANKRUPT + P_ACQUISITION) {
      // 2x to 5x
      const mult = 2 + Math.random() * 3;
      return { kind: 'Acquisition', multiplier: Math.round(mult * 100) / 100 };
    }
    // Unicorn IPO: 10x to 50x
    const mult = 10 + Math.random() * 40;
    return { kind: 'Unicorn IPO', multiplier: Math.round(mult * 100) / 100 };
  }

  /* ---------- Maturity tick — call once per in-game day ---------- */
  function tickInvestments(state) {
    if (!state.vc || !Array.isArray(state.vc.investments)) return [];
    const matured = [];
    const remaining = [];
    for (const inv of state.vc.investments) {
      if (state.totalDays >= inv.maturityDay) {
        const outcome = rollOutcome();
        const payout = Math.round(inv.amount * outcome.multiplier);
        if (payout > 0) {
          JI.bankCredit(
            state,
            inv.fromBankId,
            payout,
            `VC ${outcome.kind}: ${inv.startupName} (${outcome.multiplier}x)`
          );
        } else {
          // Record a zero-value out-event for clarity in audit.
          // (No actual cash movement; we just leave a note in the bank that hosted the original outflow.)
          const bank = JI.getBank(state, inv.fromBankId);
          if (bank) {
            JI.recordHistory(state, bank, 'OUT', 0,
              `VC Bankrupt: ${inv.startupName} — modal hangus`);
          }
        }

        const record = {
          startupName: inv.startupName,
          sector: inv.sector,
          icon: inv.icon,
          outcome: outcome.kind,
          multiplier: outcome.multiplier,
          originalAmount: inv.amount,
          payout: payout,
          fromBankId: inv.fromBankId,
          day: state.totalDays,
          openedDay: inv.openedDay,
        };
        state.vc.maturedHistory.unshift(record);
        if (state.vc.maturedHistory.length > 100) state.vc.maturedHistory.length = 100;

        matured.push(record);

        // XP: massive for unicorn, decent for acquisition
        if (outcome.kind === 'Unicorn IPO')   JI.awardXP(state, 1500);
        else if (outcome.kind === 'Acquisition') JI.awardXP(state, 400);
      } else {
        remaining.push(inv);
      }
    }
    state.vc.investments = remaining;
    return matured;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    STARTUP_POOL,
    VC_ROTATION_DAYS: ROTATION_DAYS,
    VC_ACTIVE_COUNT:  ACTIVE_COUNT,
    VC_LOCK_MIN_DAYS: LOCK_MIN_DAYS,
    VC_LOCK_MAX_DAYS: LOCK_MAX_DAYS,
    rotateActiveStartups,
    maybeRotateVC: maybeRotate,
    investInStartup: invest,
    tickVCInvestments: tickInvestments,
  });
})(window);
