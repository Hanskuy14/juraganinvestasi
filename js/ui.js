/* =========================================================================
   ui.js — Tab system, header, and panel renderers for all phases.
   Phase 4 surfaces: Next Day FAB, IPO button, VC tab, Deposito section,
   Mutasi Rekening section, minimal Aset office capacity.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Tab definitions ---------- */
  const TABS = [
    { id: 'home',      label: 'Home',         icon: '🏠', mobilePrimary: true  },
    { id: 'banking',   label: 'Banking',      icon: '🏦', mobilePrimary: true  },
    { id: 'vc',        label: 'Venture Cap.', icon: '🚀', mobilePrimary: true  },
    { id: 'aset',      label: 'Aset Fisik',   icon: '🏢', mobilePrimary: true  },
    { id: 'market',    label: 'Market',       icon: '📈', mobilePrimary: false },
    { id: 'portfolio', label: 'Portfolio',    icon: '💼', mobilePrimary: false },
    { id: 'news',      label: 'News',         icon: '📰', mobilePrimary: false },
    { id: 'coretax',   label: 'CoreTax DJP',  icon: '🧾', mobilePrimary: false },
    { id: 'hrd',       label: 'HRD',          icon: '👥', mobilePrimary: false },
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

    // Re-render the floating Next-Day FAB so its label updates with the date.
    renderNextDayFAB();
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
      const dBtn = JI.el('button', {
        class: 'desktop-tab',
        dataset: { tabid: tab.id },
        onclick: () => switchTab(tab.id),
      }, [JI.el('span', { class: 'text-base leading-none' }, tab.icon), tab.label]);
      desktop.appendChild(dBtn);

      const drBtn = JI.el('button', {
        class: 'mdrawer-btn',
        dataset: { tabid: tab.id },
        onclick: () => { switchTab(tab.id); closeMobileMenu(); },
      }, [JI.el('span', { class: 'text-lg w-6 text-center' }, tab.icon), tab.label]);
      drawer.appendChild(drBtn);
    });

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

  function openMobileMenu()  { document.getElementById('mobile-menu')?.classList.remove('hidden'); }
  function closeMobileMenu() { document.getElementById('mobile-menu')?.classList.add('hidden'); }

  function bindGlobalEvents() {
    document.getElementById('mobile-menu-btn')?.addEventListener('click', openMobileMenu);
    JI.$$('[data-close-menu]').forEach(b => b.addEventListener('click', closeMobileMenu));
  }

  /* =========================================================================
     Floating "Next Day" button (always visible)
     ========================================================================= */
  function renderNextDayFAB() {
    let fab = document.getElementById('next-day-fab');
    if (!fab) {
      fab = JI.el('button', {
        id: 'next-day-fab',
        class: 'next-day-fab',
        onclick: () => JI.nextDay(),
      });
      document.body.appendChild(fab);
    }
    fab.innerHTML = '';
    fab.appendChild(JI.el('span', { class: 'nd-icon' }, '⏭'));
    fab.appendChild(JI.el('span', { class: 'nd-label' }, [
      JI.el('span', { class: 'block text-[10px] uppercase opacity-80' }, 'Next Day'),
      JI.el('span', { class: 'block font-mono text-xs' },
        JI.formatCalendar(JI.gameState.totalDays + 1)),
    ]));
  }

  /* =========================================================================
     Panel router
     ========================================================================= */
  function renderActivePanel() {
    const id = JI.gameState.activeTab;
    const panel = JI.$(`[data-tab-panel="${id}"]`);
    if (!panel) return;

    const renderers = {
      home:      renderHomePanel,
      banking:   renderBankingPanel,
      vc:        renderVCPanel,
      aset:      renderAsetPanel,
      market:    renderMarketPanel,
      portfolio: () => renderPlaceholder(panel, 'Portfolio', 'Pelacakan posisi & PnL hadir di Phase 2.'),
      news:      renderNewsPanel,
      coretax:   () => renderPlaceholder(panel, 'CoreTax DJP', 'Pelaporan SPT & PPh hadir di Phase 3.'),
      hrd:       () => renderPlaceholder(panel, 'HRD', 'Rekrutmen karyawan hadir di Phase 3.'),
    };
    (renderers[id] || (() => {}))(panel);
  }

  function renderPlaceholder(panel, title, subtitle) {
    panel.innerHTML = '';
    panel.appendChild(JI.el('div', { class: 'ji-card p-8 text-center max-w-2xl mx-auto' }, [
      JI.el('div', { class: 'text-5xl mb-4' }, '🚧'),
      JI.el('h2', { class: 'text-xl sm:text-2xl font-bold mb-2' }, title),
      JI.el('p', { class: 'text-slate-500' }, subtitle),
    ]));
  }

  /* =========================================================================
     HOME panel
     ========================================================================= */
  function renderHomePanel(panel) {
    const s = JI.gameState;
    JI.recomputeNetWorth(s);
    const cal = JI.getCalendar(s.totalDays);
    const xpNeed = JI.xpToNext(s.companyLevel);
    const xpPct  = JI.clamp(Math.round((s.companyXP / xpNeed) * 100), 0, 100);
    const title  = JI.getDisplayTitle(s);
    const isPublic = !!(s.ipo && s.ipo.isPublic);

    panel.innerHTML = '';

    // Hero / title card
    const hero = JI.el('div', {
      class: 'ji-card p-6 sm:p-8 mb-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative overflow-hidden'
    });
    hero.appendChild(JI.el('div', {
      class: 'absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none'
    }));
    hero.appendChild(JI.el('p', { class: 'text-xs uppercase tracking-[0.3em] text-emerald-400 mb-2' },
      isPublic ? 'Public Listed Company' : 'Welcome back, Juragan'));
    hero.appendChild(JI.el('h2', { class: 'text-2xl sm:text-4xl font-extrabold tracking-tight' },
      'Juragan Investasi: Capitalist Tycoon'));
    hero.appendChild(JI.el('p', { class: 'text-slate-300 mt-2 max-w-xl text-sm sm:text-base' },
      isPublic
        ? 'Anda telah melantai. Wajib bayar dividen 5% kepada publik setiap 12 bulan.'
        : 'Bangun imperium investasi Anda di Indonesia. Klik "Next Day" untuk maju ke hari berikutnya.'));
    if (isPublic) {
      hero.appendChild(JI.el('span', { class: 'ipo-badge mt-4 inline-block' },
        '◉ IDX LISTED'));
    }
    panel.appendChild(hero);

    // Stat grid
    const grid = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6' });
    grid.appendChild(statCard({
      label: 'Total Net Worth',
      value: JI.formatIDR(s.totalNetWorth),
      sub: 'Bank + portofolio + aset − utang',
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

    // IPO panel
    panel.appendChild(renderIPOCard(s));

    // Quick links
    const quick = JI.el('div', { class: 'grid grid-cols-2 sm:grid-cols-4 gap-3' });
    [
      { id: 'banking', label: 'Buka Banking', icon: '🏦' },
      { id: 'vc',      label: 'Venture Cap.',  icon: '🚀' },
      { id: 'market',  label: 'Lihat Market',  icon: '📈' },
      { id: 'aset',    label: 'Aset Fisik',    icon: '🏢' },
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

  function renderIPOCard(s) {
    const eligible = JI.isIPOEligible(s);
    const isPublic = !!(s.ipo && s.ipo.isPublic);
    const reason   = JI.ipoEligibilityReason(s);

    const card = JI.el('div', { class: 'ji-card p-6 mb-6 ipo-card' });
    card.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 flex-wrap mb-3' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-xs uppercase tracking-wider text-slate-500' }, 'Ultimate Goal'),
        JI.el('h3', { class: 'text-xl font-bold mt-1' }, 'Initial Public Offering (IPO)'),
        JI.el('p', { class: 'text-xs text-slate-500 mt-1' },
          `Syarat: Level ${JI.IPO_LEVEL_REQ}+ dan Net Worth ${JI.formatIDR(JI.IPO_NETWORTH_REQ)}`),
      ]),
      isPublic
        ? JI.el('span', { class: 'ipo-badge' }, '◉ PUBLIC LISTED')
        : null,
    ]));

    if (isPublic) {
      const ipoDay = s.ipo.ipoDay;
      const sinceLast = s.totalDays - (s.ipo.lastDividendDay || ipoDay);
      const daysToDiv = Math.max(0, JI.IPO_DIVIDEND_INTERVAL - sinceLast);
      card.appendChild(JI.el('div', { class: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm' }, [
        JI.el('p', { class: 'font-semibold text-emerald-700 mb-1' }, '✓ Sudah Go Public'),
        JI.el('p', { class: 'text-slate-700' },
          `IPO pada ${JI.formatCalendar(ipoDay)}. Dividen berikutnya dalam ${daysToDiv} hari.`),
      ]));
    } else {
      const btn = JI.el('button', {
        class: 'ji-btn ji-btn-success w-full sm:w-auto',
        disabled: eligible ? null : '',
        onclick: () => {
          const r = JI.goPublic(JI.gameState);
          if (!r.ok) { JI.toast(r.error, 'error'); return; }
          JI.toast(`🎉 Go Public! +${JI.formatIDR(r.injected)} masuk rekening.`, 'success', 6000);
          JI.saveState(JI.gameState);
          JI.renderAll();
        },
      }, [JI.el('span', {}, '🔔'), 'Go Public (IPO)']);
      if (!eligible) btn.setAttribute('disabled', 'disabled');

      card.appendChild(JI.el('p', {
        class: `text-xs ${eligible ? 'text-emerald-600' : 'text-slate-500'} mb-3`
      }, eligible ? 'Memenuhi syarat IPO. Klik tombol di bawah.' : reason));
      card.appendChild(btn);
    }
    return card;
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
     BANKING panel
     ========================================================================= */
  function renderBankingPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Banking'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Rekening, kartu kredit, KTA, deposito berjangka, dan mutasi rekening lengkap.'),
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
    body.appendChild(renderTransferSection(bank));
    body.appendChild(renderCreditCardSection(bank, offer));
    body.appendChild(renderLoanSection(bank, maxLoan));
    body.appendChild(renderDepositoSection(bank));
    body.appendChild(renderHistorySection(bank));
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
      type: 'number', inputmode: 'numeric', min: '1', step: '1',
      placeholder: 'Nominal (Rp)', class: 'ji-input',
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
        ? Math.round((bank.creditCard.used / bank.creditCard.limit) * 100) : 0;
      const available = bank.creditCard.limit - bank.creditCard.used;

      wrap.appendChild(JI.el('div', { class: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4' }, [
        JI.el('div', { class: 'flex items-center justify-between gap-2 flex-wrap' }, [
          JI.el('span', { class: 'text-emerald-700 font-semibold text-sm' }, '✓ Kartu Kredit Aktif'),
          JI.el('span', { class: 'text-xs text-emerald-700 font-mono' }, `${usedPct}% terpakai`),
        ]),
        JI.el('div', { class: 'mt-3 grid grid-cols-2 gap-3 text-sm' }, [
          kv('Limit',    JI.formatIDR(bank.creditCard.limit)),
          kv('Terpakai', JI.formatIDR(bank.creditCard.used)),
          kv('Tersedia', JI.formatIDR(available), 'text-emerald-700 font-semibold'),
          kv('Status',   'Approved', 'text-emerald-700 font-semibold'),
        ]),
      ]));
      return wrap;
    }

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
        JI.saveState(s); renderHeader();
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
      const totalRepay = Math.round(bank.loan.principal * (1 + JI.LOAN_INTEREST_FLAT));
      const paid = totalRepay - bank.loan.remaining;
      const pct = totalRepay > 0
        ? JI.clamp(Math.round((paid / totalRepay) * 100), 0, 100) : 0;

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

    const input = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1', step: '1',
      placeholder: 'Nominal pokok (Rp)', class: 'ji-input',
    });
    const quoteEl = JI.el('div', { class: 'text-xs text-slate-500 mt-2 font-mono' },
      `Maks. pinjaman: ${JI.formatIDR(maxLoan)}`);
    function updateQuote() {
      const p = JI.parseIDRInput(input.value);
      if (!p) { quoteEl.textContent = `Maks. pinjaman: ${JI.formatIDR(maxLoan)}`; return; }
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
        JI.saveState(s); renderHeader();
        renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
      },
    }, 'Ajukan KTA');
    if (maxLoan <= 0) btn.setAttribute('disabled', 'disabled');

    wrap.appendChild(labelled('Nominal Pokok', input));
    wrap.appendChild(quoteEl);
    wrap.appendChild(btn);
    return wrap;
  }

  /* ---------- Deposito Section (Phase 4) ---------- */
  function renderDepositoSection(bank) {
    const s = JI.gameState;
    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Deposito Berjangka',
      'Kunci dana untuk bunga jaminan saat jatuh tempo.'));

    // Active deposito list
    if (bank.depositos && bank.depositos.length > 0) {
      const list = JI.el('div', { class: 'space-y-2 mb-3' });
      bank.depositos.forEach(d => {
        const daysLeft = Math.max(0, d.maturityDay - s.totalDays);
        const totalDays = d.days;
        const elapsed = totalDays - daysLeft;
        const pct = JI.clamp(Math.round((elapsed / totalDays) * 100), 0, 100);
        list.appendChild(JI.el('div', { class: 'rounded-lg border border-blue-200 bg-blue-50 p-3' }, [
          JI.el('div', { class: 'flex items-center justify-between flex-wrap gap-2' }, [
            JI.el('span', { class: 'font-semibold text-sm text-blue-800' },
              `${JI.formatIDR(d.principal)} · ${d.months} bln · ${(d.rate*100).toFixed(0)}%`),
            JI.el('span', { class: 'text-xs font-mono text-blue-800' },
              `${daysLeft} hari lagi`),
          ]),
          JI.el('p', { class: 'text-[11px] text-blue-700 mt-1' },
            `Jatuh tempo ${JI.formatCalendar(d.maturityDay)} → ${JI.formatIDR(d.payout)}`),
          JI.el('div', { class: 'xp-bar mt-2' }, [
            JI.el('span', { style: `width:${pct}%; background:linear-gradient(90deg,#3b82f6,#1d4ed8)` }),
          ]),
        ]));
      });
      wrap.appendChild(list);
    }

    // Open new deposito form
    const amtInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1000000', step: '1',
      placeholder: 'Nominal deposito (Rp)', class: 'ji-input',
    });
    const tenorSelect = JI.el('select', { class: 'ji-input ji-select' });
    JI.DEPOSITO_TERMS.forEach(t => {
      tenorSelect.appendChild(JI.el('option', { value: t.months },
        `${t.label} — ${(t.rate*100).toFixed(0)}% bunga`));
    });

    const previewEl = JI.el('p', { class: 'text-xs text-slate-500 font-mono mt-2' },
      'Bunga estimasi muncul di sini.');
    function updatePreview() {
      const amt = JI.parseIDRInput(amtInput.value);
      const term = JI.DEPOSITO_TERMS.find(t => t.months === Number(tenorSelect.value));
      if (!amt || !term) {
        previewEl.textContent = 'Bunga estimasi muncul di sini.';
        return;
      }
      const interest = Math.round(amt * term.rate);
      previewEl.textContent =
        `+${JI.formatIDR(interest)} bunga · payout ${JI.formatIDR(amt + interest)} di hari ${s.totalDays + term.days}.`;
    }
    amtInput.addEventListener('input', updatePreview);
    tenorSelect.addEventListener('change', updatePreview);

    const openBtn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full mt-3',
      onclick: () => {
        const amt = JI.parseIDRInput(amtInput.value);
        const r = JI.openDeposito(s, bank.id, amt, Number(tenorSelect.value));
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(`Deposito ${r.deposito.months} bulan dibuka di ${bank.shortName}.`);
        amtInput.value = '';
        JI.saveState(s); renderHeader();
        renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
      },
    }, 'Buka Deposito');

    wrap.appendChild(JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-2' }, [
      labelled('Nominal', amtInput),
      labelled('Tenor', tenorSelect),
    ]));
    wrap.appendChild(previewEl);
    wrap.appendChild(openBtn);
    return wrap;
  }

  /* ---------- Mutasi Rekening (history audit) ---------- */
  function renderHistorySection(bank) {
    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Mutasi Rekening',
      'Riwayat transaksi terbaru di rekening ini.'));

    if (!bank.history || bank.history.length === 0) {
      wrap.appendChild(JI.el('p', { class: 'text-xs text-slate-400 italic' },
        'Belum ada transaksi.'));
      return wrap;
    }

    const list = JI.el('div', { class: 'mutasi-list' });
    // Newest first
    const recent = [...bank.history].reverse().slice(0, 30);
    recent.forEach(r => {
      const row = JI.el('div', { class: `mutasi-row ${r.type === 'IN' ? 'in' : 'out'}` });
      row.appendChild(JI.el('div', { class: 'mutasi-row-main' }, [
        JI.el('span', { class: 'mutasi-type' }, r.type),
        JI.el('div', { class: 'mutasi-desc' }, [
          JI.el('p', { class: 'text-sm font-medium leading-tight' }, r.description),
          JI.el('p', { class: 'text-[11px] text-slate-500 font-mono' }, r.date),
        ]),
      ]));
      row.appendChild(JI.el('span', { class: 'mutasi-amount' },
        (r.type === 'IN' ? '+ ' : '− ') + JI.formatIDR(r.amount)));
      list.appendChild(row);
    });
    wrap.appendChild(list);

    if (bank.history.length > 30) {
      wrap.appendChild(JI.el('p', { class: 'text-[11px] text-slate-400 mt-2 text-center' },
        `Menampilkan 30 dari ${bank.history.length} transaksi.`));
    }
    return wrap;
  }

  /* =========================================================================
     VC panel
     ========================================================================= */
  function renderVCPanel(panel) {
    const s = JI.gameState;
    JI.maybeRotateVC(s);
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between flex-wrap gap-3' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Venture Capital'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          'Suntik modal ke startup lokal. 3 startup aktif, dirotasi setiap 30 hari.'),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-[11px] uppercase tracking-wider text-slate-500' }, 'Rotasi Berikutnya'),
        JI.el('p', { class: 'font-mono text-sm' },
          `${Math.max(0, JI.VC_ROTATION_DAYS - (s.totalDays - s.vc.lastRotationDay))} hari`),
      ]),
    ]));

    // 3 active startups
    const grid = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6' });
    s.vc.activeStartups.forEach(st => grid.appendChild(renderStartupCard(st)));
    panel.appendChild(grid);

    // Active investments
    panel.appendChild(renderActiveInvestments(s));

    // Outcome history
    panel.appendChild(renderVCHistory(s));
  }

  function renderStartupCard(st) {
    const s = JI.gameState;
    const card = JI.el('div', { class: 'ji-card p-5 vc-card flex flex-col gap-3' });

    card.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-2' }, [
      JI.el('div', {}, [
        JI.el('div', { class: 'text-3xl mb-1' }, st.icon),
        JI.el('h3', { class: 'font-bold text-lg leading-tight' }, st.name),
        JI.el('p', { class: 'text-[11px] uppercase tracking-wider text-slate-500' }, st.sector),
      ]),
      JI.el('span', { class: 'text-[10px] text-slate-400 font-mono' },
        `Seek ${JI.formatIDRCompact(st.seekingAmount)}`),
    ]));
    card.appendChild(JI.el('p', { class: 'text-xs text-slate-600 leading-snug' }, st.pitch));

    const bankSelect = JI.el('select', { class: 'ji-input ji-select' });
    s.banks.forEach(b => {
      bankSelect.appendChild(JI.el('option', { value: b.id },
        `${b.shortName} — ${JI.formatIDR(b.balance)}`));
    });

    const amtInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1000000', step: '1',
      placeholder: 'Nominal (Rp)', class: 'ji-input',
    });

    const investBtn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full',
      onclick: () => {
        const amt = JI.parseIDRInput(amtInput.value);
        const r = JI.investInStartup(s, st.id, amt, bankSelect.value);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(`Berinvestasi ${JI.formatIDR(amt)} di ${st.name} (lock ${r.investment.lockDays} hari).`,
          'success');
        amtInput.value = '';
        JI.saveState(s); renderHeader();
        renderVCPanel(JI.$('[data-tab-panel="vc"]'));
      },
    }, 'Investasi');

    card.appendChild(labelled('Sumber Dana', bankSelect));
    card.appendChild(labelled('Nominal Investasi', amtInput));
    card.appendChild(JI.el('p', { class: 'text-[11px] text-slate-400 font-mono' },
      `Lock random ${JI.VC_LOCK_MIN_DAYS}–${JI.VC_LOCK_MAX_DAYS} hari · Outcome RNG`));
    card.appendChild(investBtn);
    return card;
  }

  function renderActiveInvestments(s) {
    const wrap = JI.el('div', { class: 'ji-card p-5 mb-6' });
    wrap.appendChild(sectionTitle(`Investasi Aktif (${s.vc.investments.length})`,
      'Posisi terbuka. Akan dijatuh-tempokan otomatis.'));

    if (s.vc.investments.length === 0) {
      wrap.appendChild(JI.el('p', { class: 'text-xs text-slate-400 italic' },
        'Belum ada investasi aktif.'));
      return wrap;
    }

    const list = JI.el('div', { class: 'space-y-2' });
    s.vc.investments.forEach(inv => {
      const daysLeft = Math.max(0, inv.maturityDay - s.totalDays);
      const elapsed = inv.lockDays - daysLeft;
      const pct = JI.clamp(Math.round((elapsed / inv.lockDays) * 100), 0, 100);
      list.appendChild(JI.el('div', { class: 'rounded-lg border border-violet-200 bg-violet-50 p-3' }, [
        JI.el('div', { class: 'flex items-center justify-between flex-wrap gap-2' }, [
          JI.el('span', { class: 'font-semibold text-sm text-violet-900' },
            `${inv.icon} ${inv.startupName} · ${JI.formatIDR(inv.amount)}`),
          JI.el('span', { class: 'text-xs font-mono text-violet-900' },
            `${daysLeft} hari lagi`),
        ]),
        JI.el('p', { class: 'text-[11px] text-violet-700 mt-1 font-mono' },
          `Open ${JI.formatCalendar(inv.openedDay)} → Maturity ${JI.formatCalendar(inv.maturityDay)}`),
        JI.el('div', { class: 'xp-bar mt-2' }, [
          JI.el('span', { style: `width:${pct}%; background:linear-gradient(90deg,#8b5cf6,#6d28d9)` }),
        ]),
      ]));
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderVCHistory(s) {
    const wrap = JI.el('div', { class: 'ji-card p-5' });
    wrap.appendChild(sectionTitle('Riwayat Hasil Investasi',
      'Setiap startup yang sudah jatuh tempo.'));

    if (!s.vc.maturedHistory || s.vc.maturedHistory.length === 0) {
      wrap.appendChild(JI.el('p', { class: 'text-xs text-slate-400 italic' },
        'Belum ada hasil. Tunggu maturity investasi pertama Anda.'));
      return wrap;
    }

    const list = JI.el('div', { class: 'space-y-2' });
    s.vc.maturedHistory.slice(0, 30).forEach(r => {
      const cls = r.outcome === 'Bankrupt'      ? 'vc-out-bad'
                : r.outcome === 'Acquisition'   ? 'vc-out-good'
                : 'vc-out-best';
      list.appendChild(JI.el('div', { class: `vc-history-row ${cls}` }, [
        JI.el('div', {}, [
          JI.el('p', { class: 'text-sm font-semibold' },
            `${r.icon || ''} ${r.startupName} — ${r.outcome}`),
          JI.el('p', { class: 'text-[11px] font-mono opacity-80' },
            `Open Hari ${r.openedDay} → Mature ${JI.formatCalendar(r.day)}`),
        ]),
        JI.el('div', { class: 'text-right' }, [
          JI.el('p', { class: 'font-mono text-sm font-bold' },
            `${r.multiplier}x → ${JI.formatIDR(r.payout)}`),
          JI.el('p', { class: 'text-[11px] opacity-80 font-mono' },
            `dari ${JI.formatIDR(r.originalAmount)}`),
        ]),
      ]));
    });
    wrap.appendChild(list);
    return wrap;
  }

  /* =========================================================================
     ASET FISIK panel — minimal: buy office capacity (rental income source)
     ========================================================================= */
  function renderAsetPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Aset Fisik'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Properti komersial Anda. Slot kantor kosong menghasilkan sewa pasif setiap 30 hari.'),
    ]));

    const cap = s.physicalAssets.officeCapacity;
    const used = (s.hiredEmployees || []).length;
    const unused = Math.max(0, cap - used);
    const rentMonthly = unused * JI.PASSIVE_RENT_PER_SLOT;

    const summary = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5' });
    summary.appendChild(statCard({
      label: 'Kapasitas Kantor', value: cap.toString(),
      sub: 'Total slot karyawan', accent: 'text-slate-900', mono: true,
    }));
    summary.appendChild(statCard({
      label: 'Slot Kosong', value: unused.toString(),
      sub: 'Disewakan otomatis', accent: 'text-emerald-600', mono: true,
    }));
    summary.appendChild(statCard({
      label: 'Pendapatan Pasif', value: JI.formatIDR(rentMonthly) + '/bln',
      sub: `${JI.formatIDR(JI.PASSIVE_RENT_PER_SLOT)} per slot`,
      accent: 'text-blue-600',
    }));
    panel.appendChild(summary);

    // Buy office space
    const card = JI.el('div', { class: 'ji-card p-5 mb-5' });
    card.appendChild(sectionTitle('Beli / Sewa Ruangan Kantor',
      `Tambah kapasitas: Rp 25.000.000 per slot.`));

    const slotInput = JI.el('input', {
      type: 'number', min: '1', step: '1', value: '1',
      placeholder: 'Jumlah slot', class: 'ji-input',
    });
    const COST_PER_SLOT = 25_000_000;

    const summaryEl = JI.el('p', { class: 'text-xs font-mono text-slate-500 mt-2' },
      `Total: ${JI.formatIDR(COST_PER_SLOT)}`);
    slotInput.addEventListener('input', () => {
      const n = Math.max(1, parseInt(slotInput.value, 10) || 1);
      summaryEl.textContent = `Total: ${JI.formatIDR(n * COST_PER_SLOT)}`;
    });

    const bankSelect = JI.el('select', { class: 'ji-input ji-select' });
    s.banks.forEach(b => {
      bankSelect.appendChild(JI.el('option', { value: b.id },
        `${b.shortName} — ${JI.formatIDR(b.balance)}`));
    });

    const buyBtn = JI.el('button', {
      class: 'ji-btn ji-btn-success w-full mt-3',
      onclick: () => {
        const n = Math.max(1, parseInt(slotInput.value, 10) || 1);
        const cost = n * COST_PER_SLOT;
        const r = JI.bankDebit(s, bankSelect.value, cost,
          `Beli ${n} slot kantor`);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        s.physicalAssets.officeCapacity += n;
        // Treat as a property with valuation = purchase cost.
        s.physicalAssets.properties.push({
          id: 'prop_' + Date.now(),
          name: `Ruang Kantor (${n} slot)`,
          slots: n,
          value: cost,
          purchasedDay: s.totalDays,
        });
        JI.awardXP(s, 100 * n);
        JI.recomputeNetWorth(s);
        JI.saveState(s);
        JI.toast(`+${n} slot kantor dibeli.`, 'success');
        renderHeader();
        renderAsetPanel(JI.$('[data-tab-panel="aset"]'));
      },
    }, 'Beli Slot Kantor');

    card.appendChild(JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-2' }, [
      labelled('Jumlah Slot', slotInput),
      labelled('Sumber Dana', bankSelect),
    ]));
    card.appendChild(summaryEl);
    card.appendChild(buyBtn);
    panel.appendChild(card);

    // Properties owned
    if (s.physicalAssets.properties.length > 0) {
      const list = JI.el('div', { class: 'ji-card p-5' });
      list.appendChild(sectionTitle('Properti Dimiliki',
        `${s.physicalAssets.properties.length} properti tercatat.`));
      const ul = JI.el('div', { class: 'space-y-2' });
      s.physicalAssets.properties.forEach(p => {
        ul.appendChild(JI.el('div', { class: 'flex items-center justify-between gap-2 p-3 rounded-lg bg-slate-50' }, [
          JI.el('div', {}, [
            JI.el('p', { class: 'font-semibold text-sm' }, p.name),
            JI.el('p', { class: 'text-[11px] text-slate-500 font-mono' },
              `Dibeli ${JI.formatCalendar(p.purchasedDay)}`),
          ]),
          JI.el('p', { class: 'font-mono text-sm font-semibold' }, JI.formatIDR(p.value)),
        ]));
      });
      list.appendChild(ul);
      panel.appendChild(list);
    }
  }

  /* =========================================================================
     Minimal MARKET panel — read-only watchlist (Phase 4 ancillary)
     ========================================================================= */
  function renderMarketPanel(panel) {
    const s = JI.gameState;
    JI.ensureMarket(s);
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Market'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Watchlist saham & kripto. Black Swan dapat menggerakkan harga secara dramatis.'),
    ]));

    const grid = JI.el('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-5' });

    grid.appendChild(renderTickerTable('Saham (IDX)', s.market.stocks, true));
    grid.appendChild(renderTickerTable('Kripto', s.market.cryptos, false));
    panel.appendChild(grid);
  }

  function renderTickerTable(title, rows, hasSector) {
    const card = JI.el('div', { class: 'ji-card p-5' });
    card.appendChild(sectionTitle(title, `${rows.length} aset`));

    const table = JI.el('div', { class: 'space-y-1' });
    rows.forEach(r => {
      const change = r.prevPrice ? ((r.price - r.prevPrice) / r.prevPrice) * 100 : 0;
      const changeCls = change >= 0 ? 'text-emerald-600' : 'text-red-600';
      const sign = change >= 0 ? '+' : '';
      table.appendChild(JI.el('div', { class: 'flex items-center justify-between gap-2 py-2 border-b border-slate-100' }, [
        JI.el('div', {}, [
          JI.el('p', { class: 'font-semibold text-sm' }, r.ticker),
          JI.el('p', { class: 'text-[11px] text-slate-500' },
            hasSector ? `${r.name} · ${r.sector}` : r.name),
        ]),
        JI.el('div', { class: 'text-right' }, [
          JI.el('p', { class: 'font-mono text-sm font-bold' }, JI.formatIDR(r.price)),
          JI.el('p', { class: `font-mono text-[11px] ${changeCls}` },
            `${sign}${change.toFixed(2)}%`),
        ]),
      ]));
    });
    card.appendChild(table);
    return card;
  }

  /* =========================================================================
     NEWS panel — Black Swan event log
     ========================================================================= */
  function renderNewsPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'News'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Riwayat Black Swan & berita pasar yang sudah terjadi.'),
    ]));

    const card = JI.el('div', { class: 'ji-card p-5' });
    card.appendChild(sectionTitle('Black Swan Log',
      `Probabilitas pemicu harian: ${(JI.BLACK_SWAN_TRIGGER_CHANCE*100).toFixed(1)}%`));

    if (!s.eventHistory || s.eventHistory.length === 0) {
      card.appendChild(JI.el('p', { class: 'text-sm text-slate-400 italic' },
        'Belum ada Black Swan tercatat. Pasar tenang.'));
      panel.appendChild(card);
      return;
    }

    const list = JI.el('div', { class: 'space-y-2' });
    s.eventHistory.forEach(e => {
      const sevCls = e.severity === 'red'   ? 'bg-red-50 border-red-200 text-red-800'
                   : e.severity === 'green' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                            : 'bg-amber-50 border-amber-200 text-amber-800';
      list.appendChild(JI.el('div', { class: `rounded-lg border p-3 ${sevCls}` }, [
        JI.el('p', { class: 'font-bold text-sm tracking-wide' }, e.title),
        JI.el('p', { class: 'text-[11px] font-mono opacity-80' }, e.date),
      ]));
    });
    card.appendChild(list);
    panel.appendChild(card);
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
