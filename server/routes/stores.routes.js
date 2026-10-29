import { sendJson } from '../utils/response.js';

export async function handleStoresRoutes(req, res, pathname, urlObj, { pool }) {
  // 1. GET Toko Terhubung dari Database MySQL
  if (pathname === '/api/marketplace/stores' && req.method === 'GET') {
    try {
      const [rows] = await pool.query(`
        SELECT 
          id, kode_perusahaan as company_code, saluran as channel, 
          nama_saluran as channelName, nama_toko as shopName, id_toko as shopId,
          logo_toko as logo, cipher_toko as cipher, token_akses as accessToken,
          token_refresh as refreshToken, kadaluarsa_pada as expiresAt,
          status_koneksi as status, sinkron_stok_otomatis as autoSyncStok
        FROM toko_marketplace
        ORDER BY dibuat_pada DESC
      `);
      sendJson(res, 200, { status: 'success', data: rows });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  // 2. DELETE Toko Terhubung dari Database MySQL
  const deleteMatch = pathname.match(/^\/api\/marketplace\/stores\/([^/]+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    try {
      const storeId = decodeURIComponent(deleteMatch[1]);
      await pool.query('DELETE FROM toko_marketplace WHERE id = ? OR id_toko = ?', [storeId, storeId]);
      sendJson(res, 200, { status: 'success', message: 'Koneksi toko berhasil diputuskan dan dihapus dari database' });
      return true;
    } catch (err) {
      sendJson(res, 500, { status: 'error', message: err.message });
      return true;
    }
  }

  return false;
}
