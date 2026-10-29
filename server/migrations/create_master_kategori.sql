CREATE TABLE IF NOT EXISTS master_kategori (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode_perusahaan VARCHAR(32) DEFAULT 'RSG',
  nama_kategori VARCHAR(100) NOT NULL UNIQUE,
  deskripsi TEXT NULL,
  status VARCHAR(32) DEFAULT 'Aktif',
  dibuat_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  diperbarui_pada TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Master Kategori Produk ERP RuangMarket';

-- Seed default categories if empty
INSERT IGNORE INTO master_kategori (kode_perusahaan, nama_kategori, deskripsi, status) VALUES
('RSG', 'Gamis Syari', 'Gamis syari dengan potongan lebar dan anggun', 'Aktif'),
('RSG', 'Gamis Casual', 'Gamis harian santai untuk aktivitas sehari-hari', 'Aktif'),
('RSG', 'Gamis Pesta', 'Gamis brokat & payet mewah untuk acara resmi/pesta', 'Aktif'),
('RSG', 'Gamis Daily', 'Gamis bahan katun/rayon sejuk dipakai seharian', 'Aktif'),
('RSG', 'Abaya Dubai', 'Model abaya khas timur tengah silk jetblack', 'Aktif'),
('RSG', 'Baju Batik', 'Pakaian batik seragam dan casual', 'Aktif'),
('RSG', 'Rok Seragam', 'Rok bawahan seragam sekolah dan formal', 'Aktif'),
('RSG', 'Celana Seragam', 'Celana bawahan seragam sekolah dan formal', 'Aktif'),
('RSG', 'Kemeja', 'Kemeja atasan lengan pendek dan panjang', 'Aktif');

-- Insert any existing distinct categories from produk_master
INSERT IGNORE INTO master_kategori (kode_perusahaan, nama_kategori, deskripsi, status)
SELECT DISTINCT COALESCE(NULLIF(kode_perusahaan, ''), 'RSG'), TRIM(kategori), 'Kategori dari produk master', 'Aktif'
FROM produk_master
WHERE kategori IS NOT NULL AND TRIM(kategori) != '';
