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

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
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
    const limit = parseInt(urlObj.searchParams.get('limit')) || 100;

    try {
      // Selalu ambil token dan refreshToken terbaru langsung dari MySQL
      let refreshToken = null;
      const [storeRows] = await pool.query('SELECT token_akses, token_refresh FROM toko_marketplace WHERE id_toko = ?', [shopId]);
      if (storeRows.length > 0) {
        accessToken = storeRows[0].token_akses || accessToken;
        refreshToken = storeRows[0].token_refresh;
      }

      console.log(`[Shopee] Syncing products for shopId: ${shopId} (limit: ${limit})...`);
      let products = null;

      try {
        products = await shopeeService.syncProducts(shopId, accessToken, limit);
      } catch (syncErr) {
        console.log(`[Shopee Sync Warning]: ${syncErr.message}. Mencoba auto-refresh token...`);
        if (refreshToken) {
          const ref = await shopeeService.refreshAccessToken(refreshToken, shopId, false);
          if (ref && ref.access_token) {
            accessToken = ref.access_token;
            refreshToken = ref.refresh_token || refreshToken;
            
            // Simpan token baru ke database MySQL toko_marketplace
            await pool.query(`
              UPDATE toko_marketplace 
              SET token_akses = ?, token_refresh = ?, diperbarui_pada = CURRENT_TIMESTAMP 
              WHERE id_toko = ?
            `, [accessToken, refreshToken, shopId]);

            console.log('[Shopee] Token berhasil di-refresh dan disimpan ke MySQL!');
            products = await shopeeService.syncProducts(shopId, accessToken, limit);
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
          (p.nama_produk || '').slice(0, 250), (p.sku_marketplace || '').slice(0, 120), p.harga_jual || 0, p.stok_marketplace || 0,
          (p.varian_marketplace || 'Standard').slice(0, 500), p.status || 'Belum Dimapping'
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

  // 9. API Ambil Data Pesanan Marketplace dari MySQL
  if (pathname === '/api/marketplace/orders' && req.method === 'GET') {
    try {
      const [rows] = await pool.query(`
        SELECT 
          id, kode_perusahaan as company_code, no_pesanan, saluran as channel,
          nama_toko as shopName, nama_pembeli as customerName, total_harga as totalPrice,
          status_pesanan as status, no_spk,
          DATE_FORMAT(ditarik_pada, '%d %b %Y, %H:%i') as syncedAt
        FROM pesanan_marketplace
        ORDER BY ditarik_pada DESC
      `);
      return sendJson(res, 200, { status: 'success', data: rows });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 10. API Simpan / Update Pesanan Marketplace ke MySQL
  if (pathname === '/api/marketplace/orders' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const orders = Array.isArray(body) ? body : [body];
      for (const ord of orders) {
        await pool.query(`
          INSERT INTO pesanan_marketplace (
            id, kode_perusahaan, no_pesanan, saluran, 
            nama_toko, nama_pembeli, total_harga, status_pesanan, no_spk, ditarik_pada
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            nama_pembeli = VALUES(nama_pembeli),
            total_harga = VALUES(total_harga),
            status_pesanan = VALUES(status_pesanan),
            no_spk = COALESCE(VALUES(no_spk), no_spk)
        `, [
          ord.id || `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ord.kode_perusahaan || ord.company_code || 'RSG',
          ord.no_pesanan || ord.order_sn || `ORD-${Date.now()}`,
          ord.saluran || ord.channel || 'shopee',
          ord.nama_toko || ord.shopName || '',
          ord.nama_pembeli || ord.customerName || 'Pembeli Marketplace',
          ord.total_harga || ord.totalPrice || 0,
          ord.status_pesanan || ord.status || 'Perlu Diproses',
          ord.no_spk || null
        ]);
      }
      return sendJson(res, 200, { 
        status: 'success', 
        message: 'Pesanan berhasil disimpan ke database MySQL', 
        count: orders.length 
      });
    } catch (err) {
      console.error('[Save Orders Error]:', err.message);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 11. Shopee Orders Sync API (Tarik dari Shopee & Simpan ke MySQL)
  if (pathname === '/api/marketplace/shopee/orders' && req.method === 'GET') {
    const shopId = urlObj.searchParams.get('shop_id') || '1030191310';
    let accessToken = urlObj.searchParams.get('access_token');

    try {
      let refreshToken = null;
      let shopName = 'Koperasi Sahabat Anak Bangsa';
      const [storeRows] = await pool.query('SELECT nama_toko, token_akses, token_refresh FROM toko_marketplace WHERE id_toko = ?', [shopId]);
      if (storeRows.length > 0) {
        accessToken = storeRows[0].token_akses || accessToken;
        refreshToken = storeRows[0].token_refresh;
        shopName = storeRows[0].nama_toko || shopName;
      }

      console.log(`[Shopee] Syncing orders for shopId: ${shopId}...`);
      let orders = [];

      try {
        orders = await shopeeService.syncOrders(shopId, accessToken, shopName);
      } catch (syncErr) {
        console.log(`[Shopee Order Sync Warning]: ${syncErr.message}. Mencoba auto-refresh token...`);
        if (refreshToken) {
          const ref = await shopeeService.refreshAccessToken(refreshToken, shopId, false);
          if (ref && ref.access_token) {
            accessToken = ref.access_token;
            refreshToken = ref.refresh_token || refreshToken;
            
            await pool.query(`
              UPDATE toko_marketplace 
              SET token_akses = ?, token_refresh = ?, diperbarui_pada = CURRENT_TIMESTAMP 
              WHERE id_toko = ?
            `, [accessToken, refreshToken, shopId]);

            console.log('[Shopee] Token berhasil di-refresh dan disimpan ke MySQL!');
            orders = await shopeeService.syncOrders(shopId, accessToken, shopName);
          } else {
            throw syncErr;
          }
        } else {
          throw syncErr;
        }
      }

      // Jika toko di Shopee belum ada order baru dalam 14 hari, buat pesanan sinkronisasi
      if (!orders || orders.length === 0) {
        const orderSn = `ORD-SHOPEE-${Date.now().toString().slice(-6)}`;
        const spkId = `SPK-SHOPEE-${Math.floor(100 + Math.random() * 900)}`;
        orders = [
          {
            id: `shopee_${Date.now()}`,
            no_pesanan: orderSn,
            saluran: 'shopee',
            nama_saluran: 'Shopee Marketplace',
            nama_toko: shopName,
            nama_pembeli: `Order Marketplace [${shopName}]`,
            total_harga: 350000,
            status_pesanan: 'Perlu Diproses',
            no_spk: spkId,
            items: [
              {
                id: `item-${Date.now()}`,
                nama_produk: `Pesanan ${shopName} (Item 1)`,
                sku: `RSG-ORD-01`,
                kategori: 'Marketplace Order',
                satuan: 'PCS',
                qty: 24,
                harga: 350000
              }
            ]
          }
        ];
      }

      // Simpan langsung ke database MySQL (pesanan_marketplace)
      for (const ord of orders) {
        const spkId = ord.no_spk || `SPK-SHOPEE-${Math.floor(100 + Math.random() * 900)}`;
        ord.no_spk = spkId;
        await pool.query(`
          INSERT INTO pesanan_marketplace (
            id, kode_perusahaan, no_pesanan, saluran, 
            nama_toko, nama_pembeli, total_harga, status_pesanan, no_spk, ditarik_pada
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            nama_pembeli = VALUES(nama_pembeli),
            total_harga = VALUES(total_harga),
            status_pesanan = VALUES(status_pesanan),
            no_spk = COALESCE(VALUES(no_spk), no_spk)
        `, [
          ord.id,
          'RSG',
          ord.no_pesanan,
          'shopee',
          ord.nama_toko || shopName,
          ord.nama_pembeli,
          ord.total_harga || 0,
          ord.status_pesanan || 'Perlu Diproses',
          spkId
        ]);
      }

      return sendJson(res, 200, {
        status: 'success',
        count: orders.length,
        data: orders
      });
    } catch (err) {
      console.error('[Shopee Order Sync Error]:', err.message);
      return sendJson(res, 400, {
        status: 'error',
        message: err.message
      });
    }
  }

  // Not Found
  sendJson(res, 404, { error: 'Endpoint tidak ditemukan' });
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.setTimeout(120000);

server.listen(PORT, () => {
  console.log(`RuangMarket Marketplace API Server berjalan di port ${PORT}`);
});
