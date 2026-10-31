export const INITIAL_MUTASI_DATA = [
  {
    id: 1,
    kode_perusahaan: 'RSG',
    tanggal: '2026-10-30',
    no_bukti: 'BKM-20261030-001',
    kode_bank: 'BCA',
    jumlah: 334500,
    keterangan: 'Pelunasan Pesanan Offline Pesantren Al-Hikmah (OFF-20261030-KE9A)',
    jenis_mutasi: 'masuk',
    kategori: 'Penjualan Offline'
  },
  {
    id: 2,
    kode_perusahaan: 'RSG',
    tanggal: '2026-10-30',
    no_bukti: 'BKM-20261030-002',
    kode_bank: 'KAS TUNAI',
    jumlah: 754300,
    keterangan: 'Pembayaran DP Pesanan Offline Seragam Batik (OFF-20261030-KE9A)',
    jenis_mutasi: 'masuk',
    kategori: 'Penjualan Offline'
  },
  {
    id: 3,
    kode_perusahaan: 'RSG',
    tanggal: '2026-10-29',
    no_bukti: 'BKK-20261029-001',
    kode_bank: 'BCA',
    jumlah: 1450000,
    keterangan: 'Pembelian Bahan Kain Batik Tunas Harapan Merah (50 Meter)',
    jenis_mutasi: 'keluar',
    kategori: 'Pembelian Bahan / Kain'
  },
  {
    id: 4,
    kode_perusahaan: 'RSG',
    tanggal: '2026-10-28',
    no_bukti: 'BKK-20261028-002',
    kode_bank: 'MANDIRI',
    jumlah: 850000,
    keterangan: 'Ongkos Jahit SPK SPK-KE9A-01 (Makloon Penjahit)',
    jenis_mutasi: 'keluar',
    kategori: 'Ongkos Produksi / Jahit'
  },
  {
    id: 5,
    kode_perusahaan: 'RSG',
    tanggal: '2026-10-27',
    no_bukti: 'BKM-20261027-001',
    kode_bank: 'MANDIRI',
    jumlah: 2500000,
    keterangan: 'Pencairan Saldo Penjualan Shopee (Toko Ruang Seragam Official)',
    jenis_mutasi: 'masuk',
    kategori: 'Pencairan Marketplace'
  },
  {
    id: 6,
    kode_perusahaan: 'RSG',
    tanggal: '2026-10-26',
    no_bukti: 'BKK-20261026-001',
    kode_bank: 'KAS TUNAI',
    jumlah: 175000,
    keterangan: 'Pembelian Plastik Packing, Lakban Fragile & Karung Koli',
    jenis_mutasi: 'keluar',
    kategori: 'Operasional & Packing'
  }
];

export const KATEGORI_MUTASI_DEFAULT = [
  'Penjualan Offline',
  'Pencairan Marketplace',
  'Pelunasan Piutang',
  'Pembelian Bahan / Kain',
  'Ongkos Produksi / Jahit',
  'Operasional & Packing',
  'Gaji & Upah Karyawan',
  'Sewa & Utilitas (Listrik/Air)',
  'Biaya Pengiriman & Logistik',
  'Lain-lain'
];

export const BANK_DEFAULT = [
  'KAS TUNAI',
  'BCA',
  'MANDIRI',
  'BRI',
  'BNI',
  'BSI',
  'JAGO'
];

