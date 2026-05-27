/* =========================================================================
   market.js — 45 hardcoded assets, Random Walk with Drift, buy/sell.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* =========================================================================
     CATEGORY 1 — Saham Lokal (15)
     Range: Rp 50 — Rp 40.000

     Phase 6 — `outstandingShares` (5M..20M) caps total circulating supply.
     Used to enforce supply on buy + drive Bandar (>=50%) "Goreng" mechanic.
     ========================================================================= */
  const STOCKS = [
    { ticker: 'BBCA', name: 'Bank Central Asia',          price: 9_500,  vol: 0.022, sector: 'Perbankan',     outstandingShares: 12_000_000 },
    { ticker: 'BBRI', name: 'Bank Rakyat Indonesia',      price: 5_200,  vol: 0.026, sector: 'Perbankan',     outstandingShares: 18_000_000 },
    { ticker: 'BMRI', name: 'Bank Mandiri',               price: 6_800,  vol: 0.026, sector: 'Perbankan',     outstandingShares: 15_000_000 },
    { ticker: 'BBNI', name: 'Bank Negara Indonesia',      price: 5_500,  vol: 0.028, sector: 'Perbankan',     outstandingShares: 14_000_000 },
    { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia',       price: 80,     vol: 0.045, sector: 'Teknologi',     outstandingShares: 20_000_000 },
    { ticker: 'TLKM', name: 'Telkom Indonesia',           price: 3_400,  vol: 0.024, sector: 'Telekomunikasi',outstandingShares: 19_000_000 },
    { ticker: 'ASII', name: 'Astra International',        price: 4_900,  vol: 0.028, sector: 'Otomotif',      outstandingShares: 10_000_000 },
    { ticker: 'UNVR', name: 'Unilever Indonesia',         price: 2_400,  vol: 0.024, sector: 'Konsumsi',      outstandingShares: 16_000_000 },
    { ticker: 'ICBP', name: 'Indofood CBP',               price: 11_000, vol: 0.022, sector: 'Konsumsi',      outstandingShares:  8_000_000 },
    { ticker: 'BUMI', name: 'Bumi Resources',             price: 150,    vol: 0.048, sector: 'Energi',        outstandingShares: 17_000_000 },
    { ticker: 'ANTM', name: 'Aneka Tambang',              price: 1_700,  vol: 0.038, sector: 'Pertambangan',  outstandingShares: 13_000_000 },
    { ticker: 'PTBA', name: 'Bukit Asam',                 price: 2_900,  vol: 0.034, sector: 'Energi',        outstandingShares:  9_000_000 },
    { ticker: 'PGAS', name: 'Perusahaan Gas Negara',      price: 1_500,  vol: 0.030, sector: 'Energi',        outstandingShares: 11_000_000 },
    { ticker: 'KLBF', name: 'Kalbe Farma',                price: 1_550,  vol: 0.024, sector: 'Farmasi',       outstandingShares:  7_000_000 },
    { ticker: 'MDKA', name: 'Merdeka Copper Gold',        price: 2_700,  vol: 0.040, sector: 'Pertambangan',  outstandingShares:  5_000_000 },
  ];

  /* =========================================================================
     CATEGORY 2 — Crypto (15)
     Range: Rp 1.500 — Rp 1.000.000.000
     ========================================================================= */
  const CRYPTOS = [
    { ticker: 'BTC',   name: 'Bitcoin',         price: 980_000_000, vol: 0.18 },
    { ticker: 'ETH',   name: 'Ethereum',        price: 55_000_000,  vol: 0.20 },
    { ticker: 'BNB',   name: 'Binance Coin',    price: 9_500_000,   vol: 0.18 },
    { ticker: 'SOL',   name: 'Solana',          price: 2_400_000,   vol: 0.22 },
    { ticker: 'XRP',   name: 'Ripple',          price: 9_300,       vol: 0.18 },
    { ticker: 'DOGE',  name: 'Dogecoin',        price: 2_100,       vol: 0.24 },
    { ticker: 'ADA',   name: 'Cardano',         price: 7_500,       vol: 0.20 },
    { ticker: 'MATIC', name: 'Polygon',         price: 8_200,       vol: 0.22 },
    { ticker: 'DOT',   name: 'Polkadot',        price: 110_000,     vol: 0.20 },
    { ticker: 'LINK',  name: 'Chainlink',       price: 220_000,     vol: 0.19 },
    { ticker: 'KNT',   name: 'KriptoNusantara', price: 25_000,      vol: 0.22 },
    { ticker: 'IDRC',  name: 'IDRCoin',         price: 15_000,      vol: 0.16 },
    { ticker: 'IDT',   name: 'IndoToken',       price: 8_500,       vol: 0.23 },
    { ticker: 'RCY',   name: 'RupiahCrypto',    price: 12_000,      vol: 0.20 },
    { ticker: 'MJP',   name: 'MajapahitCoin',   price: 4_200,       vol: 0.25 },
  ];

  /* =========================================================================
     CATEGORY 3 — Reksadana (15)
     Range: Rp 1.000 — Rp 10.000 (NAB / Nilai Aktiva Bersih)
     ========================================================================= */
  const REKSADANA = [
    { ticker: 'SUCOR-EQ', name: 'Sucorinvest Equity',        price: 4_200, vol: 0.0035, mgr: 'Sucorinvest AM' },
    { ticker: 'BTV-DSAH', name: 'Batavia Dana Saham',        price: 5_800, vol: 0.0035, mgr: 'Batavia Prosperindo' },
    { ticker: 'SCH-DPRE', name: 'Schroder Dana Prestasi',    price: 7_100, vol: 0.0038, mgr: 'Schroder Investment' },
    { ticker: 'MAN-INV',  name: 'Mandiri Investa',           price: 3_200, vol: 0.0030, mgr: 'Mandiri Manajemen' },
    { ticker: 'BNI-INSP', name: 'BNI-AM Inspiring',          price: 1_800, vol: 0.0040, mgr: 'BNI Asset Management' },
    { ticker: 'TRIM-KAP', name: 'Trim Kapital',              price: 6_500, vol: 0.0035, mgr: 'Trimegah AM' },
    { ticker: 'ASH-EKU',  name: 'Ashmore Ekuitas',           price: 2_400, vol: 0.0040, mgr: 'Ashmore Indonesia' },
    { ticker: 'MAN-AND',  name: 'Manulife Andalan',          price: 5_400, vol: 0.0033, mgr: 'Manulife AM' },
    { ticker: 'DRX-MAW',  name: 'Danareksa Mawar',           price: 4_900, vol: 0.0036, mgr: 'Danareksa Investment' },
    { ticker: 'PNN-MAX',  name: 'Panin Maksima',             price: 8_100, vol: 0.0038, mgr: 'Panin AM' },
    { ticker: 'SYL-OPP',  name: 'Syailendra Opportunity',    price: 3_700, vol: 0.0040, mgr: 'Syailendra Capital' },
    { ticker: 'TRM-SYR',  name: 'Trimegah Syariah',          price: 2_100, vol: 0.0028, mgr: 'Trimegah AM' },
    { ticker: 'BNP-PES',  name: 'BNP Paribas Pesona',        price: 9_400, vol: 0.0035, mgr: 'BNP Paribas AM' },
    { ticker: 'BAH-PRM',  name: 'Bahana Prima',              price: 6_200, vol: 0.0033, mgr: 'Bahana TCW' },
    { ticker: 'BRX-PLS',  name: 'Bareksa Plus',              price: 1_300, vol: 0.0040, mgr: 'Bareksa AM' },
  ];

  /* ---------- Category metadata: hard caps & drift ---------- */
  const CATEGORY = {
    saham: {
      key: 'saham',
      label: 'Saham Lokal',
      icon: '📊',
      maxSwing: 0.05,    // ±5% per day hard cap
      drift: 0.0008,     // tiny upward drift
      assets: STOCKS,
    },
    crypto: {
      key: 'crypto',
      label: 'Crypto',
      icon: '₿',
      maxSwing: 0.25,    // ±25% per day
      drift: 0.0020,
      assets: CRYPTOS,
    },
    reksadana: {
      key: 'reksadana',
      label: 'Reksadana',
      icon: '📑',
      maxSwing: 0.005,   // ±0.5% per day
      drift: 0.0004,
      assets: REKSADANA,
    },
  };

  /* ---------- Reverse index: ticker -> category ---------- */
  const TICKER_INDEX = {};
  Object.values(CATEGORY).forEach(cat => {
    cat.assets.forEach(a => {
      TICKER_INDEX[a.ticker] = { category: cat.key, def: a };
    });
  });

  function getAssetDef(ticker) {
    return TICKER_INDEX[ticker] || null;
  }

  function allAssets() {
    return [
      ...STOCKS.map(a => ({ ...a, category: 'saham' })),
      ...CRYPTOS.map(a => ({ ...a, category: 'crypto' })),
      ...REKSADANA.map(a => ({ ...a, category: 'reksadana' })),
    ];
  }

  /* =========================================================================
     Initialize market on a fresh state
     ========================================================================= */
  const HISTORY_LENGTH = 30;

  function initMarket(state) {
    if (!state) return;
    state.marketAssets = state.marketAssets || {};
    state.marketHistory = state.marketHistory || {};

    allAssets().forEach(a => {
      if (!state.marketAssets[a.ticker]) {
        state.marketAssets[a.ticker] = {
          ticker: a.ticker,
          name: a.name,
          category: a.category,
          price: a.price,
          openPrice: a.price,
          prevPrice: a.price,
          dayChange: 0,
          dayChangePct: 0,
        };
      }
      if (!state.marketHistory[a.ticker]) {
        state.marketHistory[a.ticker] = [a.price];
      }
    });
  }

  /* =========================================================================
     Random Walk with Drift
     newPrice = oldPrice * (1 + drift + uniform(-vol, +vol)) * newsMultiplier
     Then clamped to ±maxSwing of the category.
     ========================================================================= */
  function _stepPrice(oldPrice, def, categoryMeta, newsImpact, analystBonus = 0) {
    const noise = (Math.random() * 2 - 1) * def.vol; // baseline volatility
    // News pushes change toward the category's hard swing limit.
    const newsBoost = newsImpact * (categoryMeta.maxSwing - def.vol * 0.5);

    let change = categoryMeta.drift + analystBonus + noise + newsBoost;
    if (change >  categoryMeta.maxSwing) change =  categoryMeta.maxSwing;
    if (change < -categoryMeta.maxSwing) change = -categoryMeta.maxSwing;

    let next = oldPrice * (1 + change);

    // Floors per category to keep things sensible.
    const floor =
      categoryMeta.key === 'saham'     ? 50 :
      categoryMeta.key === 'crypto'    ? 100 :
      categoryMeta.key === 'reksadana' ? 100 : 1;
    if (next < floor) next = floor;

    next = Math.round(next);
    return { next, change };
  }

  /**
   * calculateNextDayPrices(state, newsImpactByTicker)
   * Advances all 45 assets by one day using Random Walk with Drift.
   * `newsImpactByTicker` is a Map/object: ticker -> impact in [-1..+1].
   * Veteran analyst (HRD tier 3) adds a +0.2% positive drift bonus.
   *
   * Phase 6 — DELAYED news effect:
   *   Before the random walk, every entry in state.pendingNewsEffects
   *   (queued by yesterday's generateDailyNews + any "Goreng Saham") is
   *   applied directly to its targeted asset. Affected tickers SKIP the
   *   random walk for the day so the queued multiplier is the only move.
   *   The queue is then cleared. TODAY's news is NOT applied here — the
   *   caller (advanceDay) generates today's news AFTER this step and
   *   queues their multipliers for tomorrow's call.
   */
  function calculateNextDayPrices(state, newsImpactByTicker = {}) {
    if (!state.marketAssets) initMarket(state);

    // ----------------------------------------------------------------------
    // Phase 6 — Step 1: apply yesterday's queued news effects + Goreng Saham.
    // ----------------------------------------------------------------------
    const affected = new Set();
    const pending = Array.isArray(state.pendingNewsEffects)
      ? state.pendingNewsEffects : [];
    pending.forEach(eff => {
      if (!eff || !eff.ticker) return;
      const m = state.marketAssets[eff.ticker];
      if (!m) return;
      const pct = clamp(Number(eff.multiplier) || 0, -0.95, 5);
      const before = m.price;
      const next = Math.max(1, Math.round(before * (1 + pct)));
      m.prevPrice    = before;
      m.openPrice    = before;
      m.price        = next;
      m.dayChange    = next - before;
      m.dayChangePct = before > 0 ? (m.dayChange / before) * 100 : 0;

      // Push to history (one tick per day per asset).
      const h = state.marketHistory[eff.ticker]
        || (state.marketHistory[eff.ticker] = []);
      h.push(next);
      if (h.length > HISTORY_LENGTH) h.shift();

      affected.add(eff.ticker);
    });
    state.pendingNewsEffects = [];

    // Apply analyst veteran drift bonus (Phase 3 perk)
    let analystBonus = 0;
    if (JI.getActivePerks) {
      const perks = JI.getActivePerks(state);
      if (perks && perks.analyst && perks.analyst.tier === 3) {
        analystBonus = 0.002; // +0.2% / day positive drift
      }
    }

    // ----------------------------------------------------------------------
    // Step 2: random walk for every UNAFFECTED asset. Phase 6 keeps news
    // impact OUT of today's drift (news effect is delayed via the queue).
    // ----------------------------------------------------------------------
    Object.values(CATEGORY).forEach(catMeta => {
      catMeta.assets.forEach(def => {
        const m = state.marketAssets[def.ticker];
        if (!m) return;
        if (affected.has(def.ticker)) return; // already moved by pending effect

        const impact = clamp(
          (newsImpactByTicker[def.ticker] || 0) +
          (newsImpactByTicker[`cat:${catMeta.key}`] || 0) +
          (newsImpactByTicker['cat:all'] || 0),
          -1, 1
        );
        const { next } = _stepPrice(m.price, def, catMeta, impact, analystBonus);

        m.prevPrice = m.price;
        m.openPrice = m.price; // open of new day = close of previous
        m.price = next;
        m.dayChange = next - m.prevPrice;
        m.dayChangePct = m.prevPrice > 0
          ? (m.dayChange / m.prevPrice) * 100
          : 0;

        // History
        const h = state.marketHistory[def.ticker] || (state.marketHistory[def.ticker] = []);
        h.push(next);
        if (h.length > HISTORY_LENGTH) h.shift();
      });
    });

    // Phase 6: news.assetSpike from TODAY's news is NOT applied here. Today's
    // news drives TOMORROW's prices. advanceDay() pushes those multipliers
    // into state.pendingNewsEffects so the next call consumes them above.
  }

  /* =========================================================================
     Predict next-day market impacts based on today's news.
     Used by the HRD Analis Keuangan perk (Junior=1, Senior=3, Veteran=5).
     Returns predictions sorted by |totalImpact| descending.
     ========================================================================= */
  function predictMarketImpacts(state, count) {
    const news = state.dailyNews || [];
    if (!news.length) return [];
    const impactMap = (JI.buildImpactMap ? JI.buildImpactMap(news) : {});

    const predictions = [];
    Object.values(CATEGORY).forEach(cat => {
      cat.assets.forEach(def => {
        const ticker = def.ticker;
        const tickerImpact = impactMap[ticker] || 0;
        const catImpact = impactMap[`cat:${cat.key}`] || 0;
        const allImpact = impactMap['cat:all'] || 0;
        const totalImpact = tickerImpact + catImpact + allImpact;
        if (Math.abs(totalImpact) < 1e-6) return;

        // Source headlines that targeted this asset/category/all.
        const reasons = [];
        const seen = new Set();
        news.forEach(n => {
          (n.targets || []).forEach(t => {
            const matches =
              t.scope === `asset:${ticker}` ||
              t.scope === `cat:${cat.key}` ||
              t.scope === 'cat:all';
            if (matches && !seen.has(n.sourceId || n.headline)) {
              seen.add(n.sourceId || n.headline);
              reasons.push({ headline: n.headline, icon: n.icon });
            }
          });
        });

        predictions.push({
          ticker,
          name: def.name,
          category: cat.key,
          categoryLabel: cat.label,
          totalImpact,
          direction: totalImpact > 0 ? 'up' : 'down',
          // Confidence: how much of the category's max swing this represents.
          confidence: Math.min(1, Math.abs(totalImpact) * (cat.maxSwing / Math.max(cat.maxSwing, 0.01))),
          reasons,
        });
      });
    });

    predictions.sort((a, b) => Math.abs(b.totalImpact) - Math.abs(a.totalImpact));
    return predictions.slice(0, Math.max(0, count));
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* =========================================================================
     Buy / Sell logic
     payment: { method: 'bank'|'credit', bankId }
     ========================================================================= */

  /* =========================================================================
     Broker rates (Phase 3)
     Default (no broker hired): 0.25% fee, 0% cashback
     Junior  (Rp 4M):  0.15% fee
     Senior  (Rp 15M): 0.05% fee
     Bandar  (Rp 40M): 0.00% fee + 0.10% cashback
     ========================================================================= */
  const DEFAULT_BROKER_FEE = 0.0025;
  const PPH_FINAL_RATE     = 0.001;  // 0.1% on profitable sales

  function getBrokerRates(state) {
    let rates = { feeRate: DEFAULT_BROKER_FEE, cashbackRate: 0, tier: 0 };
    if (JI.getActivePerks) {
      const perks = JI.getActivePerks(state);
      if (perks && perks.broker) {
        rates = {
          feeRate: perks.broker.feeRate,
          cashbackRate: perks.broker.cashbackRate || 0,
          tier: perks.broker.tier,
        };
      }
    }
    return rates;
  }

  function calcCost(ticker, qty) {
    const m = JI.gameState.marketAssets[ticker];
    if (!m) return 0;
    return Math.round(m.price * Number(qty || 0));
  }

  /**
   * Detailed quote for a buy: gross + broker fee + cashback + total charge.
   * Used by Buy modal preview.
   */
  function quoteBuy(state, ticker, qty) {
    const m = state.marketAssets[ticker];
    if (!m) return null;
    const grossCost = Math.round(m.price * Math.max(0, qty));
    const broker = getBrokerRates(state);
    const fee = Math.round(grossCost * broker.feeRate);
    const cashback = Math.round(grossCost * broker.cashbackRate);
    return {
      grossCost,
      fee,
      cashback,
      totalCharge: grossCost + fee,
      broker,
    };
  }

  /**
   * Detailed quote for a sell.
   */
  function quoteSell(state, ticker, qty) {
    const holding = state.portfolio.find(h => h.ticker === ticker);
    const m = state.marketAssets[ticker];
    if (!m || !holding || qty <= 0) return null;
    const q = Math.min(qty, holding.qty);
    const grossProceeds = Math.round(m.price * q);
    const costBasisShare = holding.qty > 0
      ? Math.round((holding.totalCost / holding.qty) * q)
      : 0;
    const grossPnL = grossProceeds - costBasisShare;
    const broker = getBrokerRates(state);
    const fee = Math.round(grossProceeds * broker.feeRate);
    const cashback = Math.round(grossProceeds * broker.cashbackRate);
    const pphFinal = grossPnL > 0 ? Math.round(grossPnL * PPH_FINAL_RATE) : 0;
    const netProceeds = grossProceeds - fee - pphFinal + cashback;
    return {
      qty: q,
      grossProceeds,
      costBasisShare,
      grossPnL,
      fee,
      pphFinal,
      cashback,
      netProceeds,
      netPnL: netProceeds - costBasisShare,
      broker,
    };
  }

  function buyAsset(state, ticker, qty, payment) {
    const idx = TICKER_INDEX[ticker];
    if (!idx) return { ok: false, error: 'Aset tidak ditemukan.' };
    qty = Math.floor(Number(qty) || 0);
    if (qty <= 0) return { ok: false, error: 'Jumlah harus lebih besar dari 0.' };

    /* Phase 6 — circulating supply cap for the 15 Local Stocks. */
    if (idx.category === 'saham' && idx.def.outstandingShares) {
      const avail = availableSupply(state, ticker);
      if (qty > avail) {
        const total = idx.def.outstandingShares.toLocaleString('id-ID');
        return {
          ok: false,
          error: `Suplai beredar habis! Hanya ${avail.toLocaleString('id-ID')} dari ${total} lembar yang tersisa.`,
        };
      }
    }

    const m = state.marketAssets[ticker];
    const grossCost = Math.round(m.price * qty);
    if (grossCost <= 0) return { ok: false, error: 'Nominal tidak valid.' };

    const broker = getBrokerRates(state);
    const fee = Math.round(grossCost * broker.feeRate);
    const cashback = Math.round(grossCost * broker.cashbackRate);
    const totalCharge = grossCost + fee;

    // Charge total via universal payment helper (with audit label)
    const charged = JI.charge(state, totalCharge, {
      ...payment,
      label: `Beli ${qty} ${ticker}`,
    });
    if (!charged.ok) return { ok: false, error: charged.error };

    // Deposit cashback to chosen bank (Bandar broker perk)
    if (cashback > 0 && payment.bankId) {
      JI.deposit(state, payment.bankId, cashback, `Cashback Bandar — ${ticker}`);
    }

    // Track lifetime stats
    state.brokerStats = state.brokerStats || {
      totalFeesPaid: 0, totalCashbackEarned: 0, totalRealizedPnL: 0,
      profitableSells: 0, losingSells: 0,
    };
    if (fee > 0)      state.brokerStats.totalFeesPaid += fee;
    if (cashback > 0) state.brokerStats.totalCashbackEarned += cashback;

    // Update / add holding (cost basis = gross only, fees tracked separately)
    let holding = state.portfolio.find(h => h.ticker === ticker);
    if (!holding) {
      holding = {
        ticker,
        category: idx.category,
        name: idx.def.name,
        qty: 0,
        avgPrice: 0,
        totalCost: 0,
      };
      state.portfolio.push(holding);
    }
    const newQty = holding.qty + qty;
    const newCostBasis = holding.totalCost + grossCost;
    holding.qty = newQty;
    holding.totalCost = newCostBasis;
    holding.avgPrice = Math.round(newCostBasis / newQty);

    JI.recomputeNetWorth(state);

    return {
      ok: true,
      ticker,
      qty,
      price: m.price,
      grossCost,
      fee,
      cashback,
      totalCharge,
      totalCost: grossCost,    // legacy field for backward compat with toasts
      payment: charged,
      broker,
    };
  }

  function sellAsset(state, ticker, qty, bankId) {
    qty = Math.floor(Number(qty) || 0);
    if (qty <= 0) return { ok: false, error: 'Jumlah jual tidak valid.' };
    const holding = state.portfolio.find(h => h.ticker === ticker);
    if (!holding || holding.qty < qty) {
      return { ok: false, error: 'Jumlah melebihi kepemilikan.' };
    }
    const m = state.marketAssets[ticker];
    if (!m) return { ok: false, error: 'Aset tidak ditemukan.' };

    const bank = JI.getBank(state, bankId);
    if (!bank) return { ok: false, error: 'Pilih rekening bank tujuan.' };

    const grossProceeds = Math.round(m.price * qty);
    const costBasisShare = Math.round((holding.totalCost / holding.qty) * qty);
    const grossPnL = grossProceeds - costBasisShare;

    // Broker fees / cashback
    const broker = getBrokerRates(state);
    const fee = Math.round(grossProceeds * broker.feeRate);
    const cashback = Math.round(grossProceeds * broker.cashbackRate);

    // PPh Final 0.1% on profit only
    const pphFinal = grossPnL > 0 ? Math.round(grossPnL * PPH_FINAL_RATE) : 0;

    const netProceeds = grossProceeds - fee - pphFinal + cashback;

    // Credit bank with net proceeds (audit-logged)
    JI.deposit(state, bankId, netProceeds, `Jual ${ticker} — net dari ${qty} ${idxLabel(holding.category)}`);

    // Update holding
    holding.qty -= qty;
    holding.totalCost -= costBasisShare;
    if (holding.qty <= 0) {
      const i = state.portfolio.indexOf(holding);
      state.portfolio.splice(i, 1);
    } else {
      holding.avgPrice = Math.round(holding.totalCost / holding.qty);
    }

    // Lifetime stats
    state.brokerStats = state.brokerStats || {
      totalFeesPaid: 0, totalCashbackEarned: 0, totalRealizedPnL: 0,
      profitableSells: 0, losingSells: 0,
    };
    if (fee > 0)      state.brokerStats.totalFeesPaid += fee;
    if (cashback > 0) state.brokerStats.totalCashbackEarned += cashback;
    state.brokerStats.totalRealizedPnL += grossPnL;
    if (grossPnL > 0) state.brokerStats.profitableSells += 1;
    else if (grossPnL < 0) state.brokerStats.losingSells += 1;

    // Tax stats
    state.taxStats = state.taxStats || { totalPPhPaid: 0, totalAnnualPaid: 0, totalPenaltiesPaid: 0 };
    if (pphFinal > 0) state.taxStats.totalPPhPaid += pphFinal;

    // XP per Phase 3 spec: only on profit. 50 base + 1 per Rp 1M profit.
    let xpAwarded = 0;
    let levelEvent = null;
    if (grossPnL > 0) {
      xpAwarded = 50 + Math.floor(grossPnL / 1_000_000);
      levelEvent = JI.awardXP(state, xpAwarded);
    }

    JI.recomputeNetWorth(state);

    return {
      ok: true,
      ticker,
      qty,
      grossProceeds,
      costBasisShare,
      grossPnL,
      fee,
      cashback,
      pphFinal,
      netProceeds,
      netPnL: netProceeds - costBasisShare,
      proceeds: netProceeds, // legacy field for Phase 2 toast text
      realizedPnL: grossPnL, // legacy field
      xpAwarded,
      levelEvent,
      broker,
    };
  }

  /* =========================================================================
     Helpers
     ========================================================================= */
  function categoryLabel(key) {
    return CATEGORY[key] ? CATEGORY[key].label : key;
  }

  function idxLabel(category) {
    return category === 'crypto' ? 'unit'
         : category === 'saham'  ? 'lbr'
         : 'unit';
  }

  function formatQty(category, qty) {
    if (category === 'crypto') return qty.toLocaleString('id-ID');
    if (category === 'saham')  return `${qty.toLocaleString('id-ID')} lbr`;
    return `${qty.toLocaleString('id-ID')} unit`;
  }

  /* =========================================================================
     Phase 6 — Bandar / "Goreng Saham" mechanics (Local Stocks ONLY)
     ----------------------------------------------------------------
     Circulating supply (outstandingShares) per stock is the cap on what
     a player can ever own. Crossing the 50% threshold flips the player
     into "Pemegang Saham Pengendali (Bandar)" status, which unlocks
     the Goreng Saham action.
     ========================================================================= */
  function ownedUnits(state, ticker) {
    const h = (state.portfolio || []).find(p => p.ticker === ticker);
    return h ? h.qty : 0;
  }

  function availableSupply(state, ticker) {
    const idx = TICKER_INDEX[ticker];
    if (!idx || idx.category !== 'saham' || !idx.def.outstandingShares) {
      return Infinity;
    }
    return Math.max(0, idx.def.outstandingShares - ownedUnits(state, ticker));
  }

  function ownershipPct(state, ticker) {
    const idx = TICKER_INDEX[ticker];
    if (!idx || !idx.def.outstandingShares) return 0;
    return ownedUnits(state, ticker) / idx.def.outstandingShares;
  }

  function isBandar(state, ticker) {
    return ownershipPct(state, ticker) >= 0.5;
  }

  function ownershipLabel(state, ticker) {
    const idx = TICKER_INDEX[ticker];
    if (!idx || idx.category !== 'saham' || !idx.def.outstandingShares) return null;
    const pct = ownershipPct(state, ticker);
    if (pct <= 0) return null;
    return isBandar(state, ticker)
      ? 'Pemegang Saham Pengendali (Bandar)'
      : 'Pemegang Saham Minoritas';
  }

  /* =========================================================================
     gorengSaham(state, ticker)
     - Requires ownership >= 50% on a Local Stock.
     - Cost: Rp 5.000.000.000 (5 Miliar) deducted from the richest bank.
     - Effect: queues a guaranteed +40% multiplier on that ticker into
       state.pendingNewsEffects so the spike lands on the NEXT advanceDay().
     - Double-goreng on the same ticker (already queued) is rejected.
     - Also pushes a "[GORENG]" headline into today's news feed.
     ========================================================================= */
  const GORENG_COST = 5_000_000_000;
  const GORENG_MULTIPLIER = 0.40;
  const GORENG_ICON = '🚨';

  function richestBank(state) {
    if (!state.banks || state.banks.length === 0) return null;
    return state.banks.reduce((best, b) =>
      (best == null || b.balance > best.balance) ? b : best, null);
  }

  function gorengSaham(state, ticker) {
    const idx = TICKER_INDEX[ticker];
    if (!idx || idx.category !== 'saham') {
      return { ok: false, error: 'Hanya saham IDX yang bisa di-goreng.' };
    }
    if (!isBandar(state, ticker)) {
      return {
        ok: false,
        error: 'Anda harus memegang minimal 50% (Bandar) untuk goreng saham ini.',
      };
    }

    state.pendingNewsEffects = state.pendingNewsEffects || [];
    if (state.pendingNewsEffects.some(e => e.ticker === ticker && e.source === 'goreng')) {
      return { ok: false, error: 'Saham ini sudah Anda goreng untuk besok. Tunggu efeknya.' };
    }

    const bank = richestBank(state);
    if (!bank || bank.balance < GORENG_COST) {
      return {
        ok: false,
        error: `Butuh ${JI.formatIDR(GORENG_COST)} cash di rekening terkaya untuk operasi goreng.`,
      };
    }

    // Debit the cost (audit-logged).
    if (typeof JI.bankDebit === 'function') {
      JI.bankDebit(state, bank.id, GORENG_COST, `Operasi Goreng Saham — ${ticker}`);
    } else {
      bank.balance -= GORENG_COST;
    }

    state.pendingNewsEffects.push({
      ticker,
      multiplier: GORENG_MULTIPLIER,
      source: 'goreng',
    });

    // Surface a "leaked" headline today so the player can SEE the Bandar
    // move in their News feed (the price impact still lands tomorrow).
    const day = state.totalDays;
    const news = {
      day,
      id: `${day}-goreng-${ticker}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: `goreng-${ticker}`,
      mood: 'bullish',
      icon: GORENG_ICON,
      headline: `[GORENG] Saham ${idx.def.name} Diborong Pihak Misterius Jelang Penutupan!`,
      body: `Bursa Saham · ${ticker} — Volume meledak menjelang penutupan. Bandar saham bermain. Harga diperkirakan melonjak +40% besok.`,
      targets: [{ scope: `asset:${ticker}`, impact: GORENG_MULTIPLIER }],
      assetSpike: {
        ticker,
        name: idx.def.name,
        category: idx.category,
        sentiment: 'bullish',
        range: [GORENG_MULTIPLIER, GORENG_MULTIPLIER],
      },
      realizedPct: GORENG_MULTIPLIER,
      multiplier: GORENG_MULTIPLIER,
      isGoreng: true,
    };
    state.dailyNews = state.dailyNews || [];
    state.dailyNews.push(news);
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(news);
    if (state.newsHistory.length > 200) state.newsHistory.length = 200;

    if (typeof JI.recomputeNetWorth === 'function') JI.recomputeNetWorth(state);

    return {
      ok: true,
      ticker,
      cost: GORENG_COST,
      multiplier: GORENG_MULTIPLIER,
      bankId: bank.id,
      bankName: bank.shortName || bank.name,
    };
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    CATEGORY,
    STOCKS,
    CRYPTOS,
    REKSADANA,
    allAssets,
    getAssetDef,
    initMarket,
    calculateNextDayPrices,
    calcCost,
    quoteBuy,
    quoteSell,
    buyAsset,
    sellAsset,
    categoryLabel,
    formatQty,
    // Phase 3 additions
    predictMarketImpacts,
    getBrokerRates,
    DEFAULT_BROKER_FEE,
    PPH_FINAL_RATE,
    // Phase 6 additions
    ownedUnits,
    availableSupply,
    ownershipPct,
    isBandar,
    ownershipLabel,
    gorengSaham,
    GORENG_COST,
    GORENG_MULTIPLIER,
  });
})(window);
