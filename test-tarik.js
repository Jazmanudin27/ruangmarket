import { ShopeeService } from './server/shopee.service.js';

const shopId = 7494247208764540234;
const accessToken = 'ROW_vxeWOQAAAADXzfcAbFNM2vF4sGvyrLklGCfVKYb9V5U-xAv3eYbj0WBp9k2DaBWQbhCs-Nbbf4CSvM0IRczhb3W_CpJb8PFK9NI72ydb0H8KkODzV-mB_tm_ZKGrQzybH1Btsfmr9OrmweBcvcbahhhqu7HsWUmifb_YB8gx-vonfi12uUm364iWKOTekkTQD2SUc4xrQKH2a1pKTA4mG4_5ftCNdi9B';

console.log('=== TEST TARIK PRODUK SHOPEE OPEN API ===');
console.log(`Toko: RAGANTARA UNIFORM (Shop ID: ${shopId})`);
console.log('Menghubungi https://partner.shopeemobile.com/api/v2/product/get_item_list ...\n');

const svc = new ShopeeService();

svc.syncProducts(shopId, accessToken)
  .then(products => {
    console.log(`[SUKSES] Berhasil menarik ${products.length} produk dari Shopee!`);
    console.log('Contoh Produk:', JSON.stringify(products.slice(0, 3), null, 2));
  })
  .catch(err => {
    console.log('[GAGAL / BLOCKED SHOPEE]:');
    console.log(err.message);
    if (err.message.includes('source_ip_undeclared')) {
      console.log('\nSOLUSI:');
      console.log('1. Salin IP yang tertera di pesan error di atas.');
      console.log('2. Buka https://console.open.shopee.com > App list > App 2036279 > App Details > IP Address Whitelist.');
      console.log('3. Paste IP tersebut lalu klik Save.');
    }
  });
