/* =========================================================================
   ui.js — Tab system, header, Home & Banking renderers, placeholders.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Tab definitions ---------- */
  const TABS = [
    { id: 'home',      label: 'Home',         icon: '🏠', mobilePrimary: true  },
    { id: 'banking',   label: 'Banking',      icon: '🏦', mobilePrimary: true  },
    { id: 'market',    label: 'Market',       icon: '📈', mobilePrimary: true  },
    { id: 'portfolio', label: 'Portfolio',    icon: '💼', mobilePrimary: true  },
    { id: 'ipo',       label: 'e-IPO Bursa',  icon: '🚀', mobilePrimary: false },
    { id: 'venture',   label: 'Venture Builder', icon: '🏗️', mobilePrimary: false },
    { id: 'news',      label: 'News',         icon: '📰', mobilePrimary: false },
    { id: 'coretax',   label: 'CoreTax DJP',  icon: '🧾', mobilePrimary: false },
    { id: 'hrd',       label: 'HRD',          icon: '👥', mobilePrimary: false },
    { id: 'aset',      label: 'Aset Fisik',   icon: '🏢', mobilePrimary: false },
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
      venture:   renderVenturePanel,
      ipo:       renderIPOPanel,
      news:      renderNewsPanel,
      coretax:   () => renderPlaceholder(panel, 'CoreTax DJP', 'Pelaporan SPT & PPh hadir di Phase 6.'),
      hrd:       () => renderPlaceholder(panel, 'HRD', 'Rekrutmen karyawan hadir di Phase 6.'),
      aset:      () => renderPlaceholder(panel, 'Aset Fisik', 'Properti, mobil & kantor hadir di Phase 6.'),
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

    // Player title (Phase 7)
    const playerTitle = `${s.playerGender === 'Ibu' ? 'Ibu' : 'Bapak'} ${s.playerName || 'Juragan'}`;

    // Hero / title card
    const hero = JI.el('div', {
      class: 'ji-card p-6 sm:p-8 mb-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative overflow-hidden'
    });
    hero.appendChild(JI.el('div', {
      class: 'absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none'
    }));
    hero.appendChild(JI.el('p', { class: 'text-xs uppercase tracking-[0.3em] text-emerald-400 mb-2' },
      `Welcome back, CEO ${playerTitle}`));
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
      { id: 'banking',   label: 'Buka Banking',     icon: '🏦' },
      { id: 'market',    label: 'Lihat Market',     icon: '📈' },
      { id: 'ipo',       label: 'e-IPO Bursa',      icon: '🚀' },
      { id: 'venture',   label: 'Venture Builder',  icon: '🏗️' },
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

    // Phase 7 — Venture Builder feedback
    if (report && report.ventureReport) {
      const v = report.ventureReport;
      if (v.bankrupt) {
        showVentureBankruptModal(v.name, v.valuation);
      } else if (v.burn) {
        JI.toast(`💸 ${v.name}: Burn bulanan ${JI.formatIDR(v.amount)} dipotong.`, 'warning', 4500);
      }
    }

    // Phase 7 — IPO listings (settlements). Show first listing as a celebratory modal.
    if (report && report.ipoListings && report.ipoListings.length) {
      report.ipoListings.forEach((lst, idx) => {
        // Refund toast for everyone
        if (lst.refundedAmount > 0 && lst.bankName) {
          JI.toast(
            `Refund e-IPO ${lst.ticker}: ${JI.formatIDR(lst.refundedAmount)} → ${lst.bankName}`,
            'info', 5000
          );
        }
        if (idx === 0 && lst.hadOrder) {
          // big celebration modal
          showIPOAllotmentModal(lst);
        }
      });
    }

    // Phase 7 — IPO spawn toast
    if (report && report.ipoSpawned) {
      const ipo = report.ipoSpawned;
      JI.toast(
        `📜 Prospektus Baru! ${ipo.name} (${ipo.ticker}) berencana IPO. Hype: ${ipo.hypeLevel}.`,
        'info', 6000
      );
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

      // Phase 7: preview the upgrade plafond.
      const upgradePreview = Math.min(
        Math.floor(bank.balance * 0.5),
        (JI.CC_MAX_LIMIT_UPGRADE || 1_000_000_000)
      );
      const upgradeAvailable = upgradePreview > bank.creditCard.limit;

      const cardSummary = JI.el('div', { class: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4' }, [
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
      ]);
      wrap.appendChild(cardSummary);

      // Phase 7: Pengajuan Naik Limit
      const previewNote = JI.el('p', {
        class: 'text-[11px] text-slate-500 mt-3 font-mono',
      }, upgradeAvailable
          ? `Plafon yang bisa diajukan: ${JI.formatIDR(upgradePreview)} (50% saldo, max Rp 1.000.000.000).`
          : `Plafon kalkulasi saat ini ${JI.formatIDR(upgradePreview)} ≤ limit aktif. Tingkatkan saldo untuk dapat menaikkan limit.`);
      wrap.appendChild(previewNote);

      const upBtn = JI.el('button', {
        class: 'ji-btn ji-btn-success w-full mt-2',
        disabled: upgradeAvailable ? null : '',
        onclick: () => {
          const r = JI.upgradeCreditCardLimit(s, bank.id);
          if (!r.ok) { JI.toast(r.error, 'error', 4500); return; }
          JI.toast(
            `Naik limit ${bank.shortName} disetujui! ${JI.formatIDR(r.oldLimit)} → ${JI.formatIDR(r.newLimit)} (+${JI.formatIDR(r.delta)}).`,
            'success', 5000
          );
          JI.saveState(s);
          renderHeader();
          renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
        },
      }, '⬆ Ajukan Naik Limit');
      if (!upgradeAvailable) upBtn.setAttribute('disabled', 'disabled');
      wrap.appendChild(upBtn);
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

    const card = JI.el('div', { class: 'ji-card p-4' });

    card.appendChild(JI.el('div', { class: 'flex items-start justify-between mb-2 gap-2' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'font-mono text-xs text-slate-500' }, asset.ticker),
        JI.el('h4', { class: 'font-semibold text-sm leading-tight' }, asset.name),
        asset.sector ? JI.el('p', { class: 'text-[10px] text-slate-400 uppercase tracking-wider' }, asset.sector) : null,
      ]),
      JI.el('span', { class: `font-mono text-xs ${chColor}` },
        ch === 0 ? '—' : `${chSign}${(ch * 100).toFixed(1)}%`),
    ]));

    card.appendChild(JI.el('p', { class: 'font-mono text-lg font-bold mb-3' }, JI.formatPrice(asset.ticker, price)));

    const qtyInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1', step: '1',
      placeholder: 'Unit', class: 'ji-input',
    });
    const totalEl = JI.el('p', { class: 'text-[11px] text-slate-500 font-mono mt-1' }, '—');
    qtyInput.addEventListener('input', () => {
      const q = parseInt(qtyInput.value, 10) || 0;
      totalEl.textContent = q > 0 ? `Total: ${JI.formatIDR(q * price)}` : '—';
    });

    const buyBtn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full mt-2',
      onclick: () => {
        const q = parseInt(qtyInput.value, 10) || 0;
        if (q <= 0) { JI.toast('Masukkan jumlah unit dulu.', 'warning'); return; }
        const r = JI.buyAsset(s, asset.ticker, q);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(`Beli ${r.qty} ${r.ticker} @ ${JI.formatIDR(r.price)} dari ${r.bankName}.`, 'success');
        qtyInput.value = '';
        JI.saveState(s);
        renderHeader();
        renderActivePanel();
      },
    }, 'Beli');

    card.appendChild(JI.el('div', { class: 'grid grid-cols-2 gap-2' }, [qtyInput, buyBtn]));
    card.appendChild(totalEl);
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

    const card = JI.el('div', { class: 'ji-card p-4' });

    card.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-2 mb-3' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'font-mono text-xs text-slate-500' }, pos.ticker),
        JI.el('h4', { class: 'font-semibold' }, asset ? asset.name : pos.ticker),
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
     PHASE 7 — Main Menu (character creation)
     ========================================================================= */
  function renderMainMenu(container, onSubmit) {
    const MIN = JI.MIN_STARTING_CAPITAL || 10_000_000;
    const MAX = JI.MAX_STARTING_CAPITAL || 100_000_000_000_000;
    const DEFAULT_CAP = 150_000_000;

    container.innerHTML = '';
    const card = JI.el('div', {
      class: 'main-menu-card w-full max-w-xl mx-auto p-7 sm:p-9 rounded-3xl shadow-2xl text-white relative overflow-hidden',
    });
    card.appendChild(JI.el('div', { class: 'mm-glow mm-glow-1' }));
    card.appendChild(JI.el('div', { class: 'mm-glow mm-glow-2' }));

    card.appendChild(JI.el('p', { class: 'text-[11px] uppercase tracking-[0.4em] text-emerald-300 mb-3' }, '— New Game —'));
    card.appendChild(JI.el('h1', {
      class: 'text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight mb-2'
    }, 'Juragan Investasi'));
    card.appendChild(JI.el('p', { class: 'text-slate-300 text-sm sm:text-base mb-6 max-w-md' },
      'Buat profil CEO Anda. Modal awal akan dibagi acak ke 3 bank: Mandiri, BCA, BNI.'));

    /* --- Form fields --- */
    const nameInput = JI.el('input', {
      type: 'text', maxlength: '24',
      placeholder: 'cth: Farhan Dwi',
      class: 'mm-input',
    });

    const genderWrap = JI.el('div', { class: 'mm-segments' });
    let selectedGender = 'Bapak';
    function renderGenderSegments() {
      genderWrap.innerHTML = '';
      ['Bapak', 'Ibu'].forEach(g => {
        const seg = JI.el('button', {
          type: 'button',
          class: `mm-seg ${selectedGender === g ? 'is-active' : ''}`,
          onclick: () => { selectedGender = g; renderGenderSegments(); },
        }, [
          JI.el('span', { class: 'text-lg' }, g === 'Bapak' ? '👨‍💼' : '👩‍💼'),
          JI.el('span', {}, g),
        ]);
        genderWrap.appendChild(seg);
      });
    }
    renderGenderSegments();

    const capInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: String(MIN), max: String(MAX),
      step: '1000000', placeholder: 'Rp 150.000.000', value: String(DEFAULT_CAP),
      class: 'mm-input font-mono',
    });
    const capPreview = JI.el('p', { class: 'text-[12px] text-emerald-300 font-mono mt-1.5' },
      JI.formatIDR(DEFAULT_CAP));
    capInput.addEventListener('input', () => {
      const v = JI.parseIDRInput(capInput.value);
      capPreview.textContent = v ? JI.formatIDR(v) : '—';
    });

    /* Quick presets */
    const presets = [
      { label: 'Rakyat',      value:        50_000_000 },
      { label: 'Mid Class',   value:       500_000_000 },
      { label: 'Sultan',      value:    10_000_000_000 },
      { label: 'Konglomerat', value: 1_000_000_000_000 },
    ];
    const presetRow = JI.el('div', { class: 'flex flex-wrap gap-2 mt-3' });
    presets.forEach(p => {
      presetRow.appendChild(JI.el('button', {
        type: 'button',
        class: 'mm-chip',
        onclick: () => {
          capInput.value = String(p.value);
          capPreview.textContent = JI.formatIDR(p.value);
        },
      }, `${p.label} · ${JI.formatIDRCompact(p.value)}`));
    });

    /* Field group */
    card.appendChild(JI.el('div', { class: 'space-y-5' }, [
      JI.el('div', {}, [
        JI.el('label', { class: 'mm-label' }, 'Nama Pemain'),
        nameInput,
      ]),
      JI.el('div', {}, [
        JI.el('label', { class: 'mm-label' }, 'Jenis Kelamin'),
        genderWrap,
      ]),
      JI.el('div', {}, [
        JI.el('label', { class: 'mm-label' }, 'Modal Awal'),
        capInput,
        capPreview,
        presetRow,
        JI.el('p', { class: 'text-[11px] text-slate-400 mt-2' },
          `Min ${JI.formatIDRCompact(MIN)} · Max ${JI.formatIDRCompact(MAX)}`),
      ]),
    ]));

    /* Errors */
    const errorEl = JI.el('p', { class: 'text-red-400 text-sm font-medium mt-4 hidden' }, '');

    const startBtn = JI.el('button', {
      type: 'button',
      class: 'mm-btn-start mt-5',
      onclick: () => {
        const name = (nameInput.value || '').trim();
        const cap  = JI.parseIDRInput(capInput.value);
        let err = '';
        if (name.length < 2 || name.length > 24) err = 'Nama harus 2 - 24 karakter.';
        else if (!cap || cap < MIN) err = `Modal minimum ${JI.formatIDRCompact(MIN)}.`;
        else if (cap > MAX)         err = `Modal maksimum ${JI.formatIDRCompact(MAX)}.`;
        if (err) {
          errorEl.textContent = err;
          errorEl.classList.remove('hidden');
          return;
        }
        errorEl.classList.add('hidden');
        if (typeof onSubmit === 'function') {
          onSubmit({ name, gender: selectedGender, capital: cap });
        }
      },
    }, '🚀 Mulai Petualangan');

    card.appendChild(errorEl);
    card.appendChild(startBtn);

    card.appendChild(JI.el('p', { class: 'text-center text-[10px] text-slate-500 mt-6 font-mono' },
      'a game by @farhandwisusilo · Phase 7'));

    container.appendChild(card);
    nameInput.focus();
  }

  /* =========================================================================
     PHASE 7 — Venture Builder panel
     ========================================================================= */
  function renderVenturePanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Venture Builder'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Bangun startup Anda sendiri. Cetak valuasi, kumpulkan investor, dan IPO ke bursa Category 1.'),
    ]));

    if (!s.myStartup) {
      panel.appendChild(renderVentureFoundingForm());
      return;
    }
    panel.appendChild(renderVentureDashboard());
  }

  function renderVentureFoundingForm() {
    const s = JI.gameState;
    const wrap = JI.el('div', { class: 'ji-card p-6 max-w-xl mx-auto' });
    wrap.appendChild(JI.el('h3', { class: 'text-lg font-bold mb-1' }, 'Dirikan Startup Baru'));
    wrap.appendChild(JI.el('p', { class: 'text-slate-500 text-sm mb-4' },
      'Mulai dari Seed stage. Anda akan menyuntik kas pribadi sebagai modal awal.'));

    const nameInput = JI.el('input', {
      type: 'text', maxlength: '30',
      placeholder: 'cth: Tokopedia Junior',
      class: 'ji-input',
    });

    const sectorWrap = JI.el('div', { class: 'grid grid-cols-3 gap-2' });
    let selectedSector = 'Tech';
    function renderSectors() {
      sectorWrap.innerHTML = '';
      ['Tech', 'F&B', 'Finance'].forEach(sec => {
        const icon = sec === 'Tech' ? '💻' : sec === 'F&B' ? '🍜' : '💰';
        sectorWrap.appendChild(JI.el('button', {
          type: 'button',
          class: `venture-sector ${selectedSector === sec ? 'is-active' : ''}`,
          onclick: () => { selectedSector = sec; renderSectors(); },
        }, [
          JI.el('div', { class: 'text-2xl mb-1' }, icon),
          JI.el('p', { class: 'font-semibold text-sm' }, sec),
        ]));
      });
    }
    renderSectors();

    wrap.appendChild(JI.el('div', { class: 'space-y-4' }, [
      labelled('Nama Startup', nameInput),
      JI.el('div', {}, [
        JI.el('span', { class: 'block text-[11px] uppercase tracking-wider text-slate-500 mb-1' }, 'Sektor'),
        sectorWrap,
      ]),
    ]));

    const startBtn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full mt-5',
      onclick: () => {
        const r = JI.foundStartup(s, nameInput.value, selectedSector);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(`🏗️ ${r.startup.name} (${r.startup.sector}) didirikan!`, 'success', 4500);
        JI.saveState(s);
        renderVenturePanel(JI.$('[data-tab-panel="venture"]'));
      },
    }, 'Dirikan Startup');
    wrap.appendChild(startBtn);

    return wrap;
  }

  function renderVentureDashboard() {
    const s = JI.gameState;
    const startup = s.myStartup;
    const wrap = JI.el('div', { class: 'space-y-5' });

    /* ---- Hero header ---- */
    const hero = JI.el('div', {
      class: 'ji-card p-6 bg-gradient-to-br from-fuchsia-700 via-purple-700 to-indigo-800 text-white relative overflow-hidden',
    });
    hero.appendChild(JI.el('div', {
      class: 'absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none',
    }));
    hero.appendChild(JI.el('div', { class: 'flex items-center justify-between gap-3 flex-wrap' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-[11px] uppercase tracking-widest text-white/70' }, `Sector · ${startup.sector}`),
        JI.el('h3', { class: 'text-2xl sm:text-3xl font-extrabold mt-1' }, startup.name),
      ]),
      JI.el('span', { class: 'venture-stage' }, startup.stage),
    ]));
    hero.appendChild(JI.el('div', { class: 'mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4' }, [
      ventureKV('Valuasi', JI.formatIDRCompact(startup.valuation)),
      ventureKV('Kas Startup', JI.formatIDRCompact(startup.startupCash)),
      ventureKV('Users', startup.users.toLocaleString('id-ID')),
      ventureKV('Kepemilikan', `${startup.playerOwnership.toFixed(2)}%`),
    ]));
    wrap.appendChild(hero);

    /* ---- Metrics card ---- */
    const metrics = JI.el('div', { class: 'ji-card p-5' });
    metrics.appendChild(JI.el('h4', { class: 'font-semibold mb-3' }, 'Metrik Operasi'));
    metrics.appendChild(JI.el('div', { class: 'grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm' }, [
      kv('Burn Bulanan', JI.formatIDR(startup.monthlyBurn)),
      kv('Hari Berdiri', `${s.totalDays - startup.foundedDay} hari`),
      kv('Marketing Burn', `${startup.burnCount}x`),
      kv('Pitch Investor', `${startup.pitchCount}x`),
    ]));

    const nextBurnIn = (JI.VENTURE_BURN_INTERVAL || 30) - (s.totalDays - (startup.lastBurnDay || startup.foundedDay));
    metrics.appendChild(JI.el('p', { class: 'text-[11px] text-slate-500 mt-3 font-mono' },
      `Burn berikutnya dalam ${Math.max(0, nextBurnIn)} hari.`));

    wrap.appendChild(metrics);

    /* ---- Action 1: Suntik Dana Pribadi ---- */
    wrap.appendChild(renderInjectFundsCard());

    /* ---- Action 2: Bakar Uang ---- */
    wrap.appendChild(renderBurnCashCard());

    /* ---- Action 3: Pitching Investor Luar ---- */
    wrap.appendChild(renderPitchInvestorCard());

    /* ---- Mega IPO ---- */
    wrap.appendChild(renderVentureIPOCard());

    return wrap;
  }

  function ventureKV(k, v) {
    return JI.el('div', {}, [
      JI.el('p', { class: 'text-[10px] uppercase tracking-widest text-white/70' }, k),
      JI.el('p', { class: 'font-mono font-bold text-base sm:text-lg mt-0.5' }, v),
    ]);
  }

  function renderInjectFundsCard() {
    const s = JI.gameState;
    const wrap = JI.el('div', { class: 'ji-card p-5' });
    wrap.appendChild(sectionTitle('Action · Suntik Dana Pribadi',
      'Pindahkan kas dari rekening Anda ke kas startup. Valuasi naik 20% dari nominal injeksi.'));

    const bankSelect = JI.el('select', { class: 'ji-input ji-select' });
    s.banks.forEach(b => {
      bankSelect.appendChild(JI.el('option', { value: b.id },
        `${b.shortName} — ${JI.formatIDR(b.balance)}`));
    });

    const amtInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1', step: '1',
      placeholder: 'Nominal (Rp)', class: 'ji-input',
    });

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full mt-3',
      onclick: () => {
        const amt = JI.parseIDRInput(amtInput.value);
        const r = JI.injectPersonalFunds(s, bankSelect.value, amt);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(`Suntik ${JI.formatIDR(r.amount)} ke startup. Valuasi +${JI.formatIDR(r.valuationBoost)}.`, 'success');
        amtInput.value = '';
        JI.saveState(s);
        renderHeader();
        renderVenturePanel(JI.$('[data-tab-panel="venture"]'));
      },
    }, '💰 Suntik Dana');

    wrap.appendChild(JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-2' }, [
      labelled('Sumber Bank', bankSelect),
      labelled('Nominal',     amtInput),
    ]));
    wrap.appendChild(btn);
    return wrap;
  }

  function renderBurnCashCard() {
    const s = JI.gameState;
    const startup = s.myStartup;
    const burnAmount = Math.floor(startup.startupCash * 0.5);
    const newBurnRate = Math.floor(startup.monthlyBurn * 1.1);

    const wrap = JI.el('div', { class: 'ji-card p-5' });
    wrap.appendChild(sectionTitle('Action · Bakar Uang (Marketing)',
      'Habiskan 50% kas startup untuk akuisisi user dan booster valuasi. Burn rate +10%.'));

    wrap.appendChild(JI.el('div', { class: 'rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm space-y-1' }, [
      JI.el('p', { class: 'text-amber-800' }, `🔥 Akan dibakar: ${JI.formatIDR(burnAmount)}`),
      JI.el('p', { class: 'text-amber-700 text-xs' },
        `Burn bulanan ${JI.formatIDR(startup.monthlyBurn)} → ${JI.formatIDR(newBurnRate)} (+10%).`),
    ]));

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-warning w-full mt-3',
      disabled: burnAmount < 500_000 ? '' : null,
      onclick: () => {
        if (burnAmount < 500_000) return;
        const r = JI.burnCash(s);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(
          `🔥 Bakar ${JI.formatIDR(r.burned)} → +${r.newUsers.toLocaleString('id-ID')} user · Valuasi +${JI.formatIDRCompact(r.valBoost)}.`,
          'success', 5000
        );
        JI.saveState(s);
        renderHeader();
        renderVenturePanel(JI.$('[data-tab-panel="venture"]'));
      },
    }, '🔥 Bakar Uang Marketing');
    if (burnAmount < 500_000) btn.setAttribute('disabled', 'disabled');
    wrap.appendChild(btn);
    return wrap;
  }

  function renderPitchInvestorCard() {
    const s = JI.gameState;
    const startup = s.myStartup;
    const eligible = startup.valuation >= (JI.VENTURE_PITCH_MIN_VAL || 5_000_000_000);

    const wrap = JI.el('div', { class: 'ji-card p-5' });
    wrap.appendChild(sectionTitle('Action · Pitching Investor Luar',
      `Buka pintu investor strategis. Dilusi 15-20% kepemilikan. Min. valuasi ${JI.formatIDRCompact(JI.VENTURE_PITCH_MIN_VAL || 5_000_000_000)}.`));

    if (!eligible) {
      wrap.appendChild(JI.el('div', { class: 'rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm' }, [
        JI.el('p', { class: 'text-slate-600' },
          `🔒 Belum unlocked. Naikkan valuasi minimal ${JI.formatIDRCompact(JI.VENTURE_PITCH_MIN_VAL)}.`),
      ]));
    } else {
      wrap.appendChild(JI.el('div', { class: 'rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-sm space-y-1' }, [
        JI.el('p', { class: 'text-indigo-800' },
          `💼 Stage saat ini: ${startup.stage}. Investor siap disambut.`),
        JI.el('p', { class: 'text-indigo-700 text-xs' },
          `Valuasi pasca-pitch akan naik 1.5x; kepemilikan Anda akan dipangkas 15-20%.`),
      ]));
    }

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full mt-3',
      disabled: eligible ? null : '',
      onclick: () => {
        const r = JI.pitchInvestor(s);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(
          `🎯 Investor masuk: +${JI.formatIDRCompact(r.injection)} (dilusi ${r.dilution}%). Ownership: ${r.newOwnership}%.`,
          'success', 5500
        );
        JI.saveState(s);
        renderHeader();
        renderVenturePanel(JI.$('[data-tab-panel="venture"]'));
      },
    }, '🤝 Pitching Investor');
    if (!eligible) btn.setAttribute('disabled', 'disabled');
    wrap.appendChild(btn);
    return wrap;
  }

  function renderVentureIPOCard() {
    const s = JI.gameState;
    const eligible = JI.canIPO ? JI.canIPO(s) : false;
    const threshold = JI.VENTURE_IPO_THRESHOLD || 10_000_000_000_000;

    const wrap = JI.el('div', {
      class: `ji-card p-6 ${eligible ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-amber-950' : ''}`,
    });
    wrap.appendChild(JI.el('h4', { class: `font-bold text-lg ${eligible ? '' : 'text-slate-900'}` }, '🚀 Mega IPO'));
    wrap.appendChild(JI.el('p', { class: `text-sm mt-1 ${eligible ? 'text-amber-900' : 'text-slate-500'}` },
      `Listing di bursa Category 1. Threshold valuasi ${JI.formatIDRCompact(threshold)}.`));

    if (!eligible) {
      wrap.appendChild(JI.el('p', { class: 'text-slate-500 text-xs mt-3 font-mono' }, '🔒 Belum tersedia.'));
      return wrap;
    }

    const btn = JI.el('button', {
      class: 'ji-btn bg-amber-950 text-amber-50 hover:bg-amber-900 w-full mt-4',
      onclick: () => {
        const r = JI.ipoStartup(s);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        showStartupIPOModal(r);
        JI.saveState(s);
        renderHeader();
        renderVenturePanel(JI.$('[data-tab-panel="venture"]'));
      },
    }, '⚡ IPO Sekarang!');
    wrap.appendChild(btn);
    return wrap;
  }

  /* =========================================================================
     PHASE 7 — e-IPO Bursa panel
     ========================================================================= */
  function renderIPOPanel(panel) {
    const s = JI.gameState;
    if (typeof JI.ensureIPOPool === 'function') JI.ensureIPOPool(s);
    panel.innerHTML = '';

    const poolN   = JI.poolRemaining ? JI.poolRemaining(s) : 0;
    const activeN = (s.activeIPOs || []).length;
    const orderN  = JI.pendingOrderCount ? JI.pendingOrderCount(s) : 0;

    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between gap-3 flex-wrap' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'e-IPO Bursa'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          `Spawn 5%/hari dari ${poolN} prospektus tersisa · ${activeN} aktif · ${orderN} pesanan menunggu.`),
      ]),
      JI.el('button', { class: 'ji-btn ji-btn-success', onclick: handleNextDayClick }, '⏭  Next Day'),
    ]));

    /* Active IPOs */
    panel.appendChild(JI.el('h3', { class: 'text-sm uppercase tracking-wider text-slate-500 mb-2' },
      'Prospektus Aktif (Order Window)'));

    if (!activeN) {
      panel.appendChild(JI.el('div', { class: 'ji-card p-6 text-center' }, [
        JI.el('div', { class: 'text-4xl mb-2' }, '📭'),
        JI.el('p', { class: 'text-slate-500 text-sm' },
          'Belum ada IPO aktif. Klik Next Day untuk roll spawn (5% chance/hari).'),
      ]));
    } else {
      const grid = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3' });
      (s.activeIPOs || []).forEach(ipo => grid.appendChild(renderIPOTile(ipo)));
      panel.appendChild(grid);
    }

    /* History */
    if ((s.ipoHistory || []).length) {
      panel.appendChild(JI.el('h3', { class: 'text-sm uppercase tracking-wider text-slate-500 mt-8 mb-2' },
        'Riwayat Penjatahan & Listing'));
      const list = JI.el('div', { class: 'space-y-2' });
      s.ipoHistory.slice(0, 15).forEach(h => list.appendChild(renderIPOHistoryRow(h)));
      panel.appendChild(list);
    }

    /* Pool preview */
    panel.appendChild(JI.el('h3', { class: 'text-sm uppercase tracking-wider text-slate-500 mt-8 mb-2' },
      `Antrian Prospektus (${poolN})`));
    if (!poolN) {
      panel.appendChild(JI.el('div', { class: 'ji-card p-5 text-slate-500 text-sm' },
        'Semua prospektus dalam pool sudah pernah spawn. Antrian habis.'));
    } else {
      const tickers = (s.ipoPool || []).map(c => `${c.ticker}`).join(' · ');
      panel.appendChild(JI.el('div', { class: 'ji-card p-4 text-sm font-mono text-slate-600 break-all' }, tickers));
    }
  }

  function renderIPOTile(ipo) {
    const s = JI.gameState;
    const ordered = !!ipo.playerOrder;
    const card = JI.el('div', { class: `ipo-tile ${ordered ? 'is-ordered' : ''}` });

    /* Header */
    card.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-2 mb-2' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'font-mono text-xs text-slate-500' }, ipo.ticker),
        JI.el('h4', { class: 'font-bold text-sm leading-tight' }, ipo.name),
        JI.el('p', { class: 'text-[10px] text-slate-400 uppercase tracking-wider' }, ipo.sector),
      ]),
      JI.el('span', { class: `hype-badge ${JI.hypeBadgeClass ? JI.hypeBadgeClass(ipo.hypeLevel) : ''}` },
        `Hype ${ipo.hypeLevel}`),
    ]));

    /* Stats */
    card.appendChild(JI.el('div', { class: 'grid grid-cols-2 gap-2 text-xs mb-3' }, [
      kv('Harga IPO', JI.formatIDR(ipo.offeringPrice)),
      kv('Saham', ipo.outstandingShares.toLocaleString('id-ID')),
    ]));

    /* Order area */
    if (ordered) {
      const order = ipo.playerOrder;
      const bank = JI.getBank(s, order.bankId);
      card.appendChild(JI.el('div', { class: 'rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs space-y-1' }, [
        JI.el('p', { class: 'text-amber-800 font-semibold' }, '⏳ Menunggu Penjatahan'),
        JI.el('p', { class: 'text-amber-700' },
          `${JI.formatIDR(order.amountRupiah)} · via ${bank ? bank.shortName : '—'}`),
        JI.el('p', { class: 'text-amber-600 text-[10px]' },
          `Setiap Next Day, peluang listing ${(JI.IPO_LIST_CHANCE * 100)}%.`),
      ]));
      const cancelBtn = JI.el('button', {
        class: 'ji-btn ji-btn-ghost w-full mt-2 text-xs',
        onclick: () => {
          const r = JI.cancelOrder(s, ipo.ticker);
          if (!r.ok) { JI.toast(r.error, 'error'); return; }
          JI.toast(`Pesanan dibatalkan, refund ${JI.formatIDR(r.refunded)} → ${r.bankName}.`, 'info');
          JI.saveState(s);
          renderHeader();
          renderIPOPanel(JI.$('[data-tab-panel="ipo"]'));
        },
      }, '✖ Batalkan Pesanan');
      card.appendChild(cancelBtn);
      return card;
    }

    /* Order form */
    const bankSelect = JI.el('select', { class: 'ji-input ji-select text-sm' });
    s.banks.forEach(b => {
      bankSelect.appendChild(JI.el('option', { value: b.id },
        `${b.shortName} — ${JI.formatIDR(b.balance)}`));
    });

    const amtInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: String(ipo.offeringPrice), step: '1',
      placeholder: `Min ${JI.formatIDR(ipo.offeringPrice)}`,
      class: 'ji-input text-sm',
    });

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full mt-2',
      onclick: () => {
        const amt = JI.parseIDRInput(amtInput.value);
        const r = JI.placeOrder(s, ipo.ticker, amt, bankSelect.value);
        if (!r.ok) { JI.toast(r.error, 'error'); return; }
        JI.toast(`Pesanan e-IPO ${r.ticker} ${JI.formatIDR(r.amount)} via ${r.bankName} terkirim.`, 'success', 4500);
        JI.saveState(s);
        renderHeader();
        renderIPOPanel(JI.$('[data-tab-panel="ipo"]'));
      },
    }, 'Pesan Saham');

    card.appendChild(JI.el('div', { class: 'space-y-2' }, [
      labelled('Bank Sumber', bankSelect),
      labelled('Nominal Pesanan', amtInput),
      btn,
    ]));
    return card;
  }

  function renderIPOHistoryRow(h) {
    return JI.el('div', { class: 'ji-card p-3 text-sm' }, [
      JI.el('div', { class: 'flex items-center justify-between gap-2 flex-wrap' }, [
        JI.el('p', { class: 'font-semibold' },
          `🚀 ${h.ticker} · ${h.name} listing`),
        JI.el('p', { class: 'text-[11px] font-mono text-slate-500' }, `Hari ${h.day}`),
      ]),
      h.hadOrder ? JI.el('p', { class: 'text-xs text-slate-600 mt-1' },
        `Penjatahan ${h.allotPct}% · ${h.allottedShares.toLocaleString('id-ID')} lembar (${JI.formatIDR(h.allottedAmount)}) · Refund ${JI.formatIDR(h.refundedAmount)} → ${h.bankName}`)
        : JI.el('p', { class: 'text-xs text-slate-500 mt-1' }, 'Listing tanpa pesanan dari Anda.'),
    ]);
  }

  /* =========================================================================
     PHASE 7 — Modals: IPO allotment celebration, Startup IPO, Bankruptcy
     ========================================================================= */
  function showIPOAllotmentModal(lst) {
    const root = document.createElement('div');
    root.className = 'event-modal-root event-positive event-major';

    const card = document.createElement('div');
    card.className = 'event-modal-card';
    card.innerHTML = `
      <div class="event-modal-stripe">e-IPO LISTING</div>
      <div class="event-modal-icon">🚀</div>
      <div class="event-modal-title">${lst.name} Resmi Listing!</div>
      <div class="event-modal-body">
        Penjatahan Anda <b>${lst.allotPct}%</b> dari pesanan.<br>
        Anda mendapat <b>${lst.allottedShares.toLocaleString('id-ID')}</b> lembar
        ${lst.ticker} @ ${JI.formatIDR(lst.offeringPrice)}.
      </div>
      <div class="event-modal-impact">
        Refund ${JI.formatIDR(lst.refundedAmount)} → ${lst.bankName || '—'}
      </div>
      <button class="event-modal-close">Mantap, Lanjut</button>
    `;
    root.appendChild(card);
    document.body.appendChild(root);
    card.querySelector('.event-modal-close').onclick = () => {
      root.classList.add('event-modal-leave');
      setTimeout(() => root.remove(), 320);
    };
  }

  function showStartupIPOModal(r) {
    const root = document.createElement('div');
    root.className = 'event-modal-root event-positive event-major';

    const card = document.createElement('div');
    card.className = 'event-modal-card';
    card.innerHTML = `
      <div class="event-modal-stripe">Sejarah Baru</div>
      <div class="event-modal-icon">🏆</div>
      <div class="event-modal-title">${r.name} Resmi IPO!</div>
      <div class="event-modal-body">
        Ticker baru <b>${r.ticker}</b> kini diperdagangkan di bursa Category 1.<br>
        Anda menggenggam <b>${r.shares.toLocaleString('id-ID')}</b> lembar (${r.ownership.toFixed(2)}% kepemilikan).
      </div>
      <div class="event-modal-impact">
        Listing price ${JI.formatIDR(r.price)} · Valuasi ${JI.formatIDRCompact(r.valuation)}
      </div>
      <button class="event-modal-close">Selamat!</button>
    `;
    root.appendChild(card);
    document.body.appendChild(root);
    card.querySelector('.event-modal-close').onclick = () => {
      root.classList.add('event-modal-leave');
      setTimeout(() => root.remove(), 320);
    };
  }

  function showVentureBankruptModal(name, valuation) {
    const root = document.createElement('div');
    root.className = 'event-modal-root event-negative event-major';

    const card = document.createElement('div');
    card.className = 'event-modal-card';
    card.innerHTML = `
      <div class="event-modal-stripe">Startup Bangkrut</div>
      <div class="event-modal-icon">💀</div>
      <div class="event-modal-title">${name} Tutup</div>
      <div class="event-modal-body">
        Kas habis untuk membayar burn bulanan. Operasional dihentikan.
      </div>
      <div class="event-modal-impact">
        Valuasi terakhir ${JI.formatIDRCompact(valuation)} → 0
      </div>
      <button class="event-modal-close">Bangkit Lagi</button>
    `;
    root.appendChild(card);
    document.body.appendChild(root);
    card.querySelector('.event-modal-close').onclick = () => {
      root.classList.add('event-modal-leave');
      setTimeout(() => root.remove(), 320);
    };
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
    renderMainMenu,
  });
})(window);
