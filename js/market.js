/* =========================================================================
   market.js — Stocks & crypto: state, daily ticks, sector multipliers.
   Used by Black Swan events and (later) the Market tab.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Starter universe ---------- */
  const STOCK_SEED = [
    { ticker: 'BBCA', name: 'Bank Central Asia',         sector: 'Banking',  price: 9_500  },
    { ticker: 'BBRI', name: 'Bank Rakyat Indonesia',     sector: 'Banking',  price: 4_500  },
    { ticker: 'BMRI', name: 'Bank Mandiri',              sector: 'Banking',  price: 6_200  },
    { ticker: 'TLKM', name: 'Telkom Indonesia',          sector: 'Tech',     price: 3_800  },
    { ticker: 'GOTO', name: 'GoTo Group',                sector: 'Tech',     price: 75     },
    { ticker: 'EMTK', name: 'Elang Mahkota Teknologi',   sector: 'Tech',     price: 1_200  },
    { ticker: 'UNVR', name: 'Unilever Indonesia',        sector: 'Consumer', price: 2_500  },
    { ticker: 'INDF', name: 'Indofood Sukses Makmur',    sector: 'Consumer', price: 6_400  },
    { ticker: 'ASII', name: 'Astra International',       sector: 'Auto',     price: 5_300  },
    { ticker: 'PTBA', name: 'Bukit Asam',                sector: 'Energy',   price: 2_700  },
  ];

  const CRYPTO_SEED = [
    { ticker: 'BTC', name: 'Bitcoin',  price: 1_050_000_000 },
    { ticker: 'ETH', name: 'Ethereum', price:    60_000_000 },
    { ticker: 'SOL', name: 'Solana',   price:     3_500_000 },
    { ticker: 'BNB', name: 'BNB',      price:     9_500_000 },
    { ticker: 'ADA', name: 'Cardano',  price:        12_000 },
  ];

  function makeDefaultMarket() {
    const stocks = STOCK_SEED.map(s => ({
      ...s,
      prevPrice: s.price,
      seedPrice: s.price,
    }));
    const cryptos = CRYPTO_SEED.map(c => ({
      ...c,
      prevPrice: c.price,
      seedPrice: c.price,
    }));
    return { stocks, cryptos };
  }

  function ensureMarket(state) {
    if (!state.market) state.market = makeDefaultMarket();
    if (!Array.isArray(state.market.stocks))  state.market.stocks  = makeDefaultMarket().stocks;
    if (!Array.isArray(state.market.cryptos)) state.market.cryptos = makeDefaultMarket().cryptos;
  }

  /* ---------- Lookup ---------- */
  function findMarketAsset(state, ticker) {
    if (!state || !state.market || !ticker) return null;
    const t = String(ticker).toUpperCase();
    return (state.market.stocks  || []).find(s => s.ticker === t)
        || (state.market.cryptos || []).find(c => c.ticker === t)
        || null;
  }

  /* ---------- Daily price tick (random walk) ----------
     Stocks  drift ±2%. Cryptos drift ±5%.
     If activeEventModifier is in effect we skip the random walk because the
     event has already shocked prices (per spec: events override standard
     daily multipliers for that day).
  */
  function dailyPriceTick(state) {
    ensureMarket(state);

    const eventActive =
      state.activeEventModifier && state.activeEventModifier.expiresInDays > 0;
    if (eventActive) {
      // Tick down expiry but don't drift this day.
      state.activeEventModifier.expiresInDays -= 1;
      if (state.activeEventModifier.expiresInDays <= 0) {
        state.activeEventModifier = null;
      }
      return;
    }

    state.market.stocks.forEach(s => {
      s.prevPrice = s.price;
      const drift = (Math.random() - 0.5) * 0.04; // ±2%
      s.price = Math.max(1, Math.round(s.price * (1 + drift)));
    });

    state.market.cryptos.forEach(c => {
      c.prevPrice = c.price;
      const drift = (Math.random() - 0.5) * 0.10; // ±5%
      c.price = Math.max(1, Math.round(c.price * (1 + drift)));
    });
  }

  /* ---------- Multiplier helpers (used by Black Swan) ---------- */
  function scaleAllStocks(state, factor) {
    ensureMarket(state);
    state.market.stocks.forEach(s => {
      s.prevPrice = s.price;
      s.price = Math.max(1, Math.round(s.price * factor));
    });
  }

  function scaleStocksBySector(state, sector, factor) {
    ensureMarket(state);
    state.market.stocks.forEach(s => {
      if (s.sector === sector) {
        s.prevPrice = s.price;
        s.price = Math.max(1, Math.round(s.price * factor));
      }
    });
  }

  function scaleAllCryptos(state, factor) {
    ensureMarket(state);
    state.market.cryptos.forEach(c => {
      c.prevPrice = c.price;
      c.price = Math.max(1, Math.round(c.price * factor));
    });
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    makeDefaultMarket,
    ensureMarket,
    findMarketAsset,
    dailyPriceTick,
    scaleAllStocks,
    scaleStocksBySector,
    scaleAllCryptos,
  });
})(window);
