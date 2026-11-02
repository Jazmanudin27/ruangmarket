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
  const { pool, laravelPool } = context;

  if (!pathname.startsWith('/api/penitipan-barang') && !pathname.startsWith('/api/laporan')) {
    return false;
  }

  try {
    await ensureTablesOnce(pool);
  } catch (err) {
    // ignore
  }

  // =========================================================================
  // LAPORAN STOK BARANG GABUNGAN (GUDANG & TITIPAN) (/api/laporan/stok-barang)
  // =========================================================================
  if (req.method === 'GET' && (pathname === '/api/laporan/stok-barang' || pathname === '/api/penitipan-barang/laporan-stok')) {
    try {
      const company = urlObj.searchParams.get('company') || 'RSG';
      const search = (urlObj.searchParams.get('search') || '').trim();
      const kategori = urlObj.searchParams.get('kategori') || 'Semua';
      const tipeSet = urlObj.searchParams.get('tipe_set') || 'Semua';
      const statusOrder = urlObj.searchParams.get('status_order') || 'Semua';
      const skuKain = urlObj.searchParams.get('sku_kain') || 'Semua';
      const tokoParam = urlObj.searchParams.get('toko') || 'Semua';
      const filterStok = urlObj.searchParams.get('filter_stok') || 'Semua';

      let query = `
        SELECT 
          COALESCE(pm.id, pb_agg.min_id) as id,
          COALESCE(pm.kode_perusahaan, pb_agg.kode_perusahaan, 'RSG') as kode_perusahaan,
          COALESCE(pm.kode_sku, pb_agg.kode_sku) as kode_sku,
          COALESCE(pm.nama_produk, pb_agg.nama_produk) as nama_produk,
          COALESCE(pm.kategori, 'Umum') as kategori,
          COALESCE(pm.varian, pb_agg.varian, 'Standard') as varian,
          COALESCE(pm.satuan, pb_agg.satuan, 'PCS') as satuan,
          COALESCE(pm.tipe_set, 'Single') as tipe_set,
          COALESCE(pm.status_order, 'Ready Stok') as status_order,
          COALESCE(pm.sku_kain, '') as sku_kain,
          CAST(COALESCE(pm.stok_fisik, 0) AS SIGNED) as stok_gudang,
          CAST(COALESCE(pb_agg.stok_titipan, 0) AS SIGNED) as stok_titipan,
          CAST(COALESCE(pm.stok_fisik, 0) + COALESCE(pb_agg.stok_titipan, 0) AS SIGNED) as jumlah_stok,
          CAST(COALESCE(pm.harga_modal, 0) AS DOUBLE) as hpp_gudang,
          CAST(COALESCE(pb_agg.harga_titip, 0) AS DOUBLE) as hpp_titipan,
          CAST(COALESCE(pm.harga_jual, 0) AS DOUBLE) as harga_jual,
          CAST(COALESCE(pm.harga_jual, 0) - COALESCE(pm.harga_modal, 0) AS DOUBLE) as margin_gudang,
          CAST(COALESCE(pm.harga_jual, 0) - COALESCE(pb_agg.harga_titip, 0) AS DOUBLE) as margin_titipan,
          CASE 
            WHEN COALESCE(pm.harga_jual, 0) > 0 THEN ROUND(((pm.harga_jual - COALESCE(pm.harga_modal, 0)) / pm.harga_jual) * 100, 1)
            ELSE 0
          END as margin_gudang_persen,
          CASE 
            WHEN COALESCE(pm.harga_jual, 0) > 0 AND COALESCE(pb_agg.harga_titip, 0) > 0 THEN ROUND(((pm.harga_jual - COALESCE(pb_agg.harga_titip, 0)) / pm.harga_jual) * 100, 1)
            ELSE 0
          END as margin_titipan_persen
        FROM produk_master pm
        LEFT JOIN (
          SELECT 
            MIN(id) as min_id,
            kode_perusahaan,
            kode_sku,
            MAX(nama_produk) as nama_produk,
            MAX(varian) as varian,
            MAX(satuan) as satuan,
            SUM(GREATEST(0, qty_titip - qty_terjual - qty_retur)) as stok_titipan,
            MAX(harga_titip) as harga_titip
          FROM penitipan_barang
          WHERE (qty_titip - qty_terjual - qty_retur) > 0
          GROUP BY kode_sku, kode_perusahaan
        ) pb_agg ON pb_agg.kode_sku = pm.kode_sku
        WHERE (pm.kode_perusahaan = ? OR pm.kode_perusahaan IS NULL OR ? = '' OR pm.kode_perusahaan = 'RSG')
      `;
      const params = [company, company];

      if (kategori && kategori !== 'Semua') {
        query += ` AND pm.kategori = ?`;
        params.push(kategori);
      }

      if (tipeSet && tipeSet !== 'Semua') {
        query += ` AND pm.tipe_set = ?`;
        params.push(tipeSet);
      }

      if (statusOrder && statusOrder !== 'Semua') {
        query += ` AND pm.status_order = ?`;
        params.push(statusOrder);
      }

      if (skuKain && skuKain !== 'Semua') {
        query += ` AND pm.sku_kain = ?`;
        params.push(skuKain);
      }

      if (tokoParam && tokoParam !== 'Semua') {
        let targetSaluran = null;
        let cleanToko = tokoParam.trim();
        if (cleanToko.includes('|')) {
          const parts = cleanToko.split('|');
          targetSaluran = parts[0].trim().toLowerCase();
          cleanToko = parts.slice(1).join('|').trim();
        }
        query += ` AND EXISTS (
          SELECT 1 FROM produk_marketplace pmp 
          WHERE ${targetSaluran ? 'pmp.saluran = ? AND ' : ''}(LOWER(TRIM(pmp.id_toko)) = LOWER(?) OR LOWER(TRIM(pmp.nama_toko)) = LOWER(?))
            AND (
              pmp.sku_marketplace = pm.kode_sku 
              OR pmp.sku_marketplace = REPLACE(pm.kode_sku, 'PO-', '')
              OR pmp.sku_marketplace = CONCAT('RSG-', pm.kode_sku)
              OR pm.kode_sku = CONCAT('RSG-', pmp.sku_marketplace)
              OR pmp.nama_produk = pm.nama_produk
            )
        )`;
        if (targetSaluran) {
          params.push(targetSaluran, cleanToko, cleanToko);
        } else {
          params.push(cleanToko, cleanToko);
        }
      }

      if (search) {
        query += ` AND (pm.kode_sku LIKE ? OR pm.nama_produk LIKE ? OR pm.kategori LIKE ? OR pm.varian LIKE ? OR pm.sku_kain LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
      }

      query += ` ORDER BY jumlah_stok DESC, pm.id ASC`;

      const [rows] = await pool.query(query, params);

      // Filter in-memory jika ada filter status stok khusus
      let filtered = rows;
      const fs = String(filterStok || 'Semua').toLowerCase();
      if (fs === 'tersedia') {
        filtered = rows.filter(r => r.jumlah_stok > 0);
      } else if (fs === 'menipis') {
        filtered = rows.filter(r => r.jumlah_stok > 0 && r.jumlah_stok <= 5);
      } else if (fs === 'habis') {
        filtered = rows.filter(r => r.jumlah_stok <= 0);
      } else if (fs === 'hanya_gudang') {
        filtered = rows.filter(r => r.stok_gudang > 0 && r.stok_titipan <= 0);
      } else if (fs === 'hanya_titipan') {
        filtered = rows.filter(r => r.stok_titipan > 0 && r.stok_gudang <= 0);
      } else if (fs === 'gabungan') {
        filtered = rows.filter(r => r.stok_gudang > 0 && r.stok_titipan > 0);
      }

      const summary = {
        total_sku: filtered.length,
        total_stok_gudang: filtered.reduce((acc, r) => acc + Number(r.stok_gudang || 0), 0),
        total_stok_titipan: filtered.reduce((acc, r) => acc + Number(r.stok_titipan || 0), 0),
        total_jumlah_stok: filtered.reduce((acc, r) => acc + Number(r.jumlah_stok || 0), 0),
        total_nilai_hpp_gudang: filtered.reduce((acc, r) => acc + (Number(r.stok_gudang || 0) * Number(r.hpp_gudang || 0)), 0),
        total_nilai_hpp_titipan: filtered.reduce((acc, r) => acc + (Number(r.stok_titipan || 0) * Number(r.hpp_titipan || 0)), 0),
        avg_margin_gudang_persen: filtered.length > 0 ? (filtered.reduce((acc, r) => acc + Number(r.margin_gudang_persen || 0), 0) / filtered.length).toFixed(1) : 0,
        avg_margin_titipan_persen: filtered.length > 0 ? (filtered.reduce((acc, r) => acc + Number(r.margin_titipan_persen || 0), 0) / filtered.length).toFixed(1) : 0,
      };

      return sendJson(res, 200, {
        status: 'success',
        data: filtered,
        summary
      });
    } catch (err) {
      console.error('[GET /api/laporan/stok-barang Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
  }

  // =========================================================================
  // LAPORAN TRANSAKSI PENJUALAN YANG SUDAH CAIR (/api/laporan/penjualan-cair)
  // Mendukung 3 Format: Per Tanggal, Per Transaksi, Per Barang
  // =========================================================================
  if (req.method === 'GET' && pathname === '/api/laporan/penjualan-cair') {
    try {
      const company = urlObj.searchParams.get('company') || 'RSG';
      const startDate = (urlObj.searchParams.get('start_date') || '').trim();
      const endDate = (urlObj.searchParams.get('end_date') || '').trim();
      const saluranParam = (urlObj.searchParams.get('saluran') || 'Semua').trim();
      const tokoParam = (urlObj.searchParams.get('toko') || 'Semua').trim();
      const statusCair = (urlObj.searchParams.get('status_cair') || 'cair').trim().toLowerCase();
      const search = (urlObj.searchParams.get('search') || '').trim().toLowerCase();

      let targetSaluran = null;
      let cleanToko = tokoParam;
      if (cleanToko !== 'Semua' && cleanToko.includes('|')) {
        const parts = cleanToko.split('|');
        targetSaluran = parts[0].trim().toLowerCase();
        cleanToko = parts.slice(1).join('|').trim();
      }

      // 1. Ambil Master Produk untuk referensi HPP, Nama Produk, dan Kategori
      const masterMap = new Map();
      try {
        const [mRows] = await pool.query(`
          SELECT kode_sku, nama_produk, kategori, varian, COALESCE(harga_modal, 0) as hpp, COALESCE(harga_jual, 0) as harga_jual
          FROM produk_master
        `);
        for (const m of (mRows || [])) {
          const info = {
            kode_sku: m.kode_sku,
            nama_produk: m.nama_produk,
            kategori: m.kategori || 'Umum',
            varian: m.varian || 'Standard',
            hpp: Number(m.hpp || 0),
            harga_jual: Number(m.harga_jual || 0)
          };
          if (m.kode_sku) {
            const k = String(m.kode_sku).trim().toLowerCase();
            masterMap.set(k, info);
            masterMap.set(k.replace(/^rsg-/, ''), info);
          }
          if (m.nama_produk) {
            masterMap.set(String(m.nama_produk).trim().toLowerCase(), info);
          }
        }
      } catch (eMaster) {}

      // 2. Kumpulkan seluruh transaksi penjualan dari pesanan_marketplace, laravelPool.orders, dan pesanan_offline
      const rawOrdersMap = new Map();

      // A. Dari database Laravel (marketplace.orders + order_items) jika tersedia
      if (laravelPool) {
        try {
          const [lOrders] = await laravelPool.query(`
            SELECT 
              o.id as laravel_id,
              o.order_marketplace_id as no_pesanan,
              o.buyer_name as nama_pembeli,
              o.total_amount as total_harga,
              o.status as status_pesanan,
              COALESCE(o.order_date, o.created_at) as waktu_pesanan,
              s.store_name as nama_toko,
              c.code as saluran
            FROM orders o
            LEFT JOIN stores s ON o.store_id = s.id
            LEFT JOIN channels c ON s.channel_id = c.id
            ORDER BY COALESCE(o.order_date, o.created_at) DESC
          `);

          // Ambil seluruh order_items secara batch untuk efisiensi
          const [lItems] = await laravelPool.query(`
            SELECT order_id, sku, product_name as nama_produk, quantity as qty, price as harga, total_price as subtotal
            FROM order_items
          `).catch(() => [[]]);

          const itemsByOrderId = new Map();
          for (const it of (lItems || [])) {
            if (!itemsByOrderId.has(it.order_id)) itemsByOrderId.set(it.order_id, []);
            itemsByOrderId.get(it.order_id).push(it);
          }

          for (const lo of (lOrders || [])) {
            const key = String(lo.no_pesanan || lo.laravel_id || '').trim();
            if (!key) continue;
            const st = String(lo.status_pesanan || '').toUpperCase();
            if (['CANCELLED', 'BATAL', 'IN_CANCEL', 'DIBATALKAN', 'UNPAID'].includes(st)) continue;

            const ordItems = itemsByOrderId.get(lo.laravel_id) || [];
            const gross = Number(lo.total_harga || 0);
            rawOrdersMap.set(key, {
              id: `lrv_${lo.laravel_id}`,
              no_pesanan: key,
              saluran: String(lo.saluran || 'shopee').toLowerCase(),
              nama_toko: lo.nama_toko || 'Toko Marketplace',
              nama_pembeli: lo.nama_pembeli || 'Pembeli Marketplace',
              waktu_pesanan: lo.waktu_pesanan ? new Date(lo.waktu_pesanan) : new Date(),
              status_pesanan: lo.status_pesanan || 'COMPLETED',
              omset_kotor: gross,
              potongan_fee: 0,
              dana_cair: gross,
              items: ordItems
            });
          }
        } catch (eLrv) {}
      }

      // B. Dari tabel pesanan_marketplace (ruangmarket) — menimpa dengan data fee & net_amount yang lebih detail
      try {
        const [rmOrders] = await pool.query(`
          SELECT 
            id, no_pesanan, saluran, nama_toko, nama_pembeli,
            total_harga, marketplace_fee, fee_platform, fee_free_shipping, fee_service, net_amount,
            status_pesanan, rincian_item, COALESCE(waktu_pesanan, ditarik_pada) as waktu_pesanan
          FROM pesanan_marketplace
          ORDER BY COALESCE(waktu_pesanan, ditarik_pada) DESC
        `);

        for (const ro of (rmOrders || [])) {
          const key = String(ro.no_pesanan || ro.id || '').trim();
          if (!key) continue;
          const st = String(ro.status_pesanan || '').toUpperCase();
          if (['CANCELLED', 'BATAL', 'IN_CANCEL', 'DIBATALKAN', 'UNPAID'].includes(st)) continue;

          let parsedItems = [];
          try {
            parsedItems = ro.rincian_item ? (typeof ro.rincian_item === 'string' ? JSON.parse(ro.rincian_item) : ro.rincian_item) : [];
          } catch (e) {
            parsedItems = [];
          }

          const gross = Number(ro.total_harga || 0);
          const totalFee = Number(ro.marketplace_fee || 0) || (Number(ro.fee_platform || 0) + Number(ro.fee_free_shipping || 0) + Number(ro.fee_service || 0));
          const net = Number(ro.net_amount || 0) > 0 ? Number(ro.net_amount) : Math.max(0, gross - totalFee);

          const existing = rawOrdersMap.get(key);
          rawOrdersMap.set(key, {
            id: ro.id,
            no_pesanan: key,
            saluran: String(ro.saluran || existing?.saluran || 'shopee').toLowerCase(),
            nama_toko: ro.nama_toko || existing?.nama_toko || 'Toko Marketplace',
            nama_pembeli: ro.nama_pembeli || existing?.nama_pembeli || 'Pembeli',
            waktu_pesanan: ro.waktu_pesanan ? new Date(ro.waktu_pesanan) : (existing?.waktu_pesanan || new Date()),
            status_pesanan: ro.status_pesanan || existing?.status_pesanan || 'COMPLETED',
            omset_kotor: gross > 0 ? gross : (existing?.omset_kotor || 0),
            potongan_fee: totalFee,
            dana_cair: net > 0 ? net : (existing?.dana_cair || gross),
            items: (Array.isArray(parsedItems) && parsedItems.length > 0) ? parsedItems : (existing?.items || [])
          });
        }
      } catch (eRm) {}

      // C. Dari tabel pesanan_offline (ruangmarket)
      try {
        const [offOrders] = await pool.query(`
          SELECT id, no_pesanan, COALESCE(nama_toko, 'Penjualan Offline') as nama_toko,
                 nama_pembeli, subtotal, diskon, ongkir, total_harga, status_pembayaran,
                 status_pesanan, dibuat_pada as waktu_pesanan
          FROM pesanan_offline
          ORDER BY dibuat_pada DESC
        `);
        const [offItems] = await pool.query(`
          SELECT id_pesanan, sku, nama_produk, varian, qty, harga_satuan as harga, subtotal, hpp_satuan
          FROM pesanan_offline_item
        `).catch(() => [[]]);

        const offItemsMap = new Map();
        for (const it of (offItems || [])) {
          if (!offItemsMap.has(it.id_pesanan)) offItemsMap.set(it.id_pesanan, []);
          offItemsMap.get(it.id_pesanan).push(it);
        }

        for (const oo of (offOrders || [])) {
          const st = String(oo.status_pesanan || '').toUpperCase();
          if (['CANCELLED', 'BATAL', 'DIBATALKAN', 'DRAFT'].includes(st)) continue;
          const isPaid = String(oo.status_pembayaran || '').toLowerCase() === 'lunas' || ['SELESAI', 'COMPLETED', 'DIKIRIM'].includes(st);
          const gross = Number(oo.total_harga || oo.subtotal || 0);
          rawOrdersMap.set(oo.no_pesanan, {
            id: oo.id,
            no_pesanan: oo.no_pesanan,
            saluran: 'offline',
            nama_toko: oo.nama_toko || 'Penjualan Offline',
            nama_pembeli: oo.nama_pembeli || 'Pelanggan Offline',
            waktu_pesanan: oo.waktu_pesanan ? new Date(oo.waktu_pesanan) : new Date(),
            status_pesanan: isPaid ? 'COMPLETED' : oo.status_pesanan,
            omset_kotor: gross,
            potongan_fee: 0,
            dana_cair: gross,
            items: offItemsMap.get(oo.id) || []
          });
        }
      } catch (eOff) {}

      // 3. Cek apakah ada pesanan berstatus COMPLETED/SELESAI. Jika status_cair === 'cair', saring yang sudah cair/selesai
      const allOrdersList = Array.from(rawOrdersMap.values());
      const isCompletedStatus = (st) => {
        const u = String(st || '').toUpperCase();
        return ['COMPLETED', 'FINISHED', 'SELESAI', 'DELIVERED', 'SETTLED', 'SUDAH CAIR', 'LUNAS'].includes(u);
      };

      const hasAnyCompleted = allOrdersList.some(o => isCompletedStatus(o.status_pesanan));

      // 4. Filter dan bangun rincian item + HPP per transaksi
      const filteredTransactions = [];

      for (const ord of allOrdersList) {
        if (statusCair === 'cair' && hasAnyCompleted && !isCompletedStatus(ord.status_pesanan)) {
          continue;
        }

        // Filter saluran
        if (saluranParam !== 'Semua' && ord.saluran !== saluranParam.toLowerCase()) {
          continue;
        }

        // Filter toko
        if (cleanToko !== 'Semua') {
          if (targetSaluran && ord.saluran !== targetSaluran) continue;
          if (String(ord.nama_toko || '').trim().toLowerCase() !== cleanToko.toLowerCase()) continue;
        }

        // Konversi tanggal ke WIB (YYYY-MM-DD)
        const wibDate = new Date(ord.waktu_pesanan.getTime() + (7 * 60 * 60 * 1000));
        const tanggalStr = wibDate.toISOString().slice(0, 10);
        const waktuStr = wibDate.toISOString().slice(11, 16);

        if (startDate && tanggalStr < startDate) continue;
        if (endDate && tanggalStr > endDate) continue;

        // Enrich rincian item dengan HPP dan kategori dari produk_master
        const rawItems = Array.isArray(ord.items) && ord.items.length > 0
          ? ord.items
          : [{ sku: 'SKU-PRODUK', nama_produk: `Pesanan ${ord.no_pesanan}`, qty: 1, harga: ord.omset_kotor, subtotal: ord.omset_kotor }];

        let orderQty = 0;
        let orderHpp = 0;
        let itemsCalcSubtotal = 0;

        const enrichedItems = rawItems.map(it => {
          const rawSku = String(it.sku || it.kode_sku || it.item_sku || it.model_sku || it.seller_sku || it.sku_marketplace || '').trim();
          const rawName = String(it.nama_produk || it.product_name || it.item_name || '').trim();
          const mInfo = masterMap.get(rawSku.toLowerCase()) || masterMap.get(rawSku.toLowerCase().replace(/^rsg-/, '')) || masterMap.get(rawName.toLowerCase()) || null;

          const finalSku = rawSku || mInfo?.kode_sku || 'SKU-UMUM';
          const finalName = rawName || mInfo?.nama_produk || `Produk ${finalSku}`;
          const finalKategori = mInfo?.kategori || 'Pakaian';
          const finalVarian = String(it.varian || it.model_name || mInfo?.varian || 'Standard').trim();
          const qty = Math.max(1, Number(it.qty || it.quantity || 1));
          const price = Number(it.harga || it.price || it.harga_satuan || mInfo?.harga_jual || 0);
          const subtotal = Number(it.subtotal || it.total_price || (price * qty)) || 0;
          const hppSatuan = Number(it.hpp || it.hpp_satuan || it.cost_price || mInfo?.hpp || 0);
          const hppTotalItem = hppSatuan * qty;

          orderQty += qty;
          orderHpp += hppTotalItem;
          itemsCalcSubtotal += subtotal;

          return {
            kode_sku: finalSku,
            nama_produk: finalName,
            kategori: finalKategori,
            varian: finalVarian,
            qty,
            harga_satuan: price,
            subtotal,
            hpp_satuan: hppSatuan,
            total_hpp: hppTotalItem
          };
        });

        const finalOmsetKotor = ord.omset_kotor > 0 ? ord.omset_kotor : itemsCalcSubtotal;
        const finalFee = Number(ord.potongan_fee || 0);
        const finalDanaCair = ord.dana_cair > 0 ? ord.dana_cair : Math.max(0, finalOmsetKotor - finalFee);
        const finalLabaBersih = finalDanaCair - orderHpp;

        const ringkasanBarang = enrichedItems
          .map(i => `${i.kode_sku} (${i.qty}x)`)
          .join(', ');

        // Filter search
        if (search) {
          const matchOrder =
            ord.no_pesanan.toLowerCase().includes(search) ||
            ord.nama_pembeli.toLowerCase().includes(search) ||
            ord.nama_toko.toLowerCase().includes(search) ||
            ringkasanBarang.toLowerCase().includes(search) ||
            enrichedItems.some(i =>
              i.kode_sku.toLowerCase().includes(search) ||
              i.nama_produk.toLowerCase().includes(search) ||
              i.kategori.toLowerCase().includes(search)
            );
          if (!matchOrder) continue;
        }

        filteredTransactions.push({
          id: ord.id,
          tanggal: tanggalStr,
          waktu: `${tanggalStr} ${waktuStr}`,
          no_pesanan: ord.no_pesanan,
          saluran: ord.saluran,
          nama_toko: ord.nama_toko,
          nama_pembeli: ord.nama_pembeli,
          status_pesanan: isCompletedStatus(ord.status_pesanan) ? 'Sudah Cair' : ord.status_pesanan,
          rincian_barang: ringkasanBarang,
          items: enrichedItems,
          total_qty: orderQty,
          omset_kotor: Math.round(finalOmsetKotor),
          potongan_fee: Math.round(finalFee),
          dana_cair: Math.round(finalDanaCair),
          total_hpp: Math.round(orderHpp),
          laba_bersih: Math.round(finalLabaBersih),
          margin_persen: finalDanaCair > 0 ? Number(((finalLabaBersih / finalDanaCair) * 100).toFixed(1)) : 0
        });
      }

      // 5. Bangun Rekap Format 1: PER TANGGAL
      const mapTanggal = new Map();
      for (const trx of filteredTransactions) {
        if (!mapTanggal.has(trx.tanggal)) {
          mapTanggal.set(trx.tanggal, {
            tanggal: trx.tanggal,
            jumlah_transaksi: 0,
            total_qty: 0,
            omset_kotor: 0,
            potongan_fee: 0,
            dana_cair: 0,
            total_hpp: 0,
            laba_bersih: 0
          });
        }
        const row = mapTanggal.get(trx.tanggal);
        row.jumlah_transaksi += 1;
        row.total_qty += trx.total_qty;
        row.omset_kotor += trx.omset_kotor;
        row.potongan_fee += trx.potongan_fee;
        row.dana_cair += trx.dana_cair;
        row.total_hpp += trx.total_hpp;
        row.laba_bersih += trx.laba_bersih;
      }

      const perTanggal = Array.from(mapTanggal.values())
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
        .map(r => ({
          ...r,
          margin_persen: r.dana_cair > 0 ? Number(((r.laba_bersih / r.dana_cair) * 100).toFixed(1)) : 0
        }));

      // 6. Bangun Rekap Format 3: PER BARANG (SKU)
      const mapBarang = new Map();
      for (const trx of filteredTransactions) {
        const itemsSum = trx.items.reduce((acc, it) => acc + (it.subtotal || 0), 0) || trx.omset_kotor || 1;
        for (const it of trx.items) {
          const skuKey = String(it.kode_sku || it.nama_produk).toUpperCase();
          if (!mapBarang.has(skuKey)) {
            mapBarang.set(skuKey, {
              kode_sku: it.kode_sku,
              nama_produk: it.nama_produk,
              kategori: it.kategori || 'Pakaian',
              varian: it.varian || 'Standard',
              jumlah_transaksi: 0,
              total_qty: 0,
              omset_kotor: 0,
              potongan_fee: 0,
              dana_cair: 0,
              hpp_satuan: it.hpp_satuan || 0,
              total_hpp: 0,
              laba_bersih: 0
            });
          }
          const bRow = mapBarang.get(skuKey);
          const propRatio = itemsSum > 0 ? (it.subtotal || (trx.omset_kotor / trx.items.length)) / itemsSum : (1 / trx.items.length);
          const itemOmset = Math.round(trx.omset_kotor * propRatio);
          const itemFee = Math.round(trx.potongan_fee * propRatio);
          const itemCair = Math.round(trx.dana_cair * propRatio);
          const itemHpp = Math.round(it.total_hpp || 0);

          bRow.jumlah_transaksi += 1;
          bRow.total_qty += it.qty;
          bRow.omset_kotor += itemOmset;
          bRow.potongan_fee += itemFee;
          bRow.dana_cair += itemCair;
          bRow.total_hpp += itemHpp;
          bRow.laba_bersih += (itemCair - itemHpp);
          if (it.hpp_satuan > 0 && bRow.hpp_satuan === 0) bRow.hpp_satuan = it.hpp_satuan;
        }
      }

      const perBarang = Array.from(mapBarang.values())
        .sort((a, b) => b.total_qty - a.total_qty || b.dana_cair - a.dana_cair)
        .map(r => ({
          ...r,
          margin_persen: r.dana_cair > 0 ? Number(((r.laba_bersih / r.dana_cair) * 100).toFixed(1)) : 0
        }));

      // 7. Summary Keseluruhan
      const totalOmsetKotor = filteredTransactions.reduce((acc, r) => acc + r.omset_kotor, 0);
      const totalPotonganFee = filteredTransactions.reduce((acc, r) => acc + r.potongan_fee, 0);
      const totalDanaCair = filteredTransactions.reduce((acc, r) => acc + r.dana_cair, 0);
      const totalHpp = filteredTransactions.reduce((acc, r) => acc + r.total_hpp, 0);
      const totalLabaBersih = totalDanaCair - totalHpp;

      const summary = {
        total_transaksi: filteredTransactions.length,
        total_qty: filteredTransactions.reduce((acc, r) => acc + r.total_qty, 0),
        total_omset_kotor: totalOmsetKotor,
        total_potongan_fee: totalPotonganFee,
        total_dana_cair: totalDanaCair,
        total_hpp: totalHpp,
        total_laba_bersih: totalLabaBersih,
        margin_persen: totalDanaCair > 0 ? Number(((totalLabaBersih / totalDanaCair) * 100).toFixed(1)) : 0
      };

      return sendJson(res, 200, {
        status: 'success',
        summary,
        per_tanggal: perTanggal,
        per_transaksi: filteredTransactions,
        per_barang: perBarang
      });
    } catch (err) {
      console.error('[GET /api/laporan/penjualan-cair Error]:', err);
      return sendJson(res, 500, { status: 'error', message: err.message });
    }
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

// =========================================================================
// HELPER DEDUCT WAREHOUSE STOCK (GUDANG UTAMA VS TITIPAN KONSINYASI)
// =========================================================================
export async function deductWarehouseStock(pool, { sku, qty, source = 'gudang', noRef = '', keterangan = '', petugas = 'Staff Packing' }) {
  const numQty = Math.max(1, Number(qty || 1));
  const cleanSku = String(sku || '').trim();
  if (!cleanSku) return false;

  const today = new Date().toISOString().slice(0, 10);
  const noBukti = `BK-${today.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  if (source === 'titipan') {
    // 1. Ambil data penitipan_barang aktif
    const [rows] = await pool.query(
      `SELECT id, nama_produk, varian, satuan, qty_titip, qty_terjual, qty_retur, (qty_titip - qty_terjual - qty_retur) as sisa
       FROM penitipan_barang 
       WHERE kode_sku = ? AND (qty_titip - qty_terjual - qty_retur) > 0
       ORDER BY id ASC LIMIT 1`,
      [cleanSku]
    );

    if (rows && rows.length > 0) {
      const target = rows[0];
      const sisaAwal = Number(target.sisa || 0);
      const deductAmt = Math.min(numQty, sisaAwal);
      const sisaAkhir = Math.max(0, sisaAwal - deductAmt);

      await pool.query(
        `UPDATE penitipan_barang SET 
          qty_terjual = qty_terjual + ?,
          status = CASE WHEN (qty_titip - (qty_terjual + ?) - qty_retur) <= 0 THEN 'Selesai' ELSE 'Aktif' END
         WHERE id = ?`,
        [deductAmt, deductAmt, target.id]
      );

      // Catat mutasi barang keluar
      await pool.query(
        `INSERT INTO mutasi_barang (
          kode_perusahaan, tanggal, no_bukti, jenis_mutasi, kategori,
          kode_sku, nama_produk, varian, satuan, jumlah,
          stok_sebelum, stok_sesudah, no_referensi, pihak_terkait, petugas, keterangan
        ) VALUES (?, ?, ?, 'keluar', 'Penjualan / Fulfillment', ?, ?, ?, ?, ?, ?, ?, ?, 'Gudang Titipan Konsinyasi', ?, ?)`,
        [
          'RSG', today, noBukti, cleanSku, target.nama_produk || cleanSku, target.varian || '', target.satuan || 'PCS',
          deductAmt, sisaAwal, sisaAkhir, noRef, petugas, keterangan || 'Pengurangan stok hasil scan QR Code Titipan'
        ]
      ).catch(() => {});

      // Sinkronkan total stok di produk_marketplace
      try {
        const [[prodGdg]] = await pool.query('SELECT stok_fisik FROM produk_master WHERE kode_sku = ?', [cleanSku]);
        const [[titipanSum]] = await pool.query(
          `SELECT SUM(qty_titip - qty_terjual - qty_retur) as sisa_titipan FROM penitipan_barang WHERE kode_sku = ? AND (qty_titip - qty_terjual - qty_retur) > 0`,
          [cleanSku]
        );
        const totalGabungan = Number(prodGdg?.stok_fisik || 0) + Number(titipanSum?.sisa_titipan || 0);
        await pool.query(`UPDATE produk_marketplace SET stok_marketplace = ? WHERE sku_marketplace = ?`, [totalGabungan, cleanSku]);
      } catch (eSync) {}

      return { success: true, source: 'titipan', deducted: deductAmt };
    }
  }

  // 2. Default / source === 'gudang': Kurangi dari produk_master
  const [[prod]] = await pool.query(
    `SELECT id, nama_produk, varian, satuan, stok_fisik FROM produk_master WHERE kode_sku = ? LIMIT 1`,
    [cleanSku]
  );

  const stokAwal = Number(prod?.stok_fisik || 0);
  const stokAkhir = Math.max(0, stokAwal - numQty);

  await pool.query(
    `UPDATE produk_master SET stok_fisik = GREATEST(0, stok_fisik - ?) WHERE kode_sku = ?`,
    [numQty, cleanSku]
  );

  // Catat mutasi barang keluar
  await pool.query(
    `INSERT INTO mutasi_barang (
      kode_perusahaan, tanggal, no_bukti, jenis_mutasi, kategori,
      kode_sku, nama_produk, varian, satuan, jumlah,
      stok_sebelum, stok_sesudah, no_referensi, pihak_terkait, petugas, keterangan
    ) VALUES (?, ?, ?, 'keluar', 'Penjualan / Fulfillment', ?, ?, ?, ?, ?, ?, ?, ?, 'Gudang Utama Sendiri', ?, ?)`,
    [
      'RSG', today, noBukti, cleanSku, prod?.nama_produk || cleanSku, prod?.varian || '', prod?.satuan || 'PCS',
      numQty, stokAwal, stokAkhir, noRef, petugas, keterangan || 'Pengurangan stok hasil scan QR Code Gudang'
    ]
  ).catch(() => {});

  // Update stok gabungan di produk_marketplace
  try {
    const [[titipanSum]] = await pool.query(
      `SELECT SUM(qty_titip - qty_terjual - qty_retur) as sisa_titipan FROM penitipan_barang WHERE kode_sku = ? AND (qty_titip - qty_terjual - qty_retur) > 0`,
      [cleanSku]
    );
    const totalGabungan = stokAkhir + Number(titipanSum?.sisa_titipan || 0);
    await pool.query(`UPDATE produk_marketplace SET stok_marketplace = ? WHERE sku_marketplace = ?`, [totalGabungan, cleanSku]);
  } catch (eSync) {}

  return { success: true, source: 'gudang', deducted: numQty };
}
