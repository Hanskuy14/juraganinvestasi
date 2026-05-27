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

  /* =========================================================================
     PHASE 5 — Per-asset headline templates.
     Each category (saham / crypto / reksadana) has 12 bullish + 12 bearish.
     Headlines reference the asset's display name via [ASSET_NAME].
     Items are emitted by generateAssetNews() and tagged with `assetSpike`
     so that calculateNextDayPrices() can apply the explicit spike/drop
     overriding the random-walk for that ticker:
       - bullish stock|reksadana : +5% .. +15%
       - bullish crypto          : +5% .. +40%
       - bearish (any)           : -5% .. -20%
     ========================================================================= */
  const ASSET_NEWS_TEMPLATES = {
    saham: {
      bullish: [
        'Laba [ASSET_NAME] Meroket Kuartal Ini!',
        '[ASSET_NAME] Bagikan Dividen Jumbo Triliunan Rupiah',
        '[ASSET_NAME] Menang Tender Proyek IKN',
        'Ekspansi Berhasil, Asing Borong Saham [ASSET_NAME]',
        '[ASSET_NAME] Tembus Rekor Tertinggi Sepanjang Masa',
        'Analis Naikkan Target Harga [ASSET_NAME] ke Level Premium',
        '[ASSET_NAME] Akuisisi Perusahaan Pesaing Senilai Rp 5 Triliun',
        'Rupiah Menguat, Beban Utang Dolar [ASSET_NAME] Berkurang Drastis',
        '[ASSET_NAME] Diversifikasi ke Sektor EV & Kendaraan Listrik',
        'Pemerintah Beri Insentif Pajak Khusus untuk Sektor [ASSET_NAME]',
        '[ASSET_NAME] Stock Split 1:5, Investor Ritel Antusias',
        'IPO Anak Usaha [ASSET_NAME] Oversubscribed 10x',
      ],
      bearish: [
        'Pabrik Utama [ASSET_NAME] Terbakar, Produksi Lumpuh',
        'Skandal Korupsi, CEO [ASSET_NAME] Ditangkap KPK',
        '[ASSET_NAME] Terancam PKPU (Gagal Bayar Utang)',
        'PHK Massal Melanda [ASSET_NAME], 5.000 Karyawan Dirumahkan',
        '[ASSET_NAME] Digugat Class Action Konsumen',
        'Laporan Keuangan [ASSET_NAME] Dipertanyakan OJK',
        'Pemegang Saham Mayoritas [ASSET_NAME] Lepas Seluruh Kepemilikan',
        '[ASSET_NAME] Kena Sanksi Bursa, Suspensi 3 Hari',
        'Permintaan Anjlok, Kinerja [ASSET_NAME] Terjun Bebas',
        '[ASSET_NAME] Diaudit Ulang BPK Karena Indikasi Fraud',
        'Pajak Tambahan Pemerintah Pukul Margin [ASSET_NAME]',
        'Saham [ASSET_NAME] Auto-Reject Bawah Tiga Hari Berturut',
      ],
    },
    crypto: {
      bullish: [
        'Whale Akumulasi Jutaan [ASSET_NAME] dalam Semalam',
        'Update Jaringan Berhasil, Gas Fee [ASSET_NAME] Turun Drastis',
        'Elon Musk Ngetwit Soal [ASSET_NAME], Komunitas FOMO Massal',
        '[ASSET_NAME] Diadopsi Sebagai Alat Pembayaran Global',
        'ETF Spot [ASSET_NAME] Disetujui SEC!',
        '[ASSET_NAME] Listing di Binance Tier-1, Volume Meledak',
        'Burn Token Massal Bikin Supply [ASSET_NAME] Langka',
        'Partnership Raksasa Tech Dukung Ekosistem [ASSET_NAME]',
        'Volume Trading [ASSET_NAME] Tembus All-Time High',
        'Indodax & Tokocrypto Promo Trading Fee Nol untuk [ASSET_NAME]',
        '[ASSET_NAME] Halving Sukses, Inflasi Token Anjlok',
        'Institusi Wall Street Mulai Akumulasi [ASSET_NAME]',
      ],
      bearish: [
        'Jaringan [ASSET_NAME] Diretas Hacker, Triliunan Raib!',
        'Founder [ASSET_NAME] Terjerat Kasus Pencucian Uang',
        'Bappebti Larang Transaksi [ASSET_NAME] di Indonesia',
        'Dev [ASSET_NAME] Diduga Lakukan Rug Pull Massal',
        '[ASSET_NAME] Delisted dari Bursa Crypto Mayor',
        'Bug Fatal Smart Contract [ASSET_NAME] Dieksploitasi',
        'SEC Sebut [ASSET_NAME] Sebagai Securities Ilegal',
        'Validator [ASSET_NAME] Walkout Massal, Jaringan Stuck',
        'Whale Dump Posisi Triliunan [ASSET_NAME] di Open Market',
        'FUD Viral: Jaringan [ASSET_NAME] Disebut Tidak Skalabel',
        'CZ Binance Beri Sinyal Akan Hapus Pair [ASSET_NAME]',
        'Liquidation Cascade Pukul Holder Leverage [ASSET_NAME]',
      ],
    },
    reksadana: {
      bullish: [
        'AUM (Dana Kelolaan) [ASSET_NAME] Cetak Rekor Baru',
        '[ASSET_NAME] Dinobatkan Sebagai Reksadana Terbaik Tahun Ini',
        'Manajer Investasi [ASSET_NAME] Raih Penghargaan Bareksa',
        'Yield Bulanan [ASSET_NAME] Outperform Benchmark IHSG',
        'Investor Institusi Ramai-ramai Subscribe [ASSET_NAME]',
        '[ASSET_NAME] Buka Akses Pembelian via Bibit & Ajaib',
        'Portofolio [ASSET_NAME] Cuan Besar dari Saham Blue Chip',
        'Rating Morningstar [ASSET_NAME] Naik ke 5 Bintang',
        '[ASSET_NAME] Bagikan Dividen Reksadana Terjadwal',
        '[ASSET_NAME] Tutup Tahun dengan Return 30%+',
        'NAB [ASSET_NAME] Naik 5 Hari Berturut-turut, Investor Borong',
        'Asuransi BUMN Alokasikan Dana Besar ke [ASSET_NAME]',
      ],
      bearish: [
        'Manajer Investasi [ASSET_NAME] Disuspensi OJK',
        'Portofolio Nyangkut di Saham Gorengan, NAB [ASSET_NAME] Anjlok',
        '[ASSET_NAME] Hadapi Redemption Massal, Likuiditas Krisis',
        'OJK Investigasi Dugaan Penyelewengan Dana [ASSET_NAME]',
        'Manajer [ASSET_NAME] Terlibat Skandal Mirip Jiwasraya',
        'Rating [ASSET_NAME] Diturunkan ke 1 Bintang',
        '[ASSET_NAME] Tertahan Saham Suspensi, NAB Tidak Bisa Dihitung',
        'Investor Ritel Tarik Dana Massal dari [ASSET_NAME]',
        '[ASSET_NAME] Underperform IHSG 3 Tahun Berturut-turut',
        'Berita Buruk: [ASSET_NAME] Hadapi Gugatan Investor Kelas',
        'Custodian Bank Tunda Settlement Dana [ASSET_NAME]',
        'Direksi Manajer Investasi [ASSET_NAME] Kompak Mundur',
      ],
    },
  };

  const ASSET_SPIKE_RANGE = {
    saham:     { bullish: [ 0.05,  0.15], bearish: [-0.20, -0.05] },
    crypto:    { bullish: [ 0.05,  0.40], bearish: [-0.20, -0.05] },
    reksadana: { bullish: [ 0.05,  0.15], bearish: [-0.20, -0.05] },
  };

  /* Pick a category-appropriate headline and embed the asset name. */
  function pickAssetHeadline(asset, sentiment) {
    const cat = asset.category;
    const pool = (ASSET_NEWS_TEMPLATES[cat] || {})[sentiment] || [];
    if (!pool.length) return `${asset.name} bergerak ${sentiment}`;
    const tmpl = pool[Math.floor(Math.random() * pool.length)];
    return tmpl.replace(/\[ASSET_NAME\]/g, asset.name);
  }

  /**
   * Generate 2..4 asset-specific news items for the day.
   * Each item carries:
   *   - mood: bullish|bearish (drives card color)
   *   - assetSpike: { ticker, sentiment, range:[lo, hi] }  → market.js applies it
   *   - targets: same shape as macro news, so HRD analyst predictions
   *              still pick these up.
   */
  function generateAssetNews(state) {
    const all = (typeof JI.allAssets === 'function') ? JI.allAssets() : [];
    if (!all.length) return [];

    // Shuffle & pick 2..4 distinct assets.
    const pool = [...all];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const count = JI.randomInt(2, 4);
    const picks = pool.slice(0, count);

    const day = state.totalDays;
    return picks.map(asset => {
      const sentiment = Math.random() < 0.5 ? 'bullish' : 'bearish';
      const range = (ASSET_SPIKE_RANGE[asset.category] || ASSET_SPIKE_RANGE.saham)[sentiment];
      const headline = pickAssetHeadline(asset, sentiment);
      const moodIcon = sentiment === 'bullish' ? '🚀' : '🩸';
      // Soft target so HRD prediction & macro buildImpactMap also see it.
      const softImpact = sentiment === 'bullish' ? 0.6 : -0.6;
      return {
        day,
        sourceId: `asset-${asset.ticker}-${sentiment}`,
        id: `${day}-${asset.ticker}-${Math.random().toString(36).slice(2, 6)}`,
        mood: sentiment,
        icon: moodIcon,
        headline,
        body: `${asset.name} (${asset.ticker}) — ${sentiment === 'bullish' ? 'sentimen positif memicu lonjakan minat beli.' : 'sentimen negatif memicu aksi jual investor.'}`,
        targets: [{ scope: `asset:${asset.ticker}`, impact: softImpact }],
        // Phase 5: explicit instant spike applied AFTER random walk.
        assetSpike: {
          ticker: asset.ticker,
          name: asset.name,
          category: asset.category,
          sentiment,
          range,
        },
      };
    });
  }

  /* ---------- Pick 1-3 random non-duplicate headlines ---------- */
  function generateDailyNews(state) {
    const day = state.totalDays;

    // Phase 5: ALWAYS include 2..4 asset-specific items per day.
    const assetPicks = generateAssetNews(state);

    // Plus 1..2 macro headlines from the existing pool for ambient flavor.
    const macroCount = JI.randomInt(1, 2);
    const pool = [...NEWS_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const macroPicks = pool.slice(0, macroCount).map(n => ({
      ...n,
      day,
      id: `${day}-${n.id}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: n.id,
    }));

    // Asset-specific items first so they top the feed (more dramatic).
    const picks = [...assetPicks, ...macroPicks];

    state.dailyNews = picks;
    state.lastNewsDay = day;
    state.newsHistory = state.newsHistory || [];
    state.newsHistory.unshift(...picks);
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
    ASSET_NEWS_TEMPLATES,
    ASSET_SPIKE_RANGE,
    generateDailyNews,
    generateAssetNews,
    pickAssetHeadline,
    buildImpactMap,
  });
})(window);
