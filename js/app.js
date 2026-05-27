/* =========================================================================
   app.js — Bootstrap, intro, game-loop orchestrator (Phase 3).

   advanceDay() pipeline (per spec):
     a) Increment totalDays + recalc date. Deduct Rp 150.000 daily ops cost.
     b) Deduct daily loan installments.
     c) On Month Change (every 30 days): annual tax assessment, employee
        salaries, credit-card monthly finance charges.
     d) On Month Change: asset revaluation — vehicles -2%, properties +1%.
     e) Run market algorithm (with active perks), apply tax penalties,
        recalculate Net Worth.

   Plus: Save game, Load game, Reset game, full-screen loading overlay,
   level-up modal.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI;

  /* ---------- Intro ---------- */
  const INTRO_TEXT = '@farhandwisusilo';
  const TYPE_SPEED_MS = 90;
  const HOLD_AFTER_TYPE_MS = 900;
  const FADE_MS = 700;

  function runIntro() {
    return new Promise(resolve => {
      const target = document.getElementById('intro-text');
      const cursor = document.getElementById('intro-cursor');
      const screen = document.getElementById('intro-screen');
      if (!target || !screen) { resolve(); return; }
      let i = 0;
      function tick() {
        if (i <= INTRO_TEXT.length) {
          target.textContent = INTRO_TEXT.slice(0, i);
          i += 1;
          setTimeout(tick, TYPE_SPEED_MS);
        } else {
          if (cursor) cursor.style.animation = 'none';
          setTimeout(() => {
            screen.classList.add('fade-out');
            setTimeout(() => {
              screen.style.display = 'none';
              resolve();
            }, FADE_MS);
          }, HOLD_AFTER_TYPE_MS);
        }
      }
      tick();
    });
  }

  function showApp() {
    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');
  }

  /* ---------- Loading overlay ---------- */
  function showLoading(message = 'Memproses hari kerja...') {
    let el = document.getElementById('day-loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'day-loading-overlay';
      el.className = 'fixed inset-0 z-[9990] bg-ink-950/85 backdrop-blur-sm ' +
                     'flex flex-col items-center justify-center text-white pointer-events-auto';
      el.innerHTML = `
        <div class="flex flex-col items-center gap-4 px-6 text-center">
          <div class="loading-spinner"></div>
          <p id="day-loading-text" class="font-mono text-sm sm:text-base text-emerald-400 tracking-wider"></p>
          <p class="text-xs text-slate-400">Pasar, pajak, gaji, dan revaluasi aset sedang diproses...</p>
        </div>`;
      document.body.appendChild(el);
    }
    const txt = document.getElementById('day-loading-text');
    if (txt) txt.textContent = message;
    el.classList.remove('hidden');
  }

  function hideLoading() {
    document.getElementById('day-loading-overlay')?.classList.add('hidden');
  }

  /* =========================================================================
     ASSET REVALUATION delegates to assets.js (lives there so it's available
     in headless tests without DOM).
     ========================================================================= */
  const revalueAssets = JI.revalueAssets || function() {
    return { vehiclesDepreciated: 0, propertiesAppreciated: 0, vehicleDelta: 0, propertyDelta: 0 };
  };
  const VEHICLE_DEPRECIATION  = JI.VEHICLE_DEPRECIATION  || 0.02;
  const PROPERTY_APPRECIATION = JI.PROPERTY_APPRECIATION || 0.01;

  /* =========================================================================
     PHASE 4 — Property passive income.
     Every 30 days (month change), unused office slots generate
     Rp 5.000.000 each via "Sewa Ruangan", deposited to a random bank.
     ========================================================================= */
  const PASSIVE_RENT_PER_SLOT = 5_000_000;

  function payRentalIncome(state) {
    const cap = (state.physicalAssets && state.physicalAssets.officeCapacity) || 0;
    const occupied = (state.hiredEmployees || []).length;
    const slots = Math.max(0, cap - occupied);
    if (slots <= 0) return null;
    const total = slots * PASSIVE_RENT_PER_SLOT;
    const bankId = JI.pickRandomBankId(state);
    if (!bankId) return null;
    const bank = JI.getBank(state, bankId);
    JI.bankCredit(state, bankId, total,
      `Sewa Ruangan: ${slots} slot kosong × ${JI.formatIDR(PASSIVE_RENT_PER_SLOT)}`);
    return { bankId, bankShortName: bank ? bank.shortName : bankId, slots, total };
  }

  /* =========================================================================
     ADVANCE DAY orchestrator
     ========================================================================= */
  let _advancing = false;
  const DAY_PROCESS_MIN_MS = 650; // minimum loading-overlay duration

  async function advanceDay() {
    if (_advancing) return;
    _advancing = true;
    showLoading('Memproses hari kerja...');

    // Yield so the spinner paints before we crunch numbers.
    await sleep(20);

    try {
      const s = JI.gameState;
      const startedAt = Date.now();
      const events = []; // collected for end-of-day toast summary

      // (a) Day++ and daily ops cost ---------------------------------------
      s.totalDays = (s.totalDays || 1) + 1;
      const opsCost = JI.DAILY_OPS_COST || 150_000;
      const opsResult = JI.deductFromBest(s, opsCost, 'Biaya Operasional Harian');
      if (!opsResult.ok) {
        events.push({ kind: 'ops-missed', amount: opsResult.shortfall });
      }

      // (b) Daily loan installments ---------------------------------------
      const loanEvents = JI.tickDailyLoans(s);
      surfaceLoanEvents(loanEvents);

      // Detect month change (every 30 in-game days).
      const monthIndex = Math.floor((s.totalDays - 1) / 30);
      const lastProcessed = s.lastMonthProcessed || 0;
      const isMonthChange = monthIndex > lastProcessed;

      // (c) Monthly: annual tax, payroll, CC charges ----------------------
      // (d) Monthly: asset revaluation ------------------------------------
      if (isMonthChange) {
        // Annual tax assessment
        const liab = JI.assessAnnualTax(s);
        if (liab) events.push({ kind: 'tax-assessed',
          amount: liab.baseAmount, ratePct: liab.ratePctApplied });

        // Payroll
        const payroll = JI.monthlyPayroll(s);
        if (payroll.totalPayroll > 0) {
          events.push({
            kind: 'payroll',
            amount: payroll.totalPayroll,
            shortfall: payroll.deduction.shortfall || 0,
          });
        }

        // CC monthly finance charges
        const ccEvents = JI.enforceMonthlyCCCharges(s);
        if (ccEvents && ccEvents.length) {
          events.push({
            kind: 'cc-charge',
            charges: ccEvents,
            total: ccEvents.reduce((a, e) => a + (e.charge || 0), 0),
          });
        }

        // Asset revaluation
        const reval = revalueAssets(s);
        if (reval.vehiclesDepreciated || reval.propertiesAppreciated) {
          events.push({ kind: 'reval', ...reval });
        }

        s.lastMonthProcessed = monthIndex;
      }

      // (e) News + market step + tax penalties -----------------------------
      // Phase 6 — DELAYED NEWS: today's headlines drive TOMORROW's prices.
      // Order:
      //   1. Apply YESTERDAY's queued multipliers (consumed inside
      //      calculateNextDayPrices via state.pendingNewsEffects) and
      //      random-walk the rest. Black Swan still gates the walk for the
      //      day if it fires.
      //   2. Generate TODAY's news + queue its multipliers for tomorrow.

      // Phase 4: Black Swan roll BEFORE the price step. If it fires, mark
      // activeEventModifier and skip the regular price update for the day.
      const bsEvent = JI.rollBlackSwan ? JI.rollBlackSwan(s) : null;
      if (bsEvent) {
        events.push({ kind: 'blackswan', title: bsEvent.title, severity: bsEvent.severity });
      }

      if (!bsEvent) {
        // Empty impact map — Phase 6 keeps news impact OUT of today's drift.
        // Yesterday's queued multipliers are consumed inside the call.
        JI.calculateNextDayPrices(s, {});
      } else {
        // Black Swan replaces today's drift; flush any queued news effects
        // so they don't double up tomorrow.
        s.pendingNewsEffects = [];
        s.activeEventModifier = null;
      }

      // Generate TODAY's news AFTER the price step.
      const news = JI.generateDailyNews(s);
      // Queue today's pre-rolled multipliers so they land tomorrow.
      if (typeof JI.queueNewsEffects === 'function') {
        JI.queueNewsEffects(s, news);
      }

      // Phase 6: Mega Infrastruktur passive daily income.
      if (typeof JI.injectInfrastructureIncome === 'function') {
        const infra = JI.injectInfrastructureIncome(s);
        if (infra && infra.total > 0) {
          events.push({ kind: 'infra-income', record: infra });
        }
      }

      // Phase 4: VC investment maturity tick
      if (JI.tickVCInvestments) {
        const maturedVC = JI.tickVCInvestments(s);
        maturedVC.forEach(m => events.push({ kind: 'vc-matured', record: m }));
      }

      // Phase 4: Deposito maturity tick
      if (JI.tickDepositos) {
        const maturedDep = JI.tickDepositos(s);
        maturedDep.forEach(m => events.push({ kind: 'deposito-matured', record: m }));
      }

      // Phase 4: IPO dividend tick (post-IPO every 360 days)
      if (JI.tickIPODividend) {
        const dividend = JI.tickIPODividend(s);
        if (dividend) events.push({ kind: 'ipo-dividend', record: dividend });
      }

      // Phase 4: Monthly passive rental income from unused office slots
      if (isMonthChange) {
        const rental = payRentalIncome(s);
        if (rental) events.push({ kind: 'rental-income', record: rental });
      }

      // Phase 4: VC active-startup rotation (every 30 days, independent of
      // calendar month boundary)
      if (JI.maybeRotateVC) JI.maybeRotateVC(s);

      // Tax penalties (after market move, after day increment)
      const penEvents = JI.applyDailyPenalties(s);
      if (penEvents && penEvents.length) {
        events.push({
          kind: 'tax-penalty',
          total: penEvents.reduce((a, e) => a + e.penalty, 0),
          count: penEvents.length,
        });
      }

      // Phase 5: NO passive XP from the day loop. companyXP MUST only be
      // awarded inside sellAsset() on profitable sells (and the rare
      // "Diundang ke Podcast Deddy" event handled in blackswan.js).

      // Final NW + persist
      JI.recomputeNetWorth(s);
      JI.saveState(s);

      // Floor min-show duration so the spinner doesn't flash
      const elapsed = Date.now() - startedAt;
      if (elapsed < DAY_PROCESS_MIN_MS) await sleep(DAY_PROCESS_MIN_MS - elapsed);

      // Surface event-driven toasts
      surfaceMonthlyEvents(events);

      // Lead headline toast
      const lead = news[0];
      if (lead) {
        const cls = lead.mood === 'bearish' ? 'warning' : 'info';
        JI.toast(`${lead.icon || '📰'} ${lead.headline}`, cls, 3500);
      }

      JI.renderAll();
    } catch (err) {
      console.error('advanceDay error:', err);
      JI.toast('Terjadi error saat memproses hari. Lihat console.', 'error', 4000);
    } finally {
      hideLoading();
      _advancing = false;
    }
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function surfaceLoanEvents(events) {
    if (!events) return;
    events.forEach(ev => {
      const bank = JI.getBank(JI.gameState, ev.bankId);
      const name = bank ? bank.shortName : ev.bankId;
      if (ev.missed) {
        JI.toast(`Cicilan ${name} gagal — denda ${JI.formatIDR(ev.penalty)} ditambahkan.`, 'error', 3500);
      } else if (ev.warning) {
        JI.toast(`Cicilan ${name} ditagihkan ke kartu kredit (${JI.formatIDR(ev.paid)}).`, 'warning', 3500);
      } else if (ev.closed) {
        JI.toast(`Pinjaman ${name} lunas! 🎉`, 'success', 3500);
      }
    });
  }

  function surfaceMonthlyEvents(events) {
    if (!events || !events.length) return;
    events.forEach(ev => {
      switch (ev.kind) {
        case 'ops-missed':
          JI.toast(`Biaya operasional Rp ${(ev.amount || 0).toLocaleString('id-ID')} tidak tertagih sepenuhnya.`, 'error', 3500);
          break;
        case 'tax-assessed':
          JI.toast(`🧾 Pajak tahunan baru: ${JI.formatIDR(ev.amount)} (${ev.ratePct}% dari NW). Bayar di CoreTax DJP.`, 'warning', 4000);
          break;
        case 'payroll':
          if (ev.shortfall > 0) {
            JI.toast(`Gaji karyawan total ${JI.formatIDR(ev.amount)} — kekurangan ${JI.formatIDR(ev.shortfall)}.`, 'error', 4000);
          } else {
            JI.toast(`💵 Gaji bulanan ${JI.formatIDR(ev.amount)} berhasil dibayarkan.`, 'info', 3500);
          }
          break;
        case 'cc-charge':
          JI.toast(`💳 Bunga kartu kredit bulan ini: ${JI.formatIDR(ev.total)} (5%).`, 'warning', 3500);
          break;
        case 'reval':
          JI.toast(
            `Revaluasi bulanan: kendaraan ${JI.formatIDR(ev.vehicleDelta)}, properti +${JI.formatIDR(Math.max(0, ev.propertyDelta))}.`,
            'info', 3500
          );
          break;
        case 'tax-penalty':
          JI.toast(`⚠ Denda pajak: ${JI.formatIDR(ev.total)} (${ev.count} tagihan terlambat).`, 'error', 4000);
          break;
        case 'blackswan':
          JI.toast(`☣ BLACK SWAN: ${ev.title}`, ev.severity === 'green' ? 'success' : 'error', 5000);
          break;
        case 'vc-matured': {
          const m = ev.record;
          if (m.outcome === 'Bankrupt') {
            JI.toast(`❌ ${m.startupName} BANGKRUT. Investasi ${JI.formatIDR(m.originalAmount)} hilang.`, 'error', 6000);
          } else if (m.outcome === 'Acquisition') {
            JI.toast(`🎯 ${m.startupName} di-AKUISISI! ${m.multiplier}× → ${JI.formatIDR(m.payout)}`, 'success', 6000);
          } else if (m.outcome === 'Unicorn IPO') {
            JI.toast(`🦄 ${m.startupName} jadi UNICORN IPO! ${m.multiplier}× → ${JI.formatIDR(m.payout)}`, 'success', 7000);
          }
          break;
        }
        case 'deposito-matured': {
          const d = ev.record;
          JI.toast(
            `💰 Deposito ${d.months} bulan jatuh tempo di ${d.bankShortName}: +${JI.formatIDR(d.interest)} bunga.`,
            'success', 5000);
          break;
        }
        case 'ipo-dividend': {
          const r = ev.record;
          if (r.demoted) {
            JI.toast(`⚠ Dividen Publik gagal dibayar penuh (kurang ${JI.formatIDR(r.shortfall)}). Level perusahaan turun.`, 'error', 7000);
          } else {
            JI.toast(`📢 Dividen Publik tahunan dibayar: ${JI.formatIDR(r.paid)} (5% NW).`, 'info', 5500);
          }
          break;
        }
        case 'rental-income': {
          const r = ev.record;
          JI.toast(
            `🏢 Sewa Ruangan: +${JI.formatIDR(r.total)} masuk ke ${r.bankShortName} (${r.slots} slot kosong).`,
            'success', 5000);
          break;
        }
        case 'infra-income': {
          const r = ev.record;
          const items = (r.breakdown || [])
            .map(b => `${b.name} ×${b.qty}`)
            .join(', ');
          JI.toast(
            `🏗 Sektor Riil: +${JI.formatIDR(r.total)} masuk ke ${r.bankName}` +
            (items ? ` (${items}).` : '.'),
            'success', 5000);
          break;
        }
      }
    });
  }

  /* =========================================================================
     LEVEL UP modal (ui.js doesn't own this since app.js triggers level-ups
     from daily XP and other sources).
     ========================================================================= */
  function showLevelUpAlert(newLevel, newTitle, levelsGained = 1) {
    const overlay = document.createElement('div');
    overlay.id = 'levelup-modal';
    overlay.className = 'fixed inset-0 z-[9995] flex items-center justify-center bg-black/70 p-4';
    overlay.innerHTML = `
      <div class="levelup-card text-center max-w-md w-full p-8 rounded-2xl shadow-2xl">
        <div class="text-6xl mb-3 levelup-burst">🎉</div>
        <p class="text-xs uppercase tracking-[0.4em] text-emerald-400 mb-2">Level Up!</p>
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white">Level ${newLevel}</h2>
        <p class="mt-2 text-lg text-emerald-300 font-semibold">${escapeHtml(newTitle)}</p>
        ${levelsGained > 1 ? `<p class="mt-1 text-xs text-slate-400">+${levelsGained} levels</p>` : ''}
        <p class="mt-4 text-sm text-slate-300">Selamat, perusahaan Anda naik kelas.</p>
        <button id="levelup-close" class="ji-btn ji-btn-success mt-6 w-full">Lanjutkan</button>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('#levelup-close').addEventListener('click', close);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  /* =========================================================================
     SAVE / LOAD / RESET
     ========================================================================= */
  function saveGame() {
    JI.saveState(JI.gameState);
    JI.toast('Game tersimpan ke localStorage.', 'success', 2200);
  }

  function loadGame() {
    const loaded = JI.loadState();
    if (!loaded) {
      JI.toast('Tidak ada save game tersimpan.', 'warning', 2500);
      return;
    }
    JI.gameState = JI.migrateState(loaded);
    // Re-init market shape if missing tickers (catalog might have grown).
    JI.initMarket(JI.gameState);
    JI.recomputeOfficeCapacity(JI.gameState);
    if (JI.maybeRotateVC) JI.maybeRotateVC(JI.gameState);
    if (typeof JI.ensureInfraState === 'function') JI.ensureInfraState(JI.gameState);
    JI.recomputeNetWorth(JI.gameState);
    JI.renderAll();
    JI.toast('Game dimuat ulang dari localStorage.', 'info', 2500);
  }

  function resetGame(opts = { confirm: true }) {
    if (opts.confirm) {
      const ok = window.confirm(
        'Reset game?\n\nSemua progress, bank, portfolio, aset, pajak, dan karyawan akan dihapus. Aksi ini tidak bisa dibatalkan.'
      );
      if (!ok) return;
    }
    JI.resetState();
    // Rebuild a fresh world.
    JI.initState();
    JI.initBanks(JI.gameState);
    JI.initMarket(JI.gameState);
    JI.recomputeOfficeCapacity(JI.gameState);
    if (JI.maybeRotateVC) JI.maybeRotateVC(JI.gameState);
    if (typeof JI.ensureInfraState === 'function') JI.ensureInfraState(JI.gameState);
    seedInitialNewsIfNeeded(JI.gameState);
    JI.recomputeNetWorth(JI.gameState);
    JI.saveState(JI.gameState);
    JI.gameState.activeTab = 'home';
    JI.renderAll();
    JI.toast('Game di-reset. Selamat datang kembali, Juragan!', 'success', 3000);
  }

  /* =========================================================================
     BOOTSTRAP
     ========================================================================= */
  function bootstrap() {
    JI.initState();
    JI.initBanks(JI.gameState);
    JI.initMarket(JI.gameState);
    JI.recomputeOfficeCapacity(JI.gameState);
    if (JI.maybeRotateVC) JI.maybeRotateVC(JI.gameState);
    // Phase 6: ensure Mega Infrastruktur state shape exists.
    if (typeof JI.ensureInfraState === 'function') JI.ensureInfraState(JI.gameState);
    // Phase 6: seed Day-1 news so the player has headlines to read on Day 1
    // while their price effects sit in pendingNewsEffects and only land when
    // the player clicks "Next Day →" (= Day 2). Enforces the delayed-effect
    // rule even on a brand new game.
    seedInitialNewsIfNeeded(JI.gameState);
    JI.recomputeNetWorth(JI.gameState);
    JI.saveState(JI.gameState);

    JI.buildTabs();
    JI.bindGlobalEvents();
    JI.renderAll();

    // Periodic header refresh (clock).
    setInterval(JI.renderHeader, 30_000);
  }

  /* Phase 6 helper — only seeds news if the day has none yet. Idempotent
     across reloads; safe even when migrating an existing v4 save. */
  function seedInitialNewsIfNeeded(state) {
    if (!state) return;
    if (typeof JI.generateDailyNews !== 'function') return;
    const noTodaysNews = !state.dailyNews || state.dailyNews.length === 0;
    const noPendingFx  = !state.pendingNewsEffects || state.pendingNewsEffects.length === 0;
    const noHistoryToday = !(state.newsHistory || []).some(n => n.day === state.totalDays);
    if (!(noTodaysNews && noPendingFx && noHistoryToday)) return;

    const news = JI.generateDailyNews(state) || [];
    if (typeof JI.queueNewsEffects === 'function') {
      JI.queueNewsEffects(state, news);
    }
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    advanceDay,
    showLoading,
    hideLoading,
    showLevelUpAlert,
    saveGame,
    loadGame,
    resetGame,
    revalueAssets,
    VEHICLE_DEPRECIATION,
    PROPERTY_APPRECIATION,
    // Phase 4
    PASSIVE_RENT_PER_SLOT,
    payRentalIncome,
  });

  document.addEventListener('DOMContentLoaded', () => {
    bootstrap();
    runIntro().then(showApp);
  });
})(window);
