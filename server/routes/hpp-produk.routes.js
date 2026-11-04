import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleHPPProdukRoutes(req, res, pathname, urlObj, { pool, laravelPool }) {
  // 0a. GET /api/hpp-produk/breakdown - Ambil rincian detail pembentuk HPP produk (Kain + Jasa Jahit/Konveksi)
  if ((pathname === '/api/hpp-produk/breakdown' || pathname === '/api/marketplace/hpp-produk/breakdown') && req.method === 'GET') {
    try {
      const produkId = urlObj.searchParams.get('produk_id');
      const sku = urlObj.searchParams.get('sku');
      const namaProduk = urlObj.searchParams.get('nama_produk');

      let sql = `
        SELECT 
          p.*,
          k.nama_kain,
          k.harga_per_meter as kain_harga_meter,
          h.nama_kategori_hpp,
          h.total_hpp as hpp_kategori
        FROM produk_master p
        LEFT JOIN master_kain k ON p.sku_kain = k.kode_sku_kain
        LEFT JOIN master_hpp_produk h ON p.id_kategori_hpp = h.id_kategori_hpp
        WHERE 1=0
      `;
      const params = [];
      if (produkId && Number(produkId) > 0) {
        sql += ' OR p.id = ?';
        params.push(Number(produkId));
      }
      if (sku && sku.trim()) {
        const cleanSku = sku.trim();
        sql += ' OR p.kode_sku = ? OR p.kode_sku = ? OR p.kode_sku = ?';
        params.push(cleanSku, cleanSku.replace(/^RSG-|^PO-/gi, ''), `RSG-${cleanSku}`);
      }
      if (namaProduk && namaProduk.trim()) {
        sql += ' OR LOWER(TRIM(p.nama_produk)) = LOWER(TRIM(?))';
        params.push(namaProduk.trim());
      }
      sql += ' LIMIT 1';

      const [rows] = await pool.query(sql, params);
      let prod = rows && rows.length > 0 ? rows[0] : null;

      // Fallback data jika produk belum terdaftar di produk_master
      if (!prod) {
        prod = {
          id: produkId || 0,
          kode_sku: sku || 'PRODUK',
          nama_produk: namaProduk || 'Produk Konveksi',
          harga_modal: 0,
          estimasi_kain: '200',
          sku_kain: 'K-DRILL-UON',
          nama_kain: 'Kain Drill Unione',
          kain_harga_meter: 25000,
          id_kategori_hpp: 'HPP-UMUM',
          nama_kategori_hpp: 'HPP Konveksi Pakaian'
        };
      }

      // 1. Hitung Komponen Kain
      const rawEst = prod.estimasi_kain ? String(prod.estimasi_kain) : '200';
      const numMatch = rawEst.match(/([0-9]+(\.[0-9]+)?)/);
      const panjangKainCm = numMatch ? Math.round(parseFloat(numMatch[1])) : 200;
      const hargaMeter = Number(prod.kain_harga_meter || 0);
      const hargaKainCm = hargaMeter > 0 ? Math.round(hargaMeter / 100) : 150;
      const subtotalKain = Math.round(panjangKainCm * hargaKainCm);

      // 2. Ambil Rincian Detail Jasa Konveksi
      let jasaDetails = [];
      if (prod.id_kategori_hpp) {
        const [dRows] = await pool.query(
          'SELECT * FROM detail_master_hpp_produk WHERE id_kategori_hpp = ? ORDER BY id ASC',
          [prod.id_kategori_hpp]
        );
        if (dRows && dRows.length > 0) {
          jasaDetails = dRows.map(d => ({
            id: d.id,
            nama_jasa: d.nama_jasa,
            jumlah: Number(d.jumlah || 1),
            harga: Number(d.harga || 0),
            total: Number(d.total || (Number(d.jumlah || 1) * Number(d.harga || 0)))
          }));
        }
      }

      // Default jasa items jika belum ada di database
      if (jasaDetails.length === 0) {
        jasaDetails = [
          { nama_jasa: 'Jasa Potong Pola', jumlah: 1, harga: 2000, total: 2000 },
          { nama_jasa: 'Jasa Jahit & Obras', jumlah: 1, harga: 7500, total: 7500 },
          { nama_jasa: 'Finishing & Pasang Kancing', jumlah: 1, harga: 1500, total: 1500 },
          { nama_jasa: 'BOP & Kemasan Plastik/Label', jumlah: 1, harga: 2000, total: 2000 }
        ];
      }

      const totalBiayaJasa = jasaDetails.reduce((sum, it) => sum + Number(it.total || 0), 0);
      const kalkulasiHpp = subtotalKain + totalBiayaJasa;
      const actualHpp = Number(prod.harga_modal || kalkulasiHpp || 0);

      // Daftar opsi kain dari master_kain untuk dropdown
      const [allKain] = await pool.query('SELECT kode_sku_kain, nama_kain, harga_per_meter FROM master_kain ORDER BY nama_kain ASC').catch(() => [[]]);
      const [allHppKat] = await pool.query('SELECT id_kategori_hpp, nama_kategori_hpp, total_hpp FROM master_hpp_produk ORDER BY nama_kategori_hpp ASC').catch(() => [[]]);

      sendJson(res, 200, {
        status: 'success',
        data: {
          produk: {
            id: prod.id,
            sku: prod.kode_sku,
            nama_produk: prod.nama_produk,
            kategori: prod.kategori || 'Pakaian',
            harga_modal: actualHpp,
            harga_jual: Number(prod.harga_jual || 0),
            id_kategori_hpp: prod.id_kategori_hpp,
            nama_kategori_hpp: prod.nama_kategori_hpp
          },
          kain: {
            sku_kain: prod.sku_kain || 'Kain',
            nama_kain: prod.nama_kain || prod.sku_kain || 'Kain',
            panjang_kain_cm: panjangKainCm,
            harga_kain_cm: hargaKainCm,
            harga_per_meter: hargaMeter > 0 ? hargaMeter : (hargaKainCm * 100),
            subtotal_kain: subtotalKain
          },
          jasa_details: jasaDetails,
          total_biaya_kain: subtotalKain,
          total_biaya_jasa: totalBiayaJasa,
          kalkulasi_hpp: kalkulasiHpp,
          harga_modal_actual: actualHpp,
          pilihan_kain: allKain || [],
          pilihan_kategori_hpp: allHppKat || []
        }
      });
      return true;
    } catch (err) {
      console.error('[HPP Breakdown GET Error]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 0b. POST /api/hpp-produk/update-breakdown - Simpan & Otomatis Update HPP ke Master Produk
  if ((pathname === '/api/hpp-produk/update-breakdown' || pathname === '/api/marketplace/hpp-produk/update-breakdown') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data update tidak boleh kosong' });
        return true;
      }

      const {
        produk_id,
        sku,
        harga_modal,
        panjang_kain_cm,
        sku_kain,
        id_kategori_hpp,
        nama_kategori_hpp,
        jasa_details = [],
        update_master_produk = true
      } = body;

      const finalHpp = Number(harga_modal || 0);
      const cleanSku = String(sku || '').trim();
      const numCm = Number(panjang_kain_cm || 0);
      const cleanEstKain = numCm > 0 ? String(numCm) : null;
      const cleanSkuKain = sku_kain ? String(sku_kain).trim() : null;

      // 1. Buat / Update Kategori HPP & Rincian Detail Jasa jika ada
      let finalIdKatHpp = id_kategori_hpp;
      if (!finalIdKatHpp && cleanSku) {
        finalIdKatHpp = `HPP-${cleanSku.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30)}`;
      }

      if (Array.isArray(jasa_details) && jasa_details.length > 0 && finalIdKatHpp) {
        const totalJasa = jasa_details.reduce((s, it) => s + (Number(it.total) || (Number(it.jumlah || 1) * Number(it.harga || 0))), 0);
        const katNama = nama_kategori_hpp || `HPP ${cleanSku || 'Produk'}`;

        await pool.query(
          `INSERT INTO master_hpp_produk (
            kode_perusahaan, id_kategori_hpp, nama_kategori_hpp, total_hpp, status
          ) VALUES ('RSG', ?, ?, ?, 'Aktif')
          ON DUPLICATE KEY UPDATE
            nama_kategori_hpp = VALUES(nama_kategori_hpp),
            total_hpp = VALUES(total_hpp)`,
          [finalIdKatHpp, katNama, totalJasa]
        );

        await pool.query('DELETE FROM detail_master_hpp_produk WHERE id_kategori_hpp = ?', [finalIdKatHpp]);
        for (const item of jasa_details) {
          const namaJasa = (item.nama_jasa || '').trim();
          if (!namaJasa) continue;
          const jumlah = Number(item.jumlah) || 1;
          const harga = Number(item.harga) || 0;
          const total = Number(item.total) || (jumlah * harga);

          await pool.query(
            `INSERT INTO detail_master_hpp_produk (
              id_kategori_hpp, nama_jasa, jumlah, harga, total
            ) VALUES (?, ?, ?, ?, ?)`,
            [finalIdKatHpp, namaJasa, jumlah, harga, total]
          );
        }
      }

      // 2. Update Otomatis ke produk_master (ruangmarket)
      let affected = 0;
      if (update_master_produk) {
        const updateParams = [finalHpp];
        let setClauses = ['harga_modal = ?'];

        if (cleanEstKain) {
          setClauses.push('estimasi_kain = ?');
          updateParams.push(cleanEstKain);
        }
        if (cleanSkuKain) {
          setClauses.push('sku_kain = ?');
          updateParams.push(cleanSkuKain);
        }
        if (finalIdKatHpp) {
          setClauses.push('id_kategori_hpp = ?');
          updateParams.push(finalIdKatHpp);
        }

        let whereClause = '';
        if (produkId && Number(produkId) > 0) {
          whereClause = 'id = ?';
          updateParams.push(Number(produkId));
        } else if (cleanSku) {
          whereClause = 'kode_sku = ? OR kode_sku = ?';
          updateParams.push(cleanSku, cleanSku.replace(/^RSG-|^PO-/gi, ''));
        }

        if (whereClause) {
          const [resUpd] = await pool.query(
            `UPDATE produk_master SET ${setClauses.join(', ')} WHERE ${whereClause}`,
            updateParams
          );
          affected = resUpd.affectedRows || 0;
        }

        // 3. Sinkronkan juga ke database Laravel jika terhubung
        if (laravelPool && cleanSku) {
          try {
            await laravelPool.query(
              'UPDATE master_products SET cost_price = ?, est_biaya_produksi = ? WHERE sku = ? OR sku = ?',
              [finalHpp, finalHpp, cleanSku, cleanSku.replace(/^RSG-|^PO-/gi, '')]
            );
          } catch (eLar) {
            console.warn('[HPP Sync to Laravel Warning]:', eLar.message);
          }
        }
      }

      sendJson(res, 200, {
        status: 'success',
        message: `HPP Rp ${finalHpp.toLocaleString('id-ID')} berhasil disimpan & disinkronkan ke Master Produk!`,
        data: {
          produk_id,
          sku: cleanSku,
          harga_modal: finalHpp,
          panjang_kain_cm: numCm,
          sku_kain: cleanSkuKain,
          id_kategori_hpp: finalIdKatHpp,
          updated_master: affected > 0
        }
      });
      return true;
    } catch (err) {
      console.error('[HPP Breakdown Update Error]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 1. GET /api/hpp-produk - Ambil semua master HPP beserta rincian detailnya
  if ((pathname === '/api/hpp-produk' || pathname === '/api/marketplace/hpp-produk') && req.method === 'GET') {
    try {
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      const idKategori = urlObj.searchParams.get('id_kategori_hpp');

      // Ambil single item jika id_kategori_hpp disertakan
      if (idKategori) {
        const [headers] = await pool.query(
          'SELECT * FROM master_hpp_produk WHERE id_kategori_hpp = ? LIMIT 1',
          [idKategori]
        );
        if (headers.length === 0) {
          sendJson(res, 404, { status: 'error', message: 'Kategori HPP tidak ditemukan' });
          return true;
        }
        const [details] = await pool.query(
          'SELECT * FROM detail_master_hpp_produk WHERE id_kategori_hpp = ? ORDER BY id ASC',
          [idKategori]
        );
        sendJson(res, 200, { status: 'success', data: { ...headers[0], details } });
        return true;
      }

      const pageParam = urlObj.searchParams.get('page');
      const limitParam = urlObj.searchParams.get('limit') || urlObj.searchParams.get('entriesPerPage');
      const search = urlObj.searchParams.get('search');
      const status = urlObj.searchParams.get('status');

      const isPaginated = pageParam !== null || limitParam !== null;
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.max(1, Math.min(200, parseInt(limitParam, 10) || 50));
      const offset = (page - 1) * limit;

      const whereClauses = [];
      const whereParams = [];

      if (kodePerusahaan && kodePerusahaan !== 'ALL') {
        whereClauses.push('(kode_perusahaan = ? OR kode_perusahaan = "RSG" OR kode_perusahaan IS NULL)');
        whereParams.push(kodePerusahaan);
      }
      if (status && status !== 'Semua') {
        whereClauses.push('status = ?');
        whereParams.push(status);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        whereClauses.push('(id_kategori_hpp LIKE ? OR nama_kategori_hpp LIKE ? OR keterangan LIKE ?)');
        whereParams.push(q, q, q);
      }

      const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

      let total = 0;
      if (isPaginated) {
        const [[countRow]] = await pool.query(`SELECT COUNT(*) as total FROM master_hpp_produk ${whereSql}`, whereParams);
        total = Number(countRow?.total || 0);
      }

      // Ambil list master HPP
      let sql = `SELECT * FROM master_hpp_produk ${whereSql} ORDER BY id DESC`;
      let queryParams = [...whereParams];
      if (isPaginated) {
        sql += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);
      }
      const [rows] = await pool.query(sql, queryParams);

      // Ambil detail items untuk kategori yang di-load
      const detailsMap = {};
      const categoryIds = rows.map(r => r.id_kategori_hpp).filter(Boolean);
      if (categoryIds.length > 0) {
        const [details] = await pool.query(
          `SELECT * FROM detail_master_hpp_produk WHERE id_kategori_hpp IN (${categoryIds.map(() => '?').join(',')}) ORDER BY id ASC`,
          categoryIds
        );
        for (const d of details) {
          if (!detailsMap[d.id_kategori_hpp]) detailsMap[d.id_kategori_hpp] = [];
          detailsMap[d.id_kategori_hpp].push(d);
        }
      }

      const combined = rows.map(r => ({
        ...r,
        details: detailsMap[r.id_kategori_hpp] || []
      }));

      if (isPaginated) {
        sendJson(res, 200, {
          status: 'success',
          data: combined,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          }
        });
      } else {
        sendJson(res, 200, { status: 'success', data: combined });
      }
      return true;
    } catch (err) {
      console.error('[HPP Produk API GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/hpp-produk - Tambah / Edit master HPP beserta details
  if ((pathname === '/api/hpp-produk' || pathname === '/api/marketplace/hpp-produk') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }

      const {
        id,
        kode_perusahaan,
        id_kategori_hpp,
        nama_kategori_hpp,
        keterangan,
        status,
        details = []
      } = body;

      const company = kode_perusahaan || 'RSG';
      const nama = (nama_kategori_hpp || '').trim();
      const idKat = (id_kategori_hpp || `HPP-${Date.now().toString().slice(-6)}`).trim();
      const statusHpp = status || 'Aktif';
      const ket = keterangan || '';

      if (!nama) {
        sendJson(res, 400, { status: 'error', message: 'Nama kategori HPP wajib diisi' });
        return true;
      }

      // Hitung total_hpp dari details
      let totalHpp = 0;
      if (Array.isArray(details)) {
        totalHpp = details.reduce((sum, item) => sum + (Number(item.total) || (Number(item.jumlah || 1) * Number(item.harga || 0))), 0);
      }

      // 1. Simpan Header
      if (id && Number(id) > 0) {
        await pool.query(
          `UPDATE master_hpp_produk SET
            kode_perusahaan = ?,
            id_kategori_hpp = ?,
            nama_kategori_hpp = ?,
            keterangan = ?,
            total_hpp = ?,
            status = ?
          WHERE id = ?`,
          [company, idKat, nama, ket, totalHpp, statusHpp, id]
        );
      } else {
        await pool.query(
          `INSERT INTO master_hpp_produk (
            kode_perusahaan, id_kategori_hpp, nama_kategori_hpp, keterangan, total_hpp, status
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_kategori_hpp = VALUES(nama_kategori_hpp),
            keterangan = VALUES(keterangan),
            total_hpp = VALUES(total_hpp),
            status = VALUES(status)`,
          [company, idKat, nama, ket, totalHpp, statusHpp]
        );
      }

      // 2. Simpan Detail Items (Hapus yang lama lalu masukkan yang baru)
      await pool.query('DELETE FROM detail_master_hpp_produk WHERE id_kategori_hpp = ?', [idKat]);
      if (Array.isArray(details) && details.length > 0) {
        for (const item of details) {
          const namaJasa = (item.nama_jasa || '').trim();
          if (!namaJasa) continue;
          const jumlah = Number(item.jumlah) || 1;
          const harga = Number(item.harga) || 0;
          const total = Number(item.total) || (jumlah * harga);

          await pool.query(
            `INSERT INTO detail_master_hpp_produk (
              id_kategori_hpp, nama_jasa, jumlah, harga, total
            ) VALUES (?, ?, ?, ?, ?)`,
            [idKat, namaJasa, jumlah, harga, total]
          );
        }
      }

      sendJson(res, 200, {
        status: 'success',
        message: 'Master HPP & rincian detail berhasil disimpan',
        id_kategori_hpp: idKat,
        total_hpp: totalHpp
      });
      return true;
    } catch (err) {
      console.error('[HPP Produk API POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. DELETE /api/hpp-produk - Hapus Master HPP beserta details
  if ((pathname === '/api/hpp-produk' || pathname === '/api/marketplace/hpp-produk') && req.method === 'DELETE') {
    try {
      const idKategori = urlObj.searchParams.get('id_kategori_hpp');
      const id = urlObj.searchParams.get('id');

      if (idKategori) {
        await pool.query('DELETE FROM master_hpp_produk WHERE id_kategori_hpp = ?', [idKategori]);
        await pool.query('DELETE FROM detail_master_hpp_produk WHERE id_kategori_hpp = ?', [idKategori]);
      } else if (id) {
        const [rows] = await pool.query('SELECT id_kategori_hpp FROM master_hpp_produk WHERE id = ?', [id]);
        if (rows.length > 0) {
          await pool.query('DELETE FROM detail_master_hpp_produk WHERE id_kategori_hpp = ?', [rows[0].id_kategori_hpp]);
        }
        await pool.query('DELETE FROM master_hpp_produk WHERE id = ?', [id]);
      } else {
        sendJson(res, 400, { status: 'error', message: 'Parameter id atau id_kategori_hpp diperlukan' });
        return true;
      }

      sendJson(res, 200, { status: 'success', message: 'Master HPP & details berhasil dihapus' });
      return true;
    } catch (err) {
      console.error('[HPP Produk API DELETE Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
