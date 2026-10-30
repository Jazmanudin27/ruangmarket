import { sendJson, parseJsonBody } from '../utils/response.js';

// ─── Helper: generate no pesanan offline ─────────────────────────────────────
function generateNoPesanan() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OFF-${ymd}-${rand}`;
}

// ─── Helper: generate kode produksi SPK ──────────────────────────────────────
function generateKodeProduksi() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `SPK-OFF-${ymd}-${rand}`;
}

// ─── Ensure tables exist ──────────────────────────────────────────────────────
async function ensureTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesanan_offline (
      id                  VARCHAR(36)   NOT NULL PRIMARY KEY,
      kode_perusahaan     VARCHAR(10)   NOT NULL DEFAULT 'RSG',
      no_pesanan          VARCHAR(60)   NOT NULL UNIQUE,
      saluran             VARCHAR(30)   NOT NULL DEFAULT 'whatsapp',
      id_toko             VARCHAR(100)  DEFAULT NULL,
      nama_toko           VARCHAR(200)  DEFAULT NULL,

      nama_pembeli        VARCHAR(200)  NOT NULL,
      no_telepon          VARCHAR(30)   DEFAULT '',
      alamat_pengiriman   TEXT          DEFAULT NULL,
      kota                VARCHAR(100)  DEFAULT NULL,
      provinsi            VARCHAR(100)  DEFAULT NULL,
      kode_pos            VARCHAR(10)   DEFAULT NULL,

      is_dropship         TINYINT(1)    NOT NULL DEFAULT 0,
      nama_pengirim_ds    VARCHAR(200)  DEFAULT NULL,
      no_telp_pengirim_ds VARCHAR(30)   DEFAULT NULL,

      kurir               VARCHAR(100)  DEFAULT NULL,
      jenis_layanan       VARCHAR(100)  DEFAULT NULL,
      no_resi             VARCHAR(100)  DEFAULT NULL,
      batas_kirim         DATETIME      DEFAULT NULL,

      subtotal            DECIMAL(15,2) NOT NULL DEFAULT 0,
      diskon              DECIMAL(15,2) NOT NULL DEFAULT 0,
      ongkir              DECIMAL(15,2) NOT NULL DEFAULT 0,
      total_harga         DECIMAL(15,2) NOT NULL DEFAULT 0,
      metode_pembayaran   VARCHAR(30)   DEFAULT 'transfer',
      status_pembayaran   VARCHAR(20)   DEFAULT 'belum_bayar',
      nominal_dp          DECIMAL(15,2) DEFAULT 0,
      tanggal_bayar       DATETIME      DEFAULT NULL,

      status_pesanan      VARCHAR(30)   NOT NULL DEFAULT 'draft',
      no_spk              VARCHAR(100)  DEFAULT NULL,
      catatan             TEXT          DEFAULT NULL,
      dibuat_oleh         VARCHAR(100)  DEFAULT NULL,
      dibuat_pada         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      diperbarui_pada     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_kode_perusahaan (kode_perusahaan),
      INDEX idx_status (status_pesanan),
      INDEX idx_dibuat (dibuat_pada)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesanan_offline_item (
      id              INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
      id_pesanan      VARCHAR(36)   NOT NULL,
      sku             VARCHAR(100)  DEFAULT NULL,
      nama_produk     VARCHAR(300)  NOT NULL,
      varian          VARCHAR(200)  DEFAULT NULL,
      qty             INT           NOT NULL DEFAULT 1,
      harga_satuan    DECIMAL(15,2) NOT NULL DEFAULT 0,
      diskon_item     DECIMAL(15,2) NOT NULL DEFAULT 0,
      subtotal        DECIMAL(15,2) NOT NULL DEFAULT 0,
      catatan_item    VARCHAR(300)  DEFAULT NULL,
      INDEX idx_pesanan (id_pesanan)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function handleOfflineOrdersRoutes(req, res, pathname, urlObj, { pool }) {
  // Ensure DB tables
  await ensureTables(pool).catch(() => {});

  // ── 1. GET list pesanan offline ────────────────────────────────────────────
  if (pathname === '/api/offline/orders' && req.method === 'GET') {
    try {
      const kode = urlObj.searchParams.get('kode_perusahaan') || '';
      const status = urlObj.searchParams.get('status') || '';
      const saluran = urlObj.searchParams.get('saluran') || '';
      const search = urlObj.searchParams.get('search') || '';

      const conds = [];
      const params = [];
      if (kode) { conds.push('o.kode_perusahaan = ?'); params.push(kode); }
      if (status && status !== 'semua') { conds.push('o.status_pesanan = ?'); params.push(status); }
      if (saluran && saluran !== 'semua') { conds.push('o.saluran = ?'); params.push(saluran); }
      if (search) {
        conds.push('(o.no_pesanan LIKE ? OR o.nama_pembeli LIKE ? OR o.no_telepon LIKE ? OR o.no_resi LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const [orders] = await pool.query(
        `SELECT o.*, GROUP_CONCAT(i.nama_produk ORDER BY i.id SEPARATOR ', ') as ringkasan_produk,
                SUM(i.qty) as total_qty, COUNT(i.id) as jumlah_item
         FROM pesanan_offline o
         LEFT JOIN pesanan_offline_item i ON i.id_pesanan = o.id
         ${where}
         GROUP BY o.id
         ORDER BY o.dibuat_pada DESC`,
        params
      );

      sendJson(res, 200, { status: 'success', data: orders });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ── 2. GET detail 1 pesanan offline + items ───────────────────────────────
  const detailMatch = pathname.match(/^\/api\/offline\/orders\/([^/]+)$/);
  if (detailMatch && req.method === 'GET') {
    try {
      const id = decodeURIComponent(detailMatch[1]);
      const [[order]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      if (!order) { sendJson(res, 404, { status: 'error', message: 'Pesanan tidak ditemukan' }); return true; }
      const [items] = await pool.query('SELECT * FROM pesanan_offline_item WHERE id_pesanan = ? ORDER BY id', [id]);
      sendJson(res, 200, { status: 'success', data: { ...order, items } });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ── 3. POST buat pesanan offline baru ─────────────────────────────────────
  if (pathname === '/api/offline/orders' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const {
        kode_perusahaan = 'RSG',
        saluran = 'whatsapp',
        id_toko, nama_toko,
        nama_pembeli, no_telepon = '', alamat_pengiriman = '', kota = '', provinsi = '', kode_pos = '',
        is_dropship = false, nama_pengirim_ds = '', no_telp_pengirim_ds = '',
        kurir = '', jenis_layanan = '', batas_kirim = null,
        diskon = 0, ongkir = 0,
        metode_pembayaran = 'transfer', status_pembayaran = 'belum_bayar', nominal_dp = 0, tanggal_bayar = null,
        catatan = '', dibuat_oleh = '',
        items = [],
        status_pesanan = 'draft'
      } = body;

      if (!nama_pembeli) {
        sendJson(res, 400, { status: 'error', message: 'Nama pembeli wajib diisi' }); return true;
      }
      if (!items.length) {
        sendJson(res, 400, { status: 'error', message: 'Minimal 1 item produk' }); return true;
      }

      const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const no_pesanan = generateNoPesanan();

      // Hitung subtotal & total dari items
      const subtotal = items.reduce((s, it) => s + (Number(it.harga_satuan) * Number(it.qty) - Number(it.diskon_item || 0)), 0);
      const total_harga = Math.max(0, subtotal - Number(diskon) + Number(ongkir));

      // ── Simpan / Update otomatis ke tabel Master Pelanggan (pelanggan_master) ──
      try {
        const randCust = Math.random().toString(36).slice(2, 6).toUpperCase();
        const generatedCustCode = `CUST-${Date.now().toString().slice(-6)}-${randCust}`;
        await pool.query(`
          INSERT INTO pelanggan_master (
            kode_perusahaan, kode_pelanggan, nama_pelanggan, alamat, no_hp, status, kategori_pelanggan
          ) VALUES (?, ?, ?, ?, ?, 'Aktif', ?)
          ON DUPLICATE KEY UPDATE
            alamat = IF(VALUES(alamat) != '', VALUES(alamat), alamat),
            no_hp = IF(VALUES(no_hp) != '', VALUES(no_hp), no_hp)
        `, [
          kode_perusahaan,
          generatedCustCode,
          nama_pembeli.trim(),
          alamat_pengiriman ? alamat_pengiriman.trim() : '',
          no_telepon ? no_telepon.trim() : '',
          saluran === 'reseller' ? 'Reseller' : saluran === 'dropship' ? 'Dropship' : 'Offline'
        ]);
      } catch (custErr) {
        console.warn('[Sync to pelanggan_master warning]:', custErr.message);
      }

      await pool.query(`
        INSERT INTO pesanan_offline (
          id, kode_perusahaan, no_pesanan, saluran, id_toko, nama_toko,
          nama_pembeli, no_telepon, alamat_pengiriman, kota, provinsi, kode_pos,
          is_dropship, nama_pengirim_ds, no_telp_pengirim_ds,
          kurir, jenis_layanan, batas_kirim,
          subtotal, diskon, ongkir, total_harga,
          metode_pembayaran, status_pembayaran, nominal_dp, tanggal_bayar,
          status_pesanan, catatan, dibuat_oleh
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, kode_perusahaan, no_pesanan, saluran, id_toko || null, nama_toko || null,
        nama_pembeli, no_telepon, alamat_pengiriman, kota, provinsi, kode_pos,
        is_dropship ? 1 : 0, nama_pengirim_ds, no_telp_pengirim_ds,
        kurir, jenis_layanan, batas_kirim || null,
        subtotal, Number(diskon), Number(ongkir), total_harga,
        metode_pembayaran, status_pembayaran, Number(nominal_dp), tanggal_bayar || null,
        status_pesanan, catatan, dibuat_oleh
      ]);

      // Insert items
      for (const it of items) {
        const itSubtotal = Number(it.harga_satuan) * Number(it.qty) - Number(it.diskon_item || 0);
        await pool.query(`
          INSERT INTO pesanan_offline_item (id_pesanan, sku, nama_produk, varian, qty, harga_satuan, diskon_item, subtotal, catatan_item)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, it.sku || null, it.nama_produk, it.varian || null, Number(it.qty), Number(it.harga_satuan), Number(it.diskon_item || 0), itSubtotal, it.catatan_item || null]);
      }

      sendJson(res, 201, { status: 'success', message: 'Pesanan berhasil dibuat', id, no_pesanan });
      return true;
    } catch (err) {
      console.error('[Offline Order POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ── 4. PUT update pesanan (status, resi, catatan, dll) ────────────────────
  const updateMatch = pathname.match(/^\/api\/offline\/orders\/([^/]+)$/);
  if (updateMatch && req.method === 'PUT') {
    try {
      const id = decodeURIComponent(updateMatch[1]);
      const body = await parseJsonBody(req);
      const [[existing]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      if (!existing) { sendJson(res, 404, { status: 'error', message: 'Pesanan tidak ditemukan' }); return true; }

      const newStatus = body.status_pesanan || existing.status_pesanan;
      let noSpk = existing.no_spk;

      // ── Auto-generate SPK saat status → dikonfirmasi ───────────────────
      if (newStatus === 'dikonfirmasi' && existing.status_pesanan !== 'dikonfirmasi' && !noSpk) {
        const kodeProduksi = generateKodeProduksi();
        const [items] = await pool.query('SELECT * FROM pesanan_offline_item WHERE id_pesanan = ?', [id]);
        const spkList = items.map(it => ({
          sku: it.sku || '',
          nama_produk: it.nama_produk,
          varian: it.varian || '',
          qty: it.qty,
          catatan: it.catatan_item || ''
        }));

        const [spkResult] = await pool.query(`
          INSERT INTO spk_batch (kode_perusahaan, kode_produksi, nama_pelanggan, no_telepon, instansi, tgl_pesan, status, catatan, spk_list)
          VALUES (?, ?, ?, ?, ?, NOW(), 'Dalam Proses', ?, ?)
        `, [
          existing.kode_perusahaan,
          kodeProduksi,
          existing.nama_pembeli,
          existing.no_telepon || '',
          existing.saluran || 'offline',
          `Pesanan Offline ${existing.no_pesanan}${body.catatan ? ' - ' + body.catatan : ''}`,
          JSON.stringify(spkList)
        ]);

        noSpk = kodeProduksi;
        await pool.query('UPDATE pesanan_offline SET no_spk = ? WHERE id = ?', [noSpk, id]);
      }

      // ── Auto-deduct stok saat dikonfirmasi ────────────────────────────
      if (newStatus === 'dikonfirmasi' && existing.status_pesanan !== 'dikonfirmasi') {
        const [items] = await pool.query('SELECT * FROM pesanan_offline_item WHERE id_pesanan = ?', [id]);
        for (const it of items) {
          if (it.sku) {
            await pool.query(
              'UPDATE produk_master SET stok_fisik = GREATEST(0, stok_fisik - ?) WHERE kode_sku = ?',
              [it.qty, it.sku]
            ).catch(() => {});
          }
        }
      }

      // Rebuild fields to update
      const fields = {};
      const allowed = [
        'status_pesanan', 'no_resi', 'kurir', 'jenis_layanan', 'batas_kirim',
        'metode_pembayaran', 'status_pembayaran', 'nominal_dp', 'tanggal_bayar',
        'catatan', 'alamat_pengiriman', 'kota', 'provinsi', 'kode_pos',
        'nama_pengirim_ds', 'no_telp_pengirim_ds'
      ];
      for (const k of allowed) {
        if (body[k] !== undefined) fields[k] = body[k];
      }
      if (noSpk !== existing.no_spk) fields.no_spk = noSpk;

      if (Object.keys(fields).length) {
        const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
        await pool.query(`UPDATE pesanan_offline SET ${setClauses} WHERE id = ?`, [...Object.values(fields), id]);
      }

      sendJson(res, 200, { status: 'success', message: 'Pesanan diperbarui', no_spk: noSpk });
      return true;
    } catch (err) {
      console.error('[Offline Order PUT Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ── 5. DELETE pesanan offline ─────────────────────────────────────────────
  const deleteMatch2 = pathname.match(/^\/api\/offline\/orders\/([^/]+)$/);
  if (deleteMatch2 && req.method === 'DELETE') {
    try {
      const id = decodeURIComponent(deleteMatch2[1]);
      await pool.query('DELETE FROM pesanan_offline_item WHERE id_pesanan = ?', [id]);
      await pool.query('DELETE FROM pesanan_offline WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success', message: 'Pesanan dihapus' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
