import http from 'http';
import { ShopeeService } from './shopee.service.js';
import { TiktokService } from './tiktok.service.js';
import { pool, initDb } from './db.js';
import './env.js';

const PORT = process.env.PORT || 5010;

// Inisialisasi Database MySQL
initDb();

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

  // 5. API Toko Terhubung dari Database MySQL
  if (pathname === '/api/marketplace/stores' && req.method === 'GET') {
    try {
      const [rows] = await pool.query(`
        SELECT 
          id, kode_perusahaan as company_code, saluran as channel, 
          nama_saluran as channelName, nama_toko as shopName, id_toko as shopId,
          logo_toko as logo, cipher_toko as cipher, token_akses as accessToken,
          token_refresh as refreshToken, kadaluarsa_pada as expiresAt,
          status_koneksi as status, sinkron_stok_otomatis as autoSyncStok
        FROM toko_marketplace
      `);
      return sendJson(res, 200, { status: 'success', data: rows });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 6. API Ambil Data Produk Marketplace Staging dari MySQL
  if (pathname === '/api/marketplace/products' && req.method === 'GET') {
    try {
      const [rows] = await pool.query(`
        SELECT 
          id, id_produk_marketplace as item_id, kode_perusahaan as company_code,
          saluran as channel, nama_saluran as channelName, nama_toko as shopName,
          id_toko as shopId, nama_produk, sku_marketplace, harga_jual,
          stok_marketplace, varian as varian_marketplace, status_mapping as status,
          DATE_FORMAT(ditarik_pada, '%d %b %Y, %H:%i') as syncedAt
        FROM produk_marketplace
        ORDER BY ditarik_pada DESC
      `);
      return sendJson(res, 200, { status: 'success', data: rows });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 7. Shopee Products Sync API (Langsung simpan ke MySQL)
  if (pathname === '/api/marketplace/shopee/products' && req.method === 'GET') {
    const shopId = urlObj.searchParams.get('shop_id') || '1030191310';
    let accessToken = urlObj.searchParams.get('access_token');

    try {
      // Selalu ambil token dan refreshToken terbaru langsung dari MySQL
      let refreshToken = null;
      const [storeRows] = await pool.query('SELECT token_akses, token_refresh FROM toko_marketplace WHERE id_toko = ?', [shopId]);
      if (storeRows.length > 0) {
        accessToken = storeRows[0].token_akses || accessToken;
        refreshToken = storeRows[0].token_refresh;
      }

      console.log(`[Shopee] Syncing products for shopId: ${shopId}...`);
      let products = null;

      try {
        products = await shopeeService.syncProducts(shopId, accessToken);
      } catch (syncErr) {
        console.log(`[Shopee Sync Warning]: ${syncErr.message}. Mencoba auto-refresh token...`);
        if (refreshToken) {
          const ref = await shopeeService.refreshAccessToken(refreshToken, shopId, false);
          if (ref && ref.access_token) {
            accessToken = ref.access_token;
            refreshToken = ref.refresh_token || refreshToken;
            refreshToken = ref.refresh_token || refreshToken;
            
            // Simpan token baru ke database MySQL toko_marketplace
            await pool.query(`
              UPDATE toko_marketplace 
              SET token_akses = ?, token_refresh = ?, diperbarui_pada = CURRENT_TIMESTAMP 
              WHERE id_toko = ?
            `, [accessToken, refreshToken, shopId]);

            console.log('[Shopee] Token berhasil di-refresh dan disimpan ke MySQL!');
            products = await shopeeService.syncProducts(shopId, accessToken);
          } else {
            throw syncErr;
          }
        } else {
          throw syncErr;
        }
      }

      // Simpan langsung ke database MySQL (produk_marketplace)
      for (const p of products) {
        await pool.query(`
          INSERT INTO produk_marketplace (
            id, id_produk_marketplace, kode_perusahaan, saluran, 
            nama_saluran, nama_toko, id_toko, nama_produk, 
            sku_marketplace, harga_jual, stok_marketplace, varian, status_mapping
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_produk = VALUES(nama_produk),
            sku_marketplace = VALUES(sku_marketplace),
            harga_jual = VALUES(harga_jual),
            stok_marketplace = VALUES(stok_marketplace),
            varian = VALUES(varian),
            diperbarui_pada = CURRENT_TIMESTAMP
        `, [
          p.id, p.item_id, 'RSG', 'shopee',
          'Shopee Marketplace', p.shopName || 'Koperasi Sahabat Anak Bangsa', shopId,
          p.nama_produk, p.sku_marketplace, p.harga_jual, p.stok_marketplace,
          p.varian_marketplace, p.status || 'Belum Dimapping'
        ]);
      }

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

  // 8. TikTok Products Sync API (Langsung simpan ke MySQL)
  if (pathname === '/api/marketplace/tiktok/products' && req.method === 'GET') {
    const accessToken = urlObj.searchParams.get('access_token');
    const shopCipher = urlObj.searchParams.get('shop_cipher') || 'ROW_Hbd_fAAAAACqX58asQX4uCOsoefXXn4c';

    if (!accessToken) {
      return sendJson(res, 400, { status: 'error', message: 'access_token required' });
    }

    try {
      console.log(`[TikTok] Syncing products...`);
      const products = await tiktokService.syncProducts(accessToken, shopCipher);

      for (const p of products) {
        await pool.query(`
          INSERT INTO produk_marketplace (
            id, id_produk_marketplace, kode_perusahaan, saluran, 
            nama_saluran, nama_toko, id_toko, nama_produk, 
            sku_marketplace, harga_jual, stok_marketplace, varian, status_mapping
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_produk = VALUES(nama_produk),
            sku_marketplace = VALUES(sku_marketplace),
            harga_jual = VALUES(harga_jual),
            stok_marketplace = VALUES(stok_marketplace),
            diperbarui_pada = CURRENT_TIMESTAMP
        `, [
          p.id, p.item_id, 'RSG', 'tiktok',
          'TikTok Shop', p.shopName || 'TikTok Store', p.shopId || '',
          p.nama_produk, p.sku_marketplace, p.harga_jual, p.stok_marketplace,
          p.varian_marketplace, p.status || 'Belum Dimapping'
        ]);
      }

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
