/* =========================================================================
   ipo.js — "Go Public" end-game milestone.
   Condition: companyLevel >= 10 AND totalNetWorth >= Rp 100,000,000,000.
   Action: ipo.isPublic = true, +Rp 50,000,000,000 cash injection split
           across banks, title becomes "Public Listed Company".
   Obligation: every 360 days post-IPO, automatic 5% dividend payout.
               If unable to pay fully, companyLevel decreases by 1.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const IPO_LEVEL_REQ      = 10;
  const IPO_NETWORTH_REQ   = 100_000_000_000;     // Rp 100.000.000.000
  const IPO_CASH_INJECTION =  50_000_000_000;     // Rp 50.000.000.000
  const DIVIDEND_INTERVAL  = 360;                 // 12 in-game months
  const DIVIDEND_RATE      = 0.05;

  function ensureIPO(state) {
    if (!state.ipo) {
      state.ipo = { isPublic: false, ipoDay: null, lastDividendDay: null };
    }
    return state.ipo;
  }

  function isEligible(state) {
    ensureIPO(state);
    if (state.ipo.isPublic) return false;
    JI.recomputeNetWorth(state);
    return (state.companyLevel >= IPO_LEVEL_REQ) &&
           (state.totalNetWorth >= IPO_NETWORTH_REQ);
  }

  function eligibilityReason(state) {
    ensureIPO(state);
    if (state.ipo.isPublic) return 'Perusahaan sudah berstatus publik.';
    JI.recomputeNetWorth(state);
    const reasons = [];
    if (state.companyLevel < IPO_LEVEL_REQ) {
      reasons.push(`Level perusahaan ${state.companyLevel}/10`);
    }
    if (state.totalNetWorth < IPO_NETWORTH_REQ) {
      reasons.push(`Net worth ${JI.formatIDR(state.totalNetWorth)} / ${JI.formatIDR(IPO_NETWORTH_REQ)}`);
    }
    return reasons.length ? reasons.join(' · ') : 'Memenuhi syarat IPO.';
  }

  /**
   * Execute IPO. Splits the Rp 50bn cash injection unequally across banks.
   */
  function goPublic(state) {
    if (!isEligible(state)) {
      return { ok: false, error: 'Syarat IPO belum terpenuhi.' };
    }
    if (!state.banks || state.banks.length === 0) {
      return { ok: false, error: 'Tidak ada rekening bank aktif.' };
    }

    const parts = JI.splitUnequal(IPO_CASH_INJECTION, state.banks.length, 1_000_000);
    state.banks.forEach((b, i) => {
      JI.bankCredit(state, b.id, parts[i], 'IPO Cash Injection — Go Public');
    });

    state.ipo = {
      isPublic: true,
      ipoDay: state.totalDays,
      lastDividendDay: state.totalDays,
    };

    // Phase 5: no XP from IPO — companyXP is awarded ONLY in sellAsset().
    JI.recomputeNetWorth(state);

    showIPOModal(state);
    return { ok: true, injected: IPO_CASH_INJECTION, perBank: parts };
  }

  /**
   * Daily check: if 360 days have passed since IPO (or last dividend), pay.
   * Returns { ok, paid, shortfall, demoted } or null if not due.
   */
  function tickDividend(state) {
    ensureIPO(state);
    if (!state.ipo.isPublic) return null;
    const last = state.ipo.lastDividendDay || state.ipo.ipoDay || state.totalDays;
    if (state.totalDays - last < DIVIDEND_INTERVAL) return null;

    JI.recomputeNetWorth(state);
    const dueAmount = Math.max(0, Math.round(state.totalNetWorth * DIVIDEND_RATE));
    if (dueAmount <= 0) {
      state.ipo.lastDividendDay = state.totalDays;
      return { ok: true, paid: 0, shortfall: 0, demoted: false };
    }

    const result = JI.debitAcrossBanks(state, dueAmount, 'Dividen Publik tahunan (5%)');
    state.ipo.lastDividendDay = state.totalDays;

    let demoted = false;
    if (!result.ok) {
      // Couldn't fully pay — penalty: companyLevel decreases by 1 (min 1).
      if (state.companyLevel > 1) {
        state.companyLevel -= 1;
        demoted = true;
      }
    }
    JI.recomputeNetWorth(state);

    return {
      ok: result.ok,
      paid: dueAmount - result.shortfall,
      shortfall: result.shortfall,
      demoted,
    };
  }

  /* ---------- Modal ---------- */
  function showIPOModal(state) {
    const existing = document.getElementById('ipo-modal');
    if (existing) existing.remove();

    const overlay = JI.el('div', {
      id: 'ipo-modal',
      class: 'blackswan-overlay severity-green',
      role: 'dialog',
      'aria-modal': 'true',
    });

    const card = JI.el('div', { class: 'blackswan-dramatic' });
    card.appendChild(JI.el('div', { class: 'blackswan-icon' }, '🔔'));
    card.appendChild(JI.el('p', { class: 'blackswan-tag' }, 'INITIAL PUBLIC OFFERING'));
    card.appendChild(JI.el('h1', { class: 'blackswan-title' }, 'GO PUBLIC!'));
    card.appendChild(JI.el('p', { class: 'blackswan-headline' },
      'Perusahaan Anda resmi melantai di Bursa Efek Indonesia.'));
    card.appendChild(JI.el('p', { class: 'blackswan-body' },
      `Suntikan dana segar ${JI.formatIDR(IPO_CASH_INJECTION)} masuk ke rekening Anda. ` +
      `Status baru: Public Listed Company. Wajib bayar dividen 5% setiap 12 bulan.`));
    card.appendChild(JI.el('p', { class: 'blackswan-date' }, JI.formatCalendar(state.totalDays)));
    card.appendChild(JI.el('button', {
      class: 'blackswan-dismiss',
      onclick: () => overlay.remove(),
    }, 'Lonceng Dibunyikan'));

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    IPO_LEVEL_REQ,
    IPO_NETWORTH_REQ,
    IPO_CASH_INJECTION,
    IPO_DIVIDEND_INTERVAL: DIVIDEND_INTERVAL,
    IPO_DIVIDEND_RATE: DIVIDEND_RATE,
    isIPOEligible: isEligible,
    ipoEligibilityReason: eligibilityReason,
    goPublic,
    tickIPODividend: tickDividend,
    showIPOModal,
  });
})(window);
