import { sendJson, parseJsonBody } from '../utils/response.js';

const INITIAL_MUTASI = [
  {
    tanggal: '2026-10-30',
    no_bukti: 'BKM-20261030-001',
    kode_bank: 'BCA',
    jumlah: 334500,
    keterangan: 'Pelunasan Pesanan Offline Pesantren Al-Hikmah (OFF-20261030-KE9A)',
    jenis_mutasi: 'masuk',
    kategori: 'Penjualan Offline'
  },
  {
    tanggal: '2026-10-30',
    no_bukti: 'BKM-20261030-002',
    kode_bank: 'KAS TUNAI',
    jumlah: 754300,
    keterangan: 'Pembayaran DP Pesanan Offline Seragam Batik (OFF-20261030-KE9A)',
    jenis_mutasi: 'masuk',
    kategori: 'Penjualan Offline'
  },
  {
    tanggal: '2026-10-29',
    no_bukti: 'BKK-20261029-001',
    kode_bank: 'BCA',
    jumlah: 1450000,
    keterangan: 'Pembelian Bahan Kain Batik Tunas Harapan Merah (50 Meter)',
    jenis_mutasi: 'keluar',
    kategori: 'Pembelian Bahan / Kain'
  },
  {
    tanggal: '2026-10-28',
    no_bukti: 'BKK-20261028-002',
    kode_bank: 'MANDIRI',
    jumlah: 850000,
    keterangan: 'Ongkos Jahit SPK SPK-KE9A-01 (Makloon Penjahit)',
    jenis_mutasi: 'keluar',
    kategori: 'Ongkos Produksi / Jahit'
  },
  {
    tanggal: '2026-10-27',
    no_bukti: 'BKM-20261027-001',
    kode_bank: 'MANDIRI',
    jumlah: 2500000,
    keterangan: 'Pencairan Saldo Penjualan Shopee (Toko Ruang Seragam Official)',
    jenis_mutasi: 'masuk',
    kategori: 'Pencairan Marketplace'
  },
  {
    tanggal: '2026-10-26',
    no_bukti: 'BKK-20261026-001',
    kode_bank: 'KAS TUNAI',
    jumlah: 175000,
    keterangan: 'Pembelian Plastik Packing, Lakban Fragile & Karung Koli',
    jenis_mutasi: 'keluar',
    kategori: 'Operasional & Packing'
  }
];

const INITIAL_KATEGORI = [
  { nama: 'Penjualan Offline', jenis: 'masuk' },
  { nama: 'Pencairan Marketplace', jenis: 'masuk' },
  { nama: 'Pelunasan Piutang', jenis: 'masuk' },
  { nama: 'Pembelian Bahan / Kain', jenis: 'keluar' },
  { nama: 'Ongkos Produksi / Jahit', jenis: 'keluar' },
  { nama: 'Operasional & Packing', jenis: 'keluar' },
  { nama: 'Gaji & Upah Karyawan', jenis: 'keluar' },
  { nama: 'Sewa & Utilitas (Listrik/Air)', jenis: 'keluar' },
  { nama: 'Biaya Pengiriman & Logistik', jenis: 'keluar' },
  { nama: 'Lain-lain', jenis: 'semua' }
];

