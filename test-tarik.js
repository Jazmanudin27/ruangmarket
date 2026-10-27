import { ShopeeService } from './server/shopee.service.js';

const stores = [
  {
    name: 'RUANG SERAGAM (Shopee)',
    shopId: '7495487525216094891',
    accessToken: 'ROW_hrW2eAAAAADXzfcAbFNM2vF4sGvyrLklzSslk4uklv4KXG8FDCL8TMDVZVSXm1QNwF3HkXc-CfZT-WsF6yF-qO2wOSJKCKh0f2aji_gApWDGMP1FFNH5ZYrC2D-6o9YEAajZdQ7cQvPYE1BZu2jAwSLxLaUzYOX0JwzW6ZUsu5Tj1dxn343kAe1TMZ5nydARMQJ94b20hIGW2ibwtqaqCkw8yQz8wQjW',
    refreshToken: 'ROW_rfVKJgAAAACQMhMaQ5QXpCAhk_jChhoWo0KgxyEvuEVSbCvPTxxl3OU0jfV_dLTlJcuRIEhLVNQ'
  },
  {
    name: 'RAGANTARA UNIFORM (Shopee)',
    shopId: '7494247208764540234',
    accessToken: 'ROW_vxeWOQAAAADXzfcAbFNM2vF4sGvyrLklGCfVKYb9V5U-xAv3eYbj0WBp9k2DaBWQbhCs-Nbbf4CSvM0IRczhb3W_CpJb8PFK9NI72ydb0H8KkODzV-mB_tm_ZKGrQzybH1Btsfmr9OrmweBcvcbahhhqu7HsWUmifb_YB8gx-vonfi12uUm364iWKOTekkTQD2SUc4xrQKH2a1pKTA4mG4_5ftCNdi9B',
    refreshToken: 'ROW_U5GyVAAAAACQMhMaQ5QXpCAhk_jChhoWhZBMQOdJg46oqHXZXnJS8cIfKb6AxdbslxXsUdLtCDA'
  }
];

console.log('=== TEST TARIK PRODUK SHOPEE OPEN API ===');
const svc = new ShopeeService();

async function run() {
  for (let i = 0; i < stores.length; i++) {
    const s = stores[i];
    console.log(`\n--- [UJI COBA TOKO ${i + 1}]: ${s.name} ---`);
    console.log(`Shop ID: ${s.shopId}`);
    
    let currentToken = s.accessToken;
    try {
      const products = await svc.syncProducts(s.shopId, currentToken);
      console.log(`[SUKSES BESAR!!] Berhasil menarik ${products.length} produk asli dari Shopee!`);
      console.log('Contoh Produk:', JSON.stringify(products.slice(0, 3), null, 2));
      return;
    } catch (err) {
      console.log('[PERCOBAAN TARIK GAGAL]:', err.message);

      if (err.message.includes('access_token') || err.message.includes('error_auth')) {
        console.log('Mencoba auto-refresh token sebagai shop_id...');
        let ref = null;
        try {
          ref = await svc.refreshAccessToken(s.refreshToken, s.shopId, false);
        } catch (refErr1) {
          console.log('[REFRESH SEBAGAI shop_id]:', refErr1.message);
          console.log('Mencoba auto-refresh token sebagai merchant_id (Main Account)...');
          try {
            ref = await svc.refreshAccessToken(s.refreshToken, s.shopId, true);
          } catch (refErr2) {
            console.log('[REFRESH SEBAGAI merchant_id]:', refErr2.message);
          }
        }

        if (ref && ref.access_token) {
          console.log('[REFRESH TOKEN SUKSES!]: Token Baru Berhasil Didapatkan!');
          currentToken = ref.access_token;
          const retryProducts = await svc.syncProducts(s.shopId, currentToken);
          console.log(`[SUKSES BESAR!!] Berhasil menarik ${retryProducts.length} produk asli dari Shopee!`);
          console.log('Contoh Produk:', JSON.stringify(retryProducts.slice(0, 3), null, 2));
          return;
        }
      }
    }
  }
}

run();
