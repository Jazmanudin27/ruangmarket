import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleHPPProdukRoutes(req, res, pathname, urlObj, { pool }) {
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

      // Ambil seluruh list master HPP
      let sql = 'SELECT * FROM master_hpp_produk';
      const params = [];
      if (kodePerusahaan && kodePerusahaan !== 'ALL') {
        sql += ' WHERE (kode_perusahaan = ? OR kode_perusahaan = "RSG" OR kode_perusahaan IS NULL)';
        params.push(kodePerusahaan);
      }
      sql += ' ORDER BY id DESC';
      const [rows] = await pool.query(sql, params);

      // Ambil seluruh detail items sekaligus
      const [allDetails] = await pool.query('SELECT * FROM detail_master_hpp_produk ORDER BY id ASC');
      const detailsMap = {};
      for (const d of allDetails) {
        if (!detailsMap[d.id_kategori_hpp]) detailsMap[d.id_kategori_hpp] = [];
        detailsMap[d.id_kategori_hpp].push(d);
      }

      const combined = rows.map(r => ({
        ...r,
        details: detailsMap[r.id_kategori_hpp] || []
      }));

      sendJson(res, 200, { status: 'success', data: combined });
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
