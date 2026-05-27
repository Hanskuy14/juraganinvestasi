/* =========================================================================
   blackswan.js — Rare global market shocks. 1.5% chance each in-game day.
   Each event applies an instant multiplier to part of the market and
   blocks the standard daily price drift for that day (per spec).
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const TRIGGER_CHANCE = 0.015; // 1.5% per day

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
        JI.scaleAllStocks(s, 0.70);
        JI.scaleAllCryptos(s, 0.60);
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
        JI.scaleAllCryptos(s, 0.40);
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
        JI.scaleStocksBySector(s, 'Tech', 1.50);
        JI.scaleAllCryptos(s, 1.50);
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
        JI.scaleStocksBySector(s, 'Banking', 0.65);
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
        JI.scaleStocksBySector(s, 'Auto',   0.75);
        JI.scaleStocksBySector(s, 'Energy', 1.20);
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
        JI.scaleAllStocks(s,  1.20);
        JI.scaleAllCryptos(s, 1.30);
      },
    },
  ];

  /* ---------- RNG ---------- */
  function pickRandomEvent() {
    return BLACK_SWAN_EVENTS[JI.randomInt(0, BLACK_SWAN_EVENTS.length - 1)];
  }

  function tryRoll(state) {
    if (Math.random() < TRIGGER_CHANCE) {
      return triggerEvent(state, pickRandomEvent());
    }
    return null;
  }

  function triggerEvent(state, event) {
    if (!event) return null;
    event.apply(state);

    // Mark daily-drift skip for one day (per spec: overrides daily multipliers).
    state.activeEventModifier = {
      eventId: event.id,
      day: state.totalDays,
      expiresInDays: 1,
    };

    state.eventHistory.unshift({
      day: state.totalDays,
      date: JI.formatCalendar(state.totalDays),
      eventId: event.id,
      title: event.title,
      severity: event.severity,
    });
    if (state.eventHistory.length > 50) state.eventHistory.length = 50;

    // Show modal to player
    showBlackSwanModal(event, state);
    return event;
  }

  /* ---------- Modal ---------- */
  function showBlackSwanModal(event, state) {
    // Remove any pre-existing modal first.
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

    const dismiss = JI.el('button', {
      class: 'blackswan-dismiss',
      onclick: () => overlay.remove(),
    }, 'Saya Mengerti');
    dramatic.appendChild(dismiss);

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
  });
})(window);
