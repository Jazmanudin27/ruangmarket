import { ShopeeService } from './server/shopee.service.js';

const stores = [
  {
    name: 'Koperasi Sahabat Anak Bangsa (Shopee)',
    shopId: '1030191310',
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAEozLKC1wYw_4S4xwk4AUABSAc.Akf_2_Oh892XxGfWUbY4HXNPqIn3DsQUBZpI1DTivMY',
    refreshToken: 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAIozLKC1wYwrduHtAQ4AUABSAc.WM8feqDMjMxCNQcvMwwvCLiHCMN0A0AKjS8Z5JopdKY'
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
