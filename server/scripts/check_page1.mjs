import { pool } from '../config/db.js';

async function main() {
  const [rows] = await pool.query(`
    SELECT p.id, p.kode_sku, p.nama_produk, p.sku_kain, k.nama_kain, p.id_kategori_hpp, h.nama_kategori_hpp 
    FROM produk_master p 
    LEFT JOIN master_kain k ON p.sku_kain = k.kode_sku_kain 
    LEFT JOIN master_hpp_produk h ON p.id_kategori_hpp = h.id_kategori_hpp 
    ORDER BY p.id DESC 
    LIMIT 20
  `);
  console.log('Page 1 products (ORDER BY id DESC):');
  console.table(rows);
  process.exit(0);
}

main().catch(console.error);
