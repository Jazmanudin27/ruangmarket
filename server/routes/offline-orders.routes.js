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
  return `PRD-OFF-${ymd}-${rand}`;
}

function buildEstimasiKainText(kainNama, cmPerPcs, hargaCm, qty) {
  const q = Number(qty || 1);
  const cm = Math.round(Number(cmPerPcs || 0));
  const hrg = Number(hargaCm || 0);
  const totalCm = Math.round(cm * q);
  const totalMeter = (totalCm / 100).toFixed(1).replace(/\.0$/, '');
  const totalBiaya = Math.round(totalCm * hrg);
  const nama = kainNama || 'Kain';
  return `${nama} - ${totalCm.toLocaleString('id-ID')} CM (${totalMeter}M) @Rp${hrg.toLocaleString('id-ID')}/CM (Rp ${totalBiaya.toLocaleString('id-ID')})`;
}

// ─── Ensure tables exist ──────────────────────────────────────────────────────
async function ensureTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesanan_offline (
      id                  VARCHAR(36)   NOT NULL PRIMARY KEY,
      kode_perusahaan     VARCHAR(10)   NOT NULL DEFAULT 'RSG',
      no_pesanan          VARCHAR(60)   NOT NULL UNIQUE,
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
      jenis_transaksi     VARCHAR(30)   DEFAULT 'tunai',
      metode_pembayaran   VARCHAR(30)   DEFAULT 'cash',
      bank_tujuan         VARCHAR(100)  DEFAULT NULL,
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

  try {
    await pool.query("ALTER TABLE pesanan_offline ADD COLUMN jenis_transaksi VARCHAR(30) DEFAULT 'tunai' AFTER total_harga");
  } catch (e) {}

  try {
    await pool.query('ALTER TABLE pesanan_offline ADD COLUMN bank_tujuan VARCHAR(100) DEFAULT NULL AFTER metode_pembayaran');
  } catch (e) {}

  try {
    await pool.query('ALTER TABLE pesanan_offline DROP COLUMN saluran');
  } catch (e) {}

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pesanan_offline_pembayaran (
      id                  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
      id_pesanan          VARCHAR(36)   NOT NULL,
      tanggal_bayar       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      nominal             DECIMAL(15,2) NOT NULL DEFAULT 0,
      metode_pembayaran   VARCHAR(30)   DEFAULT 'cash',
      bank_tujuan         VARCHAR(100)  DEFAULT NULL,
      keterangan          VARCHAR(300)  DEFAULT NULL,
      dibuat_pada         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pesanan_bayar (id_pesanan)
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
      const search = urlObj.searchParams.get('search') || '';

      const conds = [];
      const params = [];
      if (kode) { conds.push('o.kode_perusahaan = ?'); params.push(kode); }
      if (status && status !== 'semua') { conds.push('o.status_pesanan = ?'); params.push(status); }
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

  // ── 2. GET detail 1 pesanan offline + items + pembayaran_list ──────────────
  const detailMatch = pathname.match(/^\/api\/offline\/orders\/([^/]+)$/);
  if (detailMatch && req.method === 'GET') {
    try {
      const id = decodeURIComponent(detailMatch[1]);
      const [[order]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      if (!order) { sendJson(res, 404, { status: 'error', message: 'Pesanan tidak ditemukan' }); return true; }
      const [items] = await pool.query('SELECT * FROM pesanan_offline_item WHERE id_pesanan = ? ORDER BY id', [id]);
      let [pembayaran_list] = await pool.query(
        'SELECT * FROM pesanan_offline_pembayaran WHERE id_pesanan = ? ORDER BY tanggal_bayar ASC, id ASC',
        [id]
      );

      // Auto-seed riwayat awal jika pesanan lama sudah ada DP / Lunas tapi tabel pembayaran masih kosong
      if (pembayaran_list.length === 0) {
        const initNominal = order.status_pembayaran === 'lunas'
          ? Number(order.total_harga || 0)
          : (order.status_pembayaran === 'dp' ? Number(order.nominal_dp || 0) : 0);
        if (initNominal > 0) {
          await pool.query(
            `INSERT INTO pesanan_offline_pembayaran (id_pesanan, tanggal_bayar, nominal, metode_pembayaran, bank_tujuan, keterangan)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              id,
              order.tanggal_bayar || order.dibuat_pada || new Date(),
              initNominal,
              order.metode_pembayaran || 'cash',
              order.bank_tujuan || null,
              order.status_pembayaran === 'lunas' ? 'Pembayaran Lunas Awal' : 'Pembayaran DP Awal'
            ]
          );
          const [refetched] = await pool.query(
            'SELECT * FROM pesanan_offline_pembayaran WHERE id_pesanan = ? ORDER BY tanggal_bayar ASC, id ASC',
            [id]
          );
          pembayaran_list = refetched;
        }
      }

      let existing_spk_batch = null;
      if (order.no_spk) {
        try {
          const [[spkRow]] = await pool.query(
            'SELECT * FROM spk_batch WHERE kode_produksi = ? LIMIT 1',
            [order.no_spk]
          );
          if (spkRow) {
            let parsedSpkList = [];
            try {
              parsedSpkList = typeof spkRow.spk_list === 'string'
                ? JSON.parse(spkRow.spk_list)
                : (spkRow.spk_list || []);
            } catch (e) {
              parsedSpkList = [];
            }
            existing_spk_batch = { ...spkRow, spk_list: parsedSpkList };
          }
        } catch (e) {}
      }

      sendJson(res, 200, { status: 'success', data: { ...order, items, pembayaran_list, existing_spk_batch } });
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
        id_toko, nama_toko,
        nama_pembeli, no_telepon = '', alamat_pengiriman = '', kota = '', provinsi = '', kode_pos = '',
        is_dropship = false, nama_pengirim_ds = '', no_telp_pengirim_ds = '',
        kurir = '', jenis_layanan = '', batas_kirim = null,
        diskon = 0, ongkir = 0,
        jenis_transaksi = 'tunai',
        metode_pembayaran = 'cash', bank_tujuan = null, status_pembayaran = 'belum_bayar', nominal_dp = 0, tanggal_bayar = null,
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
          ) VALUES (?, ?, ?, ?, ?, 'Aktif', 'Offline')
          ON DUPLICATE KEY UPDATE
            alamat = IF(VALUES(alamat) != '', VALUES(alamat), alamat),
            no_hp = IF(VALUES(no_hp) != '', VALUES(no_hp), no_hp)
        `, [
          kode_perusahaan,
          generatedCustCode,
          nama_pembeli.trim(),
          alamat_pengiriman ? alamat_pengiriman.trim() : '',
          no_telepon ? no_telepon.trim() : ''
        ]);
      } catch (custErr) {
        console.warn('[Sync to pelanggan_master warning]:', custErr.message);
      }

      const effectiveDp = status_pembayaran === 'lunas'
        ? total_harga
        : (status_pembayaran === 'dp' ? Number(nominal_dp) : 0);

      await pool.query(`
        INSERT INTO pesanan_offline (
          id, kode_perusahaan, no_pesanan, id_toko, nama_toko,
          nama_pembeli, no_telepon, alamat_pengiriman, kota, provinsi, kode_pos,
          is_dropship, nama_pengirim_ds, no_telp_pengirim_ds,
          kurir, jenis_layanan, batas_kirim,
          subtotal, diskon, ongkir, total_harga, jenis_transaksi,
          metode_pembayaran, bank_tujuan, status_pembayaran, nominal_dp, tanggal_bayar,
          status_pesanan, catatan, dibuat_oleh
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, kode_perusahaan, no_pesanan, id_toko || null, nama_toko || null,
        nama_pembeli, no_telepon, alamat_pengiriman, kota, provinsi, kode_pos,
        is_dropship ? 1 : 0, nama_pengirim_ds, no_telp_pengirim_ds,
        kurir, jenis_layanan, batas_kirim || null,
        subtotal, Number(diskon), Number(ongkir), total_harga, jenis_transaksi || 'tunai',
        metode_pembayaran, bank_tujuan || null, status_pembayaran, effectiveDp,
        effectiveDp > 0 ? (tanggal_bayar || new Date()) : null,
        status_pesanan, catatan, dibuat_oleh
      ]);

      if (effectiveDp > 0) {
        await pool.query(
          `INSERT INTO pesanan_offline_pembayaran (id_pesanan, tanggal_bayar, nominal, metode_pembayaran, bank_tujuan, keterangan)
           VALUES (?, NOW(), ?, ?, ?, ?)`,
          [
            id,
            effectiveDp,
            metode_pembayaran || 'cash',
            bank_tujuan || null,
            status_pembayaran === 'lunas' ? 'Pembayaran Lunas Awal' : 'Pembayaran DP Awal'
          ]
        );
      }

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

  // ── 4. PUT update pesanan (full edit, status, resi, catatan, dll) ──────────
  const updateMatch = pathname.match(/^\/api\/offline\/orders\/([^/]+)$/);
  if (updateMatch && req.method === 'PUT') {
    try {
      const id = decodeURIComponent(updateMatch[1]);
      const body = await parseJsonBody(req);
      const [[existing]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      if (!existing) { sendJson(res, 404, { status: 'error', message: 'Pesanan tidak ditemukan' }); return true; }

      const fields = {};
      const allowed = [
        'id_toko', 'nama_toko', 'nama_pembeli', 'no_telepon',
        'status_pesanan', 'no_resi', 'kurir', 'jenis_layanan', 'batas_kirim',
        'diskon', 'ongkir', 'jenis_transaksi', 'metode_pembayaran', 'bank_tujuan', 'status_pembayaran', 'nominal_dp', 'tanggal_bayar',
        'catatan', 'alamat_pengiriman', 'kota', 'provinsi', 'kode_pos',
        'is_dropship', 'nama_pengirim_ds', 'no_telp_pengirim_ds'
      ];
      for (const k of allowed) {
        if (body[k] !== undefined) {
          if (k === 'is_dropship') fields[k] = body[k] ? 1 : 0;
          else if (k === 'id_toko' || k === 'nama_toko' || k === 'bank_tujuan' || k === 'batas_kirim' || k === 'tanggal_bayar') {
            fields[k] = body[k] || null;
          } else {
            fields[k] = body[k];
          }
        }
      }

      // Update items if provided (full edit mode)
      if (Array.isArray(body.items) && body.items.length > 0) {
        const diskonVal = body.diskon !== undefined ? Number(body.diskon) : Number(existing.diskon || 0);
        const ongkirVal = body.ongkir !== undefined ? Number(body.ongkir) : Number(existing.ongkir || 0);
        const subtotal = body.items.reduce(
          (s, it) => s + (Number(it.harga_satuan) * Number(it.qty) - Number(it.diskon_item || 0)),
          0
        );
        const total_harga = Math.max(0, subtotal - diskonVal + ongkirVal);
        fields.subtotal = subtotal;
        fields.total_harga = total_harga;

        await pool.query('DELETE FROM pesanan_offline_item WHERE id_pesanan = ?', [id]);
        for (const it of body.items) {
          const itSubtotal = Number(it.harga_satuan) * Number(it.qty) - Number(it.diskon_item || 0);
          await pool.query(`
            INSERT INTO pesanan_offline_item (id_pesanan, sku, nama_produk, varian, qty, harga_satuan, diskon_item, subtotal, catatan_item)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            it.sku || null,
            it.nama_produk,
            it.varian || null,
            Number(it.qty),
            Number(it.harga_satuan),
            Number(it.diskon_item || 0),
            itSubtotal,
            it.catatan_item || null
          ]);
        }
      }

      const newStatus = body.status_pesanan || existing.status_pesanan;
      let noSpk = body.no_spk !== undefined ? body.no_spk : existing.no_spk;
      if (body.no_spk !== undefined) {
        fields.no_spk = body.no_spk || null;
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

      if (Object.keys(fields).length) {
        const setClauses = Object.keys(fields).map(k => `${k} = ?`).join(', ');
        await pool.query(`UPDATE pesanan_offline SET ${setClauses} WHERE id = ?`, [...Object.values(fields), id]);
      }

      sendJson(res, 200, { status: 'success', message: 'Pesanan diperbarui', no_spk: noSpk, no_pesanan: existing.no_pesanan });
      return true;
    } catch (err) {
      console.error('[Offline Order PUT Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ── 4B. POST Input Pesanan Offline ke SPK Produksi ─────────────────────────
  const spkPostMatch = pathname.match(/^\/api\/offline\/orders\/([^/]+)\/spk$/);
  if (spkPostMatch && req.method === 'POST') {
    try {
      const id = decodeURIComponent(spkPostMatch[1]);
      const body = await parseJsonBody(req);
      const [[order]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      if (!order) {
        sendJson(res, 404, { status: 'error', message: 'Pesanan tidak ditemukan' });
        return true;
      }

      const [orderItems] = await pool.query('SELECT * FROM pesanan_offline_item WHERE id_pesanan = ? ORDER BY id', [id]);
      if (!orderItems.length) {
        sendJson(res, 400, { status: 'error', message: 'Pesanan tidak memiliki item produk untuk dimasukkan ke SPK' });
        return true;
      }

      // Ambil data master produk untuk melengkapi kategori & estimasi kain
      let masterMap = new Map();
      try {
        const [mRows] = await pool.query('SELECT * FROM produk_master');
        (mRows || []).forEach(m => {
          if (m.kode_sku) masterMap.set(String(m.kode_sku).trim().toLowerCase(), m);
          if (m.nama_produk) masterMap.set(String(m.nama_produk).trim().toLowerCase(), m);
        });
      } catch (e) {}

      const kodeProduksi = (body.kode_produksi || order.no_spk || generateKodeProduksi()).trim();
      const tglPesan = body.tgl_pesan || new Date().toISOString().slice(0, 10);
      const deadline = body.deadline || (order.batas_kirim ? new Date(order.batas_kirim).toISOString().slice(0, 10) : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
      const statusProduksi = body.status || 'Dalam Proses';
      const catatan = body.catatan !== undefined
        ? body.catatan
        : `Pesanan Offline ${order.no_pesanan}${order.catatan ? ' — ' + order.catatan : ''}`;

      const enrichProductItem = (it, idSpk, idx) => {
        const skuKey = String(it.sku || '').trim().toLowerCase();
        const nameKey = String(it.nama_produk || '').trim().toLowerCase();
        const m = masterMap.get(skuKey) || masterMap.get(nameKey) || {};
        const qty = Number(it.qty || 1);
        const kainNama = it.kain_nama || m.nama_kain || m.sku_kain || 'Kain';
        const cmPerPcs = Number(it.panjang_kain_cm || m.estimasi_kain || m.panjang_kain_cm || 200);
        const hargaCm = Number(it.harga_kain_cm || m.harga_kain_cm || 150);

        return {
          id: it.id || `item-${Date.now()}-${idx + 1}`,
          no_spk: idSpk,
          produk_id: it.produk_id || m.id || idx + 1,
          sku: it.sku || m.kode_sku || '',
          nama_produk: it.nama_produk || m.nama_produk || 'Produk',
          kategori: it.kategori || m.kategori || 'Umum',
          satuan: it.satuan || m.satuan || 'PCS',
          qty,
          kain_nama: kainNama,
          panjang_kain_cm: cmPerPcs,
          harga_kain_cm: hargaCm,
          estimasi_kain: it.estimasi_kain || buildEstimasiKainText(kainNama, cmPerPcs, hargaCm, qty)
        };
      };

      let spkList = [];
      if (Array.isArray(body.spk_list) && body.spk_list.length > 0) {
        spkList = body.spk_list
          .filter(s => Array.isArray(s.produk_items) && s.produk_items.length > 0)
          .map((s, sIdx) => {
            const spkId = (s.id_spk || `SPK-${sIdx + 1}`).trim();
            return {
              id_spk: spkId,
              nama_spk: (s.nama_spk || `SPK ${sIdx + 1}`).trim(),
              penjahit: (s.penjahit || 'Penjahit Workshop').trim(),
              status_spk: (s.status_spk || 'Potong Pola').trim(),
              design_img: s.design_img || null,
              produk_items: (s.produk_items || []).map((it, pIdx) =>
                enrichProductItem(it, spkId, pIdx)
              )
            };
          });
      }

      if (spkList.length === 0) {
        const idSpk = (body.id_spk || `SPK-${order.no_pesanan.split('-').pop() || '101'}`).trim();
        const namaSpk = (body.nama_spk || `SPK ${order.nama_pembeli}`).trim();
        const penjahit = (body.penjahit || 'Penjahit Workshop').trim();
        const statusSpk = (body.status_spk || 'Potong Pola').trim();
        const customItems = Array.isArray(body.items) && body.items.length > 0 ? body.items : orderItems;
        spkList = [
          {
            id_spk: idSpk,
            nama_spk: namaSpk,
            penjahit,
            status_spk: statusSpk,
            produk_items: customItems.map((it, idx) => enrichProductItem(it, idSpk, idx))
          }
        ];
      }

      // Cek apakah kode_produksi sudah ada di spk_batch
      const [existingSpkRows] = await pool.query(
        'SELECT id FROM spk_batch WHERE kode_produksi = ? LIMIT 1',
        [kodeProduksi]
      );

      let spkBatchId = null;
      if (existingSpkRows && existingSpkRows.length > 0) {
        spkBatchId = existingSpkRows[0].id;
        await pool.query(
          `UPDATE spk_batch SET
            kode_perusahaan = ?,
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
            order.kode_perusahaan || 'RSG',
            order.nama_pembeli || '',
            order.no_telepon || '',
            order.nama_toko || 'Offline',
            tglPesan,
            deadline,
            statusProduksi,
            catatan,
            JSON.stringify(spkList),
            spkBatchId
          ]
        );
      } else {
        const [insRes] = await pool.query(
          `INSERT INTO spk_batch (
            kode_perusahaan, kode_produksi, nama_pelanggan, no_telepon, instansi,
            tgl_pesan, deadline, status, catatan, spk_list
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.kode_perusahaan || 'RSG',
            kodeProduksi,
            order.nama_pembeli || '',
            order.no_telepon || '',
            order.nama_toko || 'Offline',
            tglPesan,
            deadline,
            statusProduksi,
            catatan,
            JSON.stringify(spkList)
          ]
        );
        spkBatchId = insRes.insertId;
      }

      const nextOrderStatus = (order.status_pesanan === 'draft' || order.status_pesanan === 'dikonfirmasi')
        ? 'diproses'
        : order.status_pesanan;

      await pool.query(
        'UPDATE pesanan_offline SET no_spk = ?, status_pesanan = ? WHERE id = ?',
        [kodeProduksi, nextOrderStatus, id]
      );

      const [[updatedOrder]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      const [pembayaran_list] = await pool.query(
        'SELECT * FROM pesanan_offline_pembayaran WHERE id_pesanan = ? ORDER BY tanggal_bayar ASC, id ASC',
        [id]
      );

      sendJson(res, 200, {
        status: 'success',
        message: `Pesanan ${order.no_pesanan} berhasil dimasukkan ke SPK (${kodeProduksi})!`,
        no_spk: kodeProduksi,
        spk_batch_id: spkBatchId,
        data: { ...updatedOrder, items: orderItems, pembayaran_list }
      });
      return true;
    } catch (err) {
      console.error('[Offline Order SPK POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ── 5. POST tambah pembayaran / cicilan pesanan ───────────────────────────
  const paymentPostMatch = pathname.match(/^\/api\/offline\/orders\/([^/]+)\/payments$/);
  if (paymentPostMatch && req.method === 'POST') {
    try {
      const id = decodeURIComponent(paymentPostMatch[1]);
      const body = await parseJsonBody(req);
      const {
        nominal = 0,
        metode_pembayaran = 'cash',
        bank_tujuan = null,
        tanggal_bayar = null,
        keterangan = ''
      } = body;

      const payAmount = Number(nominal || 0);
      if (payAmount <= 0) {
        sendJson(res, 400, { status: 'error', message: 'Nominal pembayaran harus lebih dari Rp 0' });
        return true;
      }

      const [[order]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      if (!order) {
        sendJson(res, 404, { status: 'error', message: 'Pesanan tidak ditemukan' });
        return true;
      }

      // Pastikan riwayat awal sudah ter-seed jika sebelumnya punya DP tapi tabel pembayaran masih kosong
      const [existingPays] = await pool.query('SELECT * FROM pesanan_offline_pembayaran WHERE id_pesanan = ?', [id]);
      if (existingPays.length === 0 && Number(order.nominal_dp || 0) > 0) {
        await pool.query(
          `INSERT INTO pesanan_offline_pembayaran (id_pesanan, tanggal_bayar, nominal, metode_pembayaran, bank_tujuan, keterangan)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            order.tanggal_bayar || order.dibuat_pada || new Date(),
            Number(order.nominal_dp),
            order.metode_pembayaran || 'cash',
            order.bank_tujuan || null,
            'Pembayaran DP Awal'
          ]
        );
      }

      await pool.query(
        `INSERT INTO pesanan_offline_pembayaran (id_pesanan, tanggal_bayar, nominal, metode_pembayaran, bank_tujuan, keterangan)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          tanggal_bayar ? new Date(tanggal_bayar) : new Date(),
          payAmount,
          metode_pembayaran || 'cash',
          metode_pembayaran === 'transfer' ? (bank_tujuan || null) : null,
          keterangan || 'Cicilan / Pembayaran'
        ]
      );

      const [[sumRow]] = await pool.query(
        'SELECT COALESCE(SUM(nominal), 0) AS total_bayar FROM pesanan_offline_pembayaran WHERE id_pesanan = ?',
        [id]
      );
      const totalTerbayar = Number(sumRow?.total_bayar || 0);
      const totalHarga = Number(order.total_harga || 0);
      const newStatusBayar = totalTerbayar >= totalHarga && totalHarga > 0
        ? 'lunas'
        : (totalTerbayar > 0 ? 'dp' : 'belum_bayar');

      await pool.query(
        `UPDATE pesanan_offline
         SET nominal_dp = ?, status_pembayaran = ?, metode_pembayaran = ?, bank_tujuan = ?, tanggal_bayar = NOW()
         WHERE id = ?`,
        [
          totalTerbayar,
          newStatusBayar,
          metode_pembayaran || order.metode_pembayaran || 'cash',
          metode_pembayaran === 'transfer' ? (bank_tujuan || null) : null,
          id
        ]
      );

      const [[updatedOrder]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      const [items] = await pool.query('SELECT * FROM pesanan_offline_item WHERE id_pesanan = ? ORDER BY id', [id]);
      const [pembayaran_list] = await pool.query(
        'SELECT * FROM pesanan_offline_pembayaran WHERE id_pesanan = ? ORDER BY tanggal_bayar ASC, id ASC',
        [id]
      );

      sendJson(res, 200, {
        status: 'success',
        message: newStatusBayar === 'lunas' ? 'Pembayaran berhasil — Pesanan LUNAS!' : 'Cicilan pembayaran berhasil disimpan',
        data: { ...updatedOrder, items, pembayaran_list }
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ── 6. DELETE hapus 1 riwayat cicilan pembayaran ──────────────────────────
  const paymentDelMatch = pathname.match(/^\/api\/offline\/orders\/([^/]+)\/payments\/(\d+)$/);
  if (paymentDelMatch && req.method === 'DELETE') {
    try {
      const id = decodeURIComponent(paymentDelMatch[1]);
      const paymentId = Number(paymentDelMatch[2]);

      const [[order]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      if (!order) {
        sendJson(res, 404, { status: 'error', message: 'Pesanan tidak ditemukan' });
        return true;
      }

      await pool.query('DELETE FROM pesanan_offline_pembayaran WHERE id = ? AND id_pesanan = ?', [paymentId, id]);

      const [[sumRow]] = await pool.query(
        'SELECT COALESCE(SUM(nominal), 0) AS total_bayar FROM pesanan_offline_pembayaran WHERE id_pesanan = ?',
        [id]
      );
      const totalTerbayar = Number(sumRow?.total_bayar || 0);
      const totalHarga = Number(order.total_harga || 0);
      const newStatusBayar = totalTerbayar >= totalHarga && totalHarga > 0
        ? 'lunas'
        : (totalTerbayar > 0 ? 'dp' : 'belum_bayar');

      await pool.query(
        'UPDATE pesanan_offline SET nominal_dp = ?, status_pembayaran = ? WHERE id = ?',
        [totalTerbayar, newStatusBayar, id]
      );

      const [[updatedOrder]] = await pool.query('SELECT * FROM pesanan_offline WHERE id = ?', [id]);
      const [items] = await pool.query('SELECT * FROM pesanan_offline_item WHERE id_pesanan = ? ORDER BY id', [id]);
      const [pembayaran_list] = await pool.query(
        'SELECT * FROM pesanan_offline_pembayaran WHERE id_pesanan = ? ORDER BY tanggal_bayar ASC, id ASC',
        [id]
      );

      sendJson(res, 200, {
        status: 'success',
        message: 'Data pembayaran dihapus',
        data: { ...updatedOrder, items, pembayaran_list }
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // ── 7. DELETE pesanan offline ─────────────────────────────────────────────
  const deleteMatch2 = pathname.match(/^\/api\/offline\/orders\/([^/]+)$/);
  if (deleteMatch2 && req.method === 'DELETE') {
    try {
      const id = decodeURIComponent(deleteMatch2[1]);
      await pool.query('DELETE FROM pesanan_offline_pembayaran WHERE id_pesanan = ?', [id]);
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
