import { pool } from '../config/db.js';
import { detectSkuKain, detectIdKategoriHpp } from '../utils/autoDetector.util.js';

async function main() {
  const [prods] = await pool.query('SELECT kode_sku, nama_produk, sku_kain, id_kategori_hpp FROM produk_master');
  const [hppList] = await pool.query('SELECT id_kategori_hpp, nama_kategori_hpp FROM master_hpp_produk');

  let filledKain = 0;
  let filledHpp = 0;

  for (const p of prods) {
    const k = detectSkuKain(p.kode_sku, p.nama_produk, p.sku_kain);
    const h = detectIdKategoriHpp(p.kode_sku, p.nama_produk, hppList);
    if (k) filledKain++;
    if (h) filledHpp++;
  }

  console.log(`Total Products: ${prods.length}`);
  console.log(`Detectable Kain: ${filledKain} (${((filledKain/prods.length)*100).toFixed(1)}%)`);
  console.log(`Detectable HPP: ${filledHpp} (${((filledHpp/prods.length)*100).toFixed(1)}%)`);

  // Test sample of KURUNG-PUTIH and KK-PUTIH
  console.log('\nTesting KURUNG-PUTIH-SD-XXXL:');
  console.log('Kain:', detectSkuKain('KURUNG-PUTIH-SD-XXXL', 'Baju Kurung Muslim Anak Varian Warna Putih Size XXXL'));
  console.log('HPP:', detectIdKategoriHpp('KURUNG-PUTIH-SD-XXXL', 'Baju Kurung Muslim Anak Varian Warna Putih Size XXXL', hppList));

  console.log('\nTesting KK-PUTIH-SD-LPK-XXXL:');
  console.log('Kain:', detectSkuKain('KK-PUTIH-SD-LPK-XXXL', 'Koko Anak Varian Warna Putih Lengan Pendek Size XXXL'));
  console.log('HPP:', detectIdKategoriHpp('KK-PUTIH-SD-LPK-XXXL', 'Koko Anak Varian Warna Putih Lengan Pendek Size XXXL', hppList));

  process.exit(0);
}

main().catch(console.error);
