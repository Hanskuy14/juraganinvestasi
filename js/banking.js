/* =========================================================================
   banking.js — Bank engine: 3 banks, transfer, credit card, KTA loan,
   cash-flow audit (history), helper credit/debit, helpers used by Phase 4.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Bank static config ---------- */
  const BANK_DEFS = [
    {
      id: 'mandiri',
      name: 'Bank Mandiri',
      shortName: 'Mandiri',
      themeClass: 'bank-card-mandiri',
      colors: { primary: '#003D79', accent: '#FFD700' },
      tagline: 'Terdepan, Terpercaya, Tumbuh bersama Anda',
    },
    {
      id: 'bca',
      name: 'Bank Central Asia',
      shortName: 'BCA',
      themeClass: 'bank-card-bca',
      colors: { primary: '#0060AF', accent: '#FFFFFF' },
      tagline: 'Senantiasa di Sisi Anda',
    },
    {
      id: 'bni',
      name: 'Bank Negara Indonesia',
      shortName: 'BNI',
      themeClass: 'bank-card-bni',
      colors: { primary: '#006A6E', accent: '#F26722' },
      tagline: 'Melayani Negeri, Kebanggaan Bangsa',
    },
  ];

  /* ---------- Tier rules ---------- */
  const TIER_PLATINUM_MIN  = 50_000_000;
  const TIER_PRIORITAS_MIN = 250_000_000;

  function debitTierFor(balance) {
    if (balance > TIER_PRIORITAS_MIN)  return 'Prioritas';
    if (balance >= TIER_PLATINUM_MIN)  return 'Platinum';
    return 'Reguler';
  }

  function tierBadgeClass(tier) {
    return ({
      'Reguler':   'tier-reguler',
      'Platinum':  'tier-platinum',
      'Prioritas': 'tier-prioritas',
    })[tier] || 'tier-reguler';
  }

  /* ---------- Credit card / Loan rules (unchanged from Phase 1) ---------- */
  const CC_MIN_BALANCE = 5_000_000;
  const CC_MAX_LIMIT   = 100_000_000;
  function creditCardOffer(balance) {
    if (balance < CC_MIN_BALANCE) {
      return { eligible: false, limit: 0, reason: 'Saldo minimum Rp 5.000.000 untuk pengajuan kartu kredit.' };
    }
    const limit = Math.min(Math.floor(balance * 0.5), CC_MAX_LIMIT);
    return { eligible: true, limit };
  }

  const LOAN_INTEREST_FLAT = 0.05;
  const LOAN_TERM_DAYS = 30;
  function maxLoanPrincipal(balance) {
    return Math.max(0, Math.floor(balance * 2));
  }
  function quoteLoan(principal) {
    const p = Math.max(0, Math.floor(principal || 0));
    const totalRepay = Math.round(p * (1 + LOAN_INTEREST_FLAT));
    const dailyInstallment = Math.round(totalRepay / LOAN_TERM_DAYS);
    return {
      principal: p,
      totalRepay,
      dailyInstallment,
      termDays: LOAN_TERM_DAYS,
      interestFlat: LOAN_INTEREST_FLAT,
    };
  }

  /* ---------- Bank factory ---------- */
  function makeBank(def, balance) {
    return {
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      themeClass: def.themeClass,
      colors: def.colors,
      tagline: def.tagline,
      balance: balance,
      debitTier: debitTierFor(balance),
      creditCard: { isApproved: false, limit: 0, used: 0 },
      loan: {
        isActive: false, principal: 0, remaining: 0,
        dailyInstallment: 0, daysRemaining: 0, startedOnDay: 0,
      },
      history: [],
      depositos: [],
    };
  }

  /* ---------- Initialize banks on a fresh state ---------- */
  function initBanks(state) {
    if (!state) return;
    if (state.banks && state.banks.length === BANK_DEFS.length) {
      state.banks.forEach(b => {
        b.debitTier = debitTierFor(b.balance);
        if (!Array.isArray(b.history))   b.history = [];
        if (!Array.isArray(b.depositos)) b.depositos = [];
      });
      return;
    }

    const total = JI.STARTING_CAPITAL;
    const parts = JI.splitUnequal(total, BANK_DEFS.length, 5_000_000);
    state.banks = BANK_DEFS.map((def, i) => makeBank(def, parts[i]));

    // Seed each bank with an opening-deposit history record.
    state.banks.forEach(b => {
      recordHistory(state, b, 'IN', b.balance, 'Modal awal Juragan');
    });
  }

  /* ---------- Lookup ---------- */
  function getBank(state, id) {
    return (state.banks || []).find(b => b.id === id);
  }

  /* ---------- Refresh derived fields after balance changes ---------- */
  function refreshDerived(bank) {
    bank.debitTier = debitTierFor(bank.balance);
  }

  /* =========================================================================
     CASH-FLOW AUDIT (Mutasi Rekening)
     ========================================================================= */
  function recordHistory(state, bank, type, amount, description) {
    if (!bank) return;
    if (!Array.isArray(bank.history)) bank.history = [];
    bank.history.push({
      date: JI.formatCalendar(state.totalDays),
      day: state.totalDays,
      type: type,                     // 'IN' or 'OUT'
      amount: Math.max(0, Math.round(amount || 0)),
      description: description || '',
    });
    // Cap history to last 500 entries per bank for memory hygiene.
    if (bank.history.length > 500) bank.history.splice(0, bank.history.length - 500);
  }

  /**
   * Add cash to a specific bank, with audit trail.
   * Returns { ok, bank, balance } or { ok:false, error }.
   */
  function bankCredit(state, bankId, amount, description) {
    const bank = getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    if (amt <= 0) return { ok: false, error: 'Nominal tidak valid.' };
    bank.balance += amt;
    refreshDerived(bank);
    recordHistory(state, bank, 'IN', amt, description || 'Penerimaan');
    return { ok: true, bank, balance: bank.balance };
  }

  /**
   * Deduct cash from a specific bank, with audit trail. Refuses if insufficient.
   */
  function bankDebit(state, bankId, amount, description) {
    const bank = getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    if (amt <= 0) return { ok: false, error: 'Nominal tidak valid.' };
    if (bank.balance < amt) {
      return { ok: false, error: `Saldo ${bank.shortName} tidak mencukupi.` };
    }
    bank.balance -= amt;
    refreshDerived(bank);
    recordHistory(state, bank, 'OUT', amt, description || 'Pengeluaran');
    return { ok: true, bank, balance: bank.balance };
  }

  /**
   * Try to debit, but if a bank can't cover, fall back to other banks (richest first).
   * Returns { ok, drawnFrom: [{bankId, amount}], shortfall }.
   */
  function debitAcrossBanks(state, amount, description) {
    let remaining = Math.max(0, Math.round(amount || 0));
    const drawn = [];
    if (remaining <= 0) return { ok: true, drawnFrom: drawn, shortfall: 0 };

    const banks = [...(state.banks || [])].sort((a, b) => b.balance - a.balance);
    for (const b of banks) {
      if (remaining <= 0) break;
      if (b.balance <= 0) continue;
      const take = Math.min(b.balance, remaining);
      bankDebit(state, b.id, take, description);
      drawn.push({ bankId: b.id, amount: take });
      remaining -= take;
    }
    return { ok: remaining === 0, drawnFrom: drawn, shortfall: remaining };
  }

  /**
   * Pick a random bank id, optionally weighted by current balance.
   */
  function pickRandomBankId(state) {
    const banks = state.banks || [];
    if (banks.length === 0) return null;
    return banks[JI.randomInt(0, banks.length - 1)].id;
  }

  /* =========================================================================
     OPERATIONS
     ========================================================================= */
  function transfer(state, fromId, toId, amount) {
    if (fromId === toId) {
      return { ok: false, error: 'Bank asal dan tujuan tidak boleh sama.' };
    }
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) {
      return { ok: false, error: 'Nominal harus lebih besar dari 0.' };
    }
    const from = getBank(state, fromId);
    const to   = getBank(state, toId);
    if (!from || !to) return { ok: false, error: 'Bank tidak ditemukan.' };
    if (from.balance < amt) {
      return { ok: false, error: `Saldo ${from.shortName} tidak mencukupi.` };
    }

    bankDebit(state, fromId, amt, `Transfer ke ${to.shortName}`);
    bankCredit(state, toId, amt, `Transfer dari ${from.shortName}`);

    JI.recomputeNetWorth(state);
    JI.awardXP(state, Math.min(50, Math.floor(amt / 1_000_000)));
    return { ok: true, amount: amt };
  }

  function applyCreditCard(state, bankId) {
    const bank = getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };
    if (bank.creditCard.isApproved) {
      return { ok: false, error: 'Kartu kredit sudah aktif.' };
    }
    const offer = creditCardOffer(bank.balance);
    if (!offer.eligible) {
      return { ok: false, error: offer.reason };
    }
    bank.creditCard.isApproved = true;
    bank.creditCard.limit = offer.limit;
    bank.creditCard.used = 0;
    JI.awardXP(state, 80);
    return { ok: true, limit: offer.limit };
  }

  function applyLoan(state, bankId, principal) {
    const bank = getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };
    if (bank.loan.isActive) {
      return { ok: false, error: 'Pinjaman lain masih aktif di bank ini.' };
    }
    const p = Math.floor(Number(principal) || 0);
    if (p <= 0) {
      return { ok: false, error: 'Nominal pinjaman tidak valid.' };
    }
    const max = maxLoanPrincipal(bank.balance);
    if (p > max) {
      return { ok: false, error: `Maksimum pinjaman di ${bank.shortName} adalah ${JI.formatIDR(max)}.` };
    }
    const q = quoteLoan(p);

    bank.loan = {
      isActive: true,
      principal: q.principal,
      remaining: q.totalRepay,
      dailyInstallment: q.dailyInstallment,
      daysRemaining: q.termDays,
      startedOnDay: state.totalDays,
    };
    bankCredit(state, bankId, p, 'Pencairan KTA');
    JI.recomputeNetWorth(state);
    JI.awardXP(state, 120);
    return { ok: true, quote: q };
  }

  /**
   * Daily loan tick — called by engine. Returns array of events for the day.
   */
  function tickLoans(state) {
    const events = [];
    (state.banks || []).forEach(bank => {
      if (!bank.loan || !bank.loan.isActive) return;
      const due = bank.loan.dailyInstallment;
      if (bank.balance >= due) {
        bankDebit(state, bank.id, due, 'Cicilan KTA harian');
        bank.loan.remaining = Math.max(0, bank.loan.remaining - due);
        bank.loan.daysRemaining -= 1;
        events.push({ type: 'loan_paid', bankId: bank.id, amount: due });
        if (bank.loan.remaining <= 0 || bank.loan.daysRemaining <= 0) {
          bank.loan.isActive = false;
          bank.loan.remaining = 0;
          bank.loan.daysRemaining = 0;
          events.push({ type: 'loan_settled', bankId: bank.id });
        }
      } else {
        // Cannot pay — mark as defaulted (penalty: tier hit + XP loss)
        events.push({ type: 'loan_default', bankId: bank.id, amount: due });
      }
    });
    return events;
  }

  /* ---------- Helpers used by UI / future phases ---------- */
  function totalBankBalance(state) {
    return (state.banks || []).reduce((a, b) => a + (b.balance || 0), 0);
  }

  function activeLoanCount(state) {
    return (state.banks || []).filter(b => b.loan && b.loan.isActive).length;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    BANK_DEFS,
    debitTierFor,
    tierBadgeClass,
    creditCardOffer,
    quoteLoan,
    maxLoanPrincipal,
    initBanks,
    getBank,
    transfer,
    applyCreditCard,
    applyLoan,
    tickLoans,
    bankCredit,
    bankDebit,
    debitAcrossBanks,
    pickRandomBankId,
    recordHistory,
    totalBankBalance,
    activeLoanCount,
    LOAN_INTEREST_FLAT,
    LOAN_TERM_DAYS,
    CC_MAX_LIMIT,
  });
})(window);
