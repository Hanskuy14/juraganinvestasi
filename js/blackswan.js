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

  // Phase 5: bumped from 1.5% to 8% per spec.
  const TRIGGER_CHANCE = 0.08;

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

  /* ---------- Helpers for Phase 5 minor events ---------- */
  function scaleAllReksadana(state, factor) {
    return scaleAllInCategory(state, 'reksadana', factor);
  }

  /**
   * Apply a random per-asset percentage drop/spike across an entire stock
   * category (used for "Sentimen Tahun Politik Memanas" -15..-25%).
   */
  function scaleStocksRange(state, pctMin, pctMax) {
    if (!state || !state.marketAssets) return 0;
    let count = 0;
    Object.values(state.marketAssets).forEach(a => {
      if (a.category !== 'saham') return;
      const factor = 1 + (pctMin + Math.random() * (pctMax - pctMin));
      a.prevPrice = a.price;
      a.price = Math.max(1, Math.round(a.price * factor));
      a.dayChange = a.price - a.prevPrice;
      a.dayChangePct = a.prevPrice > 0 ? (a.dayChange / a.prevPrice) * 100 : 0;
      count += 1;
    });
    return count;
  }

  /**
   * Deduct an exact rupiah amount from a randomly-chosen bank.
   * Used for "Kantor Digeruduk Ormas — Rp 25.000.000".
   */
  function deductFromRandomBank(state, amount, label) {
    if (!state.banks || state.banks.length === 0) return null;
    const idx = JI.randomInt(0, state.banks.length - 1);
    const bank = state.banks[idx];
    if (typeof JI.bankDebit === 'function') {
      JI.bankDebit(state, bank.id, amount, label || 'Kejadian Tak Terduga');
    } else {
      bank.balance -= amount;
    }
    return { bankId: bank.id, bankShortName: bank.shortName || bank.name, amount };
  }

  /**
   * Charge an additional ops-cost multiplier for the SAME day.
   * Phase 5 "Indihome / Biznet Mati": daily ops cost ×5 today.
   * Since app.js already deducted 1× ops cost in step (a), we deduct
   * the remaining 4× immediately so the net is ×5 for this day.
   */
  function applyOpsCostMultiplier(state, multiplier, label) {
    const baseOps = JI.DAILY_OPS_COST || 150_000;
    const extra = Math.max(0, Math.round(baseOps * (multiplier - 1)));
    if (extra <= 0) return { extra: 0 };
    if (typeof JI.deductFromBest === 'function') {
      JI.deductFromBest(state, extra, label || 'Biaya Operasional Tambahan');
    }
    return { extra, multiplier };
  }

  /* ---------- Phase 5 catalogue (overrides legacy BLACK_SWAN_EVENTS) ---------- */
  const BLACK_SWAN_EVENTS = [
    /* ============== MAJOR NEGATIVE LOCAL ============== */
    {
      id: 'tahunPolitik',
      title: 'SENTIMEN TAHUN POLITIK MEMANAS',
      headline: 'Eskalasi kampanye picu capital outflow asing',
      body: 'Investor asing kompak menarik dana dari Indonesia menjelang pemilu. Seluruh saham IHSG terkoreksi -15% s/d -25%.',
      severity: 'red',
      icon: '🗳',
      apply(s) { scaleStocksRange(s, -0.25, -0.15); },
    },
    {
      id: 'skandalKorupsi',
      title: 'SKANDAL KORUPSI MEGA-PROYEK',
      headline: 'KPK ungkap skandal yang seret puluhan emiten BUMN',
      body: 'Saham & reksadana jatuh -20% akibat kepercayaan pasar runtuh.',
      severity: 'red',
      icon: '⚖',
      apply(s) {
        scaleAllStocks(s, 0.80);
        scaleAllReksadana(s, 0.80);
      },
    },

    /* ============== MAJOR POSITIVE LOCAL ============== */
    {
      id: 'windowDressing',
      title: 'EFEK WINDOW DRESSING AKHIR TAHUN',
      headline: 'Manajer Investasi & bank dongkrak saham portofolio',
      body: 'Demi laporan akhir tahun yang cantik, seluruh saham IHSG melonjak +20%.',
      severity: 'green',
      icon: '🎁',
      apply(s) { scaleAllStocks(s, 1.20); },
    },
    {
      id: 'thrNasional',
      title: 'PENCAIRAN THR NASIONAL',
      headline: 'Triliunan rupiah THR Lebaran banjiri rekening pekerja',
      body: 'Sektor Konsumsi & Perbankan kebanjiran transaksi, saham +25%.',
      severity: 'green',
      icon: '🧧',
      apply(s) {
        scaleStocksBySector(s, ['Konsumsi', 'Perbankan'], 1.25);
      },
    },
    {
      id: 'investorTimurTengah',
      title: 'SUNTIKAN INVESTOR TIMUR TENGAH KE IKN',
      headline: 'SWF Timur Tengah komitmen puluhan miliar USD untuk IKN',
      body: 'IHSG euforia, seluruh saham meroket +30%.',
      severity: 'green',
      icon: '🛢',
      apply(s) { scaleAllStocks(s, 1.30); },
    },

    /* ============== MAJOR CRYPTO / GLOBAL ============== */
    {
      id: 'bitcoinHalving',
      title: 'BITCOIN HALVING FOMO',
      headline: 'Halving Bitcoin picu euforia global ke seluruh altcoin',
      body: 'FOMO global, seluruh aset kripto pump +50% dalam semalam.',
      severity: 'green',
      icon: '₿',
      apply(s) { scaleAllCryptos(s, 1.50); },
    },
    {
      id: 'ftxBangkrut',
      title: 'BURSA KRIPTO GLOBAL FTX BANGKRUT',
      headline: 'FTX dinyatakan pailit, panic-sell global menyapu kripto',
      body: 'Likuiditas hilang massal. Seluruh aset kripto crash -60%.',
      severity: 'red',
      icon: '💥',
      apply(s) { scaleAllCryptos(s, 0.40); },
    },

    /* ============== MINOR NEGATIVE LOCAL ============== */
    {
      id: 'ormasUangKeamanan',
      title: 'KANTOR DIGERUDUK ORMAS',
      headline: 'Ormas datang minta jatah "uang keamanan"',
      body: 'Demi menghindari rusuh, dana Rp 25.000.000 terpaksa dicairkan dari rekening.',
      severity: 'amber',
      icon: '👊',
      apply(s) {
        const r = deductFromRandomBank(s, 25_000_000, 'Uang Keamanan Ormas');
        if (r && typeof JI.recomputeNetWorth === 'function') JI.recomputeNetWorth(s);
        // Stash result on state for the modal to surface (optional).
        s._lastEventDetail = r ? `Rp 25.000.000 terpotong dari ${r.bankShortName}.` : '';
      },
    },
    {
      id: 'indihomeMati',
      title: 'KONEKSI INDIHOME / BIZNET MATI SE-JAWA',
      headline: 'Kabel laut putus, internet kantor mati seharian',
      body: 'Karyawan terpaksa pindah ke co-working & hotel. Biaya operasional hari ini dikalikan 5×.',
      severity: 'amber',
      icon: '📡',
      apply(s) {
        const r = applyOpsCostMultiplier(s, 5, 'Indihome/Biznet Mati — Pindah Hotel');
        if (typeof JI.recomputeNetWorth === 'function') JI.recomputeNetWorth(s);
        s._lastEventDetail = r && r.extra ? `+${JI.formatIDR(r.extra)} biaya tambahan dipotong hari ini.` : '';
      },
    },

    /* ============== MINOR POSITIVE LOCAL ============== */
    {
      id: 'podcastDeddy',
      title: 'DIUNDANG KE PODCAST DEDDY',
      headline: 'Wawancara podcast paling viral se-Indonesia',
      body: 'Perusahaan Anda jadi headline media. Trust meledak, +2000 XP instant.',
      severity: 'green',
      icon: '🎙',
      apply(s) {
        const xp = 2000;
        const ev = JI.awardXP(s, xp);
        s._lastEventDetail = ev && ev.leveledUp
          ? `+${xp} XP — LEVEL UP ke Level ${ev.newLevel} (${ev.newTitle})!`
          : `+${xp} XP ditambahkan ke companyXP.`;
      },
    },
    {
      id: 'taxAmnesty',
      title: 'PROGRAM TAX AMNESTY DJP',
      headline: 'DJP umumkan tax amnesty nasional',
      body: 'Seluruh tunggakan pajak (PPh Final & Tahunan) dianggap lunas — Rp 0.',
      severity: 'green',
      icon: '🧾',
      apply(s) {
        let cleared = 0;
        (s.taxLiabilities || []).forEach(liab => {
          if (!liab.isPaid) {
            cleared += (liab.owedAmount || 0);
            liab.paid = liab.owedAmount;
            liab.owedAmount = 0;
            liab.isPaid = true;
            liab.paidDay = s.totalDays;
            liab.paidVia = 'tax-amnesty';
          }
        });
        s._lastEventDetail = cleared > 0
          ? `Tunggakan ${JI.formatIDR(cleared)} dihapus jadi Rp 0.`
          : 'Tidak ada tunggakan — DJP kirim surat penghargaan untuk Anda.';
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
    // Phase 5 helpers (exposed for tests / debug)
    scaleAllReksadana,
    scaleStocksRange,
    deductFromRandomBank,
    applyOpsCostMultiplier,
  });
})(window);
