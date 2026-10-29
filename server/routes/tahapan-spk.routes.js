import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleTahapanSPKRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. GET /api/tahapan-spk - Ambil seluruh data master tahapan SPK
  if ((pathname === '/api/tahapan-spk' || pathname === '/api/marketplace/tahapan-spk') && req.method === 'GET') {
    try {
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      let sql = 'SELECT * FROM tahapan_spk_master';
      const params = [];
      if (kodePerusahaan && kodePerusahaan !== 'ALL') {
        sql += ' WHERE (kode_perusahaan = ? OR kode_perusahaan = "RSG" OR kode_perusahaan IS NULL)';
        params.push(kodePerusahaan);
      }
      sql += ' ORDER BY urutan ASC, id ASC';
      const [rows] = await pool.query(sql, params);
      sendJson(res, 200, { status: 'success', data: rows });
      return true;
    } catch (err) {
      console.error('[Tahapan SPK API GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/tahapan-spk - Tambah / Edit master tahapan SPK
  if ((pathname === '/api/tahapan-spk' || pathname === '/api/marketplace/tahapan-spk') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }

      const {
        id,
        kode_perusahaan,
        kode_tahapan,
        nama_tahapan,
        emoji,
        warna,
        urutan,
        status,
        keterangan
      } = body;

      const company = kode_perusahaan || 'RSG';
      const kode = (kode_tahapan || `THP-${Date.now().toString().slice(-4)}`).trim();
      const nama = (nama_tahapan || '').trim();
      const emojiIcon = emoji || '📋';
      const warnaTag = warna || 'info';
      const urutanNum = Number(urutan) || 0;
      const statusTahap = status || 'Aktif';
      const ket = keterangan || '';

      if (!nama) {
        sendJson(res, 400, { status: 'error', message: 'Nama tahapan SPK wajib diisi' });
        return true;
      }

      if (id && Number(id) > 0) {
        // UPDATE
        await pool.query(
          `UPDATE tahapan_spk_master SET
            kode_perusahaan = ?,
            kode_tahapan = ?,
            nama_tahapan = ?,
            emoji = ?,
            warna = ?,
            urutan = ?,
            status = ?,
            keterangan = ?
          WHERE id = ?`,
          [company, kode, nama, emojiIcon, warnaTag, urutanNum, statusTahap, ket, id]
        );
        sendJson(res, 200, { status: 'success', message: 'Tahapan SPK berhasil diperbarui', id });
      } else {
        // INSERT
        const [result] = await pool.query(
          `INSERT INTO tahapan_spk_master (
            kode_perusahaan, kode_tahapan, nama_tahapan, emoji, warna, urutan, status, keterangan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_tahapan = VALUES(nama_tahapan),
            emoji = VALUES(emoji),
            warna = VALUES(warna),
            urutan = VALUES(urutan),
            status = VALUES(status),
            keterangan = VALUES(keterangan)`,
          [company, kode, nama, emojiIcon, warnaTag, urutanNum, statusTahap, ket]
        );
        sendJson(res, 201, { status: 'success', message: 'Tahapan SPK berhasil ditambahkan', id: result.insertId });
      }
      return true;
    } catch (err) {
      console.error('[Tahapan SPK API POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. DELETE /api/tahapan-spk - Hapus master tahapan SPK
  if ((pathname === '/api/tahapan-spk' || pathname === '/api/marketplace/tahapan-spk') && req.method === 'DELETE') {
    try {
      const id = urlObj.searchParams.get('id');
      if (!id) {
        sendJson(res, 400, { status: 'error', message: 'Parameter id diperlukan' });
        return true;
      }

      await pool.query('DELETE FROM tahapan_spk_master WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success', message: 'Tahapan SPK berhasil dihapus' });
      return true;
    } catch (err) {
      console.error('[Tahapan SPK API DELETE Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
