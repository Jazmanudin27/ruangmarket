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

// Inisialisasi Tabel MySQL Otomatis
export async function initDb() {
  try {
    const conn = await pool.getConnection();
    console.log('[MySQL] Berhasil terhubung ke database:', DB_CONFIG.database);

    // 1. Tabel Toko Marketplace (Stores)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id VARCHAR(64) PRIMARY KEY,
        company_code VARCHAR(32) DEFAULT 'RSG',
        channel VARCHAR(32) NOT NULL,
        channel_name VARCHAR(64) NOT NULL,
        shop_name VARCHAR(128) NOT NULL,
        shop_id VARCHAR(64) NOT NULL UNIQUE,
        logo VARCHAR(255) DEFAULT '',
        cipher VARCHAR(255) DEFAULT '',
        access_token TEXT,
        refresh_token TEXT,
        expires_at DATETIME,
        status VARCHAR(32) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Tabel Produk Marketplace Staging
    await conn.query(`
      CREATE TABLE IF NOT EXISTS marketplace_products (
        id VARCHAR(64) PRIMARY KEY,
        item_id VARCHAR(64) NOT NULL,
        company_code VARCHAR(32) DEFAULT 'RSG',
        channel VARCHAR(32) NOT NULL,
        channel_name VARCHAR(64),
        shop_name VARCHAR(128),
        shop_id VARCHAR(64),
        nama_produk VARCHAR(255) NOT NULL,
        sku_marketplace VARCHAR(128),
        harga_jual DECIMAL(15,2) DEFAULT 0,
        stok_marketplace INT DEFAULT 0,
        varian_marketplace VARCHAR(128) DEFAULT 'Standard',
        status VARCHAR(32) DEFAULT 'Belum Dimapping',
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_item_store (item_id, channel)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Tabel Master Produk ERP
    await conn.query(`
      CREATE TABLE IF NOT EXISTS master_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_code VARCHAR(32) DEFAULT 'RSG',
        kode_produk VARCHAR(64) NOT NULL UNIQUE,
        nama_produk VARCHAR(255) NOT NULL,
        kategori VARCHAR(64),
        satuan VARCHAR(32) DEFAULT 'PCS',
        harga_jual DECIMAL(15,2) DEFAULT 0,
        stok INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Masukkan Akun Toko Shopee Resmi jika belum ada
    await conn.query(`
      INSERT INTO stores (id, company_code, channel, channel_name, shop_name, shop_id, access_token, refresh_token, status)
      VALUES (
        'tk_shopee_sahabat',
        'RSG',
        'shopee',
        'Shopee Marketplace',
        'Koperasi Sahabat Anak Bangsa',
        '1030191310',
        'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAEozLKC1wYw_4S4xwk4AUABSAc.Akf_2_Oh892XxGfWUbY4HXNPqIn3DsQUBZpI1DTivMY',
        'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAIozLKC1wYwrduHtAQ4AUABSAc.WM8feqDMjMxCNQcvMwwvCLiHCMN0A0AKjS8Z5JopdKY',
        'Active (Connected)'
      ) ON DUPLICATE KEY UPDATE 
        access_token = VALUES(access_token),
        refresh_token = VALUES(refresh_token);
    `);

    conn.release();
    console.log('[MySQL] Tabel stores, marketplace_products & master_products siap!');
  } catch (err) {
    console.error('[MySQL Init Error]:', err.message);
  }
}
