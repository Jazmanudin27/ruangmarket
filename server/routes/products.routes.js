import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleProductsRoutes(req, res, pathname, urlObj, { pool, shopeeService, tiktokService }) {
  // 1. API Ambil Data Produk Marketplace Staging dari MySQL
  if (pathname === '/api/marketplace/products' && req.method === 'GET') {
    try {
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      const pageParam = urlObj.searchParams.get('page');
      const limitParam = urlObj.searchParams.get('limit') || urlObj.searchParams.get('entriesPerPage');
      const search = urlObj.searchParams.get('search');
      const channel = urlObj.searchParams.get('channel');
      const mapping = urlObj.searchParams.get('mapping'); // 'Belum Dimapping' | 'Sudah Dimapping'

      const isPaginated = pageParam !== null || limitParam !== null;
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.max(1, Math.min(200, parseInt(limitParam, 10) || 50));
      const offset = (page - 1) * limit;

      const whereClauses = [];
      const whereParams = [];

      if (kodePerusahaan) {
        whereClauses.push('(pm.kode_perusahaan IS NULL OR pm.kode_perusahaan = ?)');
        whereParams.push(kodePerusahaan);
      }
      if (channel && channel !== 'Semua') {
        whereClauses.push('pm.saluran = ?');
        whereParams.push(channel);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        whereClauses.push('(pm.nama_produk LIKE ? OR pm.sku_marketplace LIKE ? OR pm.nama_toko LIKE ? OR pm.varian LIKE ?)');
        whereParams.push(q, q, q, q);
      }

      const tabParam = urlObj.searchParams.get('tab');

      let havingClauses = [];
      if (mapping === 'Belum Dimapping' || tabParam === 'belum_dimapping') {
        havingClauses.push("status = 'Belum Dimapping'");
      } else if (mapping === 'Sudah Dimapping' || tabParam === 'sudah_dimapping') {
        havingClauses.push("status = 'Sudah di Master'");
      }

      if (tabParam === 'tersedia') {
        whereClauses.push('CAST(pm.stok_marketplace AS SIGNED) > 0');
      } else if (tabParam === 'habis') {
        whereClauses.push('(CAST(pm.stok_marketplace AS SIGNED) <= 0 OR pm.stok_marketplace IS NULL)');
      }

      const havingSql = havingClauses.length > 0 ? ` HAVING ${havingClauses.join(' AND ')}` : '';
      const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

      // Hitung total jika dipaginasi
      let total = 0;
      if (isPaginated) {
        const countSql = `
          SELECT COUNT(*) as total FROM (
            SELECT 
              pm.id,
              CASE 
                WHEN m.id IS NOT NULL THEN 'Sudah di Master'
                WHEN m2.id IS NOT NULL THEN 'Sudah di Master'
                ELSE 'Belum Dimapping'
              END as status
            FROM produk_marketplace pm
            LEFT JOIN produk_master m 
              ON m.kode_sku = pm.sku_marketplace AND m.kode_sku != ''
            LEFT JOIN produk_master m2 
              ON m2.kode_sku = CONCAT(IFNULL(pm.kode_perusahaan, 'RSG'), '-', pm.sku_marketplace) AND pm.sku_marketplace != ''
            ${whereSql}
            ${havingSql}
          ) sub
        `;
        const [[countRow]] = await pool.query(countSql, whereParams);
        total = Number(countRow?.total || 0);
      }

      let sql = `
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
        ${whereSql}
        ${havingSql}
        ORDER BY pm.ditarik_pada DESC
      `;

      let queryParams = [...whereParams];
      if (isPaginated) {
        sql += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);
      }

      // Hitung tab summary counts keseluruhan marketplace
      let tabCounts = { semua: 0, belum_dimapping: 0, sudah_dimapping: 0, tersedia: 0, habis: 0 };
      if (isPaginated) {
        const baseWhereClauses = [];
        const baseWhereParams = [];
        if (kodePerusahaan) {
          baseWhereClauses.push('(pm.kode_perusahaan IS NULL OR pm.kode_perusahaan = ?)');
          baseWhereParams.push(kodePerusahaan);
        }
        if (channel && channel !== 'Semua') {
          baseWhereClauses.push('pm.saluran = ?');
          baseWhereParams.push(channel);
        }
        if (search && search.trim()) {
          const q = `%${search.trim()}%`;
          baseWhereClauses.push('(pm.nama_produk LIKE ? OR pm.sku_marketplace LIKE ? OR pm.nama_toko LIKE ? OR pm.varian LIKE ?)');
          baseWhereParams.push(q, q, q, q);
        }
        const baseWhereSql = baseWhereClauses.length > 0 ? ` WHERE ${baseWhereClauses.join(' AND ')}` : '';
        const [[mktCountsRow]] = await pool.query(`
          SELECT 
            COUNT(*) as total_semua,
            SUM(CASE WHEN (m.id IS NOT NULL OR m2.id IS NOT NULL) THEN 1 ELSE 0 END) as total_sudah_dimapping,
            SUM(CASE WHEN (m.id IS NULL AND m2.id IS NULL) THEN 1 ELSE 0 END) as total_belum_dimapping,
            SUM(CASE WHEN CAST(pm.stok_marketplace AS SIGNED) > 0 THEN 1 ELSE 0 END) as total_tersedia,
            SUM(CASE WHEN CAST(pm.stok_marketplace AS SIGNED) <= 0 OR pm.stok_marketplace IS NULL THEN 1 ELSE 0 END) as total_habis
          FROM produk_marketplace pm
          LEFT JOIN produk_master m 
            ON m.kode_sku = pm.sku_marketplace AND m.kode_sku != ''
          LEFT JOIN produk_master m2 
            ON m2.kode_sku = CONCAT(IFNULL(pm.kode_perusahaan, 'RSG'), '-', pm.sku_marketplace) AND pm.sku_marketplace != ''
          ${baseWhereSql}
        `, baseWhereParams);

        if (mktCountsRow) {
          tabCounts = {
            semua: Number(mktCountsRow.total_semua || 0),
            belum_dimapping: Number(mktCountsRow.total_belum_dimapping || 0),
            sudah_dimapping: Number(mktCountsRow.total_sudah_dimapping || 0),
            tersedia: Number(mktCountsRow.total_tersedia || 0),
            habis: Number(mktCountsRow.total_habis || 0)
          };
        }
      }

      const [rows] = await pool.query(sql, queryParams);
      if (isPaginated) {
        sendJson(res, 200, {
          status: 'success',
          data: rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          },
          counts: tabCounts
        });
      } else {
        sendJson(res, 200, { status: 'success', data: rows });
      }
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. Update / Hapus satu produk marketplace staging
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
        sendJson(res, 400, { status: 'error', message: 'Tidak ada field yang diubah' });
        return true;
      }
      values.push(productIdMatch[1]);
      const [result] = await pool.query(`UPDATE produk_marketplace SET ${sets.join(', ')} WHERE id = ?`, values);
      if (result.affectedRows === 0) {
        sendJson(res, 404, { status: 'error', message: 'Produk tidak ditemukan' });
        return true;
      }
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  if (productIdMatch && req.method === 'DELETE') {
    try {
      const [result] = await pool.query('DELETE FROM produk_marketplace WHERE id = ?', [productIdMatch[1]]);
      if (result.affectedRows === 0) {
        sendJson(res, 404, { status: 'error', message: 'Produk tidak ditemukan' });
        return true;
      }
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. Batch Update Status Produk Marketplace
  if (pathname === '/api/marketplace/products/batch-status' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { ids, status } = body;
      if (!Array.isArray(ids) || ids.length === 0 || !status) {
        sendJson(res, 400, { status: 'error', message: 'Parameter ids (array) dan status wajib diisi' });
        return true;
      }
      await pool.query('UPDATE produk_marketplace SET status_mapping = ? WHERE id IN (?)', [status, ids]);
      sendJson(res, 200, { status: 'success', count: ids.length });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 4. Shopee Products Sync API
  if (pathname === '/api/marketplace/shopee/products' && req.method === 'GET') {
    const shopId = urlObj.searchParams.get('shop_id') || '1030191310';
    let accessToken = urlObj.searchParams.get('access_token');
    const limit = parseInt(urlObj.searchParams.get('limit')) || 100;

    try {
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

      sendJson(res, 200, {
        status: 'success',
        count: products.length,
        data: products
      });
      return true;
    } catch (err) {
      console.error('[Shopee Sync Error]:', err.message);
      sendJson(res, 400, {
        status: 'error',
        message: err.message
      });
      return true;
    }
  }

  // 5. TikTok Products Sync API
  if (pathname === '/api/marketplace/tiktok/products' && req.method === 'GET') {
    let accessToken = urlObj.searchParams.get('access_token');
    let shopCipher = urlObj.searchParams.get('shop_cipher');

    try {
      if (!accessToken || !shopCipher) {
        const [rows] = await pool.query("SELECT token_akses, cipher_toko FROM toko_marketplace WHERE saluran = 'tiktok' LIMIT 1");
        if (rows.length > 0) {
          accessToken = accessToken || rows[0].token_akses;
          shopCipher = shopCipher || rows[0].cipher_toko;
        }
      }

      shopCipher = shopCipher || 'ROW_Hbd_fAAAAACqX58asQX4uCOsoefXXn4c';

      if (!accessToken) {
        sendJson(res, 400, { status: 'error', message: 'Token akses TikTok tidak ditemukan di database' });
        return true;
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

      sendJson(res, 200, {
        status: 'success',
        count: products.length,
        data: products
      });
      return true;
    } catch (err) {
      console.error('[TikTok Sync Error]:', err.message);
      sendJson(res, 400, {
        status: 'error',
        message: err.message
      });
      return true;
    }
  }

  return false;
}
