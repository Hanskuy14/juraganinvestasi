/* =========================================================================
   hrd.js — HRD module (Phase 3).
   - 3 roles x 3 tiers each.
   - Constraint: hire only if hiredEmployees.length < officeCapacity.
   - One employee per role (player can only have 1 of each role).
   - Salaries deducted on month change (every 30 days).
   - getActivePerks(state) is read by market.js (broker), tax.js (consultant),
     and ui.js (analyst predictions).
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* =========================================================================
     ROLE / TIER catalog
     ========================================================================= */
  const ROLES = [
    {
      key: 'analyst',
      label: 'Analis Keuangan',
      icon: '📊',
      tagline: 'Membaca arah pasar dari berita harian.',
      perkType: 'analyst',
      tiers: [
        {
          tier: 1,
          name: 'Junior Analis',
          salary: 3_000_000,
          summary: '1 prediksi aset terkuat per hari.',
          perks: { tier: 1, predictionCount: 1 },
        },
        {
          tier: 2,
          name: 'Senior Analis',
          salary: 10_000_000,
          summary: '3 prediksi aset terkuat per hari.',
          perks: { tier: 2, predictionCount: 3 },
        },
        {
          tier: 3,
          name: 'Veteran Analis',
          salary: 35_000_000,
          summary: '5 prediksi + bias positif harian (+0.2% drift).',
          perks: { tier: 3, predictionCount: 5, positiveDrift: 0.002 },
        },
      ],
    },
    {
      key: 'taxConsultant',
      label: 'Konsultan Pajak',
      icon: '🧾',
      tagline: 'Memitigasi pajak tahunan dan denda keterlambatan.',
      perkType: 'taxConsultant',
      tiers: [
        {
          tier: 1,
          name: 'Junior Pajak',
          salary: 5_000_000,
          summary: 'Menghentikan denda 2% per hari.',
          perks: { tier: 1, annualRate: 0.01, blocksPenalty: true },
        },
        {
          tier: 2,
          name: 'Senior Pajak',
          salary: 15_000_000,
          summary: 'Stop denda + pajak tahunan turun ke 0.5%.',
          perks: { tier: 2, annualRate: 0.005, blocksPenalty: true },
        },
        {
          tier: 3,
          name: 'Mantan DJP',
          salary: 50_000_000,
          summary: 'Stop denda + pajak tahunan hanya 0.1%.',
          perks: { tier: 3, annualRate: 0.001, blocksPenalty: true },
        },
      ],
    },
    {
      key: 'broker',
      label: 'Broker',
      icon: '💼',
      tagline: 'Eksekusi jual/beli dengan biaya transaksi yang lebih baik.',
      perkType: 'broker',
      tiers: [
        {
          tier: 1,
          name: 'Junior Broker',
          salary: 4_000_000,
          summary: 'Fee transaksi 0.15%.',
          perks: { tier: 1, feeRate: 0.0015, cashbackRate: 0 },
        },
        {
          tier: 2,
          name: 'Senior Broker',
          salary: 15_000_000,
          summary: 'Fee transaksi 0.05%.',
          perks: { tier: 2, feeRate: 0.0005, cashbackRate: 0 },
        },
        {
          tier: 3,
          name: 'Bandar',
          salary: 40_000_000,
          summary: 'Fee 0% + cashback 0.1% per transaksi.',
          perks: { tier: 3, feeRate: 0, cashbackRate: 0.001 },
        },
      ],
    },
  ];

  function getRoleDef(roleKey) {
    return ROLES.find(r => r.key === roleKey) || null;
  }

  function getTierDef(roleKey, tier) {
    const role = getRoleDef(roleKey);
    if (!role) return null;
    return role.tiers.find(t => t.tier === tier) || null;
  }

  /* =========================================================================
     Capacity helpers
     ========================================================================= */
  function officeCapacity(state) {
    return (state.physicalAssets && state.physicalAssets.officeCapacity) || 0;
  }

  function hiredCount(state) {
    return (state.hiredEmployees || []).length;
  }

  function hasRole(state, roleKey) {
    return (state.hiredEmployees || []).some(e => e.role === roleKey);
  }

  function canHire(state) {
    return hiredCount(state) < officeCapacity(state);
  }

  function getEmployeeOfRole(state, roleKey) {
    return (state.hiredEmployees || []).find(e => e.role === roleKey) || null;
  }

  /* =========================================================================
     Hire / Fire
     ========================================================================= */
  let _empCounter = 0;
  function _newEmployeeId(roleKey) {
    _empCounter += 1;
    return `emp-${roleKey}-${Date.now().toString(36)}-${_empCounter.toString(36)}`;
  }

  function hireEmployee(state, roleKey, tier) {
    const role = getRoleDef(roleKey);
    if (!role) return { ok: false, error: 'Role tidak dikenal.' };
    const tierDef = getTierDef(roleKey, tier);
    if (!tierDef) return { ok: false, error: 'Tier tidak dikenal.' };

    const cap = officeCapacity(state);
    if (cap <= 0) {
      return { ok: false,
        error: 'Belum ada properti kantor — beli kantor dulu di tab Aset Fisik.' };
    }
    if (hasRole(state, roleKey)) {
      return { ok: false,
        error: `Sudah ada karyawan untuk role "${role.label}". Pecat dulu untuk meng-upgrade tier.` };
    }
    if (!canHire(state)) {
      return { ok: false,
        error: `Kapasitas kantor penuh (${hiredCount(state)}/${cap}). Beli properti tambahan untuk merekrut lebih banyak.` };
    }

    const emp = {
      id: _newEmployeeId(roleKey),
      role: roleKey,
      roleLabel: role.label,
      tier: tierDef.tier,
      tierName: tierDef.name,
      salary: tierDef.salary,
      perks: { ...(tierDef.perks || {}) },
      hiredOn: state.totalDays,
    };
    state.hiredEmployees = state.hiredEmployees || [];
    state.hiredEmployees.push(emp);

    JI.recomputeNetWorth(state);
    return { ok: true, employee: emp };
  }

  function fireEmployee(state, employeeId) {
    const arr = state.hiredEmployees || [];
    const idx = arr.findIndex(e => e.id === employeeId);
    if (idx < 0) return { ok: false, error: 'Karyawan tidak ditemukan.' };
    const removed = arr.splice(idx, 1)[0];
    JI.recomputeNetWorth(state);
    return { ok: true, employee: removed };
  }

  /* =========================================================================
     getActivePerks(state)
     Aggregates the perks of all hired employees keyed by perk type.
     Used by:
       - market.js getBrokerRates()
       - market.js calculateNextDayPrices() (analyst veteran drift)
       - market.js predictMarketImpacts() (analyst prediction count)
       - tax.js   effectiveAnnualRate() / penaltiesEnabled()
       - ui.js    home/HRD/CoreTax displays
     ========================================================================= */
  function getActivePerks(state) {
    const out = {
      analyst: null,
      taxConsultant: null,
      broker: null,
    };
    const employees = state.hiredEmployees || [];
    employees.forEach(emp => {
      const role = getRoleDef(emp.role);
      if (!role) return;
      const tierDef = getTierDef(emp.role, emp.tier);
      const perks = (tierDef && tierDef.perks) || emp.perks || {};
      out[role.perkType] = {
        employeeId: emp.id,
        roleKey: role.key,
        roleLabel: role.label,
        tier: emp.tier,
        tierName: emp.tierName || (tierDef && tierDef.name),
        ...perks,
      };
    });
    return out;
  }

  /* =========================================================================
     monthlyPayroll(state)
     Called once per month change. Sums salaries of all hired employees and
     deducts via deductFromBest (banks, then CC, else missed).
     Returns { totalPayroll, deduction }.
     ========================================================================= */
  function monthlyPayroll(state) {
    const employees = state.hiredEmployees || [];
    const totalPayroll = employees.reduce((a, e) => a + (e.salary || 0), 0);
    if (totalPayroll <= 0) {
      return { totalPayroll: 0, deduction: { ok: true, sources: [], shortfall: 0 } };
    }
    const deduction = JI.deductFromBest(state, totalPayroll, 'Gaji Karyawan');
    return { totalPayroll, deduction, employees: employees.length };
  }

  /* =========================================================================
     UI helpers
     ========================================================================= */
  function totalMonthlySalary(state) {
    return (state.hiredEmployees || []).reduce((a, e) => a + (e.salary || 0), 0);
  }

  function describePerks(perks) {
    if (!perks) return [];
    const out = [];
    if (perks.analyst) {
      out.push(`Analis ${perks.analyst.tierName} — ${perks.analyst.predictionCount} prediksi/hari` +
        (perks.analyst.positiveDrift ? ` + drift +${(perks.analyst.positiveDrift*100).toFixed(1)}%` : ''));
    }
    if (perks.taxConsultant) {
      out.push(`Pajak ${perks.taxConsultant.tierName} — pajak tahunan ${(perks.taxConsultant.annualRate*100).toFixed(1)}%` +
        (perks.taxConsultant.blocksPenalty ? ' + stop denda' : ''));
    }
    if (perks.broker) {
      out.push(`Broker ${perks.broker.tierName} — fee ${(perks.broker.feeRate*100).toFixed(2)}%` +
        (perks.broker.cashbackRate ? ` + cashback ${(perks.broker.cashbackRate*100).toFixed(2)}%` : ''));
    }
    return out;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    HRD_ROLES: ROLES,
    getRoleDef,
    getTierDef,
    officeCapacity,
    hiredCount,
    hasRole,
    canHire,
    getEmployeeOfRole,
    hireEmployee,
    fireEmployee,
    getActivePerks,
    monthlyPayroll,
    totalMonthlySalary,
    describePerks,
  });
})(window);
