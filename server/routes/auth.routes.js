import { sendJson } from '../utils/response.js';

export async function handleAuthRoutes(req, res, pathname, urlObj, { shopeeService, tiktokService }) {
  // 1. Endpoint Generate Auth URL
  if (pathname === '/api/marketplace/auth-url' && req.method === 'GET') {
    const channel = urlObj.searchParams.get('channel');
    if (channel === 'shopee') {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/api/v2/shop/auth_partner';
      const redirect = 'https://market.ruangtech.com/shopee/callback';
      const sign = shopeeService.generateSignature(path, timestamp);
      const url = `${shopeeService.baseUrl}${path}?partner_id=${shopeeService.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirect)}`;
      sendJson(res, 200, { url });
      return true;
    }
    if (channel === 'tiktok') {
      const url = tiktokService.getAuthUrl();
      sendJson(res, 200, { url });
      return true;
    }
    sendJson(res, 400, { error: 'Unknown channel' });
    return true;
  }

  // 2. Callback Route Shopee
  if (pathname === '/shopee/callback' && req.method === 'GET') {
    const code = urlObj.searchParams.get('code');
    const shopId = urlObj.searchParams.get('shop_id');
    console.log(`[Shopee Callback] Code: ${code}, Shop ID: ${shopId}`);
    res.writeHead(302, { Location: `/#marketplace?channel=shopee&code=${code || ''}&shop_id=${shopId || ''}` });
    res.end();
    return true;
  }

  // 3. Callback Route TikTok
  if (pathname === '/tiktok/callback' && req.method === 'GET') {
    const code = urlObj.searchParams.get('code');
    console.log(`[TikTok Callback] Code: ${code}`);
    res.writeHead(302, { Location: `/#marketplace?channel=tiktok&code=${code || ''}` });
    res.end();
    return true;
  }

  return false;
}
