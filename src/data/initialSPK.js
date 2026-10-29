// Struktur Hirarki Data Produksi Sesuai Excel / Alur Pabrik:
// 1 No Produksi (Tanggal, Pelanggan, Status, Keterangan)
//   └──> Memiliki beberapa SPK (No SPK, Nama SPK, Penjahit / Makloon)
//         └──> Di dalam setiap SPK, memiliki beberapa Produk (No SPK, SKU, Nama Produk, Kategori, Satuan, Qty, Estimasi Kain / Keterangan)

export const INITIAL_BATCH_PRODUKSI = [];
