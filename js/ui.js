/* =========================================================================
   ui.js — Tab system, header, panels (Home, Banking, Market, Portfolio,
   News, Aset Fisik) + modal/payment helpers + Next Day button.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Tab definitions ---------- */
  const TABS = [
    { id: 'home',      label: 'Home',         icon: '🏠', mobilePrimary: true  },
    { id: 'banking',   label: 'Banking',      icon: '🏦', mobilePrimary: true  },
    { id: 'vc',        label: 'Venture Cap.', icon: '🚀', mobilePrimary: true  },
    { id: 'market',    label: 'Market',       icon: '📈', mobilePrimary: true  },
    { id: 'portfolio', label: 'Portfolio',    icon: '💼', mobilePrimary: false },
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
      vc:        renderVCPanel,
      market:    renderMarketPanel,
      portfolio: renderPortfolioPanel,
      news:      renderNewsPanel,
      aset:      renderAsetPanel,
      coretax:   renderCoreTaxPanel,
      hrd:       renderHRDPanel,
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
    const isPublic = !!(s.ipo && s.ipo.isPublic);
    const title  = isPublic ? 'Public Listed Company' : JI.getCompanyTitle(s.companyLevel);
    const tier   = JI.getCompanyTitleTier ? JI.getCompanyTitleTier(s.companyLevel) : { icon: '🏛' };
    const titleIcon = isPublic ? '◉' : tier.icon;
    const perks  = JI.getActivePerks ? JI.getActivePerks(s) : { analyst: null, taxConsultant: null, broker: null };

    panel.innerHTML = '';

    /* Hero */
    const hero = JI.el('div', {
      class: 'ji-card p-6 sm:p-8 mb-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative overflow-hidden'
    });
    hero.appendChild(JI.el('div', { class: 'absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none' }));
    hero.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 flex-wrap' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-xs uppercase tracking-[0.3em] text-emerald-400 mb-2' },
          isPublic ? 'Public Listed Company' : 'Welcome back, Juragan'),
        JI.el('h2', { class: 'text-2xl sm:text-4xl font-extrabold tracking-tight' }, 'Juragan Investasi: Capitalist Tycoon'),
        JI.el('p', { class: 'text-slate-300 mt-2 max-w-xl text-sm sm:text-base' },
          isPublic
            ? 'Anda telah melantai di Bursa Efek Indonesia. Wajib bayar dividen 5% kepada publik setiap 12 bulan.'
            : 'Bangun imperium investasi Anda di Indonesia. Kelola kas, manfaatkan kredit, dan tumbuhkan kekayaan dari hari ke hari.'),
      ]),
      JI.el('div', { class: 'tier-pill flex items-center gap-2 self-start mt-1' }, [
        JI.el('span', { class: 'text-xl leading-none' }, titleIcon),
        JI.el('div', {}, [
          JI.el('p', { class: 'text-[10px] uppercase tracking-widest text-emerald-300/80' }, `Level ${s.companyLevel}`),
          JI.el('p', { class: 'font-bold text-sm leading-tight' }, title),
        ]),
      ]),
    ]));
    panel.appendChild(hero);

    /* Stats */
    const portfolioValue = (s.portfolio || []).reduce((acc, h) => {
      const m = s.marketAssets[h.ticker];
      return acc + (m ? m.price : 0) * h.qty;
    }, 0);
    const physicalValue = JI.totalPhysicalValue ? JI.totalPhysicalValue(s) : 0;
    const cap     = (s.physicalAssets && s.physicalAssets.officeCapacity) || 0;
    const hired   = (s.hiredEmployees || []).length;
    const unpaidTax = JI.totalUnpaidTax ? JI.totalUnpaidTax(s) : 0;
    const ccDebt  = JI.totalCreditCardDebt ? JI.totalCreditCardDebt(s) : 0;

    const grid = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6' });
    grid.appendChild(statCard({ label: 'Total Net Worth', value: JI.formatIDR(s.totalNetWorth), sub: 'Bank + Portfolio + Aset − Utang', accent: 'text-emerald-600' }));
    grid.appendChild(statCard({ label: 'Tanggal', value: JI.formatCalendar(s.totalDays), sub: `Hari ke-${s.totalDays}`, mono: true }));
    grid.appendChild(statCard({ label: 'Portfolio', value: JI.formatIDR(portfolioValue), sub: `${(s.portfolio || []).length} posisi terbuka`, accent: 'text-blue-600' }));
    grid.appendChild(statCard({ label: 'Aset Fisik', value: JI.formatIDR(physicalValue), sub: `Kapasitas kantor: ${cap} pegawai`, accent: 'text-violet-600' }));
    panel.appendChild(grid);

    /* Company Level (with tier icon) */
    const lvlCard = JI.el('div', { class: 'ji-card p-6 mb-6' });
    lvlCard.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 mb-4 flex-wrap' }, [
      JI.el('div', { class: 'flex items-center gap-3' }, [
        JI.el('div', { class: 'text-3xl' }, tier.icon),
        JI.el('div', {}, [
          JI.el('p', { class: 'text-xs uppercase tracking-wider text-slate-500' }, 'Company Level'),
          JI.el('h3', { class: 'text-xl sm:text-2xl font-bold mt-1' }, `Level ${s.companyLevel} · ${title}`),
          JI.el('p', { class: 'text-[11px] text-slate-500 mt-1' },
            `Tier: L${tier.min}${tier.max === Infinity ? '+' : `-${tier.max}`}`),
        ]),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-xs text-slate-500' }, 'XP'),
        JI.el('p', { class: 'font-mono font-semibold' }, `${s.companyXP.toLocaleString('id-ID')} / ${xpNeed.toLocaleString('id-ID')}`),
      ]),
    ]));
    const xpBar = JI.el('div', { class: 'xp-bar' });
    xpBar.appendChild(JI.el('span', { style: `width:${xpPct}%` }));
    lvlCard.appendChild(xpBar);
    lvlCard.appendChild(JI.el('p', { class: 'mt-3 text-xs text-slate-500' },
      `Naik level dari profit jual aset (50 XP + 1 XP per Rp 1jt profit). Threshold berikutnya: Level ${s.companyLevel + 1}.`));
    panel.appendChild(lvlCard);

    /* Phase 4: IPO go-public card */
    panel.appendChild(renderIPOCard(s));

    /* Operations strip — capacity, payroll, unpaid tax, CC debt */
    const opsGrid = JI.el('div', { class: 'grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6' });
    opsGrid.appendChild(miniStatCard({
      label: 'HRD',
      value: `${hired} / ${cap}`,
      sub: cap > 0 ? `${cap - hired} slot tersedia` : 'Beli properti dulu',
      accent: hired >= cap ? 'text-amber-600' : 'text-slate-900',
      onClick: () => switchTab('hrd'),
    }));
    opsGrid.appendChild(miniStatCard({
      label: 'Gaji Bulanan',
      value: JI.formatIDR(JI.totalMonthlySalary ? JI.totalMonthlySalary(s) : 0),
      sub: 'ditagih per 30 hari',
      accent: 'text-slate-900',
      onClick: () => switchTab('hrd'),
    }));
    opsGrid.appendChild(miniStatCard({
      label: 'Pajak Belum Dibayar',
      value: JI.formatIDR(unpaidTax),
      sub: unpaidTax > 0 ? 'Buka CoreTax DJP' : 'Aman',
      accent: unpaidTax > 0 ? 'text-rose-600' : 'text-emerald-600',
      onClick: () => switchTab('coretax'),
    }));
    opsGrid.appendChild(miniStatCard({
      label: 'Utang Kartu Kredit',
      value: JI.formatIDR(ccDebt),
      sub: ccDebt > 0 ? '5%/bulan bunga' : 'Tidak ada',
      accent: ccDebt > 0 ? 'text-amber-600' : 'text-slate-900',
      onClick: () => switchTab('banking'),
    }));
    panel.appendChild(opsGrid);

    /* Analyst predictions (if hired) */
    if (perks.analyst && JI.predictMarketImpacts) {
      const preds = JI.predictMarketImpacts(s, perks.analyst.predictionCount || 1);
      if (preds.length) {
        const predCard = JI.el('div', { class: 'ji-card p-6 mb-6 border-l-4 border-emerald-500' });
        predCard.appendChild(JI.el('div', { class: 'flex items-center justify-between flex-wrap gap-2 mb-3' }, [
          JI.el('h3', { class: 'font-bold text-slate-900 flex items-center gap-2' }, [
            JI.el('span', { class: 'text-xl' }, '📊'),
            `Prediksi Analis (${perks.analyst.tierName})`,
          ]),
          JI.el('span', { class: 'text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold uppercase tracking-wider' },
            `${preds.length} aset`),
        ]));
        const list = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-2' });
        preds.forEach(p => list.appendChild(predictionRow(p)));
        predCard.appendChild(list);
        panel.appendChild(predCard);
      }
    }

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
    const quick = JI.el('div', { class: 'grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6' });
    [
      { id: 'banking',   label: 'Banking',     icon: '🏦' },
      { id: 'market',    label: 'Market',      icon: '📈' },
      { id: 'portfolio', label: 'Portfolio',   icon: '💼' },
      { id: 'hrd',       label: 'HRD',         icon: '👥' },
    ].forEach(q => quick.appendChild(JI.el('button', {
      class: 'ji-card p-4 text-left hover:shadow-md transition-shadow',
      onclick: () => switchTab(q.id),
    }, [
      JI.el('div', { class: 'text-2xl mb-2' }, q.icon),
      JI.el('p', { class: 'text-sm font-semibold' }, q.label),
    ])));
    panel.appendChild(quick);

    /* Save / Reset row */
    const sysRow = JI.el('div', { class: 'flex flex-wrap items-center gap-2' });
    sysRow.appendChild(JI.el('button', {
      class: 'ji-btn ji-btn-ghost !text-xs',
      onclick: () => JI.saveGame && JI.saveGame(),
    }, '💾 Save Game'));
    sysRow.appendChild(JI.el('button', {
      class: 'ji-btn ji-btn-ghost !text-xs',
      onclick: () => JI.loadGame && JI.loadGame(),
    }, '📂 Load Game'));
    sysRow.appendChild(JI.el('button', {
      class: 'ji-btn !text-xs !bg-rose-600 !text-white hover:!bg-rose-700',
      onclick: () => JI.resetGame && JI.resetGame(),
    }, '⟳ Reset Game'));
    sysRow.appendChild(JI.el('p', { class: 'text-[11px] text-slate-400 ml-auto font-mono' },
      `Ver. ${JI.STATE_VERSION || '?'}`));
    panel.appendChild(sysRow);
  }

  function statCard({ label, value, sub, accent = 'text-slate-900', mono = false }) {
    return JI.el('div', { class: 'ji-card p-5' }, [
      JI.el('p', { class: 'text-xs uppercase tracking-wider text-slate-500' }, label),
      JI.el('p', { class: `${mono ? 'font-mono ' : ''}text-xl sm:text-2xl font-bold mt-1 ${accent}` }, value),
      sub ? JI.el('p', { class: 'text-xs text-slate-400 mt-1' }, sub) : null,
    ]);
  }

  function miniStatCard({ label, value, sub, accent = 'text-slate-900', onClick }) {
    return JI.el('button', {
      class: 'ji-card p-4 text-left hover:shadow-md transition-shadow w-full',
      onclick: onClick || (() => {}),
    }, [
      JI.el('p', { class: 'text-[10px] uppercase tracking-wider text-slate-500' }, label),
      JI.el('p', { class: `text-base sm:text-lg font-bold mt-1 font-mono ${accent}` }, value),
      sub ? JI.el('p', { class: 'text-[10px] text-slate-400 mt-0.5' }, sub) : null,
    ]);
  }

  function predictionRow(p) {
    const dirCls = p.direction === 'up' ? 'text-emerald-600' : 'text-rose-600';
    const arrow  = p.direction === 'up' ? '▲' : '▼';
    const conf   = Math.round((p.confidence || 0) * 100);
    return JI.el('div', { class: 'rounded-lg border border-slate-200 p-3 flex items-center gap-3' }, [
      JI.el('div', { class: `text-lg font-mono font-bold ${dirCls}` }, arrow),
      JI.el('div', { class: 'flex-1 min-w-0' }, [
        JI.el('p', { class: 'font-mono font-bold text-sm' }, p.ticker),
        JI.el('p', { class: 'text-[11px] text-slate-500 truncate' }, p.name),
        p.reasons && p.reasons.length ?
          JI.el('p', { class: 'text-[10px] text-slate-400 truncate mt-0.5' },
            `${p.reasons[0].icon || '📌'} ${p.reasons[0].headline}`) : null,
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-[10px] uppercase text-slate-400' }, 'Konfiden'),
        JI.el('p', { class: `text-sm font-mono font-bold ${dirCls}` }, `${conf}%`),
      ]),
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
    body.appendChild(renderDepositoSection(bank));
    body.appendChild(renderHistorySection(bank));
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

    /* Analyst predictions index — for prediction badge in tables/cards. */
    const perks = JI.getActivePerks ? JI.getActivePerks(JI.gameState) : { analyst: null };
    const predIndex = {};
    if (perks.analyst && JI.predictMarketImpacts) {
      const preds = JI.predictMarketImpacts(JI.gameState, perks.analyst.predictionCount || 1);
      preds.forEach((p, i) => { predIndex[p.ticker] = { rank: i + 1, ...p }; });
    }
    if (perks.analyst) {
      panel.appendChild(JI.el('div', {
        class: 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 mb-3 text-xs text-emerald-800 flex items-center gap-2'
      }, [
        JI.el('span', { class: 'text-base' }, '📊'),
        JI.el('span', {}, `Analis ${perks.analyst.tierName} aktif: ${Object.keys(predIndex).length} aset diprediksi (lihat badge ▲ / ▼ pada tabel).`),
      ]));
    }

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
      const pred = predIndex[a.ticker];
      const predBadge = pred ? JI.el('span', {
        class: `ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${pred.direction === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`,
        title: `Prediksi analis #${pred.rank}: ${pred.direction === 'up' ? 'naik' : 'turun'}`,
      }, [
        JI.el('span', {}, pred.direction === 'up' ? '▲' : '▼'),
        JI.el('span', { class: 'ml-1' }, `#${pred.rank}`),
      ]) : null;
      // Phase 6: ownership badge for Local Stocks.
      const ownPct = JI.ownershipPct ? JI.ownershipPct(s, a.ticker) : 0;
      const isBd   = JI.isBandar     ? JI.isBandar(s, a.ticker)     : false;
      const ownBadge = (a.category === 'saham' && a.outstandingShares && ownPct > 0) ? JI.el('span', {
        class: `ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${isBd ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`,
        title: isBd ? 'Pemegang Saham Pengendali (Bandar)' : 'Kepemilikan',
      }, `${isBd ? '👑 ' : ''}${(ownPct * 100).toFixed(1)}%`) : null;
      tbody.appendChild(JI.el('tr', { class: 'border-t border-slate-100 hover:bg-slate-50' }, [
        JI.el('td', { class: 'px-4 py-3' }, [
          JI.el('div', { class: 'font-bold font-mono flex items-center flex-wrap' }, [
            JI.el('span', {}, a.ticker),
            predBadge,
            ownBadge,
          ]),
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
    list.forEach(a => mobileList.appendChild(marketMobileCard(a, predIndex[a.ticker])));
    panel.appendChild(mobileList);
  }

  function marketMobileCard(a, pred) {
    const s = JI.gameState;
    const m = s.marketAssets[a.ticker] || { price: a.price, dayChangePct: 0 };
    const pct = m.dayChangePct || 0;
    const trendCls = pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-rose-600' : 'text-slate-500';
    const arrow   = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
    const catMeta = JI.CATEGORY[a.category];
    const predBadge = pred ? JI.el('span', {
      class: `inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ml-2 ${pred.direction === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`,
    }, [
      JI.el('span', {}, pred.direction === 'up' ? '▲' : '▼'),
      JI.el('span', { class: 'ml-1' }, `#${pred.rank}`),
    ]) : null;
    // Phase 6: ownership badge for Local Stocks.
    const ownPct = JI.ownershipPct ? JI.ownershipPct(s, a.ticker) : 0;
    const isBd   = JI.isBandar     ? JI.isBandar(s, a.ticker)     : false;
    const ownBadge = (a.category === 'saham' && a.outstandingShares && ownPct > 0) ? JI.el('span', {
      class: `ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${isBd ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`,
      title: isBd ? 'Pemegang Saham Pengendali (Bandar)' : 'Kepemilikan',
    }, `${isBd ? '👑 ' : ''}${(ownPct * 100).toFixed(1)}%`) : null;
    return JI.el('div', { class: 'ji-card p-4' }, [
      JI.el('div', { class: 'flex items-center justify-between gap-3' }, [
        JI.el('div', {}, [
          JI.el('p', { class: 'font-bold font-mono flex items-center flex-wrap' }, [
            JI.el('span', {}, a.ticker),
            predBadge,
            ownBadge,
          ]),
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
    const costPreview = JI.el('div', { class: 'text-xs text-slate-500 font-mono mt-1 space-y-0.5' });
    function updateCostPreview() {
      const q = JI.parseIDRInput(qtyInput.value);
      costPreview.innerHTML = '';
      if (!q) {
        costPreview.appendChild(JI.el('p', {}, 'Masukkan jumlah untuk preview.'));
        return;
      }
      const quote = JI.quoteBuy(JI.gameState, ticker, q);
      if (!quote) return;
      const lines = [
        ['Harga × Qty', JI.formatIDR(quote.grossCost)],
        [`Fee broker (${(quote.broker.feeRate*100).toFixed(2)}%)`, JI.formatIDR(quote.fee)],
      ];
      if (quote.cashback > 0) lines.push([`Cashback (${(quote.broker.cashbackRate*100).toFixed(2)}%)`, `+ ${JI.formatIDR(quote.cashback)}`]);
      lines.push(['Total tagihan', JI.formatIDR(quote.totalCharge)]);
      lines.forEach(([k, v]) => {
        costPreview.appendChild(JI.el('p', { class: 'flex justify-between gap-2' }, [
          JI.el('span', {}, k),
          JI.el('span', { class: 'font-bold' }, v),
        ]));
      });
    }
    qtyInput.addEventListener('input', updateCostPreview);
    updateCostPreview();
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
        const cb = r.cashback > 0 ? ` (cashback +${JI.formatIDR(r.cashback)})` : '';
        JI.toast(`Beli ${qty} ${ticker} senilai ${JI.formatIDR(r.totalCharge)}${cb}.`);
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
      // Phase 6 — Bandar status & Goreng Saham availability for Local Stocks.
      const isStock = h.category === 'saham';
      const ownPct = (isStock && JI.ownershipPct) ? JI.ownershipPct(s, h.ticker) : 0;
      const isBd   = (isStock && JI.isBandar)     ? JI.isBandar(s, h.ticker)     : false;
      const ownBadge = (isStock && ownPct > 0) ? JI.el('span', {
        class: `ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${isBd ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`,
        title: isBd ? 'Pemegang Saham Pengendali (Bandar)' : 'Kepemilikan',
      }, `${isBd ? '👑 ' : ''}${(ownPct * 100).toFixed(1)}%`) : null;
      const actions = JI.el('div', { class: 'flex flex-wrap gap-1 justify-end' }, [
        JI.el('button', {
          class: 'ji-btn ji-btn-warning !py-1 !px-3 !text-xs',
          onclick: () => openSellAssetModal(h.ticker),
        }, 'Sell'),
        isBd ? JI.el('button', {
          class: 'ji-btn !py-1 !px-3 !text-xs !bg-amber-600 !text-white hover:!bg-amber-700',
          onclick: () => openGorengModal(h.ticker),
          title: 'Goreng Saham — guaranteed +40% next day',
        }, '🚨 Goreng') : null,
      ]);
      tbody.appendChild(JI.el('tr', { class: 'border-t border-slate-100 hover:bg-slate-50' }, [
        JI.el('td', { class: 'px-4 py-3' }, [
          JI.el('div', { class: 'font-bold font-mono flex items-center flex-wrap' }, [
            JI.el('span', {}, h.ticker),
            ownBadge,
          ]),
          JI.el('div', { class: 'text-xs text-slate-500' }, h.name),
        ]),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatQty(h.category, h.qty)),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatIDR(h.avgPrice)),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatIDR(m.price)),
        JI.el('td', { class: 'px-4 py-3 text-right font-mono' }, JI.formatIDR(value)),
        JI.el('td', { class: `px-4 py-3 text-right font-mono ${cls}` },
          `${hPnl >= 0 ? '+' : ''}${JI.formatIDR(hPnl)} (${hPct.toFixed(2)}%)`),
        JI.el('td', { class: 'px-4 py-3 text-right' }, [actions]),
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
      const isStock = h.category === 'saham';
      const ownPct = (isStock && JI.ownershipPct) ? JI.ownershipPct(s, h.ticker) : 0;
      const isBd   = (isStock && JI.isBandar)     ? JI.isBandar(s, h.ticker)     : false;
      const ownBadge = (isStock && ownPct > 0) ? JI.el('span', {
        class: `ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${isBd ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`,
      }, `${isBd ? '👑 ' : ''}${(ownPct * 100).toFixed(1)}%`) : null;
      mob.appendChild(JI.el('div', { class: 'ji-card p-4' }, [
        JI.el('div', { class: 'flex items-center justify-between' }, [
          JI.el('div', {}, [
            JI.el('p', { class: 'font-bold font-mono flex items-center flex-wrap' }, [
              JI.el('span', {}, h.ticker),
              ownBadge,
            ]),
            JI.el('p', { class: 'text-xs text-slate-500' }, h.name),
          ]),
          JI.el('div', { class: 'flex flex-wrap gap-1 justify-end' }, [
            JI.el('button', {
              class: 'ji-btn ji-btn-warning !text-xs',
              onclick: () => openSellAssetModal(h.ticker),
            }, 'Sell'),
            isBd ? JI.el('button', {
              class: 'ji-btn !text-xs !bg-amber-600 !text-white hover:!bg-amber-700',
              onclick: () => openGorengModal(h.ticker),
            }, '🚨 Goreng') : null,
          ]),
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

    /* === Physical Assets summary === */
    const phys = s.physicalAssets || {};
    const physTotal = (JI.totalPhysicalValue ? JI.totalPhysicalValue(s) : 0);
    panel.appendChild(JI.el('h3', { class: 'text-lg font-bold mt-8 mb-3 flex items-center gap-2' },
      [JI.el('span', { class: 'text-2xl' }, '🏢'), 'Aset Fisik']));
    const physGrid = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-4' });
    physGrid.appendChild(physBucketCard('Properti Kantor', '🏢', phys.properties));
    physGrid.appendChild(physBucketCard('Mobil', '🚗', phys.cars));
    physGrid.appendChild(physBucketCard('Motor', '🏍️', phys.motorcycles));
    panel.appendChild(physGrid);
    panel.appendChild(JI.el('div', { class: 'ji-card p-4 flex items-center justify-between' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-[11px] uppercase tracking-wider text-slate-500' }, 'Total Aset Fisik'),
        JI.el('p', { class: 'text-xl font-bold font-mono text-violet-600' }, JI.formatIDR(physTotal)),
      ]),
      JI.el('button', {
        class: 'ji-btn ji-btn-ghost !text-xs',
        onclick: () => switchTab('aset'),
      }, 'Buka Dealership →'),
    ]));

    /* === Lifetime stats: realized PnL, broker fees/cashback, taxes === */
    const bs = s.brokerStats || { totalFeesPaid: 0, totalCashbackEarned: 0, totalRealizedPnL: 0, profitableSells: 0, losingSells: 0 };
    const ts = s.taxStats    || { totalPPhPaid: 0, totalAnnualPaid: 0, totalPenaltiesPaid: 0 };

    panel.appendChild(JI.el('h3', { class: 'text-lg font-bold mt-8 mb-3 flex items-center gap-2' },
      [JI.el('span', { class: 'text-2xl' }, '📊'), 'Statistik Sepanjang Permainan']));
    const statsGrid = JI.el('div', { class: 'grid grid-cols-2 md:grid-cols-4 gap-3' });
    statsGrid.appendChild(miniStatCard({
      label: 'Realized PnL',
      value: JI.formatIDR(bs.totalRealizedPnL),
      sub: `${bs.profitableSells} profit / ${bs.losingSells} rugi`,
      accent: bs.totalRealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600',
    }));
    statsGrid.appendChild(miniStatCard({
      label: 'Total Fee Broker',
      value: JI.formatIDR(bs.totalFeesPaid),
      sub: 'biaya transaksi yang dibayar',
      accent: 'text-amber-600',
    }));
    statsGrid.appendChild(miniStatCard({
      label: 'Total Cashback',
      value: JI.formatIDR(bs.totalCashbackEarned),
      sub: 'dari Bandar tier',
      accent: 'text-emerald-600',
    }));
    statsGrid.appendChild(miniStatCard({
      label: 'PPh Final Dipotong',
      value: JI.formatIDR(ts.totalPPhPaid),
      sub: '0.1% dari profit jual',
      accent: 'text-slate-700',
    }));
    panel.appendChild(statsGrid);
  }

  function physBucketCard(label, icon, items) {
    const total = (items || []).reduce((a, x) => a + (x.value || 0), 0);
    const card = JI.el('div', { class: 'ji-card p-4' });
    card.appendChild(JI.el('div', { class: 'flex items-center justify-between mb-2' }, [
      JI.el('div', { class: 'flex items-center gap-2' }, [
        JI.el('span', { class: 'text-2xl' }, icon),
        JI.el('p', { class: 'font-semibold' }, label),
      ]),
      JI.el('span', { class: 'text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700' },
        `${(items || []).length} item`),
    ]));
    card.appendChild(JI.el('p', { class: 'font-mono font-bold text-violet-600' }, JI.formatIDR(total)));
    if (items && items.length) {
      const list = JI.el('ul', { class: 'mt-2 text-xs text-slate-600 space-y-1' });
      items.slice(0, 4).forEach(it => {
        list.appendChild(JI.el('li', { class: 'flex justify-between gap-2' }, [
          JI.el('span', { class: 'truncate' }, it.name + (it.tier ? ` · ${it.tier}` : '')),
          JI.el('span', { class: 'font-mono' }, JI.formatIDR(it.value)),
        ]));
      });
      if (items.length > 4) {
        list.appendChild(JI.el('li', { class: 'text-slate-400 italic' }, `+ ${items.length - 4} item lainnya`));
      }
      card.appendChild(list);
    } else {
      card.appendChild(JI.el('p', { class: 'mt-1 text-xs text-slate-400' }, 'Belum ada.'));
    }
    return card;
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
    const proceedsEl = JI.el('div', { class: 'text-xs text-slate-500 font-mono mt-1 space-y-0.5' });
    function updateSellPreview() {
      const q = Math.min(JI.parseIDRInput(qtyInput.value), h.qty);
      proceedsEl.innerHTML = '';
      if (!q) {
        proceedsEl.appendChild(JI.el('p', {}, 'Masukkan jumlah untuk preview.'));
        return;
      }
      const quote = JI.quoteSell(JI.gameState, ticker, q);
      if (!quote) return;
      const lines = [
        ['Harga × Qty', JI.formatIDR(quote.grossProceeds)],
        ['Cost basis', `− ${JI.formatIDR(quote.costBasisShare)}`],
        [`Fee broker (${(quote.broker.feeRate*100).toFixed(2)}%)`, `− ${JI.formatIDR(quote.fee)}`],
      ];
      if (quote.pphFinal > 0) lines.push([`PPh Final 0.1%`, `− ${JI.formatIDR(quote.pphFinal)}`]);
      if (quote.cashback > 0) lines.push([`Cashback`, `+ ${JI.formatIDR(quote.cashback)}`]);
      lines.push(['Net diterima', JI.formatIDR(quote.netProceeds)]);
      const pnlCls = quote.grossPnL >= 0 ? 'text-emerald-700' : 'text-rose-700';
      lines.push(['Gross PnL', `${quote.grossPnL >= 0 ? '+' : ''}${JI.formatIDR(quote.grossPnL)}`]);
      lines.forEach(([k, v]) => {
        proceedsEl.appendChild(JI.el('p', { class: 'flex justify-between gap-2' }, [
          JI.el('span', {}, k),
          JI.el('span', { class: 'font-bold' + (k === 'Gross PnL' ? ` ${pnlCls}` : '') }, v),
        ]));
      });
      if (quote.grossPnL > 0) {
        proceedsEl.appendChild(JI.el('p', { class: 'mt-1 text-emerald-700' },
          `🏆 XP +${50 + Math.floor(quote.grossPnL / 1_000_000)} (50 base + ${Math.floor(quote.grossPnL / 1_000_000)} per 1jt profit).`));
      }
    }
    qtyInput.addEventListener('input', updateSellPreview);
    updateSellPreview();
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
        const sign = r.grossPnL >= 0 ? '+' : '';
        // Phase 5: sleek floating XP toast on profitable sells.
        if (r.xpAwarded > 0 && JI.showXPToast) {
          JI.showXPToast(r.xpAwarded, { note: `Profit ${JI.formatIDR(r.grossPnL)}` });
        }
        JI.toast(
          `Jual ${q} ${ticker}: net ${JI.formatIDR(r.netProceeds)} (${sign}${JI.formatIDR(r.grossPnL)}).`,
          r.grossPnL >= 0 ? 'success' : 'warning'
        );
        if (r.levelEvent && r.levelEvent.leveledUp) {
          JI.showLevelUpAlert(r.levelEvent.newLevel, r.levelEvent.newTitle, r.levelEvent.levelsGained);
        }
        closeModal();
        JI.saveState(s);
        JI.renderAll();
      },
    }, 'Konfirmasi Jual');
    content.appendChild(btn);

    openModal(`Jual ${ticker}`, content);
  }

  /* =========================================================================
     PHASE 6 — Goreng Saham confirmation modal.
     Costs Rp 5 Miliar, locks a guaranteed +40% multiplier on the next day's
     price. Only available when player owns ≥ 50% of outstanding shares.
     ========================================================================= */
  function openGorengModal(ticker) {
    const s = JI.gameState;
    const idx = JI.getAssetDef ? JI.getAssetDef(ticker) : null;
    if (!idx || idx.category !== 'saham') return;
    const m = s.marketAssets[ticker];
    if (!m) return;
    const cost = JI.GORENG_COST || 5_000_000_000;
    const mult = JI.GORENG_MULTIPLIER || 0.40;
    const ownPct = JI.ownershipPct ? JI.ownershipPct(s, ticker) : 0;
    const richest = (s.banks || []).reduce(
      (best, b) => (best == null || b.balance > best.balance) ? b : best, null);
    const projected = Math.round(m.price * (1 + mult));
    const alreadyQueued = (s.pendingNewsEffects || [])
      .some(e => e.ticker === ticker && e.source === 'goreng');

    const content = JI.el('div', { class: 'space-y-4' });
    content.appendChild(JI.el('div', { class: 'rounded-xl border border-amber-200 bg-amber-50 p-4' }, [
      JI.el('p', { class: 'text-amber-800 font-bold text-sm' }, '👑 Anda Bandar saham ini'),
      JI.el('p', { class: 'text-xs text-amber-700 mt-1' },
        `Kepemilikan: ${(ownPct * 100).toFixed(1)}% dari ${idx.def.outstandingShares.toLocaleString('id-ID')} lembar.`),
    ]));
    content.appendChild(JI.el('div', { class: 'rounded-xl bg-slate-50 p-4 text-sm space-y-2' }, [
      JI.el('p', {}, [
        JI.el('span', { class: 'font-semibold' }, 'Goreng Saham '),
        JI.el('span', { class: 'font-mono' }, ticker),
        JI.el('span', {}, ' — operasi pump terkoordinasi.'),
      ]),
      JI.el('p', { class: 'text-xs text-slate-600' },
        `Harga akan dipaksa naik tepat +${(mult * 100).toFixed(0)}% pada Next Day berikutnya. ` +
        'Sebuah berita "leaked" juga akan muncul di feed News hari ini.'),
      JI.el('div', { class: 'mt-2 grid grid-cols-2 gap-3' }, [
        kv('Harga sekarang', JI.formatIDR(m.price)),
        kv('Proyeksi besok', JI.formatIDR(projected), 'text-emerald-700 font-bold'),
        kv('Biaya operasi', JI.formatIDR(cost), 'text-rose-700 font-bold'),
        kv('Didebit dari', richest ? (richest.shortName || richest.name) : '—'),
      ]),
    ]));

    if (alreadyQueued) {
      content.appendChild(JI.el('p', { class: 'text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3' },
        '⚠ Saham ini sudah Anda goreng untuk besok. Tunggu efeknya land dulu.'));
    }

    const btn = JI.el('button', {
      class: 'ji-btn w-full !bg-amber-600 !text-white hover:!bg-amber-700',
      onclick: () => {
        if (typeof JI.gorengSaham !== 'function') return;
        const r = JI.gorengSaham(s, ticker);
        if (!r.ok) return JI.toast(r.error, 'error');
        JI.toast(`🚨 Goreng ${ticker} terkoordinasi! +40% akan land besok.`, 'success', 4500);
        closeModal();
        JI.saveState(s);
        JI.renderAll();
      },
    }, alreadyQueued ? 'Sudah Aktif (kunci)' : `Konfirmasi Goreng — ${JI.formatIDR(cost)}`);
    if (alreadyQueued) btn.setAttribute('disabled', 'disabled');
    content.appendChild(btn);

    openModal(`🚨 Goreng Saham ${ticker}`, content);
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
    const infraValue = (typeof JI.totalInfrastructureValue === 'function')
      ? JI.totalInfrastructureValue(s) : 0;
    const infraIncome = (typeof JI.totalInfrastructureDailyIncome === 'function')
      ? JI.totalInfrastructureDailyIncome(s) : 0;
    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between flex-wrap gap-3' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, 'Aset Fisik'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          'Properti kantor, mobil, motor, dan Mega Infrastruktur — investasi nyata yang menambah net worth.'),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-[10px] uppercase tracking-wider text-slate-500' }, 'Total Aset Fisik'),
        JI.el('p', { class: 'font-mono font-bold text-violet-600 text-lg' }, JI.formatIDR(totalValue + infraValue)),
        JI.el('p', { class: 'text-xs text-slate-500' },
          `Kapasitas Kantor: ${s.physicalAssets.officeCapacity} pegawai`),
        infraIncome > 0 ? JI.el('p', { class: 'text-[11px] text-emerald-700 font-mono mt-0.5' },
          `+${JI.formatIDR(infraIncome)} / hari dari Sektor Riil`) : null,
      ]),
    ]));

    /* Section: Mega Infrastruktur (Sektor Riil) — Phase 6 endgame */
    if (Array.isArray(JI.INFRASTRUCTURE_DEFS)) {
      panel.appendChild(JI.el('h3', { class: 'text-xl font-bold mb-1 flex items-center gap-2' },
        [JI.el('span', { class: 'text-2xl' }, '🏗'), 'Mega Infrastruktur (Sektor Riil)']));
      panel.appendChild(JI.el('p', { class: 'text-xs text-slate-500 mb-3' },
        'Investasi tier-miliarder yang membayar pendapatan harian otomatis. Dibayar dari rekening bank terkaya Anda.'));
      const infraGrid = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8' });
      JI.INFRASTRUCTURE_DEFS.forEach(def => infraGrid.appendChild(infrastructureCard(def)));
      panel.appendChild(infraGrid);
    }

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

  /* Phase 6 — Mega Infrastruktur card. Single bank-debit model: cost is
     pulled from the richest rekening (no overdraft). Daily income lands on
     the same bank during the next advanceDay loop. */
  function infrastructureCard(def) {
    const s = JI.gameState;
    const owned = (typeof JI.infraQty === 'function') ? JI.infraQty(s, def.id) : 0;
    const richest = (s.banks || []).reduce(
      (best, b) => (best == null || b.balance > best.balance) ? b : best, null);
    const richestBalance = richest ? richest.balance : 0;
    const canAfford = richestBalance >= def.cost;

    return JI.el('div', { class: 'ji-card p-5 flex flex-col' }, [
      JI.el('div', { class: 'flex items-start justify-between' }, [
        JI.el('div', { class: 'text-5xl' }, def.icon),
        JI.el('span', { class: 'text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold' },
          def.tier),
      ]),
      JI.el('h4', { class: 'mt-3 text-lg font-bold leading-tight' }, def.name),
      JI.el('p', { class: 'text-sm text-slate-500 mt-1' }, def.tagline),
      JI.el('div', { class: 'mt-3 grid grid-cols-2 gap-2 text-xs' }, [
        JI.el('div', {}, [
          JI.el('p', { class: 'text-[10px] uppercase tracking-wider text-slate-500' }, 'Harga'),
          JI.el('p', { class: 'font-mono font-bold text-slate-900' }, JI.formatIDR(def.cost)),
        ]),
        JI.el('div', {}, [
          JI.el('p', { class: 'text-[10px] uppercase tracking-wider text-slate-500' }, 'Income / Hari'),
          JI.el('p', { class: 'font-mono font-bold text-emerald-700' }, `+${JI.formatIDR(def.dailyIncome)}`),
        ]),
      ]),
      owned > 0 ? JI.el('p', { class: 'mt-2 text-xs text-emerald-700 font-semibold' },
        `Dimiliki: ${owned} unit · Total income: +${JI.formatIDR(owned * def.dailyIncome)} / hari`) : null,
      JI.el('p', { class: 'mt-3 text-[11px] text-slate-500' },
        richest
          ? `Akan didebit dari ${richest.shortName || richest.name} (saldo ${JI.formatIDR(richestBalance)}).`
          : 'Belum ada rekening bank.'),
      JI.el('button', {
        class: `ji-btn ji-btn-success w-full mt-3 ${canAfford ? '' : 'opacity-60'}`,
        disabled: canAfford ? null : '',
        onclick: () => {
          if (typeof JI.buyInfrastructure !== 'function') return;
          const r = JI.buyInfrastructure(s, def.id);
          if (!r.ok) return JI.toast(r.error, 'error');
          JI.toast(`🏗 ${r.name} dibeli dari ${r.bankName} (− ${JI.formatIDR(r.cost)}).`,
            'success', 4500);
          JI.saveState(s);
          JI.renderAll();
        },
      }, canAfford ? `Beli ${JI.formatIDR(def.cost)}` : 'Saldo terkaya kurang'),
    ]);
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
     HRD panel
     ========================================================================= */
  function renderHRDPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    const cap   = JI.officeCapacity ? JI.officeCapacity(s) : (s.physicalAssets.officeCapacity || 0);
    const hired = JI.hiredCount     ? JI.hiredCount(s)     : (s.hiredEmployees || []).length;
    const slotsAvailable = Math.max(0, cap - hired);

    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between flex-wrap gap-3' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, '👥 HRD'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          'Rekrut karyawan untuk dapat perks pasar, pajak, dan transaksi.'),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-[10px] uppercase tracking-wider text-slate-500' }, 'Kapasitas'),
        JI.el('p', { class: 'font-mono font-bold text-lg' }, `${hired} / ${cap}`),
        JI.el('p', { class: 'text-xs text-slate-500' },
          slotsAvailable > 0 ? `${slotsAvailable} slot tersedia` :
          cap === 0 ? 'Beli properti dulu' : 'Penuh'),
      ]),
    ]));

    if (cap === 0) {
      panel.appendChild(JI.el('div', { class: 'rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5 text-sm text-amber-800' }, [
        JI.el('p', { class: 'font-semibold' }, '⚠ Belum ada kantor'),
        JI.el('p', { class: 'mt-1' }, 'Beli "Coworking Space" / "Ruko 2 Lantai" / "Gedung SCBD" di tab Aset Fisik dulu untuk menambah kapasitas kantor.'),
        JI.el('button', {
          class: 'ji-btn ji-btn-primary !text-xs mt-3',
          onclick: () => switchTab('aset'),
        }, 'Buka Aset Fisik →'),
      ]));
    }

    const grid = JI.el('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-5' });
    (JI.HRD_ROLES || []).forEach(role => grid.appendChild(renderHRDRoleCard(role)));
    panel.appendChild(grid);

    /* Active perks summary */
    const perks = JI.getActivePerks ? JI.getActivePerks(s) : null;
    if (perks && (perks.analyst || perks.taxConsultant || perks.broker)) {
      const summary = JI.el('div', { class: 'ji-card p-5 mt-5' });
      summary.appendChild(JI.el('h3', { class: 'font-bold text-slate-900 mb-3' }, 'Perk Aktif'));
      const ul = JI.el('ul', { class: 'space-y-2 text-sm' });
      const desc = JI.describePerks ? JI.describePerks(perks) : [];
      desc.forEach(d => ul.appendChild(JI.el('li', { class: 'flex items-start gap-2' }, [
        JI.el('span', { class: 'text-emerald-600' }, '✓'),
        JI.el('span', {}, d),
      ])));
      summary.appendChild(ul);
      panel.appendChild(summary);
    }
  }

  function renderHRDRoleCard(role) {
    const s = JI.gameState;
    const employee = JI.getEmployeeOfRole ? JI.getEmployeeOfRole(s, role.key) : null;
    const cap   = JI.officeCapacity ? JI.officeCapacity(s) : 0;
    const hired = JI.hiredCount     ? JI.hiredCount(s)     : 0;
    const canHireSlot = hired < cap;

    const card = JI.el('div', { class: 'ji-card p-5 flex flex-col' });
    card.appendChild(JI.el('div', { class: 'flex items-start gap-3 mb-3' }, [
      JI.el('div', { class: 'text-4xl' }, role.icon),
      JI.el('div', { class: 'flex-1 min-w-0' }, [
        JI.el('h3', { class: 'font-bold' }, role.label),
        JI.el('p', { class: 'text-xs text-slate-500' }, role.tagline),
      ]),
    ]));

    if (employee) {
      card.appendChild(JI.el('div', { class: 'rounded-xl border border-emerald-200 bg-emerald-50 p-3 mb-3 text-xs' }, [
        JI.el('p', { class: 'flex items-center justify-between gap-2' }, [
          JI.el('span', { class: 'text-emerald-700 font-bold' }, `✓ Tier ${employee.tier} · ${employee.tierName}`),
          JI.el('span', { class: 'font-mono text-emerald-700' }, JI.formatIDR(employee.salary) + '/bulan'),
        ]),
        JI.el('p', { class: 'mt-1 text-slate-600' }, `Direkrut Hari ${employee.hiredOn}`),
      ]));
    }

    /* Tiers — show locked/active/available state */
    const tierList = JI.el('div', { class: 'space-y-2 flex-1' });
    role.tiers.forEach(tier => {
      const isActive = employee && employee.tier === tier.tier;
      tierList.appendChild(JI.el('div', {
        class: `rounded-xl border p-3 ${isActive ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200'}`
      }, [
        JI.el('div', { class: 'flex items-start justify-between gap-2 flex-wrap' }, [
          JI.el('div', {}, [
            JI.el('p', { class: 'font-semibold text-sm' }, tier.name),
            JI.el('p', { class: 'text-[11px] text-slate-500' }, tier.summary),
          ]),
          JI.el('p', { class: 'font-mono text-xs whitespace-nowrap' },
            JI.formatIDR(tier.salary) + '/bln'),
        ]),
        JI.el('div', { class: 'mt-2 flex flex-wrap gap-2' }, [
          isActive ? JI.el('span', { class: 'text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold' }, 'Aktif')
            : (employee
                ? JI.el('button', {
                    class: 'ji-btn ji-btn-ghost !text-[11px]',
                    onclick: () => upgradeEmployee(role, tier),
                  }, employee.tier > tier.tier ? 'Downgrade ke tier ini' : 'Upgrade ke tier ini')
                : JI.el('button', {
                    class: 'ji-btn ji-btn-success !text-[11px]',
                    disabled: !canHireSlot ? '' : null,
                    onclick: () => doHire(role, tier),
                  }, canHireSlot ? 'Rekrut' : 'Kapasitas penuh')),
        ]),
      ]));
    });
    card.appendChild(tierList);

    if (employee) {
      card.appendChild(JI.el('button', {
        class: 'ji-btn ji-btn-ghost !text-xs mt-3 !text-rose-600 !border-rose-300 hover:!bg-rose-50',
        onclick: () => doFire(employee),
      }, '✕ Pecat karyawan ini'));
    }
    return card;
  }

  function doHire(role, tier) {
    const r = JI.hireEmployee(JI.gameState, role.key, tier.tier);
    if (!r.ok) return JI.toast(r.error, 'error');
    JI.toast(`Berhasil merekrut ${tier.name} (${role.label}).`, 'success');
    JI.saveState(JI.gameState);
    JI.renderAll();
  }
  function doFire(employee) {
    if (!confirm(`Pecat ${employee.tierName} (${employee.roleLabel})? Slot kapasitas akan dibebaskan.`)) return;
    const r = JI.fireEmployee(JI.gameState, employee.id);
    if (!r.ok) return JI.toast(r.error, 'error');
    JI.toast(`${employee.tierName} dipecat.`, 'warning');
    JI.saveState(JI.gameState);
    JI.renderAll();
  }
  function upgradeEmployee(role, tier) {
    const cur = JI.getEmployeeOfRole(JI.gameState, role.key);
    if (!cur) return;
    if (!confirm(`Ganti dari ${cur.tierName} ke ${tier.name}? Karyawan lama akan dipecat dulu.`)) return;
    JI.fireEmployee(JI.gameState, cur.id);
    const r = JI.hireEmployee(JI.gameState, role.key, tier.tier);
    if (!r.ok) {
      JI.toast(r.error, 'error');
      // Try to re-hire the old one to avoid leaving a gap
      JI.hireEmployee(JI.gameState, cur.role, cur.tier);
    } else {
      JI.toast(`Sekarang: ${tier.name} (${role.label}).`, 'success');
    }
    JI.saveState(JI.gameState);
    JI.renderAll();
  }

  /* =========================================================================
     CoreTax DJP panel
     ========================================================================= */
  function renderCoreTaxPanel(panel) {
    const s = JI.gameState;
    panel.innerHTML = '';

    const open = JI.listOpenLiabilities ? JI.listOpenLiabilities(s) : [];
    const paid = JI.listPaidLiabilities ? JI.listPaidLiabilities(s, 20) : [];
    const totalUnpaid = JI.totalUnpaidTax ? JI.totalUnpaidTax(s) : 0;
    const stats = s.taxStats || { totalPPhPaid: 0, totalAnnualPaid: 0, totalPenaltiesPaid: 0 };
    const consultant = JI.getTaxConsultant ? JI.getTaxConsultant(s) : null;
    const annualRate = JI.effectiveAnnualRate ? JI.effectiveAnnualRate(s) : 0.01;
    const nextDay = JI.nextAnnualAssessmentDay ? JI.nextAnnualAssessmentDay(s) : (s.totalDays + 30);

    panel.appendChild(JI.el('div', { class: 'mb-5' }, [
      JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, '🧾 CoreTax DJP'),
      JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
        'PPh Final 0.1% atas profit jual aset (otomatis dipotong). Pajak Tahunan dinilai tiap 30 hari. Denda 2%/hari mulai 10 hari setelah jatuh tempo (kecuali ada Konsultan Pajak).'),
    ]));

    /* Top stats */
    const grid = JI.el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6' });
    grid.appendChild(statCard({
      label: 'Total Tagihan Belum Bayar',
      value: JI.formatIDR(totalUnpaid),
      sub: `${open.length} tagihan terbuka`,
      accent: totalUnpaid > 0 ? 'text-rose-600' : 'text-emerald-600',
    }));
    grid.appendChild(statCard({
      label: 'Tarif Pajak Tahunan',
      value: `${(annualRate * 100).toFixed(1)}%`,
      sub: consultant ? `Berkat ${consultant.tierName}` : 'Tarif default 1%',
      accent: 'text-slate-900',
    }));
    grid.appendChild(statCard({
      label: 'Pajak Tahunan Dibayar',
      value: JI.formatIDR(stats.totalAnnualPaid),
      sub: 'lifetime',
      accent: 'text-blue-600',
    }));
    grid.appendChild(statCard({
      label: 'PPh Final Dipotong',
      value: JI.formatIDR(stats.totalPPhPaid),
      sub: 'lifetime',
      accent: 'text-violet-600',
    }));
    panel.appendChild(grid);

    /* Consultant status */
    panel.appendChild(JI.el('div', {
      class: `rounded-xl border p-4 mb-5 text-sm ${consultant ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`
    }, [
      JI.el('p', { class: consultant ? 'text-emerald-800 font-semibold' : 'text-slate-700 font-semibold' },
        consultant
          ? `🧾 Konsultan Pajak Aktif: ${consultant.tierName}`
          : '🧾 Belum ada Konsultan Pajak'),
      JI.el('p', { class: 'text-xs mt-1 text-slate-600' },
        consultant
          ? `Tarif pajak tahunan turun ke ${(annualRate*100).toFixed(1)}% dan denda 2%/hari dinonaktifkan.`
          : 'Tanpa konsultan, pajak tahunan 1% NW dan denda 2%/hari berlaku setelah 10 hari overdue.'),
      consultant ? null : JI.el('button', {
        class: 'ji-btn ji-btn-primary !text-xs mt-3',
        onclick: () => switchTab('hrd'),
      }, 'Sewa di HRD →'),
    ]));

    panel.appendChild(JI.el('p', { class: 'text-xs text-slate-500 font-mono mb-3' },
      `Penilaian pajak tahunan berikutnya: Hari ${nextDay}.`));

    /* Open liabilities */
    panel.appendChild(JI.el('h3', { class: 'font-bold text-slate-900 mb-3' }, 'Tagihan Terbuka'));
    if (!open.length) {
      panel.appendChild(JI.el('div', { class: 'ji-card p-6 text-center text-slate-500 text-sm mb-6' },
        '✓ Tidak ada tagihan pajak yang belum dibayar.'));
    } else {
      const openWrap = JI.el('div', { class: 'space-y-3 mb-6' });
      open.forEach(l => openWrap.appendChild(taxLiabilityRow(l, true)));
      panel.appendChild(openWrap);
    }

    /* History */
    if (paid.length) {
      panel.appendChild(JI.el('h3', { class: 'font-bold text-slate-900 mb-3' }, 'Riwayat Pembayaran'));
      const histWrap = JI.el('div', { class: 'space-y-2' });
      paid.forEach(l => histWrap.appendChild(taxLiabilityRow(l, false)));
      panel.appendChild(histWrap);
    }
  }

  function taxLiabilityRow(liab, isOpen) {
    const s = JI.gameState;
    const overdueDays = isOpen ? Math.max(0, s.totalDays - liab.dueDay) : 0;
    const overdue = overdueDays > 0;
    const grace = (JI.PENALTY_GRACE_DAYS || 10);
    const penaltyActive = overdueDays > grace;

    const row = JI.el('div', {
      class: `rounded-xl border p-4 ${
        !isOpen        ? 'border-slate-200 bg-slate-50 opacity-90' :
        penaltyActive  ? 'border-rose-300 bg-rose-50' :
        overdue        ? 'border-amber-300 bg-amber-50' :
        'border-slate-200 bg-white'
      }`
    });
    row.appendChild(JI.el('div', { class: 'flex items-start justify-between flex-wrap gap-2' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'font-semibold' }, liab.label || 'Pajak Tahunan'),
        JI.el('p', { class: 'text-xs text-slate-500' },
          `Dibuat Hari ${liab.createdDay} · Jatuh tempo Hari ${liab.dueDay} · Tarif ${liab.ratePctApplied}% NW`),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-[10px] uppercase tracking-wider text-slate-500' },
          isOpen ? 'Tagihan Sekarang' : 'Lunas'),
        JI.el('p', { class: `text-lg font-mono font-bold ${isOpen ? (penaltyActive ? 'text-rose-700' : 'text-slate-900') : 'text-emerald-700'}` },
          JI.formatIDR(isOpen ? liab.owedAmount : (liab.paid || liab.baseAmount))),
      ]),
    ]));
    if (liab.penaltyAccrued > 0) {
      row.appendChild(JI.el('p', { class: 'text-xs mt-2 text-rose-700' },
        `Termasuk denda akumulatif: ${JI.formatIDR(liab.penaltyAccrued)}.`));
    }
    if (isOpen) {
      if (overdueDays > 0) {
        row.appendChild(JI.el('p', { class: 'text-xs mt-1 ' + (penaltyActive ? 'text-rose-700' : 'text-amber-700') },
          penaltyActive
            ? `Lewat ${overdueDays} hari · denda 2%/hari aktif.`
            : `Lewat ${overdueDays} hari (grace ${grace} hari sebelum denda).`));
      }
      row.appendChild(JI.el('button', {
        class: 'ji-btn ji-btn-success w-full mt-3 !text-sm',
        onclick: () => openPayTaxModal(liab),
      }, `Bayar ${JI.formatIDR(liab.owedAmount)}`));
    } else {
      row.appendChild(JI.el('p', { class: 'text-xs mt-1 text-slate-500' },
        `Dibayar Hari ${liab.paidDay} via ${liab.paidVia === 'credit' ? 'Kartu Kredit' : 'Saldo Bank'}.`));
    }
    return row;
  }

  function openPayTaxModal(liab) {
    const s = JI.gameState;
    const content = JI.el('div', { class: 'space-y-4' });
    content.appendChild(JI.el('div', { class: 'rounded-xl bg-slate-50 p-4' }, [
      JI.el('p', { class: 'font-semibold' }, liab.label),
      JI.el('p', { class: 'text-xs text-slate-500 mt-1' },
        `Pokok ${JI.formatIDR(liab.baseAmount)}` +
        (liab.penaltyAccrued > 0 ? ` + denda ${JI.formatIDR(liab.penaltyAccrued)}` : '')),
      JI.el('p', { class: 'mt-3 text-2xl font-mono font-bold' },
        JI.formatIDR(liab.owedAmount)),
    ]));

    const ps = paymentSelector({ allowCredit: true });
    content.appendChild(ps.container);

    const btn = JI.el('button', {
      class: 'ji-btn ji-btn-success w-full',
      onclick: () => {
        const r = JI.payTax(s, liab.id, ps.getValue());
        if (!r.ok) return JI.toast(r.error, 'error');
        JI.toast(`Pajak ${JI.formatIDR(r.paid)} berhasil dibayar.`, 'success');
        closeModal();
        JI.saveState(s);
        JI.renderAll();
      },
    }, 'Konfirmasi Pembayaran');
    content.appendChild(btn);

    openModal('Bayar Pajak', content);
  }

  /* =========================================================================
     PHASE 4 — Deposito Berjangka section (per bank card)
     ========================================================================= */
  function renderDepositoSection(bank) {
    const s = JI.gameState;
    const wrap = JI.el('section', {});
    wrap.appendChild(sectionTitle('Deposito Berjangka',
      'Kunci dana untuk bunga jaminan saat jatuh tempo.'));

    if (bank.depositos && bank.depositos.length > 0) {
      const list = JI.el('div', { class: 'space-y-2 mb-3' });
      bank.depositos.forEach(d => {
        const daysLeft = Math.max(0, d.maturityDay - s.totalDays);
        const elapsed = d.days - daysLeft;
        const pct = JI.clamp(Math.round((elapsed / d.days) * 100), 0, 100);
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
        if (!r.ok) return JI.toast(r.error, 'error');
        JI.toast(`Deposito ${r.deposito.months} bulan dibuka di ${bank.shortName}.`);
        amtInput.value = '';
        JI.saveState(s);
        renderHeader();
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

  /* =========================================================================
     PHASE 4 — Mutasi Rekening (audit trail per bank card)
     ========================================================================= */
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
     PHASE 4 — Venture Capital tab
     ========================================================================= */
  function renderVCPanel(panel) {
    const s = JI.gameState;
    if (JI.maybeRotateVC) JI.maybeRotateVC(s);
    panel.innerHTML = '';

    panel.appendChild(JI.el('div', { class: 'mb-5 flex items-end justify-between flex-wrap gap-3' }, [
      JI.el('div', {}, [
        JI.el('h2', { class: 'text-2xl sm:text-3xl font-bold' }, '🚀 Venture Capital'),
        JI.el('p', { class: 'text-slate-500 text-sm mt-1' },
          'Suntik modal ke startup lokal. 3 startup aktif, dirotasi setiap 30 hari.'),
      ]),
      JI.el('div', { class: 'text-right' }, [
        JI.el('p', { class: 'text-[11px] uppercase tracking-wider text-slate-500' }, 'Rotasi Berikutnya'),
        JI.el('p', { class: 'font-mono text-sm' },
          `${Math.max(0, JI.VC_ROTATION_DAYS - (s.totalDays - s.vc.lastRotationDay))} hari`),
      ]),
    ]));

    const grid = JI.el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6' });
    s.vc.activeStartups.forEach(st => grid.appendChild(renderStartupCard(st)));
    panel.appendChild(grid);

    panel.appendChild(renderActiveInvestments(s));
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
        if (!r.ok) return JI.toast(r.error, 'error');
        JI.toast(`Berinvestasi ${JI.formatIDR(amt)} di ${st.name} (lock ${r.investment.lockDays} hari).`,
          'success');
        amtInput.value = '';
        JI.saveState(s);
        renderHeader();
        renderVCPanel(JI.$('[data-tab-panel="vc"]'));
      },
    }, 'Investasi');

    card.appendChild(labelled('Sumber Dana', bankSelect));
    card.appendChild(labelled('Nominal Investasi', amtInput));
    card.appendChild(JI.el('p', { class: 'text-[11px] text-slate-400 font-mono' },
      `Lock random ${JI.VC_LOCK_MIN_DAYS}–${JI.VC_LOCK_MAX_DAYS} hari · Outcome RNG (70 / 20 / 10)`));
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
      const elapsed  = inv.lockDays - daysLeft;
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
      const cls = r.outcome === 'Bankrupt'    ? 'vc-out-bad'
                : r.outcome === 'Acquisition' ? 'vc-out-good'
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
            `${r.multiplier}× → ${JI.formatIDR(r.payout)}`),
          JI.el('p', { class: 'text-[11px] opacity-80 font-mono' },
            `dari ${JI.formatIDR(r.originalAmount)}`),
        ]),
      ]));
    });
    wrap.appendChild(list);
    return wrap;
  }

  /* =========================================================================
     PHASE 4 — IPO card on Home
     ========================================================================= */
  function renderIPOCard(s) {
    const eligible = JI.isIPOEligible ? JI.isIPOEligible(s) : false;
    const isPublic = !!(s.ipo && s.ipo.isPublic);
    const reason   = JI.ipoEligibilityReason ? JI.ipoEligibilityReason(s) : '';

    const card = JI.el('div', { class: 'ji-card p-6 mb-6 ipo-card' });
    card.appendChild(JI.el('div', { class: 'flex items-start justify-between gap-3 flex-wrap mb-3' }, [
      JI.el('div', {}, [
        JI.el('p', { class: 'text-xs uppercase tracking-wider text-slate-500' }, 'Ultimate Goal'),
        JI.el('h3', { class: 'text-xl font-bold mt-1' }, 'Initial Public Offering (IPO)'),
        JI.el('p', { class: 'text-xs text-slate-500 mt-1' },
          `Syarat: Level ${JI.IPO_LEVEL_REQ}+ · Net Worth ${JI.formatIDR(JI.IPO_NETWORTH_REQ)}`),
      ]),
      isPublic ? JI.el('span', { class: 'ipo-badge' }, '◉ PUBLIC LISTED') : null,
    ]));

    if (isPublic) {
      const ipoDay = s.ipo.ipoDay;
      const sinceLast = s.totalDays - (s.ipo.lastDividendDay || ipoDay);
      const daysToDiv = Math.max(0, JI.IPO_DIVIDEND_INTERVAL - sinceLast);
      card.appendChild(JI.el('div', { class: 'rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm' }, [
        JI.el('p', { class: 'font-semibold text-emerald-700 mb-1' }, '✓ Sudah Go Public'),
        JI.el('p', { class: 'text-slate-700' },
          `IPO pada ${JI.formatCalendar(ipoDay)}. Dividen 5% NW berikutnya dalam ${daysToDiv} hari.`),
      ]));
    } else {
      const btn = JI.el('button', {
        class: 'ji-btn ji-btn-success w-full sm:w-auto',
        onclick: () => {
          const r = JI.goPublic(JI.gameState);
          if (!r.ok) return JI.toast(r.error, 'error');
          JI.toast(`🎉 Go Public! +${JI.formatIDR(r.injected)} masuk rekening.`, 'success', 6000);
          JI.saveState(JI.gameState);
          JI.renderAll();
        },
      }, [JI.el('span', {}, '🔔'), 'Go Public (IPO)']);
      if (!eligible) btn.setAttribute('disabled', 'disabled');

      card.appendChild(JI.el('p', {
        class: `text-xs mb-3 ${eligible ? 'text-emerald-600' : 'text-slate-500'}`
      }, eligible ? 'Memenuhi syarat IPO. Klik tombol di bawah.' : reason));
      card.appendChild(btn);
    }
    return card;
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
    openPayTaxModal,
    openGorengModal,
  });
})(window);
