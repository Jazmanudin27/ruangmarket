import http from 'http';
import { ShopeeService } from './shopee.service.js';
import { TiktokService } from './tiktok.service.js';

const PORT = process.env.PORT || 3001;

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

  // 2. Shopee Products Sync API
  if (pathname === '/api/marketplace/shopee/products' && req.method === 'GET') {
    const shopId = urlObj.searchParams.get('shop_id') || '7494247208764540234';
    const accessToken = urlObj.searchParams.get('access_token') || 'ROW_vxeWOQAAAADXzfcAbFNM2vF4sGvyrLklGCfVKYb9V5U-xAv3eYbj0WBp9k2DaBWQbhCs-Nbbf4CSvM0IRczhb3W_CpJb8PFK9NI72ydb0H8KkODzV-mB_tm_ZKGrQzybH1Btsfmr9OrmweBcvcbahhhqu7HsWUmifb_YB8gx-vonfi12uUm364iWKOTekkTQD2SUc4xrQKH2a1pKTA4mG4_5ftCNdi9B';

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

  // 3. TikTok Products Sync API
  if (pathname === '/api/marketplace/tiktok/products' && req.method === 'GET') {
    const accessToken = urlObj.searchParams.get('access_token');
    const shopCipher = urlObj.searchParams.get('shop_cipher') || 'ROW_hrW2eAAAAADXzfcAbFNM...';

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
