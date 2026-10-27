import crypto from 'crypto';

// 1. SHOPEE AUTH URL
const partnerId = 2036279;
const partnerKey = 'shpk59526e67746975637544656f774b525973634654617446624f6867646677';
const shopeeRedirect = 'https://market.ruangtech.com/shopee/callback';
const shopeePath = '/api/v2/shop/auth_partner';
const shopeeTimestamp = Math.floor(Date.now() / 1000);

const shopeeBaseString = `${partnerId}${shopeePath}${shopeeTimestamp}`;
const shopeeSign = crypto.createHmac('sha256', partnerKey).update(shopeeBaseString).digest('hex');
const shopeeAuthUrl = `https://partner.shopeemobile.com${shopeePath}?partner_id=${partnerId}&timestamp=${shopeeTimestamp}&sign=${shopeeSign}&redirect=${encodeURIComponent(shopeeRedirect)}`;

// 2. TIKTOK AUTH URL
const tiktokAppKey = '6k51f66j8f7ki';
const tiktokRedirect = 'https://market.ruangtech.com/tiktok/callback';
const tiktokState = `ruangmarket_${Date.now()}`;
const tiktokAuthUrl = `https://services.tiktokshop.com/open/authorize?app_key=${tiktokAppKey}&state=${tiktokState}&redirect_uri=${encodeURIComponent(tiktokRedirect)}`;

console.log('================================================================');
console.log('🔗 LINK RESMI OTORISASI TOKO KE RUANGMARKET (1 KALI KLIK SAJA)');
console.log('================================================================\n');

console.log('1. LINK OTORISASI SHOPEE:');
console.log(shopeeAuthUrl);
console.log('\n--> Buka link di atas di browser Anda, login dengan akun Shopee toko Anda, lalu klik "Authorize".\n');

console.log('----------------------------------------------------------------\n');

console.log('2. LINK OTORISASI TIKTOK SHOP:');
console.log(tiktokAuthUrl);
console.log('\n--> Buka link di atas di browser Anda, login dengan akun TikTok Shop toko Anda, lalu klik "Confirm to Authorize".\n');

console.log('================================================================');
