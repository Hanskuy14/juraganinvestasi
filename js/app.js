/* =========================================================================
   app.js — Bootstrap, intro animation, periodic refresh.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI;
  const INTRO_TEXT = '@farhandwisusilo';
  const TYPE_SPEED_MS = 90;
  const HOLD_AFTER_TYPE_MS = 900;
  const FADE_MS = 700;

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

  function bootstrap() {
    // 1. Init state and banks
    JI.initState();
    JI.initBanks(JI.gameState);
    // Phase 5: ensure the 45 hardcoded asset prices are seeded.
    if (typeof JI.seedMarket === 'function') JI.seedMarket(JI.gameState);
    // Phase 6: ensure Mega Infrastructure state shape exists.
    if (typeof JI.ensureInfraState === 'function') JI.ensureInfraState(JI.gameState);

    /* Phase 6: seed Day 1 news so the player has headlines to read on
       Day 1, while their price effects sit in pendingNewsEffects and
       only land when the player clicks "Next Day" (= Day 2). This
       enforces the delayed-effect rule even on a brand new game. */
    seedInitialNewsIfNeeded(JI.gameState);

    JI.recomputeNetWorth(JI.gameState);
    JI.saveState(JI.gameState);

    // 2. Build static UI scaffolding
    JI.buildTabs();
    JI.bindGlobalEvents();

    // 3. Render the active tab
    JI.renderAll();

    // 4. Periodic header refresh (clock + net worth display) every 30s.
    setInterval(JI.renderHeader, 30_000);
  }

  function seedInitialNewsIfNeeded(state) {
    if (!state) return;
    const noTodaysNews   = !state.todaysNews || state.todaysNews.length === 0;
    const noPendingFx    = !state.pendingNewsEffects || state.pendingNewsEffects.length === 0;
    const noHistoryToday = !(state.newsHistory || []).some(n => n.day === state.totalDays);
    if (!(noTodaysNews && noPendingFx && noHistoryToday)) return;
    if (typeof JI.generateDailyNews !== 'function') return;

    const news = JI.generateDailyNews(state) || [];
    state.todaysNews = news.slice();
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(...news);
    if (state.newsHistory.length > 200) state.newsHistory.length = 200;

    state.pendingNewsEffects = state.pendingNewsEffects || [];
    news.forEach(n => {
      state.pendingNewsEffects.push({
        ticker: n.ticker,
        multiplier: n.multiplier,
        source: 'news',
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bootstrap();
    runIntro().then(showApp);
  });
})(window);
