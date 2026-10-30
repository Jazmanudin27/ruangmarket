import { sendJson, parseJsonBody } from '../utils/response.js';

const INITIAL_BANKS = [
  { nama_bank: 'BCA', no_rekening: '', atas_nama: 'Perusahaan' },
  { nama_bank: 'Bank Mandiri', no_rekening: '', atas_nama: 'Perusahaan' },
  { nama_bank: 'BRI', no_rekening: '', atas_nama: 'Perusahaan' },
  { nama_bank: 'BNI', no_rekening: '', atas_nama: 'Perusahaan' },
  { nama_bank: 'BSI (Bank Syariah Indonesia)', no_rekening: '', atas_nama: 'Perusahaan' },
  { nama_bank: 'Bank Jago', no_rekening: '', atas_nama: 'Perusahaan' },
];

async function ensureBankTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_bank (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      nama_bank VARCHAR(100) NOT NULL,
      no_rekening VARCHAR(100) DEFAULT '',
      atas_nama VARCHAR(150) DEFAULT '',
      status VARCHAR(32) DEFAULT 'Aktif',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_kode_perusahaan (kode_perusahaan)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Master Rekening Bank Perusahaan';
  `);

  // Seed jika masih kosong
  const [[countRow]] = await pool.query('SELECT COUNT(*) as total FROM master_bank');
  if (countRow.total === 0) {
    for (const b of INITIAL_BANKS) {
      await pool.query(
        'INSERT INTO master_bank (kode_perusahaan, nama_bank, no_rekening, atas_nama, status) VALUES (?, ?, ?, ?, ?)',
        ['RSG', b.nama_bank, b.no_rekening, b.atas_nama, 'Aktif']
      );
    }
  }
}

export async function handleBankRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. GET /api/bank atau /api/marketplace/bank
  if ((pathname === '/api/bank' || pathname === '/api/marketplace/bank') && req.method === 'GET') {
    try {
      await ensureBankTable(pool).catch(() => {});
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      let sql = 'SELECT * FROM master_bank';
      const params = [];
      if (kodePerusahaan && kodePerusahaan !== 'ALL') {
        sql += ' WHERE (kode_perusahaan = ? OR kode_perusahaan = "RSG" OR kode_perusahaan IS NULL)';
        params.push(kodePerusahaan);
      }
      sql += ' ORDER BY id ASC';
      const [rows] = await pool.query(sql, params);
      sendJson(res, 200, { status: 'success', data: rows });
      return true;
    } catch (err) {
      console.error('[Bank API GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/bank atau /api/marketplace/bank
  if ((pathname === '/api/bank' || pathname === '/api/marketplace/bank') && req.method === 'POST') {
    try {
      await ensureBankTable(pool).catch(() => {});
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }

      const {
        id,
        kode_perusahaan,
        nama_bank,
        no_rekening,
        atas_nama,
        status
      } = body;

      const company = kode_perusahaan || 'RSG';
      const nama = (nama_bank || '').trim();
      const norek = (no_rekening || '').trim();
      const an = (atas_nama || '').trim();
      const statusBank = status || 'Aktif';

      if (!nama) {
        sendJson(res, 400, { status: 'error', message: 'Nama bank wajib diisi' });
        return true;
      }

      if (id && Number(id) > 0) {
        await pool.query(
          `UPDATE master_bank SET
            kode_perusahaan = ?,
            nama_bank = ?,
            no_rekening = ?,
            atas_nama = ?,
            status = ?
          WHERE id = ?`,
          [company, nama, norek, an, statusBank, id]
        );
        sendJson(res, 200, { status: 'success', message: 'Data bank berhasil diperbarui', id });
        return true;
      } else {
        const [result] = await pool.query(
          `INSERT INTO master_bank (
            kode_perusahaan, nama_bank, no_rekening, atas_nama, status
          ) VALUES (?, ?, ?, ?, ?)`,
          [company, nama, norek, an, statusBank]
        );
        sendJson(res, 201, { status: 'success', message: 'Data bank berhasil ditambahkan', id: result.insertId });
        return true;
      }
    } catch (err) {
      console.error('[Bank API POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. DELETE /api/bank atau /api/marketplace/bank
  if ((pathname === '/api/bank' || pathname === '/api/marketplace/bank') && req.method === 'DELETE') {
    try {
      const id = urlObj.searchParams.get('id');
      if (!id) {
        sendJson(res, 400, { status: 'error', message: 'ID bank wajib disertakan' });
        return true;
      }
      await pool.query('DELETE FROM master_bank WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success', message: 'Bank berhasil dihapus' });
      return true;
    } catch (err) {
      console.error('[Bank API DELETE Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}

