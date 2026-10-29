import { pool } from '../config/db.js';

async function check() {
  const [rows] = await pool.query(`
    SELECT id_kategori_hpp, nama_kategori_hpp, total_hpp 
    FROM master_hpp_produk 
    WHERE id_kategori_hpp IN (
      'HPP-KEMEJA-LENGAN-PANJANG-TK', 
      'HPP-CELANA-PANJANG-TK', 
      'HPP-PDL-DEWASA'
    )
  `);
  console.log('=== SAMPLE MASTER HPP ===');
  console.table(rows);

  const [details] = await pool.query(`
    SELECT id_kategori_hpp, nama_jasa, jumlah, harga, total 
    FROM detail_master_hpp_produk 
    WHERE id_kategori_hpp = 'HPP-KEMEJA-LENGAN-PANJANG-TK'
  `);
  console.log('=== SAMPLE DETAIL (KEMEJA LENGAN PANJANG TK) ===');
  console.table(details);

  process.exit(0);
}

check().catch(console.error);
