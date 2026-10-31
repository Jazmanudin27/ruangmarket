import { sendJson, parseJsonBody } from '../utils/response.js';

const INITIAL_MUTASI_BARANG = [
  {
    tanggal: '2026-10-31',
    no_bukti: 'BM-20261031-001',
    jenis_mutasi: 'masuk',
    kategori: 'Hasil Produksi / SPK',
    kode_sku: 'BB-TH-MERAH-LPJ-M',
    nama_produk: 'Baju Batik Tunas Harapan Merah Lengan Panjang M',
    varian: 'Merah / M',
    satuan: 'PCS',
    jumlah: 50,
    stok_sebelum: 20,
    stok_sesudah: 70,
    no_referensi: 'SPK-KE9A-01',
    pihak_terkait: 'Penjahit Mas Deni (Makloon)',
    petugas: 'Ahmad Gudang',
    keterangan: 'Penerimaan hasil jahit SPK-KE9A-01 seragam batik selesai QC'
  },
  {
    tanggal: '2026-10-31',
    no_bukti: 'BM-20261031-002',
    jenis_mutasi: 'masuk',
    kategori: 'Hasil Produksi / SPK',
    kode_sku: 'BB-TH-MERAH-LPK-L',
    nama_produk: 'Baju Batik Tunas Harapan Merah Lengan Pendek L',
    varian: 'Merah / L',
    satuan: 'PCS',
    jumlah: 30,
    stok_sebelum: 15,
    stok_sesudah: 45,
    no_referensi: 'SPK-KE9A-02',
    pihak_terkait: 'Penjahit Bu Siti (Workshop)',
    petugas: 'Ahmad Gudang',
    keterangan: 'Penerimaan hasil potong & jahit selesai 100%'
  },
  {
    tanggal: '2026-10-30',
    no_bukti: 'BK-20261030-001',
    jenis_mutasi: 'keluar',
    kategori: 'Penjualan Offline',
    kode_sku: 'BB-TH-MERAH-LPJ-M',
    nama_produk: 'Baju Batik Tunas Harapan Merah Lengan Panjang M',
    varian: 'Merah / M',
    satuan: 'PCS',
    jumlah: 20,
    stok_sebelum: 70,
    stok_sesudah: 50,
    no_referensi: 'OFF-20261030-KE9A',
    pihak_terkait: 'Pesantren Al-Hikmah (Pembeli)',
    petugas: 'Riko Packing',
    keterangan: 'Pengiriman pesanan seragam batik offline via Cargo'
  },
  {
    tanggal: '2026-10-29',
    no_bukti: 'BK-20261029-001',
    jenis_mutasi: 'keluar',
    kategori: 'Pesanan Marketplace',
    kode_sku: 'BB-TH-BIRU-LPK-XL',
    nama_produk: 'Baju Batik Tunas Harapan Biru Lengan Pendek XL',
    varian: 'Biru / XL',
    satuan: 'PCS',
    jumlah: 15,
    stok_sebelum: 40,
    stok_sesudah: 25,
    no_referensi: '2610298HGQ12',
    pihak_terkait: 'Shopee Official Store',
    petugas: 'Staff Packing Online',
    keterangan: 'Pesanan Shopee SPX Express paket kemasan'
  },
  {
    tanggal: '2026-10-28',
    no_bukti: 'BM-20261028-001',
    jenis_mutasi: 'masuk',
    kategori: 'Retur Pembeli',
    kode_sku: 'BB-TH-MERAH-LPJ-M',
    nama_produk: 'Baju Batik Tunas Harapan Merah Lengan Panjang M',
    varian: 'Merah / M',
    satuan: 'PCS',
    jumlah: 2,
    stok_sebelum: 48,
    stok_sesudah: 50,
    no_referensi: 'RET-20261028-001',
    pihak_terkait: 'Pembeli Shopee (Tukar Size)',
    petugas: 'QC Retur',
    keterangan: 'Barang retur kembali dalam kondisi baik dan di-restock ke gudang'
  },
  {
    tanggal: '2026-10-27',
    no_bukti: 'BK-20261027-001',
    jenis_mutasi: 'keluar',
    kategori: 'Barang Rusak / Reject',
    kode_sku: 'BB-TH-MERAH-LPK-L',
    nama_produk: 'Baju Batik Tunas Harapan Merah Lengan Pendek L',
    varian: 'Merah / L',
    satuan: 'PCS',
    jumlah: 3,
    stok_sebelum: 48,
    stok_sesudah: 45,
    no_referensi: 'QC-REJECT-09',
    pihak_terkait: 'Gudang Utama',
    petugas: 'QC Retur',
    keterangan: 'Penyusutan barang reject kotor noda sablon tidak lolos finishing'
  }
];

