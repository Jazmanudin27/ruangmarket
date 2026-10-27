import { TiktokService } from './server/tiktok.service.js';

let accessToken = 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGKef1MEDIAEooeWB1wYwzsTt1gI4AUABSAc.bXZV5rgwcNBJj7QDKg3HeLemNfaxLz5CFFqJzZ_5Z6Y';
const refreshToken = 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGKef1MEDIAIooeWB1wYwrpLQwAk4AUABSAc.PCHE_MspTFRFYZt21pkRGsMCvjBzWZAoZMXOhuxFhdM';
let shopCipher = 'ROW_Hbd_fAAAAACqX58asQX4uCOsoefXXn4c';

console.log('=== TEST TARIK PRODUK TIKTOK SHOP OPEN API ===');
console.log('Toko: RUANG SERAGAM (Shop ID: 943001511)');
console.log('App Key: 6k51f66j8f7ki');
console.log('App Secret: 07ae917200c1af2fdc6fd6d7d39bc38f418bdbd1\n');

const svc = new TiktokService();

async function run() {
  console.log('1. Melakukan Refresh Token TikTok agar mendapatkan Access Token yang masih segar...');
  try {
    const refreshData = await svc.refreshAccessToken(refreshToken);
    console.log('[REFRESH TOKEN SUKSES!]:');
    console.log(`- New Access Token : ${refreshData.access_token.substring(0, 30)}...`);
    console.log(`- New Refresh Token: ${refreshData.refresh_token.substring(0, 30)}...`);
    console.log(`- Seller Name      : ${refreshData.seller_name || 'RUANG SERAGAM'}`);
    accessToken = refreshData.access_token;
  } catch (err) {
    console.log('[REFRESH TOKEN INFO]:', err.message);
  }

  console.log('\n2. Mendapatkan Shop Info & Shop Cipher Resmi dari TikTok...');
  try {
    const shops = await svc.getShopInfo(accessToken);
    console.log(`Ditemukan ${shops.length} toko terhubung:`);
    shops.forEach((s, idx) => {
      console.log(`   [Toko ${idx + 1}] ID: ${s.id} | Nama: ${s.name} | Cipher: ${s.cipher}`);
    });
    if (shops.length > 0 && shops[0].cipher) {
      shopCipher = shops[0].cipher;
    }
  } catch (err) {
    console.log('[GET SHOP INFO INFO]:', err.message);
  }

  console.log(`\n3. Menarik Katalog Produk Toko menggunakan Shop Cipher: ${shopCipher}...`);
  try {
    const products = await svc.syncProducts(accessToken, shopCipher);
    console.log(`\n[SUKSES BESAR!!] Berhasil menarik ${products.length} produk asli dari TikTok Shop:`);
    console.log(JSON.stringify(products.slice(0, 5), null, 2));
  } catch (err) {
    console.log('[TARIK PRODUK GAGAL]:', err.message);
  }
}

run();
