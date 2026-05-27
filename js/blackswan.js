/* =========================================================================
   blackswan.js — Rare global market shocks. 1.5% chance each in-game day.
   Each event applies an instant multiplier to part of the marketAssets map
   (built by market.js) and sets activeEventModifier so that app.js can
   skip the standard news-driven price update for that day (per spec:
   events override standard daily news multipliers).
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const TRIGGER_CHANCE = 0.015; // 1.5% per day

  /* ---------- Market scaling helpers ---------- */
  function scaleAllInCategory(state, category, factor) {
    if (!state || !state.marketAssets) return 0;
    let count = 0;
    Object.values(state.marketAssets).forEach(a => {
      if (a.category === category) {
        a.prevPrice = a.price;
        a.price = Math.max(1, Math.round(a.price * factor));
        a.dayChange    = a.price - a.prevPrice;
        a.dayChangePct = a.prevPrice > 0 ? (a.dayChange / a.prevPrice) * 100 : 0;
        count += 1;
      }
    });
    return count;
  }

  function scaleAllStocks(state, factor)  { return scaleAllInCategory(state, 'saham',  factor); }
  function scaleAllCryptos(state, factor) { return scaleAllInCategory(state, 'crypto', factor); }

  /**
   * Scale stocks whose static-catalog `sector` field matches.
   * Tech-related sectors in main's catalog: Teknologi, Telekomunikasi.
   * Banking sector key: Perbankan. Auto: Otomotif. Energy: Energi.
   */
  function scaleStocksBySector(state, sectorMatcher, factor) {
    if (!state || !state.marketAssets) return 0;
    const matchers = Array.isArray(sectorMatcher) ? sectorMatcher : [sectorMatcher];
    const stockDefs = JI.STOCKS || [];
    const matchedTickers = new Set(
      stockDefs.filter(s => matchers.includes(s.sector)).map(s => s.ticker)
    );
    let count = 0;
    matchedTickers.forEach(ticker => {
      const a = state.marketAssets[ticker];
      if (!a) return;
      a.prevPrice = a.price;
      a.price = Math.max(1, Math.round(a.price * factor));
      a.dayChange    = a.price - a.prevPrice;
      a.dayChangePct = a.prevPrice > 0 ? (a.dayChange / a.prevPrice) * 100 : 0;
      count += 1;
    });
    return count;
  }

  /* ---------- Catalogue ---------- */
  const BLACK_SWAN_EVENTS = [
    {
      id: 'pandemic',
      title: 'KRISIS PANDEMI GLOBAL',
      headline: 'Wabah baru lumpuhkan ekonomi dunia',
      body: 'Bursa terjun bebas, investor panik. Saham terkoreksi -30%, kripto runtuh -40%.',
      severity: 'red',
      icon: '☣',
      apply(s) {
        scaleAllStocks(s, 0.70);
        scaleAllCryptos(s, 0.60);
      },
    },
    {
      id: 'cryptoWinter',
      title: 'CRYPTO WINTER',
      headline: 'Bursa kripto tumbang ke titik terendah',
      body: 'Likuiditas mengering. Seluruh aset kripto anjlok -60% dalam semalam.',
      severity: 'red',
      icon: '❄',
      apply(s) {
        scaleAllCryptos(s, 0.40);
      },
    },
    {
      id: 'techBoom',
      title: 'TECH BOOM',
      headline: 'Revolusi AI menggerakkan euforia teknologi',
      body: 'Saham teknologi dan kripto melonjak +50% dalam waktu singkat.',
      severity: 'green',
      icon: '⚡',
      apply(s) {
        scaleStocksBySector(s, ['Teknologi', 'Telekomunikasi'], 1.50);
        scaleAllCryptos(s, 1.50);
      },
    },
    {
      id: 'bankRun',
      title: 'BANK RUN NASIONAL',
      headline: 'Penarikan dana massal mengguncang sistem perbankan',
      body: 'Saham perbankan ambruk -35%, kepercayaan investor terpukul.',
      severity: 'red',
      icon: '🏦',
      apply(s) {
        scaleStocksBySector(s, 'Perbankan', 0.65);
      },
    },
    {
      id: 'oilShock',
      title: 'GUNCANGAN HARGA MINYAK',
      headline: 'Krisis geopolitik picu lonjakan minyak dunia',
      body: 'Saham otomotif anjlok -25%, sektor energi melonjak +20%.',
      severity: 'amber',
      icon: '🛢',
      apply(s) {
        scaleStocksBySector(s, 'Otomotif', 0.75);
        scaleStocksBySector(s, 'Energi',   1.20);
      },
    },
    {
      id: 'dovishBI',
      title: 'BI POTONG SUKU BUNGA AGRESIF',
      headline: 'Pelonggaran moneter mengangkat seluruh aset risiko',
      body: 'Saham menguat +20%, kripto +30% dalam satu hari perdagangan.',
      severity: 'green',
      icon: '🕊',
      apply(s) {
        scaleAllStocks(s,  1.20);
        scaleAllCryptos(s, 1.30);
      },
    },
  ];

  /* ---------- RNG ---------- */
  function pickRandomEvent() {
    return BLACK_SWAN_EVENTS[JI.randomInt(0, BLACK_SWAN_EVENTS.length - 1)];
  }

  /**
   * Roll the dice. If event fires, mutate state and show modal.
   * Returns the event object on fire, otherwise null.
   */
  function tryRoll(state) {
    if (Math.random() < TRIGGER_CHANCE) {
      return triggerEvent(state, pickRandomEvent());
    }
    return null;
  }

  function triggerEvent(state, event) {
    if (!event) return null;
    event.apply(state);

    // Daily price tick must be skipped for this day (spec: overrides news multipliers).
    state.activeEventModifier = {
      eventId: event.id,
      day: state.totalDays,
      title: event.title,
      severity: event.severity,
    };

    state.eventHistory = state.eventHistory || [];
    state.eventHistory.unshift({
      day: state.totalDays,
      date: JI.formatCalendar(state.totalDays),
      eventId: event.id,
      title: event.title,
      headline: event.headline,
      severity: event.severity,
    });
    if (state.eventHistory.length > 50) state.eventHistory.length = 50;

    showBlackSwanModal(event, state);
    return event;
  }

  /* ---------- Modal ---------- */
  function showBlackSwanModal(event, state) {
    const existing = document.getElementById('blackswan-modal');
    if (existing) existing.remove();

    const overlay = JI.el('div', {
      id: 'blackswan-modal',
      class: `blackswan-overlay severity-${event.severity}`,
      role: 'dialog',
      'aria-modal': 'true',
    });

    const dramatic = JI.el('div', { class: 'blackswan-dramatic' });
    dramatic.appendChild(JI.el('div', { class: 'blackswan-icon' }, event.icon || '⚠'));
    dramatic.appendChild(JI.el('p', { class: 'blackswan-tag' }, 'BLACK SWAN EVENT'));
    dramatic.appendChild(JI.el('h1', { class: 'blackswan-title' }, event.title));
    dramatic.appendChild(JI.el('p', { class: 'blackswan-headline' }, event.headline));
    dramatic.appendChild(JI.el('p', { class: 'blackswan-body' }, event.body));
    dramatic.appendChild(JI.el('p', { class: 'blackswan-date' },
      `Tercatat pada ${JI.formatCalendar(state.totalDays)}`));

    dramatic.appendChild(JI.el('button', {
      class: 'blackswan-dismiss',
      onclick: () => overlay.remove(),
    }, 'Saya Mengerti'));

    overlay.appendChild(dramatic);
    document.body.appendChild(overlay);
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    BLACK_SWAN_EVENTS,
    BLACK_SWAN_TRIGGER_CHANCE: TRIGGER_CHANCE,
    rollBlackSwan: tryRoll,
    triggerBlackSwan: triggerEvent,
    showBlackSwanModal,
    scaleAllStocks,
    scaleAllCryptos,
    scaleStocksBySector,
  });
})(window);
