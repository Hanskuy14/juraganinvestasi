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

  /* ---------- Master asset list (exactly 45) ----------
     Phase 6: stocks now carry `outstandingShares` (5M..20M) — the cap on
     circulating supply. Used to enforce supply on buy and to drive Bandar
     (>=50% ownership) "Goreng Saham" mechanic. Crypto + Reksadana are
     uncapped (you're trading derivatives / NAB units, not equity slices). */
  const ASSETS = [
    /* ============== STOCKS (15) ============== */
    { ticker: 'BBCA', name: 'Bank Central Asia',          category: 'stock', sector: 'Bank',     initialPrice: 9_500,    volatility: 0.018, outstandingShares: 12_000_000 },
    { ticker: 'BMRI', name: 'Bank Mandiri',               category: 'stock', sector: 'Bank',     initialPrice: 6_100,    volatility: 0.020, outstandingShares: 15_000_000 },
    { ticker: 'BBRI', name: 'Bank Rakyat Indonesia',      category: 'stock', sector: 'Bank',     initialPrice: 4_800,    volatility: 0.020, outstandingShares: 18_000_000 },
    { ticker: 'BBNI', name: 'Bank Negara Indonesia',      category: 'stock', sector: 'Bank',     initialPrice: 5_200,    volatility: 0.022, outstandingShares: 14_000_000 },
    { ticker: 'TLKM', name: 'Telkom Indonesia',           category: 'stock', sector: 'Telco',    initialPrice: 3_400,    volatility: 0.019, outstandingShares: 19_000_000 },
    { ticker: 'ASII', name: 'Astra International',        category: 'stock', sector: 'Auto',     initialPrice: 5_500,    volatility: 0.022, outstandingShares: 10_000_000 },
    { ticker: 'UNVR', name: 'Unilever Indonesia',         category: 'stock', sector: 'Consumer', initialPrice: 2_800,    volatility: 0.021, outstandingShares: 16_000_000 },
    { ticker: 'ICBP', name: 'Indofood CBP Sukses Makmur', category: 'stock', sector: 'Consumer', initialPrice: 11_500,   volatility: 0.018, outstandingShares:  8_000_000 },
    { ticker: 'INDF', name: 'Indofood Sukses Makmur',     category: 'stock', sector: 'Consumer', initialPrice: 6_400,    volatility: 0.018, outstandingShares: 11_000_000 },
    { ticker: 'GGRM', name: 'Gudang Garam',               category: 'stock', sector: 'Consumer', initialPrice: 22_000,   volatility: 0.024, outstandingShares:  6_000_000 },
    { ticker: 'HMSP', name: 'HM Sampoerna',               category: 'stock', sector: 'Consumer', initialPrice: 1_200,    volatility: 0.025, outstandingShares: 20_000_000 },
    { ticker: 'ANTM', name: 'Aneka Tambang',              category: 'stock', sector: 'Mining',   initialPrice: 1_650,    volatility: 0.030, outstandingShares: 13_000_000 },
    { ticker: 'PTBA', name: 'Bukit Asam',                 category: 'stock', sector: 'Mining',   initialPrice: 2_750,    volatility: 0.028, outstandingShares:  9_000_000 },
    { ticker: 'ADRO', name: 'Adaro Energy',               category: 'stock', sector: 'Energy',   initialPrice: 2_400,    volatility: 0.030, outstandingShares:  7_500_000 },
    { ticker: 'KLBF', name: 'Kalbe Farma',                category: 'stock', sector: 'Pharma',   initialPrice: 1_500,    volatility: 0.020, outstandingShares:  5_000_000 },

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
     Initialize assetPrices/priceHistory if missing or incomplete.
     Phase 7: re-hydrate any persisted dynamicAssets back into JI.ASSETS so
     they survive page reloads. */
  function seedMarket(state) {
    if (!state.assetPrices)  state.assetPrices  = {};
    if (!state.priceHistory) state.priceHistory = {};

    // Re-hydrate runtime-created assets (player IPO, e-IPO listings).
    if (Array.isArray(state.dynamicAssets) && state.dynamicAssets.length) {
      state.dynamicAssets.forEach(da => {
        if (!ASSETS.find(a => a.ticker === da.ticker)) ASSETS.push(da);
      });
    }

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

  /* ---------- Add a dynamic asset at runtime (Phase 7) ----------
     Used by the e-IPO listing flow and the player Startup IPO. The asset
     becomes a first-class member of JI.ASSETS and is persisted via
     state.dynamicAssets so it survives page reloads. */
  function addDynamicAsset(state, def) {
    if (!def || !def.ticker) return null;
    if (ASSETS.find(a => a.ticker === def.ticker)) return null; // dedupe

    const asset = {
      ticker: def.ticker,
      name: def.name || def.ticker,
      category: def.category || 'stock',
      sector: def.sector || 'Lainnya',
      initialPrice: Math.max(1, Math.floor(def.initialPrice || 100)),
      volatility: typeof def.volatility === 'number' ? def.volatility : 0.025,
    };

    ASSETS.push(asset);

    // persist
    if (!Array.isArray(state.dynamicAssets)) state.dynamicAssets = [];
    if (!state.dynamicAssets.find(a => a.ticker === asset.ticker)) {
      state.dynamicAssets.push(asset);
    }

    // seed price + history
    if (!state.assetPrices) state.assetPrices = {};
    if (!state.priceHistory) state.priceHistory = {};
    state.assetPrices[asset.ticker]  = asset.initialPrice;
    state.priceHistory[asset.ticker] = [asset.initialPrice];

    return asset;
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

  /* =========================================================================
     Phase 6 — Bandar / Ownership helpers (Local Stocks only).

     Stocks have a fixed circulating supply (outstandingShares). The player's
     ownership pct = ownedUnits / outstandingShares. When pct >= 0.5 the
     player becomes the controlling shareholder ("Bandar") of that ticker
     and unlocks the Goreng Saham flow in portfolio.js.
     ========================================================================= */
  function ownedUnits(state, ticker) {
    const pos = (state.portfolio || []).find(p => p.ticker === ticker);
    return pos ? (pos.qty || 0) : 0;
  }

  function availableSupply(state, ticker) {
    const a = getAsset(ticker);
    if (!a || a.category !== 'stock' || !a.outstandingShares) return Infinity;
    return Math.max(0, a.outstandingShares - ownedUnits(state, ticker));
  }

  function ownershipPct(state, ticker) {
    const a = getAsset(ticker);
    if (!a || !a.outstandingShares) return 0;
    return ownedUnits(state, ticker) / a.outstandingShares;
  }

  function isBandar(state, ticker) {
    return ownershipPct(state, ticker) >= 0.5;
  }

  /* ---------- Daily price evolution ----------
     Phase 6 reorder:
       1. Drain state.pendingNewsEffects[] FIRST. Each entry carries a
          pre-rolled multiplier rolled when the headline was generated
          yesterday (or by Goreng Saham). Multipliers stack additively
          per ticker.
       2. Apply baseline drift + per-ticker pending impact.
     `todaysNews` is accepted for backward compat but no longer drives
     same-day spikes — news.js queues today's effects for tomorrow. */
  function calculateNextDayPrices(state, _todaysNewsIgnored) {
    if (!state.assetPrices) seedMarket(state);

    /* 1. Drain pending news effects into a per-ticker bonus. */
    const bonusByTicker = {};
    const pending = Array.isArray(state.pendingNewsEffects)
      ? state.pendingNewsEffects : [];
    pending.forEach(p => {
      if (!p || !p.ticker || typeof p.multiplier !== 'number') return;
      bonusByTicker[p.ticker] = (bonusByTicker[p.ticker] || 0) + p.multiplier;
    });
    state.pendingNewsEffects = [];

    /* 2. Walk every asset. */
    ASSETS.forEach(asset => {
      const cur = state.assetPrices[asset.ticker];
      if (cur == null) return;

      // baseline drift: gaussian-ish noise centered on 0
      const drift = (Math.random() - 0.5) * asset.volatility * 2;

      // delayed news / goreng impact
      const impact = bonusByTicker[asset.ticker] || 0;

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
    addDynamicAsset,
    applyPctToTicker,
    applyPctToCategory,
    newsImpactPct,
    calculateNextDayPrices,
    dailyChangePct,
    formatPrice,
    // Phase 6 — Bandar / supply
    ownedUnits,
    availableSupply,
    ownershipPct,
    isBandar,
  });
})(window);
