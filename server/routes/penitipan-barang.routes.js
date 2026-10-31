import { sendJson, parseJsonBody } from '../utils/response.js';

const INITIAL_PENITIPAN_BARANG = [
  {
    tanggal: '2026-10-25',
    no_titipan: 'TTP-20261025-001',
    nama_penitip: 'Konveksi Berkah Mandiri (Pak Joko)',
    kontak_penitip: '0812-3456-7890',
    kode_sku: 'TITIP-MUKENA-SILK-01',
    nama_produk: 'Mukena Silk Premium Renda Bordir Mewah',
    varian: 'Dusty Pink / All Size',
    satuan: 'PCS',
    harga_titip: 120000,
    harga_jual: 165000,
    qty_titip: 100,
    qty_terjual: 65,
    qty_retur: 0,
    status: 'Aktif',
    lokasi_rak: 'Rak Konsinyasi A-01',
    petugas: 'Ahmad Gudang',
    keterangan: 'Titipan mukena menjelang event promo. Sistem pembayaran konsinyasi per akhir bulan.'
  },
  {
    tanggal: '2026-10-26',
    no_titipan: 'TTP-20261026-002',
    nama_penitip: 'CV Al-Fath Textile Bandung',
    kontak_penitip: '0857-1122-3344',
    kode_sku: 'TITIP-SARUNG-DOBBY-02',
    nama_produk: 'Sarung Tenun Dobby Polos Elegan',
    varian: 'Hitam / Standar',
    satuan: 'PCS',
    harga_titip: 65000,
    harga_jual: 95000,
    qty_titip: 150,
    qty_terjual: 90,
    qty_retur: 0,
    status: 'Aktif',
    lokasi_rak: 'Rak Konsinyasi B-03',
    petugas: 'Siti Logistik',
    keterangan: 'Konsinyasi sarung santri grade A.'
  },
  {
    tanggal: '2026-10-28',
    no_titipan: 'TTP-20261028-003',
    nama_penitip: 'Hijab House Solo (Ibu Nur)',
    kontak_penitip: '0813-9876-5432',
    kode_sku: 'TITIP-PASHMINA-CERUTY-03',
    nama_produk: 'Pashmina Ceruty Baby Doll Polos',
    varian: 'Sage Green',
    satuan: 'PCS',
    harga_titip: 25000,
    harga_jual: 40000,
    qty_titip: 200,
    qty_terjual: 140,
    qty_retur: 10,
    status: 'Aktif',
    lokasi_rak: 'Rak Konsinyasi C-02',
    petugas: 'Ahmad Gudang',
    keterangan: 'Retur 10 pcs reject bahan cacat dari pabrik.'
  },
  {
    tanggal: '2026-10-29',
    no_titipan: 'TTP-20261029-004',
    nama_penitip: 'Batik Danar Gallery',
    kontak_penitip: '0811-2233-4455',
    kode_sku: 'TITIP-BATIK-KATUN-PRADA',
    nama_produk: 'Kain Batik Katun Halus Motif Prada Modern',
    varian: 'Coklat Emas / 2.2 Meter',
    satuan: 'Lembar',
    harga_titip: 85000,
    harga_jual: 125000,
    qty_titip: 80,
    qty_terjual: 30,
    qty_retur: 0,
    status: 'Aktif',
    lokasi_rak: 'Gudang Bahan Konsinyasi',
    petugas: 'Hendra Admin',
    keterangan: 'Titipan kain batik semi-tulis untuk pesanan seragam keluarga.'
  },
  {
    tanggal: '2026-10-30',
    no_titipan: 'TTP-20261030-005',
    nama_penitip: 'Koko Santri Prima Tasikmalaya',
    kontak_penitip: '0878-4455-6677',
    kode_sku: 'TITIP-KOKO-HAIBAT-L',
    nama_produk: 'Baju Koko Haibat Kerah Mandarin Katun Madinah L',
    varian: 'Putih Bersih / L',
    satuan: 'PCS',
    harga_titip: 75000,
    harga_jual: 110000,
    qty_titip: 120,
    qty_terjual: 50,
    qty_retur: 0,
    status: 'Aktif',
    lokasi_rak: 'Rak Konsinyasi A-02',
    petugas: 'Siti Logistik',
    keterangan: 'Konsinyasi baju koko santri pria eksklusif.'
  }
];

