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
        ditarik_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Daftar pesanan marketplace yang terhubung ke SPK';
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

    conn.release();
    console.log('[MySQL] Tabel Bahasa Indonesia (toko_marketplace, produk_marketplace, produk_master, pesanan_marketplace) siap!');
  } catch (err) {
    console.error('[MySQL Init Error]:', err.message);
  }
}
