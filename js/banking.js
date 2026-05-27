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

  /* =========================================================================
     UNIVERSAL CHARGE — used by market buys, asset purchases, etc.
     payment = { method: 'bank' | 'credit', bankId: 'mandiri'|'bca'|'bni' }
     - 'bank'   : deduct from chosen bank balance
     - 'credit' : add to credit card 'used' if within available limit
     ========================================================================= */
  function charge(state, amount, payment) {
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return { ok: false, error: 'Nominal tidak valid.' };
    if (!payment || !payment.method) {
      return { ok: false, error: 'Metode pembayaran wajib dipilih.' };
    }
    const bank = getBank(state, payment.bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };

    if (payment.method === 'bank') {
      if (bank.balance < amt) {
        return { ok: false,
          error: `Saldo ${bank.shortName} tidak cukup (butuh ${JI.formatIDR(amt)}).` };
      }
      bank.balance -= amt;
      refreshDerived(bank);
      return { ok: true, method: 'bank', bankId: bank.id, amount: amt };
    }

    if (payment.method === 'credit') {
      if (!bank.creditCard.isApproved) {
        return { ok: false,
          error: `Kartu kredit ${bank.shortName} belum aktif.` };
      }
      const available = bank.creditCard.limit - bank.creditCard.used;
      if (available < amt) {
        return { ok: false,
          error: `Limit kartu kredit ${bank.shortName} tidak cukup (sisa ${JI.formatIDR(available)}).` };
      }
      bank.creditCard.used += amt;
      return { ok: true, method: 'credit', bankId: bank.id, amount: amt };
    }

    return { ok: false, error: 'Metode pembayaran tidak dikenali.' };
  }

  /* ---------- Refund (e.g. unused tax payments) ---------- */
  function deposit(state, bankId, amount) {
    const amt = Math.floor(Number(amount) || 0);
    const bank = getBank(state, bankId);
    if (!bank || amt <= 0) return { ok: false };
    bank.balance += amt;
    refreshDerived(bank);
    return { ok: true };
  }

  /* =========================================================================
     CREDIT CARD repayment from a bank balance.
     ========================================================================= */
  function repayCreditCard(state, bankId, amount) {
    const bank = getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Bank tidak ditemukan.' };
    if (!bank.creditCard.isApproved) {
      return { ok: false, error: 'Kartu kredit belum aktif.' };
    }
    let amt = Math.floor(Number(amount) || 0);
    if (amt <= 0) return { ok: false, error: 'Nominal tidak valid.' };
    if (amt > bank.creditCard.used) amt = bank.creditCard.used;
    if (bank.balance < amt) {
      return { ok: false, error: `Saldo ${bank.shortName} tidak cukup.` };
    }
    bank.balance -= amt;
    bank.creditCard.used -= amt;
    refreshDerived(bank);
    JI.recomputeNetWorth(state);
    return { ok: true, paid: amt };
  }

  /* =========================================================================
     DAILY LOAN TICKER — called once per day-advance.
     For each active loan, deduct dailyInstallment from the same bank's balance.
     If insufficient: try to pull from credit card limit; otherwise mark missed.
     When term completes (daysRemaining == 0 and remaining ~0), close loan.
     ========================================================================= */
  function tickDailyLoans(state) {
    const events = [];
    (state.banks || []).forEach(bank => {
      if (!bank.loan || !bank.loan.isActive) return;
      const installment = Math.min(bank.loan.dailyInstallment, bank.loan.remaining);

      if (bank.balance >= installment) {
        bank.balance -= installment;
        bank.loan.remaining -= installment;
        events.push({
          bankId: bank.id,
          paid: installment,
          source: 'bank',
        });
      } else if (bank.creditCard.isApproved &&
                 (bank.creditCard.limit - bank.creditCard.used) >= installment) {
        // Auto-fallback to credit card
        bank.creditCard.used += installment;
        bank.loan.remaining -= installment;
        events.push({
          bankId: bank.id,
          paid: installment,
          source: 'credit',
          warning: true,
        });
      } else {
        // Missed payment — apply small penalty to remaining balance
        const penalty = Math.round(installment * 0.02);
        bank.loan.remaining += penalty;
        events.push({
          bankId: bank.id,
          paid: 0,
          missed: true,
          penalty,
        });
      }

      bank.loan.daysRemaining = Math.max(0, bank.loan.daysRemaining - 1);
      if (bank.loan.remaining <= 0 || bank.loan.daysRemaining === 0) {
        // Close loan if fully paid; otherwise allow remainder to roll-up next tick.
        if (bank.loan.remaining <= 0) {
          bank.loan = {
            isActive: false,
            principal: 0, remaining: 0,
            dailyInstallment: 0, daysRemaining: 0,
            startedOnDay: 0,
          };
          events.push({ bankId: bank.id, closed: true });
        }
      }
      refreshDerived(bank);
    });
    return events;
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
    JI.awardXP(state, Math.min(50, Math.floor(amt / 1_000_000)));
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
    JI.awardXP(state, 80);
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
    JI.awardXP(state, 120);
    return { ok: true, quote: q };
  }

  /* ---------- Helpers used by UI / future phases ---------- */
  function totalBankBalance(state) {
    return (state.banks || []).reduce((a, b) => a + (b.balance || 0), 0);
  }

  function totalCreditCardDebt(state) {
    return (state.banks || []).reduce((a, b) =>
      a + (b.creditCard && b.creditCard.used ? b.creditCard.used : 0), 0);
  }

  function totalAvailableCredit(state) {
    return (state.banks || []).reduce((a, b) => {
      if (!b.creditCard || !b.creditCard.isApproved) return a;
      return a + (b.creditCard.limit - b.creditCard.used);
    }, 0);
  }

  function activeLoanCount(state) {
    return (state.banks || []).filter(b => b.loan && b.loan.isActive).length;
  }

  /* =========================================================================
     deductFromBest(state, amount, label)
     Pay an arbitrary expense (ops cost, salary, tax, etc.) using the best
     available source. Order:
       1. Largest single bank balance >= amount → debit it.
       2. Drain banks in descending balance order until covered.
       3. Fall back to credit card with most available limit.
       4. Otherwise mark as missed (returns ok:false with shortfall).
     Returns: { ok, sources: [{kind, bankId, amount}], shortfall }
     ========================================================================= */
  function deductFromBest(state, amount, label = 'expense') {
    let need = Math.max(0, Math.floor(Number(amount) || 0));
    if (need === 0) return { ok: true, sources: [], shortfall: 0, label };

    const sources = [];
    // Step 1+2: drain banks
    const banks = (state.banks || [])
      .slice()
      .sort((a, b) => b.balance - a.balance);
    for (const bank of banks) {
      if (need <= 0) break;
      if (bank.balance <= 0) continue;
      const take = Math.min(bank.balance, need);
      bank.balance -= take;
      refreshDerived(bank);
      sources.push({ kind: 'bank', bankId: bank.id, amount: take });
      need -= take;
    }
    // Step 3: fall back to credit cards (largest available limit first)
    if (need > 0) {
      const ccs = (state.banks || [])
        .filter(b => b.creditCard && b.creditCard.isApproved)
        .map(b => ({ bank: b, available: b.creditCard.limit - b.creditCard.used }))
        .filter(x => x.available > 0)
        .sort((a, b) => b.available - a.available);
      for (const { bank, available } of ccs) {
        if (need <= 0) break;
        const take = Math.min(available, need);
        bank.creditCard.used += take;
        sources.push({ kind: 'credit', bankId: bank.id, amount: take });
        need -= take;
      }
    }
    JI.recomputeNetWorth(state);
    return {
      ok: need === 0,
      sources,
      shortfall: need,
      label,
    };
  }

  /* =========================================================================
     enforceMonthlyCCCharges(state)
     Called once per month (every 30 days). Applies a 5% finance charge to
     any outstanding credit-card balance, simulating Indonesian CC monthly
     interest. Returns events: [{bankId, charge}].
     ========================================================================= */
  const CC_MONTHLY_INTEREST = 0.05;

  function enforceMonthlyCCCharges(state) {
    const events = [];
    (state.banks || []).forEach(bank => {
      if (!bank.creditCard || !bank.creditCard.isApproved) return;
      const used = bank.creditCard.used || 0;
      if (used <= 0) return;
      const charge = Math.round(used * CC_MONTHLY_INTEREST);
      // Cap so used never exceeds the limit; if it would, only fill to limit.
      const newUsed = Math.min(bank.creditCard.limit, used + charge);
      const applied = newUsed - used;
      bank.creditCard.used = newUsed;
      events.push({ bankId: bank.id, charge: applied, requested: charge });
    });
    JI.recomputeNetWorth(state);
    return events;
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
    totalCreditCardDebt,
    totalAvailableCredit,
    LOAN_INTEREST_FLAT,
    LOAN_TERM_DAYS,
    CC_MAX_LIMIT,
    CC_MONTHLY_INTEREST,
    // Phase 2 additions
    charge,
    deposit,
    repayCreditCard,
    tickDailyLoans,
    refreshBankDerived: refreshDerived,
    // Phase 3 additions
    deductFromBest,
    enforceMonthlyCCCharges,
  });
})(window);
