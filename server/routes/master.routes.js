import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleMasterRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. Ambil Master Produk ERP
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
      const mapped = rows.map(r => {
        let parsedBundle = [];
        if (r.bundle_items) {
          try {
            parsedBundle = typeof r.bundle_items === 'string' ? JSON.parse(r.bundle_items) : r.bundle_items;
          } catch (e) {
            parsedBundle = [];
          }
        }
        return {
          ...r,
          bundle_items: parsedBundle
        };
      });
      sendJson(res, 200, mapped);
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. Simpan / Batch Simpan ke Master Produk ERP
  if ((pathname === '/api/produk/master' || pathname === '/api/marketplace/master') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const items = Array.isArray(body) ? body : [body];
      
      if (items.length === 0) {
        sendJson(res, 200, { status: 'success', count: 0 });
        return true;
      }

      console.log(`[API Master] Menyimpan ${items.length} produk ke produk_master...`);

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
          const tipeSet = String(item.tipe_set || 'Single').slice(0, 32);
          const bundleItems = item.bundle_items ? (typeof item.bundle_items === 'string' ? item.bundle_items : JSON.stringify(item.bundle_items)) : null;
          const estimasiKain = String(item.estimasi_kain || 'Kain Polos').slice(0, 100);
          const panjangKainCm = Number(item.panjang_kain_cm) || 200;
          const hargaKainCm = Number(item.harga_kain_cm) || 150;

          values.push(kodePerusahaan, kodeSku, namaProduk, kategori, satuan, hargaJual, hargaModal, stokFisik, status, statusOrder, fotoProduk, tipeSet, bundleItems, estimasiKain, panjangKainCm, hargaKainCm);
          return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        }).join(', ');

        const sql = `
          INSERT INTO produk_master (
            kode_perusahaan, kode_sku, nama_produk, kategori, satuan,
            harga_jual, harga_modal, stok_fisik, status, status_order, foto_produk,
            tipe_set, bundle_items, estimasi_kain, panjang_kain_cm, harga_kain_cm
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
            foto_produk = COALESCE(NULLIF(VALUES(foto_produk), ''), foto_produk),
            tipe_set = VALUES(tipe_set),
            bundle_items = VALUES(bundle_items),
            estimasi_kain = VALUES(estimasi_kain),
            panjang_kain_cm = VALUES(panjang_kain_cm),
            harga_kain_cm = VALUES(harga_kain_cm)
        `;

        await pool.query(sql, values);
      }

      console.log(`[API Master] Berhasil menyimpan ${items.length} produk ke produk_master MySQL!`);
      sendJson(res, 200, { status: 'success', count: items.length });
      return true;
    } catch (err) {
      console.error('[API Master ERROR]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. Batch Update status_order Master Produk ERP
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
        sendJson(res, 200, { status: 'success', updated: items.length });
        return true;
      }

      if (Array.isArray(ids) && ids.length > 0 && status_order) {
        await pool.query('UPDATE produk_master SET status_order = ? WHERE id IN (?)', [status_order, ids]);
        sendJson(res, 200, { status: 'success', updated: ids.length });
        return true;
      }

      sendJson(res, 400, { status: 'error', message: 'Parameter ids dan status_order diperlukan' });
      return true;
    } catch (err) {
      console.error('[API Batch Status Order ERROR]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3b. Batch Update Bundle Set Master Produk ERP
  if ((pathname === '/api/produk/master/batch-bundle' || pathname === '/api/marketplace/master/batch-bundle') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { items } = body;

      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          if (it.id) {
            const tipeSet = it.tipe_set || 'Single';
            const bundleItems = it.bundle_items ? (typeof it.bundle_items === 'string' ? it.bundle_items : JSON.stringify(it.bundle_items)) : null;
            await pool.query(
              'UPDATE produk_master SET tipe_set = ?, bundle_items = ? WHERE id = ?',
              [tipeSet, bundleItems, it.id]
            );
          }
        }
        sendJson(res, 200, { status: 'success', updated: items.length });
        return true;
      }

      sendJson(res, 400, { status: 'error', message: 'Parameter items diperlukan' });
      return true;
    } catch (err) {
      console.error('[API Batch Bundle ERROR]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 4. Update / Delete Master Produk by ID
  const masterIdMatch = pathname.match(/^\/api\/(?:produk|marketplace)\/master\/([^/]+)$/);
  if (masterIdMatch && req.method === 'PUT') {
    try {
      const body = await parseJsonBody(req);
      const sets = [];
      const values = [];
      const allowed = [
        'nama_produk', 'kategori', 'satuan', 'harga_jual', 'harga_modal',
        'stok_fisik', 'status', 'status_order', 'kode_sku', 'kode_perusahaan',
        'tipe_set', 'bundle_items', 'estimasi_kain', 'panjang_kain_cm', 'harga_kain_cm'
      ];
      for (const col of allowed) {
        if (body[col] !== undefined) {
          sets.push(`${col} = ?`);
          if (col === 'bundle_items' && typeof body[col] === 'object' && body[col] !== null) {
            values.push(JSON.stringify(body[col]));
          } else {
            values.push(body[col]);
          }
        }
      }
      if (sets.length === 0) {
        sendJson(res, 400, { status: 'error', message: 'Tidak ada data diubah' });
        return true;
      }
      values.push(masterIdMatch[1]);
      await pool.query(`UPDATE produk_master SET ${sets.join(', ')} WHERE id = ?`, values);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  if (masterIdMatch && req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM produk_master WHERE id = ?', [masterIdMatch[1]]);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