async function ensurePenitipanTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS penitipan_barang (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
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
      harga_jual DECIMAL(15,2) NOT NULL DEFAULT 0,
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

  const [[countRow]] = await pool.query('SELECT COUNT(*) as total FROM penitipan_barang');
  if (countRow.total === 0) {
    for (const item of INITIAL_PENITIPAN_BARANG) {
      await pool.query(
        `INSERT INTO penitipan_barang (
          kode_perusahaan, no_titipan, tanggal, nama_penitip, kontak_penitip,
          kode_sku, nama_produk, varian, satuan, harga_titip, harga_jual,
          qty_titip, qty_terjual, qty_retur, status, lokasi_rak, petugas, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'RSG', item.no_titipan, item.tanggal, item.nama_penitip, item.kontak_penitip,
          item.kode_sku, item.nama_produk, item.varian, item.satuan, item.harga_titip, item.harga_jual,
          item.qty_titip, item.qty_terjual, item.qty_retur, item.status, item.lokasi_rak, item.petugas, item.keterangan
        ]
      );
    }
  }
}

export async function handlePenitipanBarangRoutes(req, res, pathname, urlObj, context) {
  const { pool } = context;

  if (!pathname.startsWith('/api/penitipan-barang')) {
    return false;
  }

  try {
    await ensurePenitipanTable(pool);
  } catch (err) {
    console.error('[Penitipan Table Init Error]:', err.message);
  }

  // 1. GET /api/penitipan-barang - List Data & Summary Kalkulasi Stok + Rupiah
  if (req.method === 'GET' && pathname === '/api/penitipan-barang') {
    try {
      const company = urlObj.searchParams.get('company') || 'RSG';
      const search = urlObj.searchParams.get('search') || '';
      const status = urlObj.searchParams.get('status') || '';
      const penitip = urlObj.searchParams.get('penitip') || '';

      let query = `
        SELECT 
          id,
          kode_perusahaan,
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
          CAST(harga_jual AS DOUBLE) as harga_jual,
          qty_titip,
          qty_terjual,
          qty_retur,
          (qty_titip - qty_terjual - qty_retur) as sisa_stok,
          CAST((qty_titip * harga_titip) AS DOUBLE) as rp_total_titip,
          CAST((qty_titip * harga_jual) AS DOUBLE) as rp_potensi_jual,
          CAST((qty_terjual * harga_titip) AS DOUBLE) as rp_terjual_modal,
          CAST((qty_terjual * harga_jual) AS DOUBLE) as rp_terjual_omset,
          CAST(((qty_titip - qty_terjual - qty_retur) * harga_titip) AS DOUBLE) as rp_sisa_stok_modal,
          CAST(((qty_titip - qty_terjual - qty_retur) * harga_jual) AS DOUBLE) as rp_sisa_stok_jual,
          status,
          lokasi_rak,
          petugas,
          keterangan,
          DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') as created_at
        FROM penitipan_barang
        WHERE (kode_perusahaan = ? OR kode_perusahaan IS NULL OR ? = '')
      `;
      const params = [company, company];

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

      if (penitip && penitip !== 'Semua') {
        query += ` AND nama_penitip = ?`;
        params.push(penitip);
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

      // Hitung KPI & Summary Agregat (Stok Gudang, Terjual, Sisa Stok beserta Rupiahnya)
      let summary = {
        total_transaksi: 0,
        stok_di_gudang: 0,
        rp_di_gudang: 0,
        stok_terjual: 0,
        rp_terjual_modal: 0,
        rp_terjual_omset: 0,
        sisa_stok: 0,
        rp_sisa_stok: 0,
        laba_kotor: 0
      };

      rows.forEach(r => {
        summary.total_transaksi++;
        summary.stok_di_gudang += Number(r.qty_titip || 0);
        summary.rp_di_gudang += Number(r.rp_total_titip || 0);
        summary.stok_terjual += Number(r.qty_terjual || 0);
        summary.rp_terjual_modal += Number(r.rp_terjual_modal || 0);
        summary.rp_terjual_omset += Number(r.rp_terjual_omset || 0);
        summary.sisa_stok += Number(r.sisa_stok || 0);
        summary.rp_sisa_stok += Number(r.rp_sisa_stok_modal || 0);
        summary.laba_kotor += (Number(r.rp_terjual_omset || 0) - Number(r.rp_terjual_modal || 0));
      });

      // Ambil daftar unik nama penitip untuk filter dropdown
      const [penitipRows] = await pool.query(
        `SELECT DISTINCT nama_penitip FROM penitipan_barang WHERE (kode_perusahaan = ? OR ? = '') ORDER BY nama_penitip ASC`,
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

  // 2. POST /api/penitipan-barang - Tambah Data Penitipan Barang Baru
  if (req.method === 'POST' && pathname === '/api/penitipan-barang') {
    try {
      const body = await parseJsonBody(req);
      const {
        kode_perusahaan = 'RSG',
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
        harga_jual = 0,
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

      // Auto generate no titipan jika kosong
      const autoNo = no_titipan || `TTP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const [result] = await pool.query(
        `INSERT INTO penitipan_barang (
          kode_perusahaan, no_titipan, tanggal, nama_penitip, kontak_penitip,
          produk_id, kode_sku, nama_produk, varian, satuan, harga_titip, harga_jual,
          qty_titip, qty_terjual, qty_retur, status, lokasi_rak, petugas, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          kode_perusahaan, autoNo, tanggal || new Date().toISOString().slice(0, 10), nama_penitip, kontak_penitip,
          produk_id, kode_sku || autoNo, nama_produk, varian, satuan, Number(harga_titip || 0), Number(harga_jual || 0),
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

  // 3. PUT /api/penitipan-barang/:id - Edit Data Penitipan Barang
  if (req.method === 'PUT' && pathname.startsWith('/api/penitipan-barang/')) {
    const id = pathname.split('/')[3];
    if (!id || id === 'terjual') return false;

    try {
      const body = await parseJsonBody(req);
      const {
        tanggal,
        nama_penitip,
        kontak_penitip,
        kode_sku,
        nama_produk,
        varian,
        satuan,
        harga_titip,
        harga_jual,
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
          nama_penitip = COALESCE(?, nama_penitip),
          kontak_penitip = COALESCE(?, kontak_penitip),
          kode_sku = COALESCE(?, kode_sku),
          nama_produk = COALESCE(?, nama_produk),
          varian = COALESCE(?, varian),
          satuan = COALESCE(?, satuan),
          harga_titip = COALESCE(?, harga_titip),
          harga_jual = COALESCE(?, harga_jual),
          qty_titip = COALESCE(?, qty_titip),
          qty_terjual = COALESCE(?, qty_terjual),
          qty_retur = COALESCE(?, qty_retur),
          status = COALESCE(?, status),
          lokasi_rak = COALESCE(?, lokasi_rak),
          petugas = COALESCE(?, petugas),
          keterangan = COALESCE(?, keterangan)
        WHERE id = ?`,
        [
          tanggal, nama_penitip, kontak_penitip, kode_sku, nama_produk, varian, satuan,
          Number(harga_titip), Number(harga_jual), Number(qty_titip), Number(qty_terjual), Number(qty_retur),
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

