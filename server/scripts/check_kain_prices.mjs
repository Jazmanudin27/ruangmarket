import { pool } from '../config/db.js';

async function main() {
  const [rows] = await pool.query('SELECT id, kode_sku_kain, nama_kain, harga_per_meter FROM master_kain ORDER BY id ASC');
  console.log(`Total kain: ${rows.length}`);
  console.table(rows);
  process.exit(0);
}

main().catch(console.error);
