import { sendJson } from '../utils/response.js';

export async function handleWalletRoutes(req, res, pathname, urlObj, { pool }) {
  // GET /api/marketplace/wallet - Ambil saldo & mutasi dompet dari database ruangmarket (dompet_marketplace)
  if (pathname === '/api/marketplace/wallet' && req.method === 'GET') {
    try {
      const storeId = urlObj.searchParams.get('store_id') || 'all';
      const channel = (urlObj.searchParams.get('channel') || 'all').toLowerCase();
      const startDate = urlObj.searchParams.get('start_date') || '';
      const endDate = urlObj.searchParams.get('end_date') || '';
      const search = (urlObj.searchParams.get('search') || '').trim();
      const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const limit = parseInt(urlObj.searchParams.get('limit') || '50', 10);
      const offset = (page - 1) * limit;

      // 1. Auto-sinkronisasi awal jika tabel dompet_marketplace masih kosong: salin data dari marketplace
      try {
        const [[countInit]] = await pool.query('SELECT COUNT(*) as cnt FROM dompet_marketplace');
        if (Number(countInit?.cnt || 0) === 0) {
          await pool.query(`
            INSERT IGNORE INTO dompet_marketplace (
              kode_perusahaan, id_toko, nama_toko, saluran, id_transaksi,
              tanggal_transaksi, tipe_transaksi, deskripsi, nominal, arah,
              saldo_akhir, raw_data, dibuat_pada, diperbarui_pada
            )
            SELECT 
              'RSG',
              CAST(t.store_id AS CHAR),
              COALESCE(s.store_name, 'Toko Marketplace'),
              COALESCE(c.code, 'marketplace'),
              t.transaction_id,
              t.transaction_date,
              COALESCE(t.type, 'Pencairan'),
              t.description,
              t.amount,
              t.direction,
              t.current_balance,
              t.raw_data,
              t.created_at,
              t.updated_at
            FROM marketplace.marketplace_wallet_transactions t
            LEFT JOIN marketplace.stores s ON t.store_id = s.id
            LEFT JOIN marketplace.channels c ON s.channel_id = c.id
          `);
        }
      } catch (eSync) {
        console.warn('[Sync Wallet to RuangMarket Error]:', eSync.message);
      }

      // 2. Ambil Ringkasan Saldo per Toko (Saldo Terkini) dari dompet_marketplace (ruangmarket)
      const [latestBalances] = await pool.query(`
        SELECT 
          d.id_toko as store_id,
          d.nama_toko as store_name,
          d.saluran as channel,
          (
            SELECT d2.saldo_akhir 
            FROM dompet_marketplace d2 
            WHERE d2.id_toko = d.id_toko AND d2.saldo_akhir IS NOT NULL 
            ORDER BY d2.tanggal_transaksi DESC, d2.id DESC 
            LIMIT 1
          ) as latest_balance,
          MAX(d.tanggal_transaksi) as last_updated
        FROM dompet_marketplace d
        GROUP BY d.id_toko, d.nama_toko, d.saluran
        ORDER BY latest_balance DESC
      `).catch(err => {
        console.warn('[Wallet Summary Query Error]:', err.message);
        return [[]];
      });

      let totalSaldoSemua = 0;
      let totalSaldoShopee = 0;
      let totalSaldoTiktok = 0;

      const storesList = (latestBalances || []).map(b => {
        const bal = Number(b.latest_balance || 0);
        totalSaldoSemua += bal;
        const ch = String(b.channel || '').toLowerCase();
        if (ch.includes('shopee')) totalSaldoShopee += bal;
        if (ch.includes('tiktok')) totalSaldoTiktok += bal;

        return {
          store_id: b.store_id,
          store_name: b.store_name || 'Toko',
          channel: ch || 'marketplace',
          channel_name: ch.toUpperCase(),
          balance: bal,
          last_updated: b.last_updated
        };
      });

      // 3. Query Daftar Mutasi Wallet dari dompet_marketplace (ruangmarket)
      const whereConds = [];
      const whereParams = [];

      if (storeId !== 'all') {
        whereConds.push('d.id_toko = ?');
        whereParams.push(storeId);
      }

      if (channel !== 'all') {
        whereConds.push('LOWER(d.saluran) = ?');
        whereParams.push(channel);
      }

      if (startDate) {
        whereConds.push('d.tanggal_transaksi >= ?');
        whereParams.push(`${startDate} 00:00:00`);
      }

      if (endDate) {
        whereConds.push('d.tanggal_transaksi <= ?');
        whereParams.push(`${endDate} 23:59:59`);
      }

      if (search) {
        whereConds.push('(d.id_transaksi LIKE ? OR d.deskripsi LIKE ? OR d.nama_toko LIKE ?)');
        const sWild = `%${search}%`;
        whereParams.push(sWild, sWild, sWild);
      }

      const whereClause = whereConds.length > 0 ? `WHERE ${whereConds.join(' AND ')}` : '';

      // Hitung total data
      const [[countRow]] = await pool.query(`
        SELECT COUNT(*) as total
        FROM dompet_marketplace d
        ${whereClause}
      `, whereParams).catch(() => [[{ total: 0 }]]);

      const totalItems = Number(countRow?.total || 0);

      // Hitung total mutasi masuk & keluar dalam filter aktif
      const [[totalsRow]] = await pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN LOWER(d.arah) = 'in' THEN d.nominal ELSE 0 END), 0) as total_masuk,
          COALESCE(SUM(CASE WHEN LOWER(d.arah) = 'out' THEN d.nominal ELSE 0 END), 0) as total_keluar
        FROM dompet_marketplace d
        ${whereClause}
      `, whereParams).catch(() => [[{ total_masuk: 0, total_keluar: 0 }]]);

      // Ambil baris transaksi paginasi dari tabel dompet_marketplace (ruangmarket)
      const [txRows] = await pool.query(`
        SELECT 
          d.id,
          d.id_toko as store_id,
          d.nama_toko as store_name,
          d.saluran as channel,
          d.id_transaksi as transaction_id,
          d.tanggal_transaksi as transaction_date,
          d.tipe_transaksi as type,
          d.deskripsi as description,
          d.nominal as amount,
          d.arah as direction,
          d.saldo_akhir as current_balance,
          d.dibuat_pada as created_at
        FROM dompet_marketplace d
        ${whereClause}
        ORDER BY d.tanggal_transaksi DESC, d.id DESC
        LIMIT ? OFFSET ?
      `, [...whereParams, limit, offset]).catch(err => {
        console.warn('[Wallet Tx Query Error]:', err.message);
        return [[]];
      });

      sendJson(res, 200, {
        status: 'success',
        data: {
          summary: {
            total_saldo: totalSaldoSemua,
            saldo_shopee: totalSaldoShopee,
            saldo_tiktok: totalSaldoTiktok,
            total_masuk: Number(totalsRow?.total_masuk || 0),
            total_keluar: Number(totalsRow?.total_keluar || 0),
            stores: storesList
          },
          transactions: (txRows || []).map(r => ({
            id: r.id,
            store_id: r.store_id,
            store_name: r.store_name || 'Toko',
            channel: (r.channel || '').toLowerCase(),
            channel_name: (r.channel || '').toUpperCase(),
            transaction_id: r.transaction_id,
            transaction_date: r.transaction_date,
            type: r.type,
            description: r.description,
            amount: Number(r.amount || 0),
            direction: (r.direction || 'in').toLowerCase(),
            current_balance: r.current_balance !== null ? Number(r.current_balance) : null,
            created_at: r.created_at
          })),
          pagination: {
            page,
            limit,
            total_items: totalItems,
            total_pages: Math.ceil(totalItems / limit) || 1
          }
        }
      });
      return true;
    } catch (err) {
      console.error('[GET /api/marketplace/wallet Error]:', err);
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
