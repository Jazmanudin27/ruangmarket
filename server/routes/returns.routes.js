import { sendJson, parseJsonBody } from '../utils/response.js';

// Helper mapping status retur
function mapReturnStatus(rawStatus, isRestocked) {
  if (isRestocked) return 'SELESAI RESTOK';
  const s = String(rawStatus || '').toUpperCase();
  if (['PROCESSING', 'REQUESTED', 'RETURN_OR_REFUND_REQUEST_PENDING', 'DIAJUKAN', 'MENUNGGU', 'MENUNGGU DITERIMA'].includes(s)) {
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
  // 1. GET /api/marketplace/returns - Daftar Retur Barang Resmi Database RuangMarket
  if (pathname === '/api/marketplace/returns' && req.method === 'GET') {
    try {
      const statusParam = urlObj.searchParams.get('status');
      const channelParam = urlObj.searchParams.get('channel');
      const q = urlObj.searchParams.get('q');

      // Ambil data langsung dari tabel retur_barang di database ruangmarket
      const [rows] = await pool.query(`
        SELECT 
          r.id,
          r.kode_perusahaan,
          r.kode_perusahaan as company_code,
          r.id_retur_marketplace as return_sn,
          r.no_pesanan,
          r.saluran,
          r.saluran as channel,
          r.nama_toko,
          r.nama_pembeli,
          r.alasan_retur,
          r.tipe_retur,
          r.status_retur,
          r.kondisi_barang,
          COALESCE(r.no_resi_retur, '') as no_resi_retur,
          COALESCE(r.kurir_retur, 'SPX Express') as kurir_retur,
          COALESCE(r.total_refund, 0) as total_refund,
          r.rincian_item,
          r.sudah_restok,
          r.sudah_restok as is_restocked,
          r.catatan,
          DATE_FORMAT(r.waktu_diajukan, '%d/%m/%Y %H:%i') as waktuDiajukanFormat,
          DATE_FORMAT(r.waktu_selesai, '%d/%m/%Y %H:%i') as waktuSelesaiFormat,
          r.waktu_diajukan
        FROM retur_barang r
        ORDER BY r.waktu_diajukan DESC, r.dibuat_pada DESC
      `);

      const formatted = rows.map(r => {
        let items = [];
        try {
          items = r.rincian_item ? (typeof r.rincian_item === 'string' ? JSON.parse(r.rincian_item) : r.rincian_item) : [];
        } catch (e) {
          items = [];
        }

        const validItems = Array.isArray(items) ? items : [];
        const firstItem = validItems[0] || null;
        const displayStatus = mapReturnStatus(r.status_retur, r.sudah_restok);

        return {
          ...r,
          status_retur: displayStatus,
          status: displayStatus,
          is_restocked: Boolean(r.sudah_restok),
          sku: firstItem?.sku || firstItem?.kode_sku || 'SKU-MASTER',
          nama_produk: firstItem?.nama_produk || 'Produk Retur',
          varian: firstItem?.varian || '',
          qty: firstItem?.qty || firstItem?.quantity || 1,
          items: validItems
        };
      });

      // Filter di memory
      let filtered = formatted;
      if (statusParam && statusParam !== 'semua') {
        const targetStatus = statusParam.toUpperCase();
        filtered = filtered.filter(item => {
          const s = String(item.status_retur || item.status || '').toUpperCase();
          if (targetStatus === 'MENUNGGU') return s === 'MENUNGGU';
          if (targetStatus === 'DIKIRIM') return s === 'DALAM PENGIRIMAN';
          if (targetStatus === 'CEK_FISIK') return s === 'PERLU CEK FISIK';
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
          const matchName = String(item.nama_produk || '').toLowerCase().includes(query);
          return matchNo || matchSn || matchBuyer || matchShop || matchResi || matchSku || matchName;
        });
      }

      // Hitung ringkasan statistik
      const summary = {
        total: formatted.length,
        menunggu: formatted.filter(r => (r.status === 'MENUNGGU' || r.status_retur === 'MENUNGGU') && !r.is_restocked).length,
        dalam_pengiriman: formatted.filter(r => r.status === 'DALAM PENGIRIMAN' || r.status_retur === 'DALAM PENGIRIMAN').length,
        cek_fisik: formatted.filter(r => r.status === 'PERLU CEK FISIK' || r.status_retur === 'PERLU CEK FISIK').length,
        selesai: formatted.filter(r => r.status === 'SELESAI RESTOK' || r.status_retur === 'SELESAI RESTOK' || r.is_restocked).length,
        ditolak: formatted.filter(r => r.status === 'DITOLAK' || r.status_retur === 'DITOLAK').length,
        shopee: formatted.filter(r => String(r.saluran || '').toLowerCase().includes('shopee')).length,
        tiktok: formatted.filter(r => String(r.saluran || '').toLowerCase().includes('tiktok')).length
      };

      sendJson(res, 200, {
        status: 'success',
        source: 'ruangmarket_db',
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

      // Ambil data retur dari ruangmarket.retur_barang
      const [rows] = await pool.query('SELECT * FROM retur_barang WHERE id = ? OR no_pesanan = ?', [returId, returId]);
      if (rows.length === 0) {
        sendJson(res, 404, { status: 'error', message: 'Data retur tidak ditemukan' });
        return true;
      }

      const retur = rows[0];

      // Update status retur di database ruangmarket
      await pool.query(`
        UPDATE retur_barang 
        SET 
          status_retur = 'Selesai (Restok)',
          kondisi_barang = ?,
          sudah_restok = 1,
          catatan = CONCAT(IFNULL(catatan, ''), '\n', ?),
          waktu_selesai = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [kondisiBarang, catatan, retur.id]);

      // Jika ada database Laravel, update juga di return_orders
      if (laravelPool) {
        try {
          await laravelPool.query(`
            UPDATE return_orders 
            SET 
              is_restocked = 1,
              status = 'ACCEPTED',
              inspection_status = ?,
              inspection_notes = CONCAT(IFNULL(inspection_notes, ''), '\n', ?),
              updated_at = CURRENT_TIMESTAMP
            WHERE return_sn = ? OR id = ?
          `, [
            kondisiBarang.includes('Layak') || kondisiBarang.includes('Bagus') ? 'GOOD' : 'DAMAGED',
            catatan,
            retur.id_retur_marketplace,
            retur.id_retur_marketplace
          ]).catch(() => {});
        } catch (eLar) {}
      }

      // Jika kondisi layak jual, tambah stok fisik di produk_master
      let restockedItemsCount = 0;
      if (kondisiBarang.includes('Layak') || kondisiBarang.includes('Bagus') || body.do_restock === true) {
        let items = [];
        try {
          items = retur.rincian_item ? JSON.parse(retur.rincian_item) : [];
        } catch (e) {}

        for (const it of (Array.isArray(items) ? items : [])) {
          const rawSku = String(it.sku || it.kode_sku || '').trim();
          const cleanSku = rawSku.replace(/^rsg-/i, '');
          const qty = Number(it.qty || it.quantity || 1);

          if (cleanSku && qty > 0) {
            await pool.query(`
              UPDATE produk_master 
              SET stok_fisik = stok_fisik + ? 
              WHERE kode_sku = ? OR kode_sku = ?
            `, [qty, cleanSku, rawSku]).catch(() => {});
            restockedItemsCount += qty;
          }
        }
      }

      sendJson(res, 200, {
        status: 'success',
        message: `Barang retur berhasil diterima! ${restockedItemsCount > 0 ? `+${restockedItemsCount} pcs telah ditambahkan kembali ke stok fisik produk master.` : 'Status retur telah diperbarui.'}`
      });
      return true;
    } catch (err) {
      console.error('[Restock Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. POST /api/marketplace/returns/sync - Sinkronisasi Ulang Data Retur Fisik Asli dari Toko Aktif
  if (pathname === '/api/marketplace/returns/sync' && req.method === 'POST') {
    try {
      let syncedCount = 0;
      if (laravelPool) {
        const [stores] = await pool.query('SELECT nama_toko, saluran FROM toko_marketplace');
        const storeNames = stores.map(s => s.nama_toko);

        if (storeNames.length > 0) {
          const [realReturns] = await laravelPool.query(`
            SELECT 
              ro.id as laravel_return_id,
              ro.return_sn,
              ro.return_tracking_number,
              ro.shipping_provider,
              ro.reason,
              ro.status as return_status,
              ro.refund_amount,
              ro.is_restocked,
              ro.inspection_status,
              ro.created_at,
              o.order_marketplace_id,
              o.buyer_name,
              o.courier,
              o.tracking_number,
              s.store_name,
              c.name as channel_name,
              ro.order_id
            FROM return_orders ro
            JOIN orders o ON o.id = ro.order_id
            JOIN stores s ON s.id = ro.store_id
            JOIN channels c ON c.id = s.channel_id
            WHERE (s.store_name = 'Koperasi Sahabat Anak Bangsa' AND c.name = 'Shopee')
               OR (s.store_name = 'RUANG SERAGAM' AND c.name = 'TikTok Shop')
            ORDER BY ro.id DESC
          `);

          // Bersihkan data retur yang bukan retur fisik asli
          await pool.query('DELETE FROM retur_barang');

          for (const r of realReturns) {
            const [items] = await laravelPool.query(`
              SELECT sku, product_name as nama_produk, quantity as qty, price as harga, total_price as subtotal 
              FROM order_items 
              WHERE order_id = ?
            `, [r.order_id]);

            let displayReason = 'Pengembalian / Komplain Pembeli';
            const rawReason = String(r.reason || '').toUpperCase();
            if (rawReason.includes('WRONG_ITEM') || rawReason.includes('WRONG PRODUCT')) displayReason = 'Produk Salah Dikirim';
            else if (rawReason.includes('ITEM_MISSING')) displayReason = 'Barang Kurang / Hilang';
            else if (rawReason.includes('DESCRIPTION')) displayReason = 'Tidak Sesuai Deskripsi';
            else if (rawReason.includes('CHANGE_MIND')) displayReason = 'Berubah Pikiran';
            else if (rawReason.includes('DAMAGE')) displayReason = 'Barang Rusak / Cacat';

            let displayStatus = 'Menunggu';
            const s = String(r.return_status || '').toUpperCase();
            if (s === 'ACCEPTED' || s === 'COMPLETED' || r.is_restocked) displayStatus = 'Selesai (Restok)';
            else if (s === 'BUYER_SHIPPED_ITEM' || s === 'IN_TRANSIT') displayStatus = 'Dalam Pengiriman';
            else if (s === 'CANCELLED' || s === 'REJECTED') displayStatus = 'Ditolak';

            const returId = `ret_${r.laravel_return_id}_${r.order_marketplace_id}`;
            const saluran = String(r.channel_name).toLowerCase().includes('tiktok') ? 'tiktok' : 'shopee';

            await pool.query(`
              INSERT INTO retur_barang (
                id, kode_perusahaan, id_retur_marketplace, no_pesanan, saluran,
                nama_toko, nama_pembeli, alasan_retur, tipe_retur, status_retur,
                kondisi_barang, no_resi_retur, kurir_retur, total_refund,
                rincian_item, sudah_restok, catatan, waktu_diajukan
              ) VALUES (?, 'RSG', ?, ?, ?, ?, ?, ?, 'RETURN_REFUND', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              returId,
              r.return_sn || String(r.laravel_return_id),
              r.order_marketplace_id,
              saluran,
              r.store_name,
              r.buyer_name,
              displayReason,
              displayStatus,
              r.inspection_status === 'GOOD' ? 'Bagus / Layak Jual' : 'Menunggu Penerimaan',
              r.return_tracking_number || '',
              r.shipping_provider || r.courier || 'SPX Express',
              Number(r.refund_amount) || 0,
              JSON.stringify(items || []),
              r.is_restocked ? 1 : 0,
              `Retur SN: ${r.return_sn || '-'}`,
              r.created_at ? new Date(r.created_at) : new Date()
            ]);
            syncedCount++;
          }
        }
      }

      sendJson(res, 200, {
        status: 'success',
        message: `Sinkronisasi retur selesai! Ditemukan ${syncedCount} transaksi retur barang fisik resmi dari toko aktif Anda.`
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RETURN_REFUND', 'Menunggu', 'Menunggu Penerimaan', ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
      `, [
        returId,
        body.kode_perusahaan || 'RSG',
        noPesanan,
        body.saluran || 'shopee',
        body.nama_toko || 'Koperasi Sahabat Anak Bangsa',
        body.nama_pembeli || 'Pelanggan',
        body.alasan_retur || 'Pengembalian / Komplain Pembeli',
        body.no_resi_retur || '',
        body.kurir_retur || 'SPX Express',
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
