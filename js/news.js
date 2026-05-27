/* =========================================================================
   news.js — Phase 5 asset-specific news engine.

   Each Next Day, 2 to 4 random assets get a headline drawn from a
   category-specific template pool. Sentiment (bullish | bearish) is rolled
   per asset; that sentiment drives an instant price impact in market.js
   (calculateNextDayPrices already reads news[ticker].sentiment).

   At least 10 bullish + 10 bearish templates per category, exactly as
   required by Phase 5. [ASSET_NAME] is the placeholder.
   ========================================================================= */

(function (global) {
  'use strict';

  const JI = global.JI || (global.JI = {});

  /* =========================================================================
     TEMPLATES — category-keyed, sentiment-keyed.
     ========================================================================= */
  const NEWS_TEMPLATES = {
    /* ---------- STOCKS (IDX) ---------- */
    stock: {
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
        'Saham [ASSET_NAME] Dilempar Auto-Reject Bawah Tiga Hari Berturut',
      ],
    },

    /* ---------- CRYPTO ---------- */
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

    /* ---------- MUTUAL FUNDS (REKSA DANA) ---------- */
    mutual: {
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

  /* ---------- Pick a category-appropriate template ---------- */
  function pickHeadline(asset, sentiment) {
    const pool = (NEWS_TEMPLATES[asset.category] || {})[sentiment] || [];
    if (pool.length === 0) return `[${sentiment.toUpperCase()}] ${asset.name}`;
    const tmpl = JI.pickRandom(pool);
    return tmpl.replace(/\[ASSET_NAME\]/g, asset.name);
  }

  /* ---------- Body text accompanying a headline (short, flavorful) ---------- */
  function buildBody(asset, sentiment) {
    const tag = asset.category === 'crypto' ? 'Pasar Kripto'
              : asset.category === 'mutual' ? 'Reksa Dana'
              : 'Bursa Saham';
    const tone = sentiment === 'bullish'
      ? 'Sentimen positif memicu lonjakan minat beli.'
      : 'Sentimen negatif memicu aksi jual oleh investor.';
    return `${tag} · ${asset.ticker} — ${tone}`;
  }

  /* =========================================================================
     generateDailyNews(state)
     - Picks 2..4 distinct assets across all 45.
     - Rolls a sentiment per asset (50/50 by default).
     - Returns array of { day, ticker, name, category, sentiment, headline, body }
     - Does NOT mutate state.priceMap; market.js applies impacts.
     ========================================================================= */
  function generateDailyNews(state) {
    const assets = JI.ASSETS || [];
    if (assets.length === 0) return [];

    const count = JI.randomInt(2, 4);
    const shuffled = JI.shuffleArray(assets).slice(0, count);

    return shuffled.map(asset => {
      const sentiment = Math.random() < 0.5 ? 'bullish' : 'bearish';
      return {
        day: state.totalDays,
        ticker: asset.ticker,
        name: asset.name,
        category: asset.category,
        sentiment,
        headline: pickHeadline(asset, sentiment),
        body: buildBody(asset, sentiment),
      };
    });
  }

  /* ---------- Convenience: get news for a specific day ---------- */
  function newsForDay(state, day) {
    return (state.newsHistory || []).filter(n => n.day === day);
  }

  /* ---------- Expose ---------- */
  Object.assign(JI, {
    NEWS_TEMPLATES,
    generateDailyNews,
    newsForDay,
    pickHeadline,
  });
})(window);
