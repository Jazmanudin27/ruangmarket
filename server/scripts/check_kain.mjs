import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'ruangmarket',
  password: process.env.DB_PASSWORD || 'Jazman@271998',
  database: process.env.DB_NAME || 'ruangmarket'
});

async function main() {
  const [kRows] = await pool.query(`
    SELECT k.id, k.kode_sku_kain, k.nama_kain, k.jenis_kain, k.warna, COUNT(p.id) as total_produk
    FROM master_kain k
    LEFT JOIN produk_master p ON p.sku_kain = k.kode_sku_kain
    GROUP BY k.id
    ORDER BY total_produk DESC
  `);
  console.log('=== DAFTAR MASTER KAIN & PRODUK TERKAIT ===');
  console.table(kRows);

  const [sampleJoined] = await pool.query(`
    SELECT p.id, p.kode_sku, p.nama_produk, p.sku_kain, k.nama_kain, k.warna as warna_kain
    FROM produk_master p
    JOIN master_kain k ON p.sku_kain = k.kode_sku_kain
    LIMIT 10
  `);
  console.log('=== SAMPLE PRODUK DENGAN JOIN MASTER KAIN ===');
  console.table(sampleJoined);

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
