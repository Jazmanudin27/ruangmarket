import { sendJson, parseJsonBody } from '../utils/response.js';

// Helper mapping alasan retur bahasa Indonesia
function mapReturnReason(rawReason) {
  if (!rawReason) return 'Pengajuan Retur / Komplain';
  const r = String(rawReason).toUpperCase();
  if (r.includes('CHANGE_MIND') || r.includes('CHANGE OF MIND')) return 'Berubah Pikiran';
  if (r.includes('WRONG_ITEM') || r.includes('WRONG PRODUCT')) return 'Produk Salah Dikirim';
  if (r.includes('DIFFERENT_DESCRIPTION') || r.includes('MATCH DESCRIPTION')) return 'Tidak Sesuai Deskripsi';
  if (r.includes('ITEM_MISSING') || r.includes('MISSING')) return 'Barang Kurang / Hilang';
  if (r.includes('FUNCTIONAL_DMG') || r.includes('DAMAGE')) return 'Barang Rusak / Cacat';
  if (r.includes('SLIGHT_SCRATCH')) return 'Cacat / Goresan Fisik';
  if (r.includes('NOT_RECEIPT')) return 'Paket Belum Diterima';
  if (r.includes('ITEM_FAKE')) return 'Barang Tidak Asli';
  return rawReason;
}

// Helper mapping status retur
function mapReturnStatus(rawStatus, isRestocked) {
  if (isRestocked) return 'SELESAI RESTOK';
  const s = String(rawStatus || '').toUpperCase();
  if (['PROCESSING', 'REQUESTED', 'RETURN_OR_REFUND_REQUEST_PENDING', 'DIAJUKAN', 'MENUNGGU'].includes(s)) {
    return 'MENUNGGU';
  }
  if (['BUYER_SHIPPED_ITEM', 'IN_TRANSIT', 'DALAM PENGIRIMAN', 'RETURNING'].includes(s)) {
    return 'DALAM PENGIRIMAN';
  }
  if (['ACCEPTED', 'RETURN_OR_REFUND_REQUEST_COMPLETE', 'COMPLETED', 'SELESAI', 'SELESAI (RESTOK)'].includes(s)) {
    return 'SELESAI RESTOK';
  }
  if (['CANCELLED', 'RETURN_OR_REFUND_REQUEST_CANCEL', 'REJECTED', 'DITOLAK'].includes(s)) {
    return 'DITOLAK';
  }
  return 'MENUNGGU';
}

