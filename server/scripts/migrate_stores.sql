INSERT INTO ruangmarket.toko_marketplace (
  id,
  kode_perusahaan,
  saluran,
  nama_saluran,
  nama_toko,
  id_toko,
  logo_toko,
  cipher_toko,
  token_akses,
  token_refresh,
  kadaluarsa_pada,
  status_koneksi,
  sinkron_stok_otomatis,
  dibuat_pada,
  diperbarui_pada
)
SELECT 
  CONCAT('tk_', c.code, '_', s.id) AS id,
  CASE s.tenant_id
    WHEN 1 THEN 'EMR'
    WHEN 2 THEN 'RSG'
    WHEN 3 THEN 'ABC'
    ELSE 'RSG'
  END AS kode_perusahaan,
  c.code AS saluran,
  c.name AS nama_saluran,
  s.store_name AS nama_toko,
  s.marketplace_store_id AS id_toko,
  COALESCE(s.logo_path, '') AS logo_toko,
  COALESCE(s.shop_cipher, '') AS cipher_toko,
  s.access_token AS token_akses,
  s.refresh_token AS token_refresh,
  s.token_expires_at AS kadaluarsa_pada,
  CASE 
    WHEN s.status = 'connected' THEN 'Aktif (Terhubung)'
    WHEN s.status = 'expired' THEN 'Kadaluarsa'
    ELSE s.status
  END AS status_koneksi,
  1 AS sinkron_stok_otomatis,
  COALESCE(s.created_at, NOW()) AS dibuat_pada,
  COALESCE(s.updated_at, NOW()) AS diperbarui_pada
FROM marketplace.stores s
JOIN marketplace.channels c ON s.channel_id = c.id
ON DUPLICATE KEY UPDATE
  nama_toko = VALUES(nama_toko),
  saluran = VALUES(saluran),
  nama_saluran = VALUES(nama_saluran),
  logo_toko = VALUES(logo_toko),
  cipher_toko = VALUES(cipher_toko),
  token_akses = VALUES(token_akses),
  token_refresh = VALUES(token_refresh),
  kadaluarsa_pada = VALUES(kadaluarsa_pada),
  status_koneksi = VALUES(status_koneksi),
  diperbarui_pada = VALUES(diperbarui_pada);
