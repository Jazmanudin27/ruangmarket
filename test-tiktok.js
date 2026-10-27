import { TiktokService } from './server/tiktok.service.js';

const shopCipher = 'ROW_Hbd_fAAAAACqX58asQX4uCOsoefXXn4c';
const accessToken = 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGKef1MEDIAEooeWB1wYwzsTt1gI4AUABSAc.bXZV5rgwcNBJj7QDKg3HeLemNfaxLz5CFFqJzZ_5Z6Y';

console.log('=== TEST TARIK PRODUK TIKTOK SHOP OPEN API ===');
console.log('Toko: RUANG SERAGAM (Shop ID: 943001511)');
console.log('Menghubungi https://open-api.tiktokglobalshop.com/product/202309/products/search ...\n');

const svc = new TiktokService();

svc.syncProducts(accessToken, shopCipher)
  .then(products => {
    console.log(`[SUKSES BESAR!] Berhasil menarik ${products.length} produk asli dari TikTok Shop:`);
    console.log(JSON.stringify(products.slice(0, 5), null, 2));
  })
  .catch(err => {
    console.log('[STATUS TIKTOK API]:');
    console.log(err.message);
  });
