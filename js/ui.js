/* =========================================================================
   ui.js — Tab system, header, panels (Home, Banking, Market, Portfolio,
   News, Aset Fisik) + modal/payment helpers + Next Day button.
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
      clockEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    // Next-day button (header). Inserted lazily.
    let nextBtn = document.getElementById('next-day-btn');
    if (!nextBtn) {
      const slot = document.querySelector('header > div:nth-child(2) > div:last-child');
      if (slot) {
        nextBtn = JI.el('button', {
          id: 'next-day-btn',
          class: 'ji-btn ji-btn-primary !py-2 !px-3 !text-xs sm:!text-sm whitespace-nowrap ml-2',
          onclick: () => JI.advanceDay && JI.advanceDay(),
          title: 'Lanjut ke hari berikutnya',
        }, 'Next Day →');
        slot.appendChild(nextBtn);
      }
    }
  }

  function buildTabs() {
    const desktop = document.getElementById('desktop-tabs');
    const drawer  = document.getElementById('mobile-tabs');
    const bottom  = document.getElementById('mobile-bottom-nav');
    if (!desktop || !drawer || !bottom) return;

    desktop.innerHTML = ''; drawer.innerHTML = ''; bottom.innerHTML = '';

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
      bottom.appendChild(JI.el('button', {
        class: 'mnav-btn',
        dataset: { tabid: tab.id },
        onclick: () => switchTab(tab.id),
      }, [
        JI.el('span', { class: 'text-lg leading-none' }, tab.icon),
        JI.el('span', {}, tab.label),
      ]));
    });
    bottom.appendChild(JI.el('button', {
      class: 'mnav-btn',
      onclick: openMobileMenu,
    }, [
      JI.el('span', { class: 'text-lg leading-none' }, '⋯'),
      JI.el('span', {}, 'More'),
    ]));
  }

  function highlightActiveTab() {
    const id = JI.gameState.activeTab;
    JI.$$('#desktop-tabs .desktop-tab').forEach(b => b.classList.toggle('active', b.dataset.tabid === id));
    JI.$$('#mobile-tabs .mdrawer-btn').forEach(b => b.classList.toggle('active', b.dataset.tabid === id));
    JI.$$('#mobile-bottom-nav .mnav-btn').forEach(b => b.classList.toggle('active', b.dataset.tabid === id));
  }

  function switchTab(id) {
    if (!TABS.find(t => t.id === id)) return;
    JI.gameState.activeTab = id;
    JI.$$('.tab-panel').forEach(p => p.classList.toggle('hidden', p.dataset.tabPanel !== id));
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
     Modal system
     ========================================================================= */
  function openModal(titleText, contentNode, opts = {}) {
    closeModal();
    const overlay = JI.el('div', {
      id: 'ji-modal',
      class: 'fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4',
      onclick: (e) => { if (e.target.id === 'ji-modal') closeModal(); },
    });
    const card = JI.el('div', {
      class: 'bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto',
    });
    const head = JI.el('div', { class: 'flex items-center justify-between gap-3 p-4 border-b border-slate-100 sticky top-0 bg-white z-10' }, [
      JI.el('h3', { class: 'font-bold text-slate-900' }, titleText),
      JI.el('button', {
        class: 'p-1 rounded hover:bg-slate-100',
        onclick: closeModal,
        'aria-label': 'Tutup',
      }, [
        JI.el('span', { class: 'text-xl leading-none' }, '×'),
      ]),
    ]);
    const body = JI.el('div', { class: 'p-5' });
    body.appendChild(contentNode);
    card.appendChild(head);
    card.appendChild(body);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function closeModal() {
    document.getElementById('ji-modal')?.remove();
  }

  /* =========================================================================
     Reusable: payment method selector (bank balance vs credit card)
     Returns:
       { container, getValue: () => {method, bankId} }
     ========================================================================= */
  function paymentSelector({ allowCredit = true, defaultBankId = null } = {}) {
    const s = JI.gameState;
    const banks = s.banks;

    const container = JI.el('div', { class: 'space-y-3' });

    // Method radio
    const methodWrap = JI.el('div', { class: 'grid grid-cols-2 gap-2' });
    const radios = [];
    function radio(id, label, hint, disabled = false) {
      const r = JI.el('input', {
        type: 'radio', name: 'pay-method', id, value: id,
        class: 'sr-only',
      });
      if (disabled) r.disabled = true;
      const lbl = JI.el('label', {
        for: id,
        class: 'cursor-pointer rounded-xl border-2 p-3 text-sm transition-all ' +
               (disabled ? 'opacity-50 cursor-not-allowed border-slate-200' : 'border-slate-200 hover:border-slate-400'),
      }, [
        JI.el('p', { class: 'font-semibold' }, label),
        JI.el('p', { class: 'text-xs text-slate-500 mt-0.5' }, hint),
      ]);
      const wrap = JI.el('div', {});
      wrap.appendChild(r);
      wrap.appendChild(lbl);
      r.addEventListener('change', () => {
        radios.forEach(([rad, l]) => l.classList.toggle('border-emerald-500', rad.checked));
        radios.forEach(([rad, l]) => l.classList.toggle('bg-emerald-50', rad.checked));
      });
      radios.push([r, lbl]);
      return wrap;
    }
    methodWrap.appendChild(radio('pm-bank', 'Saldo Bank', 'Bayar dari rekening yang dipilih.'));
    if (allowCredit) {
      const anyApproved = banks.some(b => b.creditCard && b.creditCard.isApproved);
      methodWrap.appendChild(radio('pm-credit', 'Kartu Kredit',
        anyApproved ? 'Tagih ke limit kartu kredit.' : 'Belum ada kartu kredit aktif.', !anyApproved));
    }
    container.appendChild(methodWrap);

    // Default check 'bank'
    radios[0][0].checked = true;
    radios[0][1].classList.add('border-emerald-500', 'bg-emerald-50');

    // Bank selector
    const bankSelect = JI.el('select', { class: 'ji-input ji-select' });
    function refreshBankOptions() {
      const isCredit = document.getElementById('pm-credit')?.checked;
      bankSelect.innerHTML = '';
      banks.forEach(b => {
        if (isCredit && !(b.creditCard && b.creditCard.isApproved)) return;
        const detail = isCredit
          ? `Limit ${JI.formatIDR(b.creditCard.limit - b.creditCard.used)} tersedia`
          : `Saldo ${JI.formatIDR(b.balance)}`;
        bankSelect.appendChild(JI.el('option', { value: b.id }, `${b.shortName} — ${detail}`));
      });
      if (defaultBankId) bankSelect.value = defaultBankId;
    }
    radios.forEach(([r]) => r.addEventListener('change', refreshBankOptions));
    refreshBankOptions();
    container.appendChild(JI.el('label', { class: 'block' }, [
      JI.el('span', { class: 'block text-[11px] uppercase tracking-wider text-slate-500 mb-1' }, 'Bank'),
      bankSelect,
    ]));

    return {
      container,
      getValue() {
        const method = document.getElementById('pm-credit')?.checked ? 'credit' : 'bank';
        return { method, bankId: bankSelect.value };
      },
    };
  }

  /* =========================================================================
     Render dispatcher
     ========================================================================= */
  function renderActivePanel() {
    const id = JI.gameState.activeTab;
    const panel = JI.$(`[data-tab-panel="${id}"]`);
    if (!panel) return;

    ({
      home:      renderHomePanel,
      banking:   renderBankingPanel,
      market:    renderMarketPanel,
      portfolio: renderPortfolioPanel,
      news:      renderNewsPanel,
      aset:      renderAsetPanel,
      coretax:   p => renderPlaceholder(p, 'CoreTax DJP', 'Pelaporan SPT & PPh hadir di Phase 3.'),
      hrd:       p => renderPlaceholder(p, 'HRD', 'Rekrutmen karyawan hadir di Phase 3.'),
    }[id] || (() => {}))(panel);
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
    const xpNeed = JI.xpToNext(s.companyLevel);
    const xpPct  = JI.clamp(Math.round((s.companyXP / xpNeed) * 100), 0, 100);
    const title  = JI.getCompanyTitle(s.companyLevel);

    panel.innerHTML = '';

    /* Hero */
    const hero = JI.el('div', {
      class: 'ji-card p-6 sm:p-8 mb-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative overflow-hidden'
    });
    hero.appendChild(JI.el('div', { class: 'absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none' }));
    hero.appendChild(JI.el('p', { class: 'text-xs uppercase tracking-[0.3em] text-emerald-400 mb-2' }, 'Welcome back, Juragan'));
    hero.appendChild(JI.el('h2', { class: 'text-2xl sm:text-4xl font-extrabold tracking-tight' }, 'Juragan Investasi: Capitalist Tycoon'));
    hero.appendChild(JI.el('p', { class: 'text-slate-300 mt-2 max-w-xl text-sm sm:text-base' },
      'Bangun imperium investasi Anda di Indonesia. Kelola kas, manfaatkan kredit, dan tumbuhkan kekayaan dari hari ke hari.'));
    panel.appendChild(hero);

    /* Stats */
    const portfolioValue = (s.portfolio || []).reduce((acc, h) => {
      const m = s.marketAssets[h.ticker];
      return acc + (m ? m.price : 0) * h.qty;
    }, 0);
    const physicalValue = JI.totalPhysicalValue(s);

    const grid = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6' });
    grid.appendChild(statCard({ label: 'Total Net Worth', value: JI.formatIDR(s.totalNetWorth), sub: 'Bank + Portfolio + Aset − Utang', accent: 'text-emerald-600' }));
    grid.appendChild(statCard({ label: 'Tanggal', value: JI.formatCalendar(s.totalDays), sub: `Hari ke-${s.totalDays}`, mono: true }));
    grid.appendChild(statCard({ label: 'Portfolio', value: JI.formatIDR(portfolioValue), sub: `${(s.portfolio || []).length} posisi terbuka`, accent: 'text-blue-600' }));
    grid.appendChild(statCard({ label: 'Aset Fisik', value: JI.formatIDR(physicalValue), sub: `Kapasitas kantor: ${s.physicalAssets.officeCapacity} pegawai`, accent: 'text-violet-600' }));
    panel.appendChild(grid);

    /* Company Level */
    const lvlCard = JI.el('div', { class: 'ji-card p-6 mb-6' });
    lvlCard.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 mb-4 flex-wrap' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-xs uppercase tracking-wider text-slate-500' }, 'Company Level'),
        JI.el('h3', { class: 'text-xl sm:text-2xl font-bold mt-1' }, `Level ${s.companyLevel} · ${title}`),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-xs text-slate-500' }, 'XP'),
        JI.el('p', { class: 'font-mono font-semibold' }, `${s.companyXP.toLocaleString('id-ID')} / ${xpNeed.toLocaleString('id-ID')}`),
      ]),
    ]));
    const xpBar = JI.el('div', { class: 'xp-bar' });
    xpBar.appendChild(JI.el('span', { style: `width:${xpPct}%` }));
    lvlCard.appendChild(xpBar);
    panel.appendChild(lvlCard);

    /* Today's news preview */
    const news = s.dailyNews || [];
    const newsCard = JI.el('div', { class: 'ji-card p-6 mb-6' });
    newsCard.appendChild(JI.el('div', { class: 'flex items-center justify-between mb-4' }, [
      JI.el('h3', { class: 'font-bold text-slate-900' }, '📰 Berita Hari Ini'),
      JI.el('button', {
        class: 'text-xs text-emerald-700 hover:underline',
        onclick: () => switchTab('news'),
      }, 'Lihat semua →'),
    ]));
    if (!news.length) {
      newsCard.appendChild(JI.el('p', { class: 'text-sm text-slate-500' },
        'Belum ada berita. Tekan "Next Day →" untuk memulai siklus pasar.'));
    } else {
      const list = JI.el('div', { class: 'space-y-2' });
      news.forEach(n => list.appendChild(newsRow(n, 'sm')));
      newsCard.appendChild(list);
    }
    panel.appendChild(newsCard);

    /* Quick actions */
    const quick = JI.el('div', { class: 'grid grid-cols-2 sm:grid-cols-4 gap-3' });
    [
      { id: 'banking',   label: 'Banking',     icon: '🏦' },
      { id: 'market',    label: 'Market',      icon: '📈' },
      { id: 'portfolio', label: 'Portfolio',   icon: '💼' },
      { id: 'aset',      label: 'Aset Fisik',  icon: '🏢' },
    ].forEach(q => quick.appendChild(JI.el('button', {
      class: 'ji-card p-4 text-left hover:shadow-md transition-shadow',
      onclick: () => switchTab(q.id),
    }, [
      JI.el('div', { class: 'text-2xl mb-2' }, q.icon),
      JI.el('p', { class: 'text-sm font-semibold' }, q.label),
    ])));
    panel.appendChild(quick);
  }

  function statCard({ label, value, sub, accent = 'text-slate-900', mono = false }) {
    return JI.el('div', { class: 'ji-card p-5' }, [
      JI.el('p', { class: 'text-xs uppercase tracking-wider text-slate-500' }, label),
      JI.el('p', { class: `${mono ? 'font-mono ' : ''}text-xl sm:text-2xl font-bold mt-1 ${accent}` }, value),
      sub ? JI.el('p', { class: 'text-xs text-slate-400 mt-1' }, sub) : null,
    ]);
  }

  /* =========================================================================
     BANKING panel (Phase 1 + Phase 2 CC repay)
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

    const header = JI.el('div', { class: `bank-card ${bank.themeClass} p-5 text-white relative` });
    header.appendChild(JI.el('div', { class: 'gloss' }));
    header.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 relative' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-xs uppercase tracking-widest opacity-80' }, bank.shortName),
        JI.el('h3', { class: 'text-lg font-bold leading-tight' }, bank.name),
        JI.el('p', { class: 'text-[11px] opacity-70 mt-1' }, bank.tagline),
      ]),
      JI.el('span', { class: `tier-badge ${JI.tierBadgeClass(bank.debitTier)}` }, bank.debitTier),
    ]));
    header.appendChild(JI.el('div', { class: 'mt-6 relative' }, [
      JI.el('p', { class: 'text-[11px] uppercase tracking-widest opacity-70' }, 'Saldo Tersedia'),
      JI.el('p', { class: 'text-2xl font-bold font-mono mt-1' }, JI.formatIDR(bank.balance)),
    ]));
    header.appendChild(JI.el('p', { class: 'mt-3 text-[10px] font-mono opacity-70 relative tracking-widest' },
      `**** **** **** ${(bank.id.toUpperCase() + '0000').slice(0, 4)}`));
    card.appendChild(header);

    const body = JI.el('div', { class: 'p-5 space-y-5' });
    body.appendChild(renderTransferSection(bank));
    body.appendChild(renderCreditCardSection(bank, offer));
    body.appendChild(renderLoanSection(bank, maxLoan));
    card.appendChild(body);
    return card;
  }

  function renderTransferSection(bank) {
    const s = JI.gameState;
    const others = s.banks.filter(b => b.id !== bank.id);
    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Transfer Antar Rekening', `Pindahkan dana dari ${bank.shortName}.`));
    const select = JI.el('select', { class: 'ji-input ji-select' });
    others.forEach(o => select.appendChild(JI.el('option', { value: o.id }, `${o.shortName} — ${JI.formatIDR(o.balance)}`)));
    const input = JI.el('input', { type: 'number', inputmode: 'numeric', min: '1', step: '1', placeholder: 'Nominal (Rp)', class: 'ji-input' });
    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-primary w-full',
      onclick: () => {
        const amount = JI.parseIDRInput(input.value);
        const r = JI.transfer(s, bank.id, select.value, amount);
        if (!r.ok) return JI.toast(r.error, 'error');
        JI.toast(`Transfer ${JI.formatIDR(r.amount)} berhasil.`);
        input.value = '';
        JI.saveState(s);
        renderHeader();
        renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
      },
    }, 'Transfer');
    wrap.appendChild(JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-2' }, [
      labelled('Tujuan', select),
      labelled('Nominal', input),
    ]));
    wrap.appendChild(JI.el('div', { class: 'mt-3' }, btn));
    return wrap;
  }

  function renderCreditCardSection(bank, offer) {
    const s = JI.gameState;
    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Kartu Kredit', 'Limit ditentukan dari saldo rekening saat ini.'));

    if (bank.creditCard.isApproved) {
      const usedPct = bank.creditCard.limit > 0 ? Math.round((bank.creditCard.used / bank.creditCard.limit) * 100) : 0;
      const available = bank.creditCard.limit - bank.creditCard.used;

      const box = JI.el('div', { class: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4' }, [
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
      wrap.appendChild(box);

      // Repay button (only when there is debt)
      if (bank.creditCard.used > 0) {
        const repayInput = JI.el('input', {
          type: 'number', inputmode: 'numeric', min: '1', step: '1',
          placeholder: `Maks ${JI.formatIDR(bank.creditCard.used)}`, class: 'ji-input mt-3',
        });
        const repayBtn = JI.el('button', {
          class: 'ji-btn ji-btn-success w-full mt-2',
          onclick: () => {
            const amt = JI.parseIDRInput(repayInput.value);
            const r = JI.repayCreditCard(s, bank.id, amt);
            if (!r.ok) return JI.toast(r.error, 'error');
            JI.toast(`Lunas sebagian ${JI.formatIDR(r.paid)} kartu kredit ${bank.shortName}.`);
            JI.saveState(s);
            renderHeader();
            renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
          },
        }, 'Lunasi Kartu Kredit');
        wrap.appendChild(repayInput);
        wrap.appendChild(repayBtn);
      }
      return wrap;
    }

    const info = JI.el('div', { class: 'rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm' });
    if (offer.eligible) {
      info.appendChild(JI.el('p', { class: 'text-slate-700' }, `Penawaran limit awal: ${JI.formatIDR(offer.limit)}`));
      info.appendChild(JI.el('p', { class: 'text-xs text-slate-500 mt-1' }, '50% dari saldo saat ini, maksimum Rp 100.000.000.'));
    } else {
      info.appendChild(JI.el('p', { class: 'text-amber-700' }, '⚠ Belum memenuhi syarat'));
      info.appendChild(JI.el('p', { class: 'text-xs text-slate-500 mt-1' }, offer.reason));
    }
    wrap.appendChild(info);

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-success w-full mt-3',
      onclick: () => {
        const r = JI.applyCreditCard(s, bank.id);
        if (!r.ok) return JI.toast(r.error, 'error');
        JI.toast(`Kartu kredit ${bank.shortName} disetujui (limit ${JI.formatIDR(r.limit)}).`);
        JI.saveState(s);
        renderHeader();
        renderBankingPanel(JI.$('[data-tab-panel="banking"]'));
      },
    }, 'Ajukan Kartu Kredit');
    if (!offer.eligible) btn.setAttribute('disabled', 'disabled');
    wrap.appendChild(btn);
    return wrap;
  }

  function renderLoanSection(bank, maxLoan) {
    const s = JI.gameState;
    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Pinjaman Bank (KTA)',
      `Bunga flat ${(JI.LOAN_INTEREST_FLAT * 100).toFixed(0)}% · Tenor ${JI.LOAN_TERM_DAYS} hari.`));

    if (bank.loan.isActive) {
      const totalRepay = Math.round(bank.loan.principal * (1 + JI.LOAN_INTEREST_FLAT));
      const paid = totalRepay - bank.loan.remaining;
      const pct = totalRepay > 0 ? JI.clamp(Math.round((paid / totalRepay) * 100), 0, 100) : 0;

      wrap.appendChild(JI.el('div', { class: 'rounded-xl border border-amber-200 bg-amber-50 p-4' }, [
        JI.el('div', { class: 'flex items-center justify-between flex-wrap gap-2' }, [
          JI.el('span', { class: 'text-amber-800 font-semibold text-sm' }, '● Pinjaman Aktif'),
          JI.el('span', { class: 'text-xs text-amber-800 font-mono' }, `${bank.loan.daysRemaining} hari tersisa`),
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

    const input = JI.el('input', { type: 'number', inputmode: 'numeric', min: '1', step: '1', placeholder: 'Nominal pokok (Rp)', class: 'ji-input' });
    const quoteEl = JI.el('div', { class: 'text-xs text-slate-500 mt-2 font-mono' }, `Maks. pinjaman: ${JI.formatIDR(maxLoan)}`);
    function updateQuote() {
      const p = JI.parseIDRInput(input.value);
      if (!p) { quoteEl.textContent = `Maks. pinjaman: ${JI.formatIDR(maxLoan)}`; return; }
      const q = JI.quoteLoan(p);
      quoteEl.textContent = `Total bayar ${JI.formatIDR(q.totalRepay)} · Cicilan/hari ${JI.formatIDR(q.dailyInstallment)} (${q.termDays} hari)`;
    }
    input.addEventListener('input', updateQuote);
    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-warning w-full mt-3',
      onclick: () => {
        const principal = JI.parseIDRInput(input.value);
        const r = JI.applyLoan(s, bank.id, principal);
        if (!r.ok) return JI.toast(r.error, 'error');
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

  /* =========================================================================
     MARKET panel
     ========================================================================= */
  let _marketFilter = 'all';

  function renderMarketPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between flex-wrap gap-3' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Market'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          'Saham Lokal, Crypto, dan Reksadana — total 45 instrumen. Tekan "Next Day →" untuk update harga.'),
      ]),
    ]));

    /* Category filter */
    const filterBar = JI.el('div', { class: 'flex flex-wrap gap-2 mb-4' });
    const filters = [
      { key: 'all',       label: 'Semua' },
      { key: 'saham',     label: 'Saham Lokal' },
      { key: 'crypto',    label: 'Crypto' },
      { key: 'reksadana', label: 'Reksadana' },
    ];
    filters.forEach(f => {
      filterBar.appendChild(JI.el('button', {
        class: `ji-btn ${_marketFilter === f.key ? 'ji-btn-primary' : 'ji-btn-ghost'} !text-xs sm:!text-sm`,
        onclick: () => { _marketFilter = f.key; renderMarketPanel(panel); },
      }, f.label));
    });
    panel.appendChild(filterBar);

    const all = JI.allAssets();
    const list = (_marketFilter === 'all') ? all : all.filter(a => a.category === _marketFilter);

    /* Desktop: table; Mobile: stacked cards */
    /* Desktop table */
    const tableWrap = JI.el('div', { class: 'hidden md:block ji-card overflow-hidden' });
    const scrollX = JI.el('div', { class: 'overflow-x-auto' });
    const table = JI.el('table', { class: 'w-full text-sm' });
    table.appendChild(JI.el('thead', { class: 'bg-slate-50 text-slate-600 text-xs uppercase' }, [
      JI.el('tr', {}, [
        th('Aset'), th('Kategori'), th('Harga', 'right'),
        th('Perubahan', 'right'), th('Vol Maks', 'right'), th('Aksi', 'right'),
      ]),
    ]));
    const tbody = JI.el('tbody', {});
    list.forEach(a => {
      const m = s.marketAssets[a.ticker] || { price: a.price, dayChangePct: 0 };
      const pct = m.dayChangePct || 0;
      const trendCls = pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-rose-600' : 'text-slate-500';
      const arrow   = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
      const catMeta = JI.CATEGORY[a.category];
      tbody.appendChild(JI.el('tr', { class: 'border-t border-slate-100 hover:bg-slate-50' }, [
        JI.el('td', { class: 'px-4 py-3' }, [
          JI.el('div', { class: 'font-bold font-mono' }, a.ticker),
          JI.el('div', { class: 'text-xs text-slate-500' }, a.name),
        ]),
        JI.el('td', { class: 'px-4 py-3' }, [
          JI.el('span', { class: 'text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700' },
            `${catMeta.icon} ${catMeta.label}`),
        ]),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatIDR(m.price)),
        JI.el('td', { class: `px-4 py-3 text-right font-mono ${trendCls}` },
          `${arrow} ${pct.toFixed(2)}%`),
        JI.el('td', { class: 'px-4 py-3 text-right text-xs text-slate-500 font-mono' },
          `±${(catMeta.maxSwing * 100).toFixed(catMeta.maxSwing < 0.01 ? 2 : 0)}%`),
        JI.el('td', { class: 'px-4 py-3 text-right' }, [
          JI.el('button', {
            class: 'ji-btn ji-btn-success !py-1 !px-3 !text-xs',
            onclick: () => openBuyAssetModal(a.ticker),
          }, 'Buy'),
        ]),
      ]));
    });
    table.appendChild(tbody);
    scrollX.appendChild(table);
    tableWrap.appendChild(scrollX);
    panel.appendChild(tableWrap);

    /* Mobile cards */
    const mobileList = JI.el('div', { class: 'md:hidden space-y-2' });
    list.forEach(a => mobileList.appendChild(marketMobileCard(a)));
    panel.appendChild(mobileList);
  }

  function marketMobileCard(a) {
    const s = JI.gameState;
    const m = s.marketAssets[a.ticker] || { price: a.price, dayChangePct: 0 };
    const pct = m.dayChangePct || 0;
    const trendCls = pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-rose-600' : 'text-slate-500';
    const arrow   = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
    const catMeta = JI.CATEGORY[a.category];
    return JI.el('div', { class: 'ji-card p-4' }, [
      JI.el('div', { class: 'flex items-center justify-between gap-3' }, [
        JI.el('div', {}, [
          JI.el('p', { class: 'font-bold font-mono' }, a.ticker),
          JI.el('p', { class: 'text-xs text-slate-500' }, a.name),
        ]),
        JI.el('span', { class: 'text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700' },
          `${catMeta.icon} ${catMeta.label}`),
      ]),
      JI.el('div', { class: 'mt-3 flex items-center justify-between gap-3' }, [
        JI.el('div', {}, [
          JI.el('p', { class: 'text-[10px] uppercase text-slate-400' }, 'Harga'),
          JI.el('p', { class: 'font-mono font-bold' }, JI.formatIDR(m.price)),
        ]),
        JI.el('div', {}, [
          JI.el('p', { class: 'text-[10px] uppercase text-slate-400' }, 'Perubahan'),
          JI.el('p', { class: `font-mono ${trendCls}` }, `${arrow} ${pct.toFixed(2)}%`),
        ]),
        JI.el('button', {
          class: 'ji-btn ji-btn-success !text-xs',
          onclick: () => openBuyAssetModal(a.ticker),
        }, 'Buy'),
      ]),
    ]);
  }

  function openBuyAssetModal(ticker) {
    const s = JI.gameState;
    const idx = JI.getAssetDef(ticker);
    if (!idx) return;
    const m = s.marketAssets[ticker];
    const catMeta = JI.CATEGORY[idx.category];

    const content = JI.el('div', { class: 'space-y-4' });
    content.appendChild(JI.el('div', { class: 'rounded-xl bg-slate-50 p-4' }, [
      JI.el('div', { class: 'flex items-center justify-between gap-2' }, [
        JI.el('div', {}, [
          JI.el('p', { class: 'font-mono font-bold text-lg' }, ticker),
          JI.el('p', { class: 'text-xs text-slate-500' }, idx.def.name),
        ]),
        JI.el('span', { class: 'text-xs px-2 py-1 rounded-full bg-white text-slate-700 border border-slate-200' },
          `${catMeta.icon} ${catMeta.label}`),
      ]),
      JI.el('p', { class: 'mt-3 text-2xl font-mono font-bold' }, JI.formatIDR(m.price)),
    ]));

    const qtyInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1', step: '1',
      placeholder: idx.category === 'saham' ? 'Jumlah lembar' : (idx.category === 'crypto' ? 'Jumlah unit (integer)' : 'Jumlah unit'),
      class: 'ji-input',
    });
    const costPreview = JI.el('p', { class: 'text-xs text-slate-500 font-mono mt-1' }, 'Total: Rp 0');
    qtyInput.addEventListener('input', () => {
      const q = JI.parseIDRInput(qtyInput.value);
      costPreview.textContent = `Total: ${JI.formatIDR(JI.calcCost(ticker, q))}`;
    });
    content.appendChild(labelled('Jumlah', qtyInput));
    content.appendChild(costPreview);

    const ps = paymentSelector({ allowCredit: true });
    content.appendChild(ps.container);

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-success w-full',
      onclick: () => {
        const qty = JI.parseIDRInput(qtyInput.value);
        const r = JI.buyAsset(s, ticker, qty, ps.getValue());
        if (!r.ok) return JI.toast(r.error, 'error');
        JI.toast(`Beli ${qty} ${ticker} senilai ${JI.formatIDR(r.totalCost)}.`);
        closeModal();
        JI.saveState(s);
        JI.renderAll();
      },
    }, 'Konfirmasi Pembelian');
    content.appendChild(btn);

    openModal(`Beli ${ticker}`, content);
  }

  /* =========================================================================
     PORTFOLIO panel
     ========================================================================= */
  function renderPortfolioPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    const holdings = s.portfolio || [];
    const totalCost = holdings.reduce((a, h) => a + h.totalCost, 0);
    const totalValue = holdings.reduce((a, h) => {
      const m = s.marketAssets[h.ticker]; return a + (m ? m.price : 0) * h.qty;
    }, 0);
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Portfolio'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' }, 'Posisi terbuka dan PnL belum direalisasi.'),
    ]));

    const grid = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5' });
    grid.appendChild(statCard({ label: 'Total Modal', value: JI.formatIDR(totalCost), accent: 'text-slate-900' }));
    grid.appendChild(statCard({ label: 'Nilai Saat Ini', value: JI.formatIDR(totalValue), accent: 'text-blue-600' }));
    grid.appendChild(statCard({
      label: 'Unrealized PnL',
      value: `${pnl >= 0 ? '+' : ''}${JI.formatIDR(pnl)}`,
      sub: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`,
      accent: pnl >= 0 ? 'text-emerald-600' : 'text-rose-600',
    }));
    panel.appendChild(grid);

    if (!holdings.length) {
      panel.appendChild(JI.el('div', { class: 'ji-card p-8 text-center' }, [
        JI.el('div', { class: 'text-5xl mb-3' }, '💼'),
        JI.el('p', { class: 'text-slate-500' }, 'Belum ada posisi. Buka tab Market untuk membeli aset.'),
      ]));
      return;
    }

    /* Desktop table */
    const tableWrap = JI.el('div', { class: 'hidden md:block ji-card overflow-hidden' });
    const scrollX = JI.el('div', { class: 'overflow-x-auto' });
    const table = JI.el('table', { class: 'w-full text-sm' });
    table.appendChild(JI.el('thead', { class: 'bg-slate-50 text-slate-600 text-xs uppercase' }, [
      JI.el('tr', {}, [
        th('Aset'), th('Qty', 'right'), th('Avg Price', 'right'),
        th('Harga Sekarang', 'right'), th('Nilai', 'right'),
        th('PnL', 'right'), th('Aksi', 'right'),
      ]),
    ]));
    const tbody = JI.el('tbody', {});
    holdings.forEach(h => {
      const m = s.marketAssets[h.ticker] || { price: h.avgPrice };
      const value = m.price * h.qty;
      const hPnl = value - h.totalCost;
      const hPct = h.totalCost > 0 ? (hPnl / h.totalCost) * 100 : 0;
      const cls = hPnl >= 0 ? 'text-emerald-600' : 'text-rose-600';
      tbody.appendChild(JI.el('tr', { class: 'border-t border-slate-100 hover:bg-slate-50' }, [
        JI.el('td', { class: 'px-4 py-3' }, [
          JI.el('div', { class: 'font-bold font-mono' }, h.ticker),
          JI.el('div', { class: 'text-xs text-slate-500' }, h.name),
        ]),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatQty(h.category, h.qty)),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatIDR(h.avgPrice)),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatIDR(m.price)),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatIDR(value)),
        JI.el('td', { class: `px-4 py-3 text-right font-mono ${cls}` },
          `${hPnl >= 0 ? '+' : ''}${JI.formatIDR(hPnl)} (${hPct.toFixed(2)}%)`),
        JI.el('td', { class: 'px-4 py-3 text-right' }, [
          JI.el('button', {
            class: 'ji-btn ji-btn-warning !py-1 !px-3 !text-xs',
            onclick: () => openSellAssetModal(h.ticker),
          }, 'Sell'),
        ]),
      ]));
    });
    table.appendChild(tbody);
    scrollX.appendChild(table);
    tableWrap.appendChild(scrollX);
    panel.appendChild(tableWrap);

    /* Mobile cards */
    const mob = JI.el('div', { class: 'md:hidden space-y-2' });
    holdings.forEach(h => {
      const m = s.marketAssets[h.ticker] || { price: h.avgPrice };
      const value = m.price * h.qty;
      const hPnl = value - h.totalCost;
      const cls = hPnl >= 0 ? 'text-emerald-600' : 'text-rose-600';
      mob.appendChild(JI.el('div', { class: 'ji-card p-4' }, [
        JI.el('div', { class: 'flex items-center justify-between' }, [
          JI.el('div', {}, [
            JI.el('p', { class: 'font-bold font-mono' }, h.ticker),
            JI.el('p', { class: 'text-xs text-slate-500' }, h.name),
          ]),
          JI.el('button', {
            class: 'ji-btn ji-btn-warning !text-xs',
            onclick: () => openSellAssetModal(h.ticker),
          }, 'Sell'),
        ]),
        JI.el('div', { class: 'grid grid-cols-2 gap-2 mt-3 text-xs' }, [
          kv('Qty', JI.formatQty(h.category, h.qty)),
          kv('Avg', JI.formatIDR(h.avgPrice)),
          kv('Harga', JI.formatIDR(m.price)),
          kv('Nilai', JI.formatIDR(value)),
        ]),
        JI.el('p', { class: `mt-2 text-sm font-mono ${cls}` },
          `PnL: ${hPnl >= 0 ? '+' : ''}${JI.formatIDR(hPnl)}`),
      ]));
    });
    panel.appendChild(mob);
  }

  function openSellAssetModal(ticker) {
    const s = JI.gameState;
    const h = s.portfolio.find(x => x.ticker === ticker);
    if (!h) return;
    const m = s.marketAssets[ticker];

    const content = JI.el('div', { class: 'space-y-4' });
    content.appendChild(JI.el('div', { class: 'rounded-xl bg-slate-50 p-4' }, [
      JI.el('p', { class: 'font-mono font-bold text-lg' }, ticker),
      JI.el('p', { class: 'text-xs text-slate-500' }, h.name),
      JI.el('div', { class: 'mt-3 grid grid-cols-2 gap-2 text-sm' }, [
        kv('Qty Dimiliki', JI.formatQty(h.category, h.qty)),
        kv('Harga Pasar', JI.formatIDR(m.price)),
        kv('Avg Cost', JI.formatIDR(h.avgPrice)),
      ]),
    ]));

    const qtyInput = JI.el('input', {
      type: 'number', inputmode: 'numeric', min: '1', step: '1',
      max: String(h.qty), placeholder: `Maks ${h.qty}`, class: 'ji-input',
    });
    const proceedsEl = JI.el('p', { class: 'text-xs text-slate-500 font-mono mt-1' }, 'Hasil: Rp 0');
    qtyInput.addEventListener('input', () => {
      const q = Math.min(JI.parseIDRInput(qtyInput.value), h.qty);
      proceedsEl.textContent = `Hasil: ${JI.formatIDR(q * m.price)}`;
    });
    content.appendChild(labelled('Jumlah Dijual', qtyInput));
    content.appendChild(proceedsEl);

    const bankSel = JI.el('select', { class: 'ji-input ji-select' });
    s.banks.forEach(b => bankSel.appendChild(JI.el('option', { value: b.id }, `${b.shortName} — ${JI.formatIDR(b.balance)}`)));
    content.appendChild(labelled('Setor ke Bank', bankSel));

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-warning w-full',
      onclick: () => {
        const q = Math.min(JI.parseIDRInput(qtyInput.value), h.qty);
        const r = JI.sellAsset(s, ticker, q, bankSel.value);
        if (!r.ok) return JI.toast(r.error, 'error');
        const sign = r.realizedPnL >= 0 ? '+' : '';
        JI.toast(`Jual ${q} ${ticker}: ${JI.formatIDR(r.proceeds)} (${sign}${JI.formatIDR(r.realizedPnL)}).`,
          r.realizedPnL >= 0 ? 'success' : 'warning');
        closeModal();
        JI.saveState(s);
        JI.renderAll();
      },
    }, 'Konfirmasi Jual');
    content.appendChild(btn);

    openModal(`Jual ${ticker}`, content);
  }

  /* =========================================================================
     NEWS panel
     ========================================================================= */
  function renderNewsPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, '📰 News Portal'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'Berita ekonomi & pasar dengan dampak langsung ke harga aset Anda.'),
    ]));

    const today = s.dailyNews || [];
    panel.appendChild(JI.el('h3', { class: 'font-semibold text-slate-700 mb-2' }, `Hari Ini — ${JI.formatCalendar(s.totalDays)}`));
    if (!today.length) {
      panel.appendChild(JI.el('div', { class: 'ji-card p-6 text-center text-slate-500 text-sm mb-6' },
        'Belum ada berita hari ini. Tekan "Next Day →" untuk memulai siklus pasar.'));
    } else {
      const list = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-6' });
      today.forEach(n => list.appendChild(newsCard(n)));
      panel.appendChild(list);
    }

    /* History */
    const history = (s.newsHistory || []).filter(n => n.day !== s.totalDays);
    if (history.length) {
      panel.appendChild(JI.el('h3', { class: 'font-semibold text-slate-700 mb-2 mt-4' }, 'Arsip'));
      const arch = JI.el('div', { class: 'space-y-2' });
      history.slice(0, 30).forEach(n => arch.appendChild(newsRow(n)));
      panel.appendChild(arch);
    }
  }

  function moodColor(m) {
    return m === 'bullish' ? 'border-emerald-400 bg-emerald-50' :
           m === 'bearish' ? 'border-rose-400 bg-rose-50' :
                            'border-slate-300 bg-slate-50';
  }

  function newsCard(n) {
    return JI.el('div', { class: `rounded-xl border-l-4 ${moodColor(n.mood)} p-4 shadow-sm` }, [
      JI.el('div', { class: 'flex items-center gap-2 text-xs text-slate-500 mb-1' }, [
        JI.el('span', { class: 'text-base' }, n.icon || '📌'),
        JI.el('span', {}, `Hari ${n.day}`),
        JI.el('span', { class: 'uppercase tracking-wider font-semibold' }, n.mood || 'neutral'),
      ]),
      JI.el('h4', { class: 'font-bold text-slate-900 leading-snug' }, n.headline),
      JI.el('p', { class: 'mt-1 text-sm text-slate-600' }, n.body),
    ]);
  }

  function newsRow(n, size = 'md') {
    const small = size === 'sm';
    return JI.el('div', { class: `rounded-lg border-l-4 ${moodColor(n.mood)} ${small ? 'px-3 py-2' : 'px-4 py-3'}` }, [
      JI.el('div', { class: 'flex items-center gap-2 text-xs text-slate-500' }, [
        JI.el('span', {}, n.icon || '📌'),
        JI.el('span', {}, `Hari ${n.day}`),
      ]),
      JI.el('p', { class: `font-semibold text-slate-900 ${small ? 'text-sm' : ''}` }, n.headline),
    ]);
  }

  /* =========================================================================
     ASET FISIK panel — Properti, Mobil, Motor
     ========================================================================= */
  function renderAsetPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    const totalValue = JI.totalPhysicalValue(s);
    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between flex-wrap gap-3' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Aset Fisik'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          'Properti kantor, mobil, dan motor — investasi nyata yang menambah net worth.'),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-[10px] uppercase tracking-wider text-slate-500' }, 'Total Aset Fisik'),
        JI.el('p', { class: 'font-mono font-bold text-violet-600 text-lg' }, JI.formatIDR(totalValue)),
        JI.el('p', { class: 'text-xs text-slate-500' },
          `Kapasitas Kantor: ${s.physicalAssets.officeCapacity} pegawai`),
      ]),
    ]));

    /* Section: Properti Kantor */
    panel.appendChild(JI.el('h3', { class: 'text-xl font-bold mb-3 flex items-center gap-2' },
      [JI.el('span', { class: 'text-2xl' }, '🏢'), 'Properti Kantor']));
    const propGrid = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-8' });
    JI.allProperties().forEach(p => propGrid.appendChild(propertyCard(p)));
    panel.appendChild(propGrid);

    /* Section: Mobil */
    panel.appendChild(JI.el('h3', { class: 'text-xl font-bold mb-3 flex items-center gap-2' },
      [JI.el('span', { class: 'text-2xl' }, '🚗'), 'Mobil']));
    JI.CAR_BRANDS.forEach(b => panel.appendChild(brandBlock(b, 'car')));

    /* Section: Motor */
    panel.appendChild(JI.el('h3', { class: 'text-xl font-bold mb-3 mt-6 flex items-center gap-2' },
      [JI.el('span', { class: 'text-2xl' }, '🏍️'), 'Motor']));
    JI.MOTORCYCLE_BRANDS.forEach(b => panel.appendChild(brandBlock(b, 'motorcycle')));
  }

  function propertyCard(p) {
    const s = JI.gameState;
    const owned = JI.ownedCount(s, 'property', p.key);
    return JI.el('div', { class: 'ji-card p-5 flex flex-col' }, [
      JI.el('div', { class: 'flex items-start justify-between' }, [
        JI.el('div', { class: 'text-5xl' }, p.icon),
        JI.el('span', { class: 'text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700 font-semibold' },
          p.tier),
      ]),
      JI.el('h4', { class: 'mt-3 text-lg font-bold' }, p.name),
      JI.el('p', { class: 'text-sm text-slate-500 mt-1 flex-1' }, p.blurb),
      JI.el('div', { class: 'mt-3 flex items-center gap-2 text-xs' }, [
        JI.el('span', { class: 'px-2 py-1 rounded bg-slate-100 text-slate-700 font-semibold' },
          `Kapasitas: ${p.capacity} pegawai`),
        owned ? JI.el('span', { class: 'px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold' },
          `Dimiliki: ${owned}`) : null,
      ]),
      JI.el('p', { class: 'mt-3 font-mono text-xl font-bold' }, JI.formatIDR(p.price)),
      JI.el('button', {
        class: 'ji-btn ji-btn-success w-full mt-3',
        onclick: () => openBuyPhysicalModal('property', p.key),
      }, 'Beli'),
    ]);
  }

  function brandBlock(brand, kind) {
    const s = JI.gameState;
    const block = JI.el('div', { class: 'ji-card p-5 mb-4' });
    block.appendChild(JI.el('div', { class: 'flex items-center justify-between mb-4 flex-wrap gap-2' }, [
      JI.el('div', {}, [
        JI.el('h4', { class: 'text-lg font-bold flex items-center gap-2' }, [
          JI.el('span', { class: 'text-xl' }, brand.flag || '🏁'),
          brand.brand,
          brand.isElectric ? JI.el('span', {
            class: 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold',
          }, '⚡ Mobil Listrik') : null,
        ]),
        brand.tagline ? JI.el('p', { class: 'text-xs text-slate-500 italic' }, brand.tagline) : null,
      ]),
    ]));

    const grid = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' });
    brand.models.forEach(m => {
      const owned = JI.ownedCount(s, kind, m.key);
      const emoji = kind === 'car' ? (brand.isElectric ? '⚡' : '🚗') : '🏍️';
      grid.appendChild(JI.el('div', { class: 'rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow' }, [
        JI.el('div', { class: 'flex items-start justify-between' }, [
          JI.el('div', { class: 'text-4xl' }, emoji),
          owned ? JI.el('span', { class: 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold' },
            `× ${owned}`) : null,
        ]),
        JI.el('p', { class: 'mt-2 text-sm font-bold' }, m.name),
        JI.el('p', { class: 'text-[11px] text-slate-500' }, m.tier),
        JI.el('p', { class: 'mt-2 font-mono font-bold' }, JI.formatIDR(m.price)),
        JI.el('button', {
          class: 'ji-btn ji-btn-success w-full mt-3 !text-xs',
          onclick: () => openBuyPhysicalModal(kind, m.key),
        }, 'Beli'),
      ]));
    });
    block.appendChild(grid);
    return block;
  }

  function openBuyPhysicalModal(kind, key) {
    const s = JI.gameState;
    let def;
    if (kind === 'property')   def = JI.findPropertyDef(key);
    if (kind === 'car')        def = JI.findCarDef(key);
    if (kind === 'motorcycle') def = JI.findMotorcycleDef(key);
    if (!def) return;

    const content = JI.el('div', { class: 'space-y-4' });
    const emoji = kind === 'property' ? def.icon || '🏢' :
                  kind === 'car' ? (def.isElectric ? '⚡' : '🚗') : '🏍️';
    content.appendChild(JI.el('div', { class: 'rounded-xl bg-slate-50 p-4 flex items-start gap-4' }, [
      JI.el('div', { class: 'text-5xl' }, emoji),
      JI.el('div', {}, [
        JI.el('p', { class: 'font-bold' }, def.name),
        JI.el('p', { class: 'text-xs text-slate-500' }, def.tier || (def.brand || '')),
        JI.el('p', { class: 'mt-2 font-mono text-lg font-bold' }, JI.formatIDR(def.price)),
        kind === 'property' ? JI.el('p', { class: 'mt-1 text-xs text-violet-700 font-semibold' },
          `Menambah kapasitas kantor +${def.capacity} pegawai`) : null,
      ]),
    ]));

    const ps = paymentSelector({ allowCredit: true });
    content.appendChild(ps.container);

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-success w-full',
      onclick: () => {
        const r = JI.buyPhysicalAsset(s, kind, key, ps.getValue());
        if (!r.ok) return JI.toast(r.error, 'error');
        JI.toast(`${def.name} berhasil dibeli.`);
        closeModal();
        JI.saveState(s);
        JI.renderAll();
      },
    }, `Konfirmasi Beli ${def.name}`);
    content.appendChild(btn);

    openModal(`Beli ${def.name}`, content);
  }

  /* =========================================================================
     Small UI helpers
     ========================================================================= */
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

  function th(text, align = 'left') {
    return JI.el('th', { class: `px-4 py-3 text-${align} font-semibold` }, text);
  }

  /* ---------- Entry: render everything ---------- */
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
    openModal,
    closeModal,
    openBuyAssetModal,
    openSellAssetModal,
    openBuyPhysicalModal,
  });
})(window);
