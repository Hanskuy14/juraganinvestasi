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
      market:    () => renderPlaceholder(panel, 'Market', 'Saham, kripto & komoditas hadir di Phase 2.'),
      portfolio: () => renderPlaceholder(panel, 'Portfolio', 'Pelacakan posisi & PnL hadir di Phase 2.'),
      news:      () => renderPlaceholder(panel, 'News', 'Feed berita ekonomi hadir di Phase 2.'),
      coretax:   () => renderPlaceholder(panel, 'CoreTax DJP', 'Pelaporan SPT & PPh hadir di Phase 3.'),
      hrd:       () => renderPlaceholder(panel, 'HRD', 'Rekrutmen karyawan hadir di Phase 3.'),
      aset:      () => renderPlaceholder(panel, 'Aset Fisik', 'Properti, mobil & kantor hadir di Phase 3.'),
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

  /* ---------- Entry: render whole UI ---------- */
  function renderAll() {
    renderHeader();
    highlightActiveTab();
    renderActivePanel();
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
  });
})(window);
