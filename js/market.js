/* =========================================================================
   market.js — 45 hardcoded assets, Random Walk with Drift, buy/sell.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* =========================================================================
     CATEGORY 1 — Saham Lokal (15)
     Range: Rp 50 — Rp 40.000
     ========================================================================= */
  const STOCKS = [
    { ticker: 'BBCA', name: 'Bank Central Asia',          price: 9_500,  vol: 0.022, sector: 'Perbankan' },
    { ticker: 'BBRI', name: 'Bank Rakyat Indonesia',      price: 5_200,  vol: 0.026, sector: 'Perbankan' },
    { ticker: 'BMRI', name: 'Bank Mandiri',               price: 6_800,  vol: 0.026, sector: 'Perbankan' },
    { ticker: 'BBNI', name: 'Bank Negara Indonesia',      price: 5_500,  vol: 0.028, sector: 'Perbankan' },
    { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia',       price: 80,     vol: 0.045, sector: 'Teknologi' },
    { ticker: 'TLKM', name: 'Telkom Indonesia',           price: 3_400,  vol: 0.024, sector: 'Telekomunikasi' },
    { ticker: 'ASII', name: 'Astra International',        price: 4_900,  vol: 0.028, sector: 'Otomotif' },
    { ticker: 'UNVR', name: 'Unilever Indonesia',         price: 2_400,  vol: 0.024, sector: 'Konsumsi' },
    { ticker: 'ICBP', name: 'Indofood CBP',               price: 11_000, vol: 0.022, sector: 'Konsumsi' },
    { ticker: 'BUMI', name: 'Bumi Resources',             price: 150,    vol: 0.048, sector: 'Energi' },
    { ticker: 'ANTM', name: 'Aneka Tambang',              price: 1_700,  vol: 0.038, sector: 'Pertambangan' },
    { ticker: 'PTBA', name: 'Bukit Asam',                 price: 2_900,  vol: 0.034, sector: 'Energi' },
    { ticker: 'PGAS', name: 'Perusahaan Gas Negara',      price: 1_500,  vol: 0.030, sector: 'Energi' },
    { ticker: 'KLBF', name: 'Kalbe Farma',                price: 1_550,  vol: 0.024, sector: 'Farmasi' },
    { ticker: 'MDKA', name: 'Merdeka Copper Gold',        price: 2_700,  vol: 0.040, sector: 'Pertambangan' },
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
  function _stepPrice(oldPrice, def, categoryMeta, newsImpact) {
    const noise = (Math.random() * 2 - 1) * def.vol; // baseline volatility
    // News pushes change toward the category's hard swing limit.
    const newsBoost = newsImpact * (categoryMeta.maxSwing - def.vol * 0.5);

    let change = categoryMeta.drift + noise + newsBoost;
    if (change >  categoryMeta.maxSwing) change =  categoryMeta.maxSwing;
    if (change < -categoryMeta.maxSwing) change = -categoryMeta.maxSwing;

    let next = oldPrice * (1 + change);

    // Floors per category to keep things sensible.
    const floor =
      categoryMeta.key === 'saham'     ? 50 :
      categoryMeta.key === 'crypto'    ? 100 :
      categoryMeta.key === 'reksadana' ? 100 : 1;
    if (next < floor) next = floor;

    // Round: stocks/reksadana to integer rupiah; crypto integer too (rupiah is whole).
    next = Math.round(next);
    return { next, change };
  }

  /**
   * calculateNextDayPrices(state, newsImpactByTicker)
   * Advances all 45 assets by one day using Random Walk with Drift.
   * `newsImpactByTicker` is a Map/object: ticker -> impact in [-1..+1].
   */
  function calculateNextDayPrices(state, newsImpactByTicker = {}) {
    if (!state.marketAssets) initMarket(state);

    Object.values(CATEGORY).forEach(catMeta => {
      catMeta.assets.forEach(def => {
        const m = state.marketAssets[def.ticker];
        if (!m) return;
        const impact = clamp(
          newsImpactByTicker[def.ticker] ||
          newsImpactByTicker[`cat:${catMeta.key}`] ||
          newsImpactByTicker['cat:all'] || 0,
          -1, 1
        );
        const { next } = _stepPrice(m.price, def, catMeta, impact);

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
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* =========================================================================
     Buy / Sell logic
     payment: { method: 'bank'|'credit', bankId }
     ========================================================================= */

  function calcCost(ticker, qty) {
    const m = JI.gameState.marketAssets[ticker];
    if (!m) return 0;
    return Math.round(m.price * Number(qty || 0));
  }

  function buyAsset(state, ticker, qty, payment) {
    const idx = TICKER_INDEX[ticker];
    if (!idx) return { ok: false, error: 'Aset tidak ditemukan.' };
    qty = Math.floor(Number(qty) || 0);
    if (qty <= 0) return { ok: false, error: 'Jumlah harus lebih besar dari 0.' };

    const m = state.marketAssets[ticker];
    const totalCost = Math.round(m.price * qty);
    if (totalCost <= 0) return { ok: false, error: 'Nominal tidak valid.' };

    // Charge payment
    const charged = JI.charge(state, totalCost, payment);
    if (!charged.ok) return { ok: false, error: charged.error };

    // Update / add holding
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
    const newCostBasis = holding.totalCost + totalCost;
    holding.qty = newQty;
    holding.totalCost = newCostBasis;
    holding.avgPrice = Math.round(newCostBasis / newQty);

    JI.recomputeNetWorth(state);
    JI.awardXP(state, Math.min(80, Math.floor(totalCost / 5_000_000)));

    return {
      ok: true,
      ticker,
      qty,
      price: m.price,
      totalCost,
      payment: charged,
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

    const proceeds = Math.round(m.price * qty);
    const costBasisShare = Math.round((holding.totalCost / holding.qty) * qty);
    const realizedPnL = proceeds - costBasisShare;

    bank.balance += proceeds;
    JI.refreshBankDerived?.(bank);

    holding.qty -= qty;
    holding.totalCost -= costBasisShare;
    if (holding.qty <= 0) {
      const i = state.portfolio.indexOf(holding);
      state.portfolio.splice(i, 1);
    } else {
      holding.avgPrice = Math.round(holding.totalCost / holding.qty);
    }

    JI.recomputeNetWorth(state);
    JI.awardXP(state, Math.min(60, Math.floor(Math.abs(realizedPnL) / 2_000_000)));

    return { ok: true, proceeds, realizedPnL, ticker, qty };
  }

  /* =========================================================================
     Helpers
     ========================================================================= */
  function categoryLabel(key) {
    return CATEGORY[key] ? CATEGORY[key].label : key;
  }

  function formatQty(category, qty) {
    if (category === 'crypto') return qty.toLocaleString('id-ID');
    if (category === 'saham')  return `${qty.toLocaleString('id-ID')} lbr`;
    return `${qty.toLocaleString('id-ID')} unit`;
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
    buyAsset,
    sellAsset,
    categoryLabel,
    formatQty,
  });
})(window);
