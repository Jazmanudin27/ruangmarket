import { PDFDocument } from 'pdf-lib';
import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleOrdersRoutes(req, res, pathname, urlObj, { pool, laravelPool, shopeeService, tiktokService }) {
  // 1. API Ambil Data Pesanan Marketplace dari MySQL (Terhubung ke ERP Aspartech)
  if (pathname === '/api/marketplace/orders' && req.method === 'GET') {
    try {
      const [rows] = await pool.query(`
        SELECT 
          id, kode_perusahaan as company_code, no_pesanan, saluran as channel,
          nama_toko as shopName, nama_pembeli as customerName, total_harga as totalPrice,
          status_pesanan as status, no_spk, rincian_item, kurir, no_resi,
          COALESCE(status_cetak, 'Belum Print') as status_cetak,
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
          DATE_FORMAT(ditarik_pada, '%d/%m/%Y, %H:%i') as syncedAt,
          COALESCE(waktu_pesanan, ditarik_pada) as rawOrderTime
        FROM pesanan_marketplace
        ORDER BY COALESCE(waktu_pesanan, ditarik_pada) DESC, id DESC
      `);

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

      sendJson(res, 200, { status: 'success', data: formatted });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. Simpan / Update Pesanan Manual ke MySQL
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
      sendJson(res, 200, { 
        status: 'success', 
        message: 'Pesanan berhasil disimpan ke database MySQL', 
        count: orders.length 
      });
      return true;
    } catch (err) {
      console.error('[Save Orders Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. Update Status & SPK Pesanan Marketplace
  if (pathname === '/api/marketplace/orders/update-spk' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { ids, no_spk, status_pesanan } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        sendJson(res, 400, { status: 'error', message: 'Parameter ids diperlukan' });
        return true;
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
        sendJson(res, 400, { status: 'error', message: 'Tidak ada data diperbarui' });
        return true;
      }

      await pool.query(`UPDATE pesanan_marketplace SET ${sets.join(', ')} WHERE id IN (?)`, [...values, ids]);
      sendJson(res, 200, { status: 'success', updated: ids.length });
      return true;
    } catch (err) {
      console.error('[Update SPK Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 4. Hapus Pesanan Masuk by ID
  const orderIdMatch = pathname.match(/^\/api\/marketplace\/orders\/([^/]+)$/);
  if (orderIdMatch && req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM pesanan_marketplace WHERE id = ?', [orderIdMatch[1]]);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 5. Cetak Resi Satuan (Print Label PDF)
  if (pathname === '/api/marketplace/orders/print-label' && req.method === 'GET') {
    const orderSn = urlObj.searchParams.get('order_sn');
    let channel = (urlObj.searchParams.get('channel') || '').toLowerCase();

    if (!orderSn) {
      sendJson(res, 400, { status: 'error', message: 'Parameter order_sn wajib diisi' });
      return true;
    }

    try {
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
        res.writeHead(302, { Location: `https://erp.aspartech.com/orders/${laravelId}/print` });
        res.end();
        return true;
      }

      let [orderRows] = await pool.query('SELECT * FROM pesanan_marketplace WHERE no_pesanan = ? OR id = ? LIMIT 1', [orderSn, orderSn]);
      const order = orderRows[0];
      if (order && !channel) {
        channel = (order.saluran || 'shopee').toLowerCase();
      }
      if (!channel) channel = 'shopee';

      const shopName = order?.nama_toko || '';

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
        pool.query('UPDATE pesanan_marketplace SET status_cetak = "Sudah Print" WHERE no_pesanan = ? OR id = ?', [orderSn, orderSn]).catch(() => {});

        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="resi-${orderSn}.pdf"`,
          'Content-Length': pdfBuffer.length
        });
        res.end(pdfBuffer);
        return true;
      }

      throw new Error('Gagal mendapatkan dokumen PDF resi dari marketplace');
    } catch (err) {
      console.error('[Cetak Resi PDF Error]:', err.message);
      sendJson(res, 502, {
        status: 'error',
        message: `Gagal cetak resi marketplace: ${err.message}`
      });
      return true;
    }
  }

  // 6. Cetak Resi Masal (Batch Print Labels PDF Gabungan)
  if (pathname === '/api/marketplace/orders/batch-print-label' && req.method === 'GET') {
    const orderSnsRaw = urlObj.searchParams.get('order_sns') || '';
    const orderSns = orderSnsRaw.split(',').map(s => s.trim()).filter(Boolean);

    if (orderSns.length === 0) {
      sendJson(res, 400, { status: 'error', message: 'Parameter order_sns wajib diisi (pisahkan dengan koma)' });
      return true;
    }

    try {
      const placeholders = orderSns.map(() => '?').join(',');
      const [orderRows] = await pool.query(
        `SELECT * FROM pesanan_marketplace WHERE no_pesanan IN (${placeholders}) OR id IN (${placeholders})`,
        [...orderSns, ...orderSns]
      );

      const [allStores] = await pool.query('SELECT * FROM toko_marketplace');

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

      // A. Unduh PDF Shopee
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

      // B. Unduh PDF TikTok
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

      if (collectedPdfBuffers.length === 1) {
        const finalPdf = collectedPdfBuffers[0];
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="resi-masal-${Date.now()}.pdf"`,
          'Content-Length': finalPdf.length
        });
        res.end(finalPdf);
        return true;
      }

      // C. Gabungkan PDF dengan PDF-Lib
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

      const updatePlaceholders = orderSns.map(() => '?').join(',');
      pool.query(`UPDATE pesanan_marketplace SET status_cetak = 'Sudah Print' WHERE no_pesanan IN (${updatePlaceholders}) OR id IN (${updatePlaceholders})`, [...orderSns, ...orderSns]).catch(() => {});

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="resi-masal-${Date.now()}.pdf"`,
        'Content-Length': mergedBuffer.length
      });
      res.end(mergedBuffer);
      return true;

    } catch (err) {
      console.error('[Cetak Resi Masal Error]:', err.message);
      sendJson(res, 502, {
        status: 'error',
        message: `Gagal cetak resi masal marketplace: ${err.message}`
      });
      return true;
    }
  }

  // 7. Shopee Orders Sync API
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

      sendJson(res, 200, {
        status: 'success',
        count: orders.length,
        data: orders
      });
      return true;
    } catch (err) {
      console.error('[Shopee Order Sync Error]:', err.message);
      sendJson(res, 400, {
        status: 'error',
        message: err.message
      });
      return true;
    }
  }

  // 8. TikTok Orders Sync API
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

      await pool.query("DELETE FROM pesanan_marketplace WHERE saluran = 'tiktok' AND (nama_pembeli LIKE '%Pelanggan TikTok%' OR no_pesanan LIKE 'ORD-TT%' OR no_pesanan LIKE 'ORD-TIKTOK%')").catch(() => {});

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

      sendJson(res, 200, {
        status: 'success',
        count: orders.length,
        data: orders
      });
      return true;
    } catch (err) {
      console.error('[TikTok Order Sync Error]:', err.message);
      sendJson(res, 400, {
        status: 'error',
        message: err.message
      });
      return true;
    }
  }

  // 9. Sync All Orders Sekaligus (Shopee & TikTok)
  if (pathname === '/api/marketplace/orders/sync-all' && req.method === 'POST') {
    try {
      const [stores] = await pool.query('SELECT * FROM toko_marketplace WHERE status_koneksi LIKE "%Aktif%" OR status_koneksi LIKE "%Terhubung%" OR status_koneksi LIKE "%connected%"');
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

      sendJson(res, 200, {
        status: 'success',
        totalSynced,
        results
      });
      return true;
    } catch (err) {
      console.error('[Sync All Orders Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