const INITIAL_KATEGORI_MUTASI = [
  { nama: 'Hasil Produksi / SPK', jenis: 'masuk' },
  { nama: 'Pembelian Supplier', jenis: 'masuk' },
  { nama: 'Retur Pembeli', jenis: 'masuk' },
  { nama: 'Koreksi Stok (Lebih)', jenis: 'masuk' },
  { nama: 'Penjualan Offline', jenis: 'keluar' },
  { nama: 'Pesanan Marketplace', jenis: 'keluar' },
  { nama: 'Barang Rusak / Reject', jenis: 'keluar' },
  { nama: 'Sample / Promosi', jenis: 'keluar' },
  { nama: 'Koreksi Stok (Kurang)', jenis: 'keluar' },
  { nama: 'Penyesuaian Opname', jenis: 'semua' },
  { nama: 'Lain-lain', jenis: 'semua' }
];

async function ensureMutasiBarangTable(pool) {
  // 1. Tabel Mutasi Barang
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mutasi_barang (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      tanggal DATE NOT NULL,
      no_bukti VARCHAR(60) NOT NULL,
      jenis_mutasi VARCHAR(20) NOT NULL DEFAULT 'masuk',
      kategori VARCHAR(100) NOT NULL DEFAULT 'Hasil Produksi / SPK',
      produk_id INT NULL,
      kode_sku VARCHAR(100) NOT NULL,
      nama_produk VARCHAR(255) NOT NULL,
      varian VARCHAR(100) DEFAULT '',
      satuan VARCHAR(32) DEFAULT 'PCS',
      jumlah INT NOT NULL DEFAULT 1,
      stok_sebelum INT NOT NULL DEFAULT 0,
      stok_sesudah INT NOT NULL DEFAULT 0,
      no_referensi VARCHAR(100) DEFAULT '',
      pihak_terkait VARCHAR(150) DEFAULT '',
      petugas VARCHAR(100) DEFAULT 'Staff Gudang',
      keterangan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_perusahaan_tgl (kode_perusahaan, tanggal),
      INDEX idx_jenis (jenis_mutasi),
      INDEX idx_sku (kode_sku),
      INDEX idx_bukti (no_bukti)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Riwayat Mutasi Barang Masuk dan Keluar';
  `);

  // Seed data awal jika kosong
  const [[countRow]] = await pool.query('SELECT COUNT(*) as total FROM mutasi_barang');
  if (countRow.total === 0) {
    for (const m of INITIAL_MUTASI_BARANG) {
      await pool.query(
        `INSERT INTO mutasi_barang (
          kode_perusahaan, tanggal, no_bukti, jenis_mutasi, kategori,
          kode_sku, nama_produk, varian, satuan, jumlah,
          stok_sebelum, stok_sesudah, no_referensi, pihak_terkait, petugas, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'RSG', m.tanggal, m.no_bukti, m.jenis_mutasi, m.kategori,
          m.kode_sku, m.nama_produk, m.varian, m.satuan, m.jumlah,
          m.stok_sebelum, m.stok_sesudah, m.no_referensi, m.pihak_terkait, m.petugas, m.keterangan
        ]
      );
    }
  }

  // 2. Tabel Kategori Mutasi Barang
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kategori_mutasi_barang (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
      nama_kategori VARCHAR(100) NOT NULL,
      jenis_mutasi VARCHAR(20) DEFAULT 'semua',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_perusahaan (kode_perusahaan)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Master Kategori Mutasi Barang';
  `);

  const [[countKat]] = await pool.query('SELECT COUNT(*) as total FROM kategori_mutasi_barang');
  if (countKat.total === 0) {
    for (const k of INITIAL_KATEGORI_MUTASI) {
      await pool.query(
        `INSERT INTO kategori_mutasi_barang (kode_perusahaan, nama_kategori, jenis_mutasi)
         VALUES (?, ?, ?)`,
        ['RSG', k.nama, k.jenis]
      );
    }
  }
}

export async function handleMutasiBarangRoutes(req, res, pathname, urlObj, context) {
  const { pool } = context;

  // Pastikan tabel siap
  try {
    await ensureMutasiBarangTable(pool);
  } catch (err) {
    console.error('[Mutasi Barang] Init Table Error:', err.message);
  }

  // 1. GET /api/mutasi-barang - Daftar Mutasi Barang
  if (pathname === '/api/mutasi-barang' && req.method === 'GET') {
    try {
      const company = urlObj.searchParams.get('company') || urlObj.searchParams.get('kode_perusahaan') || 'RSG';
      const jenis = urlObj.searchParams.get('jenis'); // 'masuk' | 'keluar' | 'penyesuaian' | null
      const kategori = urlObj.searchParams.get('kategori');
      const search = urlObj.searchParams.get('search');
      const startDate = urlObj.searchParams.get('start_date');
      const endDate = urlObj.searchParams.get('end_date');

      let query = `
        SELECT 
          id, kode_perusahaan, DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggal,
          no_bukti, jenis_mutasi, kategori, produk_id, kode_sku, nama_produk,
          COALESCE(varian, '') as varian, COALESCE(satuan, 'PCS') as satuan,
          jumlah, stok_sebelum, stok_sesudah,
          COALESCE(no_referensi, '') as no_referensi,
          COALESCE(pihak_terkait, '') as pihak_terkait,
          COALESCE(petugas, 'Staff Gudang') as petugas,
          COALESCE(keterangan, '') as keterangan,
          DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') as created_at
        FROM mutasi_barang
        WHERE (kode_perusahaan = ? OR kode_perusahaan IS NULL OR kode_perusahaan = '' OR ? = 'ALL')
      `;
      const params = [company, company];

      if (jenis && jenis !== 'semua') {
        query += ' AND jenis_mutasi = ?';
        params.push(jenis);
      }
      if (kategori && kategori !== 'Semua') {
        query += ' AND kategori = ?';
        params.push(kategori);
      }
      if (startDate) {
        query += ' AND tanggal >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND tanggal <= ?';
        params.push(endDate);
      }
      if (search) {
        query += ` AND (
          no_bukti LIKE ? OR 
          kode_sku LIKE ? OR 
          nama_produk LIKE ? OR 
          keterangan LIKE ? OR 
          no_referensi LIKE ? OR 
          pihak_terkait LIKE ? OR 
          petugas LIKE ?
        )`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s, s, s);
      }

      query += ' ORDER BY tanggal DESC, id DESC';

      const [rows] = await pool.query(query, params);

      // Hitung ringkasan total mutasi
      const [summaryRows] = await pool.query(`
        SELECT 
          COUNT(*) as total_transaksi,
          COALESCE(SUM(CASE WHEN jenis_mutasi = 'masuk' THEN jumlah ELSE 0 END), 0) as total_qty_masuk,
          COALESCE(SUM(CASE WHEN jenis_mutasi = 'keluar' THEN jumlah ELSE 0 END), 0) as total_qty_keluar,
          COALESCE(SUM(CASE WHEN jenis_mutasi = 'masuk' THEN 1 ELSE 0 END), 0) as transaksi_masuk,
          COALESCE(SUM(CASE WHEN jenis_mutasi = 'keluar' THEN 1 ELSE 0 END), 0) as transaksi_keluar,
          COALESCE(SUM(CASE WHEN jenis_mutasi = 'penyesuaian' THEN 1 ELSE 0 END), 0) as transaksi_penyesuaian
        FROM mutasi_barang
        WHERE (kode_perusahaan = ? OR kode_perusahaan IS NULL OR kode_perusahaan = '' OR ? = 'ALL')
      `, [company, company]);

      sendJson(res, 200, {
        status: 'success',
        data: rows,
        summary: summaryRows[0] || {
          total_transaksi: rows.length,
          total_qty_masuk: 0,
          total_qty_keluar: 0,
          transaksi_masuk: 0,
          transaksi_keluar: 0,
          transaksi_penyesuaian: 0
        }
      });
      return true;
    } catch (err) {
      console.error('[GET /api/mutasi-barang] Error:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/mutasi-barang - Tambah Catatan Mutasi Barang
  if (pathname === '/api/mutasi-barang' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const {
        kode_perusahaan = 'RSG',
        tanggal,
        no_bukti,
        jenis_mutasi = 'masuk',
        kategori = 'Hasil Produksi / SPK',
        produk_id,
        kode_sku,
        nama_produk,
        varian = '',
        satuan = 'PCS',
        jumlah = 1,
        no_referensi = '',
        pihak_terkait = '',
        petugas = 'Staff Gudang',
        keterangan = ''
      } = body;

      if (!tanggal || !kode_sku || !nama_produk) {
        sendJson(res, 400, { status: 'error', message: 'Tanggal, SKU, dan Nama Produk wajib diisi!' });
        return true;
      }

      const qty = Math.max(1, parseInt(jumlah, 10) || 1);

      // 1. Ambil stok fisik saat ini dari produk_master
      let currentStock = 0;
      let matchedProductId = produk_id;
      try {
        const [pRows] = await pool.query(
          'SELECT id, stok_fisik, nama_produk, kode_sku, satuan FROM produk_master WHERE id = ? OR kode_sku = ? LIMIT 1',
          [matchedProductId || 0, kode_sku]
        );
        if (pRows.length > 0) {
          currentStock = Number(pRows[0].stok_fisik) || 0;
          matchedProductId = pRows[0].id;
        }
      } catch (eStock) {}

      // 2. Hitung stok sesudah mutasi
      let stokSesudah = currentStock;
      if (jenis_mutasi === 'masuk') {
        stokSesudah = currentStock + qty;
      } else if (jenis_mutasi === 'keluar') {
        stokSesudah = Math.max(0, currentStock - qty);
      } else if (jenis_mutasi === 'penyesuaian') {
        // jika penyesuaian, qty adalah target stok baru atau selisih
        stokSesudah = parseInt(body.stok_sesudah, 10) !== undefined ? parseInt(body.stok_sesudah, 10) : qty;
      }

      // Auto-generate No Bukti jika kosong
      const nowYmd = (tanggal || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
      const prefix = jenis_mutasi === 'masuk' ? 'BM' : jenis_mutasi === 'keluar' ? 'BK' : 'ADJ';
      const finalNoBukti = (no_bukti || '').trim() || `${prefix}-${nowYmd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // 3. Simpan ke tabel mutasi_barang
      const [insertRes] = await pool.query(`
        INSERT INTO mutasi_barang (
          kode_perusahaan, tanggal, no_bukti, jenis_mutasi, kategori,
          produk_id, kode_sku, nama_produk, varian, satuan, jumlah,
          stok_sebelum, stok_sesudah, no_referensi, pihak_terkait, petugas, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        kode_perusahaan, tanggal, finalNoBukti, jenis_mutasi, kategori,
        matchedProductId, kode_sku, nama_produk, varian, satuan, qty,
        currentStock, stokSesudah, no_referensi, pihak_terkait, petugas, keterangan
      ]);

      // 4. Update stok fisik di produk_master secara otomatis
      if (matchedProductId || kode_sku) {
        try {
          await pool.query(
            'UPDATE produk_master SET stok_fisik = ? WHERE id = ? OR kode_sku = ?',
            [stokSesudah, matchedProductId || 0, kode_sku]
          );
        } catch (eUp) {
          console.warn('[Mutasi Barang] Update stock warning:', eUp.message);
        }
      }

      sendJson(res, 201, {
        status: 'success',
        message: `Mutasi ${jenis_mutasi.toUpperCase()} berhasil dicatat. Stok ${kode_sku} kini: ${stokSesudah} ${satuan}.`,
        data: {
          id: insertRes.insertId,
          no_bukti: finalNoBukti,
          stok_sebelum: currentStock,
          stok_sesudah: stokSesudah
        }
      });
      return true;
    } catch (err) {
      console.error('[POST /api/mutasi-barang] Error:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. PUT /api/mutasi-barang/:id - Edit Catatan Mutasi Barang
  const editMatch = pathname.match(/^\/api\/mutasi-barang\/(\d+)$/);
  if (editMatch && req.method === 'PUT') {
    const id = editMatch[1];
    try {
      const body = await parseJsonBody(req);
      const {
        tanggal,
        no_bukti,
        jenis_mutasi,
        kategori,
        kode_sku,
        nama_produk,
        varian,
        satuan,
        jumlah,
        stok_sebelum,
        stok_sesudah,
        no_referensi,
        pihak_terkait,
        petugas,
        keterangan
      } = body;

      await pool.query(`
        UPDATE mutasi_barang SET
          tanggal = COALESCE(?, tanggal),
          no_bukti = COALESCE(?, no_bukti),
          jenis_mutasi = COALESCE(?, jenis_mutasi),
          kategori = COALESCE(?, kategori),
          kode_sku = COALESCE(?, kode_sku),
          nama_produk = COALESCE(?, nama_produk),
          varian = COALESCE(?, varian),
          satuan = COALESCE(?, satuan),
          jumlah = COALESCE(?, jumlah),
          stok_sebelum = COALESCE(?, stok_sebelum),
          stok_sesudah = COALESCE(?, stok_sesudah),
          no_referensi = COALESCE(?, no_referensi),
          pihak_terkait = COALESCE(?, pihak_terkait),
          petugas = COALESCE(?, petugas),
          keterangan = COALESCE(?, keterangan)
        WHERE id = ?
      `, [
        tanggal, no_bukti, jenis_mutasi, kategori,
        kode_sku, nama_produk, varian, satuan, jumlah,
        stok_sebelum, stok_sesudah, no_referensi, pihak_terkait, petugas, keterangan,
        id
      ]);

      sendJson(res, 200, { status: 'success', message: 'Data mutasi barang berhasil diperbarui' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 4. DELETE /api/mutasi-barang/:id - Hapus Mutasi & Revert Stok
  if (editMatch && req.method === 'DELETE') {
    const id = editMatch[1];
    try {
      // Ambil data sebelum dihapus untuk revert stok
      const [rows] = await pool.query('SELECT * FROM mutasi_barang WHERE id = ?', [id]);
      if (rows.length > 0) {
        const m = rows[0];
        const qty = Number(m.jumlah) || 0;
        if (m.kode_sku && qty > 0) {
          // Revert: jika dulu masuk, maka kurangi; jika dulu keluar, maka tambahi
          if (m.jenis_mutasi === 'masuk') {
            await pool.query('UPDATE produk_master SET stok_fisik = GREATEST(0, stok_fisik - ?) WHERE kode_sku = ?', [qty, m.kode_sku]);
          } else if (m.jenis_mutasi === 'keluar') {
            await pool.query('UPDATE produk_master SET stok_fisik = stok_fisik + ? WHERE kode_sku = ?', [qty, m.kode_sku]);
          }
        }
      }

      await pool.query('DELETE FROM mutasi_barang WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success', message: 'Data mutasi barang berhasil dihapus dan stok direversi.' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 5. GET /api/mutasi-barang/kategori - Master Kategori Mutasi Barang
  if (pathname === '/api/mutasi-barang/kategori' && req.method === 'GET') {
    try {
      const company = urlObj.searchParams.get('company') || 'RSG';
      const [rows] = await pool.query(
        'SELECT id, nama_kategori, jenis_mutasi FROM kategori_mutasi_barang WHERE kode_perusahaan = ? OR kode_perusahaan IS NULL ORDER BY id ASC',
        [company]
      );
      sendJson(res, 200, { status: 'success', data: rows });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 6. POST /api/mutasi-barang/kategori - Tambah Kategori Mutasi Barang
  if (pathname === '/api/mutasi-barang/kategori' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { kode_perusahaan = 'RSG', nama_kategori, jenis_mutasi = 'semua' } = body;
      if (!nama_kategori?.trim()) {
        sendJson(res, 400, { status: 'error', message: 'Nama kategori wajib diisi!' });
        return true;
      }
      const [insertRes] = await pool.query(
        'INSERT INTO kategori_mutasi_barang (kode_perusahaan, nama_kategori, jenis_mutasi) VALUES (?, ?, ?)',
        [kode_perusahaan, nama_kategori.trim(), jenis_mutasi]
      );
      sendJson(res, 201, { status: 'success', id: insertRes.insertId, message: 'Kategori berhasil ditambahkan' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 7. PUT /api/mutasi-barang/kategori/:id - Edit Kategori
  const katMatch = pathname.match(/^\/api\/mutasi-barang\/kategori\/(\d+)$/);
  if (katMatch && req.method === 'PUT') {
    const id = katMatch[1];
    try {
      const body = await parseJsonBody(req);
      const { nama_kategori, jenis_mutasi } = body;
      await pool.query(
        'UPDATE kategori_mutasi_barang SET nama_kategori = COALESCE(?, nama_kategori), jenis_mutasi = COALESCE(?, jenis_mutasi) WHERE id = ?',
        [nama_kategori ? nama_kategori.trim() : null, jenis_mutasi, id]
      );
      sendJson(res, 200, { status: 'success', message: 'Kategori berhasil diperbarui' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 8. DELETE /api/mutasi-barang/kategori/:id - Hapus Kategori
  if (katMatch && req.method === 'DELETE') {
    const id = katMatch[1];
    try {
      await pool.query('DELETE FROM kategori_mutasi_barang WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success', message: 'Kategori berhasil dihapus' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}

