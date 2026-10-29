UPDATE produk_master 
SET estimasi_kain = panjang_kain_cm 
WHERE (estimasi_kain = 'Kain Polos' OR estimasi_kain IS NULL OR estimasi_kain = '') 
  AND panjang_kain_cm IS NOT NULL;

ALTER TABLE produk_master DROP COLUMN panjang_kain_cm;
