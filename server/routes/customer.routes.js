import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleCustomerRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. GET /api/pelanggan - Ambil seluruh data master pelanggan
  if (pathname === '/api/pelanggan' && req.method === 'GET') {
    try {
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      let sql = 'SELECT * FROM pelanggan_master';
      const params = [];
      if (kodePerusahaan && kodePerusahaan !== 'ALL') {
        sql += ' WHERE (kode_perusahaan = ? OR kode_perusahaan = "RSG" OR kode_perusahaan IS NULL)';
        params.push(kodePerusahaan);
      }
      sql += ' ORDER BY id DESC';
      const [rows] = await pool.query(sql, params);
      sendJson(res, 200, { status: 'success', data: rows });
      return true;
    } catch (err) {
      console.error('[Customer API GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/pelanggan - Tambah / Edit master pelanggan
  if (pathname === '/api/pelanggan' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }

      const {
        id,
        kode_perusahaan,
        kode_pelanggan,
        nama_pelanggan,
        alamat,
        no_hp,
        status,
        kategori_pelanggan
      } = body;

      const company = kode_perusahaan || 'RSG';
      const kode = (kode_pelanggan || `CUST-${Date.now().toString().slice(-6)}`).trim();
      const nama = (nama_pelanggan || '').trim();
      const statusPelanggan = status || 'Aktif';
      const kategori = kategori_pelanggan || 'Reguler';

      if (!nama) {
        sendJson(res, 400, { status: 'error', message: 'Nama pelanggan wajib diisi' });
        return true;
      }

      if (id && Number(id) > 0) {
        // UPDATE
        await pool.query(
          `UPDATE pelanggan_master SET
            kode_perusahaan = ?,
            kode_pelanggan = ?,
            nama_pelanggan = ?,
            alamat = ?,
            no_hp = ?,
            status = ?,
            kategori_pelanggan = ?
          WHERE id = ?`,
          [company, kode, nama, alamat || '', no_hp || '', statusPelanggan, kategori, id]
        );
        sendJson(res, 200, { status: 'success', message: 'Pelanggan berhasil diperbarui', id });
      } else {
        // INSERT
        const [result] = await pool.query(
          `INSERT INTO pelanggan_master (
            kode_perusahaan, kode_pelanggan, nama_pelanggan, alamat, no_hp, status, kategori_pelanggan
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_pelanggan = VALUES(nama_pelanggan),
            alamat = VALUES(alamat),
            no_hp = VALUES(no_hp),
            status = VALUES(status),
            kategori_pelanggan = VALUES(kategori_pelanggan)`,
          [company, kode, nama, alamat || '', no_hp || '', statusPelanggan, kategori]
        );
        sendJson(res, 201, { status: 'success', message: 'Pelanggan berhasil ditambahkan', id: result.insertId });
      }
      return true;
    } catch (err) {
      console.error('[Customer API POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. DELETE /api/pelanggan - Hapus master pelanggan
  if (pathname === '/api/pelanggan' && req.method === 'DELETE') {
    try {
      const id = urlObj.searchParams.get('id');
      if (!id) {
        sendJson(res, 400, { status: 'error', message: 'Parameter id diperlukan' });
        return true;
      }

      await pool.query('DELETE FROM pelanggan_master WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success', message: 'Pelanggan berhasil dihapus' });
      return true;
    } catch (err) {
      console.error('[Customer API DELETE Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
