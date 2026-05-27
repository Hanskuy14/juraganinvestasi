/* =========================================================================
   loop.js — The "Next Day" orchestrator.

   Phase 5 RULES enforced here:
     - NO XP is added to companyXP from this loop.
     - 8% chance to fire a random event (events.js handles selection).
     - Asset-specific news is generated FIRST, then drives price impacts.
     - opsCostMultiplierToday is reset at the START of every day, then can
       be modified by an event (e.g. Indihome Mati x5) before ops cost is
       deducted at the END of the day.

   Order of operations in nextDay():
     1. Increment totalDays.
     2. Reset opsCostMultiplierToday = 1.
     3. Generate today's asset news (2..4 headlines).
     4. calculateNextDayPrices(state, todaysNews)  → instant spikes/drops.
     5. Roll random event (8%) — may stack additional price moves, deduct
        cash, set ops cost multiplier, award XP (Podcast), or clear taxes.
     6. Loan installments: deduct daily installment per active loan.
     7. Daily operational cost = dailyOpsCost * opsCostMultiplierToday,
        deducted from richest bank.
     8. recomputeNetWorth + saveState.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- helper: get richest bank (for ops cost deduction) ---------- */
  function richestBank(state) {
    if (!state.banks || state.banks.length === 0) return null;
    return state.banks.reduce((best, b) =>
      (best == null || b.balance > best.balance) ? b : best, null);
  }

  /* ---------- Loan installment processing ---------- */
  function processLoanInstallments(state) {
    let totalPaid = 0;
    let loansClosed = 0;
    (state.banks || []).forEach(bank => {
      if (!bank.loan || !bank.loan.isActive) return;
      const due = Math.min(bank.loan.dailyInstallment, bank.loan.remaining);
      bank.balance -= due;          // overdraft allowed (goes negative)
      bank.loan.remaining -= due;
      bank.loan.daysRemaining -= 1;
      totalPaid += due;
      if (bank.loan.remaining <= 0 || bank.loan.daysRemaining <= 0) {
        bank.loan.isActive = false;
        bank.loan.remaining = 0;
        bank.loan.daysRemaining = 0;
        bank.loan.dailyInstallment = 0;
        loansClosed++;
      }
    });
    return { totalPaid, loansClosed };
  }

  /* ---------- Daily ops cost (with multiplier) ---------- */
  function chargeOperationalCost(state) {
    const base = Number(state.dailyOpsCost) || 0;
    const mult = Number(state.opsCostMultiplierToday) || 1;
    const cost = Math.round(base * mult);
    if (cost <= 0) return { cost: 0, bankName: '—' };
    const bank = richestBank(state);
    if (!bank) return { cost: 0, bankName: '—' };
    bank.balance -= cost;
    return { cost, bankName: bank.shortName || bank.name, multiplier: mult };
  }

  /* =========================================================================
     nextDay(state)
     ========================================================================= */
  function nextDay(state) {
    if (!state) return null;

    // Make sure market is seeded (handles fresh games & v1->v2 migration).
    if (typeof JI.seedMarket === 'function') JI.seedMarket(state);

    /* 1. Advance the calendar. */
    state.totalDays = (state.totalDays || 1) + 1;

    /* 2. Reset per-day modifiers. */
    state.opsCostMultiplierToday = 1;

    /* 3. Generate today's asset news. */
    const todaysNews = (typeof JI.generateDailyNews === 'function')
      ? JI.generateDailyNews(state)
      : [];
    state.todaysNews = todaysNews.slice();
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(...todaysNews);
    if (state.newsHistory.length > 200) state.newsHistory.length = 200;

    /* 4. Apply baseline drift + per-asset news impact. */
    if (typeof JI.calculateNextDayPrices === 'function') {
      JI.calculateNextDayPrices(state, todaysNews);
    }

    /* 5. Random event roll (8%). May modify prices / cash / XP / taxes /
          opsCostMultiplierToday. */
    let event = null;
    if (typeof JI.rollRandomEvent === 'function') {
      event = JI.rollRandomEvent(state);
    }

    /* 6. Loan installments. */
    const loanReport = processLoanInstallments(state);

    /* 7. Daily operational cost (with optional event multiplier). */
    const opsReport = chargeOperationalCost(state);

    /* 8. Finalize. (Phase 5: explicitly NO XP awarded here.) */
    JI.recomputeNetWorth(state);
    JI.saveState(state);

    return {
      day: state.totalDays,
      news: todaysNews,
      event,            // null or populated event object
      loanReport,
      opsReport,
    };
  }

  /* ---------- Manual loop helper for tests / debug ---------- */
  function fastForward(state, days) {
    const reports = [];
    const n = Math.max(0, Math.floor(days || 0));
    for (let i = 0; i < n; i++) {
      reports.push(nextDay(state));
      // If an event is pending, normally UI would block; in fast-forward
      // we just clear it so the loop can continue.
      state.pendingEvent = null;
    }
    return reports;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    nextDay,
    fastForward,
    processLoanInstallments,
    chargeOperationalCost,
  });
})(window);
