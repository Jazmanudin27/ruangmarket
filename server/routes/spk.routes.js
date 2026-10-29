import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleSPKRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. GET /api/spk - Ambil semua batch SPK dari database MySQL
  if (pathname === '/api/spk' && req.method === 'GET') {
    try {
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      let sql = 'SELECT * FROM spk_batch';
      const params = [];
      if (kodePerusahaan) {
        sql += ' WHERE kode_perusahaan = ?';
        params.push(kodePerusahaan);
      }
      sql += ' ORDER BY id DESC';
      const [rows] = await pool.query(sql, params);
      
      const mapped = rows.map((r) => {
        let spkList = [];
        try {
          spkList = typeof r.spk_list === 'string' ? JSON.parse(r.spk_list) : (r.spk_list || []);
        } catch (e) {
          spkList = [];
        }
        return {
          id: r.id,
          company_code: r.kode_perusahaan || 'RSG',
          kode_produksi: r.kode_produksi,
          nama_pelanggan: r.nama_pelanggan,
          no_telepon: r.no_telepon || '',
          instansi: r.instansi || '',
          tgl_pesan: r.tgl_pesan,
          deadline: r.deadline,
          status: r.status,
          catatan: r.catatan,
          spk_list: spkList,
          created_at: r.created_at,
          updated_at: r.updated_at
        };
      });

      sendJson(res, 200, { status: 'success', data: mapped });
      return true;
    } catch (err) {
      console.error('[SPK API GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/spk - Simpan / Update batch SPK ke database MySQL
  if (pathname === '/api/spk' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }

      const {
        id,
        company_code,
        kode_produksi,
        nama_pelanggan,
        no_telepon,
        instansi,
        tgl_pesan,
        deadline,
        status,
        catatan,
        spk_list
      } = body;

      const spkJson = typeof spk_list === 'string' ? spk_list : JSON.stringify(spk_list || []);
      const kodePerusahaan = company_code || 'RSG';

      if (id && Number(id) > 0) {
        // UPDATE existing
        await pool.query(
          `UPDATE spk_batch SET 
            kode_perusahaan = ?,
            kode_produksi = ?,
            nama_pelanggan = ?,
            no_telepon = ?,
            instansi = ?,
            tgl_pesan = ?,
            deadline = ?,
            status = ?,
            catatan = ?,
            spk_list = ?
          WHERE id = ?`,
          [
            kodePerusahaan,
            kode_produksi,
            nama_pelanggan || '',
            no_telepon || '',
            instansi || '',
            tgl_pesan || '',
            deadline || '',
            status || 'Dalam Proses',
            catatan || '',
            spkJson,
            id
          ]
        );
        sendJson(res, 200, { status: 'success', message: 'SPK berhasil diperbarui', id });
      } else {
        // INSERT new
        const [result] = await pool.query(
          `INSERT INTO spk_batch (
            kode_perusahaan, kode_produksi, nama_pelanggan, no_telepon, instansi,
            tgl_pesan, deadline, status, catatan, spk_list
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            kodePerusahaan,
            kode_produksi,
            nama_pelanggan || '',
            no_telepon || '',
            instansi || '',
            tgl_pesan || '',
            deadline || '',
            status || 'Dalam Proses',
            catatan || '',
            spkJson
          ]
        );
        sendJson(res, 201, { status: 'success', message: 'SPK berhasil disimpan ke database', id: result.insertId });
      }
      return true;
    } catch (err) {
      console.error('[SPK API POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. DELETE /api/spk - Hapus satu batch atau kosongkan semua data SPK
  if (pathname === '/api/spk' && req.method === 'DELETE') {
    try {
      const id = urlObj.searchParams.get('id');
      const clearAll = urlObj.searchParams.get('clear');

      if (clearAll === 'all') {
        await pool.query('TRUNCATE TABLE spk_batch');
        sendJson(res, 200, { status: 'success', message: 'Semua data SPK di database berhasil dikosongkan' });
        return true;
      }

      if (id) {
        await pool.query('DELETE FROM spk_batch WHERE id = ?', [id]);
        sendJson(res, 200, { status: 'success', message: `SPK #${id} berhasil dihapus dari database` });
        return true;
      }

      sendJson(res, 400, { status: 'error', message: 'Parameter id atau clear=all diperlukan' });
      return true;
    } catch (err) {
      console.error('[SPK API DELETE Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
