/* =========================================================================
   events.js — Phase 5 Indonesia-banget random pop-up events.

   Daily chance: 8% (was 1.5%).
   Each event has:
     id, title, body, type ('positive'|'negative'), severity ('major'|'minor'),
     icon, apply(state) -> { description }
   apply() mutates state synchronously (prices, balances, XP, taxes,
   opsCostMultiplierToday) and returns a short impact summary string.

   The list below is hardcoded exactly to the spec.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- helper: deduct from a random bank, allowing overdraft ---------- */
  function deductFromRandomBank(state, amount) {
    if (!state.banks || state.banks.length === 0) {
      return { bankName: '—', deducted: 0 };
    }
    const idx = JI.randomInt(0, state.banks.length - 1);
    const bank = state.banks[idx];
    bank.balance -= amount;
    return { bankName: bank.shortName || bank.name, deducted: amount };
  }

  /* =========================================================================
     EVENT POOL
     ========================================================================= */
  const EVENTS = [
    /* ============== MAJOR NEGATIVE LOCAL ============== */
    {
      id: 'tahun-politik-memanas',
      title: 'Sentimen Tahun Politik Memanas',
      body: 'Eskalasi kampanye, demo besar, dan ketidakpastian regulasi membuat ' +
            'investor asing kompak menarik dananya dari Indonesia.',
      type: 'negative',
      severity: 'major',
      icon: '🗳️',
      apply(state) {
        const pctMin = -0.25, pctMax = -0.15; // -15% to -25%
        let total = 0, count = 0;
        (JI.ASSETS || []).filter(a => a.category === 'stock').forEach(a => {
          const pct = JI.randomFloat(pctMin, pctMax);
          JI.applyPctToTicker(state, a.ticker, pct);
          total += pct; count++;
        });
        const avg = count ? total / count : 0;
        return { description: `Seluruh saham IHSG koreksi rata-rata ${(avg * 100).toFixed(1)}%.` };
      },
    },
    {
      id: 'skandal-korupsi-mega',
      title: 'Skandal Korupsi Mega-Proyek',
      body: 'KPK ungkap mega-skandal yang menyeret puluhan emiten BUMN dan ' +
            'manajer investasi besar. Kepercayaan pasar runtuh.',
      type: 'negative',
      severity: 'major',
      icon: '⚖️',
      apply(state) {
        (JI.ASSETS || []).forEach(a => {
          if (a.category === 'stock' || a.category === 'mutual') {
            JI.applyPctToTicker(state, a.ticker, -0.20);
          }
        });
        return { description: 'Saham & Reksadana kompak turun -20% akibat skandal mega.' };
      },
    },

    /* ============== MAJOR POSITIVE LOCAL ============== */
    {
      id: 'window-dressing',
      title: 'Efek Window Dressing Akhir Tahun',
      body: 'Manajer Investasi & Bank ramai-ramai mendongkrak harga saham ' +
            'di portofolio mereka demi laporan akhir tahun yang cantik.',
      type: 'positive',
      severity: 'major',
      icon: '🎁',
      apply(state) {
        (JI.ASSETS || []).filter(a => a.category === 'stock').forEach(a => {
          JI.applyPctToTicker(state, a.ticker, 0.20);
        });
        return { description: 'Seluruh saham IHSG melonjak +20%.' };
      },
    },
    {
      id: 'thr-nasional',
      title: 'Pencairan THR Nasional',
      body: 'Triliunan rupiah THR Lebaran masuk ke rekening pekerja Indonesia. ' +
            'Sektor konsumer dan perbankan kebanjiran transaksi.',
      type: 'positive',
      severity: 'major',
      icon: '🧧',
      apply(state) {
        (JI.ASSETS || []).forEach(a => {
          if (a.category === 'stock' && (a.sector === 'Consumer' || a.sector === 'Bank')) {
            JI.applyPctToTicker(state, a.ticker, 0.25);
          }
        });
        return { description: 'Saham sektor Consumer & Bank pump +25%.' };
      },
    },
    {
      id: 'investor-timur-tengah-ikn',
      title: 'Suntikan Dana Investor Timur Tengah ke IKN',
      body: 'Sovereign Wealth Fund Timur Tengah resmi guyur dana puluhan miliar ' +
            'Dolar AS untuk Ibu Kota Nusantara. IHSG euforia.',
      type: 'positive',
      severity: 'major',
      icon: '🛢️',
      apply(state) {
        (JI.ASSETS || []).filter(a => a.category === 'stock').forEach(a => {
          JI.applyPctToTicker(state, a.ticker, 0.30);
        });
        return { description: 'Seluruh saham IHSG meroket +30%.' };
      },
    },

    /* ============== MAJOR CRYPTO / GLOBAL ============== */
    {
      id: 'bitcoin-halving-fomo',
      title: 'Bitcoin Halving FOMO',
      body: 'Halving Bitcoin terjadi tepat hari ini. FOMO global menjalar ke ' +
            'seluruh altcoin, semua koin pump tanpa ampun.',
      type: 'positive',
      severity: 'major',
      icon: '₿',
      apply(state) {
        (JI.ASSETS || []).filter(a => a.category === 'crypto').forEach(a => {
          JI.applyPctToTicker(state, a.ticker, 0.50);
        });
        return { description: 'Seluruh aset kripto pump +50%.' };
      },
    },
    {
      id: 'ftx-bangkrut',
      title: 'Bursa Kripto Global FTX Bangkrut',
      body: 'Bursa raksasa FTX dinyatakan pailit. Panic sell global menyapu ' +
            'pasar kripto. Banyak proyek kehilangan likuiditas.',
      type: 'negative',
      severity: 'major',
      icon: '💥',
      apply(state) {
        (JI.ASSETS || []).filter(a => a.category === 'crypto').forEach(a => {
          JI.applyPctToTicker(state, a.ticker, -0.60);
        });
        return { description: 'Seluruh aset kripto crash -60%.' };
      },
    },

    /* ============== MINOR NEGATIVE LOCAL ============== */
    {
      id: 'ormas-uang-keamanan',
      title: 'Kantor Digeruduk Ormas Minta Jatah Uang Keamanan',
      body: 'Sekelompok ormas mendatangi kantor minta "jatah keamanan". ' +
            'Demi menghindari rusuh, dana terpaksa dicairkan dari rekening.',
      type: 'negative',
      severity: 'minor',
      icon: '👊',
      apply(state) {
        const r = deductFromRandomBank(state, 25_000_000);
        return { description: `Rekening ${r.bankName} terpotong ${JI.formatIDR(r.deducted)}.` };
      },
    },
    {
      id: 'indihome-mati',
      title: 'Koneksi Indihome / Biznet Mati Se-Jawa',
      body: 'Kabel laut putus, internet kantor mati seharian. Karyawan terpaksa ' +
            'pindah co-working & hotel agar deadline tetap jalan.',
      type: 'negative',
      severity: 'minor',
      icon: '📡',
      apply(state) {
        state.opsCostMultiplierToday = 5;
        return { description: 'Biaya operasional hari ini dikalikan 5x.' };
      },
    },

    /* ============== MINOR POSITIVE LOCAL ============== */
    {
      id: 'podcast-deddy',
      title: 'Diundang ke Podcast Deddy',
      body: 'Wawancara di podcast paling viral se-Indonesia bikin perusahaan ' +
            'Anda jadi headline media. Trust meledak.',
      type: 'positive',
      severity: 'minor',
      icon: '🎙️',
      apply(state) {
        const xp = 2000;
        const leveledUp = JI.awardXP(state, xp);
        // surface XP via toast as well — UI layer will trigger this.
        if (typeof JI.showXPToast === 'function') {
          JI.showXPToast(xp, { note: 'Viral Podcast' });
        }
        return {
          description: `Perusahaan viral! +${xp.toLocaleString('id-ID')} XP${leveledUp ? ' (LEVEL UP!)' : ''}.`,
        };
      },
    },
    {
      id: 'tax-amnesty',
      title: 'Program Tax Amnesty DJP Diadakan',
      body: 'Direktorat Jenderal Pajak mengumumkan tax amnesty nasional. ' +
            'Seluruh tunggakan pajak Anda dianggap lunas.',
      type: 'positive',
      severity: 'minor',
      icon: '🧾',
      apply(state) {
        const cleared = (state.unpaidFinalTax || 0) + (state.annualTax || 0);
        state.unpaidFinalTax = 0;
        state.annualTax = 0;
        return {
          description: cleared > 0
            ? `Tunggakan pajak ${JI.formatIDR(cleared)} dihapus jadi Rp 0.`
            : 'Tidak ada tunggakan pajak — Anda dapat surat penghargaan dari DJP.',
        };
      },
    },
  ];

  /* ---------- Daily roll (8%) ---------- */
  const DAILY_EVENT_CHANCE = 0.08;

  function rollRandomEvent(state) {
    if (Math.random() >= DAILY_EVENT_CHANCE) return null;
    const event = JI.pickRandom(EVENTS);
    if (!event) return null;

    let result = {};
    try {
      result = event.apply(state) || {};
    } catch (err) {
      console.error('Event apply error:', err);
    }

    const populated = {
      id: event.id,
      title: event.title,
      body: event.body,
      type: event.type,
      severity: event.severity,
      icon: event.icon,
      description: result.description || '',
      day: state.totalDays,
    };

    state.eventLog = state.eventLog || [];
    state.eventLog.unshift({
      day: populated.day,
      id: populated.id,
      title: populated.title,
      type: populated.type,
      severity: populated.severity,
      description: populated.description,
    });
    if (state.eventLog.length > 100) state.eventLog.length = 100;

    state.pendingEvent = populated;
    return populated;
  }

  /* ---------- Manual trigger (debug / unit tests) ---------- */
  function triggerEventById(state, id) {
    const event = EVENTS.find(e => e.id === id);
    if (!event) return null;
    const result = event.apply(state) || {};
    const populated = { ...event, description: result.description || '', day: state.totalDays };
    state.pendingEvent = populated;
    state.eventLog.unshift({
      day: populated.day, id: populated.id, title: populated.title,
      type: populated.type, severity: populated.severity, description: populated.description,
    });
    return populated;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    EVENTS,
    DAILY_EVENT_CHANCE,
    rollRandomEvent,
    triggerEventById,
  });
})(window);
