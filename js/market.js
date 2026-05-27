/* =========================================================================
   market.js — 45 hardcoded Indonesian assets + price engine.

   Categories: 'stock' (IDX), 'crypto', 'mutual'
   Sectors (stocks only): 'Bank', 'Telco', 'Auto', 'Consumer', 'Mining',
                          'Energy', 'Pharma'

   Phase 5: calculateNextDayPrices() reacts to per-asset news sentiment:
     - Bullish stock/mutual : +5% .. +15%
     - Bullish crypto       : +5% .. +40%
     - Bearish (any)        : -5% .. -20%
   Plus a tiny baseline drift driven by category volatility.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Master asset list (exactly 45) ---------- */
  const ASSETS = [
    /* ============== STOCKS (15) ============== */
    { ticker: 'BBCA', name: 'Bank Central Asia',          category: 'stock', sector: 'Bank',     initialPrice: 9_500,    volatility: 0.018 },
    { ticker: 'BMRI', name: 'Bank Mandiri',               category: 'stock', sector: 'Bank',     initialPrice: 6_100,    volatility: 0.020 },
    { ticker: 'BBRI', name: 'Bank Rakyat Indonesia',      category: 'stock', sector: 'Bank',     initialPrice: 4_800,    volatility: 0.020 },
    { ticker: 'BBNI', name: 'Bank Negara Indonesia',      category: 'stock', sector: 'Bank',     initialPrice: 5_200,    volatility: 0.022 },
    { ticker: 'TLKM', name: 'Telkom Indonesia',           category: 'stock', sector: 'Telco',    initialPrice: 3_400,    volatility: 0.019 },
    { ticker: 'ASII', name: 'Astra International',        category: 'stock', sector: 'Auto',     initialPrice: 5_500,    volatility: 0.022 },
    { ticker: 'UNVR', name: 'Unilever Indonesia',         category: 'stock', sector: 'Consumer', initialPrice: 2_800,    volatility: 0.021 },
    { ticker: 'ICBP', name: 'Indofood CBP Sukses Makmur', category: 'stock', sector: 'Consumer', initialPrice: 11_500,   volatility: 0.018 },
    { ticker: 'INDF', name: 'Indofood Sukses Makmur',     category: 'stock', sector: 'Consumer', initialPrice: 6_400,    volatility: 0.018 },
    { ticker: 'GGRM', name: 'Gudang Garam',               category: 'stock', sector: 'Consumer', initialPrice: 22_000,   volatility: 0.024 },
    { ticker: 'HMSP', name: 'HM Sampoerna',               category: 'stock', sector: 'Consumer', initialPrice: 1_200,    volatility: 0.025 },
    { ticker: 'ANTM', name: 'Aneka Tambang',              category: 'stock', sector: 'Mining',   initialPrice: 1_650,    volatility: 0.030 },
    { ticker: 'PTBA', name: 'Bukit Asam',                 category: 'stock', sector: 'Mining',   initialPrice: 2_750,    volatility: 0.028 },
    { ticker: 'ADRO', name: 'Adaro Energy',               category: 'stock', sector: 'Energy',   initialPrice: 2_400,    volatility: 0.030 },
    { ticker: 'KLBF', name: 'Kalbe Farma',                category: 'stock', sector: 'Pharma',   initialPrice: 1_500,    volatility: 0.020 },

    /* ============== CRYPTO (15) ============== */
    { ticker: 'BTC',   name: 'Bitcoin',       category: 'crypto', initialPrice: 1_050_000_000, volatility: 0.045 },
    { ticker: 'ETH',   name: 'Ethereum',      category: 'crypto', initialPrice: 55_000_000,    volatility: 0.050 },
    { ticker: 'BNB',   name: 'BNB',           category: 'crypto', initialPrice: 9_500_000,     volatility: 0.055 },
    { ticker: 'SOL',   name: 'Solana',        category: 'crypto', initialPrice: 2_400_000,     volatility: 0.075 },
    { ticker: 'XRP',   name: 'Ripple',        category: 'crypto', initialPrice: 9_500,         volatility: 0.060 },
    { ticker: 'ADA',   name: 'Cardano',       category: 'crypto', initialPrice: 7_200,         volatility: 0.065 },
    { ticker: 'DOGE',  name: 'Dogecoin',      category: 'crypto', initialPrice: 2_500,         volatility: 0.090 },
    { ticker: 'MATIC', name: 'Polygon',       category: 'crypto', initialPrice: 12_000,        volatility: 0.070 },
    { ticker: 'DOT',   name: 'Polkadot',      category: 'crypto', initialPrice: 110_000,       volatility: 0.065 },
    { ticker: 'AVAX',  name: 'Avalanche',     category: 'crypto', initialPrice: 580_000,       volatility: 0.075 },
    { ticker: 'LINK',  name: 'Chainlink',     category: 'crypto', initialPrice: 220_000,       volatility: 0.060 },
    { ticker: 'SHIB',  name: 'Shiba Inu',     category: 'crypto', initialPrice: 1,             volatility: 0.110 },
    { ticker: 'LTC',   name: 'Litecoin',      category: 'crypto', initialPrice: 1_400_000,     volatility: 0.050 },
    { ticker: 'TRX',   name: 'Tron',          category: 'crypto', initialPrice: 1_700,         volatility: 0.055 },
    { ticker: 'NEAR',  name: 'NEAR Protocol', category: 'crypto', initialPrice: 60_000,        volatility: 0.080 },

    /* ============== MUTUAL FUNDS (15) ============== */
    { ticker: 'SBR',  name: 'Sucorinvest Saham Berlian',         category: 'mutual', initialPrice: 2_400, volatility: 0.010 },
    { ticker: 'MEDR', name: 'Mandiri Equity Dynamic Return',     category: 'mutual', initialPrice: 4_100, volatility: 0.011 },
    { ticker: 'BIME', name: 'BNP Indonesia Maxima Equity',       category: 'mutual', initialPrice: 1_800, volatility: 0.012 },
    { ticker: 'SRTG', name: 'Schroder Saham Pertumbuhan',        category: 'mutual', initialPrice: 3_500, volatility: 0.012 },
    { ticker: 'BNII', name: 'Batavia Indonesia Indeks Saham',    category: 'mutual', initialPrice: 1_950, volatility: 0.011 },
    { ticker: 'SCDX', name: 'Sucorinvest Stable Cash Fund',      category: 'mutual', initialPrice: 2_100, volatility: 0.005 },
    { ticker: 'MUSK', name: 'Manulife USD Stock Kumpulan',       category: 'mutual', initialPrice: 5_200, volatility: 0.013 },
    { ticker: 'PNMC', name: 'PNM Saham Berkembang',              category: 'mutual', initialPrice: 1_600, volatility: 0.012 },
    { ticker: 'AXVI', name: 'Axia Visi Pendapatan Tetap',        category: 'mutual', initialPrice: 1_300, volatility: 0.006 },
    { ticker: 'DSIM', name: 'Danareksa Seruni Pasar Uang II',    category: 'mutual', initialPrice: 1_450, volatility: 0.004 },
    { ticker: 'TRBM', name: 'Trim Berkembang',                   category: 'mutual', initialPrice: 2_900, volatility: 0.012 },
    { ticker: 'SRPM', name: 'Schroder Pasar Uang',               category: 'mutual', initialPrice: 1_220, volatility: 0.004 },
    { ticker: 'ABDB', name: 'Avrist Balanced Dynamic Berimbang', category: 'mutual', initialPrice: 2_650, volatility: 0.009 },
    { ticker: 'PRBI', name: 'Prospera Bijak',                    category: 'mutual', initialPrice: 1_750, volatility: 0.010 },
    { ticker: 'BHKM', name: 'Bahana Likuid Syariah',             category: 'mutual', initialPrice: 1_080, volatility: 0.007 },
  ];

  /* ---------- Lookup helpers ---------- */
  function getAsset(ticker) {
    return ASSETS.find(a => a.ticker === ticker) || null;
  }

  function getAssetsByCategory(category) {
    return ASSETS.filter(a => a.category === category);
  }

  function getAssetsBySector(sector) {
    return ASSETS.filter(a => a.sector === sector);
  }

  function getCurrentPrice(state, ticker) {
    return (state.assetPrices && state.assetPrices[ticker]) || 0;
  }

  /* ---------- Price seeding ----------
     Initialize assetPrices/priceHistory if missing or incomplete. */
  function seedMarket(state) {
    if (!state.assetPrices)  state.assetPrices  = {};
    if (!state.priceHistory) state.priceHistory = {};
    ASSETS.forEach(a => {
      if (state.assetPrices[a.ticker] == null) {
        state.assetPrices[a.ticker]  = a.initialPrice;
        state.priceHistory[a.ticker] = [a.initialPrice];
      }
      if (!Array.isArray(state.priceHistory[a.ticker])) {
        state.priceHistory[a.ticker] = [state.assetPrices[a.ticker]];
      }
    });
  }

  /* ---------- Apply a multiplicative pct to a single asset ---------- */
  function applyPctToTicker(state, ticker, pct) {
    const cur = state.assetPrices[ticker];
    if (cur == null) return;
    const next = Math.max(1, Math.round(cur * (1 + pct)));
    state.assetPrices[ticker] = next;
  }

  /* ---------- Apply pct to every asset matching a predicate ---------- */
  function applyPctToCategory(state, predicate, pctMin, pctMax) {
    ASSETS.forEach(a => {
      if (!predicate(a)) return;
      const pct = JI.randomFloat(pctMin, pctMax);
      applyPctToTicker(state, a.ticker, pct);
    });
  }

  /* ---------- Per-asset news impact pct ----------
     Returns a number like +0.07 (bullish) or -0.12 (bearish). */
  function newsImpactPct(asset, sentiment) {
    if (sentiment === 'bullish') {
      if (asset.category === 'crypto') return JI.randomFloat(0.05, 0.40);
      return JI.randomFloat(0.05, 0.15);
    }
    if (sentiment === 'bearish') {
      return -JI.randomFloat(0.05, 0.20);
    }
    return 0;
  }

  /* ---------- Daily price evolution ----------
     Phase 5: each asset's new price = current * (1 + drift + newsImpact)
     `todaysNews` is an array of news items: {ticker, sentiment, ...}
     The same news item drives the SAME asset's instant spike/drop. */
  function calculateNextDayPrices(state, todaysNews) {
    if (!state.assetPrices) seedMarket(state);

    // Build a quick lookup: ticker -> sentiment of today's news
    const newsByTicker = {};
    (todaysNews || []).forEach(n => {
      if (!n || !n.ticker) return;
      newsByTicker[n.ticker] = n.sentiment;
    });

    ASSETS.forEach(asset => {
      const cur = state.assetPrices[asset.ticker];
      if (cur == null) return;

      // baseline drift: gaussian-ish noise centered on 0
      const drift = (Math.random() - 0.5) * asset.volatility * 2;

      // news impact (if asset is mentioned today)
      const sentiment = newsByTicker[asset.ticker];
      const impact = sentiment ? newsImpactPct(asset, sentiment) : 0;

      let pct = drift + impact;

      // floor on catastrophic noise so prices don't vanish
      pct = JI.clamp(pct, -0.6, 0.8);

      const next = Math.max(1, Math.round(cur * (1 + pct)));
      state.assetPrices[asset.ticker] = next;

      const hist = state.priceHistory[asset.ticker] || [];
      hist.push(next);
      if (hist.length > 60) hist.shift();
      state.priceHistory[asset.ticker] = hist;
    });
  }

  /* ---------- 24h pct change (vs previous close) ---------- */
  function dailyChangePct(state, ticker) {
    const hist = (state.priceHistory || {})[ticker] || [];
    if (hist.length < 2) return 0;
    const prev = hist[hist.length - 2];
    const last = hist[hist.length - 1];
    if (!prev) return 0;
    return (last - prev) / prev;
  }

  /* ---------- Format price with sensible precision ---------- */
  function formatPrice(ticker, price) {
    const a = getAsset(ticker);
    if (!a) return JI.formatIDR(price);
    if (a.category === 'crypto' && a.initialPrice >= 1_000_000) {
      return JI.formatIDRCompact(price);
    }
    return JI.formatIDR(price);
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    ASSETS,
    getAsset,
    getAssetsByCategory,
    getAssetsBySector,
    getCurrentPrice,
    seedMarket,
    applyPctToTicker,
    applyPctToCategory,
    newsImpactPct,
    calculateNextDayPrices,
    dailyChangePct,
    formatPrice,
  });
})(window);
