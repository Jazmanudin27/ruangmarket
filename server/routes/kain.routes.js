import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleKainRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. GET /api/kain/master atau /api/marketplace/kain - Ambil seluruh master kain
  if ((pathname === '/api/kain/master' || pathname === '/api/marketplace/kain') && req.method === 'GET') {
    try {
      const search = urlObj.searchParams.get('search');
      const jenisKain = urlObj.searchParams.get('jenis_kain');
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');

      const whereClauses = [];
      const whereParams = [];

      if (kodePerusahaan && kodePerusahaan !== 'Semua') {
        whereClauses.push('(k.kode_perusahaan = ? OR k.kode_perusahaan = "RSG" OR k.kode_perusahaan IS NULL)');
        whereParams.push(kodePerusahaan);
      }
      if (jenisKain && jenisKain !== 'Semua') {
        whereClauses.push('k.jenis_kain = ?');
        whereParams.push(jenisKain);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        whereClauses.push('(k.kode_sku_kain LIKE ? OR k.nama_kain LIKE ? OR k.jenis_kain LIKE ? OR k.warna LIKE ?)');
        whereParams.push(q, q, q, q);
      }

      const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

      const sql = `
        SELECT 
          k.*,
          COUNT(p.id) as total_produk_terkait
        FROM master_kain k
        LEFT JOIN produk_master p ON p.sku_kain = k.kode_sku_kain
        ${whereSql}
        GROUP BY k.id
        ORDER BY k.id ASC
      `;

      const [rows] = await pool.query(sql, whereParams);
      sendJson(res, 200, { status: 'success', data: rows });
      return true;
    } catch (err) {
      console.error('[Kain API GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/kain/master - Tambah atau Batch Simpan Master Kain
  if ((pathname === '/api/kain/master' || pathname === '/api/marketplace/kain') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const items = Array.isArray(body) ? body : [body];

      if (items.length === 0) {
        sendJson(res, 200, { status: 'success', count: 0 });
        return true;
      }

      for (const item of items) {
        const kodePerusahaan = String(item.kode_perusahaan || 'RSG').slice(0, 32);
        const kodeSkuKain = String(item.kode_sku_kain || item.sku_kain || '').trim();
        const namaKain = String(item.nama_kain || item.nama || `Kain ${kodeSkuKain}`).trim();
        const jenisKain = item.jenis_kain ? String(item.jenis_kain).slice(0, 100) : null;
        const warna = item.warna ? String(item.warna).slice(0, 100) : null;
        const satuan = String(item.satuan || 'METER').slice(0, 32);
        const stokKain = Number(item.stok_kain || item.stok) || 0;
        const hargaPerMeter = Number(item.harga_per_meter || item.harga) || 0;
        const keterangan = item.keterangan ? String(item.keterangan) : null;

        if (!kodeSkuKain) continue;

        await pool.query(`
          INSERT INTO master_kain (
            kode_perusahaan, kode_sku_kain, nama_kain, jenis_kain, warna, satuan, stok_kain, harga_per_meter, keterangan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_kain = VALUES(nama_kain),
            jenis_kain = VALUES(jenis_kain),
            warna = VALUES(warna),
            satuan = VALUES(satuan),
            stok_kain = VALUES(stok_kain),
            harga_per_meter = VALUES(harga_per_meter),
            keterangan = VALUES(keterangan)
        `, [kodePerusahaan, kodeSkuKain, namaKain, jenisKain, warna, satuan, stokKain, hargaPerMeter, keterangan]);
      }

      sendJson(res, 200, { status: 'success', count: items.length });
      return true;
    } catch (err) {
      console.error('[Kain API POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. PUT / DELETE Master Kain by ID
  const kainIdMatch = pathname.match(/^\/api\/(?:kain|marketplace\/kain)\/master\/([^/]+)$/) ||
                      pathname.match(/^\/api\/(?:kain|marketplace\/kain)\/([^/]+)$/);
  
  if (kainIdMatch && req.method === 'PUT') {
    try {
      const id = decodeURIComponent(kainIdMatch[1]);
      const body = await parseJsonBody(req);
      const sets = [];
      const values = [];
      const allowed = ['nama_kain', 'jenis_kain', 'warna', 'satuan', 'stok_kain', 'harga_per_meter', 'keterangan', 'kode_sku_kain', 'kode_perusahaan'];

      for (const col of allowed) {
        if (body[col] !== undefined) {
          sets.push(`${col} = ?`);
          values.push(body[col]);
        }
      }

      if (sets.length === 0) {
        sendJson(res, 400, { status: 'error', message: 'Tidak ada data yang diubah' });
        return true;
      }

      values.push(id);
      await pool.query(`UPDATE master_kain SET ${sets.join(', ')} WHERE id = ?`, values);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  if (kainIdMatch && req.method === 'DELETE') {
    try {
      const id = decodeURIComponent(kainIdMatch[1]);
      await pool.query('DELETE FROM master_kain WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
