import { sendJson, parseJsonBody } from '../utils/response.js';

let isTablesEnsured = false;
let ensureTablesPromise = null;

async function safeAddColumn(pool, table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (err) {
    // Ignore duplicate column error (1060 / ER_DUP_FIELDNAME)
  }
}

async function ensureAllTables(pool) {
  // 1. Tabel Mitra Penitip
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mitra_penitip (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      nama_mitra VARCHAR(150) NOT NULL,
      kontak VARCHAR(60) DEFAULT '',
      alamat TEXT,
      bank_nama VARCHAR(60) DEFAULT '',
      bank_rekening VARCHAR(60) DEFAULT '',
      bank_atas_nama VARCHAR(100) DEFAULT '',
      keterangan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_perusahaan (kode_perusahaan),
      INDEX idx_nama (nama_mitra)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Master Mitra Penitip Barang';
  `);

  await safeAddColumn(pool, 'mitra_penitip', 'kode_perusahaan', "VARCHAR(32) DEFAULT 'RSG'");
  await safeAddColumn(pool, 'mitra_penitip', 'nama_mitra', "VARCHAR(150) NOT NULL DEFAULT ''");
  await safeAddColumn(pool, 'mitra_penitip', 'kontak', "VARCHAR(60) DEFAULT ''");
  await safeAddColumn(pool, 'mitra_penitip', 'alamat', "TEXT NULL");
  await safeAddColumn(pool, 'mitra_penitip', 'bank_nama', "VARCHAR(60) DEFAULT ''");
  await safeAddColumn(pool, 'mitra_penitip', 'bank_rekening', "VARCHAR(60) DEFAULT ''");
  await safeAddColumn(pool, 'mitra_penitip', 'bank_atas_nama', "VARCHAR(100) DEFAULT ''");
  await safeAddColumn(pool, 'mitra_penitip', 'keterangan', "TEXT NULL");

  // 2. Tabel Penitipan Barang
  await pool.query(`
    CREATE TABLE IF NOT EXISTS penitipan_barang (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      mitra_id INT NULL,
      no_titipan VARCHAR(60) NOT NULL,
      tanggal DATE NOT NULL,
      nama_penitip VARCHAR(150) NOT NULL,
      kontak_penitip VARCHAR(60) DEFAULT '',
      produk_id INT NULL,
      kode_sku VARCHAR(100) NOT NULL,
      nama_produk VARCHAR(255) NOT NULL,
      varian VARCHAR(100) DEFAULT '',
      satuan VARCHAR(32) DEFAULT 'PCS',
      harga_titip DECIMAL(15,2) NOT NULL DEFAULT 0,
      qty_titip INT NOT NULL DEFAULT 0,
      qty_terjual INT NOT NULL DEFAULT 0,
      qty_retur INT NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'Aktif',
      lokasi_rak VARCHAR(60) DEFAULT 'Gudang Konsinyasi',
      petugas VARCHAR(100) DEFAULT 'Staff Gudang',
      keterangan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_perusahaan (kode_perusahaan),
      INDEX idx_penitip (nama_penitip),
      INDEX idx_sku (kode_sku),
      INDEX idx_no_titipan (no_titipan),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Pencatatan Penitipan / Konsinyasi Barang';
  `);

  await safeAddColumn(pool, 'penitipan_barang', 'kode_perusahaan', "VARCHAR(32) DEFAULT 'RSG'");
  await safeAddColumn(pool, 'penitipan_barang', 'mitra_id', "INT NULL");
  await safeAddColumn(pool, 'penitipan_barang', 'produk_id', "INT NULL");
  await safeAddColumn(pool, 'penitipan_barang', 'no_titipan', "VARCHAR(60) DEFAULT ''");
  await safeAddColumn(pool, 'penitipan_barang', 'tanggal', "DATE NULL");
  await safeAddColumn(pool, 'penitipan_barang', 'nama_penitip', "VARCHAR(150) DEFAULT ''");
  await safeAddColumn(pool, 'penitipan_barang', 'kontak_penitip', "VARCHAR(60) DEFAULT ''");
  await safeAddColumn(pool, 'penitipan_barang', 'kode_sku', "VARCHAR(100) DEFAULT ''");
  await safeAddColumn(pool, 'penitipan_barang', 'nama_produk', "VARCHAR(255) DEFAULT ''");
  await safeAddColumn(pool, 'penitipan_barang', 'varian', "VARCHAR(100) DEFAULT ''");
  await safeAddColumn(pool, 'penitipan_barang', 'satuan', "VARCHAR(32) DEFAULT 'PCS'");
  await safeAddColumn(pool, 'penitipan_barang', 'harga_titip', "DECIMAL(15,2) DEFAULT 0");
  await safeAddColumn(pool, 'penitipan_barang', 'qty_titip', "INT DEFAULT 0");
  await safeAddColumn(pool, 'penitipan_barang', 'qty_terjual', "INT DEFAULT 0");
  await safeAddColumn(pool, 'penitipan_barang', 'qty_retur', "INT DEFAULT 0");
  await safeAddColumn(pool, 'penitipan_barang', 'status', "VARCHAR(32) DEFAULT 'Aktif'");
  await safeAddColumn(pool, 'penitipan_barang', 'lokasi_rak', "VARCHAR(60) DEFAULT 'Gudang Konsinyasi'");
  await safeAddColumn(pool, 'penitipan_barang', 'petugas', "VARCHAR(100) DEFAULT 'Staff Gudang'");
  await safeAddColumn(pool, 'penitipan_barang', 'keterangan', "TEXT NULL");

  // 3. Tabel Pembayaran Penitip
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pembayaran_penitip (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      mitra_id INT NULL,
      nama_mitra VARCHAR(150) NOT NULL,
      no_pembayaran VARCHAR(60) NOT NULL,
      tanggal DATE NOT NULL,
      nominal DECIMAL(15,2) NOT NULL DEFAULT 0,
      metode_pembayaran VARCHAR(50) DEFAULT 'Transfer Bank',
      no_referensi VARCHAR(100) DEFAULT '',
      petugas VARCHAR(100) DEFAULT 'Finance Titipan',
      catatan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_perusahaan (kode_perusahaan),
      INDEX idx_mitra (mitra_id),
      INDEX idx_nama_mitra (nama_mitra)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Histori Pembayaran Titipan ke Mitra';
  `);

  await safeAddColumn(pool, 'pembayaran_penitip', 'kode_perusahaan', "VARCHAR(32) DEFAULT 'RSG'");
  await safeAddColumn(pool, 'pembayaran_penitip', 'mitra_id', "INT NULL");
  await safeAddColumn(pool, 'pembayaran_penitip', 'nama_mitra', "VARCHAR(150) DEFAULT ''");
  await safeAddColumn(pool, 'pembayaran_penitip', 'no_pembayaran', "VARCHAR(60) DEFAULT ''");
  await safeAddColumn(pool, 'pembayaran_penitip', 'tanggal', "DATE NULL");
  await safeAddColumn(pool, 'pembayaran_penitip', 'nominal', "DECIMAL(15,2) DEFAULT 0");
  await safeAddColumn(pool, 'pembayaran_penitip', 'metode_pembayaran', "VARCHAR(50) DEFAULT 'Transfer Bank'");
  await safeAddColumn(pool, 'pembayaran_penitip', 'no_referensi', "VARCHAR(100) DEFAULT ''");
  await safeAddColumn(pool, 'pembayaran_penitip', 'petugas', "VARCHAR(100) DEFAULT 'Finance Titipan'");
  await safeAddColumn(pool, 'pembayaran_penitip', 'catatan', "TEXT NULL");

  // 4. Tabel Sesi Stock Opname Penitipan
  await pool.query(`
    CREATE TABLE IF NOT EXISTS opname_penitipan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      no_opname VARCHAR(60) NOT NULL,
      tanggal DATE NOT NULL,
      mitra_id INT NULL,
      nama_mitra VARCHAR(150) DEFAULT '',
      petugas VARCHAR(100) DEFAULT 'Staff Gudang',
      total_item INT NOT NULL DEFAULT 0,
      total_selisih_qty INT NOT NULL DEFAULT 0,
      total_selisih_rp DECIMAL(15,2) NOT NULL DEFAULT 0,
      catatan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_perusahaan (kode_perusahaan),
      INDEX idx_no_opname (no_opname)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Header Sesi Stock Opname Titipan Barang';
  `);

  // 5. Tabel Detail Item Sesi Stock Opname Penitipan
  await pool.query(`
    CREATE TABLE IF NOT EXISTS opname_penitipan_detail (
      id INT AUTO_INCREMENT PRIMARY KEY,
      opname_id INT NOT NULL,
      penitipan_id INT NOT NULL,
      kode_sku VARCHAR(100) NOT NULL,
      nama_produk VARCHAR(255) NOT NULL,
      nama_penitip VARCHAR(150) NOT NULL,
      harga_titip DECIMAL(15,2) NOT NULL DEFAULT 0,
      stok_sistem INT NOT NULL DEFAULT 0,
      stok_fisik INT NOT NULL DEFAULT 0,
      selisih_qty INT NOT NULL DEFAULT 0,
      selisih_rp DECIMAL(15,2) NOT NULL DEFAULT 0,
      keterangan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_opname (opname_id),
      INDEX idx_penitipan (penitipan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Detail Item Opname Titipan Barang';
  `);
}

async function ensureTablesOnce(pool) {
  if (isTablesEnsured) return;
  if (!ensureTablesPromise) {
    ensureTablesPromise = (async () => {
      await ensureAllTables(pool);
      isTablesEnsured = true;
    })().catch(err => {
      ensureTablesPromise = null;
      console.error('[Penitipan Tables Init Error]:', err.message);
    });
  }
  return ensureTablesPromise;
}

export async function handlePenitipanBarangRoutes(req, res, pathname, urlObj, context) {
  const { pool } = context;

  if (!pathname.startsWith('/api/penitipan-barang')) {
    return false;
  }

  try {
    await ensureTablesOnce(pool);
  } catch (err) {
    // ignore
  }

  // =========================================================================
  // MITRA PENITIP ROUTES (/api/penitipan-barang/mitra)
  // =========================================================================

  // GET /api/penitipan-barang/mitra - Daftar Mitra beserta rekap stok & keuangan
  if (req.method === 'GET' && pathname === '/api/penitipan-barang/mitra') {
    try {
      const company = urlObj.searchParams.get('company') || 'RSG';
      const search = urlObj.searchParams.get('search') || '';

      let query = `
        SELECT 
          m.id,
          m.kode_perusahaan,
          m.nama_mitra,
          m.kontak,
          m.alamat,
          m.bank_nama,
          m.bank_rekening,
          m.bank_atas_nama,
          m.keterangan,
          DATE_FORMAT(m.created_at, '%Y-%m-%d') as created_at,
          COALESCE(COUNT(DISTINCT p.id), 0) as total_titipan,
          COALESCE(COUNT(DISTINCT p.kode_sku), 0) as total_produk,
          COALESCE(SUM(p.qty_titip), 0) as stok_masuk,
          COALESCE(SUM(p.qty_terjual), 0) as stok_terjual,
          COALESCE(SUM(p.qty_titip - p.qty_terjual - p.qty_retur), 0) as sisa_stok,
          CAST(COALESCE(SUM(p.qty_titip * p.harga_titip), 0) AS DOUBLE) as total_nilai_titip,
          CAST(COALESCE(SUM(p.qty_terjual * p.harga_titip), 0) AS DOUBLE) as total_kewajiban_bayar,
          CAST(COALESCE(SUM((p.qty_titip - p.qty_terjual - p.qty_retur) * p.harga_titip), 0) AS DOUBLE) as total_nilai_sisa,
          CAST(COALESCE((
            SELECT SUM(nominal) 
            FROM pembayaran_penitip 
            WHERE (mitra_id = m.id OR nama_mitra = m.nama_mitra)
          ), 0) AS DOUBLE) as total_sudah_dibayar
        FROM mitra_penitip m
        LEFT JOIN penitipan_barang p ON (p.mitra_id = m.id OR p.nama_penitip = m.nama_mitra)
        WHERE (m.kode_perusahaan = ? OR m.kode_perusahaan IS NULL OR ? = '' OR m.kode_perusahaan = 'RSG')
      `;
      const params = [company, company];

      if (search) {
        query += ` AND (m.nama_mitra LIKE ? OR m.kontak LIKE ? OR m.alamat LIKE ? OR m.bank_nama LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s);
      }

      query += ` GROUP BY m.id ORDER BY m.id DESC`;

      const [rows] = await pool.query(query, params);

      // Hitung sisa hutang tiap mitra
      const mitraList = rows.map(r => {
        const kewajiban = Number(r.total_kewajiban_bayar || 0);
        const dibayar = Number(r.total_sudah_dibayar || 0);
        const sisaHutang = Math.max(0, kewajiban - dibayar);
        return {
          ...r,
          sisa_hutang: sisaHutang,
          status_pembayaran: sisaHutang <= 0 ? (kewajiban > 0 ? 'Lunas' : 'Belum Ada Penjualan') : 'Belum Lunas'
        };
      });

      return sendJson(res, 200, {
        status: 'success',
        data: mitraList
      });
    } catch (err) {
      console.error('[GET /api/penitipan-barang/mitra Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // POST /api/penitipan-barang/mitra - Tambah Mitra Baru
  if (req.method === 'POST' && pathname === '/api/penitipan-barang/mitra') {
    try {
      const body = await parseJsonBody(req);
      const {
        kode_perusahaan = 'RSG',
        nama_mitra,
        kontak = '',
        alamat = '',
        bank_nama = '',
        bank_rekening = '',
        bank_atas_nama = '',
        keterangan = ''
      } = body;

      if (!nama_mitra || !nama_mitra.trim()) {
        return sendJson(res, 400, { status: 'error', message: 'Nama Mitra wajib diisi!' });
      }

      const [resInsert] = await pool.query(
        `INSERT INTO mitra_penitip (kode_perusahaan, nama_mitra, kontak, alamat, bank_nama, bank_rekening, bank_atas_nama, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [kode_perusahaan, nama_mitra.trim(), kontak.trim(), alamat.trim(), bank_nama.trim(), bank_rekening.trim(), bank_atas_nama.trim(), keterangan.trim()]
      );

      const [[createdMitra]] = await pool.query(
        `SELECT 
          m.id, m.kode_perusahaan, m.nama_mitra, m.kontak, m.alamat, m.bank_nama, m.bank_rekening, m.bank_atas_nama, m.keterangan,
          DATE_FORMAT(m.created_at, '%Y-%m-%d') as created_at,
          0 as total_titipan, 0 as total_produk, 0 as stok_masuk, 0 as stok_terjual, 0 as sisa_stok,
          0 as total_nilai_titip, 0 as total_kewajiban_bayar, 0 as total_nilai_sisa, 0 as total_sudah_dibayar,
          0 as sisa_hutang, 'Belum Ada Penjualan' as status_pembayaran
        FROM mitra_penitip m WHERE m.id = ?`,
        [resInsert.insertId]
      );

      return sendJson(res, 201, {
        status: 'success',
        message: 'Mitra Penitip berhasil ditambahkan!',
        data: createdMitra || { id: resInsert.insertId, nama_mitra }
      });
    } catch (err) {
      console.error('[POST /api/penitipan-barang/mitra Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // PUT /api/penitipan-barang/mitra/:id - Edit Mitra
  if (req.method === 'PUT' && pathname.startsWith('/api/penitipan-barang/mitra/')) {
    const id = pathname.split('/')[4];
    try {
      const body = await parseJsonBody(req);
      const {
        nama_mitra,
        kontak,
        alamat,
        bank_nama,
        bank_rekening,
        bank_atas_nama,
        keterangan
      } = body;

      if (!nama_mitra || !nama_mitra.trim()) {
        return sendJson(res, 400, { status: 'error', message: 'Nama Mitra wajib diisi!' });
      }

      // Ambil nama lama untuk update keterkaitan di penitipan_barang & pembayaran_penitip
      const [[oldMitra]] = await pool.query('SELECT nama_mitra FROM mitra_penitip WHERE id = ?', [id]);

      await pool.query(
        `UPDATE mitra_penitip SET
          nama_mitra = ?,
          kontak = ?,
          alamat = ?,
          bank_nama = ?,
          bank_rekening = ?,
          bank_atas_nama = ?,
          keterangan = ?
        WHERE id = ?`,
        [nama_mitra.trim(), kontak, alamat, bank_nama, bank_rekening, bank_atas_nama, keterangan, id]
      );

      // Sinkronkan nama di tabel lain jika berubah
      if (oldMitra && oldMitra.nama_mitra !== nama_mitra.trim()) {
        await pool.query('UPDATE penitipan_barang SET nama_penitip = ? WHERE mitra_id = ? OR nama_penitip = ?', [nama_mitra.trim(), id, oldMitra.nama_mitra]);
        await pool.query('UPDATE pembayaran_penitip SET nama_mitra = ? WHERE mitra_id = ? OR nama_mitra = ?', [nama_mitra.trim(), id, oldMitra.nama_mitra]);
      }

      return sendJson(res, 200, {
        status: 'success',
        message: 'Data Mitra Penitip berhasil diperbarui!'
      });
    } catch (err) {
      console.error('[PUT /api/penitipan-barang/mitra Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // DELETE /api/penitipan-barang/mitra/:id - Hapus Mitra
  if (req.method === 'DELETE' && pathname.startsWith('/api/penitipan-barang/mitra/')) {
    const id = pathname.split('/')[4];
    try {
      await pool.query('DELETE FROM mitra_penitip WHERE id = ?', [id]);
      return sendJson(res, 200, {
        status: 'success',
        message: 'Data Mitra Penitip berhasil dihapus.'
      });
    } catch (err) {
      console.error('[DELETE /api/penitipan-barang/mitra Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // =========================================================================
  // PEMBAYARAN ROUTES (/api/penitipan-barang/pembayaran)
  // =========================================================================

  // GET /api/penitipan-barang/pembayaran - List Histori Pembayaran ke Mitra
  if (req.method === 'GET' && pathname === '/api/penitipan-barang/pembayaran') {
    try {
      const company = urlObj.searchParams.get('company') || 'RSG';
      const mitraId = urlObj.searchParams.get('mitra_id') || '';
      const namaMitra = urlObj.searchParams.get('nama_mitra') || '';

      let query = `
        SELECT 
          id,
          kode_perusahaan,
          mitra_id,
          nama_mitra,
          no_pembayaran,
          DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal,
          CAST(nominal AS DOUBLE) as nominal,
          metode_pembayaran,
          no_referensi,
          petugas,
          catatan,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created_at
        FROM pembayaran_penitip
        WHERE (kode_perusahaan = ? OR kode_perusahaan IS NULL OR ? = '')
      `;
      const params = [company, company];

      if (mitraId) {
        query += ` AND (mitra_id = ? OR nama_mitra = ?)`;
        params.push(mitraId, namaMitra || '');
      } else if (namaMitra) {
        query += ` AND nama_mitra = ?`;
        params.push(namaMitra);
      }

      query += ` ORDER BY id DESC`;

      const [rows] = await pool.query(query, params);

      const totalNominal = rows.reduce((acc, cur) => acc + Number(cur.nominal || 0), 0);

      return sendJson(res, 200, {
        status: 'success',
        data: rows,
        total_pembayaran: totalNominal
      });
    } catch (err) {
      console.error('[GET /api/penitipan-barang/pembayaran Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // POST /api/penitipan-barang/pembayaran - Catat Pembayaran Baru ke Mitra
  if (req.method === 'POST' && pathname === '/api/penitipan-barang/pembayaran') {
    try {
      const body = await parseJsonBody(req);
      const {
        kode_perusahaan = 'RSG',
        mitra_id = null,
        nama_mitra,
        no_pembayaran,
        tanggal,
        nominal,
        metode_pembayaran = 'Transfer Bank',
        no_referensi = '',
        petugas = 'Finance Titipan',
        catatan = ''
      } = body;

      if (!nama_mitra || Number(nominal) <= 0) {
        return sendJson(res, 400, {
          status: 'error',
          message: 'Nama Mitra dan Nominal Pembayaran (harus > 0) wajib diisi!'
        });
      }

      const autoNo = no_pembayaran || `BYR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const [resInsert] = await pool.query(
        `INSERT INTO pembayaran_penitip (
          kode_perusahaan, mitra_id, nama_mitra, no_pembayaran, tanggal,
          nominal, metode_pembayaran, no_referensi, petugas, catatan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          kode_perusahaan, mitra_id, nama_mitra, autoNo, tanggal || new Date().toISOString().slice(0, 10),
          Number(nominal), metode_pembayaran, no_referensi, petugas, catatan
        ]
      );

      return sendJson(res, 201, {
        status: 'success',
        message: 'Pembayaran ke Mitra berhasil dicatat!',
        data: { id: resInsert.insertId, no_pembayaran: autoNo }
      });
    } catch (err) {
      console.error('[POST /api/penitipan-barang/pembayaran Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // DELETE /api/penitipan-barang/pembayaran/:id - Hapus Catatan Pembayaran
  if (req.method === 'DELETE' && pathname.startsWith('/api/penitipan-barang/pembayaran/')) {
    const id = pathname.split('/')[4];
    try {
      await pool.query('DELETE FROM pembayaran_penitip WHERE id = ?', [id]);
      return sendJson(res, 200, {
        status: 'success',
        message: 'Data pembayaran berhasil dihapus.'
      });
    } catch (err) {
      console.error('[DELETE /api/penitipan-barang/pembayaran Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // =========================================================================
  // OPNAME PENITIPAN ROUTES (/api/penitipan-barang/opname)
  // =========================================================================

  // GET /api/penitipan-barang/opname - List Riwayat Stock Opname Titipan
  if (req.method === 'GET' && pathname === '/api/penitipan-barang/opname') {
    try {
      const company = urlObj.searchParams.get('company') || 'RSG';
      const [rows] = await pool.query(
        `SELECT 
          id, kode_perusahaan, no_opname, 
          DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal,
          mitra_id, nama_mitra, petugas, total_item, total_selisih_qty,
          CAST(total_selisih_rp AS DOUBLE) as total_selisih_rp,
          catatan, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created_at
        FROM opname_penitipan
        WHERE (kode_perusahaan = ? OR kode_perusahaan IS NULL OR ? = '')
        ORDER BY id DESC`,
        [company, company]
      );
      return sendJson(res, 200, { status: 'success', data: rows });
    } catch (err) {
      console.error('[GET /api/penitipan-barang/opname Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // GET /api/penitipan-barang/opname/:id - Detail Sesi Opname beserta barangnya
  if (req.method === 'GET' && pathname.startsWith('/api/penitipan-barang/opname/')) {
    const id = pathname.split('/')[4];
    try {
      const [[header]] = await pool.query('SELECT * FROM opname_penitipan WHERE id = ?', [id]);
      if (!header) {
        return sendJson(res, 404, { status: 'error', message: 'Sesi opname tidak ditemukan.' });
      }
      const [details] = await pool.query('SELECT * FROM opname_penitipan_detail WHERE opname_id = ? ORDER BY id ASC', [id]);
      return sendJson(res, 200, { status: 'success', data: { header, details } });
    } catch (err) {
      console.error('[GET /api/penitipan-barang/opname/:id Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // POST /api/penitipan-barang/opname - Terapkan Hasil Scan Opname Fisik & Sesuaikan Stok Sistem
  if (req.method === 'POST' && pathname === '/api/penitipan-barang/opname') {
    try {
      const body = await parseJsonBody(req);
      const {
        kode_perusahaan = 'RSG',
        tanggal = new Date().toISOString().slice(0, 10),
        petugas = 'Staff Gudang',
        mitra_id = null,
        nama_mitra = '',
        catatan = 'Stock Opname Scan Fisik Gudang',
        items = []
      } = body;

      if (!items || items.length === 0) {
        return sendJson(res, 400, { status: 'error', message: 'Daftar item hasil scan opname tidak boleh kosong!' });
      }

      const noOpname = `OPN-TTP-${tanggal.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      let totalItem = items.length;
      let totalSelisihQty = 0;
      let totalSelisihRp = 0;

      items.forEach(it => {
        const selisih = Number(it.selisih || (Number(it.stok_fisik) - Number(it.stok_sistem)));
        const selisihRp = selisih * Number(it.harga_titip || 0);
        totalSelisihQty += selisih;
        totalSelisihRp += selisihRp;
      });

      // 1. Simpan Header Opname
      const [headerRes] = await pool.query(
        `INSERT INTO opname_penitipan (
          kode_perusahaan, no_opname, tanggal, mitra_id, nama_mitra, petugas,
          total_item, total_selisih_qty, total_selisih_rp, catatan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [kode_perusahaan, noOpname, tanggal, mitra_id, nama_mitra, petugas, totalItem, totalSelisihQty, totalSelisihRp, catatan]
      );
      const opnameId = headerRes.insertId;

      // 2. Simpan Detail & Terapkan Penyesuaian ke penitipan_barang
      for (const it of items) {
        const pId = it.id;
        const targetFisik = Math.max(0, Number(it.stok_fisik));
        const stokAwal = Number(it.stok_sistem);
        const selisih = targetFisik - stokAwal;
        const selisihRp = selisih * Number(it.harga_titip || 0);

        // Catat detail
        await pool.query(
          `INSERT INTO opname_penitipan_detail (
            opname_id, penitipan_id, kode_sku, nama_produk, nama_penitip,
            harga_titip, stok_sistem, stok_fisik, selisih_qty, selisih_rp, keterangan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            opnameId, pId, it.kode_sku || '', it.nama_produk || '', it.nama_penitip || '',
            Number(it.harga_titip || 0), stokAwal, targetFisik, selisih, selisihRp, it.keterangan || ''
          ]
        );

        // Ambil data penitipan barang saat ini
        const [[currentP]] = await pool.query('SELECT qty_titip, qty_terjual, qty_retur, keterangan FROM penitipan_barang WHERE id = ?', [pId]);
        if (currentP) {
          const qtyTerjual = Number(currentP.qty_terjual || 0);
          const qtyRetur = Number(currentP.qty_retur || 0);

          // Penyesuaian: agar (qty_titip - qty_terjual - qty_retur) == targetFisik
          // maka new qty_titip = targetFisik + qtyTerjual + qtyRetur
          const newQtyTitip = targetFisik + qtyTerjual + qtyRetur;
          const statusNew = targetFisik <= 0 ? 'Selesai' : 'Aktif';

          const noteUpdate = ` [Opname ${tanggal} (${noOpname}): Fisik ${targetFisik}, Selisih ${selisih > 0 ? '+' + selisih : selisih}]`;
          const currentKet = currentP.keterangan || '';
          const newKet = (currentKet + noteUpdate).slice(0, 1000);

          await pool.query(
            `UPDATE penitipan_barang SET
              qty_titip = ?,
              status = ?,
              keterangan = ?
            WHERE id = ?`,
            [newQtyTitip, statusNew, newKet, pId]
          );
        }
      }

      return sendJson(res, 201, {
        status: 'success',
        message: `Stok berhasil disesuaikan mengikuti hasil scan fisik (${noOpname})! Total ${totalItem} barang disinkronkan.`,
        data: {
          no_opname: noOpname,
          total_item: totalItem,
          total_selisih_qty: totalSelisihQty,
          total_selisih_rp: totalSelisihRp
        }
      });
    } catch (err) {
      console.error('[POST /api/penitipan-barang/opname Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // =========================================================================
  // PENITIPAN BARANG TRANSAKSI ROUTES (/api/penitipan-barang)
  // =========================================================================

  // 1. GET /api/penitipan-barang - List Data & Summary Kalkulasi Stok + Rupiah (Tanpa Harga Jual)
  if (req.method === 'GET' && pathname === '/api/penitipan-barang') {
    try {
      const company = urlObj.searchParams.get('company') || 'RSG';
      const search = urlObj.searchParams.get('search') || '';
      const status = urlObj.searchParams.get('status') || '';
      const penitip = urlObj.searchParams.get('penitip') || '';
      const mitraId = urlObj.searchParams.get('mitra_id') || '';

      let query = `
        SELECT 
          id,
          kode_perusahaan,
          mitra_id,
          no_titipan,
          DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal,
          nama_penitip,
          kontak_penitip,
          produk_id,
          kode_sku,
          nama_produk,
          varian,
          satuan,
          CAST(harga_titip AS DOUBLE) as harga_titip,
          qty_titip,
          qty_terjual,
          qty_retur,
          (qty_titip - qty_terjual - qty_retur) as sisa_stok,
          CAST((qty_titip * harga_titip) AS DOUBLE) as rp_total_titip,
          CAST((qty_terjual * harga_titip) AS DOUBLE) as rp_terjual_modal,
          CAST(((qty_titip - qty_terjual - qty_retur) * harga_titip) AS DOUBLE) as rp_sisa_stok_modal,
          status,
          lokasi_rak,
          petugas,
          keterangan,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created_at
        FROM penitipan_barang
        WHERE (kode_perusahaan = ? OR kode_perusahaan IS NULL OR ? = '')
      `;
      const params = [company, company];

      if (mitraId) {
        query += ` AND (mitra_id = ? OR nama_penitip = ?)`;
        params.push(mitraId, penitip || '');
      } else if (penitip && penitip !== 'Semua') {
        query += ` AND nama_penitip = ?`;
        params.push(penitip);
      }

      if (status && status !== 'Semua') {
        if (status === 'Masih Ada Stok') {
          query += ` AND (qty_titip - qty_terjual - qty_retur) > 0`;
        } else if (status === 'Habis') {
          query += ` AND (qty_titip - qty_terjual - qty_retur) <= 0`;
        } else {
          query += ` AND status = ?`;
          params.push(status);
        }
      }

      if (search) {
        query += ` AND (
          no_titipan LIKE ? OR 
          nama_penitip LIKE ? OR 
          kode_sku LIKE ? OR 
          nama_produk LIKE ? OR 
          keterangan LIKE ?
        )`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
      }

      query += ` ORDER BY id DESC`;

      const [rows] = await pool.query(query, params);

      // Hitung KPI & Summary Agregat (Stok Gudang, Terjual, Sisa Stok beserta Rupiahnya - Murni Harga Titip)
      let summary = {
        total_transaksi: 0,
        stok_di_gudang: 0,
        rp_di_gudang: 0,
        stok_terjual: 0,
        rp_terjual_modal: 0,
        sisa_stok: 0,
        rp_sisa_stok: 0,
        total_kewajiban: 0,
        total_sudah_dibayar: 0,
        sisa_hutang: 0
      };

      rows.forEach(r => {
        summary.total_transaksi++;
        summary.stok_di_gudang += Number(r.qty_titip || 0);
        summary.rp_di_gudang += Number(r.rp_total_titip || 0);
        summary.stok_terjual += Number(r.qty_terjual || 0);
        summary.rp_terjual_modal += Number(r.rp_terjual_modal || 0);
        summary.sisa_stok += Number(r.sisa_stok || 0);
        summary.rp_sisa_stok += Number(r.rp_sisa_stok_modal || 0);
      });

      // Total kewajiban setoran ke mitra dari barang laku
      summary.total_kewajiban = summary.rp_terjual_modal;

      // Ambil total seluruh pembayaran yang sudah dilakukan
      const [[byrTotalRow]] = await pool.query(
        `SELECT CAST(COALESCE(SUM(nominal), 0) AS DOUBLE) as total_dibayar FROM pembayaran_penitip WHERE (kode_perusahaan = ? OR ? = '' OR kode_perusahaan IS NULL)`,
        [company, company]
      );
      summary.total_sudah_dibayar = Number(byrTotalRow?.total_dibayar || 0);
      summary.sisa_hutang = Math.max(0, summary.total_kewajiban - summary.total_sudah_dibayar);

      // Ambil daftar unik nama penitip untuk filter dropdown
      const [penitipRows] = await pool.query(
        `SELECT DISTINCT nama_penitip FROM penitipan_barang WHERE (kode_perusahaan = ? OR ? = '' OR kode_perusahaan IS NULL) ORDER BY nama_penitip ASC`,
        [company, company]
      );
      const penitipList = penitipRows.map(p => p.nama_penitip).filter(Boolean);

      return sendJson(res, 200, {
        status: 'success',
        data: rows,
        summary,
        penitip_list: penitipList
      });
    } catch (err) {
      console.error('[GET /api/penitipan-barang Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 2. POST /api/penitipan-barang - Tambah Data Penitipan Barang Baru (Tanpa Harga Jual)
  if (req.method === 'POST' && pathname === '/api/penitipan-barang') {
    try {
      const body = await parseJsonBody(req);
      const {
        kode_perusahaan = 'RSG',
        mitra_id = null,
        no_titipan,
        tanggal,
        nama_penitip,
        kontak_penitip = '',
        produk_id = null,
        kode_sku,
        nama_produk,
        varian = '',
        satuan = 'PCS',
        harga_titip = 0,
        qty_titip = 0,
        qty_terjual = 0,
        qty_retur = 0,
        status = 'Aktif',
        lokasi_rak = 'Gudang Konsinyasi',
        petugas = 'Staff Gudang',
        keterangan = ''
      } = body;

      if (!nama_penitip || !nama_produk || Number(qty_titip) <= 0) {
        return sendJson(res, 400, {
          status: 'error',
          message: 'Nama penitip, nama produk, dan jumlah qty titip wajib diisi!'
        });
      }

      // Pastikan ada mitra_id terhubung
      let finalMitraId = mitra_id;
      if (!finalMitraId) {
        const [[foundM]] = await pool.query('SELECT id FROM mitra_penitip WHERE nama_mitra = ? LIMIT 1', [nama_penitip]);
        if (foundM) {
          finalMitraId = foundM.id;
        } else {
          // Buat mitra baru otomatis jika belum terdaftar
          const [insM] = await pool.query(
            'INSERT INTO mitra_penitip (kode_perusahaan, nama_mitra, kontak) VALUES (?, ?, ?)',
            [kode_perusahaan, nama_penitip, kontak_penitip]
          );
          finalMitraId = insM.insertId;
        }
      }

      // Auto generate no titipan jika kosong
      const autoNo = no_titipan || `TTP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const [result] = await pool.query(
        `INSERT INTO penitipan_barang (
          kode_perusahaan, mitra_id, no_titipan, tanggal, nama_penitip, kontak_penitip,
          produk_id, kode_sku, nama_produk, varian, satuan, harga_titip,
          qty_titip, qty_terjual, qty_retur, status, lokasi_rak, petugas, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          kode_perusahaan, finalMitraId, autoNo, tanggal || new Date().toISOString().slice(0, 10), nama_penitip, kontak_penitip,
          produk_id, kode_sku || autoNo, nama_produk, varian, satuan, Number(harga_titip || 0),
          Number(qty_titip || 0), Number(qty_terjual || 0), Number(qty_retur || 0), status, lokasi_rak, petugas, keterangan
        ]
      );

      return sendJson(res, 201, {
        status: 'success',
        message: 'Data penitipan barang berhasil dicatat!',
        data: { id: result.insertId, no_titipan: autoNo }
      });
    } catch (err) {
      console.error('[POST /api/penitipan-barang Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 3. PUT /api/penitipan-barang/:id - Edit Data Penitipan Barang (Tanpa Harga Jual)
  if (req.method === 'PUT' && pathname.startsWith('/api/penitipan-barang/')) {
    const id = pathname.split('/')[3];
    if (!id || id === 'terjual' || id === 'mitra' || id === 'pembayaran') return false;

    try {
      const body = await parseJsonBody(req);
      const {
        tanggal,
        mitra_id,
        nama_penitip,
        kontak_penitip,
        kode_sku,
        nama_produk,
        varian,
        satuan,
        harga_titip,
        qty_titip,
        qty_terjual,
        qty_retur,
        status,
        lokasi_rak,
        petugas,
        keterangan
      } = body;

      await pool.query(
        `UPDATE penitipan_barang SET
          tanggal = COALESCE(?, tanggal),
          mitra_id = COALESCE(?, mitra_id),
          nama_penitip = COALESCE(?, nama_penitip),
          kontak_penitip = COALESCE(?, kontak_penitip),
          kode_sku = COALESCE(?, kode_sku),
          nama_produk = COALESCE(?, nama_produk),
          varian = COALESCE(?, varian),
          satuan = COALESCE(?, satuan),
          harga_titip = COALESCE(?, harga_titip),
          qty_titip = COALESCE(?, qty_titip),
          qty_terjual = COALESCE(?, qty_terjual),
          qty_retur = COALESCE(?, qty_retur),
          status = COALESCE(?, status),
          lokasi_rak = COALESCE(?, lokasi_rak),
          petugas = COALESCE(?, petugas),
          keterangan = COALESCE(?, keterangan)
        WHERE id = ?`,
        [
          tanggal, mitra_id, nama_penitip, kontak_penitip, kode_sku, nama_produk, varian, satuan,
          Number(harga_titip), Number(qty_titip), Number(qty_terjual), Number(qty_retur),
          status, lokasi_rak, petugas, keterangan, id
        ]
      );

      return sendJson(res, 200, {
        status: 'success',
        message: 'Data penitipan barang berhasil diperbarui!'
      });
    } catch (err) {
      console.error('[PUT /api/penitipan-barang Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 4. POST /api/penitipan-barang/:id/terjual - Catat Penjualan Cepat
  if (req.method === 'POST' && pathname.includes('/terjual')) {
    const parts = pathname.split('/');
    const id = parts[3];

    try {
      const body = await parseJsonBody(req);
      const qtyTambahan = Number(body.qty_terjual || 0);

      if (qtyTambahan <= 0) {
        return sendJson(res, 400, { status: 'error', message: 'Jumlah terjual harus lebih dari 0!' });
      }

      // Cek sisa stok saat ini
      const [[current]] = await pool.query('SELECT qty_titip, qty_terjual, qty_retur FROM penitipan_barang WHERE id = ?', [id]);
      if (!current) {
        return sendJson(res, 404, { status: 'error', message: 'Data penitipan tidak ditemukan!' });
      }

      const sisaSaatIni = Number(current.qty_titip) - Number(current.qty_terjual) - Number(current.qty_retur);
      if (qtyTambahan > sisaSaatIni) {
        return sendJson(res, 400, {
          status: 'error',
          message: `Jumlah terjual (${qtyTambahan}) melebihi sisa stok yang ada di gudang (${sisaSaatIni})!`
        });
      }

      await pool.query(
        `UPDATE penitipan_barang SET 
          qty_terjual = qty_terjual + ?,
          status = CASE WHEN (qty_titip - (qty_terjual + ?) - qty_retur) <= 0 THEN 'Selesai' ELSE 'Aktif' END
        WHERE id = ?`,
        [qtyTambahan, qtyTambahan, id]
      );

      return sendJson(res, 200, {
        status: 'success',
        message: `Berhasil mencatat penjualan ${qtyTambahan} barang!`
      });
    } catch (err) {
      console.error('[POST /api/penitipan-barang/terjual Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // 5. DELETE /api/penitipan-barang/:id - Hapus Data Penitipan
  if (req.method === 'DELETE' && pathname.startsWith('/api/penitipan-barang/')) {
    const id = pathname.split('/')[3];
    if (id === 'mitra' || id === 'pembayaran') return false;

    try {
      await pool.query('DELETE FROM penitipan_barang WHERE id = ?', [id]);
      return sendJson(res, 200, {
        status: 'success',
        message: 'Data penitipan barang berhasil dihapus.'
      });
    } catch (err) {
      console.error('[DELETE /api/penitipan-barang Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  return false;
}
