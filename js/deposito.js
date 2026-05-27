/* =========================================================================
   deposito.js — Time deposits per bank.
   Tenors: 3 mo (90d) / 6 mo (180d) / 12 mo (360d) at 5% / 7% / 10% interest.
   Funds debit at open, are locked, and credit back (principal + interest)
   on maturity day.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  const DEPOSITO_TERMS = [
    { months:  3, days:  90, rate: 0.05, label: '3 Bulan'  },
    { months:  6, days: 180, rate: 0.07, label: '6 Bulan'  },
    { months: 12, days: 360, rate: 0.10, label: '12 Bulan' },
  ];

  function findTerm(months) {
    return DEPOSITO_TERMS.find(t => t.months === Number(months));
  }

  let nextDepositoId = 1;

  /**
   * Open a time deposit on a specific bank.
   * Funds are debited from that bank's balance and locked in bank.depositos.
   */
  function openDeposito(state, bankId, amount, months) {
    const bank = JI.getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };

    const term = findTerm(months);
    if (!term) return { ok: false, error: 'Tenor deposito tidak valid.' };

    const amt = Math.floor(Number(amount) || 0);
    if (amt < 1_000_000) {
      return { ok: false, error: 'Minimum deposito Rp 1.000.000.' };
    }
    if (bank.balance < amt) {
      return { ok: false, error: `Saldo ${bank.shortName} tidak mencukupi.` };
    }

    const debit = JI.bankDebit(state, bankId, amt,
      `Buka Deposito ${term.label} (${(term.rate*100).toFixed(0)}%)`);
    if (!debit.ok) return debit;

    const interest = Math.round(amt * term.rate);
    const dep = {
      id: 'dep_' + Date.now() + '_' + (nextDepositoId++),
      principal: amt,
      months: term.months,
      days: term.days,
      rate: term.rate,
      interest: interest,
      payout: amt + interest,
      openedDay: state.totalDays,
      maturityDay: state.totalDays + term.days,
      isMatured: false,
    };
    if (!Array.isArray(bank.depositos)) bank.depositos = [];
    bank.depositos.push(dep);

    JI.recomputeNetWorth(state);
    // Phase 5: no XP from opening deposito.
    return { ok: true, deposito: dep };
  }

  /**
   * Daily tick: pay out matured deposits.
   * Returns array of { bankId, bankShortName, principal, interest, payout, months }.
   */
  function tickDepositos(state) {
    const matured = [];
    (state.banks || []).forEach(bank => {
      const remaining = [];
      (bank.depositos || []).forEach(dep => {
        if (!dep.isMatured && state.totalDays >= dep.maturityDay) {
          dep.isMatured = true;
          JI.bankCredit(state, bank.id, dep.payout,
            `Deposito jatuh tempo (${dep.months} bln, +${JI.formatIDR(dep.interest)})`);
          matured.push({
            bankId: bank.id,
            bankShortName: bank.shortName,
            principal: dep.principal,
            interest: dep.interest,
            payout: dep.payout,
            months: dep.months,
          });
          // matured deposits drop off the active list — payout was credited above
        } else {
          remaining.push(dep);
        }
      });
      bank.depositos = remaining;
    });
    if (matured.length) JI.recomputeNetWorth(state);
    return matured;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    DEPOSITO_TERMS,
    openDeposito,
    tickDepositos,
  });
})(window);
