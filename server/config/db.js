import mysql from 'mysql2/promise';
import './env.js';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'ruangmarket',
  password: process.env.DB_PASSWORD || 'Jazman@271998',
  database: process.env.DB_NAME || 'ruangmarket',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

export const pool = mysql.createPool(DB_CONFIG);

// Pool khusus untuk membaca langsung data tabel orders asli dari database Laravel (marketplace)
export const laravelPool = mysql.createPool({
  host: process.env.LARAVEL_DB_HOST || process.env.DB_HOST || '127.0.0.1',
  user: process.env.LARAVEL_DB_USER || 'marketplace',
  password: process.env.LARAVEL_DB_PASSWORD || 'Jazman@271998',
  database: process.env.LARAVEL_DB_NAME || 'marketplace',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Inisialisasi Skema Database Berbahasa Indonesia
export async function initDb() {
  try {
    const conn = await pool.getConnection();
    console.log('[MySQL] Berhasil terhubung ke database:', DB_CONFIG.database);

    // 1. Tabel Toko Terhubung (toko_marketplace)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS toko_marketplace (
        id VARCHAR(64) PRIMARY KEY,
        kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
        saluran VARCHAR(32) NOT NULL COMMENT 'shopee, tiktok, lazada',
        nama_saluran VARCHAR(64) NOT NULL,
        nama_toko VARCHAR(128) NOT NULL,
        id_toko VARCHAR(64) NOT NULL UNIQUE,
        logo_toko VARCHAR(255) DEFAULT '',
        cipher_toko VARCHAR(255) DEFAULT '',
        token_akses TEXT,
        token_refresh TEXT,
        kadaluarsa_pada DATETIME,
        status_koneksi VARCHAR(32) DEFAULT 'Aktif',
        sinkron_stok_otomatis TINYINT(1) DEFAULT 1,
        dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Daftar toko marketplace resmi terhubung';
    `);

    // 2. Tabel Produk Marketplace Staging (produk_marketplace)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS produk_marketplace (
        id VARCHAR(64) PRIMARY KEY,
        id_produk_marketplace VARCHAR(64) NOT NULL,
        kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
        saluran VARCHAR(32) NOT NULL,
        nama_saluran VARCHAR(64),
        nama_toko VARCHAR(128),
        id_toko VARCHAR(64),
        nama_produk VARCHAR(255) NOT NULL,
        sku_marketplace VARCHAR(128),
        harga_jual DECIMAL(15,2) DEFAULT 0,
        stok_marketplace INT DEFAULT 0,
        varian TEXT,
        status_mapping VARCHAR(32) DEFAULT 'Belum Dimapping',
        ditarik_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_produk_sku (id_produk_marketplace, saluran, sku_marketplace)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tabel staging produk marketplace sebelum ke master data';
    `);

    // Auto-migrate column varian jika masih VARCHAR(128) dan update unique index agar setiap varian/SKU tersimpan
    try {
      await conn.query(`ALTER TABLE produk_marketplace MODIFY COLUMN varian TEXT`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_marketplace DROP INDEX uq_produk_toko`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_marketplace ADD UNIQUE KEY uq_produk_sku (id_produk_marketplace, saluran, sku_marketplace)`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_marketplace ADD COLUMN foto_produk TEXT`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_master ADD COLUMN foto_produk TEXT`);
    } catch (e) {}

    // 3. Tabel Master Produk ERP (produk_master)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS produk_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
        kode_sku VARCHAR(64) NOT NULL UNIQUE,
        nama_produk VARCHAR(255) NOT NULL,
        kategori VARCHAR(64),
        satuan VARCHAR(32) DEFAULT 'PCS',
        harga_jual DECIMAL(15,2) DEFAULT 0,
        harga_modal DECIMAL(15,2) DEFAULT 0,
        stok_fisik INT DEFAULT 0,
        status VARCHAR(32) DEFAULT 'Aktif',
        status_order VARCHAR(32) DEFAULT 'Ready Stok',
        dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Master data produk ERP RuangMarket';
    `);

    // Auto-migrate column kode_sku jika kurang panjang dan tambahkan status_order jika belum ada
    try {
      await conn.query(`ALTER TABLE produk_master MODIFY COLUMN kode_sku VARCHAR(255) NOT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_master ADD COLUMN status_order VARCHAR(32) DEFAULT 'Ready Stok'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_master ADD COLUMN tipe_set VARCHAR(32) DEFAULT 'Single'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_master ADD COLUMN bundle_items LONGTEXT NULL`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_master ADD COLUMN estimasi_kain VARCHAR(100) DEFAULT 'Kain Polos'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_master ADD COLUMN panjang_kain_cm INT DEFAULT 200`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE produk_master ADD COLUMN harga_kain_cm DECIMAL(15,2) DEFAULT 150.00`);
    } catch (e) {}

    // Auto-migrate: Bersihkan prefix RSG- dari kode_sku yang terlanjur tersimpan di produk_master
    try {
      await conn.query(`
        DELETE m1 FROM produk_master m1
        JOIN produk_master m2 ON SUBSTRING(m1.kode_sku, 5) = m2.kode_sku
        WHERE m1.kode_sku LIKE 'RSG-%'
      `);
      await conn.query(`UPDATE produk_master SET kode_sku = SUBSTRING(kode_sku, 5) WHERE kode_sku LIKE 'RSG-%'`);
      console.log('[MySQL] Berhasil membersihkan awalan RSG- pada kode_sku di produk_master!');
    } catch (e) {
      console.warn('[MySQL] Info clean RSG- prefix:', e.message);
    }

    // 4. Tabel Pesanan Marketplace & SPK Produksi (pesanan_marketplace)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pesanan_marketplace (
        id VARCHAR(64) PRIMARY KEY,
        kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
        no_pesanan VARCHAR(64) NOT NULL UNIQUE,
        saluran VARCHAR(32) NOT NULL,
        nama_toko VARCHAR(128),
        nama_pembeli VARCHAR(128),
        total_harga DECIMAL(15,2) DEFAULT 0,
        status_pesanan VARCHAR(32) DEFAULT 'Perlu Diproses',
        no_spk VARCHAR(64),
        rincian_item LONGTEXT,
        kurir VARCHAR(64),
        no_resi VARCHAR(64),
        waktu_pesanan DATETIME,
        ditarik_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Daftar pesanan marketplace yang terhubung ke SPK';
    `);

    // Auto-migrate column untuk rincian pesanan marketplace
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN rincian_item LONGTEXT`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN kurir VARCHAR(64)`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN no_resi VARCHAR(64)`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN waktu_pesanan DATETIME`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN batas_kirim DATETIME`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN status_cetak VARCHAR(32) DEFAULT 'Belum Print'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace MODIFY COLUMN status_cetak VARCHAR(32) DEFAULT 'Belum Print'`);
      await conn.query(`UPDATE pesanan_marketplace SET status_cetak = 'Belum Print' WHERE status_cetak = 'Sudah Print'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN status_verifikasi VARCHAR(32) DEFAULT 'Verified'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN alamat TEXT`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN no_telepon VARCHAR(64)`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN metode_bayar VARCHAR(64) DEFAULT 'Cash on Delivery'`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN ongkir DECIMAL(15,2) DEFAULT 0`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN marketplace_fee DECIMAL(15,2) DEFAULT 0`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN fee_platform DECIMAL(15,2) DEFAULT 0`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN fee_free_shipping DECIMAL(15,2) DEFAULT 0`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN fee_service DECIMAL(15,2) DEFAULT 0`);
    } catch (e) {}
    try {
      await conn.query(`ALTER TABLE pesanan_marketplace ADD COLUMN net_amount DECIMAL(15,2) DEFAULT 0`);
    } catch (e) {}

    // 4b. Tabel Retur Barang (retur_barang)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS retur_barang (
        id VARCHAR(64) PRIMARY KEY,
        kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
        id_retur_marketplace VARCHAR(64),
        no_pesanan VARCHAR(64) NOT NULL,
        saluran VARCHAR(32) NOT NULL,
        nama_toko VARCHAR(128),
        nama_pembeli VARCHAR(128),
        alasan_retur TEXT,
        tipe_retur VARCHAR(64) DEFAULT 'RETURN_REFUND',
        status_retur VARCHAR(64) DEFAULT 'Diajukan',
        kondisi_barang VARCHAR(64) DEFAULT 'Menunggu Penerimaan',
        no_resi_retur VARCHAR(64),
        kurir_retur VARCHAR(64),
        total_refund DECIMAL(15,2) DEFAULT 0,
        rincian_item LONGTEXT,
        sudah_restok TINYINT(1) DEFAULT 0,
        catatan TEXT,
        waktu_diajukan DATETIME,
        waktu_selesai DATETIME,
        dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_no_pesanan (no_pesanan),
        INDEX idx_saluran (saluran),
        INDEX idx_status_retur (status_retur)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tabel retur barang marketplace dan offline';
    `);

    // 5. Masukkan Akun Toko Shopee Resmi jika belum ada
    await conn.query(`
      INSERT INTO toko_marketplace (
        id, kode_perusahaan, saluran, nama_saluran, nama_toko, id_toko, 
        logo_toko, token_akses, token_refresh, status_koneksi
      ) VALUES (
        'tk_shopee_sahabat',
        'RSG',
        'shopee',
        'Shopee Marketplace',
        'Koperasi Sahabat Anak Bangsa',
        '1030191310',
        'store-logos/Vh3cR1kfR2HNhWFVqpEdtZdr82NDQk6lorx7ktKK.jpg',
        'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAEozLKC1wYw_4S4xwk4AUABSAc.Akf_2_Oh892XxGfWUbY4HXNPqIn3DsQUBZpI1DTivMY',
        'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAIozLKC1wYwrduHtAQ4AUABSAc.WM8feqDMjMxCNQcvMwwvCLiHCMN0A0AKjS8Z5JopdKY',
        'Aktif (Terhubung)'
      ) ON DUPLICATE KEY UPDATE 
        token_akses = VALUES(token_akses),
        token_refresh = VALUES(token_refresh);
    `);

    // 6. Masukkan Akun Toko TikTok Shop RUANG SERAGAM yang benar
    await conn.query(`DELETE FROM toko_marketplace WHERE id_toko = '943001511'`);
    await conn.query(`
      INSERT INTO toko_marketplace (
        id, kode_perusahaan, saluran, nama_saluran, nama_toko, id_toko, 
        logo_toko, cipher_toko, token_akses, token_refresh, kadaluarsa_pada, status_koneksi
      ) VALUES (
        'tk_tiktok_ruangseragam',
        'RSG',
        'tiktok',
        'TikTok Shop',
        'RUANG SERAGAM',
        '7495487525216094891',
        'store-logos/phX8jRSXxcz9FYAR8q5CxuzY0hzRnIJPsxJCxaRV.png',
        'ROW_Hbd_fAAAAACqX58asQX4uCOsoefXXn4c',
        'ROW_hrW2eAAAAADXzfcAbFNM2vF4sGvyrLklzSslk4uklv4KXG8FDCL8TMDVZVSXm1QNwF3HkXc-CfZT-WsF6yF-qO2wOSJKCKh0f2aji_gApWDGMP1FFNH5ZYrC2D-6o9YEAajZdQ7cQvPYE1BZu2jAwSLxLaUzYOX0JwzW6ZUsu5Tj1dxn343kAe1TMZ5nydARMQJ94b20hIGW2ibwtqaqCkw8yQz8wQjW',
        'ROW_rfVKJgAAAACQMhMaQ5QXpCAhk_jChhoWo0KgxyEvuEVSbCvPTxxl3OU0jfV_dLTlJcuRIEhLVNQ',
        '2026-11-03 13:45:04',
        'Aktif (Terhubung)'
      ) ON DUPLICATE KEY UPDATE 
        id_toko = VALUES(id_toko),
        logo_toko = VALUES(logo_toko),
        cipher_toko = VALUES(cipher_toko),
        token_akses = VALUES(token_akses),
        token_refresh = VALUES(token_refresh),
        kadaluarsa_pada = VALUES(kadaluarsa_pada),
        status_koneksi = VALUES(status_koneksi);
    `);

    // 7. Tabel SPK Produksi & Batch (spk_batch)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS spk_batch (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
        kode_produksi VARCHAR(64) NOT NULL,
        nama_pelanggan VARCHAR(255),
        no_telepon VARCHAR(64),
        instansi VARCHAR(255),
        tgl_pesan VARCHAR(32),
        deadline VARCHAR(32),
        status VARCHAR(64) DEFAULT 'Dalam Proses',
        catatan TEXT,
        spk_list LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_kode_produksi (kode_produksi),
        INDEX idx_kode_perusahaan (kode_perusahaan)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tabel SPK Produksi & Batch';
    `);

    // 8. Tabel Master Pelanggan (pelanggan_master)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pelanggan_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
        kode_pelanggan VARCHAR(64) NOT NULL UNIQUE,
        nama_pelanggan VARCHAR(255) NOT NULL,
        alamat TEXT,
        no_hp VARCHAR(64),
        status VARCHAR(32) DEFAULT 'Aktif',
        kategori_pelanggan VARCHAR(64) DEFAULT 'Reguler',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_kode_pelanggan (kode_pelanggan),
        INDEX idx_kode_perusahaan (kode_perusahaan)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tabel Master Pelanggan';
    `);

    // Auto-seed data awal pelanggan jika kosong
    await conn.query(`
      INSERT INTO pelanggan_master (kode_perusahaan, kode_pelanggan, nama_pelanggan, alamat, no_hp, status, kategori_pelanggan)
      VALUES 
        ('RSG', 'PLG-2026-001', 'Salmah Khairani Nasution', 'Jl. Merdeka No. 45, Medan', '+62 852-1858-3688', 'Aktif', 'Umum'),
        ('RSG', 'PLG-2026-002', 'Distributor Utama Jakarta (Pelanggan ABC)', 'Kawasan Pergudangan Pluit Blok C No. 12, Jakarta Utara', '+62 812-3456-7890', 'Aktif', 'Dropship'),
        ('RSG', 'PLG-2026-003', 'Pesantren Al-Hikmah Bandung', 'Jl. Pesantren No. 88, Cibiru, Bandung', '+62 878-9988-1122', 'Aktif', 'Lainnya')
      ON DUPLICATE KEY UPDATE nama_pelanggan = VALUES(nama_pelanggan);
    `);

    // 9. Tabel Master Tahapan SPK (tahapan_spk_master)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tahapan_spk_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
        kode_tahapan VARCHAR(64) NOT NULL UNIQUE,
        nama_tahapan VARCHAR(128) NOT NULL,
        emoji VARCHAR(16) DEFAULT '📋',
        warna VARCHAR(32) DEFAULT 'info',
        urutan INT DEFAULT 0,
        status VARCHAR(32) DEFAULT 'Aktif',
        keterangan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_kode_tahapan (kode_tahapan),
        INDEX idx_kode_perusahaan (kode_perusahaan)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tabel Master Tahapan SPK Produksi';
    `);

    // Auto-seed data awal tahapan SPK jika kosong
    await conn.query(`
      INSERT INTO tahapan_spk_master (kode_perusahaan, kode_tahapan, nama_tahapan, emoji, warna, urutan, status, keterangan)
      VALUES 
        ('RSG', 'THP-01', 'Perencanaan', '📋', 'info', 1, 'Aktif', 'Pesanan baru / perencanaan jadwal produksi'),
        ('RSG', 'THP-02', 'Antrian & Sampling', '⏳', 'primary', 2, 'Aktif', 'Menunggu antrian pengerjaan sampel'),
        ('RSG', 'THP-03', 'Tahap Sampling', '🧪', 'purple', 3, 'Aktif', 'Pembuatan sampel produk'),
        ('RSG', 'THP-04', 'Tahap Print Kain', '🖨️', 'info', 4, 'Aktif', 'Proses sublim / cetak motif kain'),
        ('RSG', 'THP-05', 'Tahap Pemotongan', '✂️', 'warning', 5, 'Aktif', 'Pemotongan pola kain'),
        ('RSG', 'THP-06', 'Tahap Jahit', '🪡', 'purple', 6, 'Aktif', 'Proses penjahitan potongan kain'),
        ('RSG', 'THP-07', 'Tahap LKPK', '🧮', 'success', 7, 'Aktif', 'Pengecekan lembar kerja & kelengkapan'),
        ('RSG', 'THP-08', 'Quality Control', '🔍', 'success', 8, 'Aktif', 'Pemeriksaan standar kualitas produk'),
        ('RSG', 'THP-09', 'Packing / Finishing', '📦', 'warning', 9, 'Aktif', 'Setrika uap, hangtag & pengemasan'),
        ('RSG', 'THP-10', 'Selesai (Finished Good)', '✅', 'success', 10, 'Aktif', 'Produk selesai masuk ke gudang jadi'),
        ('RSG', 'THP-11', 'Batal', '❌', 'danger', 11, 'Aktif', 'SPK dibatalkan')
      ON DUPLICATE KEY UPDATE nama_tahapan = VALUES(nama_tahapan);
    `);

    conn.release();
    console.log('[MySQL] Tabel Bahasa Indonesia (toko_marketplace, produk_marketplace, produk_master, pesanan_marketplace, spk_batch, pelanggan_master, tahapan_spk_master) siap!');
  } catch (err) {
    console.error('[MySQL Init Error]:', err.message);
  }
}
