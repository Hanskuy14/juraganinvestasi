/* =========================================================================
   news.js — Indonesian-context news engine.
   Each headline declares "targets" that resolve to multipliers/impact
   feeding the market price algorithm.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* ---------- Headline pool ---------- */
  /* targets: array of { scope: 'cat:<key>'|'asset:<ticker>'|'cat:all',
                         impact: -1..+1 (capped strength) }
     mood: 'bullish' | 'bearish' | 'neutral'
     icon: small emoji for the news card
  */
  const NEWS_POOL = [
    /* === Macro / Monetary === */
    { id: 'bi-rate-cut',
      mood: 'bullish', icon: '🏛',
      headline: 'Bank Indonesia Pangkas BI Rate 25 bps',
      body: 'BI menurunkan suku bunga acuan, mendorong likuiditas ke pasar saham domestik dan reksadana berbasis ekuitas.',
      targets: [
        { scope: 'cat:saham',     impact: 0.55 },
        { scope: 'cat:reksadana', impact: 0.65 },
      ]},
    { id: 'bi-rate-hike',
      mood: 'bearish', icon: '🏛',
      headline: 'Bank Indonesia Naikkan BI Rate 25 bps',
      body: 'Untuk meredam inflasi dan menjaga Rupiah, BI menaikkan suku bunga acuan.',
      targets: [
        { scope: 'cat:saham',     impact: -0.45 },
        { scope: 'cat:reksadana', impact: -0.35 },
      ]},
    { id: 'rupiah-strong',
      mood: 'bullish', icon: '💵',
      headline: 'Rupiah Menguat Tajam Terhadap Dolar AS',
      body: 'Rupiah ditutup menguat 1,2% setelah surplus neraca dagang melebihi ekspektasi pasar.',
      targets: [
        { scope: 'cat:saham',     impact: 0.30 },
        { scope: 'asset:UNVR',    impact: 0.40 },
        { scope: 'asset:ICBP',    impact: 0.40 },
      ]},
    { id: 'rupiah-weak',
      mood: 'bearish', icon: '📉',
      headline: 'Rupiah Tertekan, Tembus Rp 16.000/USD',
      body: 'Tekanan capital outflow dari pasar negara berkembang membuat Rupiah melemah.',
      targets: [
        { scope: 'cat:saham',     impact: -0.40 },
        { scope: 'cat:reksadana', impact: -0.25 },
      ]},
    { id: 'inflation-surprise',
      mood: 'bearish', icon: '📊',
      headline: 'Inflasi Februari di Atas Ekspektasi',
      body: 'BPS merilis data inflasi 0,8% mom, lebih tinggi dari konsensus 0,5% mom.',
      targets: [
        { scope: 'cat:saham',     impact: -0.30 },
      ]},

    /* === Sectoral: Perbankan === */
    { id: 'banking-loan-growth',
      mood: 'bullish', icon: '🏦',
      headline: 'Pertumbuhan Kredit Perbankan Capai Dua Digit',
      body: 'OJK melaporkan kredit perbankan tumbuh 12,4% YoY, di atas target tahunan.',
      targets: [
        { scope: 'asset:BBCA', impact: 0.55 },
        { scope: 'asset:BBRI', impact: 0.55 },
        { scope: 'asset:BMRI', impact: 0.55 },
        { scope: 'asset:BBNI', impact: 0.50 },
      ]},
    { id: 'banking-npl',
      mood: 'bearish', icon: '⚠️',
      headline: 'NPL Perbankan Menanjak ke Level Tertinggi',
      body: 'Rasio kredit bermasalah industri perbankan naik di tengah perlambatan UMKM.',
      targets: [
        { scope: 'asset:BBRI', impact: -0.45 },
        { scope: 'asset:BBNI', impact: -0.40 },
        { scope: 'asset:BMRI', impact: -0.35 },
      ]},

    /* === Sectoral: Komoditas / Pertambangan / Energi === */
    { id: 'gold-rally',
      mood: 'bullish', icon: '🪙',
      headline: 'Harga Emas Dunia Tembus Rekor Baru',
      body: 'Permintaan safe-haven mendorong harga emas Comex melonjak.',
      targets: [
        { scope: 'asset:ANTM', impact: 0.70 },
        { scope: 'asset:MDKA', impact: 0.55 },
      ]},
    { id: 'coal-rally',
      mood: 'bullish', icon: '⛏',
      headline: 'Harga Batu Bara Acuan Newcastle Naik 8%',
      body: 'Permintaan musim dingin di Asia Timur kembali mendorong harga batu bara.',
      targets: [
        { scope: 'asset:PTBA', impact: 0.60 },
        { scope: 'asset:BUMI', impact: 0.65 },
      ]},
    { id: 'oil-spike',
      mood: 'bullish', icon: '🛢',
      headline: 'OPEC+ Pangkas Produksi, Harga Minyak Melonjak',
      body: 'Brent menguat 5% setelah keputusan OPEC+ memangkas produksi 1 juta bph.',
      targets: [
        { scope: 'asset:PGAS', impact: 0.55 },
        { scope: 'asset:PTBA', impact: 0.30 },
      ]},
    { id: 'commodity-crash',
      mood: 'bearish', icon: '📉',
      headline: 'Harga Komoditas Global Terkoreksi Tajam',
      body: 'Kekhawatiran resesi global menekan harga minyak, batu bara, dan logam dasar.',
      targets: [
        { scope: 'asset:BUMI', impact: -0.55 },
        { scope: 'asset:PTBA', impact: -0.50 },
        { scope: 'asset:ANTM', impact: -0.40 },
        { scope: 'asset:MDKA', impact: -0.40 },
      ]},

    /* === Sectoral: Konsumer / Telco / Otomotif / Farmasi === */
    { id: 'lebaran-spending',
      mood: 'bullish', icon: '🛒',
      headline: 'Belanja Lebaran Tembus Rekor Tertinggi',
      body: 'Konsumsi rumah tangga melonjak menjelang Lebaran, terutama produk FMCG.',
      targets: [
        { scope: 'asset:UNVR', impact: 0.50 },
        { scope: 'asset:ICBP', impact: 0.55 },
      ]},
    { id: 'mudik-data',
      mood: 'bullish', icon: '📡',
      headline: 'Trafik Data Selama Mudik Tumbuh 30%',
      body: 'Operator telekomunikasi mencatat kenaikan trafik data signifikan.',
      targets: [
        { scope: 'asset:TLKM', impact: 0.55 },
      ]},
    { id: 'auto-incentive',
      mood: 'bullish', icon: '🚗',
      headline: 'Insentif PPN Mobil Listrik Diperpanjang',
      body: 'Pemerintah memperpanjang insentif PPN DTP untuk mobil listrik dan hybrid.',
      targets: [
        { scope: 'asset:ASII', impact: 0.50 },
      ]},
    { id: 'pharma-tender',
      mood: 'bullish', icon: '💊',
      headline: 'Kalbe Menangkan Tender BPJS Senilai Triliunan',
      body: 'Kalbe Farma memenangkan tender besar pengadaan obat BPJS Kesehatan.',
      targets: [
        { scope: 'asset:KLBF', impact: 0.65 },
      ]},
    { id: 'goto-monetize',
      mood: 'bullish', icon: '📱',
      headline: 'GoTo Umumkan Profitabilitas EBITDA Lebih Cepat',
      body: 'Manajemen GoTo memajukan target EBITDA positif, sentimen pasar membaik.',
      targets: [
        { scope: 'asset:GOTO', impact: 0.70 },
      ]},
    { id: 'goto-down',
      mood: 'bearish', icon: '📱',
      headline: 'GoTo Catat Rugi Kuartalan Lebih Besar',
      body: 'Beban kompensasi karyawan dan promosi menekan kinerja GoTo.',
      targets: [
        { scope: 'asset:GOTO', impact: -0.60 },
      ]},

    /* === Crypto-specific === */
    { id: 'btc-etf',
      mood: 'bullish', icon: '🚀',
      headline: 'Inflow ETF Bitcoin Spot Tembus USD 1 Miliar Sepekan',
      body: 'Adopsi institusional terhadap Bitcoin spot ETF mencatatkan rekor inflow.',
      targets: [
        { scope: 'asset:BTC',  impact: 0.65 },
        { scope: 'asset:ETH',  impact: 0.45 },
        { scope: 'cat:crypto', impact: 0.30 },
      ]},
    { id: 'crypto-regulation',
      mood: 'bearish', icon: '⚖️',
      headline: 'Regulator Asia Perketat Aturan Bursa Kripto',
      body: 'Beberapa regulator Asia merilis aturan baru terkait listing dan custody.',
      targets: [
        { scope: 'cat:crypto', impact: -0.55 },
      ]},
    { id: 'eth-upgrade',
      mood: 'bullish', icon: '🛠',
      headline: 'Upgrade Jaringan Ethereum Sukses Diaktifkan',
      body: 'Hard fork berjalan lancar; biaya gas turun signifikan.',
      targets: [
        { scope: 'asset:ETH',  impact: 0.60 },
        { scope: 'asset:MATIC', impact: 0.35 },
      ]},
    { id: 'sol-outage',
      mood: 'bearish', icon: '🛑',
      headline: 'Jaringan Solana Sempat Down Selama 4 Jam',
      body: 'Validator melaporkan congestion, transaksi sempat tidak terkonfirmasi.',
      targets: [
        { scope: 'asset:SOL', impact: -0.60 },
      ]},
    { id: 'doge-hype',
      mood: 'bullish', icon: '🐕',
      headline: 'Tweet Selebriti Picu Lonjakan Volume Dogecoin',
      body: 'Sentimen ritel kembali memanas di forum kripto Indonesia.',
      targets: [
        { scope: 'asset:DOGE', impact: 0.75 },
      ]},
    { id: 'idrc-listed',
      mood: 'bullish', icon: '🇮🇩',
      headline: 'Bappebti Resmi Daftarkan IDRCoin di Pasar Aset Kripto',
      body: 'IDRC menjadi salah satu aset kripto lokal yang resmi terdaftar.',
      targets: [
        { scope: 'asset:IDRC', impact: 0.70 },
        { scope: 'asset:KNT',  impact: 0.45 },
        { scope: 'asset:IDT',  impact: 0.40 },
      ]},
    { id: 'majapahit-hype',
      mood: 'bullish', icon: '🏯',
      headline: 'MajapahitCoin Kolaborasi dengan UMKM Lokal',
      body: 'Komunitas MJP meluncurkan program reward UMKM Nusantara.',
      targets: [
        { scope: 'asset:MJP', impact: 0.80 },
      ]},

    /* === Reksadana / Pasar Modal === */
    { id: 'reksadana-aum',
      mood: 'bullish', icon: '💹',
      headline: 'AUM Reksadana Saham Tumbuh 9% YtD',
      body: 'Manajer investasi melaporkan kenaikan dana kelolaan di reksadana saham.',
      targets: [
        { scope: 'cat:reksadana', impact: 0.55 },
      ]},
    { id: 'reksadana-redeem',
      mood: 'bearish', icon: '💸',
      headline: 'Redemption Reksadana Saham Membesar',
      body: 'Investor ritel mengalihkan dana ke pasar uang menjelang RDG The Fed.',
      targets: [
        { scope: 'cat:reksadana', impact: -0.50 },
      ]},

    /* === Politik / Kebijakan === */
    { id: 'apbn-stimulus',
      mood: 'bullish', icon: '🇮🇩',
      headline: 'APBN Disetujui dengan Tambahan Stimulus Infrastruktur',
      body: 'DPR setujui RAPBN dengan alokasi stimulus untuk konstruksi & energi.',
      targets: [
        { scope: 'cat:saham', impact: 0.40 },
      ]},
    { id: 'tax-amnesty',
      mood: 'bullish', icon: '🧾',
      headline: 'Pemerintah Wacanakan Tax Amnesty Jilid III',
      body: 'Wacana tax amnesty memicu optimisme pasar saham.',
      targets: [
        { scope: 'cat:saham', impact: 0.30 },
      ]},

    /* === Geopolitical / Risk-off === */
    { id: 'global-risk-off',
      mood: 'bearish', icon: '🌍',
      headline: 'Eskalasi Geopolitik Global Picu Risk-Off',
      body: 'Investor global mengurangi eksposur ke aset berisiko tinggi.',
      targets: [
        { scope: 'cat:crypto', impact: -0.60 },
        { scope: 'cat:saham',  impact: -0.30 },
      ]},
    { id: 'fed-pivot',
      mood: 'bullish', icon: '🦅',
      headline: 'The Fed Sinyalkan Pivot Suku Bunga',
      body: 'Pernyataan dovish ketua The Fed memicu rally global aset risiko.',
      targets: [
        { scope: 'cat:all',    impact: 0.40 },
        { scope: 'cat:crypto', impact: 0.55 },
      ]},

    /* === Neutral filler === */
    { id: 'market-quiet',
      mood: 'neutral', icon: '🕊',
      headline: 'Pasar Cenderung Mendatar Jelang Akhir Pekan',
      body: 'Pelaku pasar wait-and-see menjelang rilis data ekonomi.',
      targets: [],
    },
    { id: 'ihsg-mixed',
      mood: 'neutral', icon: '📈',
      headline: 'IHSG Bergerak Mixed di Tengah Sesi Perdagangan',
      body: 'Sektor perbankan menguat, sektor energi tertekan tipis.',
      targets: [
        { scope: 'asset:BBCA', impact: 0.10 },
        { scope: 'asset:PTBA', impact: -0.10 },
      ]},
    { id: 'analyst-rotation',
      mood: 'neutral', icon: '🔄',
      headline: 'Analis Rekomendasikan Rotasi ke Sektor Defensif',
      body: 'Beberapa sekuritas menyarankan rotasi ke saham konsumer.',
      targets: [
        { scope: 'asset:UNVR', impact: 0.20 },
        { scope: 'asset:KLBF', impact: 0.20 },
      ]},
  ];

  /* ---------- Pick 1-3 random non-duplicate headlines ---------- */
  function generateDailyNews(state) {
    const day = state.totalDays;
    const count = JI.randomInt(1, 3);

    const pool = [...NEWS_POOL];
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = pool.slice(0, count).map(n => ({
      ...n,
      day,
      id: `${day}-${n.id}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: n.id,
    }));

    state.dailyNews = picks;
    state.lastNewsDay = day;
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(...picks);
    // Keep history reasonable
    if (state.newsHistory.length > 200) {
      state.newsHistory.length = 200;
    }
    return picks;
  }

  /**
   * Build a ticker -> impact map from a list of news items.
   * Multiple news on same target stack additively, then are clamped in market.js.
   */
  function buildImpactMap(newsItems) {
    const map = {};
    (newsItems || []).forEach(n => {
      (n.targets || []).forEach(t => {
        if (t.scope.startsWith('asset:')) {
          const ticker = t.scope.slice('asset:'.length);
          map[ticker] = (map[ticker] || 0) + t.impact;
        } else if (t.scope.startsWith('cat:')) {
          const key = t.scope; // already 'cat:saham' etc.
          map[key] = (map[key] || 0) + t.impact;
        }
      });
    });
    return map;
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    NEWS_POOL,
    generateDailyNews,
    buildImpactMap,
  });
})(window);
