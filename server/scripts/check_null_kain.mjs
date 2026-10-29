import { pool } from '../config/db.js';

async function main() {
  const [nullKain] = await pool.query(`
    SELECT DISTINCT SUBSTRING_INDEX(kode_sku, '-', 3) as prefix, COUNT(*) as cnt, MIN(nama_produk) as sample_name
    FROM produk_master
    WHERE sku_kain IS NULL OR sku_kain = ''
    GROUP BY prefix
    ORDER BY cnt DESC
    LIMIT 30
  `);
  console.log('SKUs with NULL sku_kain:');
  console.table(nullKain);
  process.exit(0);
}

main().catch(console.error);
