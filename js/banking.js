/* =========================================================================
   banking.js — Bank engine: 3 banks, transfer, credit card, KTA loan.
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

  /* ---------- Credit card rules ----------
     Approval & limit are based on current bank balance.
     Limit = 50% of balance, capped at Rp 100,000,000.
     Minimum balance to qualify: Rp 5,000,000.
  */
  const CC_MIN_BALANCE = 5_000_000;
  const CC_MAX_LIMIT   = 100_000_000;

  function creditCardOffer(balance) {
    if (balance < CC_MIN_BALANCE) {
      return { eligible: false, limit: 0, reason: 'Saldo minimum Rp 5.000.000 untuk pengajuan kartu kredit.' };
    }
    const limit = Math.min(Math.floor(balance * 0.5), CC_MAX_LIMIT);
    return { eligible: true, limit };
  }

  /* ---------- Loan (KTA) rules ----------
     Max principal = 2 x current balance.
     Flat interest 5% over a 30-day term.
     totalRepay = principal * 1.05; daily = totalRepay / 30.
  */
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
      creditCard: {
        isApproved: false,
        limit: 0,
        used: 0,
      },
      loan: {
        isActive: false,
        principal: 0,
        remaining: 0,
        dailyInstallment: 0,
        daysRemaining: 0,
        startedOnDay: 0,
      },
    };
  }

  /* ---------- Initialize banks on a fresh state ---------- */
  function initBanks(state) {
    if (!state) return;
    if (state.banks && state.banks.length === BANK_DEFS.length) {
      // Already initialized — just refresh tiers in case rules changed.
      state.banks.forEach(b => (b.debitTier = debitTierFor(b.balance)));
      return;
    }

    const total = JI.STARTING_CAPITAL;
    const parts = JI.splitUnequal(total, BANK_DEFS.length, 5_000_000);
    state.banks = BANK_DEFS.map((def, i) => makeBank(def, parts[i]));
  }

  /* ---------- Lookup ---------- */
  function getBank(state, id) {
    return (state.banks || []).find(b => b.id === id);
  }

  /* ---------- Refresh derived fields after balance changes ---------- */
  function refreshDerived(bank) {
    bank.debitTier = debitTierFor(bank.balance);
  }

  /* ---------- Operation: Transfer between own bank accounts ---------- */
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
    from.balance -= amt;
    to.balance   += amt;
    refreshDerived(from);
    refreshDerived(to);
    JI.recomputeNetWorth(state);
    // Phase 5: no XP from transfers — XP is awarded ONLY on profitable sellAsset().
    return { ok: true, amount: amt };
  }

  /* ---------- Operation: Credit card application ---------- */
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
    // Phase 5: no XP from CC approval.
    return { ok: true, limit: offer.limit };
  }

  /* ---------- Operation: Apply KTA loan ---------- */
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
    bank.balance += p; // disbursement
    refreshDerived(bank);
    JI.recomputeNetWorth(state);
    // Phase 5: no XP from taking out a loan.
    return { ok: true, quote: q };
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
    totalBankBalance,
    activeLoanCount,
    LOAN_INTEREST_FLAT,
    LOAN_TERM_DAYS,
    CC_MAX_LIMIT,
  });
})(window);
