import http from 'http';
import { ShopeeService } from './shopee.service.js';
import { TiktokService } from './tiktok.service.js';
import './env.js';

const PORT = process.env.PORT || 3008;

const shopeeService = new ShopeeService();
const tiktokService = new TiktokService();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // 1. Health check
  if (pathname === '/api/marketplace/health') {
    return sendJson(res, 200, { status: 'ok', serverTime: new Date().toISOString() });
  }

  // 2. Endpoint Generate Auth URL
  if (pathname === '/api/marketplace/auth-url' && req.method === 'GET') {
    const channel = urlObj.searchParams.get('channel');
    if (channel === 'shopee') {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = '/api/v2/shop/auth_partner';
      const redirect = 'https://market.ruangtech.com/shopee/callback';
      const sign = shopeeService.generateSignature(path, timestamp);
      const url = `${shopeeService.baseUrl}${path}?partner_id=${shopeeService.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirect)}`;
      return sendJson(res, 200, { url });
    }
    if (channel === 'tiktok') {
      const url = tiktokService.getAuthUrl();
      return sendJson(res, 200, { url });
    }
    return sendJson(res, 400, { error: 'Unknown channel' });
  }

  // 3. Callback Route Shopee
  if (pathname === '/shopee/callback' && req.method === 'GET') {
    const code = urlObj.searchParams.get('code');
    const shopId = urlObj.searchParams.get('shop_id');
    console.log(`[Shopee Callback] Code: ${code}, Shop ID: ${shopId}`);
    
    // Redirect ke dashboard frontend
    res.writeHead(302, { Location: `/#marketplace?channel=shopee&code=${code || ''}&shop_id=${shopId || ''}` });
    return res.end();
  }

  // 4. Callback Route TikTok
  if (pathname === '/tiktok/callback' && req.method === 'GET') {
    const code = urlObj.searchParams.get('code');
    console.log(`[TikTok Callback] Code: ${code}`);

    res.writeHead(302, { Location: `/#marketplace?channel=tiktok&code=${code || ''}` });
    return res.end();
  }

  // 5. Shopee Products Sync API
  if (pathname === '/api/marketplace/shopee/products' && req.method === 'GET') {
    const shopId = urlObj.searchParams.get('shop_id') || '1030191310';
    const accessToken = urlObj.searchParams.get('access_token') || 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAEozLKC1wYw_4S4xwk4AUABSAc.Akf_2_Oh892XxGfWUbY4HXNPqIn3DsQUBZpI1DTivMY';

    try {
      console.log(`[Shopee] Syncing products for shopId: ${shopId}...`);
      const products = await shopeeService.syncProducts(shopId, accessToken);
      return sendJson(res, 200, {
        status: 'success',
        count: products.length,
        data: products
      });
    } catch (err) {
      console.error('[Shopee Sync Error]:', err.message);
      return sendJson(res, 400, {
        status: 'error',
        message: err.message
      });
    }
  }

  // 6. TikTok Products Sync API
  if (pathname === '/api/marketplace/tiktok/products' && req.method === 'GET') {
    const accessToken = urlObj.searchParams.get('access_token');
    const shopCipher = urlObj.searchParams.get('shop_cipher') || 'ROW_Hbd_fAAAAACqX58asQX4uCOsoefXXn4c';

    if (!accessToken) {
      return sendJson(res, 400, { status: 'error', message: 'access_token required' });
    }

    try {
      console.log(`[TikTok] Syncing products...`);
      const products = await tiktokService.syncProducts(accessToken, shopCipher);
      return sendJson(res, 200, {
        status: 'success',
        count: products.length,
        data: products
      });
    } catch (err) {
      console.error('[TikTok Sync Error]:', err.message);
      return sendJson(res, 400, {
        status: 'error',
        message: err.message
      });
    }
  }

  // Not Found
  sendJson(res, 404, { error: 'Endpoint tidak ditemukan' });
});

server.listen(PORT, () => {
  console.log(`RuangMarket Marketplace API Server berjalan di port ${PORT}`);
});
