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
    // 1. Init state
    JI.initState();

    // 2. Init banks (creates them if missing, otherwise just refreshes tiers)
    JI.initBanks(JI.gameState);

    // 3. Phase 4 sub-system inits
    JI.ensureMarket(JI.gameState);
    JI.maybeRotateVC(JI.gameState);

    // 4. Net worth + persist
    JI.recomputeNetWorth(JI.gameState);
    JI.saveState(JI.gameState);

    // 5. Build static UI scaffolding
    JI.buildTabs();
    JI.bindGlobalEvents();

    // 6. Render the active tab + Next-Day FAB
    JI.renderAll();

    // 7. Periodic header refresh (clock + net worth display) every 30s.
    setInterval(JI.renderHeader, 30_000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bootstrap();
    runIntro().then(showApp);
  });
})(window);
