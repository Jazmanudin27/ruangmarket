import { pool } from '../config/db.js';
import { getKainMetadata } from './seed_master_kain.mjs';

async function main() {
  console.log('[Update Kain] Memulai pembaruan harga_per_meter di master_kain...');
  
  const [rows] = await pool.query('SELECT id, kode_sku_kain, nama_kain, harga_per_meter FROM master_kain');
  console.log(`[Update Kain] Total ditemukan ${rows.length} master kain.`);

  let updated = 0;
  for (const r of rows) {
    const meta = getKainMetadata(r.kode_sku_kain);
    const newPrice = meta.harga || 25000;
    
    await pool.query(`
      UPDATE master_kain 
      SET harga_per_meter = ?, nama_kain = ?, jenis_kain = ?, warna = ?
      WHERE id = ?
    `, [newPrice, meta.nama || r.nama_kain, meta.jenis || null, meta.warna || null, r.id]);
    updated++;
  }

  console.log(`[Update Kain] Selesai memperbarui ${updated} master kain.`);
  
  const [after] = await pool.query('SELECT id, kode_sku_kain, nama_kain, harga_per_meter FROM master_kain ORDER BY id ASC');
  console.table(after);
  process.exit(0);
}

main().catch(err => {
  console.error('[Update Kain Error]:', err);
  process.exit(1);
});
