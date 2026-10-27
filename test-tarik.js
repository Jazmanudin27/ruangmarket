import { ShopeeService } from './server/shopee.service.js';

// Shop ID WAJIB sebagai STRING agar tidak terpotong presisi integer 64-bit di JavaScript
const shopId = '7494247208764540234';
let accessToken = 'ROW_vxeWOQAAAADXzfcAbFNM2vF4sGvyrLklGCfVKYb9V5U-xAv3eYbj0WBp9k2DaBWQbhCs-Nbbf4CSvM0IRczhb3W_CpJb8PFK9NI72ydb0H8KkODzV-mB_tm_ZKGrQzybH1Btsfmr9OrmweBcvcbahhhqu7HsWUmifb_YB8gx-vonfi12uUm364iWKOTekkTQD2SUc4xrQKH2a1pKTA4mG4_5ftCNdi9B';
const refreshToken = 'ROW_U5GyVAAAAACQMhMaQ5QXpCAhk_jChhoWhZBMQOdJg46oqHXZXnJS8cIfKb6AxdbslxXsUdLtCDA';

console.log('=== TEST TARIK PRODUK SHOPEE OPEN API ===');
console.log(`Toko: RAGANTARA UNIFORM`);
console.log(`Shop ID: ${shopId} (String valid, bukan rounded number)`);
console.log('Menghubungi Shopee API v2...\n');

const svc = new ShopeeService();

async function run() {
  try {
    const products = await svc.syncProducts(shopId, accessToken);
    console.log(`\n[SUKSES BESAR!] Berhasil menarik ${products.length} produk asli dari Shopee:`);
    console.log(JSON.stringify(products.slice(0, 5), null, 2));
  } catch (err) {
    console.log('[PERCOBAAN 1 GAGAL]:', err.message);

    // Jika access_token expired / invalid, coba auto-refresh menggunakan refresh_token
    if (err.message.includes('access_token') || err.message.includes('error_auth')) {
      console.log('\nMencoba Auto-Refresh Access Token menggunakan Refresh Token Shopee...');
      try {
        const refreshRes = await svc.refreshAccessToken(refreshToken, shopId);
        console.log('[REFRESH TOKEN SUKSES!]:', JSON.stringify(refreshRes, null, 2));
        if (refreshRes.access_token) {
          accessToken = refreshRes.access_token;
          console.log('\nMencoba tarik produk kembali dengan Access Token baru...');
          const retryProducts = await svc.syncProducts(shopId, accessToken);
          console.log(`\n[SUKSES BESAR!] Berhasil menarik ${retryProducts.length} produk asli dari Shopee:`);
          console.log(JSON.stringify(retryProducts.slice(0, 5), null, 2));
        }
      } catch (refErr) {
        console.error('[REFRESH TOKEN GAGAL]:', refErr.message);
      }
    }
  }
}

run();