async function ensureKeuanganTable(pool) {
  // 1. Tabel Mutasi Kas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mutasi_kas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      tanggal DATE NOT NULL,
      no_bukti VARCHAR(60) NOT NULL,
      kode_bank VARCHAR(50) NOT NULL,
      jumlah DECIMAL(15,2) NOT NULL DEFAULT 0,
      keterangan TEXT,
      jenis_mutasi VARCHAR(20) NOT NULL DEFAULT 'masuk',
      kategori VARCHAR(100) NOT NULL DEFAULT 'Umum',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_perusahaan_tgl (kode_perusahaan, tanggal),
      INDEX idx_jenis (jenis_mutasi),
      INDEX idx_kode_bank (kode_bank)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Mutasi Kas Masuk dan Keluar';
  `);

  // Seed mutasi jika tabel kosong
  const [[countRow]] = await pool.query('SELECT COUNT(*) as total FROM mutasi_kas');
  if (countRow.total === 0) {
    for (const m of INITIAL_MUTASI) {
      await pool.query(
        `INSERT INTO mutasi_kas (kode_perusahaan, tanggal, no_bukti, kode_bank, jumlah, keterangan, jenis_mutasi, kategori)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['RSG', m.tanggal, m.no_bukti, m.kode_bank, m.jumlah, m.keterangan, m.jenis_mutasi, m.kategori]
      );
    }
  }

  // 2. Tabel Kategori Mutasi Kas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kategori_mutasi (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      nama_kategori VARCHAR(100) NOT NULL,
      jenis_mutasi VARCHAR(20) DEFAULT 'semua',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_perusahaan (kode_perusahaan)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Master Kategori Mutasi Kas';
  `);

  // Seed kategori jika kosong
  const [[countKat]] = await pool.query('SELECT COUNT(*) as total FROM kategori_mutasi');
  if (countKat.total === 0) {
    for (const k of INITIAL_KATEGORI) {
      await pool.query(
        `INSERT INTO kategori_mutasi (kode_perusahaan, nama_kategori, jenis_mutasi) VALUES (?, ?, ?)`,
        ['RSG', k.nama, k.jenis]
      );
    }
  }
}

export async function handleKeuanganRoutes(req, res, pathname, urlObj, { pool }) {
  // ─── KATEGORI MUTASI API ENDPOINTS ──────────────────────────────────────────

  // GET /api/keuangan/kategori
  if (pathname === '/api/keuangan/kategori' && req.method === 'GET') {
    try {
      await ensureKeuanganTable(pool).catch(() => {});
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      let sql = 'SELECT * FROM kategori_mutasi';
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
      console.error('[Keuangan Kategori GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // POST /api/keuangan/kategori (Create or Update)
  if (pathname === '/api/keuangan/kategori' && req.method === 'POST') {
    try {
      await ensureKeuanganTable(pool).catch(() => {});
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }

      const { id, kode_perusahaan, nama_kategori, jenis_mutasi } = body;
      const company = kode_perusahaan || 'RSG';
      const nama = (nama_kategori || '').trim();
      const jenis = (jenis_mutasi || 'semua').toLowerCase();

      if (!nama) {
        sendJson(res, 400, { status: 'error', message: 'Nama kategori wajib diisi' });
        return true;
      }

      if (id && Number(id) > 0) {
        // Ambil nama lama untuk cascade update ke mutasi_kas
        const [[oldRow]] = await pool.query('SELECT nama_kategori FROM kategori_mutasi WHERE id = ?', [id]);
        await pool.query(
          `UPDATE kategori_mutasi SET nama_kategori = ?, jenis_mutasi = ? WHERE id = ?`,
          [nama, jenis, id]
        );
        if (oldRow && oldRow.nama_kategori && oldRow.nama_kategori !== nama) {
          await pool.query(
            `UPDATE mutasi_kas SET kategori = ? WHERE kategori = ?`,
            [nama, oldRow.nama_kategori]
          ).catch(() => {});
        }
        sendJson(res, 200, { status: 'success', message: 'Kategori berhasil diperbarui', id: Number(id), data: { id: Number(id), nama_kategori: nama, jenis_mutasi: jenis } });
        return true;
      } else {
        const [result] = await pool.query(
          `INSERT INTO kategori_mutasi (kode_perusahaan, nama_kategori, jenis_mutasi) VALUES (?, ?, ?)`,
          [company, nama, jenis]
        );
        sendJson(res, 201, { status: 'success', message: 'Kategori berhasil ditambahkan', id: result.insertId, data: { id: result.insertId, nama_kategori: nama, jenis_mutasi: jenis } });
        return true;
      }
    } catch (err) {
      console.error('[Keuangan Kategori POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // DELETE /api/keuangan/kategori?id=...
  if (pathname === '/api/keuangan/kategori' && req.method === 'DELETE') {
    try {
      const id = urlObj.searchParams.get('id');
      if (!id) {
        sendJson(res, 400, { status: 'error', message: 'ID kategori wajib disertakan' });
        return true;
      }
      await pool.query('DELETE FROM kategori_mutasi WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success', message: 'Kategori berhasil dihapus' });
      return true;
    } catch (err) {
      console.error('[Keuangan Kategori DELETE Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ─── MUTASI KAS API ENDPOINTS ───────────────────────────────────────────────

  // 1. GET /api/keuangan/mutasi
  if (pathname === '/api/keuangan/mutasi' && req.method === 'GET') {
    try {
      await ensureKeuanganTable(pool).catch(() => {});
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      const jenisMutasi = urlObj.searchParams.get('jenis_mutasi');
      const kodeBank = urlObj.searchParams.get('kode_bank');
      const kategori = urlObj.searchParams.get('kategori');
      const tglAwal = urlObj.searchParams.get('tgl_awal');
      const tglAkhir = urlObj.searchParams.get('tgl_akhir');
      const search = urlObj.searchParams.get('search');

      let sql = 'SELECT * FROM mutasi_kas WHERE 1=1';
      const params = [];

      if (kodePerusahaan && kodePerusahaan !== 'ALL') {
        sql += ' AND (kode_perusahaan = ? OR kode_perusahaan = "RSG" OR kode_perusahaan IS NULL)';
        params.push(kodePerusahaan);
      }

      if (jenisMutasi && jenisMutasi !== 'semua') {
        sql += ' AND jenis_mutasi = ?';
        params.push(jenisMutasi.toLowerCase());
      }

      if (kodeBank && kodeBank !== 'Semua') {
        sql += ' AND kode_bank = ?';
        params.push(kodeBank);
      }

      if (kategori && kategori !== 'Semua') {
        sql += ' AND kategori = ?';
        params.push(kategori);
      }

      if (tglAwal) {
        sql += ' AND tanggal >= ?';
        params.push(tglAwal);
      }

      if (tglAkhir) {
        sql += ' AND tanggal <= ?';
        params.push(tglAkhir);
      }

      if (search && search.trim()) {
        sql += ' AND (no_bukti LIKE ? OR keterangan LIKE ? OR kategori LIKE ? OR kode_bank LIKE ?)';
        const q = `%${search.trim()}%`;
        params.push(q, q, q, q);
      }

      sql += ' ORDER BY tanggal DESC, id DESC';

      const [rows] = await pool.query(sql, params);
      sendJson(res, 200, { status: 'success', data: rows });
      return true;
    } catch (err) {
      console.error('[Keuangan API GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/keuangan/mutasi (Create or Update)
  if (pathname === '/api/keuangan/mutasi' && req.method === 'POST') {
    try {
      await ensureKeuanganTable(pool).catch(() => {});
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }

      const {
        id,
        kode_perusahaan,
        tanggal,
        no_bukti,
        kode_bank,
        jumlah,
        keterangan,
        jenis_mutasi,
        kategori
      } = body;

      const company = kode_perusahaan || 'RSG';
      const tgl = tanggal || new Date().toISOString().slice(0, 10);
      const jenis = (jenis_mutasi || 'masuk').toLowerCase();
      const bank = (kode_bank || 'KAS TUNAI').trim();
      const cat = (kategori || 'Umum').trim();
      const ket = (keterangan || '').trim();
      const nominal = Math.abs(Number(jumlah || 0));

      // Auto generate no bukti if empty
      let bukti = (no_bukti || '').trim();
      if (!bukti) {
        const prefix = jenis === 'masuk' ? 'BKM' : 'BKK';
        const ymd = tgl.replace(/-/g, '');
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        bukti = `${prefix}-${ymd}-${rand}`;
      }

      if (id && Number(id) > 0) {
        await pool.query(
          `UPDATE mutasi_kas SET
            kode_perusahaan = ?,
            tanggal = ?,
            no_bukti = ?,
            kode_bank = ?,
            jumlah = ?,
            keterangan = ?,
            jenis_mutasi = ?,
            kategori = ?
          WHERE id = ?`,
          [company, tgl, bukti, bank, nominal, ket, jenis, cat, id]
        );
        sendJson(res, 200, {
          status: 'success',
          message: 'Data mutasi kas berhasil diperbarui',
          id: Number(id),
          data: { id: Number(id), kode_perusahaan: company, tanggal: tgl, no_bukti: bukti, kode_bank: bank, jumlah: nominal, keterangan: ket, jenis_mutasi: jenis, kategori: cat }
        });
        return true;
      } else {
        const [result] = await pool.query(
          `INSERT INTO mutasi_kas (kode_perusahaan, tanggal, no_bukti, kode_bank, jumlah, keterangan, jenis_mutasi, kategori)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [company, tgl, bukti, bank, nominal, ket, jenis, cat]
        );
        sendJson(res, 201, {
          status: 'success',
          message: 'Mutasi kas berhasil dicatat',
          id: result.insertId,
          data: { id: result.insertId, kode_perusahaan: company, tanggal: tgl, no_bukti: bukti, kode_bank: bank, jumlah: nominal, keterangan: ket, jenis_mutasi: jenis, kategori: cat }
        });
        return true;
      }
    } catch (err) {
      console.error('[Keuangan API POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. DELETE /api/keuangan/mutasi?id=...
  if (pathname === '/api/keuangan/mutasi' && req.method === 'DELETE') {
    try {
      const id = urlObj.searchParams.get('id');
      if (!id) {
        sendJson(res, 400, { status: 'error', message: 'ID mutasi wajib disertakan' });
        return true;
      }
      await pool.query('DELETE FROM mutasi_kas WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success', message: 'Mutasi kas berhasil dihapus' });
      return true;
    } catch (err) {
      console.error('[Keuangan API DELETE Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
