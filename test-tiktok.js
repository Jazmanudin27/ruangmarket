import { TiktokService } from './server/tiktok.service.js';

// Coba Shop Cipher 1 dan Shop Cipher 2 dari data ERP
const ciphers = [
  'ROW_Hbd_fAAAAACqX58asQX4uCOsoefXXn4c',
  'ROW_a8jKrQAAAACAttXT_EuXnKiQASXs4q8z'
];

const accessToken = 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGKef1MEDIAEooeWB1wYwzsTt1gI4AUABSAc.bXZV5rgwcNBJj7QDKg3HeLemNfaxLz5CFFqJzZ_5Z6Y';

console.log('=== TEST TARIK PRODUK TIKTOK SHOP OPEN API ===');
console.log('Toko: RUANG SERAGAM (Shop ID: 943001511)');
console.log('App Key: 6k51f66j8f7ki');
console.log('Menghubungi https://open-api.tiktokglobalshop.com/product/202309/products/search ...\n');

const svc = new TiktokService({
  appKey: '6k51f66j8f7ki',
  appSecret: '07ae917200c1af2fdc6fd6d7d39bc38f418bdbd1'
});

async function run() {
  for (let i = 0; i < ciphers.length; i++) {
    const cipher = ciphers[i];
    console.log(`Mencoba Shop Cipher #${i + 1}: ${cipher}...`);
    try {
      const products = await svc.syncProducts(accessToken, cipher);
      console.log(`\n[SUKSES BESAR!] Berhasil menarik ${products.length} produk asli dari TikTok Shop:`);
      console.log(JSON.stringify(products.slice(0, 5), null, 2));
      return;
    } catch (err) {
      console.log(`[STATUS CIPHER #${i + 1}]:`, err.message);
    }
  }
}

run();
