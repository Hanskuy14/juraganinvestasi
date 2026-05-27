/* =========================================================================
   aset.js — Phase 6 "Sektor Riil" Mega Infrastructure investments.

   Five hardcoded billionaire-tier toys, costs scaling 100 Miliar -> 25 Triliun:
     1. Jaringan SPBU              · 100 Miliar  · +200 Juta / hari
     2. Pabrik Garment             · 500 Miliar  · +1   Miliar / hari
     3. Hotel Bintang 5            ·   1 Triliun · +2.5 Miliar / hari
     4. Rumah Sakit Internasional  ·   5 Triliun · +10  Miliar / hari
     5. Konsesi Jalan Tol          ·  25 Triliun · +50  Miliar / hari

   Player can stack multiple of the same type; quantities are stored on
   state.physicalAssets.infrastructure[<id>] (added by state.js v3->v4
   migration).

   Hard rule on buy: cost is debited from the RICHEST single bank only;
   no overdraft, no split. These positions are reserved for actual
   billionaires. Daily income is auto-credited to the same richest bank
   inside loop.nextDay() via injectInfrastructureIncome().

   Total book value rolls into recomputeNetWorth() via
   totalInfrastructureValue().
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Hardcoded definitions ---------- */
  const INFRASTRUCTURE_DEFS = [
    {
      id: 'spbu',
      name: 'Jaringan SPBU',
      tagline: 'Pom bensin tersebar di Jabodetabek.',
      icon: '⛽',
      tier: 'Sektor Energi',
      cost: 100_000_000_000,         // 100 Miliar
      dailyIncome: 200_000_000,      //  200 Juta / hari
    },
    {
      id: 'garment',
      name: 'Pabrik Garment',
      tagline: 'OEM untuk brand fashion lokal & global.',
      icon: '🧵',
      tier: 'Sektor Manufaktur',
      cost: 500_000_000_000,         // 500 Miliar
      dailyIncome: 1_000_000_000,    //   1 Miliar / hari
    },
    {
      id: 'hotel',
      name: 'Hotel Bintang 5',
      tagline: 'Hotel mewah di kawasan SCBD.',
      icon: '🏨',
      tier: 'Sektor Pariwisata',
      cost: 1_000_000_000_000,       //   1 Triliun
      dailyIncome: 2_500_000_000,    // 2.5 Miliar / hari
    },
    {
      id: 'rsi',
      name: 'Rumah Sakit Internasional',
      tagline: 'Layanan medis premium kelas internasional.',
      icon: '🏥',
      tier: 'Sektor Kesehatan',
      cost: 5_000_000_000_000,       //   5 Triliun
      dailyIncome: 10_000_000_000,   //  10 Miliar / hari
    },
    {
      id: 'tol',
      name: 'Konsesi Jalan Tol',
      tagline: 'Pendapatan tol Trans-Jawa selama 30 tahun.',
      icon: '🛣️',
      tier: 'Sektor Infrastruktur',
      cost: 25_000_000_000_000,      //  25 Triliun
      dailyIncome: 50_000_000_000,   //  50 Miliar / hari
    },
  ];

  function getInfraDef(id) {
    return INFRASTRUCTURE_DEFS.find(d => d.id === id) || null;
  }

  /* ---------- State shape helpers ---------- */
  function ensureInfraState(state) {
    if (!state) return;
    if (!state.physicalAssets) {
      state.physicalAssets = {
        properties: [], cars: [], motorcycles: [], officeCapacity: 0,
      };
    }
    if (!state.physicalAssets.infrastructure ||
        typeof state.physicalAssets.infrastructure !== 'object') {
      state.physicalAssets.infrastructure = {};
    }
    INFRASTRUCTURE_DEFS.forEach(d => {
      if (state.physicalAssets.infrastructure[d.id] == null) {
        state.physicalAssets.infrastructure[d.id] = 0;
      }
    });
  }

  function infraQty(state, id) {
    ensureInfraState(state);
    return state.physicalAssets.infrastructure[id] || 0;
  }

  /* ---------- Bank helpers ---------- */
  function richestBank(state) {
    if (!state || !state.banks || state.banks.length === 0) return null;
    return state.banks.reduce((best, b) =>
      (best == null || b.balance > best.balance) ? b : best, null);
  }

  /* ---------- Buy ----------
     Hard rule: cost is debited from the richest bank only if it has
     enough balance. No overdraft / no split. */
  function buyInfrastructure(state, id) {
    const def = getInfraDef(id);
    if (!def) return { ok: false, error: 'Infrastruktur tidak ditemukan.' };
    ensureInfraState(state);

    const bank = richestBank(state);
    if (!bank) return { ok: false, error: 'Tidak ada rekening untuk pembayaran.' };
    if (bank.balance < def.cost) {
      return {
        ok: false,
        error: `Saldo ${bank.shortName} tidak cukup. Butuh ${JI.formatIDR(def.cost)} cash di satu rekening.`,
      };
    }

    bank.balance -= def.cost;

    state.physicalAssets.infrastructure[id] =
      (state.physicalAssets.infrastructure[id] || 0) + 1;

    if (typeof JI.recomputeNetWorth === 'function') JI.recomputeNetWorth(state);

    return {
      ok: true,
      id,
      name: def.name,
      cost: def.cost,
      bankId: bank.id,
      bankName: bank.shortName || bank.name,
      qty: state.physicalAssets.infrastructure[id],
      dailyIncome: def.dailyIncome,
    };
  }

  /* ---------- Sums ---------- */
  function totalInfrastructureValue(state) {
    if (!state || !state.physicalAssets ||
        !state.physicalAssets.infrastructure) return 0;
    return INFRASTRUCTURE_DEFS.reduce((sum, d) => {
      const q = state.physicalAssets.infrastructure[d.id] || 0;
      return sum + q * d.cost;
    }, 0);
  }

  function totalInfrastructureDailyIncome(state) {
    if (!state || !state.physicalAssets ||
        !state.physicalAssets.infrastructure) return 0;
    return INFRASTRUCTURE_DEFS.reduce((sum, d) => {
      const q = state.physicalAssets.infrastructure[d.id] || 0;
      return sum + q * d.dailyIncome;
    }, 0);
  }

  /* ---------- Daily income injection (called from loop.nextDay) ----------
     Returns { total, bankId, bankName, breakdown:[{id,name,qty,income}] } */
  function injectInfrastructureIncome(state) {
    ensureInfraState(state);
    const breakdown = [];
    let total = 0;
    INFRASTRUCTURE_DEFS.forEach(d => {
      const q = state.physicalAssets.infrastructure[d.id] || 0;
      if (q <= 0) return;
      const income = q * d.dailyIncome;
      total += income;
      breakdown.push({ id: d.id, name: d.name, qty: q, income });
    });
    if (total <= 0) return { total: 0, bankId: null, bankName: '—', breakdown: [] };

    const bank = richestBank(state);
    if (!bank) return { total: 0, bankId: null, bankName: '—', breakdown };

    bank.balance += total;
    return {
      total,
      bankId: bank.id,
      bankName: bank.shortName || bank.name,
      breakdown,
    };
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    INFRASTRUCTURE_DEFS,
    getInfraDef,
    ensureInfraState,
    infraQty,
    buyInfrastructure,
    totalInfrastructureValue,
    totalInfrastructureDailyIncome,
    injectInfrastructureIncome,
  });
})(window);
