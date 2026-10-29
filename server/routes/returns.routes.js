import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleReturnsRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. GET /api/marketplace/returns - Daftar Seluruh Retur Barang
  if (pathname === '/api/marketplace/returns' && req.method === 'GET') {
    try {
      const status = urlObj.searchParams.get('status');
      const channel = urlObj.searchParams.get('channel');
      const q = urlObj.searchParams.get('q');

      let sql = `
        SELECT 
          r.*,
          DATE_FORMAT(COALESCE(r.waktu_diajukan, r.dibuat_pada), '%d/%m/%Y %H:%i') as waktuDiajukanFormat,
          DATE_FORMAT(r.waktu_selesai, '%d/%m/%Y %H:%i') as waktuSelesaiFormat
        FROM retur_barang r
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'semua') {
        sql += ` AND r.status_retur = ?`;
        params.push(status);
      }
      if (channel && channel !== 'semua') {
        sql += ` AND r.saluran = ?`;
        params.push(channel);
      }
      if (q) {
        sql += ` AND (r.no_pesanan LIKE ? OR r.nama_pembeli LIKE ? OR r.no_resi_retur LIKE ? OR r.alasan_retur LIKE ?)`;
        const wildcard = `%${q}%`;
        params.push(wildcard, wildcard, wildcard, wildcard);
      }

      sql += ` ORDER BY r.dibuat_pada DESC`;

      const [rows] = await pool.query(sql, params);

      const formatted = rows.map(r => {
        let items = [];
        try {
          items = r.rincian_item ? (typeof r.rincian_item === 'string' ? JSON.parse(r.rincian_item) : r.rincian_item) : [];
        } catch (e) {
          items = [];
        }
        return {
          ...r,
          items: Array.isArray(items) ? items : []
        };
      });

      // Statistik ringkas status retur
      const [counts] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status_retur = 'Diajukan' THEN 1 ELSE 0 END) as diajukan,
          SUM(CASE WHEN status_retur = 'Dalam Pengiriman' THEN 1 ELSE 0 END) as dalam_pengiriman,
          SUM(CASE WHEN status_retur = 'Barang Diterima' THEN 1 ELSE 0 END) as diterima,
          SUM(CASE WHEN status_retur = 'Selesai (Restok)' THEN 1 ELSE 0 END) as selesai,
          SUM(CASE WHEN status_retur = 'Ditolak' THEN 1 ELSE 0 END) as ditolak,
          SUM(CASE WHEN kondisi_barang = 'Rusak / Afkir' THEN 1 ELSE 0 END) as barang_rusak
        FROM retur_barang
      `);

      sendJson(res, 200, {
        status: 'success',
        data: formatted,
        summary: counts[0] || {}
      });
      return true;
    } catch (err) {
      console.error('[Get Returns Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/marketplace/returns - Input / Ajukan Retur Barang (Bisa dari Pesanan atau Manual)
  if (pathname === '/api/marketplace/returns' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const returId = body.id || `ret_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const noPesanan = String(body.no_pesanan || '').trim();

      if (!noPesanan) {
        sendJson(res, 400, { status: 'error', message: 'Nomor pesanan wajib diisi' });
        return true;
      }

      // Cari data pesanan marketplace jika ada
      let order = null;
      try {
        const [ordRows] = await pool.query('SELECT * FROM pesanan_marketplace WHERE no_pesanan = ? OR id = ? LIMIT 1', [noPesanan, noPesanan]);
        if (ordRows.length > 0) order = ordRows[0];
      } catch (e) {}

      const saluran = body.saluran || order?.saluran || 'shopee';
      const namaToko = body.nama_toko || order?.nama_toko || 'Toko Marketplace';
      const namaPembeli = body.nama_pembeli || order?.nama_pembeli || 'Pelanggan';
      const totalRefund = Number(body.total_refund !== undefined ? body.total_refund : (order?.total_harga || 0));
      const alasanRetur = body.alasan_retur || 'Barang tidak sesuai / Cacat / Pengembalian Pembeli';
      const tipeRetur = body.tipe_retur || 'RETURN_REFUND';
      const statusRetur = body.status_retur || 'Diajukan';
      const kondisiBarang = body.kondisi_barang || 'Menunggu Penerimaan';
      const noResiRetur = body.no_resi_retur || '';
      const kurirRetur = body.kurir_retur || 'J&T / SPX Express';
      const catatan = body.catatan || '';

      let items = body.items;
      if (!items && order?.rincian_item) {
        try {
          items = typeof order.rincian_item === 'string' ? JSON.parse(order.rincian_item) : order.rincian_item;
        } catch (e) {
          items = [];
        }
      }
      const itemsJson = JSON.stringify(Array.isArray(items) ? items : []);

      await pool.query(`
        INSERT INTO retur_barang (
          id, kode_perusahaan, id_retur_marketplace, no_pesanan, saluran,
          nama_toko, nama_pembeli, alasan_retur, tipe_retur, status_retur,
          kondisi_barang, no_resi_retur, kurir_retur, total_refund,
          rincian_item, sudah_restok, catatan, waktu_diajukan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          alasan_retur = VALUES(alasan_retur),
          status_retur = VALUES(status_retur),
          kondisi_barang = VALUES(kondisi_barang),
          no_resi_retur = VALUES(no_resi_retur),
          kurir_retur = VALUES(kurir_retur),
          total_refund = VALUES(total_refund),
          catatan = VALUES(catatan)
      `, [
        returId,
        body.kode_perusahaan || order?.kode_perusahaan || 'RSG',
        body.id_retur_marketplace || null,
        noPesanan,
        saluran,
        namaToko,
        namaPembeli,
        alasanRetur,
        tipeRetur,
        statusRetur,
        kondisiBarang,
        noResiRetur,
        kurirRetur,
        totalRefund,
        itemsJson,
        catatan
      ]);

      // Update status di pesanan_marketplace menjadi 'Retur / Dibatalkan'
      if (order) {
        pool.query(`UPDATE pesanan_marketplace SET status_pesanan = 'Retur Diajukan' WHERE no_pesanan = ?`, [noPesanan]).catch(() => {});
      }

      sendJson(res, 200, {
        status: 'success',
        message: 'Data retur berhasil dicatat',
        id: returId
      });
      return true;
    } catch (err) {
      console.error('[Create Return Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. POST /api/marketplace/returns/sync - Tarik Otomatis Data Retur dari Shopee / TikTok Shop
  if (pathname === '/api/marketplace/returns/sync' && req.method === 'POST') {
    try {
      // Ambil pesanan yang berstatus CANCELLED / RETURN_REFUND / TO_CONFIRM_RECEIVE yang memiliki indikasi pengembalian
      const [ordersRetur] = await pool.query(`
        SELECT * FROM pesanan_marketplace 
        WHERE status_pesanan LIKE '%CANCEL%' 
           OR status_pesanan LIKE '%RETURN%' 
           OR status_pesanan LIKE '%REFUND%'
           OR status_pesanan LIKE '%Batal%'
           OR status_pesanan LIKE '%Retur%'
        ORDER BY ditarik_pada DESC 
        LIMIT 50
      `);

      let syncedCount = 0;
      for (const ord of ordersRetur) {
        // Cek apakah retur untuk nomor pesanan ini sudah ada
        const [existing] = await pool.query('SELECT id FROM retur_barang WHERE no_pesanan = ?', [ord.no_pesanan]);
        if (existing.length === 0) {
          const returId = `ret_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await pool.query(`
            INSERT INTO retur_barang (
              id, kode_perusahaan, no_pesanan, saluran, nama_toko, nama_pembeli,
              alasan_retur, tipe_retur, status_retur, kondisi_barang,
              no_resi_retur, total_refund, rincian_item, waktu_diajukan
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RETURN_REFUND', 'Diajukan', 'Menunggu Penerimaan', ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            returId,
            ord.kode_perusahaan || 'RSG',
            ord.no_pesanan,
            ord.saluran || 'shopee',
            ord.nama_toko,
            ord.nama_pembeli,
            'Pengembalian / Pembatalan oleh Pembeli di Marketplace',
            ord.no_resi || '',
            ord.total_harga || 0,
            ord.rincian_item || '[]'
          ]);
          syncedCount++;
        }
      }

      sendJson(res, 200, {
        status: 'success',
        syncedCount,
        message: `Berhasil memeriksa & mensinkronkan ${syncedCount} transaksi retur baru dari marketplace`
      });
      return true;
    } catch (err) {
      console.error('[Sync Return Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 4. POST /api/marketplace/returns/:id/restock - Terima Barang & Restok Otomatis ke Produk Master
  const restockMatch = pathname.match(/^\/api\/marketplace\/returns\/([^/]+)\/restock$/);
  if (restockMatch && req.method === 'POST') {
    try {
      const returId = decodeURIComponent(restockMatch[1]);
      const body = await parseJsonBody(req);
      const kondisiBarang = body.kondisi_barang || 'Bagus / Layak Jual (Restok)';
      const catatan = body.catatan || 'Barang telah diterima di gudang dan dikembalikan ke stok fisik';

      // Ambil data retur
      const [rows] = await pool.query('SELECT * FROM retur_barang WHERE id = ?', [returId]);
      if (rows.length === 0) {
        sendJson(res, 404, { status: 'error', message: 'Data retur tidak ditemukan' });
        return true;
      }

      const retur = rows[0];

      // Jika kondisi layak jual dan belum di-restok, tambah kembali ke stok fisik di produk_master
      let restockedItemsCount = 0;
      if (kondisiBarang.includes('Layak') || kondisiBarang.includes('Bagus') || body.do_restock === true) {
        if (!retur.sudah_restok) {
          let items = [];
          try {
            items = retur.rincian_item ? JSON.parse(retur.rincian_item) : [];
          } catch (e) {
            items = [];
          }

          for (const it of items) {
            const rawSku = String(it.sku || it.kode_sku || it.seller_sku || '').trim();
            const cleanSku = rawSku.replace(/^rsg-/i, '');
            const qty = Number(it.qty || it.quantity || 1);

            if (cleanSku && qty > 0) {
              await pool.query(`
                UPDATE produk_master 
                SET stok_fisik = stok_fisik + ? 
                WHERE kode_sku = ? OR kode_sku = ?
              `, [qty, cleanSku, rawSku]);
              restockedItemsCount += qty;
            }
          }
        }
      }

      await pool.query(`
        UPDATE retur_barang 
        SET 
          status_retur = 'Selesai (Restok)',
          kondisi_barang = ?,
          sudah_restok = 1,
          catatan = CONCAT(IFNULL(catatan, ''), '\n', ?),
          waktu_selesai = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [kondisiBarang, catatan, returId]);

      sendJson(res, 200, {
        status: 'success',
        message: `Barang retur berhasil diterima! ${restockedItemsCount > 0 ? `+${restockedItemsCount} pcs barang telah ditambahkan kembali ke stok fisik produk master.` : ''}`
      });
      return true;
    } catch (err) {
      console.error('[Restock Return Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 5. PUT & DELETE /api/marketplace/returns/:id
  const returIdMatch = pathname.match(/^\/api\/marketplace\/returns\/([^/]+)$/);
  if (returIdMatch && req.method === 'PUT') {
    try {
      const returId = decodeURIComponent(returIdMatch[1]);
      const body = await parseJsonBody(req);
      const allowed = ['status_retur', 'kondisi_barang', 'no_resi_retur', 'kurir_retur', 'alasan_retur', 'catatan', 'total_refund'];
      const sets = [];
      const values = [];

      for (const col of allowed) {
        if (body[col] !== undefined) {
          sets.push(`${col} = ?`);
          values.push(body[col]);
        }
      }

      if (sets.length === 0) {
        sendJson(res, 400, { status: 'error', message: 'Tidak ada data diperbarui' });
        return true;
      }

      values.push(returId);
      await pool.query(`UPDATE retur_barang SET ${sets.join(', ')} WHERE id = ?`, values);

      sendJson(res, 200, { status: 'success', message: 'Data retur berhasil diperbarui' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  if (returIdMatch && req.method === 'DELETE') {
    try {
      const returId = decodeURIComponent(returIdMatch[1]);
      await pool.query('DELETE FROM retur_barang WHERE id = ?', [returId]);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
