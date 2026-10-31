import http from 'http';
import { ShopeeService } from './services/shopee.service.js';
import { TiktokService } from './services/tiktok.service.js';
import { pool, laravelPool, initDb } from './config/db.js';
import { sendJson } from './utils/response.js';

import { handleAuthRoutes } from './routes/auth.routes.js';
import { handleStoresRoutes } from './routes/stores.routes.js';
import { handleProductsRoutes } from './routes/products.routes.js';
import { handleMasterRoutes } from './routes/master.routes.js';
import { handleOrdersRoutes } from './routes/orders.routes.js';
import { handleReturnsRoutes } from './routes/returns.routes.js';
import { handleWebhookRoutes } from './routes/webhook.routes.js';
import { handleSPKRoutes } from './routes/spk.routes.js';
import { handleCustomerRoutes } from './routes/customer.routes.js';
import { handleTahapanSPKRoutes } from './routes/tahapan-spk.routes.js';
import { handleHPPProdukRoutes } from './routes/hpp-produk.routes.js';
import { handleKainRoutes } from './routes/kain.routes.js';
import { handleOfflineOrdersRoutes } from './routes/offline-orders.routes.js';
import { handleBankRoutes } from './routes/bank.routes.js';
import { handleKeuanganRoutes } from './routes/keuangan.routes.js';
import { handleMutasiBarangRoutes } from './routes/mutasi-barang.routes.js';

import './config/env.js';

const PORT = process.env.PORT || 5010;

// 1. Inisialisasi Database MySQL
initDb();

// 2. Inisialisasi Layanan Marketplace
const shopeeService = new ShopeeService();
const tiktokService = new TiktokService();

const context = {
  pool,
  laravelPool,
  shopeeService,
  tiktokService
};

// 3. HTTP Server Utama (Modular Dispatcher)
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

  // Health check
  if (pathname === '/api/marketplace/health') {
    return sendJson(res, 200, { status: 'ok', serverTime: new Date().toISOString() });
  }

  try {
    // Dispatch ke Route Handlers Modular
    if (await handleAuthRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleStoresRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleProductsRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleMasterRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleOrdersRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleReturnsRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleWebhookRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleSPKRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleCustomerRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleTahapanSPKRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleHPPProdukRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleKainRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleOfflineOrdersRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleBankRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleKeuanganRoutes(req, res, pathname, urlObj, context)) return;
    if (await handleMutasiBarangRoutes(req, res, pathname, urlObj, context)) return;

    // 404 Not Found
    sendJson(res, 404, { error: 'Endpoint tidak ditemukan' });
  } catch (routeErr) {
    console.error(`[Unhandled Server Error on ${pathname}]:`, routeErr);
    sendJson(res, 500, { status: 'error', message: routeErr.message || 'Internal Server Error' });
  }
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.setTimeout(120000);

// 4. Jalankan Server & Background Auto-Sync
server.listen(PORT, () => {
  console.log(`RuangMarket Marketplace API Server berjalan di port ${PORT} [Modular Architecture]`);

  // Background auto-sync tiap 2 menit (ringan & otomatis menjaring pesanan baru)
  const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000;
  setInterval(async () => {
    try {
      const [stores] = await pool.query('SELECT * FROM toko_marketplace WHERE status_koneksi LIKE "%Aktif%" OR status_koneksi LIKE "%Terhubung%" OR status_koneksi LIKE "%connected%"');
      for (const st of stores) {
        if (st.saluran === 'shopee') {
          try {
            const shopeeOrders = await shopeeService.syncOrders(st.id_toko, st.token_akses, st.nama_toko).catch(async (shopeeErr) => {
              if (st.token_refresh) {
                const ref = await shopeeService.refreshAccessToken(st.token_refresh, st.id_toko, false).catch(() => null);
                if (ref?.access_token) {
                  await pool.query('UPDATE toko_marketplace SET token_akses = ?, token_refresh = ? WHERE id_toko = ?', [
                    ref.access_token,
                    ref.refresh_token || st.token_refresh,
                    st.id_toko
                  ]).catch(() => {});
                  return await shopeeService.syncOrders(st.id_toko, ref.access_token, st.nama_toko).catch(() => []);
                }
              }
              return [];
            });

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
                  net_amount = VALUES(net_amount)
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
              ]).catch(() => {});
            }
          } catch (e) {}
        } else if (st.saluran === 'tiktok') {
          const cipher = st.cipher_toko || st.id_toko;
          let currentToken = st.token_akses;
          let ttOrders = await tiktokService.syncOrders(currentToken, cipher, st.nama_toko).catch(async (ttErr) => {
            if (st.token_refresh) {
              const refreshed = await tiktokService.refreshAccessToken(st.token_refresh).catch(() => null);
              if (refreshed?.access_token) {
                await pool.query('UPDATE toko_marketplace SET token_akses = ?, token_refresh = ? WHERE id = ?', [
                  refreshed.access_token,
                  refreshed.refresh_token || st.token_refresh,
                  st.id
                ]).catch(() => {});
                return await tiktokService.syncOrders(refreshed.access_token, cipher, st.nama_toko).catch(() => []);
              }
            }
            return [];
          });

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
                no_telepon = VALUES(no_telepon)
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
            ]).catch(() => {});
          }
        }
      }
    } catch (bgErr) {
      // Abaikan
    }
  }, AUTO_SYNC_INTERVAL_MS);
});
