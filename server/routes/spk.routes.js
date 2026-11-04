import { sendJson, parseJsonBody } from '../utils/response.js';

export async function handleSPKRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. GET /api/spk - Ambil semua batch SPK dari database MySQL
  if ((pathname === '/api/spk' || pathname === '/api/marketplace/spk') && req.method === 'GET') {
    try {
      try {
        await pool.query('ALTER TABLE spk_batch ADD COLUMN no_faktur VARCHAR(60) DEFAULT NULL');
      } catch (_) {}

      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      let sql = `
        SELECT b.*, 
          COALESCE(b.no_faktur, po.no_pesanan, '') as no_faktur
        FROM spk_batch b
        LEFT JOIN pesanan_offline po ON po.no_spk = b.kode_produksi
      `;
      const params = [];
      if (kodePerusahaan && kodePerusahaan !== 'ALL') {
        sql += ' WHERE (b.kode_perusahaan = ? OR b.kode_perusahaan = "RSG" OR b.kode_perusahaan IS NULL)';
        params.push(kodePerusahaan);
      }
      sql += ' ORDER BY b.id DESC';
      const [rows] = await pool.query(sql, params);
      
      // Ambil referensi master produk untuk melengkapi panjang_kain_cm dan hpp jika belum terisi
      let masterBySku = new Map();
      let masterByName = new Map();
      try {
        const [masterProds] = await pool.query(
          'SELECT kode_sku, nama_produk, harga_modal, estimasi_kain, sku_kain FROM produk_master'
        );
        for (const mp of masterProds) {
          if (mp.kode_sku) {
            const s = String(mp.kode_sku).trim().toUpperCase();
            masterBySku.set(s, mp);
            masterBySku.set(s.replace(/^RSG-|^PO-/gi, ''), mp);
          }
          if (mp.nama_produk) {
            masterByName.set(String(mp.nama_produk).trim().toLowerCase(), mp);
          }
        }
      } catch (eRef) {
        console.warn('[SPK GET Master Ref Error]:', eRef.message);
      }

      const mapped = rows.map((r) => {
        let spkList = [];
        try {
          spkList = typeof r.spk_list === 'string' ? JSON.parse(r.spk_list) : (r.spk_list || []);
        } catch (e) {
          spkList = [];
        }

        spkList = spkList.map((spk) => {
          const produkItems = (spk.produk_items || []).map((item) => {
            const cleanSku = String(item.sku || '').trim().toUpperCase();
            const cleanName = String(item.nama_produk || '').trim().toLowerCase();
            const ref = masterBySku.get(cleanSku) || masterByName.get(cleanName) || masterBySku.get(cleanSku.replace(/^RSG-|^PO-/gi, ''));

            let panjangKain = Number(item.panjang_kain_cm || 0);
            if (!panjangKain && item.estimasi_kain) {
              const numMatch = String(item.estimasi_kain).match(/([0-9]+(\.[0-9]+)?)/);
              if (numMatch) panjangKain = Math.round(parseFloat(numMatch[1]));
            }
            if (!panjangKain && ref && ref.estimasi_kain) {
              const numMatch = String(ref.estimasi_kain).match(/([0-9]+(\.[0-9]+)?)/);
              if (numMatch) panjangKain = Math.round(parseFloat(numMatch[1]));
            }

            let hppVal = Number(item.hpp ?? item.harga_modal ?? item.cost_price ?? 0);
            if (!hppVal && ref && ref.harga_modal) {
              hppVal = Number(ref.harga_modal || 0);
            }

            const kainNama = item.kain_nama || (ref ? (ref.sku_kain || 'Kain') : 'Kain');

            return {
              ...item,
              panjang_kain_cm: panjangKain,
              hpp: hppVal,
              kain_nama: kainNama,
            };
          });

          return {
            ...spk,
            produk_items: produkItems
          };
        });

        return {
          id: r.id,
          company_code: r.kode_perusahaan || 'RSG',
          kode_produksi: r.kode_produksi,
          no_faktur: r.no_faktur || '',
          nama_pelanggan: r.nama_pelanggan,
          no_telepon: r.no_telepon || '',
          instansi: r.instansi || '',
          tgl_pesan: r.tgl_pesan,
          deadline: r.deadline,
          status: r.status,
          catatan: r.catatan,
          spk_list: spkList,
          created_at: r.created_at,
          updated_at: r.updated_at
        };
      });

      sendJson(res, 200, { status: 'success', data: mapped });
      return true;
    } catch (err) {
      console.error('[SPK API GET Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. POST /api/spk - Simpan / Update batch SPK ke database MySQL
  if ((pathname === '/api/spk' || pathname === '/api/marketplace/spk') && req.method === 'POST') {
    try {
      try {
        await pool.query('ALTER TABLE spk_batch ADD COLUMN no_faktur VARCHAR(60) DEFAULT NULL');
      } catch (_) {}

      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }

      const {
        id,
        company_code,
        kode_produksi,
        no_faktur,
        nama_pelanggan,
        no_telepon,
        instansi,
        tgl_pesan,
        deadline,
        status,
        catatan,
        spk_list
      } = body;

      const spkJson = typeof spk_list === 'string' ? spk_list : JSON.stringify(spk_list || []);
      const kodePerusahaan = company_code || 'RSG';
      const noFakturVal = no_faktur || null;

      if (id && Number(id) > 0) {
        // UPDATE existing
        await pool.query(
          `UPDATE spk_batch SET 
            kode_perusahaan = ?,
            kode_produksi = ?,
            no_faktur = ?,
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
            kodePerusahaan,
            kode_produksi,
            noFakturVal,
            nama_pelanggan || '',
            no_telepon || '',
            instansi || '',
            tgl_pesan || '',
            deadline || '',
            status || 'Dalam Proses',
            catatan || '',
            spkJson,
            id
          ]
        );
        sendJson(res, 200, { status: 'success', message: 'SPK berhasil diperbarui', id });
      } else {
        // INSERT new
        const [result] = await pool.query(
          `INSERT INTO spk_batch (
            kode_perusahaan, kode_produksi, no_faktur, nama_pelanggan, no_telepon, instansi,
            tgl_pesan, deadline, status, catatan, spk_list
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            kodePerusahaan,
            kode_produksi,
            noFakturVal,
            nama_pelanggan || '',
            no_telepon || '',
            instansi || '',
            tgl_pesan || '',
            deadline || '',
            status || 'Dalam Proses',
            catatan || '',
            spkJson
          ]
        );
        sendJson(res, 201, { status: 'success', message: 'SPK berhasil disimpan ke database', id: result.insertId });
      }
      return true;
    } catch (err) {
      console.error('[SPK API POST Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. DELETE /api/spk - Hapus satu batch atau kosongkan semua data SPK
  if ((pathname === '/api/spk' || pathname === '/api/marketplace/spk') && req.method === 'DELETE') {
    try {
      const id = urlObj.searchParams.get('id');
      const clearAll = urlObj.searchParams.get('clear');

      if (clearAll === 'all') {
        await pool.query('TRUNCATE TABLE spk_batch');
        sendJson(res, 200, { status: 'success', message: 'Semua data SPK di database berhasil dikosongkan' });
        return true;
      }

      if (id) {
        await pool.query('DELETE FROM spk_batch WHERE id = ?', [id]);
        sendJson(res, 200, { status: 'success', message: `SPK #${id} berhasil dihapus dari database` });
        return true;
      }

      sendJson(res, 400, { status: 'error', message: 'Parameter id atau clear=all diperlukan' });
      return true;
    } catch (err) {
      console.error('[SPK API DELETE Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 4. POST /api/spk/update-status - Update status SPK dari Scanner Barcode
  if ((pathname === '/api/spk/update-status' || pathname === '/api/marketplace/spk/update-status') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (!body) {
        sendJson(res, 400, { status: 'error', message: 'Data tidak boleh kosong' });
        return true;
      }
      const { batch_id, id_spk, status_spk } = body;
      if (!id_spk || !status_spk) {
        sendJson(res, 400, { status: 'error', message: 'id_spk dan status_spk diperlukan' });
        return true;
      }

      // Cari batch dari database
      let whereSql = '1=1';
      const params = [];
      if (batch_id) {
        whereSql = 'id = ? OR kode_produksi = ?';
        params.push(batch_id, batch_id);
      }

      const [rows] = await pool.query(`SELECT * FROM spk_batch WHERE ${whereSql}`, params);
      let matchedAny = false;

      for (const row of rows) {
        let spkList = [];
        try {
          spkList = typeof row.spk_list === 'string' ? JSON.parse(row.spk_list) : (row.spk_list || []);
        } catch (_) {
          spkList = [];
        }

        let updatedInBatch = false;
        spkList = spkList.map((spk) => {
          if (spk.id_spk === id_spk || spk.no_spk === id_spk) {
            updatedInBatch = true;
            matchedAny = true;
            return { ...spk, status_spk: status_spk };
          }
          return spk;
        });

        if (updatedInBatch) {
          const allDone = spkList.every((s) => (s.status_spk || '').toLowerCase().includes('selesai') || (s.status_spk || '').toLowerCase().includes('kirim'));
          const newBatchStatus = allDone ? 'Selesai' : row.status;
          await pool.query(
            'UPDATE spk_batch SET spk_list = ?, status = ? WHERE id = ?',
            [JSON.stringify(spkList), newBatchStatus, row.id]
          );
        }
      }

      sendJson(res, 200, {
        status: 'success',
        message: `Status SPK ${id_spk} berhasil diperbarui ke ${status_spk}`,
        updated: matchedAny
      });
      return true;
    } catch (err) {
      console.error('[SPK Update Status Error]:', err.message);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
