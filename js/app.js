/* =========================================================================
   app.js — Bootstrap, intro animation, periodic refresh, onboarding flow.
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

  function hideMainMenu() {
    const menu = document.getElementById('main-menu');
    if (menu) {
      menu.classList.add('hidden');
      menu.classList.remove('flex');
    }
  }

  function showMainMenu() {
    const menu = document.getElementById('main-menu');
    if (!menu) return;
    menu.classList.remove('hidden');
    menu.classList.add('flex');
    if (typeof JI.renderMainMenu === 'function') {
      JI.renderMainMenu(menu, finishOnboarding);
    }
  }

  /* ---------- Onboarding result handler ----------
     Called by the Main Menu form submit. Distributes capital, marks the
     state initialized, then reveals the OS interface. */
  function finishOnboarding({ name, gender, capital }) {
    const s = JI.gameState;
    s.playerName    = name;
    s.playerGender  = gender;
    s.startingCapital = Math.floor(capital);
    s.banks         = []; // force re-init at custom capital
    JI.initBanks(s, s.startingCapital);

    // Phase 7: seed the IPO pool so the first Next Day can spawn already.
    if (typeof JI.ensureIPOPool === 'function') JI.ensureIPOPool(s);

    s.meta = s.meta || {};
    s.meta.initialized = true;
    s.totalDays = 1;

    // Phase 6 — seed Day-1 news so headlines are visible immediately and
    //          their multipliers land on the first Next Day click.
    s.todaysNews = [];
    s.pendingNewsEffects = [];
    seedDay1News(s);

    JI.recomputeNetWorth(s);
    JI.saveState(s);

    hideMainMenu();
    showApp();
    JI.renderAll();

    // Welcoming toast
    const title = `${gender === 'Ibu' ? 'Ibu' : 'Bapak'} ${name}`;
    JI.toast(`Selamat datang, CEO ${title}! Modal ${JI.formatIDR(s.startingCapital)} telah dibagi ke 3 bank.`, 'success', 5000);
  }

  function bootstrap() {
    // 1. Init state (load or create v3 default)
    JI.initState();

    // 2. Always seed market (45 base assets + dynamicAssets re-hydration).
    if (typeof JI.seedMarket === 'function') JI.seedMarket(JI.gameState);

    // 3. If already initialized, also init/refresh banks now.
    if (JI.gameState.meta && JI.gameState.meta.initialized) {
      JI.initBanks(JI.gameState);
    }

    // 3b. Phase 6 — ensure infrastructure state is shaped.
    if (typeof JI.ensureInfraState === 'function') {
      JI.ensureInfraState(JI.gameState);
    }

    // 3c. Phase 6 — seed Day-1 news so headlines are visible immediately
    //              and their multipliers land when the player clicks Next
    //              Day for the first time. Skip if today's news already
    //              generated (e.g. reload mid-day).
    seedDay1News(JI.gameState);

    JI.recomputeNetWorth(JI.gameState);
    JI.saveState(JI.gameState);

    // 4. Build static UI scaffolding (works even before app reveal).
    JI.buildTabs();
    JI.bindGlobalEvents();

    // 5. Periodic header refresh every 30s.
    setInterval(() => {
      if (JI.gameState && JI.gameState.meta && JI.gameState.meta.initialized) {
        JI.renderHeader();
      }
    }, 30_000);
  }

  /* ---------- Day-1 news seeding (Phase 6) ----------
     Generates 2..4 headlines for the current day, queues their pre-rolled
     multipliers into state.pendingNewsEffects, and stores them in
     state.todaysNews / newsHistory so the News tab shows them today.

     Idempotent: runs only when there is no news for the current day yet.
  */
  function seedDay1News(state) {
    if (!state || typeof JI.generateDailyNews !== 'function') return;
    const day = state.totalDays || 1;
    const todays = (state.todaysNews || []).filter(n => n && n.day === day);
    if (todays.length > 0) return;
    const news = JI.generateDailyNews(state);
    if (!news || !news.length) return;
    state.todaysNews = news.slice();
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(...news);
    if (state.newsHistory.length > 200) state.newsHistory.length = 200;
    if (typeof JI.queueNewsEffects === 'function') {
      JI.queueNewsEffects(state, news);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    bootstrap();
    runIntro().then(() => {
      const s = JI.gameState;
      if (s && s.meta && s.meta.initialized) {
        showApp();
        JI.renderAll();
      } else {
        showMainMenu();
      }
    });
  });

  /* ---------- Expose ----------
     finishOnboarding is reachable for debug too. */
  Object.assign(JI, {
    finishOnboarding,
    showMainMenu,
    hideMainMenu,
  });
})(window);
