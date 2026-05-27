/* =========================================================================
   loop.js — The "Next Day" orchestrator.

   Phase 6 RULES enforced here:
     - DELAYED NEWS EFFECT: the news the player saw YESTERDAY (already
       queued in state.pendingNewsEffects) is what moves prices today.
     - calculateNextDayPrices() consumes pendingNewsEffects FIRST, then
       random-walks unaffected assets.
     - generateDailyNews() runs LAST — those headlines drive TOMORROW's
       prices.
     - Mega Infrastructure passive income is auto-credited to the richest
       bank every Next Day.

   Order of operations in nextDay():
     1. Increment totalDays.
     2. Reset opsCostMultiplierToday = 1.
     3. calculateNextDayPrices(state)
          a. apply each entry in state.pendingNewsEffects to its asset
          b. clear pendingNewsEffects
          c. random-walk drift for every asset NOT touched in (a)
     4. Roll random event (8%) — may stack price moves, deduct cash, set
        ops cost multiplier, award XP (Podcast), or clear taxes.
     5. Loan installments per active loan.
     6. Daily operational cost = dailyOpsCost * opsCostMultiplierToday,
        deducted from richest bank.
     7. Mega Infrastructure daily income credited to richest bank.
     8. generateDailyNews(state) for the NEW day, push each item into
        state.pendingNewsEffects (these will land tomorrow).
     9. recomputeNetWorth + saveState.

   No XP from this loop (Phase 5 rule retained).
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

    /* 3. Apply YESTERDAY's queued news effects, then random-walk the rest. */
    if (typeof JI.calculateNextDayPrices === 'function') {
      JI.calculateNextDayPrices(state);
    }

    /* 4. Random event roll (8%). May modify prices / cash / XP / taxes /
          opsCostMultiplierToday. */
    let event = null;
    if (typeof JI.rollRandomEvent === 'function') {
      event = JI.rollRandomEvent(state);
    }

    /* 5. Loan installments. */
    const loanReport = processLoanInstallments(state);

    /* 6. Daily operational cost (with optional event multiplier). */
    const opsReport = chargeOperationalCost(state);

    /* 7. Mega Infrastructure passive income. */
    let infraReport = { total: 0, bankName: '—', breakdown: [] };
    if (typeof JI.injectInfrastructureIncome === 'function') {
      infraReport = JI.injectInfrastructureIncome(state);
    }

    /* 8. Generate TODAY's news (will affect TOMORROW's prices via
          pendingNewsEffects). */
    let todaysNews = [];
    if (typeof JI.generateDailyNews === 'function') {
      todaysNews = JI.generateDailyNews(state) || [];
    }
    state.todaysNews = todaysNews.slice();
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(...todaysNews);
    if (state.newsHistory.length > 200) state.newsHistory.length = 200;

    state.pendingNewsEffects = state.pendingNewsEffects || [];
    todaysNews.forEach(n => {
      state.pendingNewsEffects.push({
        ticker: n.ticker,
        multiplier: n.multiplier,
        source: 'news',
      });
    });

    /* 9. Finalize. (Phase 5 rule retained: no XP from the loop.) */
    JI.recomputeNetWorth(state);
    JI.saveState(state);

    return {
      day: state.totalDays,
      news: todaysNews,
      event,            // null or populated event object
      loanReport,
      opsReport,
      infraReport,
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
