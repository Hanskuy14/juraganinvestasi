/* =========================================================================
   ui.js — Tab system, header, Home & Banking renderers, placeholders.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Tab definitions ---------- */
  const TABS = [
    { id: 'home',      label: 'Home',       icon: '🏠', mobilePrimary: true  },
    { id: 'banking',   label: 'Banking',    icon: '🏦', mobilePrimary: true  },
    { id: 'market',    label: 'Market',     icon: '📈', mobilePrimary: true  },
    { id: 'portfolio', label: 'Portfolio',  icon: '💼', mobilePrimary: true  },
    { id: 'news',      label: 'News',       icon: '📰', mobilePrimary: false },
    { id: 'coretax',   label: 'CoreTax DJP',icon: '🧾', mobilePrimary: false },
    { id: 'hrd',       label: 'HRD',        icon: '👥', mobilePrimary: false },
    { id: 'aset',      label: 'Aset Fisik', icon: '🏢', mobilePrimary: false },
  ];

  /* =========================================================================
     Header & nav
     ========================================================================= */
  function renderHeader() {
    const s = JI.gameState;
    JI.recomputeNetWorth(s);

    const networthEl = document.getElementById('header-networth');
    const dateEl = document.getElementById('header-date');
    const clockEl = document.getElementById('header-clock');

    if (networthEl) networthEl.textContent = JI.formatIDR(s.totalNetWorth);
    if (dateEl)     dateEl.textContent = JI.formatCalendar(s.totalDays);

    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit'
      });
    }
  }

  function buildTabs() {
    const desktop = document.getElementById('desktop-tabs');
    const drawer  = document.getElementById('mobile-tabs');
    const bottom  = document.getElementById('mobile-bottom-nav');
    if (!desktop || !drawer || !bottom) return;

    desktop.innerHTML = '';
    drawer.innerHTML = '';
    bottom.innerHTML = '';

    TABS.forEach(tab => {
      // Desktop tab
      const dBtn = JI.el('button', {
        class: 'desktop-tab',
        dataset: { tabid: tab.id },
        onclick: () => switchTab(tab.id),
      }, [JI.el('span', { class: 'text-base leading-none' }, tab.icon), tab.label]);
      desktop.appendChild(dBtn);

      // Drawer item
      const drBtn = JI.el('button', {
        class: 'mdrawer-btn',
        dataset: { tabid: tab.id },
        onclick: () => { switchTab(tab.id); closeMobileMenu(); },
      }, [JI.el('span', { class: 'text-lg w-6 text-center' }, tab.icon), tab.label]);
      drawer.appendChild(drBtn);
    });

    // Bottom nav: 4 primary tabs + "More"
    const primary = TABS.filter(t => t.mobilePrimary).slice(0, 4);
    primary.forEach(tab => {
      const b = JI.el('button', {
        class: 'mnav-btn',
        dataset: { tabid: tab.id },
        onclick: () => switchTab(tab.id),
      }, [
        JI.el('span', { class: 'text-lg leading-none' }, tab.icon),
        JI.el('span', {}, tab.label),
      ]);
      bottom.appendChild(b);
    });

    // "More" opens drawer
    const moreBtn = JI.el('button', {
      class: 'mnav-btn',
      onclick: openMobileMenu,
    }, [
      JI.el('span', { class: 'text-lg leading-none' }, '⋯'),
      JI.el('span', {}, 'More'),
    ]);
    bottom.appendChild(moreBtn);
  }

  function highlightActiveTab() {
    const id = JI.gameState.activeTab;
    JI.$$('#desktop-tabs .desktop-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tabid === id);
    });
    JI.$$('#mobile-tabs .mdrawer-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tabid === id);
    });
    JI.$$('#mobile-bottom-nav .mnav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tabid === id);
    });
  }

  function switchTab(id) {
    if (!TABS.find(t => t.id === id)) return;
    JI.gameState.activeTab = id;
    JI.$$('.tab-panel').forEach(p => {
      p.classList.toggle('hidden', p.dataset.tabPanel !== id);
    });
    highlightActiveTab();
    renderActivePanel();
    JI.saveState(JI.gameState);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ---------- Mobile menu ---------- */
  function openMobileMenu()  { document.getElementById('mobile-menu')?.classList.remove('hidden'); }
  function closeMobileMenu() { document.getElementById('mobile-menu')?.classList.add('hidden'); }

  function bindGlobalEvents() {
    document.getElementById('mobile-menu-btn')?.addEventListener('click', openMobileMenu);
    JI.$$('[data-close-menu]').forEach(b => b.addEventListener('click', closeMobileMenu));
  }

  /* =========================================================================
     Panels
     ========================================================================= */
  function renderActivePanel() {
    const id = JI.gameState.activeTab;
    const panel = JI.$(`[data-tab-panel="${id}"]`);
    if (!panel) return;

    const renderers = {
      home:      renderHomePanel,
      banking:   renderBankingPanel,
      market:    renderMarketPanel,
      portfolio: renderPortfolioPanel,
      news:      renderNewsPanel,
      coretax:   () => renderPlaceholder(panel, 'CoreTax DJP', 'Pelaporan SPT & PPh hadir di Phase 6.'),
      hrd:       () => renderPlaceholder(panel, 'HRD', 'Rekrutmen karyawan hadir di Phase 6.'),
      aset:      renderAsetPanel,
    };
    (renderers[id] || (() => {}))(panel);
  }

  function renderPlaceholder(panel, title, subtitle) {
    panel.innerHTML = '';
    panel.appendChild(JI.el('div', { class: 'ji-card p-8 text-center max-w-2xl mx-auto' }, [
      JI.el('div', { class: 'text-5xl mb-4' }, '🚧'),
      JI.el('h2', { class: 'text-xl sm:text-2xl font-bold mb-2' }, title),
      JI.el('p', { class: 'text-slate-500' }, subtitle),
      JI.el('p', { class: 'mt-6 text-xs text-slate-400 font-mono' },
        'Phase 1 fokus pada Home & Banking.'),
    ]));
  }

  /* ---------- Home panel ---------- */
  function renderHomePanel(panel) {
    const s = JI.gameState;
    JI.recomputeNetWorth(s);
    const cal = JI.getCalendar(s.totalDays);
    const xpNeed = JI.xpToNext(s.companyLevel);
    const xpPct  = JI.clamp(Math.round((s.companyXP / xpNeed) * 100), 0, 100);
    const title  = JI.getCompanyTitle(s.companyLevel);

    panel.innerHTML = '';

    // Hero / title card
    const hero = JI.el('div', {
      class: 'ji-card p-6 sm:p-8 mb-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative overflow-hidden'
    });
    hero.appendChild(JI.el('div', {
      class: 'absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none'
    }));
    hero.appendChild(JI.el('p', { class: 'text-xs uppercase tracking-[0.3em] text-emerald-400 mb-2' },
      'Welcome back, Juragan'));
    hero.appendChild(JI.el('h2', { class: 'text-2xl sm:text-4xl font-extrabold tracking-tight' },
      'Juragan Investasi: Capitalist Tycoon'));
    hero.appendChild(JI.el('p', { class: 'text-slate-300 mt-2 max-w-xl text-sm sm:text-base' },
      'Bangun imperium investasi Anda di Indonesia. Kelola kas, manfaatkan kredit, dan tumbuhkan kekayaan dari hari ke hari.'));
    panel.appendChild(hero);

    // Stat grid
    const grid = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6' });

    grid.appendChild(statCard({
      label: 'Total Net Worth',
      value: JI.formatIDR(s.totalNetWorth),
      sub: 'Saldo bank − utang aktif',
      accent: 'text-emerald-600',
    }));
    grid.appendChild(statCard({
      label: 'Tanggal Permainan',
      value: JI.formatCalendar(s.totalDays),
      sub: `Hari ke-${cal.totalDays} sejak memulai`,
      accent: 'text-slate-900',
      mono: true,
    }));
    grid.appendChild(statCard({
      label: 'Total Saldo Bank',
      value: JI.formatIDR(JI.totalBankBalance(s)),
      sub: `${s.banks.length} rekening aktif`,
      accent: 'text-blue-600',
    }));

    panel.appendChild(grid);

    // Company Level card
    const lvlCard = JI.el('div', { class: 'ji-card p-6 mb-6' });
    lvlCard.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 mb-4 flex-wrap' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-xs uppercase tracking-wider text-slate-500' }, 'Company Level'),
        JI.el('h3', { class: 'text-xl sm:text-2xl font-bold mt-1' },
          `Level ${s.companyLevel} · ${title}`),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-xs text-slate-500' }, 'XP'),
        JI.el('p', { class: 'font-mono font-semibold' },
          `${s.companyXP.toLocaleString('id-ID')} / ${xpNeed.toLocaleString('id-ID')}`),
      ]),
    ]));
    const xpBar = JI.el('div', { class: 'xp-bar' });
    xpBar.appendChild(JI.el('span', { style: `width:${xpPct}%` }));
    lvlCard.appendChild(xpBar);
    lvlCard.appendChild(JI.el('p', { class: 'mt-3 text-xs text-slate-500' },
      `Naik level untuk membuka gelar perusahaan baru. ${xpPct}% menuju level ${s.companyLevel + 1}.`));
    panel.appendChild(lvlCard);

    // Quick links
    const quick = JI.el('div', { class: 'grid grid-cols-2 sm:grid-cols-4 gap-3' });
    [
      { id: 'banking', label: 'Buka Banking', icon: '🏦' },
      { id: 'market',  label: 'Lihat Market', icon: '📈' },
      { id: 'news',    label: 'Berita Hari Ini', icon: '📰' },
      { id: 'aset',    label: 'Aset Fisik', icon: '🏢' },
    ].forEach(q => {
      quick.appendChild(JI.el('button', {
        class: 'ji-card p-4 text-left hover:shadow-md transition-shadow',
        onclick: () => switchTab(q.id),
      }, [
        JI.el('div', { class: 'text-2xl mb-2' }, q.icon),
        JI.el('p', { class: 'text-sm font-semibold' }, q.label),
      ]));
    });
    panel.appendChild(quick);

    // Next Day mega-CTA
    panel.appendChild(renderNextDayCTA());
  }

  /* ---------- Next Day call-to-action ---------- */
  function renderNextDayCTA() {
    const wrap = JI.el('div', {
      class: 'ji-card p-6 mt-6 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white relative overflow-hidden'
    });
    wrap.appendChild(JI.el('div', {
      class: 'absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none'
    }));
    wrap.appendChild(JI.el('p', { class: 'text-xs uppercase tracking-[0.3em] text-white/80' }, 'Game Loop'));
    wrap.appendChild(JI.el('h3', { class: 'text-2xl font-extrabold mt-1 mb-2' }, 'Next Day →'));
    wrap.appendChild(JI.el('p', { class: 'text-sm text-white/85 max-w-xl mb-4' },
      'Lanjutkan ke hari berikutnya. Berita pasar baru terbit, harga aset bergerak, dan ada 8% peluang kejadian tak terduga di Indonesia menyapa kantor Anda.'));
    wrap.appendChild(JI.el('button', {
      class: 'ji-btn bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-6 py-3',
      onclick: handleNextDayClick,
    }, '⏭  Lanjut ke Hari Berikutnya'));
    return wrap;
  }

  /* ---------- Next Day click handler (used by Home + global FAB) ---------- */
  function handleNextDayClick() {
    const s = JI.gameState;
    const report = JI.nextDay(s);
    renderHeader();
    renderActivePanel();

    // Phase 6: surface Mega Infrastructure income (if any) before event modal.
    if (report && report.infraReport && report.infraReport.total > 0) {
      JI.toast(
        `🏛️ Income Mega Infrastruktur ${JI.formatIDR(report.infraReport.total)} masuk ke ${report.infraReport.bankName}.`,
        'success', 4000
      );
    }

    // If event fired, surface it via the modal (terrifying red / shiny gold).
    if (s.pendingEvent) {
      JI.showEventModal(s.pendingEvent, () => {
        s.pendingEvent = null;
        JI.saveState(s);
        renderHeader();
        renderActivePanel();
      });
    } else if (report && report.news && report.news.length) {
      const sample = report.news[0];
      JI.toast(`Hari ${s.totalDays}: ${sample.headline}`, 'info', 3500);
    } else {
      JI.toast(`Hari ${s.totalDays}: pasar tenang.`, 'info');
    }
  }

  function statCard({ label, value, sub, accent = 'text-slate-900', mono = false }) {
    return JI.el('div', { class: 'ji-card p-5' }, [
      JI.el('p', { class: 'text-xs uppercase tracking-wider text-slate-500' }, label),
      JI.el('p', {
        class: `${mono ? 'font-mono ' : ''}text-xl sm:text-2xl font-bold mt-1 ${accent}`
      }, value),
      sub ? JI.el('p', { class: 'text-xs text-slate-400 mt-1' }, sub) : null,
    ]);
  }

  /* =========================================================================
     Banking panel
     ========================================================================= */
  function renderBankingPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Banking'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Kelola rekening, kartu kredit, dan pinjaman KTA Anda di Mandiri, BCA, dan BNI.'),
    ]));

    const grid = JI.el('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-5' });
    s.banks.forEach(bank => grid.appendChild(renderBankCard(bank)));
    panel.appendChild(grid);
  }

  function renderBankCard(bank) {
    const offer = JI.creditCardOffer(bank.balance);
    const maxLoan = JI.maxLoanPrincipal(bank.balance);

    const card = JI.el('div', { class: 'ji-card p-0 overflow-hidden' });

    /* ----- Header (themed bank card) ----- */
    const header = JI.el('div', { class: `bank-card ${bank.themeClass} p-5 text-white relative` });
    header.appendChild(JI.el('div', { class: 'gloss' }));
    header.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 relative' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-xs uppercase tracking-widest opacity-80' }, bank.shortName),
        JI.el('h3', { class: 'text-lg font-bold leading-tight' }, bank.name),
        JI.el('p', { class: 'text-[11px] opacity-70 mt-1' }, bank.tagline),
      ]),
      JI.el('span', {
        class: `tier-badge ${JI.tierBadgeClass(bank.debitTier)}`,
      }, bank.debitTier),
    ]));
    header.appendChild(JI.el('div', { class: 'mt-6 relative' }, [
      JI.el('p', { class: 'text-[11px] uppercase tracking-widest opacity-70' }, 'Saldo Tersedia'),
      JI.el('p', { class: 'text-2xl font-bold font-mono mt-1' }, JI.formatIDR(bank.balance)),
    ]));
    header.appendChild(JI.el('p', {
      class: 'mt-3 text-[10px] font-mono opacity-70 relative tracking-widest'
    }, `**** **** **** ${(bank.id.toUpperCase() + '0000').slice(0, 4)}`));
    card.appendChild(header);

    /* ----- Body ----- */
    const body = JI.el('div', { class: 'p-5 space-y-5' });

    /* (a) Transfer */
    body.appendChild(renderTransferSection(bank));

    /* (b) Credit Card */
    body.appendChild(renderCreditCardSection(bank, offer));

    /* (c) Loan */
    body.appendChild(renderLoanSection(bank, maxLoan));

    card.appendChild(body);
    return card;
  }

  /* ---------- Transfer Section ---------- */
  function renderTransferSection(bank) {
    const s = JI.gameState;
    const others = s.banks.filter(b => b.id !== bank.id);

    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Transfer Antar Rekening',
      `Pindahkan dana dari ${bank.shortName} ke rekening lain.`));

    const select = JI.el('select', { class: 'ji-input ji-select' });
    others.forEach(o => {
      select.appendChild(JI.el('option', { value: o.id }, `${o.shortName} — ${JI.formatIDR(o.balance)}`));
    });

    const input = JI.el('input', {
      type: 'number',
      inputmode: 'numeric',
      min: '1',
      step: '1',
      placeholder: 'Nominal (Rp)',
      class: 'ji-input',
    });

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full',
      onclick: () => {
        const amount = JI.parseIDRInput(input.value);
        const result = JI.transfer(s, bank.id, select.value, amount);
        if (!result.ok) { JI.toast(result.error, 'error'); return; }
        JI.toast(`Transfer ${JI.formatIDR(result.amount)} dari ${bank.shortName} berhasil.`);
        input.value = '';
        JI.saveState(s);
        renderHeader();
        renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
      },
    }, 'Transfer');

    const grid = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-2' }, [
      labelled('Tujuan', select),
      labelled('Nominal', input),
    ]);

    wrap.appendChild(grid);
    wrap.appendChild(JI.el('div', { class: 'mt-3' }, btn));
    return wrap;
  }

  /* ---------- Credit Card Section ---------- */
  function renderCreditCardSection(bank, offer) {
    const s = JI.gameState;
    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Kartu Kredit',
      'Limit ditentukan dari saldo rekening saat ini.'));

    if (bank.creditCard.isApproved) {
      const usedPct = bank.creditCard.limit > 0
        ? Math.round((bank.creditCard.used / bank.creditCard.limit) * 100)
        : 0;
      const available = bank.creditCard.limit - bank.creditCard.used;

      wrap.appendChild(JI.el('div', { class: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4' }, [
        JI.el('div', { class: 'flex items-center justify-between gap-2 flex-wrap' }, [
          JI.el('span', { class: 'text-emerald-700 font-semibold text-sm' }, '✓ Kartu Kredit Aktif'),
          JI.el('span', { class: 'text-xs text-emerald-700 font-mono' }, `${usedPct}% terpakai`),
        ]),
        JI.el('div', { class: 'mt-3 grid grid-cols-2 gap-3 text-sm' }, [
          kv('Limit', JI.formatIDR(bank.creditCard.limit)),
          kv('Terpakai', JI.formatIDR(bank.creditCard.used)),
          kv('Tersedia', JI.formatIDR(available), 'text-emerald-700 font-semibold'),
          kv('Status', 'Approved', 'text-emerald-700 font-semibold'),
        ]),
      ]));
      return wrap;
    }

    // Not yet approved — show offer/apply UI.
    const info = JI.el('div', { class: 'rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm' });
    if (offer.eligible) {
      info.appendChild(JI.el('p', { class: 'text-slate-700' },
        `Penawaran limit awal: ${JI.formatIDR(offer.limit)}`));
      info.appendChild(JI.el('p', { class: 'text-xs text-slate-500 mt-1' },
        '50% dari saldo saat ini, maksimum Rp 100.000.000.'));
    } else {
      info.appendChild(JI.el('p', { class: 'text-amber-700' }, '⚠ Belum memenuhi syarat'));
      info.appendChild(JI.el('p', { class: 'text-xs text-slate-500 mt-1' }, offer.reason));
    }
    wrap.appendChild(info);

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-success w-full mt-3',
      disabled: !offer.eligible ? '' : null,
      onclick: () => {
        const r = JI.applyCreditCard(s, bank.id);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(`Kartu kredit ${bank.shortName} disetujui dengan limit ${JI.formatIDR(r.limit)}.`);
        JI.saveState(s);
        renderHeader();
        renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
      },
    }, 'Ajukan Kartu Kredit');

    if (!offer.eligible) btn.setAttribute('disabled', 'disabled');
    wrap.appendChild(btn);
    return wrap;
  }

  /* ---------- Loan Section ---------- */
  function renderLoanSection(bank, maxLoan) {
    const s = JI.gameState;
    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Pinjaman Bank (KTA)',
      `Bunga flat ${(JI.LOAN_INTEREST_FLAT * 100).toFixed(0)}% · Tenor ${JI.LOAN_TERM_DAYS} hari.`));

    if (bank.loan.isActive) {
      const paid = bank.loan.principal * (1 + JI.LOAN_INTEREST_FLAT) - bank.loan.remaining;
      const totalRepay = Math.round(bank.loan.principal * (1 + JI.LOAN_INTEREST_FLAT));
      const pct = totalRepay > 0
        ? JI.clamp(Math.round((paid / totalRepay) * 100), 0, 100)
        : 0;

      wrap.appendChild(JI.el('div', { class: 'rounded-xl border border-amber-200 bg-amber-50 p-4' }, [
        JI.el('div', { class: 'flex items-center justify-between flex-wrap gap-2' }, [
          JI.el('span', { class: 'text-amber-800 font-semibold text-sm' }, '● Pinjaman Aktif'),
          JI.el('span', { class: 'text-xs text-amber-800 font-mono' },
            `${bank.loan.daysRemaining} hari tersisa`),
        ]),
        JI.el('div', { class: 'mt-3 grid grid-cols-2 gap-3 text-sm' }, [
          kv('Pokok', JI.formatIDR(bank.loan.principal)),
          kv('Sisa Tagihan', JI.formatIDR(bank.loan.remaining), 'text-amber-800 font-semibold'),
          kv('Cicilan/Hari', JI.formatIDR(bank.loan.dailyInstallment)),
          kv('Mulai', `Hari ${bank.loan.startedOnDay}`),
        ]),
        JI.el('div', { class: 'xp-bar mt-3' }, [
          JI.el('span', { style: `width:${pct}%; background:linear-gradient(90deg,#f59e0b,#b45309)` }),
        ]),
      ]));
      return wrap;
    }

    // Not active — show form
    const input = JI.el('input', {
      type: 'number',
      inputmode: 'numeric',
      min: '1',
      step: '1',
      placeholder: 'Nominal pokok (Rp)',
      class: 'ji-input',
    });

    const quoteEl = JI.el('div', { class: 'text-xs text-slate-500 mt-2 font-mono' },
      `Maks. pinjaman: ${JI.formatIDR(maxLoan)}`);

    function updateQuote() {
      const p = JI.parseIDRInput(input.value);
      if (!p) {
        quoteEl.textContent = `Maks. pinjaman: ${JI.formatIDR(maxLoan)}`;
        return;
      }
      const q = JI.quoteLoan(p);
      quoteEl.textContent =
        `Total bayar ${JI.formatIDR(q.totalRepay)} · Cicilan/hari ${JI.formatIDR(q.dailyInstallment)} (${q.termDays} hari)`;
    }
    input.addEventListener('input', updateQuote);

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-warning w-full mt-3',
      disabled: maxLoan <= 0 ? '' : null,
      onclick: () => {
        const principal = JI.parseIDRInput(input.value);
        const r = JI.applyLoan(s, bank.id, principal);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(`Pinjaman ${JI.formatIDR(r.quote.principal)} dari ${bank.shortName} dicairkan.`);
        JI.saveState(s);
        renderHeader();
        renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
      },
    }, 'Ajukan KTA');

    if (maxLoan <= 0) btn.setAttribute('disabled', 'disabled');

    wrap.appendChild(labelled('Nominal Pokok', input));
    wrap.appendChild(quoteEl);
    wrap.appendChild(btn);
    return wrap;
  }

  /* ---------- Small UI helpers ---------- */
  function sectionTitle(title, sub) {
    return JI.el('div', { class: 'mb-3' }, [
      JI.el('h4', { class: 'font-semibold text-slate-900 text-sm' }, title),
      sub ? JI.el('p', { class: 'text-xs text-slate-500' }, sub) : null,
    ]);
  }

  function labelled(label, input) {
    return JI.el('label', { class: 'block' }, [
      JI.el('span', { class: 'block text-[11px] uppercase tracking-wider text-slate-500 mb-1' }, label),
      input,
    ]);
  }

  function kv(k, v, valueClass = '') {
    return JI.el('div', {}, [
      JI.el('p', { class: 'text-[11px] uppercase tracking-wider text-slate-500' }, k),
      JI.el('p', { class: `font-mono text-sm ${valueClass}` }, v),
    ]);
  }

  /* =========================================================================
     Market panel  (Phase 5)
     Shows 45 hardcoded assets in 3 tabs; quick Buy form per asset.
     ========================================================================= */
  function renderMarketPanel(panel) {
    const s = JI.gameState;
    if (typeof JI.seedMarket === 'function') JI.seedMarket(s);
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between gap-3 flex-wrap' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Market'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          '45 aset hardcoded · Saham IDX, Kripto, Reksadana. Harga bergerak setiap "Next Day".'),
      ]),
      JI.el('button', {
        class: 'ji-btn ji-btn-success',
        onclick: handleNextDayClick,
      }, '⏭  Next Day'),
    ]));

    /* category sub-tabs */
    const cats = [
      { id: 'stock',  label: '📈 Saham IDX',  count: 15 },
      { id: 'crypto', label: '₿ Kripto',      count: 15 },
      { id: 'mutual', label: '📊 Reksadana',  count: 15 },
    ];
    if (!s._marketCat) s._marketCat = 'stock';

    const tabs = JI.el('div', { class: 'flex gap-2 mb-4 overflow-x-auto pb-1' });
    cats.forEach(c => {
      const active = s._marketCat === c.id;
      tabs.appendChild(JI.el('button', {
        class: `ji-btn ${active ? 'ji-btn-primary' : 'ji-btn-ghost'} text-sm`,
        onclick: () => { s._marketCat = c.id; renderMarketPanel(panel); },
      }, `${c.label} · ${c.count}`));
    });
    panel.appendChild(tabs);

    /* asset list */
    const list = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3' });
    JI.getAssetsByCategory(s._marketCat).forEach(asset => {
      list.appendChild(renderAssetTile(asset));
    });
    panel.appendChild(list);
  }

  function renderAssetTile(asset) {
    const s = JI.gameState;
    const price = JI.getCurrentPrice(s, asset.ticker);
    const ch = JI.dailyChangePct(s, asset.ticker);
    const chColor = ch > 0 ? 'text-emerald-600' : ch < 0 ? 'text-red-600' : 'text-slate-500';
    const chSign  = ch > 0 ? '+' : '';

    /* Phase 6: Local Stock supply / Bandar / Goreng */
    const isStock = asset.category === 'stock' && asset.outstandingShares;
    const owned   = isStock ? JI.ownedUnits(s, asset.ticker) : 0;
    const avail   = isStock ? JI.availableSupply(s, asset.ticker) : Infinity;
    const ownPct  = isStock ? JI.ownershipPct(s, asset.ticker) : 0;
    const bandar  = isStock ? JI.isBandar(s, asset.ticker) : false;
    const gorengPending = isStock && (s.pendingNewsEffects || [])
      .some(e => e.ticker === asset.ticker && e.source === 'goreng');

    const card = JI.el('div', { class: `ji-card p-4 ${bandar ? 'bandar-card' : ''}` });

    card.appendChild(JI.el('div', { class: 'flex items-start justify-between mb-2 gap-2' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'font-mono text-xs text-slate-500' }, asset.ticker),
        JI.el('h4', { class: 'font-semibold text-sm leading-tight' }, asset.name),
        asset.sector ? JI.el('p', { class: 'text-[10px] text-slate-400 uppercase tracking-wider' }, asset.sector) : null,
      ]),
      JI.el('span', { class: `font-mono text-xs ${chColor}` },
        ch === 0 ? '—' : `${chSign}${(ch * 100).toFixed(1)}%`),
    ]));

    card.appendChild(JI.el('p', { class: 'font-mono text-lg font-bold mb-2' }, JI.formatPrice(asset.ticker, price)));

    /* Phase 6: ownership / supply meta for stocks */
    if (isStock) {
      const ownPctStr = (ownPct * 100).toFixed(2) + '%';
      const supplyRow = JI.el('div', { class: 'mb-3 text-[11px] font-mono space-y-1' }, [
        JI.el('div', { class: 'flex justify-between text-slate-500' }, [
          JI.el('span', {}, 'Lembar Beredar'),
          JI.el('span', {}, asset.outstandingShares.toLocaleString('id-ID')),
        ]),
        JI.el('div', { class: 'flex justify-between' }, [
          JI.el('span', { class: 'text-slate-500' }, 'Anda Miliki'),
          JI.el('span', { class: bandar ? 'text-amber-600 font-bold' : 'text-slate-700' },
            `${owned.toLocaleString('id-ID')} (${ownPctStr})`),
        ]),
        JI.el('div', { class: 'flex justify-between text-slate-500' }, [
          JI.el('span', {}, 'Sisa Suplai'),
          JI.el('span', {}, avail.toLocaleString('id-ID')),
        ]),
        bandar ? JI.el('div', { class: 'bandar-badge' }, '👑 Pemegang Saham Pengendali (Bandar)') : null,
      ]);
      card.appendChild(supplyRow);
    }

    const qtyInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1', step: '1',
      placeholder: 'Unit', class: 'ji-input',
    });
    if (isStock && Number.isFinite(avail)) {
      qtyInput.setAttribute('max', String(avail));
    }
    const totalEl = JI.el('p', { class: 'text-[11px] text-slate-500 font-mono mt-1' }, '—');
    qtyInput.addEventListener('input', () => {
      const q = parseInt(qtyInput.value, 10) || 0;
      totalEl.textContent = q > 0 ? `Total: ${JI.formatIDR(q * price)}` : '—';
    });

    const buyBtn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full mt-2',
      disabled: (isStock && avail <= 0) ? '' : null,
      onclick: () => {
        const q = parseInt(qtyInput.value, 10) || 0;
        if (q <= 0) { JI.toast('Masukkan jumlah unit dulu.', 'warning'); return; }
        const r = JI.buyAsset(s, asset.ticker, q);
        if (!r.ok) {
          JI.toast(r.error, 'error', 4500);
          alert('⚠ Pembelian Ditolak\n\n' + r.error);
          return;
        }
        const becameBandar = isStock && !bandar && JI.isBandar(s, asset.ticker);
        JI.toast(`Beli ${r.qty} ${r.ticker} @ ${JI.formatIDR(r.price)} dari ${r.bankName}.`, 'success');
        if (becameBandar) {
          setTimeout(() => JI.toast(`👑 Anda kini Bandar di ${asset.ticker}! Buka opsi Goreng Saham.`, 'success', 5000), 350);
        }
        qtyInput.value = '';
        JI.saveState(s);
        renderHeader();
        renderActivePanel();
      },
    }, isStock && avail <= 0 ? 'Suplai Habis' : 'Beli');

    card.appendChild(JI.el('div', { class: 'grid grid-cols-2 gap-2' }, [qtyInput, buyBtn]));
    card.appendChild(totalEl);

    /* Phase 6: Goreng Saham (Bandar perk) */
    if (isStock && bandar) {
      const gorengBtn = JI.el('button', {
        class: 'goreng-btn w-full mt-3',
        disabled: gorengPending ? '' : null,
        onclick: () => {
          if (gorengPending) return;
          const ok = confirm(
            `🔥 GORENG SAHAM ${asset.ticker}\n\n` +
            `Biaya: ${JI.formatIDR(JI.GORENG_COST)} (5 Miliar)\n` +
            `Efek: dijamin +${(JI.GORENG_MULTIPLIER * 100).toFixed(0)}% besok hari.\n\n` +
            `Lanjutkan?`
          );
          if (!ok) return;
          const r = JI.gorengSaham(s, asset.ticker);
          if (!r.ok) { JI.toast(r.error, 'error', 4500); return; }
          JI.toast(`🔥 Goreng ${r.ticker}! ${JI.formatIDR(r.cost)} dari ${r.bankName}. Pump +${(r.multiplier*100).toFixed(0)}% besok.`, 'success', 5000);
          JI.saveState(s);
          renderHeader();
          renderActivePanel();
        },
      }, gorengPending
        ? `🔥 Goreng Tertunda — Pump +${(JI.GORENG_MULTIPLIER * 100).toFixed(0)}% Besok`
        : `🔥 Goreng Saham (Biaya: ${JI.formatIDR(JI.GORENG_COST)})`);
      card.appendChild(gorengBtn);
    }

    return card;
  }

  /* =========================================================================
     Portfolio panel  (Phase 5)  — sells trigger XP toast on profit.
     ========================================================================= */
  function renderPortfolioPanel(panel) {
    const s = JI.gameState;
    if (typeof JI.seedMarket === 'function') JI.seedMarket(s);
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Portfolio'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Posisi aktif Anda. Klik SELL untuk realisasi keuntungan dan dapatkan XP.'),
    ]));

    const portfolio = s.portfolio || [];
    if (portfolio.length === 0) {
      panel.appendChild(JI.el('div', { class: 'ji-card p-8 text-center' }, [
        JI.el('div', { class: 'text-4xl mb-3' }, '💼'),
        JI.el('p', { class: 'text-slate-500' }, 'Belum ada aset. Beli dari tab Market untuk memulai.'),
      ]));
      return;
    }

    /* summary header */
    const totalValue = JI.portfolioMarketValue(s);
    const totalCost  = portfolio.reduce((a, p) => a + p.avgPrice * p.qty, 0);
    const pnl = totalValue - totalCost;
    const pnlColor = pnl >= 0 ? 'text-emerald-600' : 'text-red-600';

    panel.appendChild(JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5' }, [
      statCard({ label: 'Total Value', value: JI.formatIDR(totalValue), accent: 'text-slate-900' }),
      statCard({ label: 'Cost Basis',  value: JI.formatIDR(totalCost), accent: 'text-slate-700' }),
      statCard({
        label: 'Unrealized P/L',
        value: `${pnl >= 0 ? '+' : ''}${JI.formatIDR(pnl)}`,
        accent: pnlColor,
        sub: totalCost > 0 ? `${((pnl / totalCost) * 100).toFixed(2)}%` : '',
      }),
    ]));

    const list = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-3' });
    portfolio.slice().forEach(pos => {
      list.appendChild(renderPositionTile(pos));
    });
    panel.appendChild(list);
  }

  function renderPositionTile(pos) {
    const s = JI.gameState;
    const snap = JI.positionSnapshot(s, pos);
    const asset = JI.getAsset(pos.ticker);
    const pnlColor = snap.pnl >= 0 ? 'text-emerald-600' : 'text-red-600';

    /* Phase 6: ownership for Local Stocks */
    const isStock = asset && asset.category === 'stock' && asset.outstandingShares;
    const ownPct  = isStock ? JI.ownershipPct(s, pos.ticker) : 0;
    const bandar  = isStock ? JI.isBandar(s, pos.ticker) : false;

    const card = JI.el('div', { class: `ji-card p-4 ${bandar ? 'bandar-card' : ''}` });

    card.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-2 mb-3' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'font-mono text-xs text-slate-500' }, pos.ticker),
        JI.el('h4', { class: 'font-semibold' }, asset ? asset.name : pos.ticker),
        isStock ? JI.el('p', {
          class: bandar
            ? 'text-[11px] text-amber-700 font-semibold mt-0.5'
            : 'text-[11px] text-slate-500 mt-0.5',
        }, bandar
          ? `👑 Pemegang Saham Pengendali (Bandar) · ${(ownPct * 100).toFixed(2)}%`
          : `Kepemilikan: ${(ownPct * 100).toFixed(2)}% dari ${asset.outstandingShares.toLocaleString('id-ID')} lembar`
        ) : null,
      ]),
      JI.el('span', { class: `font-mono text-sm ${pnlColor}` },
        `${snap.pnl >= 0 ? '+' : ''}${(snap.pnlPct * 100).toFixed(2)}%`),
    ]));

    card.appendChild(JI.el('div', { class: 'grid grid-cols-2 gap-2 text-sm mb-3' }, [
      kv('Qty', String(pos.qty)),
      kv('Avg Price', JI.formatIDR(pos.avgPrice)),
      kv('Last Price', JI.formatIDR(snap.currentPrice)),
      kv('Value', JI.formatIDR(snap.marketValue)),
      kv('P/L', `${snap.pnl >= 0 ? '+' : ''}${JI.formatIDR(snap.pnl)}`,
        `${pnlColor} font-semibold`),
    ]));

    const qtyInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1', max: String(pos.qty), step: '1',
      placeholder: `Max ${pos.qty}`, class: 'ji-input',
    });

    const sellBtn = JI.el('button', {
      class: 'ji-btn ji-btn-warning w-full',
      onclick: () => {
        const q = parseInt(qtyInput.value, 10) || 0;
        if (q <= 0) { JI.toast('Masukkan jumlah unit untuk dijual.', 'warning'); return; }
        const r = JI.sellAsset(s, pos.ticker, q);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }

        // Phase 5: floating XP toast on profitable sale
        if (r.profit > 0 && r.xpAwarded > 0) {
          JI.showXPToast(r.xpAwarded, { note: `Profit ${JI.formatIDR(r.profit)}` });
        }
        const tone = r.profit > 0 ? 'success' : 'info';
        const label = r.profit > 0 ? 'Profit' : (r.profit < 0 ? 'Loss' : 'Break-even');
        JI.toast(`Sell ${r.qty} ${r.ticker} → ${JI.formatIDR(r.proceeds)} (${label} ${JI.formatIDR(Math.abs(r.profit))})`, tone);

        if (r.leveledUp) {
          setTimeout(() => JI.toast(`🎉 LEVEL UP! Level ${s.companyLevel} · ${JI.getCompanyTitle(s.companyLevel)}`, 'success', 4000), 400);
        }
        JI.saveState(s);
        renderHeader();
        renderActivePanel();
      },
    }, 'SELL');

    card.appendChild(JI.el('div', { class: 'grid grid-cols-2 gap-2' }, [qtyInput, sellBtn]));
    return card;
  }

  /* =========================================================================
     News panel  (Phase 5)
     ========================================================================= */
  function renderNewsPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between gap-3 flex-wrap' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'News'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          'Berita harian per-aset menggerakkan harga di Next Day.'),
      ]),
      JI.el('button', { class: 'ji-btn ji-btn-success', onclick: handleNextDayClick }, '⏭  Next Day'),
    ]));

    /* Today's headlines */
    const todays = (s.todaysNews || []).filter(n => n.day === s.totalDays);
    panel.appendChild(JI.el('h3', { class: 'text-sm uppercase tracking-wider text-slate-500 mb-2' },
      `Headlines Hari ${s.totalDays}`));

    if (todays.length === 0) {
      panel.appendChild(JI.el('div', { class: 'ji-card p-5 text-slate-500 text-sm mb-6' },
        'Belum ada berita hari ini. Klik "Next Day" untuk memunculkan headline pasar.'));
    } else {
      const grid = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-6' });
      todays.forEach(n => grid.appendChild(renderNewsCard(n)));
      panel.appendChild(grid);
    }

    /* History */
    const history = (s.newsHistory || []).filter(n => n.day !== s.totalDays).slice(0, 30);
    panel.appendChild(JI.el('h3', { class: 'text-sm uppercase tracking-wider text-slate-500 mb-2' }, 'History'));
    if (history.length === 0) {
      panel.appendChild(JI.el('div', { class: 'ji-card p-5 text-slate-500 text-sm' },
        'Belum ada arsip berita.'));
    } else {
      const list = JI.el('div', { class: 'space-y-2' });
      history.forEach(n => list.appendChild(renderNewsRow(n)));
      panel.appendChild(list);
    }

    /* Event log */
    if ((s.eventLog || []).length > 0) {
      panel.appendChild(JI.el('h3', { class: 'text-sm uppercase tracking-wider text-slate-500 mt-8 mb-2' },
        'Event Log (Indonesia Banget)'));
      const evList = JI.el('div', { class: 'space-y-2' });
      s.eventLog.slice(0, 20).forEach(e => {
        const cls = e.type === 'positive' ? 'event-row-positive' : 'event-row-negative';
        evList.appendChild(JI.el('div', { class: `ji-card p-3 ${cls}` }, [
          JI.el('div', { class: 'flex items-center justify-between gap-2 flex-wrap' }, [
            JI.el('p', { class: 'font-semibold text-sm' }, e.title),
            JI.el('p', { class: 'text-[11px] font-mono text-slate-500' }, `Hari ${e.day}`),
          ]),
          e.description ? JI.el('p', { class: 'text-xs text-slate-600 mt-1' }, e.description) : null,
        ]));
      });
      panel.appendChild(evList);
    }
  }

  function renderNewsCard(n) {
    const tone = n.sentiment === 'bullish' ? 'news-bullish' : 'news-bearish';
    const badge = n.sentiment === 'bullish' ? 'BULLISH ▲' : 'BEARISH ▼';
    return JI.el('div', { class: `ji-card p-4 ${tone}` }, [
      JI.el('div', { class: 'flex items-center justify-between gap-2 mb-2' }, [
        JI.el('span', { class: 'font-mono text-xs text-slate-500' }, `${n.ticker} · ${n.category.toUpperCase()}`),
        JI.el('span', { class: `news-badge ${n.sentiment}` }, badge),
      ]),
      JI.el('h4', { class: 'font-semibold leading-snug' }, n.headline),
      n.body ? JI.el('p', { class: 'text-xs text-slate-500 mt-1' }, n.body) : null,
    ]);
  }

  function renderNewsRow(n) {
    const tone = n.sentiment === 'bullish' ? 'text-emerald-600' : 'text-red-600';
    return JI.el('div', { class: 'ji-card p-3 flex items-center justify-between gap-3 flex-wrap' }, [
      JI.el('div', { class: 'min-w-0 flex-1' }, [
        JI.el('p', { class: 'text-xs font-mono text-slate-500' }, `Hari ${n.day} · ${n.ticker}`),
        JI.el('p', { class: 'text-sm' }, n.headline),
      ]),
      JI.el('span', { class: `font-mono text-xs ${tone}` },
        n.sentiment === 'bullish' ? '▲' : '▼'),
    ]);
  }

  /* =========================================================================
     Aset Fisik panel  (Phase 6 — Mega Infrastruktur "Sektor Riil")
     ========================================================================= */
  function renderAsetPanel(panel) {
    const s = JI.gameState;
    if (typeof JI.ensureInfraState === 'function') JI.ensureInfraState(s);
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Aset Fisik'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Sektor Riil — parkirkan kekayaan Anda dalam infrastruktur kelas miliarder.'),
    ]));

    /* Summary card */
    const totalValue  = JI.totalInfrastructureValue(s);
    const dailyIncome = JI.totalInfrastructureDailyIncome(s);
    panel.appendChild(JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6' }, [
      statCard({
        label: 'Nilai Buku Mega Infrastruktur',
        value: JI.formatIDR(totalValue),
        sub: 'Termasuk Total Net Worth & basis CoreTax',
        accent: 'text-indigo-700',
      }),
      statCard({
        label: 'Penghasilan Pasif / Hari',
        value: JI.formatIDR(dailyIncome),
        sub: dailyIncome > 0 ? 'Otomatis disetor saat Next Day' : 'Belum ada infrastruktur dimiliki',
        accent: 'text-emerald-700',
      }),
    ]));

    /* Mega Infrastruktur header */
    panel.appendChild(JI.el('div', { class: 'flex items-center justify-between mb-3 flex-wrap gap-2' }, [
      JI.el('h3', { class: 'text-lg font-bold' }, '🏛️ Mega Infrastruktur'),
      JI.el('span', { class: 'text-[11px] uppercase tracking-widest text-amber-700 font-semibold' },
        '💎 Untuk Miliarder Saja'),
    ]));

    panel.appendChild(JI.el('p', { class: 'text-sm text-slate-500 mb-4 max-w-2xl' },
      'Investasi raksasa skala 100 Miliar — 25 Triliun Rupiah. Setiap aset menghasilkan ' +
      'arus kas pasif harian yang stabil, langsung disetor ke rekening terkaya Anda setiap "Next Day". ' +
      'Nilai bukunya turut menghitung Total Net Worth dan CoreTax.'));

    const grid = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' });
    (JI.INFRASTRUCTURE_DEFS || []).forEach(def => {
      grid.appendChild(renderInfraTile(def));
    });
    panel.appendChild(grid);

    /* Other physical asset placeholders kept for context */
    panel.appendChild(JI.el('div', { class: 'mt-8 ji-card p-5 text-slate-500 text-sm' }, [
      JI.el('p', { class: 'font-semibold text-slate-700 mb-1' }, '🏠 Properti, Mobil & Kantor'),
      JI.el('p', {}, 'Akan tersedia di update berikutnya.'),
    ]));
  }

  function renderInfraTile(def) {
    const s = JI.gameState;
    const qty = JI.infraQty(s, def.id);
    const owned = qty > 0;

    const card = JI.el('div', {
      class: `ji-card p-5 infra-card ${owned ? 'infra-owned' : ''}`,
    });

    card.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 mb-3' }, [
      JI.el('div', { class: 'flex items-center gap-3' }, [
        JI.el('div', { class: 'infra-icon' }, def.icon),
        JI.el('div', {}, [
          JI.el('h4', { class: 'font-bold text-base leading-tight' }, def.name),
          JI.el('p', { class: 'text-xs text-slate-500 mt-0.5' }, def.tagline),
        ]),
      ]),
      owned ? JI.el('span', { class: 'infra-qty-badge' }, `×${qty}`) : null,
    ]));

    card.appendChild(JI.el('div', { class: 'grid grid-cols-2 gap-3 mb-4' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-[11px] uppercase tracking-wider text-slate-500' }, 'Harga'),
        JI.el('p', { class: 'font-mono text-sm font-bold text-slate-900' }, JI.formatIDR(def.cost)),
        JI.el('p', { class: 'text-[10px] text-slate-400' }, JI.formatIDRCompact(def.cost)),
      ]),
      JI.el('div', {}, [
        JI.el('p', { class: 'text-[11px] uppercase tracking-wider text-slate-500' }, 'Income / Hari'),
        JI.el('p', { class: 'font-mono text-sm font-bold text-emerald-700' }, JI.formatIDR(def.dailyIncome)),
        JI.el('p', { class: 'text-[10px] text-emerald-600' }, JI.formatIDRCompact(def.dailyIncome)),
      ]),
    ]));

    if (owned) {
      const totalDaily = qty * def.dailyIncome;
      card.appendChild(JI.el('div', { class: 'rounded-lg bg-emerald-50 border border-emerald-200 p-3 mb-3 text-xs' }, [
        JI.el('p', { class: 'text-emerald-800' },
          `Anda memiliki ${qty} unit · arus kas ${JI.formatIDR(totalDaily)} / hari`),
      ]));
    }

    const buyBtn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full',
      onclick: () => {
        if (!confirm(
          `Beli ${def.name}?\n\n` +
          `Harga: ${JI.formatIDR(def.cost)}\n` +
          `Pendapatan harian: ${JI.formatIDR(def.dailyIncome)}\n\n` +
          `Pembayaran akan dipotong dari rekening Anda yang paling kaya.`
        )) return;
        const r = JI.buyInfrastructure(s, def.id);
        if (!r.ok) { JI.toast(r.error, 'error', 4500); return; }
        JI.toast(`✓ ${r.name} dibeli dari ${r.bankName}. Income +${JI.formatIDR(r.dailyIncome)}/hari.`, 'success', 4500);
        JI.saveState(s);
        renderHeader();
        renderActivePanel();
      },
    }, owned ? `Beli Lagi (+1 unit)` : 'Beli Sekarang');
    card.appendChild(buyBtn);

    return card;
  }


  function renderAll() {
    renderHeader();
    highlightActiveTab();
    renderActivePanel();
    // Surface persisted pendingEvent (e.g. browser was closed mid-modal).
    if (JI.gameState && JI.gameState.pendingEvent) {
      JI.showEventModal(JI.gameState.pendingEvent, () => {
        JI.gameState.pendingEvent = null;
        JI.saveState(JI.gameState);
        renderHeader();
        renderActivePanel();
      });
    }
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    TABS,
    buildTabs,
    bindGlobalEvents,
    renderHeader,
    renderActivePanel,
    renderAll,
    switchTab,
    handleNextDayClick,
  });
})(window);
