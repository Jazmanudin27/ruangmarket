import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleWebhookRoutes(req, res, pathname, urlObj, { pool, shopeeService, tiktokService }) {
  // 1. Webhook Shopee (Realtime Order Notification dari Shopee Open Platform)
  if (pathname === '/api/marketplace/webhook/shopee' && (req.method === 'POST' || req.method === 'GET')) {
    if (req.method === 'GET') {
      sendJson(res, 200, { message: 'Shopee Webhook RuangMarket Ready' });
      return true;
    }
    try {
      const body = await parseJsonBody(req);
      console.log('[Shopee Webhook Event]:', JSON.stringify(body).slice(0, 200));

      setImmediate(async () => {
        try {
          const [stores] = await pool.query('SELECT * FROM toko_marketplace WHERE saluran = "shopee" AND (status_koneksi LIKE "%Aktif%" OR status_koneksi LIKE "%Terhubung%" OR status_koneksi LIKE "%connected%")');
          for (const st of stores) {
            const shopeeOrders = await shopeeService.syncOrders(st.id_toko, st.token_akses, st.nama_toko).catch(() => []);
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
          }
        } catch (e) {
          console.warn('[Shopee Webhook Sync Error]:', e.message);
        }
      });

      sendJson(res, 200, { code: 0, message: 'success' });
      return true;
    } catch (err) {
      console.error('[Shopee Webhook Error]:', err.message);
      sendJson(res, 200, { code: 0, message: 'acknowledged' });
      return true;
    }
  }

  // 2. Webhook TikTok Shop (Realtime Order Notification dari TikTok Shop Partner Center)
  if (pathname === '/api/marketplace/webhook/tiktok' && (req.method === 'POST' || req.method === 'GET')) {
    if (req.method === 'GET') {
      const challenge = urlObj.searchParams.get('challenge') || urlObj.searchParams.get('msg') || 'ok';
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge);
      return true;
    }
    try {
      const body = await parseJsonBody(req);
      console.log('[TikTok Webhook Event]:', JSON.stringify(body).slice(0, 200));

      setImmediate(async () => {
        try {
          const [stores] = await pool.query('SELECT * FROM toko_marketplace WHERE saluran = "tiktok" AND (status_koneksi LIKE "%Aktif%" OR status_koneksi LIKE "%Terhubung%" OR status_koneksi LIKE "%connected%")');
          for (const st of stores) {
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
        } catch (e) {
          console.warn('[TikTok Webhook Sync Error]:', e.message);
        }
      });

      sendJson(res, 200, { code: 0, message: 'success' });
      return true;
    } catch (err) {
      console.error('[TikTok Webhook Error]:', err.message);
      sendJson(res, 200, { code: 0, message: 'acknowledged' });
      return true;
    }
  }

  return false;
}
