import { sendJson, parseJsonBody } from '../utils/response.js';
import * as XLSX from 'xlsx';
import { detectSkuKain, detectIdKategoriHpp } from '../utils/autoDetector.util.js';

export async function handleMasterRoutes(req, res, pathname, urlObj, { pool }) {
  // 0a. Download Template Master Produk (Excel / CSV)
  if ((pathname === '/api/produk/master/template' || pathname === '/api/marketplace/master/template') && req.method === 'GET') {
    try {
      const format = (urlObj.searchParams.get('format') || 'xlsx').toLowerCase();
      const templateHeaders = [
        'kode_sku',
        'nama_produk',
        'kategori',
        'satuan',
        'harga_jual',
        'harga_modal',
        'stok_fisik',
        'status',
        'status_order',
        'tipe_set',
        'sku_kain',
        'estimasi_kain',
        'id_kategori_hpp'
      ];

      const sampleData = [
        {
          kode_sku: 'BB-TH-MERAH-LPJ-S',
          nama_produk: 'Baju Batik Tunas Harapan Merah Lengan Panjang Size S',
          kategori: 'Baju Batik',
          satuan: 'PCS',
          harga_jual: 85000,
          harga_modal: 55000,
          stok_fisik: 50,
          status: 'Aktif',
          status_order: 'Ready Stok',
          tipe_set: 'Single',
          sku_kain: 'KB-TH-MERAH',
          estimasi_kain: 200,
          id_kategori_hpp: ''
        },
        {
          kode_sku: 'ROK-SD-MERAH-M',
          nama_produk: 'Rok Rampel Merah SD Size M',
          kategori: 'Rok Seragam',
          satuan: 'PCS',
          harga_jual: 75000,
          harga_modal: 45000,
          stok_fisik: 40,
          status: 'Aktif',
          status_order: 'Ready Stok',
          tipe_set: 'Single',
          sku_kain: 'K-DRILL-UON',
          estimasi_kain: 180,
          id_kategori_hpp: ''
        },
        {
          kode_sku: 'PO-KP-GM-LPJ-SD-L',
          nama_produk: 'Kemeja Putih Katun GM Lengan Panjang SD Size L',
          kategori: 'Kemeja',
          satuan: 'PCS',
          harga_jual: 70000,
          harga_modal: 40000,
          stok_fisik: 25,
          status: 'Aktif',
          status_order: 'PO',
          tipe_set: 'Single',
          sku_kain: 'K-GM',
          estimasi_kain: 190,
          id_kategori_hpp: ''
        }
      ];

      if (format === 'csv') {
        const ws = XLSX.utils.json_to_sheet(sampleData, { header: templateHeaders });
        const csvContent = XLSX.utils.sheet_to_csv(ws);
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="template_master_produk.csv"'
        });
        res.end(csvContent);
        return true;
      }

      // Ambil daftar SKU Kain, HPP & Kategori dari DB untuk tab referensi
      const [kainRows] = await pool.query('SELECT kode_sku_kain, nama_kain, jenis_kain, warna FROM master_kain ORDER BY id ASC');
      const [hppRows] = await pool.query('SELECT id_kategori_hpp, nama_kategori_hpp, total_hpp FROM master_hpp_produk ORDER BY id ASC');
      const [katRows] = await pool.query('SELECT nama_kategori, deskripsi, status FROM master_kategori ORDER BY nama_kategori ASC');

      const wb = XLSX.utils.book_new();

      // Sheet 1: Master_Produk
      const ws1 = XLSX.utils.json_to_sheet(sampleData, { header: templateHeaders });
      ws1['!cols'] = [
        { wch: 24 }, { wch: 48 }, { wch: 18 }, { wch: 10 },
        { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
        { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
        { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(wb, ws1, 'Master_Produk');

      // Sheet 2: Referensi SKU Kain
      const refKain = kainRows.map(k => ({
        KODE_SKU_KAIN: k.kode_sku_kain,
        NAMA_KAIN: k.nama_kain,
        JENIS: k.jenis_kain || '-',
        WARNA: k.warna || '-'
      }));
      const ws2 = XLSX.utils.json_to_sheet(refKain);
      ws2['!cols'] = [{ wch: 20 }, { wch: 32 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Referensi_SKU_Kain');

      // Sheet 3: Referensi Kategori HPP
      const refHpp = hppRows.map(h => ({
        ID_KATEGORI_HPP: h.id_kategori_hpp,
        NAMA_KATEGORI: h.nama_kategori_hpp,
        TOTAL_HPP: Number(h.total_hpp || 0)
      }));
      const ws3 = XLSX.utils.json_to_sheet(refHpp);
      ws3['!cols'] = [{ wch: 22 }, { wch: 35 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Referensi_HPP');

      // Sheet 4: Referensi Kategori Produk
      const refKat = katRows.map(k => ({
        NAMA_KATEGORI: k.nama_kategori,
        DESKRIPSI: k.deskripsi || '-',
        STATUS: k.status || 'Aktif'
      }));
      const wsKat = XLSX.utils.json_to_sheet(refKat);
      wsKat['!cols'] = [{ wch: 25 }, { wch: 45 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsKat, 'Referensi_Kategori');

      // Sheet 5: Petunjuk Pengisian
      const panduan = [
        { ATURAN: 'Logika Upload Baru', PENJELASAN: 'Jika kode_sku belum ada di database, baris otomatis di-INSERT sebagai produk baru.' },
        { ATURAN: 'Logika Update', PENJELASAN: 'Jika kode_sku sudah ada dan ada kolom yang diubah (harga, stok, nama, dll), baris otomatis di-UPDATE.' },
        { ATURAN: 'Logika Skip', PENJELASAN: 'Jika kode_sku sudah ada dan seluruh datanya sama persis, baris otomatis di-SKIP tanpa query update.' },
        { ATURAN: 'Kategori Otomatis', PENJELASAN: 'Jika kategori yang diinput belum ada di Master Kategori, sistem akan OTOMATIS MENAMBAHKANNYA ke Master Kategori.' },
        { ATURAN: 'SKU Kain', PENJELASAN: 'Isi dengan kode SKU Kain dari sheet "Referensi_SKU_Kain" (misal: KB-TH-MERAH).' },
        { ATURAN: 'Estimasi Kain (CM)', PENJELASAN: 'Isi estimasi panjang kain yang dibutuhkan per pcs dalam satuan CM (misal: 200, 180, 190).' },
        { ATURAN: 'Status Order', PENJELASAN: 'Isi dengan "Ready Stok" atau "PO".' },
        { ATURAN: 'Tipe Set', PENJELASAN: 'Isi dengan "Single" atau "Satu Setel" / "Bundle".' }
      ];
      const ws5 = XLSX.utils.json_to_sheet(panduan);
      ws5['!cols'] = [{ wch: 22 }, { wch: 75 }];
      XLSX.utils.book_append_sheet(wb, ws5, 'Petunjuk_Pengisian');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_import_master_produk.xlsx"'
      });
      res.end(buffer);
      return true;
    } catch (err) {
      console.error('[Template API Error]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 0b. Import & Smart Upsert Master Produk (Insert baru, Update jika ada perubahan, Skip jika sama)
  if ((pathname === '/api/produk/master/import' || pathname === '/api/marketplace/master/import') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const items = Array.isArray(body?.items) ? body.items : (Array.isArray(body) ? body : []);

      if (items.length === 0) {
        sendJson(res, 400, { status: 'error', message: 'Data baris produk tidak ditemukan' });
        return true;
      }

      const kodePerusahaan = String(body.kode_perusahaan || 'RSG').slice(0, 32);

      // Ambil seluruh master produk yang ada untuk perbandingan cepat dalam memori
      const [existingRows] = await pool.query(`
        SELECT 
          id, kode_perusahaan, kode_sku, nama_produk, kategori, satuan,
          harga_jual, harga_modal, stok_fisik, status, status_order, tipe_set,
          sku_kain, estimasi_kain, id_kategori_hpp
        FROM produk_master
      `);

      const existingMap = new Map();
      for (const row of existingRows) {
        const cleanSku = String(row.kode_sku || '').trim().toUpperCase();
        existingMap.set(cleanSku, row);
        if (cleanSku.startsWith('RSG-')) {
          existingMap.set(cleanSku.substring(4), row);
        }
      }

      // Ambil daftar valid SKU Kain
      const [kainRows] = await pool.query('SELECT kode_sku_kain, nama_kain, harga_per_meter FROM master_kain');
      const kainMap = new Map();
      for (const k of kainRows) {
        kainMap.set(String(k.kode_sku_kain).trim().toUpperCase(), {
          nama_kain: k.nama_kain,
          harga_per_meter: Number(k.harga_per_meter) || 0
        });
      }

      // Ambil seluruh master kategori yang ada untuk deteksi & auto-tambah
      const [katRows] = await pool.query('SELECT id, nama_kategori FROM master_kategori');
      const katSet = new Set(katRows.map(k => String(k.nama_kategori || '').trim().toUpperCase()));
      const newCategoriesAdded = [];

      // Ambil referensi master_hpp_produk untuk auto-deteksi HPP jika kolom kosong
      const [hppMasterList] = await pool.query('SELECT id_kategori_hpp, nama_kategori_hpp FROM master_hpp_produk');

      let inserted = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      let autoKainCount = 0;
      let autoHppCount = 0;
      const details = [];

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const rawSku = String(item.kode_sku || item.sku || '').trim();
        if (!rawSku) {
          failed++;
          details.push({
            row: idx + 1,
            sku: '(KOSONG)',
            action: 'FAIL',
            reason: 'Kolom kode_sku wajib diisi'
          });
          continue;
        }

        const cleanSku = (rawSku.startsWith('RSG-') ? rawSku.substring(4) : rawSku).slice(0, 255);
        const matchKey = cleanSku.toUpperCase();

        const namaProduk = String(item.nama_produk || item.nama || `Produk ${cleanSku}`).trim().slice(0, 255);
        const rawKategori = String(item.kategori || 'Pakaian').trim().slice(0, 64);
        const kategori = rawKategori || 'Pakaian';

        // Auto-tambah kategori ke master_kategori jika belum terdaftar
        const katKey = kategori.toUpperCase();
        if (!katSet.has(katKey)) {
          try {
            await pool.query(`
              INSERT IGNORE INTO master_kategori (kode_perusahaan, nama_kategori, deskripsi, status)
              VALUES (?, ?, 'Ditambahkan otomatis saat import produk', 'Aktif')
            `, [kodePerusahaan, kategori]);
            katSet.add(katKey);
            if (!newCategoriesAdded.includes(kategori)) {
              newCategoriesAdded.push(kategori);
            }
          } catch (katErr) {
            console.error('[Auto-Insert Kategori Error]:', katErr.message);
          }
        }

        const satuan = String(item.satuan || 'PCS').trim().slice(0, 32);
        const hargaJual = Number(item.harga_jual) || 0;
        const hargaModal = Number(item.harga_modal ?? item.harga_beli) || 0;
        const stokFisik = Number(item.stok_fisik ?? item.stok) || 0;
        const status = String(item.status || 'Aktif').trim().slice(0, 32);
        const statusOrder = String(item.status_order || 'Ready Stok').trim().slice(0, 32);
        const tipeSet = String(item.tipe_set || 'Single').trim().slice(0, 32);
        
        // Auto-deteksi SKU Kain jika kosong
        let rawSkuKain = item.sku_kain ? String(item.sku_kain).trim() : null;
        if (!rawSkuKain) {
          const detectedKain = detectSkuKain(cleanSku, namaProduk, null);
          if (detectedKain) {
            rawSkuKain = detectedKain;
            autoKainCount++;
          }
        }
        const skuKain = rawSkuKain ? rawSkuKain.slice(0, 64) : null;

        // Ambil estimasi kain (berapa cm, misal: 200, 180, 100, 120)
        let estimasiKain = '200';
        const rawEstimasi = (item.estimasi_kain !== undefined && item.estimasi_kain !== null && String(item.estimasi_kain).trim() !== '')
          ? String(item.estimasi_kain).trim()
          : (item.panjang_kain_cm ? String(item.panjang_kain_cm).trim() : '');

        if (rawEstimasi) {
          const numMatch = rawEstimasi.match(/([0-9]+(\.[0-9]+)?)/);
          if (numMatch) {
            estimasiKain = String(parseFloat(numMatch[1]) || 200);
          } else {
            estimasiKain = rawEstimasi.slice(0, 100);
          }
        }

        // Auto-deteksi ID Kategori HPP jika kosong
        let idKategoriHpp = item.id_kategori_hpp ? String(item.id_kategori_hpp).trim().slice(0, 64) : null;
        if (!idKategoriHpp) {
          const detectedHpp = detectIdKategoriHpp(cleanSku, namaProduk, hppMasterList);
          if (detectedHpp) {
            idKategoriHpp = detectedHpp.slice(0, 64);
            autoHppCount++;
          }
        }

        // Jika sku_kain baru belum ada di master_kain, buat entri otomatis di master_kain
        if (skuKain && !kainMap.has(skuKain.toUpperCase())) {
          try {
            await pool.query(`
              INSERT IGNORE INTO master_kain (kode_perusahaan, kode_sku_kain, nama_kain)
              VALUES (?, ?, ?)
            `, [kodePerusahaan, skuKain, `Kain ${skuKain}`]);
            kainMap.set(skuKain.toUpperCase(), { nama_kain: `Kain ${skuKain}`, harga_per_meter: 0 });
          } catch (e) {}
        }

        const existing = existingMap.get(matchKey);

        if (existing) {
          // Bandingkan apakah ada perubahan
          const diffs = [];
          if (existing.nama_produk !== namaProduk) diffs.push(`nama_produk: "${existing.nama_produk}" -> "${namaProduk}"`);
          if (existing.kategori !== kategori) diffs.push(`kategori: "${existing.kategori}" -> "${kategori}"`);
          if (existing.satuan !== satuan) diffs.push(`satuan: "${existing.satuan}" -> "${satuan}"`);
          if (Number(existing.harga_jual) !== hargaJual) diffs.push(`harga_jual: ${existing.harga_jual} -> ${hargaJual}`);
          if (Number(existing.harga_modal) !== hargaModal) diffs.push(`harga_modal: ${existing.harga_modal} -> ${hargaModal}`);
          if (Number(existing.stok_fisik) !== stokFisik) diffs.push(`stok_fisik: ${existing.stok_fisik} -> ${stokFisik}`);
          if (existing.status !== status) diffs.push(`status: "${existing.status}" -> "${status}"`);
          if (existing.status_order !== statusOrder) diffs.push(`status_order: "${existing.status_order}" -> "${statusOrder}"`);
          if (existing.tipe_set !== tipeSet) diffs.push(`tipe_set: "${existing.tipe_set}" -> "${tipeSet}"`);
          if ((existing.sku_kain || null) !== skuKain) diffs.push(`sku_kain: "${existing.sku_kain || '-'}" -> "${skuKain || '-'}"`);
          
          const cleanExistingEst = String(existing.estimasi_kain || '').replace(/[^0-9.]/g, '');
          const cleanNewEst = String(estimasiKain).replace(/[^0-9.]/g, '');
          if (cleanExistingEst !== cleanNewEst && String(existing.estimasi_kain || '') !== String(estimasiKain)) {
            diffs.push(`estimasi_kain: "${existing.estimasi_kain || '-'}" -> "${estimasiKain}"`);
          }
          if ((existing.id_kategori_hpp || null) !== idKategoriHpp) diffs.push(`id_kategori_hpp: "${existing.id_kategori_hpp || '-'}" -> "${idKategoriHpp || '-'}"`);

          if (diffs.length === 0) {
            // Data identik -> SKIP
            skipped++;
            details.push({
              row: idx + 1,
              sku: cleanSku,
              nama_produk: namaProduk,
              action: 'SKIP',
              reason: 'Data identik (tidak ada perubahan)'
            });
          } else {
            // Ada perbedaan -> UPDATE
            await pool.query(`
              UPDATE produk_master SET
                nama_produk = ?,
                kategori = ?,
                satuan = ?,
                harga_jual = ?,
                harga_modal = ?,
                stok_fisik = ?,
                status = ?,
                status_order = ?,
                tipe_set = ?,
                sku_kain = ?,
                estimasi_kain = ?,
                id_kategori_hpp = ?
              WHERE id = ?
            `, [
              namaProduk, kategori, satuan, hargaJual, hargaModal, stokFisik,
              status, statusOrder, tipeSet, skuKain, estimasiKain,
              idKategoriHpp, existing.id
            ]);
            updated++;
            existingMap.set(matchKey, {
              ...existing,
              nama_produk: namaProduk,
              kategori, satuan, harga_jual: hargaJual, harga_modal: hargaModal,
              stok_fisik: stokFisik, status, status_order: statusOrder,
              tipe_set: tipeSet, sku_kain: skuKain, estimasi_kain: estimasiKain,
              id_kategori_hpp: idKategoriHpp
            });
            details.push({
              row: idx + 1,
              sku: cleanSku,
              nama_produk: namaProduk,
              action: 'UPDATE',
              changes: diffs
            });
          }
        } else {
          // Belum ada -> INSERT
          const [insertRes] = await pool.query(`
            INSERT INTO produk_master (
              kode_perusahaan, kode_sku, nama_produk, kategori, satuan,
              harga_jual, harga_modal, stok_fisik, status, status_order,
              tipe_set, sku_kain, estimasi_kain, id_kategori_hpp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            kodePerusahaan, cleanSku, namaProduk, kategori, satuan,
            hargaJual, hargaModal, stokFisik, status, statusOrder,
            tipeSet, skuKain, estimasiKain, idKategoriHpp
          ]);
          inserted++;
          existingMap.set(matchKey, {
            id: insertRes.insertId,
            kode_perusahaan: kodePerusahaan,
            kode_sku: cleanSku,
            nama_produk: namaProduk,
            kategori, satuan, harga_jual: hargaJual, harga_modal: hargaModal,
            stok_fisik: stokFisik, status, status_order: statusOrder,
            tipe_set: tipeSet, sku_kain: skuKain, estimasi_kain: estimasiKain,
            id_kategori_hpp: idKategoriHpp
          });
          details.push({
            row: idx + 1,
            sku: cleanSku,
            nama_produk: namaProduk,
            action: 'INSERT',
            reason: 'Produk baru ditambahkan'
          });
        }
      }

      sendJson(res, 200, {
        status: 'success',
        summary: {
          total: items.length,
          inserted,
          updated,
          skipped,
          failed,
          kategori_baru: newCategoriesAdded.length,
          kain_auto_terdeteksi: autoKainCount,
          hpp_auto_terdeteksi: autoHppCount
        },
        new_categories: newCategoriesAdded,
        details
      });
      return true;
    } catch (err) {
      console.error('[Import API Error]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 0c. Auto-Detect Relasi Kain & HPP untuk Semua Produk yang masih kosong
  if ((pathname === '/api/produk/master/auto-detect-all' || pathname === '/api/marketplace/master/auto-detect-all') && req.method === 'POST') {
    try {
      const [prods] = await pool.query(`
        SELECT id, kode_sku, nama_produk, sku_kain, id_kategori_hpp
        FROM produk_master
        WHERE (sku_kain IS NULL OR sku_kain = '') OR (id_kategori_hpp IS NULL OR id_kategori_hpp = '')
      `);

      const [hppMasterList] = await pool.query('SELECT id_kategori_hpp, nama_kategori_hpp FROM master_hpp_produk');
      const [kainRows] = await pool.query('SELECT kode_sku_kain, nama_kain FROM master_kain');
      const kainMap = new Set(kainRows.map(k => String(k.kode_sku_kain).trim().toUpperCase()));

      let kainFilled = 0;
      let hppFilled = 0;
      let totalUpdated = 0;

      for (const p of prods) {
        let updateKain = false;
        let updateHpp = false;
        let newKain = p.sku_kain;
        let newHpp = p.id_kategori_hpp;

        if (!p.sku_kain || String(p.sku_kain).trim() === '') {
          const det = detectSkuKain(p.kode_sku, p.nama_produk, null);
          if (det) {
            newKain = det;
            updateKain = true;
            kainFilled++;

            // Pastikan terdaftar di master_kain
            if (!kainMap.has(det.toUpperCase())) {
              try {
                await pool.query('INSERT IGNORE INTO master_kain (kode_perusahaan, kode_sku_kain, nama_kain) VALUES (?, ?, ?)', ['RSG', det, `Kain ${det}`]);
                kainMap.add(det.toUpperCase());
              } catch (e) {}
            }
          }
        }

        if (!p.id_kategori_hpp || String(p.id_kategori_hpp).trim() === '') {
          const detHpp = detectIdKategoriHpp(p.kode_sku, p.nama_produk, hppMasterList);
          if (detHpp) {
            newHpp = detHpp;
            updateHpp = true;
            hppFilled++;
          }
        }

        if (updateKain || updateHpp) {
          await pool.query('UPDATE produk_master SET sku_kain = ?, id_kategori_hpp = ? WHERE id = ?', [newKain, newHpp, p.id]);
          totalUpdated++;
        }
      }

      sendJson(res, 200, {
        status: 'success',
        message: `Berhasil mendeteksi otomatis! ${totalUpdated} produk diperbarui (${kainFilled} SKU Kain, ${hppFilled} Kategori HPP).`,
        summary: {
          scanned: prods.length,
          total_updated: totalUpdated,
          kain_filled: kainFilled,
          hpp_filled: hppFilled
        }
      });
      return true;
    } catch (err) {
      console.error('[Auto-Detect All Error]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 1. Ambil Master Produk ERP
  if ((pathname === '/api/produk/master' || pathname === '/api/marketplace/master') && req.method === 'GET') {
    try {
      const kodePerusahaan = urlObj.searchParams.get('kode_perusahaan');
      const pageParam = urlObj.searchParams.get('page');
      const limitParam = urlObj.searchParams.get('limit') || urlObj.searchParams.get('entriesPerPage');
      const search = urlObj.searchParams.get('search');
      const kategori = urlObj.searchParams.get('kategori');
      const tipeSet = urlObj.searchParams.get('tipe_set');
      const statusOrder = urlObj.searchParams.get('status_order');
      const status = urlObj.searchParams.get('status');

      const tabParam = urlObj.searchParams.get('tab');
      const isPaginated = pageParam !== null || limitParam !== null;
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.max(1, Math.min(200, parseInt(limitParam, 10) || 50));
      const offset = (page - 1) * limit;

      const whereClauses = [];
      const whereParams = [];

      if (kodePerusahaan) {
        whereClauses.push('p.kode_perusahaan = ?');
        whereParams.push(kodePerusahaan);
      }
      if (kategori && kategori !== 'Semua') {
        whereClauses.push('p.kategori = ?');
        whereParams.push(kategori);
      }
      if (tipeSet && tipeSet !== 'Semua') {
        whereClauses.push('p.tipe_set = ?');
        whereParams.push(tipeSet);
      }
      if (statusOrder && statusOrder !== 'Semua') {
        whereClauses.push('p.status_order = ?');
        whereParams.push(statusOrder);
      }
      if (status && status !== 'Semua') {
        whereClauses.push('p.status = ?');
        whereParams.push(status);
      }
      const skuKainParam = urlObj.searchParams.get('sku_kain');
      if (skuKainParam && skuKainParam !== 'Semua') {
        whereClauses.push('p.sku_kain = ?');
        whereParams.push(skuKainParam);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        whereClauses.push('(p.nama_produk LIKE ? OR p.kode_sku LIKE ? OR p.sku_kain LIKE ? OR k.nama_kain LIKE ?)');
        whereParams.push(q, q, q, q);
      }

      // Filter berdasarkan Tab aktif
      if (tabParam === 'tersedia') {
        whereClauses.push('p.stok_fisik > 5');
      } else if (tabParam === 'menipis') {
        whereClauses.push('(p.stok_fisik > 0 AND p.stok_fisik <= 5)');
      } else if (tabParam === 'habis') {
        whereClauses.push('(p.stok_fisik <= 0 OR p.stok_fisik IS NULL)');
      } else if (tabParam === 'po') {
        whereClauses.push("p.status_order = 'PO'");
      } else if (tabParam === 'ready') {
        whereClauses.push("(p.status_order != 'PO' OR p.status_order IS NULL)");
      }

      const whereSql = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

      // Hitung total data untuk halaman aktif
      let total = 0;
      if (isPaginated) {
        const countSql = `
          SELECT COUNT(*) as total 
          FROM produk_master p 
          LEFT JOIN master_kain k ON p.sku_kain = k.kode_sku_kain
          ${whereSql}
        `;
        const [[countRow]] = await pool.query(countSql, whereParams);
        total = Number(countRow?.total || 0);
      }

      // Hitung tab summary counts keseluruhan (Semua, Tersedia, Menipis, Habis, PO, Ready)
      let tabCounts = { semua: 0, tersedia: 0, menipis: 0, habis: 0, po: 0, ready: 0 };
      if (isPaginated) {
        const baseWhereClauses = [];
        const baseWhereParams = [];
        if (kodePerusahaan) {
          baseWhereClauses.push('p.kode_perusahaan = ?');
          baseWhereParams.push(kodePerusahaan);
        }
        if (kategori && kategori !== 'Semua') {
          baseWhereClauses.push('p.kategori = ?');
          baseWhereParams.push(kategori);
        }
        if (tipeSet && tipeSet !== 'Semua') {
          baseWhereClauses.push('p.tipe_set = ?');
          baseWhereParams.push(tipeSet);
        }
        if (skuKainParam && skuKainParam !== 'Semua') {
          baseWhereClauses.push('p.sku_kain = ?');
          baseWhereParams.push(skuKainParam);
        }
        if (search && search.trim()) {
          const q = `%${search.trim()}%`;
          baseWhereClauses.push('(p.nama_produk LIKE ? OR p.kode_sku LIKE ? OR p.sku_kain LIKE ? OR k.nama_kain LIKE ?)');
          baseWhereParams.push(q, q, q, q);
        }
        const baseWhereSql = baseWhereClauses.length > 0 ? ` WHERE ${baseWhereClauses.join(' AND ')}` : '';
        const [[countsRow]] = await pool.query(`
          SELECT 
            COUNT(*) as total_semua,
            SUM(CASE WHEN p.stok_fisik > 5 THEN 1 ELSE 0 END) as total_tersedia,
            SUM(CASE WHEN p.stok_fisik > 0 AND p.stok_fisik <= 5 THEN 1 ELSE 0 END) as total_menipis,
            SUM(CASE WHEN p.stok_fisik <= 0 OR p.stok_fisik IS NULL THEN 1 ELSE 0 END) as total_habis,
            SUM(CASE WHEN p.status_order = 'PO' THEN 1 ELSE 0 END) as total_po,
            SUM(CASE WHEN p.status_order != 'PO' OR p.status_order IS NULL THEN 1 ELSE 0 END) as total_ready
          FROM produk_master p
          LEFT JOIN master_kain k ON p.sku_kain = k.kode_sku_kain
          ${baseWhereSql}
        `, baseWhereParams);

        if (countsRow) {
          tabCounts = {
            semua: Number(countsRow.total_semua || 0),
            tersedia: Number(countsRow.total_tersedia || 0),
            menipis: Number(countsRow.total_menipis || 0),
            habis: Number(countsRow.total_habis || 0),
            po: Number(countsRow.total_po || 0),
            ready: Number(countsRow.total_ready || 0)
          };
        }
      }

      let sql = `
        SELECT 
          p.*,
          k.nama_kain,
          k.jenis_kain,
          k.warna as warna_kain,
          k.satuan as satuan_kain,
          k.stok_kain,
          k.harga_per_meter as harga_kain_meter,
          h.nama_kategori_hpp,
          h.total_hpp as hpp_kategori
        FROM produk_master p
        LEFT JOIN master_kain k ON p.sku_kain = k.kode_sku_kain
        LEFT JOIN master_hpp_produk h ON p.id_kategori_hpp = h.id_kategori_hpp
        ${whereSql}
        ORDER BY p.id DESC
      `;

      let queryParams = [...whereParams];
      if (isPaginated) {
        sql += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);
      }

      const [rows] = await pool.query(sql, queryParams);
      const mapped = rows.map(r => {
        let parsedBundle = [];
        if (r.bundle_items) {
          try {
            parsedBundle = typeof r.bundle_items === 'string' ? JSON.parse(r.bundle_items) : r.bundle_items;
          } catch (e) {
            parsedBundle = [];
          }
        }
        // Hitung harga_kain_cm murni dari master_kain (harga_per_meter / 100)
        const meterPrice = Number(r.harga_kain_meter) || 0;
        const computedHargaKainCm = meterPrice > 0 ? Math.round(meterPrice / 100) : 0;

        return {
          ...r,
          bundle_items: parsedBundle,
          harga_kain_cm: computedHargaKainCm
        };
      });

      if (isPaginated) {
        sendJson(res, 200, {
          status: 'success',
          data: mapped,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1
          },
          counts: tabCounts
        });
      } else {
        sendJson(res, 200, mapped);
      }
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. Simpan / Batch Simpan ke Master Produk ERP
  if ((pathname === '/api/produk/master' || pathname === '/api/marketplace/master') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const items = Array.isArray(body) ? body : [body];
      
      if (items.length === 0) {
        sendJson(res, 200, { status: 'success', count: 0 });
        return true;
      }

      console.log(`[API Master] Menyimpan ${items.length} produk ke produk_master...`);

      const chunkSize = 100;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const values = [];
        const placeholders = chunk.map((item, idx) => {
          const kodePerusahaan = String(item.kode_perusahaan || item.company_code || 'RSG').slice(0, 32);
          const rawSku = String(item.kode_sku || item.sku || `SKU-${Date.now()}-${i + idx}`).trim();
          const kodeSku = (rawSku.startsWith('RSG-') ? rawSku.substring(4) : rawSku).slice(0, 255);
          const namaProduk = String(item.nama_produk || 'Produk').slice(0, 255);
          const kategori = String(item.kategori || 'Gamis Casual').slice(0, 64);
          const satuan = String(item.satuan || 'PCS').slice(0, 32);
          const hargaJual = Number(item.harga_jual) || 0;
          const hargaModal = Number(item.harga_modal || item.harga_beli) || 0;
          const stokFisik = Number(item.stok_fisik || item.stok) || 0;
          const status = String(item.status || 'Aktif').slice(0, 32);
          const statusOrder = String(item.status_order || 'Ready Stok').slice(0, 32);
          const fotoProduk = String(item.foto_produk || item.image || '').slice(0, 1000);
          const tipeSet = String(item.tipe_set || 'Single').slice(0, 32);
          const bundleItems = item.bundle_items ? (typeof item.bundle_items === 'string' ? item.bundle_items : JSON.stringify(item.bundle_items)) : null;
          const estimasiKain = item.estimasi_kain ? String(item.estimasi_kain).slice(0, 100) : (item.panjang_kain_cm ? String(item.panjang_kain_cm) : '200');
          const idKategoriHpp = item.id_kategori_hpp ? String(item.id_kategori_hpp).slice(0, 64) : null;
          const skuKain = item.sku_kain ? String(item.sku_kain).slice(0, 64) : null;

          values.push(kodePerusahaan, kodeSku, namaProduk, kategori, satuan, hargaJual, hargaModal, stokFisik, status, statusOrder, fotoProduk, tipeSet, bundleItems, estimasiKain, idKategoriHpp, skuKain);
          return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        }).join(', ');

        const sql = `
          INSERT INTO produk_master (
            kode_perusahaan, kode_sku, nama_produk, kategori, satuan,
            harga_jual, harga_modal, stok_fisik, status, status_order, foto_produk,
            tipe_set, bundle_items, estimasi_kain, id_kategori_hpp, sku_kain
          ) VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            nama_produk = VALUES(nama_produk),
            kategori = VALUES(kategori),
            satuan = VALUES(satuan),
            harga_jual = VALUES(harga_jual),
            harga_modal = VALUES(harga_modal),
            stok_fisik = VALUES(stok_fisik),
            status = VALUES(status),
            status_order = VALUES(status_order),
            foto_produk = COALESCE(NULLIF(VALUES(foto_produk), ''), foto_produk),
            tipe_set = VALUES(tipe_set),
            bundle_items = VALUES(bundle_items),
            estimasi_kain = VALUES(estimasi_kain),
            id_kategori_hpp = VALUES(id_kategori_hpp),
            sku_kain = COALESCE(VALUES(sku_kain), sku_kain)
        `;

        await pool.query(sql, values);
      }

      console.log(`[API Master] Berhasil menyimpan ${items.length} produk ke produk_master MySQL!`);
      sendJson(res, 200, { status: 'success', count: items.length });
      return true;
    } catch (err) {
      console.error('[API Master ERROR]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3. Batch Update status_order Master Produk ERP
  if ((pathname === '/api/produk/master/batch-status-order' || pathname === '/api/marketplace/master/batch-status-order') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { ids, status_order, items } = body;

      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          if (it.id && it.status_order) {
            await pool.query('UPDATE produk_master SET status_order = ? WHERE id = ?', [it.status_order, it.id]);
          }
        }
        sendJson(res, 200, { status: 'success', updated: items.length });
        return true;
      }

      if (Array.isArray(ids) && ids.length > 0 && status_order) {
        await pool.query('UPDATE produk_master SET status_order = ? WHERE id IN (?)', [status_order, ids]);
        sendJson(res, 200, { status: 'success', updated: ids.length });
        return true;
      }

      sendJson(res, 400, { status: 'error', message: 'Parameter ids dan status_order diperlukan' });
      return true;
    } catch (err) {
      console.error('[API Batch Status Order ERROR]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 3b. Batch Update Bundle Set Master Produk ERP
  if ((pathname === '/api/produk/master/batch-bundle' || pathname === '/api/marketplace/master/batch-bundle') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { items } = body;

      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          if (it.id) {
            const tipeSet = it.tipe_set || 'Single';
            const bundleItems = it.bundle_items ? (typeof it.bundle_items === 'string' ? it.bundle_items : JSON.stringify(it.bundle_items)) : null;
            await pool.query(
              'UPDATE produk_master SET tipe_set = ?, bundle_items = ? WHERE id = ?',
              [tipeSet, bundleItems, it.id]
            );
          }
        }
        sendJson(res, 200, { status: 'success', updated: items.length });
        return true;
      }

      sendJson(res, 400, { status: 'error', message: 'Parameter items diperlukan' });
      return true;
    } catch (err) {
      console.error('[API Batch Bundle ERROR]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 4. Update / Delete Master Produk by ID
  const masterIdMatch = pathname.match(/^\/api\/(?:produk|marketplace)\/master\/([^/]+)$/);
  if (masterIdMatch && req.method === 'PUT') {
    try {
      const body = await parseJsonBody(req);
      const sets = [];
      const values = [];
      const allowed = [
        'nama_produk', 'kategori', 'satuan', 'harga_jual', 'harga_modal',
        'stok_fisik', 'status', 'status_order', 'kode_sku', 'kode_perusahaan',
        'tipe_set', 'bundle_items', 'estimasi_kain',
        'id_kategori_hpp', 'sku_kain'
      ];
      for (const col of allowed) {
        if (body[col] !== undefined) {
          sets.push(`${col} = ?`);
          if (col === 'bundle_items' && typeof body[col] === 'object' && body[col] !== null) {
            values.push(JSON.stringify(body[col]));
          } else {
            values.push(body[col]);
          }
        }
      }
      if (sets.length === 0) {
        sendJson(res, 400, { status: 'error', message: 'Tidak ada data diubah' });
        return true;
      }
      values.push(masterIdMatch[1]);
      await pool.query(`UPDATE produk_master SET ${sets.join(', ')} WHERE id = ?`, values);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  if (masterIdMatch && req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM produk_master WHERE id = ?', [masterIdMatch[1]]);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 5. Master Kategori CRUD Endpoints
  if ((pathname === '/api/kategori' || pathname === '/api/produk/kategori' || pathname === '/api/marketplace/kategori') && req.method === 'GET') {
    try {
      const [rows] = await pool.query(`
        SELECT id, kode_perusahaan, nama_kategori AS nama, deskripsi, status, dibuat_pada, diperbarui_pada
        FROM master_kategori
        ORDER BY nama_kategori ASC
      `);
      sendJson(res, 200, { status: 'success', data: rows });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  if ((pathname === '/api/kategori' || pathname === '/api/produk/kategori' || pathname === '/api/marketplace/kategori') && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const nama = String(body.nama || body.nama_kategori || '').trim();
      if (!nama) {
        sendJson(res, 400, { status: 'error', message: 'Nama kategori wajib diisi' });
        return true;
      }
      const kodePerusahaan = String(body.kode_perusahaan || 'RSG').slice(0, 32);
      const deskripsi = body.deskripsi ? String(body.deskripsi).trim() : null;
      const status = String(body.status || 'Aktif').trim().slice(0, 32);

      const [result] = await pool.query(`
        INSERT INTO master_kategori (kode_perusahaan, nama_kategori, deskripsi, status)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          deskripsi = VALUES(deskripsi),
          status = VALUES(status)
      `, [kodePerusahaan, nama, deskripsi, status]);

      sendJson(res, 200, {
        status: 'success',
        id: result.insertId || undefined,
        nama,
        deskripsi,
        status
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  const kategoriIdMatch = pathname.match(/^\/api\/(?:kategori|produk\/kategori|marketplace\/kategori)\/([^/]+)$/);
  if (kategoriIdMatch && req.method === 'PUT') {
    try {
      const id = kategoriIdMatch[1];
      const body = await parseJsonBody(req);
      const nama = body.nama || body.nama_kategori;
      const deskripsi = body.deskripsi;
      const status = body.status;

      const sets = [];
      const values = [];
      if (nama !== undefined) {
        sets.push('nama_kategori = ?');
        values.push(String(nama).trim());
      }
      if (deskripsi !== undefined) {
        sets.push('deskripsi = ?');
        values.push(deskripsi ? String(deskripsi).trim() : null);
      }
      if (status !== undefined) {
        sets.push('status = ?');
        values.push(String(status).trim());
      }

      if (sets.length === 0) {
        sendJson(res, 400, { status: 'error', message: 'Tidak ada data diubah' });
        return true;
      }

      values.push(id);
      await pool.query(`UPDATE master_kategori SET ${sets.join(', ')} WHERE id = ?`, values);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  if (kategoriIdMatch && req.method === 'DELETE') {
    try {
      const id = kategoriIdMatch[1];
      await pool.query('DELETE FROM master_kategori WHERE id = ?', [id]);
      sendJson(res, 200, { status: 'success' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
