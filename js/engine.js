/* =========================================================================
   engine.js — Time progression. Single entry-point: nextDay().
   Order of operations per tick:
     1. Advance day counter.
     2. Daily loan installments.
     3. Black Swan roll (overrides daily price drift if it fires).
     4. Daily price drift (skipped automatically when an event is active).
     5. VC investment maturity.
     6. Deposito maturity.
     7. IPO dividend obligation (every 360 days post-IPO).
     8. Monthly cycle (every 30 days):
        - Property passive income (Rp 5.000.000 / unused office slot)
        - VC active-startup rotation
     9. Recompute net worth, save, re-render.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const PASSIVE_RENT_PER_SLOT = 5_000_000;

  function unusedOfficeSlots(state) {
    const cap = (state.physicalAssets && state.physicalAssets.officeCapacity) || 0;
    const occupied = (state.hiredEmployees || []).length;
    return Math.max(0, cap - occupied);
  }

  function rentalIncomeMonthly(state) {
    return unusedOfficeSlots(state) * PASSIVE_RENT_PER_SLOT;
  }

  function payRentalIncome(state) {
    const slots = unusedOfficeSlots(state);
    if (slots <= 0) return null;
    const total = slots * PASSIVE_RENT_PER_SLOT;
    const bankId = JI.pickRandomBankId(state);
    if (!bankId) return null;
    JI.bankCredit(state, bankId, total,
      `Sewa Ruangan: ${slots} slot kosong x ${JI.formatIDR(PASSIVE_RENT_PER_SLOT)}`);
    return { bankId, slots, total };
  }

  /* ---------- Notification helpers ---------- */
  function notifyMatured(matured) {
    matured.forEach(m => {
      let type = 'info';
      let msg  = '';
      if (m.outcome === 'Bankrupt') {
        type = 'error';
        msg = `❌ ${m.startupName} BANGKRUT. Investasi ${JI.formatIDR(m.originalAmount)} hilang.`;
      } else if (m.outcome === 'Acquisition') {
        type = 'success';
        msg = `🎯 ${m.startupName} di-AKUISISI! ${m.multiplier}x → ${JI.formatIDR(m.payout)}`;
      } else if (m.outcome === 'Unicorn IPO') {
        type = 'success';
        msg = `🦄 ${m.startupName} jadi UNICORN IPO! ${m.multiplier}x → ${JI.formatIDR(m.payout)}`;
      }
      // Big toast — also keep on screen longer
      JI.toast(msg, type, 6000);
    });
  }

  function notifyDeposito(matured) {
    matured.forEach(d => {
      JI.toast(
        `Deposito ${d.months} bulan jatuh tempo di ${d.bankShortName}: +${JI.formatIDR(d.interest)} bunga.`,
        'success',
        4500
      );
    });
  }

  function notifyDividend(result, state) {
    if (!result) return;
    if (result.demoted) {
      JI.toast(
        `⚠ Dividen Publik gagal dibayar penuh. Level perusahaan turun ke ${state.companyLevel}.`,
        'error', 7000
      );
    } else {
      JI.toast(`Dividen Publik tahunan dibayar: ${JI.formatIDR(result.paid)}.`, 'info', 5500);
    }
  }

  function notifyRental(rental) {
    if (!rental) return;
    const bank = JI.getBank(JI.gameState, rental.bankId);
    JI.toast(
      `Sewa Ruangan: +${JI.formatIDR(rental.total)} ke ${bank?.shortName || rental.bankId} (${rental.slots} slot).`,
      'success', 5000
    );
  }

  /* ---------- Main tick ---------- */
  function nextDay() {
    const s = JI.gameState;
    if (!s) return;

    // 1. advance
    s.totalDays += 1;

    // 2. loan installments
    JI.tickLoans(s);

    // 3. black swan roll
    JI.rollBlackSwan(s);

    // 4. daily price drift (auto-skipped if event modifier still active)
    JI.dailyPriceTick(s);

    // 5. VC maturity
    const maturedVC = JI.tickVCInvestments(s);
    notifyMatured(maturedVC);

    // 6. Deposito maturity
    const maturedDep = JI.tickDepositos(s);
    notifyDeposito(maturedDep);

    // 7. IPO dividend
    const dividendResult = JI.tickIPODividend(s);
    notifyDividend(dividendResult, s);

    // 8. Monthly cycle
    if (s.totalDays > 1 && s.totalDays % 30 === 0) {
      // Property passive income
      const rental = payRentalIncome(s);
      notifyRental(rental);
    }
    // VC rotation (independent — based on lastRotationDay)
    JI.maybeRotateVC(s);

    // 9. close out
    JI.recomputeNetWorth(s);
    JI.saveState(s);
    JI.renderAll();
  }

  /* ---------- Fast-forward (admin / power user) ---------- */
  function nextNDays(n) {
    n = Math.max(1, Math.floor(n || 1));
    for (let i = 0; i < n; i++) nextDay();
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    PASSIVE_RENT_PER_SLOT,
    unusedOfficeSlots,
    rentalIncomeMonthly,
    nextDay,
    nextNDays,
  });
})(window);
