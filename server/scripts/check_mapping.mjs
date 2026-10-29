import { pool } from '../config/db.js';

async function main() {
  const [rows] = await pool.query('SELECT COUNT(*) as total, COUNT(sku_kain) as with_kain, COUNT(id_kategori_hpp) as with_hpp FROM produk_master');
  console.log('Produk stats:', rows[0]);

  const [samples] = await pool.query(`
    SELECT kode_sku, nama_produk, kategori, sku_kain, id_kategori_hpp 
    FROM produk_master 
    WHERE sku_kain IS NOT NULL AND sku_kain != '' 
    LIMIT 20
  `);
  console.log('Sample with kain:');
  console.table(samples);

  const [hpps] = await pool.query('SELECT id_kategori_hpp, nama_kategori_hpp FROM master_hpp_produk');
  console.log('Sample HPP:');
  console.table(hpps);

  const [withKain] = await pool.query(`
    SELECT kode_sku, nama_produk, kategori, sku_kain 
    FROM produk_master 
    WHERE sku_kain IS NOT NULL AND sku_kain != ''
    LIMIT 30
  `);
  console.log('Sample with sku_kain:');
  console.table(withKain);

  const [filled] = await pool.query(`
    SELECT kode_sku, nama_produk, kategori, sku_kain, id_kategori_hpp
    FROM produk_master
    WHERE sku_kain IS NOT NULL AND sku_kain != '' AND id_kategori_hpp IS NOT NULL AND id_kategori_hpp != ''
    LIMIT 30
  `);
  console.log('Filled sample (both sku_kain & id_kategori_hpp):');
  console.table(filled);

  const [cols] = await pool.query('DESCRIBE master_hpp_produk');
  console.log('HPP Columns:', cols.map(c => c.Field));
  const [hppSamples] = await pool.query('SELECT * FROM master_hpp_produk LIMIT 5');
  console.log('HPP Sample:');
  console.table(hppSamples);

  process.exit(0);
}

main().catch(console.error);
