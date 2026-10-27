# Ruang Market - Sistem Manajemen Produk & Toko (Standalone)

Aplikasi antarmuka Desktop/Admin modern berbasis React & Vite. Berjalan mandiri tanpa ketergantungan database backend (offline / local state browser) dengan modul utama **Data Produk & Inventaris** lengkap.

---

## 🚀 Cara Menjalankan Project

1. Buka terminal di dalam folder project.
2. Install dependensi:
   ```bash
   npm install
   ```
3. Jalankan server development:
   ```bash
   npm run dev
   ```
4. Buka browser di `http://localhost:3000`.

---

## 📁 Struktur Direktori

```
RuangMarket/
├── index.html                   # HTML utama dengan font Plus Jakarta Sans
├── package.json                 # Dependensi (React, Lucide Icons, SweetAlert2, Vite)
├── vite.config.js               # Konfigurasi Vite dev server
└── src/
    ├── main.jsx                 # Entry point React
    ├── App.jsx                  # Root component (AdminLayout)
    ├── index.css                # Desain CSS lengkap (tokens, scrollbar, tema)
    ├── components/
    │   └── AdminLayout.jsx      # Top bar navigasi 100% width, jam realtime, fullscreen
    ├── views/
    │   ├── DashboardView.jsx    # Dashboard ringkasan inventaris
    │   ├── ProdukView.jsx       # CRUD Data Produk (Filter, Search, Varian, Cetak Barcode, Modal)
    │   └── BlankTemplateView.jsx# Contoh boilerplate untuk membuat modul baru
    ├── data/
    │   └── initialProduk.js     # Data katalog awal produk & varian
    └── utils/
        └── alert.util.js        # Helper notifikasi SweetAlert2
```

---

## 🛠️ Fitur Unggulan

- **Top Bar Navigation**: Navigasi horizontal di bagian atas, lebar 100% full screen.
- **Tanpa Database**: Semua data tersimpan otomatis di `localStorage` browser.
- **Modul Data Produk Lengkap**:
  - 4 Kartu ringkasan (Total Produk, Siap Jual, Stok Menipis, Barcode Ready).
  - Kolom **Varian** & Satuan Stok.
  - Cetak Barcode & Kartu Label Rak siap print.
  - Pencarian instan (nama produk, SKU, varian, barcode, supplier).
  - Tambah, Edit, Hapus (dengan konfirmasi dialog SweetAlert2), dan Detail Modal.
- **Desain & Kontras Tajam**: Background abu-abu modern (`#edf2f7`) dipadu kartu putih solid (`#ffffff`).
