/* =========================================================================
   app.js — Bootstrap, intro animation, day advance orchestrator.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI;
  const INTRO_TEXT = '@farhandwisusilo';
  const TYPE_SPEED_MS = 90;
  const HOLD_AFTER_TYPE_MS = 900;
  const FADE_MS = 700;

  /* =========================================================================
     INTRO
     ========================================================================= */
  function runIntro() {
    return new Promise(resolve => {
      const target = document.getElementById('intro-text');
      const cursor = document.getElementById('intro-cursor');
      const screen = document.getElementById('intro-screen');
      if (!target || !screen) { resolve(); return; }

      let i = 0;
      function tick() {
        if (i <= INTRO_TEXT.length) {
          target.textContent = INTRO_TEXT.slice(0, i);
          i += 1;
          setTimeout(tick, TYPE_SPEED_MS);
        } else {
          if (cursor) cursor.style.animation = 'none';
          setTimeout(() => {
            screen.classList.add('fade-out');
            setTimeout(() => {
              screen.style.display = 'none';
              resolve();
            }, FADE_MS);
          }, HOLD_AFTER_TYPE_MS);
        }
      }
      tick();
    });
  }

  function showApp() {
    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');
  }

  /* =========================================================================
     ADVANCE DAY orchestrator
     Order:
       1. Generate daily news for the upcoming day.
       2. Build news impact map.
       3. Run Random Walk with Drift on all assets.
       4. Tick loan installments.
       5. Increment totalDays.
       6. Recompute net worth, save, re-render.
     ========================================================================= */
  let _advancing = false;

  function advanceDay() {
    if (_advancing) return;
    _advancing = true;
    try {
      const s = JI.gameState;

      // 1. Move calendar forward first so news/prices belong to the new day.
      s.totalDays = (s.totalDays || 1) + 1;

      // 2. News for the new day.
      const news = JI.generateDailyNews(s);

      // 3. Build impact map and step prices.
      const impactMap = JI.buildImpactMap(news);
      JI.calculateNextDayPrices(s, impactMap);

      // 4. Loan installments.
      const loanEvents = JI.tickDailyLoans(s);
      surfaceLoanEvents(loanEvents);

      // 5. XP for surviving another day of operations.
      JI.awardXP(s, 30);

      // 6. Recompute & persist.
      JI.recomputeNetWorth(s);
      JI.saveState(s);

      // 7. Toast first headline as a hint
      const lead = news[0];
      if (lead) {
        const cls = lead.mood === 'bearish' ? 'warning' : 'info';
        JI.toast(`${lead.icon || '📰'} ${lead.headline}`, cls, 3500);
      }

      JI.renderAll();
    } finally {
      _advancing = false;
    }
  }

  function surfaceLoanEvents(events) {
    if (!events) return;
    events.forEach(ev => {
      const bank = JI.getBank(JI.gameState, ev.bankId);
      const name = bank ? bank.shortName : ev.bankId;
      if (ev.missed) {
        JI.toast(
          `Cicilan ${name} gagal — denda ${JI.formatIDR(ev.penalty)} ditambahkan.`,
          'error', 3500);
      } else if (ev.warning) {
        JI.toast(
          `Cicilan ${name} ditagihkan ke kartu kredit (${JI.formatIDR(ev.paid)}).`,
          'warning', 3500);
      } else if (ev.closed) {
        JI.toast(`Pinjaman ${name} lunas! 🎉`, 'success', 3500);
      }
    });
  }

  /* =========================================================================
     BOOTSTRAP
     ========================================================================= */
  function bootstrap() {
    // 1. Init state, banks, market.
    JI.initState();
    JI.initBanks(JI.gameState);
    JI.initMarket(JI.gameState);
    JI.recomputeOfficeCapacity(JI.gameState);
    JI.recomputeNetWorth(JI.gameState);
    JI.saveState(JI.gameState);

    // 2. Build static UI scaffolding.
    JI.buildTabs();
    JI.bindGlobalEvents();

    // 3. Render initial panel.
    JI.renderAll();

    // 4. Periodic header refresh (clock).
    setInterval(JI.renderHeader, 30_000);
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    advanceDay,
  });

  document.addEventListener('DOMContentLoaded', () => {
    bootstrap();
    runIntro().then(showApp);
  });
})(window);
