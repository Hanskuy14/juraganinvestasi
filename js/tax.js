/* =========================================================================
   tax.js — CoreTax DJP engine.
   - PPh Final 0.1% on each sale profit (handled inline in market.js for
     immediate withholding; this module tracks lifetime totals + UI helpers).
   - Annual Tax: 1% of Net Worth assessed every 30 days (a "tax month").
       Reduced by Tax Consultant tier:
         Junior   → 1.0%   (no rate cut, but cancels penalty)
         Senior   → 0.5%
         Mantan DJP → 0.1%
   - Penalty: 2% / day on overdue principal once 10 days past due,
       UNLESS a Tax Consultant of any tier is hired.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Constants ---------- */
  const PPH_FINAL_RATE       = 0.001;   // 0.1% on sale profit
  const ANNUAL_TAX_RATE_BASE = 0.01;    // 1.0% of NW per 30 days
  const PENALTY_DAILY_RATE   = 0.02;    // 2% / day after grace
  const PENALTY_GRACE_DAYS   = 10;      // start applying after 10 days overdue
  const ANNUAL_DUE_DAYS      = 10;      // pay within this many days after assessment

  let _taxIdCounter = 0;
  function _newTaxId() {
    _taxIdCounter += 1;
    return `tax-${Date.now().toString(36)}-${_taxIdCounter.toString(36)}`;
  }

  /* ---------- Helpers using HRD perks ---------- */
  function getTaxConsultant(state) {
    if (JI.getActivePerks) {
      const p = JI.getActivePerks(state);
      if (p && p.taxConsultant) return p.taxConsultant;
    }
    return null;
  }

  function effectiveAnnualRate(state) {
    const tc = getTaxConsultant(state);
    if (!tc) return ANNUAL_TAX_RATE_BASE;
    // tc has tier-specific annualRate (set in hrd.js); fall back to base.
    return typeof tc.annualRate === 'number' ? tc.annualRate : ANNUAL_TAX_RATE_BASE;
  }

  function penaltiesEnabled(state) {
    // Any consultant tier blocks penalties.
    return getTaxConsultant(state) === null;
  }

  /* =========================================================================
     assessAnnualTax(state)
     Called on month change. Computes 1% (or reduced %) of current Net Worth
     and creates a new liability with dueDay = current + 10.
     ========================================================================= */
  function assessAnnualTax(state) {
    JI.recomputeNetWorth(state);
    const nw = Math.max(0, Math.round(state.totalNetWorth || 0));
    if (nw <= 0) return null;

    const rate = effectiveAnnualRate(state);
    const baseAmount = Math.round(nw * rate);
    if (baseAmount <= 0) return null;

    const liability = {
      id: _newTaxId(),
      type: 'annual',
      label: 'Pajak Tahunan (per 30 hari)',
      baseAmount,                  // original assessed amount
      owedAmount: baseAmount,      // remaining outstanding (grows with penalties)
      penaltyAccrued: 0,           // total penalty added so far
      paid: 0,
      isPaid: false,
      createdDay: state.totalDays,
      dueDay: state.totalDays + ANNUAL_DUE_DAYS,
      lastPenaltyDay: 0,           // last day a penalty tick was applied
      ratePctApplied: +(rate * 100).toFixed(2),
      netWorthSnapshot: nw,
    };
    state.taxLiabilities = state.taxLiabilities || [];
    state.taxLiabilities.push(liability);
    return liability;
  }

  /* =========================================================================
     applyDailyPenalties(state)
     Called daily AFTER day increment. For each unpaid liability past
     dueDay + grace, apply 2% daily penalty on remaining owedAmount.
     Skipped entirely if a tax consultant is hired.
     Returns: events list.
     ========================================================================= */
  function applyDailyPenalties(state) {
    const events = [];
    if (!penaltiesEnabled(state)) return events;
    const today = state.totalDays;
    (state.taxLiabilities || []).forEach(liab => {
      if (liab.isPaid) return;
      const overdueDays = today - liab.dueDay;
      if (overdueDays <= PENALTY_GRACE_DAYS) return;

      // Only apply at most one penalty per day.
      if (liab.lastPenaltyDay === today) return;

      const penalty = Math.round(liab.owedAmount * PENALTY_DAILY_RATE);
      if (penalty <= 0) return;

      liab.owedAmount += penalty;
      liab.penaltyAccrued += penalty;
      liab.lastPenaltyDay = today;
      events.push({ id: liab.id, penalty, owedAmount: liab.owedAmount });
    });
    return events;
  }

  /* =========================================================================
     payTax(state, taxId, payment)
     Pay (full) a specific liability. Uses universal JI.charge() helper.
     payment = { method: 'bank'|'credit', bankId }
     ========================================================================= */
  function payTax(state, taxId, payment) {
    const liab = (state.taxLiabilities || []).find(t => t.id === taxId);
    if (!liab) return { ok: false, error: 'Tagihan pajak tidak ditemukan.' };
    if (liab.isPaid) return { ok: false, error: 'Tagihan sudah lunas.' };

    const owed = liab.owedAmount;
    if (owed <= 0) {
      liab.isPaid = true;
      return { ok: false, error: 'Nominal tidak valid.' };
    }

    const charged = JI.charge(state, owed, {
      ...payment,
      label: `Bayar Pajak Tahunan${liab.penaltyAccrued ? ' + denda' : ''}`,
    });
    if (!charged.ok) return { ok: false, error: charged.error };

    liab.paid = owed;
    liab.owedAmount = 0;
    liab.isPaid = true;
    liab.paidDay = state.totalDays;
    liab.paidVia = charged.method;
    liab.paidBankId = charged.bankId;

    // Lifetime stats
    state.taxStats = state.taxStats || { totalPPhPaid: 0, totalAnnualPaid: 0, totalPenaltiesPaid: 0 };
    if (liab.type === 'annual') {
      state.taxStats.totalAnnualPaid += liab.baseAmount;
      state.taxStats.totalPenaltiesPaid += (liab.penaltyAccrued || 0);
    }

    JI.recomputeNetWorth(state);
    return { ok: true, paid: owed, penaltyPaid: liab.penaltyAccrued || 0, payment: charged };
  }

  /* =========================================================================
     UI helpers
     ========================================================================= */
  function listOpenLiabilities(state) {
    return (state.taxLiabilities || []).filter(t => !t.isPaid);
  }

  function listPaidLiabilities(state, limit = 30) {
    return (state.taxLiabilities || [])
      .filter(t => t.isPaid)
      .sort((a, b) => (b.paidDay || 0) - (a.paidDay || 0))
      .slice(0, limit);
  }

  function totalUnpaidTax(state) {
    return listOpenLiabilities(state).reduce((a, l) => a + (l.owedAmount || 0), 0);
  }

  function nextAnnualAssessmentDay(state) {
    // Annual tax is assessed when totalDays % 30 === 1 (day 31, 61, ...)
    const t = state.totalDays;
    const cycle = ((t - 1) % 30);
    return t + (30 - cycle);
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    PPH_FINAL_RATE,
    ANNUAL_TAX_RATE_BASE,
    PENALTY_DAILY_RATE,
    PENALTY_GRACE_DAYS,
    ANNUAL_DUE_DAYS,
    assessAnnualTax,
    applyDailyPenalties,
    payTax,
    listOpenLiabilities,
    listPaidLiabilities,
    totalUnpaidTax,
    nextAnnualAssessmentDay,
    getTaxConsultant,
    effectiveAnnualRate,
    penaltiesEnabled,
  });
})(window);
