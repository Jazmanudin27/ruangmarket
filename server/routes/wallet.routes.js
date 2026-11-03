import { sendJson } from '../utils/response.js';

export async function handleWalletRoutes(req, res, pathname, urlObj, { pool, laravelPool }) {
  // GET /api/marketplace/wallet - Ambil saldo & mutasi dompet marketplace
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

      const targetPool = laravelPool || pool;

      // 1. Ambil Ringkasan Saldo per Toko (Saldo Terkini)
      // Ambil transaksi paling baru per toko yang current_balance-nya tidak null
      const [latestBalances] = await targetPool.query(`
        SELECT 
          s.id as store_id,
          s.store_name,
          c.code as channel,
          c.name as channel_name,
          (
            SELECT t2.current_balance 
            FROM marketplace.marketplace_wallet_transactions t2 
            WHERE t2.store_id = s.id AND t2.current_balance IS NOT NULL 
            ORDER BY t2.transaction_date DESC, t2.id DESC 
            LIMIT 1
          ) as latest_balance,
          (
            SELECT MAX(t3.transaction_date)
            FROM marketplace.marketplace_wallet_transactions t3
            WHERE t3.store_id = s.id
          ) as last_updated
        FROM marketplace.stores s
        LEFT JOIN marketplace.channels c ON s.channel_id = c.id
        WHERE s.status = 'connected' OR EXISTS (
          SELECT 1 FROM marketplace.marketplace_wallet_transactions wt WHERE wt.store_id = s.id LIMIT 1
        )
        ORDER BY latest_balance DESC
      `).catch(err => {
        console.warn('[Wallet Summary Query Error]:', err.message);
        return [[]];
      });

      // Hitung agregat saldo
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
          channel_name: b.channel_name || 'Marketplace',
          balance: bal,
          last_updated: b.last_updated
        };
      });

      // 2. Query Daftar Mutasi Wallet
      const whereConds = [];
      const whereParams = [];

      if (storeId !== 'all') {
        whereConds.push('t.store_id = ?');
        whereParams.push(storeId);
      }

      if (channel !== 'all') {
        whereConds.push('LOWER(c.code) = ?');
        whereParams.push(channel);
      }

      if (startDate) {
        whereConds.push('t.transaction_date >= ?');
        whereParams.push(`${startDate} 00:00:00`);
      }

      if (endDate) {
        whereConds.push('t.transaction_date <= ?');
        whereParams.push(`${endDate} 23:59:59`);
      }

      if (search) {
        whereConds.push('(t.transaction_id LIKE ? OR t.description LIKE ? OR s.store_name LIKE ?)');
        const sWild = `%${search}%`;
        whereParams.push(sWild, sWild, sWild);
      }

      const whereClause = whereConds.length > 0 ? `WHERE ${whereConds.join(' AND ')}` : '';

      // Hitung total data
      const [[countRow]] = await targetPool.query(`
        SELECT COUNT(*) as total
        FROM marketplace.marketplace_wallet_transactions t
        LEFT JOIN marketplace.stores s ON t.store_id = s.id
        LEFT JOIN marketplace.channels c ON s.channel_id = c.id
        ${whereClause}
      `, whereParams).catch(() => [[{ total: 0 }]]);

      const totalItems = Number(countRow?.total || 0);

      // Hitung total mutasi masuk & keluar dalam filter aktif
      const [[totalsRow]] = await targetPool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN LOWER(t.direction) = 'in' THEN t.amount ELSE 0 END), 0) as total_masuk,
          COALESCE(SUM(CASE WHEN LOWER(t.direction) = 'out' THEN t.amount ELSE 0 END), 0) as total_keluar
        FROM marketplace.marketplace_wallet_transactions t
        LEFT JOIN marketplace.stores s ON t.store_id = s.id
        LEFT JOIN marketplace.channels c ON s.channel_id = c.id
        ${whereClause}
      `, whereParams).catch(() => [[{ total_masuk: 0, total_keluar: 0 }]]);

      // Ambil baris transaksi paginasi
      const [txRows] = await targetPool.query(`
        SELECT 
          t.id,
          t.store_id,
          s.store_name,
          c.code as channel,
          c.name as channel_name,
          t.transaction_id,
          t.transaction_date,
          t.type,
          t.description,
          t.amount,
          t.direction,
          t.current_balance,
          t.created_at
        FROM marketplace.marketplace_wallet_transactions t
        LEFT JOIN marketplace.stores s ON t.store_id = s.id
        LEFT JOIN marketplace.channels c ON s.channel_id = c.id
        ${whereClause}
        ORDER BY t.transaction_date DESC, t.id DESC
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
            channel_name: r.channel_name || 'Marketplace',
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
