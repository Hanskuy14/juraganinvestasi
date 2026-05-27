/* =========================================================================
   loop.js — The "Next Day" orchestrator.

   Phase 5 RULES enforced here:
     - NO XP is added to companyXP from this loop.
     - 8% chance to fire a random event (events.js handles selection).

   Phase 6 reorder:
     - Price walk runs FIRST and drains state.pendingNewsEffects from
       yesterday (delayed news effect). Same-day news no longer drives
       same-day prices.
     - generateDailyNews() runs AFTER the walk and queues today's
       multipliers into pendingNewsEffects so they land tomorrow.
     - injectInfrastructureIncome() credits Mega Infrastruktur income
       to the richest bank during the same daily tick.
     - Random events still apply price moves immediately (they are
       acknowledged-impact pop-ups, not delayed news).

   Order of operations in nextDay():
     1. Increment totalDays.
     2. Reset opsCostMultiplierToday = 1.
     3. calculateNextDayPrices(state) → drift + drain yesterday's queue.
     4. Generate today's asset news (2..4 headlines), queue effects for
        tomorrow.
     5. Roll random event (8%) — may stack additional price moves, deduct
        cash, set ops cost multiplier, award XP (Podcast), or clear taxes.
     6. injectInfrastructureIncome → credit Sektor Riil income.
     7. Loan installments.
     8. Daily operational cost = dailyOpsCost * opsCostMultiplierToday,
        deducted from richest bank.
     9. Phase 7: venture monthly burn + e-IPO ticks.
    10. recomputeNetWorth + saveState.
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

    /* 3. Phase 6 — price walk FIRST. Drains state.pendingNewsEffects
          from yesterday + applies baseline drift. */
    if (typeof JI.calculateNextDayPrices === 'function') {
      JI.calculateNextDayPrices(state);
    }

    /* 4. Generate today's asset news (visible same-day, impact tomorrow). */
    const todaysNews = (typeof JI.generateDailyNews === 'function')
      ? JI.generateDailyNews(state)
      : [];
    state.todaysNews = todaysNews.slice();
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(...todaysNews);
    if (state.newsHistory.length > 200) state.newsHistory.length = 200;

    /* 4b. Queue today's pre-rolled multipliers so they fire tomorrow. */
    if (typeof JI.queueNewsEffects === 'function') {
      JI.queueNewsEffects(state, todaysNews);
    }

    /* 5. Random event roll (8%). May modify prices / cash / XP / taxes /
          opsCostMultiplierToday. Events still apply instantly. */
    let event = null;
    if (typeof JI.rollRandomEvent === 'function') {
      event = JI.rollRandomEvent(state);
    }

    /* 6. Phase 6 — Mega Infrastruktur daily income. Auto-credit to the
          richest bank. */
    let infraReport = null;
    if (typeof JI.injectInfrastructureIncome === 'function') {
      infraReport = JI.injectInfrastructureIncome(state);
    }

    /* 7. Loan installments. */
    const loanReport = processLoanInstallments(state);

    /* 8. Daily operational cost (with optional event multiplier). */
    const opsReport = chargeOperationalCost(state);

    /* 9. Phase 7 — Venture monthly burn (every 30 days from foundedDay). */
    const ventureReport = (typeof JI.processMonthlyBurn === 'function')
      ? JI.processMonthlyBurn(state)
      : null;

    /* 10. Phase 7 — e-IPO daily ticks: process listings (settle orders) THEN
          maybe spawn a new IPO. Listings happen first so a freshly spawned
          IPO can't accidentally list on the same day. */
    let ipoSpawned = null;
    let ipoListings = [];
    if (typeof JI.processListings === 'function') {
      ipoListings = JI.processListings(state) || [];
    }
    if (typeof JI.maybeSpawnIPO === 'function') {
      ipoSpawned = JI.maybeSpawnIPO(state);
    }

    /* 11. Finalize. (Phase 5: explicitly NO XP awarded here.) */
    JI.recomputeNetWorth(state);
    JI.saveState(state);

    return {
      day: state.totalDays,
      news: todaysNews,
      event,            // null or populated event object
      loanReport,
      opsReport,
      infraReport,      // Phase 6
      ventureReport,    // Phase 7
      ipoSpawned,       // Phase 7
      ipoListings,      // Phase 7
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
