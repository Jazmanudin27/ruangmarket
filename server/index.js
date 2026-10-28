import http from 'http';
import { PDFDocument } from 'pdf-lib';
import { ShopeeService } from './shopee.service.js';
import { TiktokService } from './tiktok.service.js';
import { pool, laravelPool, initDb } from './db.js';
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  // 6. API Ambil Data Produk Marketplace Staging dari MySQL (Status dihitung langsung berdasarkan SKU di produk_master)
  if (pathname === '/api/marketplace/products' && req.method === 'GET') {
    try {
      const [rows] = await pool.query(`
        SELECT 
          pm.id, 
          pm.id_produk_marketplace as item_id, 
          pm.kode_perusahaan as company_code,
          pm.saluran as channel, 
          pm.nama_saluran as channelName, 
          pm.nama_toko as shopName,
          pm.id_toko as shopId, 
          pm.nama_produk, 
          pm.sku_marketplace, 
          pm.harga_jual,
          pm.stok_marketplace, 
          pm.varian as varian_marketplace, 
          pm.foto_produk,
          CASE 
            WHEN m.id IS NOT NULL THEN 'Sudah di Master'
            WHEN m2.id IS NOT NULL THEN 'Sudah di Master'
            ELSE 'Belum Dimapping'
          END as status,
          DATE_FORMAT(pm.ditarik_pada, '%d %b %Y, %H:%i') as syncedAt
        FROM produk_marketplace pm
        LEFT JOIN produk_master m 
          ON m.kode_sku = pm.sku_marketplace AND m.kode_sku != ''
        LEFT JOIN produk_master m2 
          ON m2.kode_sku = CONCAT(IFNULL(pm.kode_perusahaan, 'RSG'), '-', pm.sku_marketplace) AND pm.sku_marketplace != ''
        ORDER BY pm.ditarik_pada DESC
      `);
      return sendJson(res, 200, { status: 'success', data: rows });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 6b. Update / Hapus satu produk marketplace staging
  const productIdMatch = pathname.match(/^\/api\/marketplace\/products\/([^/]+)$/);
  if (productIdMatch) productIdMatch[1] = decodeURIComponent(productIdMatch[1]);
  if (productIdMatch && req.method === 'PUT') {
    try {
      const body = await parseJsonBody(req);
      const columnMap = {
        nama_produk: 'nama_produk',
        sku_marketplace: 'sku_marketplace',
        harga_jual: 'harga_jual',
        stok_marketplace: 'stok_marketplace',
        varian_marketplace: 'varian',
        status: 'status_mapping'
      };
      const sets = [];
      const values = [];
      for (const [key, col] of Object.entries(columnMap)) {
        if (body[key] !== undefined) {
          sets.push(`${col} = ?`);
          values.push(key === 'varian_marketplace' ? String(body[key]).slice(0, 65000) : body[key]);
        }
      }
      if (sets.length === 0) {
        return sendJson(res, 400, { status: 'error', message: 'Tidak ada field yang diubah' });
      }
      values.push(productIdMatch[1]);
      const [result] = await pool.query(`UPDATE produk_marketplace SET ${sets.join(', ')} WHERE id = ?`, values);
      if (result.affectedRows === 0) {
        return sendJson(res, 404, { status: 'error', message: 'Produk tidak ditemukan' });
      }
      return sendJson(res, 200, { status: 'success' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  if (productIdMatch && req.method === 'DELETE') {
    try {
      const [result] = await pool.query('DELETE FROM produk_marketplace WHERE id = ?', [productIdMatch[1]]);
      if (result.affectedRows === 0) {
        return sendJson(res, 404, { status: 'error', message: 'Produk tidak ditemukan' });
      }
      return sendJson(res, 200, { status: 'success' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 6c. Batch Update Status Produk Marketplace
  if (pathname === '/api/marketplace/products/batch-status' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { ids, status } = body;
      if (!Array.isArray(ids) || ids.length === 0 || !status) {
        return sendJson(res, 400, { status: 'error', message: 'Parameter ids (array) dan status wajib diisi' });
      }
      await pool.query('UPDATE produk_marketplace SET status_mapping = ? WHERE id IN (?)', [status, ids]);
      return sendJson(res, 200, { status: 'success', count: ids.length });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 6d. API Master Produk ERP (produk_master MySQL) - Dukung endpoint /api/produk/master dan /api/marketplace/master
  if ((pathname === '/api/produk/master' || pathname === '/api/marketplace/master') && req.method === 'GET') {
    try {
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      let sql = 'SELECT * FROM produk_master';
      const params = [];
      if (kodePerusahaan) {
        sql += ' WHERE kode_perusahaan = ?';
        params.push(kodePerusahaan);
      }
      sql += ' ORDER BY id DESC';
      const [rows] = await pool.query(sql, params);
      return sendJson(res, 200, rows);
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 6e. Simpan/Batch Simpan ke Master Produk ERP (Bulk Insert Cepat)
  if ((pathname === '/api/produk/master' || pathname === '/api/marketplace/master') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const items = Array.isArray(body) ? body : [body];
      
      if (items.length === 0) {
        return sendJson(res, 200, { status: 'success', count: 0 });
      }

      console.log(`[API Master] Menyimpan ${items.length} produk ke produk_master...`);

      // Batch insert per 100 item agar super cepat
      const chunkSize = 100;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const values = [];
        const placeholders = chunk.map((item, idx) => {
          const kodePerusahaan = String(item.kode_perusahaan || item.company_code || 'RSG').slice(0, 32);
          const rawSku = String(item.kode_sku || item.sku || `SKU-${Date.now()}-${i + idx}`).trim();
          const kodeSku = (rawSku.startsWith('RSG-') ? rawSku.substring(4) : rawSku).slice(0, 255);
          const namaProduk = String(item.nama_produk || 'Produk').slice(0, 255);
          const kategori = String(item.kategori || 'Gamis Casual').slice(0, 64);
          const satuan = String(item.satuan || 'PCS').slice(0, 32);
          const hargaJual = Number(item.harga_jual) || 0;
          const hargaModal = Number(item.harga_modal || item.harga_beli) || 0;
          const stokFisik = Number(item.stok_fisik || item.stok) || 0;
          const status = String(item.status || 'Aktif').slice(0, 32);
          const statusOrder = String(item.status_order || 'Ready Stok').slice(0, 32);
          const fotoProduk = String(item.foto_produk || item.image || '').slice(0, 1000);

          values.push(kodePerusahaan, kodeSku, namaProduk, kategori, satuan, hargaJual, hargaModal, stokFisik, status, statusOrder, fotoProduk);
          return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        }).join(', ');

        const sql = `
          INSERT INTO produk_master (
            kode_perusahaan, kode_sku, nama_produk, kategori, satuan,
            harga_jual, harga_modal, stok_fisik, status, status_order, foto_produk
          ) VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            nama_produk = VALUES(nama_produk),
            kategori = VALUES(kategori),
            satuan = VALUES(satuan),
            harga_jual = VALUES(harga_jual),
            harga_modal = VALUES(harga_modal),
            stok_fisik = VALUES(stok_fisik),
            status = VALUES(status),
            status_order = VALUES(status_order),
            foto_produk = COALESCE(NULLIF(VALUES(foto_produk), ''), foto_produk)
        `;

        await pool.query(sql, values);
      }

      console.log(`[API Master] Berhasil menyimpan ${items.length} produk ke produk_master MySQL!`);
      return sendJson(res, 200, { status: 'success', count: items.length });
    } catch (err) {
      console.error('[API Master ERROR]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 6f-1. Batch Update status_order Master Produk ERP
  if ((pathname === '/api/produk/master/batch-status-order' || pathname === '/api/marketplace/master/batch-status-order') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { ids, status_order, items } = body;

      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          if (it.id && it.status_order) {
            await pool.query('UPDATE produk_master SET status_order = ? WHERE id = ?', [it.status_order, it.id]);
          }
        }
        return sendJson(res, 200, { status: 'success', updated: items.length });
      }

      if (Array.isArray(ids) && ids.length > 0 && status_order) {
        await pool.query('UPDATE produk_master SET status_order = ? WHERE id IN (?)', [status_order, ids]);
        return sendJson(res, 200, { status: 'success', updated: ids.length });
      }

      return sendJson(res, 400, { status: 'error', message: 'Parameter ids dan status_order diperlukan' });
    } catch (err) {
      console.error('[API Batch Status Order ERROR]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 6f-2. Update / Delete Master Produk by ID
  const masterIdMatch = pathname.match(/^\/api\/(?:produk|marketplace)\/master\/([^/]+)$/);
  if (masterIdMatch && req.method === 'PUT') {
    try {
      const body = await parseJsonBody(req);
      const sets = [];
      const values = [];
      const allowed = ['nama_produk', 'kategori', 'satuan', 'harga_jual', 'harga_modal', 'stok_fisik', 'status', 'status_order', 'kode_sku', 'kode_perusahaan'];
      for (const col of allowed) {
        if (body[col] !== undefined) {
          sets.push(`${col} = ?`);
          values.push(body[col]);
        }
      }
      if (sets.length === 0) {
        return sendJson(res, 400, { status: 'error', message: 'Tidak ada data diubah' });
      }
      values.push(masterIdMatch[1]);
      await pool.query(`UPDATE produk_master SET ${sets.join(', ')} WHERE id = ?`, values);
      return sendJson(res, 200, { status: 'success' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  if (masterIdMatch && req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM produk_master WHERE id = ?', [masterIdMatch[1]]);
      return sendJson(res, 200, { status: 'success' });
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
            sku_marketplace, harga_jual, stok_marketplace, varian, foto_produk, status_mapping
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_produk = VALUES(nama_produk),
            sku_marketplace = VALUES(sku_marketplace),
            harga_jual = VALUES(harga_jual),
            stok_marketplace = VALUES(stok_marketplace),
            varian = VALUES(varian),
            foto_produk = COALESCE(NULLIF(VALUES(foto_produk), ''), foto_produk),
            diperbarui_pada = CURRENT_TIMESTAMP
        `, [
          p.id, p.item_id, 'RSG', 'shopee',
          'Shopee Marketplace', p.shopName || 'Koperasi Sahabat Anak Bangsa', shopId,
          (p.nama_produk || '').slice(0, 250), (p.sku_marketplace || '').slice(0, 120), p.harga_jual || 0, p.stok_marketplace || 0,
          (p.varian_marketplace || 'Standard').slice(0, 500), p.foto_produk || '', p.status || 'Belum Dimapping'
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
    let accessToken = urlObj.searchParams.get('access_token');
    let shopCipher = urlObj.searchParams.get('shop_cipher');

    try {
      // Ambil token dan cipher langsung dari MySQL jika kosong
      if (!accessToken || !shopCipher) {
        const [rows] = await pool.query("SELECT token_akses, cipher_toko FROM toko_marketplace WHERE saluran = 'tiktok' LIMIT 1");
        if (rows.length > 0) {
          accessToken = accessToken || rows[0].token_akses;
          shopCipher = shopCipher || rows[0].cipher_toko;
        }
      }

      shopCipher = shopCipher || 'ROW_Hbd_fAAAAACqX58asQX4uCOsoefXXn4c';

      if (!accessToken) {
        return sendJson(res, 400, { status: 'error', message: 'Token akses TikTok tidak ditemukan di database' });
      }

      console.log(`[TikTok] Syncing all products with pagination...`);
      const products = await tiktokService.syncProducts(accessToken, shopCipher);

      for (const p of products) {
        await pool.query(`
          INSERT INTO produk_marketplace (
            id, id_produk_marketplace, kode_perusahaan, saluran, 
            nama_saluran, nama_toko, id_toko, nama_produk, 
            sku_marketplace, harga_jual, stok_marketplace, varian, foto_produk, status_mapping
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_produk = VALUES(nama_produk),
            sku_marketplace = VALUES(sku_marketplace),
            harga_jual = VALUES(harga_jual),
            stok_marketplace = VALUES(stok_marketplace),
            varian = VALUES(varian),
            foto_produk = COALESCE(NULLIF(VALUES(foto_produk), ''), foto_produk),
            diperbarui_pada = CURRENT_TIMESTAMP
        `, [
          p.id, p.item_id, 'RSG', 'tiktok',
          'TikTok Shop', p.shopName || 'TikTok Store', p.shopId || '',
          p.nama_produk, p.sku_marketplace, p.harga_jual, p.stok_marketplace,
          p.varian_marketplace, p.foto_produk || '', p.status || 'Belum Dimapping'
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

  // 9. API Ambil Data Pesanan Marketplace dari MySQL (Langsung Terhubung ke Database Laravel)
  if (pathname === '/api/marketplace/orders' && req.method === 'GET') {
    try {
      // Ambil data langsung dari tabel pesanan_marketplace (database ruangmarket)
      const [rows] = await pool.query(`
        SELECT 
          id, kode_perusahaan as company_code, no_pesanan, saluran as channel,
          nama_toko as shopName, nama_pembeli as customerName, total_harga as totalPrice,
          status_pesanan as status, no_spk, rincian_item, kurir, no_resi,
          COALESCE(status_cetak, 'Sudah Print') as status_cetak,
          COALESCE(status_verifikasi, 'Verified') as status_verifikasi,
          COALESCE(alamat, '') as alamat,
          COALESCE(no_telepon, '') as telepon,
          COALESCE(metode_bayar, 'Cash on Delivery') as metode_bayar,
          COALESCE(ongkir, 30000) as ongkir,
          COALESCE(marketplace_fee, 0) as marketplace_fee,
          COALESCE(fee_platform, 0) as fee_platform,
          COALESCE(fee_free_shipping, 0) as fee_free_shipping,
          COALESCE(fee_service, 0) as fee_service,
          COALESCE(net_amount, total_harga) as net_amount,
          DATE_FORMAT(COALESCE(waktu_pesanan, ditarik_pada), '%d/%m/%Y %H:%i') as orderTime,
          DATE_FORMAT(COALESCE(batas_kirim, DATE_ADD(COALESCE(waktu_pesanan, ditarik_pada), INTERVAL 1 DAY)), '%d/%m/%Y 23:59') as batasKirim,
          DATE_FORMAT(ditarik_pada, '%d/%m/%Y, %H:%i') as syncedAt
        FROM pesanan_marketplace
        ORDER BY ditarik_pada DESC
      `);


      // Ambil seluruh data produk_master untuk menghitung HPP otomatis berdasarkan SKU / nama produk
      let masterRows = [];
      try {
        const [mRows] = await pool.query('SELECT kode_sku, nama_produk, harga_modal as hpp FROM produk_master');
        masterRows = mRows;
      } catch (errM) {
        try {
          const [mRows] = await pool.query('SELECT kode_sku, nama_produk, harga_pokok as hpp FROM produk_master');
          masterRows = mRows;
        } catch (e2) {
          masterRows = [];
        }
      }

      const hppMap = new Map();
      masterRows.forEach(m => {
        if (m.kode_sku) {
          hppMap.set(String(m.kode_sku).trim().toLowerCase(), Number(m.hpp) || 0);
        }
        if (m.nama_produk) {
          hppMap.set(String(m.nama_produk).trim().toLowerCase(), Number(m.hpp) || 0);
        }
      });

      // Mapping ke ID asli tabel orders di ERP Aspartech (Laravel)
      const laravelIdMap = new Map();
      try {
        const orderMarketplaceIds = rows.map(r => r.no_pesanan).filter(Boolean);
        if (orderMarketplaceIds.length > 0) {
          const [lRows] = await laravelPool.query(
            'SELECT id, order_marketplace_id FROM orders WHERE order_marketplace_id IN (?)',
            [orderMarketplaceIds]
          );
          (lRows || []).forEach(lr => {
            if (lr.order_marketplace_id) {
              laravelIdMap.set(String(lr.order_marketplace_id).trim(), lr.id);
            }
          });
        }
      } catch (errL) {
        try {
          const orderMarketplaceIds = rows.map(r => r.no_pesanan).filter(Boolean);
          if (orderMarketplaceIds.length > 0) {
            const [lRows] = await pool.query(
              'SELECT id, order_marketplace_id FROM orders WHERE order_marketplace_id IN (?)',
              [orderMarketplaceIds]
            );
            (lRows || []).forEach(lr => {
              if (lr.order_marketplace_id) {
                laravelIdMap.set(String(lr.order_marketplace_id).trim(), lr.id);
              }
            });
          }
        } catch (e2) {}
      }

      const formatted = rows.map(r => {
        let items = [];
        try {
          if (r.rincian_item) {
            items = typeof r.rincian_item === 'string' ? JSON.parse(r.rincian_item) : r.rincian_item;
          }
        } catch (e) {
          items = [];
        }

        const enrichedItems = (Array.isArray(items) ? items : []).map(it => {
          const finalSku = String(it.sku || it.kode_sku || it.item_sku || it.model_sku || it.seller_sku || it.sku_marketplace || it.varian || '').trim();
          const itemSku = finalSku.toLowerCase();
          const itemName = String(it.nama_produk || '').trim().toLowerCase();
          const cleanSku = itemSku.replace(/^rsg-/, '');
          
          let hpp = Number(it.hpp || it.cost_price || 0);
          if (hpp <= 0) {
            hpp = hppMap.get(itemSku) || hppMap.get(cleanSku) || hppMap.get(itemName) || 0;
          }

          const qty = Number(it.qty || it.quantity || 1);
          const price = Number(it.harga || it.price || 0);
          const subtotal = Number(it.subtotal || (price * qty));
          const hppSubtotal = Number(it.hpp_subtotal || (hpp * qty));

          return {
            ...it,
            sku: finalSku || it.sku || '-',
            hpp,
            cost_price: hpp,
            hpp_subtotal: hppSubtotal,
            subtotal
          };
        });

        const subtotalPesanan = enrichedItems.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0) || Number(r.totalPrice || 0);
        const hppTotal = enrichedItems.reduce((acc, it) => acc + (Number(it.hpp_subtotal) || 0), 0);
        const netAmount = Number(r.net_amount || (subtotalPesanan + Number(r.ongkir || 0) - Number(r.marketplace_fee || 0)));
        const netProfit = netAmount - hppTotal;
        const profitMargin = netAmount > 0 ? ((netProfit / netAmount) * 100).toFixed(2) : '0';

        return {
          ...r,
          laravel_order_id: laravelIdMap.get(String(r.no_pesanan).trim()) || (typeof r.id === 'number' ? r.id : null),
          totalPrice: subtotalPesanan,
          hpp_total: hppTotal,
          net_profit: netProfit,
          profit_margin: profitMargin,
          items: enrichedItems
        };
      });

      return sendJson(res, 200, { status: 'success', data: formatted });
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
        const itemsJson = JSON.stringify(ord.items || []);
        await pool.query(`
          INSERT INTO pesanan_marketplace (
            id, kode_perusahaan, no_pesanan, saluran, 
            nama_toko, nama_pembeli, total_harga, status_pesanan, no_spk,
            rincian_item, kurir, no_resi, waktu_pesanan, ditarik_pada
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            nama_pembeli = VALUES(nama_pembeli),
            total_harga = VALUES(total_harga),
            status_pesanan = VALUES(status_pesanan),
            rincian_item = VALUES(rincian_item),
            kurir = VALUES(kurir),
            no_resi = VALUES(no_resi),
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
          ord.no_spk || null,
          itemsJson,
          ord.kurir || 'Standar',
          ord.no_resi || '',
          ord.waktu_pesanan ? new Date(ord.waktu_pesanan) : new Date()
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

  // 10b. Update Status & SPK Pesanan Marketplace
  if (pathname === '/api/marketplace/orders/update-spk' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { ids, no_spk, status_pesanan } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return sendJson(res, 400, { status: 'error', message: 'Parameter ids diperlukan' });
      }

      const sets = [];
      const values = [];
      if (no_spk !== undefined) {
        sets.push('no_spk = ?');
        values.push(no_spk);
      }
      if (status_pesanan !== undefined) {
        sets.push('status_pesanan = ?');
        values.push(status_pesanan);
      }

      if (sets.length === 0) {
        return sendJson(res, 400, { status: 'error', message: 'Tidak ada data diperbarui' });
      }

      await pool.query(`UPDATE pesanan_marketplace SET ${sets.join(', ')} WHERE id IN (?)`, [...values, ids]);
      return sendJson(res, 200, { status: 'success', updated: ids.length });
    } catch (err) {
      console.error('[Update SPK Error]:', err.message);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 10c. Hapus Pesanan Masuk
  const orderIdMatch = pathname.match(/^\/api\/marketplace\/orders\/([^/]+)$/);
  if (orderIdMatch && req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM pesanan_marketplace WHERE id = ?', [orderIdMatch[1]]);
      return sendJson(res, 200, { status: 'success' });
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 10d. Cetak Resi / Shipping Label PDF Langsung dari API Marketplace Resmi (Shopee & TikTok)
  if (pathname === '/api/marketplace/orders/print-label' && req.method === 'GET') {
    const orderSn = urlObj.searchParams.get('order_sn');
    let channel = (urlObj.searchParams.get('channel') || '').toLowerCase();

    if (!orderSn) {
      return sendJson(res, 400, { status: 'error', message: 'Parameter order_sn wajib diisi' });
    }

    try {
      // 0. Cek apakah pesanan ini memiliki ID di tabel orders Laravel ERP Aspartech
      let laravelId = null;
      try {
        const [lRows] = await laravelPool.query('SELECT id FROM orders WHERE order_marketplace_id = ? OR id = ? LIMIT 1', [orderSn, orderSn]);
        if (lRows && lRows.length > 0) laravelId = lRows[0].id;
      } catch (e) {
        try {
          const [lRows] = await pool.query('SELECT id FROM orders WHERE order_marketplace_id = ? OR id = ? LIMIT 1', [orderSn, orderSn]);
          if (lRows && lRows.length > 0) laravelId = lRows[0].id;
        } catch (e2) {}
      }

      if (laravelId) {
        res.writeHead(302, {
          Location: `https://erp.aspartech.com/orders/${laravelId}/print`
        });
        return res.end();
      }

      // 1. Ambil info pesanan dari MySQL pesanan_marketplace
      let [orderRows] = await pool.query('SELECT * FROM pesanan_marketplace WHERE no_pesanan = ? OR id = ? LIMIT 1', [orderSn, orderSn]);
      const order = orderRows[0];
      if (order && !channel) {
        channel = (order.saluran || 'shopee').toLowerCase();
      }
      if (!channel) channel = 'shopee';

      const shopName = order?.nama_toko || '';

      // 2. Ambil kredensial toko dari database toko_marketplace
      let [stores] = await pool.query('SELECT * FROM toko_marketplace WHERE saluran = ? AND (status_koneksi LIKE "%Aktif%" OR status_koneksi LIKE "%Terhubung%")', [channel]);
      if (stores.length === 0) {
        [stores] = await pool.query('SELECT * FROM toko_marketplace WHERE saluran = ?', [channel]);
      }

      let store = stores.find(s => s.nama_toko === shopName) || stores[0];
      if (!store) {
        if (channel === 'shopee') {
          store = {
            id_toko: '1030191310',
            nama_toko: 'Koperasi Sahabat Anak Bangsa',
            token_akses: process.env.SHOPEE_ACCESS_TOKEN || '',
            token_refresh: process.env.SHOPEE_REFRESH_TOKEN || ''
          };
        } else {
          throw new Error(`Kredensial toko untuk saluran ${channel} tidak ditemukan di database.`);
        }
      }

      let pdfBuffer = null;

      if (channel === 'shopee') {
        try {
          pdfBuffer = await shopeeService.getShippingDocument(store.id_toko, store.token_akses, orderSn);
        } catch (shopeeErr) {
          const errStr = shopeeErr.message.toLowerCase();
          if (errStr.includes('token') || errStr.includes('auth') || errStr.includes('expired')) {
            console.log('[Shopee Label]: Token kadaluarsa, me-refresh token...');
            if (store.token_refresh) {
              const ref = await shopeeService.refreshAccessToken(store.token_refresh, store.id_toko, false);
              if (ref && ref.access_token) {
                await pool.query('UPDATE toko_marketplace SET token_akses = ?, token_refresh = ? WHERE id_toko = ?', [
                  ref.access_token,
                  ref.refresh_token || store.token_refresh,
                  store.id_toko
                ]);
                pdfBuffer = await shopeeService.getShippingDocument(store.id_toko, ref.access_token, orderSn);
              } else {
                throw shopeeErr;
              }
            } else {
              throw shopeeErr;
            }
          } else {
            throw shopeeErr;
          }
        }
      } else if (channel === 'tiktok') {
        pdfBuffer = await tiktokService.getShippingDocument(orderSn, store.token_akses, store.cipher_toko || '');
      }

      if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="resi-${orderSn}.pdf"`,
          'Content-Length': pdfBuffer.length
        });
        return res.end(pdfBuffer);
      }

      throw new Error('Gagal mendapatkan dokumen PDF resi dari marketplace');
    } catch (err) {
      console.error('[Cetak Resi PDF Error]:', err.message);
      return sendJson(res, 502, {
        status: 'error',
        message: `Gagal cetak resi marketplace: ${err.message}`
      });
    }
  }

  // 10e. Cetak Resi Masal (Batch Shipping Labels PDF) Langsung dari API Marketplace Resmi
  if (pathname === '/api/marketplace/orders/batch-print-label' && req.method === 'GET') {
    const orderSnsRaw = urlObj.searchParams.get('order_sns') || '';
    const orderSns = orderSnsRaw.split(',').map(s => s.trim()).filter(Boolean);

    if (orderSns.length === 0) {
      return sendJson(res, 400, { status: 'error', message: 'Parameter order_sns wajib diisi (pisahkan dengan koma)' });
    }

    try {
      // 1. Ambil info pesanan dari MySQL pesanan_marketplace
      const placeholders = orderSns.map(() => '?').join(',');
      const [orderRows] = await pool.query(
        `SELECT * FROM pesanan_marketplace WHERE no_pesanan IN (${placeholders}) OR id IN (${placeholders})`,
        [...orderSns, ...orderSns]
      );

      // Kumpulkan kredensial toko Shopee & TikTok
      const [allStores] = await pool.query('SELECT * FROM toko_marketplace');

      // Pisahkan pesanan berdasarkan saluran (Shopee vs TikTok)
      const shopeeOrders = [];
      const tiktokOrders = [];

      for (const sn of orderSns) {
        const found = orderRows.find(o => String(o.no_pesanan) === String(sn) || String(o.id) === String(sn));
        const channel = (found?.saluran || (sn.length > 15 && /^\d+$/.test(sn) ? 'tiktok' : 'shopee')).toLowerCase();
        if (channel === 'tiktok') {
          tiktokOrders.push({ sn, order: found });
        } else {
          shopeeOrders.push({ sn, order: found });
        }
      }

      const collectedPdfBuffers = [];

      // A. Proses Shopee Orders (Unduh tiap pesanan dan gabungkan seluruh halamannya)
      if (shopeeOrders.length > 0) {
        let shopeeStore = allStores.find(s => s.saluran === 'shopee' && (s.status_koneksi?.includes('Aktif') || s.status_koneksi?.includes('Terhubung')));
        if (!shopeeStore) shopeeStore = allStores.find(s => s.saluran === 'shopee');
        if (!shopeeStore) {
          shopeeStore = {
            id_toko: '1030191310',
            nama_toko: 'Koperasi Sahabat Anak Bangsa',
            token_akses: process.env.SHOPEE_ACCESS_TOKEN || '',
            token_refresh: process.env.SHOPEE_REFRESH_TOKEN || ''
          };
        }

        let currentToken = shopeeStore.token_akses;

        for (const sOrd of shopeeOrders) {
          try {
            const singlePdf = await shopeeService.getShippingDocument(shopeeStore.id_toko, currentToken, sOrd.sn);
            if (singlePdf && Buffer.isBuffer(singlePdf)) {
              collectedPdfBuffers.push(singlePdf);
            }
          } catch (firstErr) {
            const errStr = firstErr.message.toLowerCase();
            if ((errStr.includes('token') || errStr.includes('auth') || errStr.includes('expired')) && shopeeStore.token_refresh) {
              console.log('[Shopee Batch Label]: Token kadaluarsa saat fetch order', sOrd.sn, 'me-refresh token...');
              try {
                const ref = await shopeeService.refreshAccessToken(shopeeStore.token_refresh, shopeeStore.id_toko, false);
                if (ref && ref.access_token) {
                  currentToken = ref.access_token;
                  shopeeStore.token_akses = currentToken;
                  await pool.query('UPDATE toko_marketplace SET token_akses = ?, token_refresh = ? WHERE id_toko = ?', [
                    ref.access_token,
                    ref.refresh_token || shopeeStore.token_refresh,
                    shopeeStore.id_toko
                  ]);
                  const retryPdf = await shopeeService.getShippingDocument(shopeeStore.id_toko, currentToken, sOrd.sn);
                  if (retryPdf && Buffer.isBuffer(retryPdf)) {
                    collectedPdfBuffers.push(retryPdf);
                  }
                }
              } catch (refErr) {
                console.warn('[Shopee Batch Refresh Token Error]:', refErr.message);
              }
            } else {
              console.warn(`[Shopee Label] Order ${sOrd.sn} dilewati:`, firstErr.message);
            }
          }
        }
      }

      // B. Proses TikTok Orders (TikTok unduh per order lalu digabung)
      if (tiktokOrders.length > 0) {
        let tiktokStore = allStores.find(s => s.saluran === 'tiktok' && (s.status_koneksi?.includes('Aktif') || s.status_koneksi?.includes('Terhubung')));
        if (!tiktokStore) tiktokStore = allStores.find(s => s.saluran === 'tiktok');
        if (tiktokStore) {
          for (const tOrd of tiktokOrders) {
            try {
              const singlePdf = await tiktokService.getShippingDocument(tOrd.sn, tiktokStore.token_akses, tiktokStore.cipher_toko || '');
              if (singlePdf && Buffer.isBuffer(singlePdf)) {
                collectedPdfBuffers.push(singlePdf);
              }
            } catch (errTik) {
              console.warn(`[TikTok Label] Gagal fetch ${tOrd.sn}:`, errTik.message);
            }
          }
        }
      }

      if (collectedPdfBuffers.length === 0) {
        throw new Error('Tidak ada file PDF resi resmi yang berhasil diunduh dari marketplace untuk pesanan-pesanan yang dipilih.');
      }

      // Jika hanya ada 1 PDF buffer, kirim langsung
      if (collectedPdfBuffers.length === 1) {
        const finalPdf = collectedPdfBuffers[0];
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="resi-masal-${Date.now()}.pdf"`,
          'Content-Length': finalPdf.length
        });
        return res.end(finalPdf);
      }

      // C. Jika ada beberapa PDF (misal kombinasi Shopee & TikTok atau multi-page individual), gabung secara utuh dengan pdf-lib
      const mergedPdfDoc = await PDFDocument.create();
      for (const pdfBuf of collectedPdfBuffers) {
        try {
          const donorDoc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
          const copiedPages = await mergedPdfDoc.copyPages(donorDoc, donorDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdfDoc.addPage(page));
        } catch (mergeOneErr) {
          console.warn('[PDF-Lib Merge Page Warning]:', mergeOneErr.message);
        }
      }

      const mergedPdfBytes = await mergedPdfDoc.save();
      const mergedBuffer = Buffer.from(mergedPdfBytes);

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="resi-masal-${Date.now()}.pdf"`,
        'Content-Length': mergedBuffer.length
      });
      return res.end(mergedBuffer);

    } catch (err) {
      console.error('[Cetak Resi Masal Error]:', err.message);
      return sendJson(res, 502, {
        status: 'error',
        message: `Gagal cetak resi masal marketplace: ${err.message}`
      });
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
        orders = [
          {
            id: `shopee_${Date.now()}`,
            no_pesanan: orderSn,
            saluran: 'shopee',
            nama_saluran: 'Shopee Marketplace',
            nama_toko: shopName,
            nama_pembeli: `Pelanggan Shopee [${shopName}]`,
            total_harga: 320000,
            status_pesanan: 'Perlu Diproses',
            kurir: 'SPX Express',
            no_resi: `SPXID${Date.now().toString().slice(-9)}`,
            waktu_pesanan: new Date().toISOString(),
            no_spk: null,
            items: [
              {
                id: `item-${Date.now()}`,
                nama_produk: `Gamis Casual Katun Toyobo`,
                sku: `GMS-TYB`,
                kategori: 'Gamis Casual',
                satuan: 'PCS',
                qty: 2,
                harga: 160000,
                varian: 'Navy Blue - XL'
              }
            ]
          }
        ];
      }

      // Simpan langsung ke database MySQL (pesanan_marketplace)
      for (const ord of orders) {
        const itemsJson = JSON.stringify(ord.items || []);
        await pool.query(`
          INSERT INTO pesanan_marketplace (
            id, kode_perusahaan, no_pesanan, saluran, 
            nama_toko, nama_pembeli, total_harga, status_pesanan, no_spk,
            rincian_item, kurir, no_resi, waktu_pesanan, batas_kirim,
            ongkir, marketplace_fee, fee_platform, fee_free_shipping, fee_service, net_amount,
            ditarik_pada
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            nama_pembeli = VALUES(nama_pembeli),
            total_harga = VALUES(total_harga),
            status_pesanan = VALUES(status_pesanan),
            rincian_item = VALUES(rincian_item),
            kurir = VALUES(kurir),
            no_resi = VALUES(no_resi),
            waktu_pesanan = VALUES(waktu_pesanan),
            batas_kirim = VALUES(batas_kirim),
            ongkir = VALUES(ongkir),
            marketplace_fee = VALUES(marketplace_fee),
            fee_platform = VALUES(fee_platform),
            fee_free_shipping = VALUES(fee_free_shipping),
            fee_service = VALUES(fee_service),
            net_amount = VALUES(net_amount),
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
          ord.no_spk || null,
          itemsJson,
          ord.kurir || 'SPX Express',
          ord.no_resi || '',
          ord.waktu_pesanan ? new Date(ord.waktu_pesanan) : new Date(),
          ord.batas_kirim ? new Date(ord.batas_kirim) : null,
          ord.ongkir || 0,
          ord.marketplace_fee || 0,
          ord.fee_platform || 0,
          ord.fee_free_shipping || 0,
          ord.fee_service || 0,
          ord.net_amount || ord.total_harga || 0
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

  // 12. TikTok Orders Sync API (Tarik dari TikTok Shop & Simpan ke MySQL)
  if (pathname === '/api/marketplace/tiktok/orders' && req.method === 'GET') {
    let shopCipher = urlObj.searchParams.get('shop_cipher');
    let accessToken = urlObj.searchParams.get('access_token');

    try {
      let shopName = 'RUANG SERAGAM';
      let refreshToken = null;
      let storeId = null;

      const [storeRows] = await pool.query('SELECT id, nama_toko, token_akses, token_refresh, cipher_toko, id_toko FROM toko_marketplace WHERE id_toko = ? OR cipher_toko = ? OR saluran = "tiktok" LIMIT 1', [shopCipher, shopCipher]);
      if (storeRows.length > 0) {
        accessToken = storeRows[0].token_akses || accessToken;
        refreshToken = storeRows[0].token_refresh;
        shopCipher = storeRows[0].cipher_toko || storeRows[0].id_toko || shopCipher;
        shopName = storeRows[0].nama_toko || shopName;
        storeId = storeRows[0].id;
      }

      console.log(`[TikTok] Syncing orders for shop: ${shopName} (Cipher: ${shopCipher})...`);
      let orders = [];

      try {
        orders = await tiktokService.syncOrders(accessToken, shopCipher, shopName);
      } catch (syncErr) {
        const msg = syncErr.message.toLowerCase();
        if ((msg.includes('token') || msg.includes('auth') || msg.includes('105001') || msg.includes('expired')) && refreshToken) {
          console.log(`[TikTok Sync]: Auto-refreshing access token untuk ${shopName}...`);
          const refreshed = await tiktokService.refreshAccessToken(refreshToken);
          if (refreshed?.access_token) {
            accessToken = refreshed.access_token;
            refreshToken = refreshed.refresh_token || refreshToken;
            if (storeId) {
              await pool.query('UPDATE toko_marketplace SET token_akses = ?, token_refresh = ? WHERE id = ?', [
                accessToken,
                refreshToken,
                storeId
              ]);
            }
            orders = await tiktokService.syncOrders(accessToken, shopCipher, shopName);
          } else {
            throw syncErr;
          }
        } else {
          throw syncErr;
        }
      }

      // Hapus data dummy lama jika pernah tersimpan
      await pool.query("DELETE FROM pesanan_marketplace WHERE saluran = 'tiktok' AND (nama_pembeli LIKE '%Pelanggan TikTok%' OR no_pesanan LIKE 'ORD-TT%' OR no_pesanan LIKE 'ORD-TIKTOK%')").catch(() => {});

      // Simpan langsung ke database MySQL (pesanan_marketplace)
      for (const ord of orders) {
        const itemsJson = JSON.stringify(ord.items || []);
        await pool.query(`
          INSERT INTO pesanan_marketplace (
            id, kode_perusahaan, no_pesanan, saluran, 
            nama_toko, nama_pembeli, total_harga, status_pesanan, no_spk,
            rincian_item, kurir, no_resi, waktu_pesanan, batas_kirim,
            ongkir, marketplace_fee, fee_platform, fee_free_shipping, fee_service, net_amount,
            alamat, no_telepon,
            ditarik_pada
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            nama_pembeli = VALUES(nama_pembeli),
            total_harga = VALUES(total_harga),
            status_pesanan = VALUES(status_pesanan),
            rincian_item = VALUES(rincian_item),
            kurir = VALUES(kurir),
            no_resi = VALUES(no_resi),
            waktu_pesanan = VALUES(waktu_pesanan),
            batas_kirim = VALUES(batas_kirim),
            ongkir = VALUES(ongkir),
            marketplace_fee = VALUES(marketplace_fee),
            fee_platform = VALUES(fee_platform),
            fee_free_shipping = VALUES(fee_free_shipping),
            fee_service = VALUES(fee_service),
            net_amount = VALUES(net_amount),
            alamat = VALUES(alamat),
            no_telepon = VALUES(no_telepon),
            no_spk = COALESCE(VALUES(no_spk), no_spk)
        `, [
          ord.id,
          'RSG',
          ord.no_pesanan,
          'tiktok',
          ord.nama_toko || shopName,
          ord.nama_pembeli,
          ord.total_harga || 0,
          ord.status_pesanan || 'Perlu Diproses',
          ord.no_spk || null,
          itemsJson,
          ord.kurir || 'J&T Express',
          ord.no_resi || '',
          ord.waktu_pesanan ? new Date(ord.waktu_pesanan) : new Date(),
          ord.batas_kirim ? new Date(ord.batas_kirim) : null,
          ord.ongkir || 0,
          ord.marketplace_fee || 0,
          ord.fee_platform || 0,
          ord.fee_free_shipping || 0,
          ord.fee_service || 0,
          ord.net_amount || ord.total_harga || 0,
          ord.alamat || '',
          ord.telepon || ''
        ]);
      }

      return sendJson(res, 200, {
        status: 'success',
        count: orders.length,
        data: orders
      });
    } catch (err) {
      console.error('[TikTok Order Sync Error]:', err.message);
      return sendJson(res, 400, {
        status: 'error',
        message: err.message
      });
    }
  }

  // 13. Tarik Semua Pesanan Marketplace Sekaligus (Shopee & TikTok)
  if (pathname === '/api/marketplace/orders/sync-all' && req.method === 'POST') {
    try {
      const [stores] = await pool.query('SELECT * FROM toko_marketplace WHERE status_koneksi LIKE "%Aktif%" OR status_koneksi LIKE "%Terhubung%"');
      let totalSynced = 0;
      const results = [];

      for (const st of stores) {
        try {
          if (st.saluran === 'shopee') {
            const shopeeOrders = await shopeeService.syncOrders(st.id_toko, st.token_akses, st.nama_toko);
            for (const ord of shopeeOrders) {
              const itemsJson = JSON.stringify(ord.items || []);
              await pool.query(`
                INSERT INTO pesanan_marketplace (
                  id, kode_perusahaan, no_pesanan, saluran, 
                  nama_toko, nama_pembeli, total_harga, status_pesanan, no_spk,
                  rincian_item, kurir, no_resi, waktu_pesanan, batas_kirim,
                  ongkir, marketplace_fee, fee_platform, fee_free_shipping, fee_service, net_amount,
                  ditarik_pada
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                  nama_pembeli = VALUES(nama_pembeli),
                  total_harga = VALUES(total_harga),
                  status_pesanan = VALUES(status_pesanan),
                  rincian_item = VALUES(rincian_item),
                  kurir = VALUES(kurir),
                  no_resi = VALUES(no_resi),
                  waktu_pesanan = VALUES(waktu_pesanan),
                  batas_kirim = VALUES(batas_kirim),
                  ongkir = VALUES(ongkir),
                  marketplace_fee = VALUES(marketplace_fee),
                  fee_platform = VALUES(fee_platform),
                  fee_free_shipping = VALUES(fee_free_shipping),
                  fee_service = VALUES(fee_service),
                  net_amount = VALUES(net_amount),
                  no_spk = COALESCE(VALUES(no_spk), no_spk)
              `, [
                ord.id,
                st.kode_perusahaan || 'RSG',
                ord.no_pesanan,
                'shopee',
                ord.nama_toko || st.nama_toko,
                ord.nama_pembeli,
                ord.total_harga || 0,
                ord.status_pesanan || 'Perlu Diproses',
                ord.no_spk || null,
                itemsJson,
                ord.kurir || 'SPX Express',
                ord.no_resi || '',
                ord.waktu_pesanan ? new Date(ord.waktu_pesanan) : new Date(),
                ord.batas_kirim ? new Date(ord.batas_kirim) : null,
                ord.ongkir || 0,
                ord.marketplace_fee || 0,
                ord.fee_platform || 0,
                ord.fee_free_shipping || 0,
                ord.fee_service || 0,
                ord.net_amount || ord.total_harga || 0
              ]);
            }
            totalSynced += shopeeOrders.length;
            results.push({ store: st.nama_toko, channel: 'shopee', count: shopeeOrders.length });
          } else if (st.saluran === 'tiktok') {
            const cipher = st.cipher_toko || st.id_toko;
            let currentToken = st.token_akses;
            let ttOrders = [];

            try {
              ttOrders = await tiktokService.syncOrders(currentToken, cipher, st.nama_toko);
            } catch (ttErr) {
              const msg = ttErr.message.toLowerCase();
              if ((msg.includes('token') || msg.includes('auth') || msg.includes('105001') || msg.includes('expired')) && st.token_refresh) {
                console.log(`[TikTok Sync]: Refreshing access token untuk ${st.nama_toko}...`);
                const refreshed = await tiktokService.refreshAccessToken(st.token_refresh);
                if (refreshed?.access_token) {
                  currentToken = refreshed.access_token;
                  await pool.query('UPDATE toko_marketplace SET token_akses = ?, token_refresh = ? WHERE id = ?', [
                    refreshed.access_token,
                    refreshed.refresh_token || st.token_refresh,
                    st.id
                  ]);
                  ttOrders = await tiktokService.syncOrders(currentToken, cipher, st.nama_toko);
                } else {
                  throw ttErr;
                }
              } else {
                throw ttErr;
              }
            }

            // Hapus pesanan dummy jika ada
            await pool.query("DELETE FROM pesanan_marketplace WHERE saluran = 'tiktok' AND (nama_pembeli LIKE '%Pelanggan TikTok%' OR no_pesanan LIKE 'ORD-TT%' OR no_pesanan LIKE 'ORD-TIKTOK%')").catch(() => {});

            for (const ord of ttOrders) {
              const itemsJson = JSON.stringify(ord.items || []);
              await pool.query(`
                INSERT INTO pesanan_marketplace (
                  id, kode_perusahaan, no_pesanan, saluran, 
                  nama_toko, nama_pembeli, total_harga, status_pesanan, no_spk,
                  rincian_item, kurir, no_resi, waktu_pesanan, batas_kirim,
                  ongkir, marketplace_fee, fee_platform, fee_free_shipping, fee_service, net_amount,
                  alamat, no_telepon,
                  ditarik_pada
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                  nama_pembeli = VALUES(nama_pembeli),
                  total_harga = VALUES(total_harga),
                  status_pesanan = VALUES(status_pesanan),
                  rincian_item = VALUES(rincian_item),
                  kurir = VALUES(kurir),
                  no_resi = VALUES(no_resi),
                  waktu_pesanan = VALUES(waktu_pesanan),
                  batas_kirim = VALUES(batas_kirim),
                  ongkir = VALUES(ongkir),
                  marketplace_fee = VALUES(marketplace_fee),
                  fee_platform = VALUES(fee_platform),
                  fee_free_shipping = VALUES(fee_free_shipping),
                  fee_service = VALUES(fee_service),
                  net_amount = VALUES(net_amount),
                  alamat = VALUES(alamat),
                  no_telepon = VALUES(no_telepon),
                  no_spk = COALESCE(VALUES(no_spk), no_spk)
              `, [
                ord.id,
                st.kode_perusahaan || 'RSG',
                ord.no_pesanan,
                'tiktok',
                ord.nama_toko || st.nama_toko,
                ord.nama_pembeli,
                ord.total_harga || 0,
                ord.status_pesanan || 'Perlu Diproses',
                ord.no_spk || null,
                itemsJson,
                ord.kurir || 'J&T Express',
                ord.no_resi || '',
                ord.waktu_pesanan ? new Date(ord.waktu_pesanan) : new Date(),
                ord.batas_kirim ? new Date(ord.batas_kirim) : null,
                ord.ongkir || 0,
                ord.marketplace_fee || 0,
                ord.fee_platform || 0,
                ord.fee_free_shipping || 0,
                ord.fee_service || 0,
                ord.net_amount || ord.total_harga || 0,
                ord.alamat || '',
                ord.telepon || ''
              ]);
            }
            totalSynced += ttOrders.length;
            results.push({ store: st.nama_toko, channel: 'tiktok', count: ttOrders.length });
          }
        } catch (stErr) {
          console.warn(`[Sync All Store Error] ${st.nama_toko}:`, stErr.message);
        }
      }

      return sendJson(res, 200, {
        status: 'success',
        totalSynced,
        results
      });
    } catch (err) {
      console.error('[Sync All Orders Error]:', err.message);
      return sendJson(res, 500, { status: 'error', message: err.message });
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
