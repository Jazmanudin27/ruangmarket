import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleMasterRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. Ambil Master Produk ERP
  if ((pathname === '/api/produk/master' || pathname === '/api/marketplace/master') && req.method === 'GET') {
    try {
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      const pageParam = urlObj.searchParams.get('page');
      const limitParam = urlObj.searchParams.get('limit') || urlObj.searchParams.get('entriesPerPage');
      const search = urlObj.searchParams.get('search');
      const kategori = urlObj.searchParams.get('kategori');
      const tipeSet = urlObj.searchParams.get('tipe_set');
      const statusOrder = urlObj.searchParams.get('status_order');
      const status = urlObj.searchParams.get('status');

      const tabParam = urlObj.searchParams.get('tab');

      // Jika ada param page atau limit, aktifkan server pagination
      const isPaginated = pageParam !== null || limitParam !== null;
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.max(1, Math.min(200, parseInt(limitParam, 10) || 50));
      const offset = (page - 1) * limit;

      const whereClauses = [];
      const whereParams = [];

      if (kodePerusahaan) {
        whereClauses.push('p.kode_perusahaan = ?');
        whereParams.push(kodePerusahaan);
      }
      if (kategori && kategori !== 'Semua') {
        whereClauses.push('p.kategori = ?');
        whereParams.push(kategori);
      }
      if (tipeSet && tipeSet !== 'Semua') {
        whereClauses.push('p.tipe_set = ?');
        whereParams.push(tipeSet);
      }
      if (statusOrder && statusOrder !== 'Semua') {
        whereClauses.push('p.status_order = ?');
        whereParams.push(statusOrder);
      }
      if (status && status !== 'Semua') {
        whereClauses.push('p.status = ?');
        whereParams.push(status);
      }
      const skuKainParam = urlObj.searchParams.get('sku_kain');
      if (skuKainParam && skuKainParam !== 'Semua') {
        whereClauses.push('p.sku_kain = ?');
        whereParams.push(skuKainParam);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        whereClauses.push('(p.nama_produk LIKE ? OR p.kode_sku LIKE ? OR p.sku_kain LIKE ? OR k.nama_kain LIKE ?)');
        whereParams.push(q, q, q, q);
      }

      // Filter berdasarkan Tab aktif
      if (tabParam === 'tersedia') {
        whereClauses.push('p.stok_fisik > 5');
      } else if (tabParam === 'menipis') {
        whereClauses.push('(p.stok_fisik > 0 AND p.stok_fisik <= 5)');
      } else if (tabParam === 'habis') {
        whereClauses.push('(p.stok_fisik <= 0 OR p.stok_fisik IS NULL)');
      } else if (tabParam === 'po') {
        whereClauses.push("p.status_order = 'PO'");
      } else if (tabParam === 'ready') {
        whereClauses.push("(p.status_order != 'PO' OR p.status_order IS NULL)");
      }

      const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

      // Hitung total data untuk halaman aktif
      let total = 0;
      if (isPaginated) {
        const countSql = `
          SELECT COUNT(*) as total 
          FROM produk_master p 
          LEFT JOIN master_kain k ON p.sku_kain = k.kode_sku_kain
          ${whereSql}
        `;
        const [[countRow]] = await pool.query(countSql, whereParams);
        total = Number(countRow?.total || 0);
      }

      // Hitung tab summary counts keseluruhan (Semua, Tersedia, Menipis, Habis, PO, Ready)
      let tabCounts = { semua: 0, tersedia: 0, menipis: 0, habis: 0, po: 0, ready: 0 };
      if (isPaginated) {
        const baseWhereClauses = [];
        const baseWhereParams = [];
        if (kodePerusahaan) {
          baseWhereClauses.push('p.kode_perusahaan = ?');
          baseWhereParams.push(kodePerusahaan);
        }
        if (kategori && kategori !== 'Semua') {
          baseWhereClauses.push('p.kategori = ?');
          baseWhereParams.push(kategori);
        }
        if (tipeSet && tipeSet !== 'Semua') {
          baseWhereClauses.push('p.tipe_set = ?');
          baseWhereParams.push(tipeSet);
        }
        if (skuKainParam && skuKainParam !== 'Semua') {
          baseWhereClauses.push('p.sku_kain = ?');
          baseWhereParams.push(skuKainParam);
        }
        if (search && search.trim()) {
          const q = `%${search.trim()}%`;
          baseWhereClauses.push('(p.nama_produk LIKE ? OR p.kode_sku LIKE ? OR p.sku_kain LIKE ? OR k.nama_kain LIKE ?)');
          baseWhereParams.push(q, q, q, q);
        }
        const baseWhereSql = baseWhereClauses.length > 0 ? ` WHERE ${baseWhereClauses.join(' AND ')}` : '';
        const [[countsRow]] = await pool.query(`
          SELECT 
            COUNT(*) as total_semua,
            SUM(CASE WHEN p.stok_fisik > 5 THEN 1 ELSE 0 END) as total_tersedia,
            SUM(CASE WHEN p.stok_fisik > 0 AND p.stok_fisik <= 5 THEN 1 ELSE 0 END) as total_menipis,
            SUM(CASE WHEN p.stok_fisik <= 0 OR p.stok_fisik IS NULL THEN 1 ELSE 0 END) as total_habis,
            SUM(CASE WHEN p.status_order = 'PO' THEN 1 ELSE 0 END) as total_po,
            SUM(CASE WHEN p.status_order != 'PO' OR p.status_order IS NULL THEN 1 ELSE 0 END) as total_ready
          FROM produk_master p
          LEFT JOIN master_kain k ON p.sku_kain = k.kode_sku_kain
          ${baseWhereSql}
        `, baseWhereParams);

        if (countsRow) {
          tabCounts = {
            semua: Number(countsRow.total_semua || 0),
            tersedia: Number(countsRow.total_tersedia || 0),
            menipis: Number(countsRow.total_menipis || 0),
            habis: Number(countsRow.total_habis || 0),
            po: Number(countsRow.total_po || 0),
            ready: Number(countsRow.total_ready || 0)
          };
        }
      }

      let sql = `
        SELECT 
          p.*,
          k.nama_kain,
          k.jenis_kain,
          k.warna as warna_kain,
          k.satuan as satuan_kain,
          k.stok_kain,
          k.harga_per_meter as harga_kain_meter,
          h.nama_kategori_hpp,
          h.total_hpp as hpp_kategori
        FROM produk_master p
        LEFT JOIN master_kain k ON p.sku_kain = k.kode_sku_kain
        LEFT JOIN master_hpp_produk h ON p.id_kategori_hpp = h.id_kategori_hpp
        ${whereSql}
        ORDER BY p.id DESC
      `;

      let queryParams = [...whereParams];
      if (isPaginated) {
        sql += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);
      }

      const [rows] = await pool.query(sql, queryParams);
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

      if (isPaginated) {
        sendJson(res, 200, {
          status: 'success',
          data: mapped,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          },
          counts: tabCounts
        });
      } else {
        sendJson(res, 200, mapped);
      }
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
          const idKategoriHpp = item.id_kategori_hpp ? String(item.id_kategori_hpp).slice(0, 64) : null;
          const skuKain = item.sku_kain ? String(item.sku_kain).slice(0, 64) : null;

          values.push(kodePerusahaan, kodeSku, namaProduk, kategori, satuan, hargaJual, hargaModal, stokFisik, status, statusOrder, fotoProduk, tipeSet, bundleItems, estimasiKain, panjangKainCm, hargaKainCm, idKategoriHpp, skuKain);
          return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        }).join(', ');

        const sql = `
          INSERT INTO produk_master (
            kode_perusahaan, kode_sku, nama_produk, kategori, satuan,
            harga_jual, harga_modal, stok_fisik, status, status_order, foto_produk,
            tipe_set, bundle_items, estimasi_kain, panjang_kain_cm, harga_kain_cm, id_kategori_hpp, sku_kain
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
            harga_kain_cm = VALUES(harga_kain_cm),
            id_kategori_hpp = VALUES(id_kategori_hpp),
            sku_kain = COALESCE(VALUES(sku_kain), sku_kain)
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
        'tipe_set', 'bundle_items', 'estimasi_kain', 'panjang_kain_cm', 'harga_kain_cm',
        'id_kategori_hpp', 'sku_kain'
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