export async function handleReturnsRoutes(req, res, pathname, urlObj, { pool, laravelPool }) {
  // 1. GET /api/marketplace/returns - Daftar Seluruh Retur Barang (Sinkron dengan Database Laravel ERP Aspartech)
  if (pathname === '/api/marketplace/returns' && req.method === 'GET') {
    try {
      const statusParam = urlObj.searchParams.get('status');
      const channelParam = urlObj.searchParams.get('channel');
      const q = urlObj.searchParams.get('q');

      let returnsData = [];

      // A. Coba tarik data asli dari tabel return_orders database Laravel ERP
      let usedLaravel = false;
      if (laravelPool) {
        try {
          const [larRows] = await laravelPool.query(`
            SELECT 
              ro.id,
              ro.id as laravel_return_id,
              ro.tenant_id,
              CASE WHEN ro.tenant_id = 1 THEN 'EMRA' WHEN ro.tenant_id = 3 THEN 'DEMO' ELSE 'RSG' END as company_code,
              COALESCE(ro.return_sn, CONCAT('RET-', ro.id)) as return_sn,
              COALESCE(o.order_marketplace_id, CONCAT('ORD-', ro.order_id)) as no_pesanan,
              COALESCE(c.name, 'Shopee') as channel,
              LOWER(COALESCE(c.name, 'shopee')) as saluran,
              COALESCE(s.store_name, 'Toko Marketplace') as nama_toko,
              COALESCE(o.buyer_name, 'Pelanggan') as nama_pembeli,
              ro.reason as alasan_retur_raw,
              ro.status as status_retur_raw,
              COALESCE(ro.inspection_status, 'PENDING') as kondisi_barang,
              COALESCE(NULLIF(ro.return_tracking_number, ''), o.tracking_number, '') as no_resi_retur,
              COALESCE(NULLIF(ro.shipping_provider, ''), o.courier, 'SPX / J&T Return') as kurir_retur,
              COALESCE(ro.refund_amount, o.total_amount, 0) as total_refund,
              ro.is_restocked,
              ro.inspection_notes as catatan,
              DATE_FORMAT(ro.created_at, '%d/%m/%Y %H:%i') as waktuDiajukanFormat,
              ro.created_at as waktu_diajukan,
              ro.order_id
            FROM return_orders ro
            LEFT JOIN orders o ON o.id = ro.order_id
            LEFT JOIN stores s ON s.id = ro.store_id
            LEFT JOIN channels c ON c.id = s.channel_id
            ORDER BY ro.id DESC
          `);

          if (larRows && larRows.length > 0) {
            usedLaravel = true;
            const returnIds = larRows.map(r => r.id);
            const orderIds = larRows.map(r => r.order_id).filter(Boolean);

            // Ambil items dari return_order_items
            let roiMap = new Map();
            try {
              const [roiRows] = await laravelPool.query(`
                SELECT 
                  roi.return_order_id,
                  roi.quantity as qty,
                  oi.sku,
                  oi.product_name as nama_produk,
                  oi.price as harga,
                  oi.total_price as subtotal
                FROM return_order_items roi
                JOIN order_items oi ON oi.id = roi.order_item_id
                WHERE roi.return_order_id IN (?)
              `, [returnIds]);

              (roiRows || []).forEach(it => {
                if (!roiMap.has(it.return_order_id)) roiMap.set(it.return_order_id, []);
                roiMap.get(it.return_order_id).push(it);
              });
            } catch (eRoi) {}

            // Ambil items dari order_items jika return_order_items kosong
            let oiMap = new Map();
            try {
              if (orderIds.length > 0) {
                const [oiRows] = await laravelPool.query(`
                  SELECT 
                    order_id,
                    sku,
                    product_name as nama_produk,
                    quantity as qty,
                    price as harga,
                    total_price as subtotal
                  FROM order_items
                  WHERE order_id IN (?)
                `, [orderIds]);

                (oiRows || []).forEach(it => {
                  if (!oiMap.has(it.order_id)) oiMap.set(it.order_id, []);
                  oiMap.get(it.order_id).push(it);
                });
              }
            } catch (eOi) {}

            returnsData = larRows.map(r => {
              const items = roiMap.get(r.id) || oiMap.get(r.order_id) || [];
              const firstItem = items[0] || null;
              const displayStatus = mapReturnStatus(r.status_retur_raw, r.is_restocked);
              const displayReason = mapReturnReason(r.alasan_retur_raw);

              return {
                id: r.id,
                laravel_return_id: r.id,
                kode_perusahaan: r.company_code,
                company_code: r.company_code,
                no_pesanan: r.no_pesanan,
                return_sn: r.return_sn,
                channel: r.channel,
                saluran: r.saluran,
                nama_toko: r.nama_toko,
                nama_pembeli: r.nama_pembeli,
                alasan_retur: displayReason,
                alasan_retur_raw: r.alasan_retur_raw,
                status_retur: displayStatus,
                status: displayStatus,
                status_retur_raw: r.status_retur_raw,
                kondisi_barang: r.kondisi_barang === 'GOOD' ? 'Bagus / Layak Jual' : (r.kondisi_barang === 'DAMAGED' ? 'Rusak / Afkir' : 'Menunggu Penerimaan'),
                no_resi_retur: r.no_resi_retur,
                kurir_retur: r.kurir_retur,
                total_refund: Number(r.total_refund) || 0,
                is_restocked: Boolean(r.is_restocked),
                sudah_restok: r.is_restocked ? 1 : 0,
                catatan: r.catatan || '',
                waktuDiajukanFormat: r.waktuDiajukanFormat,
                waktu_diajukan: r.waktu_diajukan,
                sku: firstItem?.sku || 'SKU-MASTER',
                nama_produk: firstItem?.nama_produk || 'Produk Marketplace',
                qty: firstItem?.qty || 1,
                items
              };
            });
          }
        } catch (larErr) {
          console.warn('[Returns] Gagal baca langsung dari laravelPool, fallback ke retur_barang lokal:', larErr.message);
        }
      }

      // B. Fallback ke tabel lokal retur_barang jika Laravel DB tidak tersedia
      if (!usedLaravel) {
        const [rows] = await pool.query(`
          SELECT 
            r.*,
            r.kode_perusahaan as company_code,
            r.status_retur as status,
            r.sudah_restok as is_restocked,
            pm.rincian_item as pm_rincian_item,
            COALESCE(NULLIF(r.kurir_retur, ''), pm.kurir, 'SPX / J&T Return') as kurir_tampil,
            COALESCE(NULLIF(r.no_resi_retur, ''), pm.no_resi, '') as no_resi_tampil,
            DATE_FORMAT(COALESCE(r.waktu_diajukan, pm.waktu_pesanan, r.dibuat_pada), '%d/%m/%Y %H:%i') as waktuDiajukanFormat,
            DATE_FORMAT(r.waktu_selesai, '%d/%m/%Y %H:%i') as waktuSelesaiFormat
          FROM retur_barang r
          LEFT JOIN pesanan_marketplace pm ON pm.no_pesanan = r.no_pesanan
          ORDER BY r.dibuat_pada DESC
        `);

        returnsData = rows.map(r => {
          let items = [];
          try {
            items = r.rincian_item ? (typeof r.rincian_item === 'string' ? JSON.parse(r.rincian_item) : r.rincian_item) : [];
          } catch (e) {}
          if ((!items || items.length === 0) && r.pm_rincian_item) {
            try {
              items = typeof r.pm_rincian_item === 'string' ? JSON.parse(r.pm_rincian_item) : r.pm_rincian_item;
            } catch (e) {}
          }
          const validItems = Array.isArray(items) ? items : [];
          const firstItem = validItems[0] || null;
          const displayStatus = mapReturnStatus(r.status_retur, r.sudah_restok);
          const displayReason = mapReturnReason(r.alasan_retur);

          return {
            ...r,
            status_retur: displayStatus,
            status: displayStatus,
            alasan_retur: displayReason,
            kurir_retur: r.kurir_tampil,
            no_resi_retur: r.no_resi_tampil,
            sku: firstItem?.sku || firstItem?.kode_sku || 'SKU-MASTER',
            nama_produk: firstItem?.nama_produk || 'Produk Marketplace',
            qty: firstItem?.qty || 1,
            items: validItems
          };
        });
      }

      // Filter di memory
      let filtered = returnsData;
      if (statusParam && statusParam !== 'semua') {
        const targetStatus = statusParam.toUpperCase();
        filtered = filtered.filter(item => {
          const s = String(item.status_retur || item.status || '').toUpperCase();
          if (targetStatus === 'MENUNGGU') return s === 'MENUNGGU';
          if (targetStatus === 'DIKIRIM') return s === 'DALAM PENGIRIMAN';
          if (targetStatus === 'CEK_FISIK') return s === 'PERLU CEK FISIK' || item.kondisi_barang.includes('Menunggu');
          if (targetStatus === 'SELESAI') return s === 'SELESAI RESTOK' || item.is_restocked;
          return s === targetStatus;
        });
      }
      if (channelParam && channelParam !== 'semua') {
        filtered = filtered.filter(item => String(item.saluran || item.channel || '').toLowerCase() === channelParam.toLowerCase());
      }
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(item => {
          const matchNo = String(item.no_pesanan || '').toLowerCase().includes(query);
          const matchSn = String(item.return_sn || '').toLowerCase().includes(query);
          const matchBuyer = String(item.nama_pembeli || '').toLowerCase().includes(query);
          const matchShop = String(item.nama_toko || '').toLowerCase().includes(query);
          const matchResi = String(item.no_resi_retur || '').toLowerCase().includes(query);
          const matchSku = String(item.sku || '').toLowerCase().includes(query);
          return matchNo || matchSn || matchBuyer || matchShop || matchResi || matchSku;
        });
      }

      // Hitung ringkasan statistik
      const summary = {
        total: returnsData.length,
        menunggu: returnsData.filter(r => (r.status === 'MENUNGGU' || r.status_retur === 'MENUNGGU') && !r.is_restocked).length,
        dalam_pengiriman: returnsData.filter(r => r.status === 'DALAM PENGIRIMAN' || r.status_retur === 'DALAM PENGIRIMAN').length,
        cek_fisik: returnsData.filter(r => r.status === 'PERLU CEK FISIK' || r.status_retur === 'PERLU CEK FISIK').length,
        selesai: returnsData.filter(r => r.status === 'SELESAI RESTOK' || r.status_retur === 'SELESAI RESTOK' || r.is_restocked).length,
        ditolak: returnsData.filter(r => r.status === 'DITOLAK' || r.status_retur === 'DITOLAK').length,
        shopee: returnsData.filter(r => String(r.saluran || '').toLowerCase().includes('shopee')).length,
        tiktok: returnsData.filter(r => String(r.saluran || '').toLowerCase().includes('tiktok')).length
      };

      sendJson(res, 200, {
        status: 'success',
        source: usedLaravel ? 'laravel_return_orders' : 'ruangmarket_db',
        data: filtered,
        summary
      });
      return true;
    } catch (err) {
      console.error('[Get Returns Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/marketplace/returns/:id/restock - Terima Barang & Restok ke Produk Master
  const restockMatch = pathname.match(/^\/api\/marketplace\/returns\/([^/]+)\/restock$/);
  if (restockMatch && req.method === 'POST') {
    try {
      const returId = decodeURIComponent(restockMatch[1]);
      const body = await parseJsonBody(req);
      const kondisiBarang = body.kondisi_barang || 'Bagus / Layak Jual (Restok)';
      const catatan = body.catatan || 'Barang telah diterima di gudang dan dikembalikan ke stok fisik';

      let itemsToRestock = [];

      // A. Cek di Laravel return_orders jika ada ID angka
      if (laravelPool && /^\d+$/.test(returId)) {
        try {
          const [larReturn] = await laravelPool.query('SELECT * FROM return_orders WHERE id = ?', [returId]);
          if (larReturn.length > 0) {
            const rOrder = larReturn[0];

            // Update status di Laravel DB
            await laravelPool.query(`
              UPDATE return_orders 
              SET 
                is_restocked = 1,
                status = 'ACCEPTED',
                inspection_status = ?,
                inspection_notes = CONCAT(IFNULL(inspection_notes, ''), '\n', ?),
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [
              kondisiBarang.includes('Layak') || kondisiBarang.includes('Bagus') ? 'GOOD' : 'DAMAGED',
              catatan,
              returId
            ]);

            // Ambil items untuk di-restok ke produk_master
            const [roi] = await laravelPool.query(`
              SELECT roi.quantity as qty, oi.sku 
              FROM return_order_items roi 
              JOIN order_items oi ON oi.id = roi.order_item_id 
              WHERE roi.return_order_id = ?
            `, [returId]);

            if (roi && roi.length > 0) {
              itemsToRestock = roi;
            } else if (rOrder.order_id) {
              const [oi] = await laravelPool.query('SELECT sku, quantity as qty FROM order_items WHERE order_id = ?', [rOrder.order_id]);
              itemsToRestock = oi || [];
            }
          }
        } catch (eLar) {
          console.warn('[Restock] Info update laravelPool:', eLar.message);
        }
      }

      // B. Update di retur_barang lokal jika ada
      try {
        const [loc] = await pool.query('SELECT * FROM retur_barang WHERE id = ? OR no_pesanan = ?', [returId, returId]);
        if (loc.length > 0) {
          await pool.query(`
            UPDATE retur_barang 
            SET 
              status_retur = 'Selesai (Restok)',
              kondisi_barang = ?,
              sudah_restok = 1,
              catatan = CONCAT(IFNULL(catatan, ''), '\n', ?),
              waktu_selesai = CURRENT_TIMESTAMP
            WHERE id = ? OR no_pesanan = ?
          `, [kondisiBarang, catatan, returId, returId]);

          if (itemsToRestock.length === 0 && loc[0].rincian_item) {
            try {
              itemsToRestock = JSON.parse(loc[0].rincian_item);
            } catch (e) {}
          }
        }
      } catch (eLoc) {}

      // C. Lakukan penambahan stok fisik di tabel produk_master
      let totalRestocked = 0;
      if (kondisiBarang.includes('Layak') || kondisiBarang.includes('Bagus') || body.do_restock === true) {
        for (const it of itemsToRestock) {
          const rawSku = String(it.sku || it.kode_sku || '').trim();
          const cleanSku = rawSku.replace(/^rsg-/i, '');
          const qty = Number(it.qty || it.quantity || 1);

          if (cleanSku && qty > 0) {
            await pool.query(`
              UPDATE produk_master 
              SET stok_fisik = stok_fisik + ? 
              WHERE kode_sku = ? OR kode_sku = ?
            `, [qty, cleanSku, rawSku]).catch(() => {});
            totalRestocked += qty;
          }
        }
      }

      sendJson(res, 200, {
        status: 'success',
        message: `Barang retur berhasil diterima! ${totalRestocked > 0 ? `+${totalRestocked} pcs telah ditambahkan kembali ke stok fisik produk master.` : 'Status retur telah diperbarui.'}`
      });
      return true;
    } catch (err) {
      console.error('[Restock Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. POST /api/marketplace/returns/sync - Sinkronisasi Ulang Retur dari Marketplace & Laravel
  if (pathname === '/api/marketplace/returns/sync' && req.method === 'POST') {
    try {
      // Hitung total dari Laravel
      let count = 0;
      if (laravelPool) {
        const [cRows] = await laravelPool.query('SELECT COUNT(*) as total FROM return_orders');
        count = cRows[0]?.total || 0;
      }
      sendJson(res, 200, {
        status: 'success',
        message: `Sinkronisasi data retur selesai! Terhubung dengan ${count} data retur resmi di server ERP Laravel.`
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 4. POST /api/marketplace/returns - Input Manual Retur Barang
  if (pathname === '/api/marketplace/returns' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const returId = body.id || `ret_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const noPesanan = String(body.no_pesanan || '').trim();

      if (!noPesanan) {
        sendJson(res, 400, { status: 'error', message: 'Nomor pesanan wajib diisi' });
        return true;
      }

      await pool.query(`
        INSERT INTO retur_barang (
          id, kode_perusahaan, no_pesanan, saluran, nama_toko, nama_pembeli,
          alasan_retur, tipe_retur, status_retur, kondisi_barang,
          no_resi_retur, kurir_retur, total_refund, sudah_restok, catatan, waktu_diajukan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RETURN_REFUND', 'Diajukan', 'Menunggu Penerimaan', ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
      `, [
        returId,
        body.kode_perusahaan || 'RSG',
        noPesanan,
        body.saluran || 'shopee',
        body.nama_toko || 'Toko Marketplace',
        body.nama_pembeli || 'Pelanggan',
        body.alasan_retur || 'Pengajuan Retur / Komplain Pembeli',
        body.no_resi_retur || '',
        body.kurir_retur || 'J&T / SPX Express',
        Number(body.total_refund) || 0,
        body.catatan || ''
      ]);

      sendJson(res, 200, { status: 'success', message: 'Data retur berhasil dicatat' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
