// Struktur Hirarki Data Produksi Sesuai Excel / Alur Pabrik:
// 1 No Produksi (Tanggal, Pelanggan, Status, Keterangan)
//   └──> Memiliki beberapa SPK (No SPK, Nama SPK, Penjahit / Makloon)
//         └──> Di dalam setiap SPK, memiliki beberapa Produk (No SPK, SKU, Nama Produk, Kategori, Satuan, Qty, Estimasi Kain / Keterangan)

export const INITIAL_BATCH_PRODUKSI = [
  {
    id: 1,
    company_code: 'RSG',
    kode_produksi: 'PRD-202610-001',
    nama_pelanggan: 'Pelanggan ABC (Distributor Utama Jakarta)',
    tgl_pesan: '2026-10-24',
    deadline: '2026-11-05',
    status: 'Dalam Proses',
    catatan: 'Pesanan partai seragam komplit (Topi, Baju Gamis, Celana Kulot)',
    spk_list: [
      {
        id_spk: 'SPK-123',
        nama_spk: 'SPK Pembuatan Topi Pet',
        penjahit: 'Agus Sutrisno',
        status_spk: 'Proses Jahit',
        produk_items: [
          {
            id: 'item-101',
            no_spk: 'SPK-123',
            produk_id: 1,
            sku: 'SKU-12312',
            nama_produk: 'Topi Pet Bordir Gamis Syari',
            kategori: 'Aksesoris / Topi',
            satuan: 'PCS',
            qty: 150,
            qty_selesai: 120,
            kain_nama: 'Kain Drill Katun',
            panjang_kain_cm: 20,
            harga_kain_cm: 100,
            estimasi_kain: 'Kain Drill Katun - 3.000 CM (30.0M) @Rp100/CM (Rp 300.000)'
          },
          {
            id: 'item-102',
            no_spk: 'SPK-123',
            produk_id: 2,
            sku: 'SKU-12313',
            nama_produk: 'Topi Bucket Casual Muslimah',
            kategori: 'Aksesoris / Topi',
            satuan: 'PCS',
            qty: 100,
            qty_selesai: 60,
            kain_nama: 'Kain Canvas Tebal',
            panjang_kain_cm: 22,
            harga_kain_cm: 120,
            estimasi_kain: 'Kain Canvas Tebal - 2.200 CM (22.0M) @Rp120/CM (Rp 264.000)'
          }
        ]
      },
      {
        id_spk: 'SPK-124',
        nama_spk: 'SPK Jahit Baju Gamis & Tunik',
        penjahit: 'Aning Maryam',
        status_spk: 'Proses Jahit',
        produk_items: [
          {
            id: 'item-103',
            no_spk: 'SPK-124',
            produk_id: 3,
            sku: 'SKU-12314',
            nama_produk: 'Gamis Abaya Dubai Silk Jetblack',
            kategori: 'Gamis Syari',
            satuan: 'PCS',
            qty: 150,
            qty_selesai: 80,
            kain_nama: 'Silk Jetblack Premium',
            panjang_kain_cm: 250,
            harga_kain_cm: 200,
            estimasi_kain: 'Silk Jetblack Premium - 37.500 CM (375.0M) @Rp200/CM (Rp 7.500.000)'
          },
          {
            id: 'item-104',
            no_spk: 'SPK-124',
            produk_id: 4,
            sku: 'SKU-12315',
            nama_produk: 'Gamis Crinkle Airflow Casual Dress',
            kategori: 'Gamis Casual',
            satuan: 'PCS',
            qty: 100,
            qty_selesai: 50,
            kain_nama: 'Crinkle Airflow',
            panjang_kain_cm: 240,
            harga_kain_cm: 150,
            estimasi_kain: 'Crinkle Airflow - 24.000 CM (240.0M) @Rp150/CM (Rp 3.600.000)'
          }
        ]
      },
      {
        id_spk: 'SPK-125',
        nama_spk: 'SPK Jahit Celana Kulot & Bawahan',
        penjahit: 'Anisa Rahmawati',
        status_spk: 'Selesai QC',
        produk_items: [
          {
            id: 'item-105',
            no_spk: 'SPK-125',
            produk_id: 5,
            sku: 'SKU-12316',
            nama_produk: 'Celana Kulot Muslimah Matching Jetblack',
            kategori: 'Celana / Bawahan',
            satuan: 'PCS',
            qty: 150,
            qty_selesai: 150,
            kain_nama: 'Twill Stretch',
            panjang_kain_cm: 140,
            harga_kain_cm: 160,
            estimasi_kain: 'Twill Stretch - 21.000 CM (210.0M) @Rp160/CM (Rp 3.360.000)'
          },
          {
            id: 'item-106',
            no_spk: 'SPK-125',
            produk_id: 6,
            sku: 'SKU-12317',
            nama_produk: 'Rok Payung Muslimah A-Line',
            kategori: 'Celana / Bawahan',
            satuan: 'PCS',
            qty: 80,
            qty_selesai: 80,
            kain_nama: 'Wolfis Premium',
            panjang_kain_cm: 175,
            harga_kain_cm: 130,
            estimasi_kain: 'Wolfis Premium - 14.000 CM (140.0M) @Rp130/CM (Rp 1.820.000)'
          }
        ]
      }
    ]
  }
];
