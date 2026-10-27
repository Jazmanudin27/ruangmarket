import crypto from 'crypto';

// Credentials Toko Shopee & TikTok
export const MARKETPLACE_CONFIG = {
  shopee: {
    partnerId: 2036279,
    baseUrl: 'https://partner.shopeemobile.com',
    redirectUrl: 'https://erp.aspartech.com/shopee/callback',
    partnerKey: 'shpk59526e67746975637544656f774b525973634654617446624f6867646677',
    webhookSecret: '686152534b71424663427756415846654658726c4a6875595579425677426f61',
  },
  tiktok: {
    appKey: '6k51f66j8f7ki',
    appSecret: '07ae917200c1af2fdc6fd6d7d39bc38f418bdbd1',
    redirectUri: 'https://erp.aspartech.com/tiktok/callback',
  }
};

/**
 * Generate official Shopee OAuth 2.0 Authorization URL
 * Signature = HMAC-SHA256(partner_key, `${partner_id}${path}${timestamp}`)
 */
export function generateShopeeAuthUrl() {
  const partnerId = MARKETPLACE_CONFIG.shopee.partnerId;
  const partnerKey = MARKETPLACE_CONFIG.shopee.partnerKey;
  const baseUrl = MARKETPLACE_CONFIG.shopee.baseUrl;
  const redirectUrl = MARKETPLACE_CONFIG.shopee.redirectUrl;
  const path = '/api/v2/shop/auth_partner';
  const timestamp = Math.floor(Date.now() / 1000);

  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');

  return `${baseUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
}

/**
 * Generate official TikTok Shop OAuth 2.0 Authorization URL
 */
export function generateTiktokAuthUrl() {
  const appKey = MARKETPLACE_CONFIG.tiktok.appKey;
  const redirectUri = MARKETPLACE_CONFIG.tiktok.redirectUri;
  const state = 'ruangmarket_' + Math.random().toString(36).substring(2, 10);

  return `https://services.tiktokshop.com/open/authorize?service_id=7345678912345678901&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}
