import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Boxes, 
  Plus, 
  RotateCw, 
  Search, 
  Eye, 
  Edit3, 
  Trash2, 
  Clock, 
  X, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Tag, 
  Printer, 
  Layers, 
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  Settings,
  User,
  ShoppingBag,
  Factory
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

// Bobot ukuran untuk sorting natural (S, M, L, XL, XXL)
const SIZE_WEIGHTS = {
  "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "11": 11, "12": 12, "13": 13, "14": 14, "15": 15, "16": 16, "17": 17, "18": 18,
  "XXS": 90, "2XS": 90,
  "XS": 105,
  "S": 110,
  "M": 115,
  "L": 120,
  "XL": 125,
  "2XL": 130, "XXL": 130,
  "3XL": 135, "XXXL": 135,
  "4XL": 140, "XXXXL": 140,
  "5XL": 145, "XXXXXL": 145,
  "6XL": 150,
  "7XL": 155,
  "8XL": 160,
  "ALL SIZE": 200, "ALLSIZE": 200, "JUMBO": 210,
};

function parseItemForSort(item) {
  const sku = (item.kode_sku || item.sku || "").trim();
  const name = (item.nama_produk || item.nama || "").trim();

  const skuParts = sku.split(/[-_\s]+/);
  if (skuParts.length > 1) {
    const lastSku = skuParts[skuParts.length - 1].toUpperCase();
    if (SIZE_WEIGHTS[lastSku] !== undefined) {
      return {
        base: skuParts.slice(0, -1).join("-").toLowerCase(),
        weight: SIZE_WEIGHTS[lastSku],
        rawName: name.toLowerCase(),
        rawSku: sku.toLowerCase(),
      };
    }
  }

  const nameParts = name.split(/[-_\s]+/);
  if (nameParts.length > 1) {
    const lastName = nameParts[nameParts.length - 1].toUpperCase();
    if (SIZE_WEIGHTS[lastName] !== undefined) {
      return {
        base: nameParts.slice(0, -1).join(" ").toLowerCase(),
        weight: SIZE_WEIGHTS[lastName],
        rawName: name.toLowerCase(),
        rawSku: sku.toLowerCase(),
      };
    }
  }

  return {
    base: (name || sku).toLowerCase(),
    weight: 999,
    rawName: name.toLowerCase(),
    rawSku: sku.toLowerCase(),
  };
}

function compareProducts(a, b) {
  const pA = parseItemForSort(a);
  const pB = parseItemForSort(b);

  if (pA.base === pB.base && pA.weight !== 999 && pB.weight !== 999) {
    return pA.weight - pB.weight;
  }

  const baseCompare = pA.base.localeCompare(pB.base, "id", {
    numeric: true,
    sensitivity: "base",
  });
  if (baseCompare !== 0) return baseCompare;

  return pA.rawSku.localeCompare(pB.rawSku, "id", {
    numeric: true,
    sensitivity: "base",
  });
}

// Searchable Select Component with instant search filter
function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Pilih...",
  required = false,
  renderItem,
  zIndex = 10005,
  rightAction = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const safeOptions = Array.isArray(options) ? options : [];
  const searchTerms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const filteredOptions = safeOptions.filter((opt) => {
    if (searchTerms.length === 0) return true;
    const text = (
      typeof opt === "string"
        ? opt
        : `${opt.label || ""} ${opt.value || ""} ${opt.sku || ""} ${opt.nama_produk || ""}`
    ).toLowerCase();
    return searchTerms.every((term) => text.includes(term));
  });

  const selectedOpt = safeOptions.find((opt) => {
    if (typeof opt === "string") return opt === value;
    return opt.value === value || opt.sku === value;
  });

  const displayText = selectedOpt
    ? typeof selectedOpt === "string"
      ? selectedOpt
      : selectedOpt.label || selectedOpt.nama_produk || selectedOpt.value
    : "";

  return (
    <div style={{ position: "relative", width: "100%" }} ref={wrapperRef}>
      {(label || rightAction) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
          {label && (
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#334155" }}>
              {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
            </label>
          )}
          {rightAction}
        </div>
      )}

      {/* Button trigger */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: "34px",
          padding: "6px 10px",
          borderRadius: "6px",
          border: isOpen ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
          fontSize: "12px",
          fontWeight: "600",
          color: displayText ? "#0f172a" : "#94a3b8",
          backgroundColor: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          boxSizing: "border-box",
          boxShadow: isOpen ? "0 0 0 2px rgba(2, 132, 199, 0.15)" : "none",
          transition: "all 0.15s ease"
        }}
      >
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
          {selectedOpt && typeof selectedOpt !== "string" && selectedOpt.sku ? (
            <>
              <span style={{
                fontFamily: "monospace",
                fontSize: "10.5px",
                fontWeight: "800",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                padding: "1px 5px",
                borderRadius: "3px"
              }}>
                {selectedOpt.sku}
              </span>
              <span style={{ fontSize: "11.5px", color: "#0f172a" }}>
                {selectedOpt.nama_produk || selectedOpt.label}
              </span>
            </>
          ) : (
            <span>{displayText || placeholder}</span>
          )}
        </div>
        <span style={{ fontSize: "10px", color: "#94a3b8", flexShrink: 0 }}>▼</span>
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "#ffffff",
            borderRadius: "7px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            zIndex,
            overflow: "hidden"
          }}
        >
          {/* Search box inside dropdown */}
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
            <Search size={14} color="#64748b" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik untuk mencari..."
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "12px",
                color: "#0f172a"
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* List items */}
          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                Tidak ada data yang cocok
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optVal = typeof opt === "string" ? opt : opt.value;
                const isSelected = optVal === value;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onChange(optVal, opt);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    style={{
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: "11.5px",
                      backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                      borderBottom: "1px solid #f8fafc",
                      color: isSelected ? "#1d4ed8" : "#334155",
                      fontWeight: isSelected ? "700" : "500",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background-color 0.1s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#f1f5f9";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#ffffff";
                    }}
                  >
                    {renderItem ? (
                      renderItem(opt, isSelected)
                    ) : (
                      <span>{typeof opt === "string" ? opt : opt.label || opt.value}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MutasiBarangDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [mutasiList, setMutasiList] = useState([]);
  const [summary, setSummary] = useState({
    total_transaksi: 0,
    total_qty_masuk: 0,
    total_qty_keluar: 0,
    transaksi_masuk: 0,
    transaksi_keluar: 0,
    transaksi_penyesuaian: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('semua'); // 'semua' | 'masuk' | 'keluar' | 'penyesuaian'
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Master options for Autocomplete
  const [masterProdukList, setMasterProdukList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isKategoriModalOpen, setIsKategoriModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedMutasi, setSelectedMutasi] = useState(null);

  // Form State
  const initialForm = {
    tanggal: new Date().toISOString().slice(0, 10),
    no_bukti: '',
    jenis_mutasi: 'masuk', // 'masuk' | 'keluar' | 'penyesuaian'
    kategori: 'Hasil Produksi / SPK',
    produk_id: null,
    kode_sku: '',
    nama_produk: '',
    varian: '',
    satuan: 'PCS',
    jumlah: 1,
    stok_sebelum: 0,
    stok_sesudah: 0,
    no_referensi: '',
    pihak_terkait: '',
    petugas: 'Staff Gudang',
    keterangan: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Kategori Modal Form State
  const [kategoriForm, setKategoriForm] = useState({ id: null, nama_kategori: '', jenis_mutasi: 'semua' });
  const [editingKategoriId, setEditingKategoriId] = useState(null);

  // Auto generate nomor bukti
  const generateNoBukti = (jenis = 'masuk') => {
    const nowYmd = (formData.tanggal || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const prefix = jenis === 'masuk' ? 'BM' : jenis === 'keluar' ? 'BK' : 'ADJ';
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${nowYmd}-${rand}`;
  };

  // Load Data Mutasi dari Backend MySQL
  const loadMutasi = async () => {
    setIsLoading(true);
    try {
      const company = activeCompany?.code || 'RSG';
      const params = new URLSearchParams({
        company,
        jenis: activeFilterTab,
        kategori: filterKategori,
        search,
        start_date: startDate,
        end_date: endDate
      });
      const res = await fetch(`/api/mutasi-barang?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setMutasiList(json.data);
        if (json.summary) setSummary(json.summary);
      } else {
        setMutasiList([]);
      }
    } catch (err) {
      toastError(`Gagal memuat mutasi barang: ${err.message}`);
      setMutasiList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Master Produk untuk referensi SKU & stok
  const loadMasterProduk = async () => {
    try {
      const res = await fetch('/api/marketplace/master?limit=1000');
      const json = await res.json();
      if (res.ok && json.data) {
        setMasterProdukList(json.data);
      }
    } catch (e) {
      setMasterProdukList([]);
    }
  };

  // Load Kategori Mutasi Barang
  const loadKategori = async () => {
    try {
      const company = activeCompany?.code || 'RSG';
      const res = await fetch(`/api/mutasi-barang/kategori?company=${company}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setKategoriList(json.data);
      }
    } catch (e) {
      setKategoriList([]);
    }
  };

  useEffect(() => {
    loadMutasi();
  }, [activeFilterTab, filterKategori, startDate, endDate, activeCompany.code]);

  useEffect(() => {
    loadMasterProduk();
    loadKategori();
  }, [activeCompany.code]);

  // Sorted & formatted product options for SearchableSelect
  const productOptions = useMemo(() => {
    return [...masterProdukList].sort(compareProducts).map(p => ({
      value: p.sku,
      label: `${p.sku} — ${p.nama_produk}`,
      sku: p.sku,
      nama_produk: p.nama_produk,
      satuan: p.satuan || 'PCS',
      stok: p.stok !== undefined ? p.stok : (p.stok_fisik !== undefined ? p.stok_fisik : 0),
      kategori: p.kategori_nama || p.kategori || ''
    }));
  }, [masterProdukList]);

  // Formatted category options for SearchableSelect
  const kategoriOptions = useMemo(() => {
    return (kategoriList || []).map(kat => ({
      value: kat.nama_kategori,
      label: kat.nama_kategori,
      jenis: kat.jenis_mutasi
    }));
  }, [kategoriList]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMutasi();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Saat pilih produk di form, auto-fill nama produk, SKU, satuan, dan stok saat ini
  const handleSelectProduct = (skuOrId) => {
    const prod = masterProdukList.find(p => String(p.id) === String(skuOrId) || p.sku === skuOrId);
    if (prod) {
      const currStock = Number(prod.stok || prod.stok_fisik || 0);
      const qty = Number(formData.jumlah) || 1;
      let nextStock = currStock;
      if (formData.jenis_mutasi === 'masuk') {
        nextStock = currStock + qty;
      } else if (formData.jenis_mutasi === 'keluar') {
        nextStock = Math.max(0, currStock - qty);
      }

      setFormData(prev => ({
        ...prev,
        produk_id: prod.id,
        kode_sku: prod.sku || '',
        nama_produk: prod.nama_produk || '',
        satuan: prod.satuan || 'PCS',
        stok_sebelum: currStock,
        stok_sesudah: nextStock
      }));
    }
  };

  // Recalculate preview stok sesudah saat jumlah atau jenis mutasi berubah
  const handleUpdateQty = (qtyVal) => {
    const qty = Math.max(1, parseInt(qtyVal, 10) || 1);
    const curr = Number(formData.stok_sebelum || 0);
    let next = curr;
    if (formData.jenis_mutasi === 'masuk') {
      next = curr + qty;
    } else if (formData.jenis_mutasi === 'keluar') {
      next = Math.max(0, curr - qty);
    } else if (formData.jenis_mutasi === 'penyesuaian') {
      next = qty;
    }

    setFormData(prev => ({
      ...prev,
      jumlah: qty,
      stok_sesudah: next
    }));
  };

  const handleSwitchJenisMutasi = (newJenis) => {
    const curr = Number(formData.stok_sebelum || 0);
    const qty = Number(formData.jumlah || 1);
    let next = curr;
    if (newJenis === 'masuk') next = curr + qty;
    else if (newJenis === 'keluar') next = Math.max(0, curr - qty);
    else if (newJenis === 'penyesuaian') next = qty;

    const defaultKat = newJenis === 'masuk' ? 'Hasil Produksi / SPK' : newJenis === 'keluar' ? 'Penjualan Offline' : 'Penyesuaian Opname';

    setFormData(prev => ({
      ...prev,
      jenis_mutasi: newJenis,
      no_bukti: generateNoBukti(newJenis),
      kategori: defaultKat,
      stok_sesudah: next
    }));
  };

  const handleOpenAdd = (defaultJenis = 'masuk') => {
    setEditingId(null);
    const newNoBukti = generateNoBukti(defaultJenis);
    const defaultKat = defaultJenis === 'masuk' ? 'Hasil Produksi / SPK' : defaultJenis === 'keluar' ? 'Penjualan Offline' : 'Penyesuaian Opname';
    setFormData({
      ...initialForm,
      jenis_mutasi: defaultJenis,
      no_bukti: newNoBukti,
      kategori: defaultKat
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      ...item,
      jumlah: Number(item.jumlah || 1),
      stok_sebelum: Number(item.stok_sebelum || 0),
      stok_sesudah: Number(item.stok_sesudah || 0)
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (item) => {
    setSelectedMutasi(item);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      'Hapus Mutasi Barang?',
      `Hapus mutasi ${item.no_bukti} (${item.nama_produk} - ${item.jumlah} ${item.satuan})? Perubahan stok fisik akan direversi kembali.`,
      'Ya, Hapus Mutasi',
      'Batal'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/mutasi-barang/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || 'Gagal menghapus mutasi');
      }
      toastSuccess('Mutasi berhasil dihapus & stok direversi.');
      loadMutasi();
      loadMasterProduk();
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleSaveMutasi = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.kode_sku || !formData.nama_produk) {
      toastError('Pilih atau ketik Kode SKU dan Nama Produk!');
      return;
    }
    if (!formData.jumlah || Number(formData.jumlah) <= 0) {
      toastError('Jumlah mutasi minimal 1!');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingId ? `/api/mutasi-barang/${editingId}` : '/api/mutasi-barang';
      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        kode_perusahaan: activeCompany?.code || 'RSG',
        jumlah: Number(formData.jumlah),
        stok_sebelum: Number(formData.stok_sebelum),
        stok_sesudah: Number(formData.stok_sesudah)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || 'Gagal menyimpan mutasi');
      }

      toastSuccess(json.message || 'Mutasi barang berhasil disimpan!');
      setIsFormModalOpen(false);
      loadMutasi();
      loadMasterProduk();
    } catch (err) {
      toastError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Kategori Management
  const handleSaveKategori = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!kategoriForm.nama_kategori?.trim()) {
      toastError('Nama kategori wajib diisi!');
      return;
    }

    try {
      const url = editingKategoriId ? `/api/mutasi-barang/kategori/${editingKategoriId}` : '/api/mutasi-barang/kategori';
      const method = editingKategoriId ? 'PUT' : 'POST';
      const payload = {
        kode_perusahaan: activeCompany?.code || 'RSG',
        nama_kategori: kategoriForm.nama_kategori.trim(),
        jenis_mutasi: kategoriForm.jenis_mutasi || 'semua'
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Gagal menyimpan kategori');

      toastSuccess('Kategori mutasi berhasil disimpan!');
      setKategoriForm({ id: null, nama_kategori: '', jenis_mutasi: 'semua' });
      setEditingKategoriId(null);
      loadKategori();
    } catch (err) {
      toastError(err.message);
    }
  };

  const handleDeleteKategori = async (id, nama) => {
    const confirmed = await showConfirm(
      'Hapus Kategori?',
      `Hapus kategori "${nama}"?`,
      'Ya, Hapus',
      'Batal'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/mutasi-barang/kategori/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Gagal menghapus kategori');

      toastSuccess('Kategori berhasil dihapus');
      loadKategori();
    } catch (err) {
      toastError(err.message);
    }
  };

  // Cetak Bukti Mutasi
  const handlePrintBukti = (item) => {
    window.print();
  };

  // Pagination calculation
  const totalPages = Math.ceil(mutasiList.length / entriesPerPage) || 1;
  const paginatedMutasi = mutasiList.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const netArusStok = Number(summary.total_qty_masuk || 0) - Number(summary.total_qty_keluar || 0);

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* MASTER CONTAINER CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
      }}>

        {/* 1. HEADER TITLE & ACTION BUTTONS (GAYA MASTER PRODUK BIRU GRADIENT) */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: '8px',
          padding: '10px 16px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '6px',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.22)'
        }}>
          {/* Title & subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              backdropFilter: 'blur(4px)'
            }}>
              <Boxes size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  Mutasi Barang Masuk & Keluar
                </h1>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '1.5px 7px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  color: '#ffffff'
                }}>
                  {activeCompany.code}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
                Buku register arus stok fisik, barang masuk dari produksi/supplier, pengeluaran penjualan, retur, dan penyesuaian
              </p>
            </div>
          </div>

          {/* Action Button: Cukup Satu Tombol Catat Mutasi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleOpenAdd('masuk')}
              style={{
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 15px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#0284c7',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f9ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <Plus size={15} />
              <span>+ Catat Mutasi</span>
            </button>
          </div>
        </div>

        {/* 2. STAT SUMMARY CARDS (ARUS STOK MASUK & KELUAR) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '8px',
          marginBottom: '6px'
        }}>
          {/* Card 1: Total Transaksi Mutasi */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '7px',
            border: '1px solid #cbd5e1',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                Total Transaksi Mutasi
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                {summary.total_transaksi || mutasiList.length} Mutasi
              </div>
            </div>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Boxes size={16} />
            </div>
          </div>

          {/* Card 2: Total Qty Masuk */}
          <div style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '7px',
            border: '1px solid #bbf7d0',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
                Total Barang Masuk (IN)
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>
                +{Number(summary.total_qty_masuk || 0).toLocaleString('id-ID')} PCS
              </div>
            </div>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownRight size={16} />
            </div>
          </div>

          {/* Card 3: Total Qty Keluar */}
          <div style={{
            backgroundColor: '#fff1f2',
            borderRadius: '7px',
            border: '1px solid #fecdd3',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#9f1239', textTransform: 'uppercase' }}>
                Total Barang Keluar (OUT)
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#be123c', marginTop: '2px' }}>
                -{Number(summary.total_qty_keluar || 0).toLocaleString('id-ID')} PCS
              </div>
            </div>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={16} />
            </div>
          </div>

          {/* Card 4: Net Arus Stok */}
          <div style={{
            backgroundColor: netArusStok >= 0 ? '#f0f9ff' : '#fffbeb',
            borderRadius: '7px',
            border: `1px solid ${netArusStok >= 0 ? '#bae6fd' : '#fde68a'}`,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: netArusStok >= 0 ? '#0369a1' : '#b45309', textTransform: 'uppercase' }}>
                Net Perubahan Stok
              </div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: netArusStok >= 0 ? '#0284c7' : '#d97706', marginTop: '2px' }}>
                {netArusStok >= 0 ? `+${netArusStok.toLocaleString('id-ID')}` : `${netArusStok.toLocaleString('id-ID')}`} PCS
              </div>
            </div>
            <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#ffffff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} />
            </div>
          </div>
        </div>

        {/* 3. FILTER TABS (COLOR-CODED SEPERTI MASTER PRODUK) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
          {/* Tab 1: Semua Mutasi */}
          <button
            type="button"
            onClick={() => { setActiveFilterTab('semua'); setCurrentPage(1); }}
            style={{
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: activeFilterTab === 'semua' ? '1px solid #0284c7' : '1px solid #bfdbfe',
              backgroundColor: activeFilterTab === 'semua' ? '#0284c7' : '#eff6ff',
              color: activeFilterTab === 'semua' ? '#ffffff' : '#1d4ed8',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Layers size={13} />
            <span>Semua Mutasi ({summary.total_transaksi || mutasiList.length})</span>
          </button>

          {/* Tab 2: Barang Masuk (Hijau) */}
          <button
            type="button"
            onClick={() => { setActiveFilterTab('masuk'); setCurrentPage(1); }}
            style={{
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: activeFilterTab === 'masuk' ? '1px solid #059669' : '1px solid #a7f3d0',
              backgroundColor: activeFilterTab === 'masuk' ? '#059669' : '#ecfdf5',
              color: activeFilterTab === 'masuk' ? '#ffffff' : '#047857',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <ArrowDownRight size={13} />
            <span>Barang Masuk / IN ({summary.transaksi_masuk || 0})</span>
          </button>

          {/* Tab 3: Barang Keluar (Merah) */}
          <button
            type="button"
            onClick={() => { setActiveFilterTab('keluar'); setCurrentPage(1); }}
            style={{
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: activeFilterTab === 'keluar' ? '1px solid #dc2626' : '1px solid #fecaca',
              backgroundColor: activeFilterTab === 'keluar' ? '#dc2626' : '#fef2f2',
              color: activeFilterTab === 'keluar' ? '#ffffff' : '#b91c1c',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <ArrowUpRight size={13} />
            <span>Barang Keluar / OUT ({summary.transaksi_keluar || 0})</span>
          </button>

          {/* Tab 4: Penyesuaian (Amber) */}
          <button
            type="button"
            onClick={() => { setActiveFilterTab('penyesuaian'); setCurrentPage(1); }}
            style={{
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: activeFilterTab === 'penyesuaian' ? '1px solid #d97706' : '1px solid #fde68a',
              backgroundColor: activeFilterTab === 'penyesuaian' ? '#d97706' : '#fffbeb',
              color: activeFilterTab === 'penyesuaian' ? '#ffffff' : '#b45309',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Clock size={13} />
            <span>Penyesuaian / Opname ({summary.transaksi_penyesuaian || 0})</span>
          </button>
        </div>

        {/* 4. FILTER CONTROLS BAR (SEARCH, KATEGORI, DATE, ENTRIES) */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}>
          {/* Search input with icon */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Cari no bukti, SKU, nama produk, keterangan, referensi, pihak, petugas..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                backgroundColor: '#f8fafc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Select Kategori */}
          <select
            value={filterKategori}
            onChange={(e) => { setFilterKategori(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#334155',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              minWidth: '140px'
            }}
          >
            <option value="Semua">Semua Kategori</option>
            {kategoriList.map((kat) => (
              <option key={kat.id} value={kat.nama_kategori}>{kat.nama_kategori}</option>
            ))}
          </select>

          {/* Filter Tanggal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '5px 8px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                color: '#334155'
              }}
              title="Dari Tanggal"
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '5px 8px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                color: '#334155'
              }}
              title="Sampai Tanggal"
            />
          </div>

          {/* Entries per page */}
          <select
            value={entriesPerPage}
            onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#334155',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadMutasi()}
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Muat Ulang Data"
          >
            <RotateCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* 5. MAIN DATA TABLE (GAYA MASTER PRODUK) */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          overflowX: 'auto',
          backgroundColor: '#ffffff'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11.5px',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '10px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '36px', borderRight: '1px solid #cbd5e1' }}>NO</th>
                <th style={{ padding: '8px 10px', width: '130px', borderRight: '1px solid #cbd5e1' }}>TANGGAL & NO BUKTI</th>
                <th style={{ padding: '8px 10px', width: '115px', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>JENIS MUTASI</th>
                <th style={{ padding: '8px 10px', width: '140px', borderRight: '1px solid #cbd5e1' }}>KATEGORI</th>
                <th style={{ padding: '8px 10px', minWidth: '220px', borderRight: '1px solid #cbd5e1' }}>SKU & NAMA BARANG</th>
                <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>JUMLAH</th>
                <th style={{ padding: '8px 10px', width: '150px', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>PERUBAHAN STOK</th>
                <th style={{ padding: '8px 10px', width: '120px', borderRight: '1px solid #cbd5e1' }}>NO REFERENSI</th>
                <th style={{ padding: '8px 10px', width: '130px', borderRight: '1px solid #cbd5e1' }}>PIHAK / TUJUAN</th>
                <th style={{ padding: '8px 10px', width: '100px', borderRight: '1px solid #cbd5e1' }}>PETUGAS</th>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '85px' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <RotateCw size={16} className="animate-spin" color="#0284c7" />
                      <span>Memuat data mutasi barang...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedMutasi.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <Boxes size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#334155' }}>Tidak Ada Data Mutasi Barang</div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                      Belum ada mutasi barang yang sesuai dengan filter atau kata kunci pencarian.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMutasi.map((m, idx) => {
                  const isMasuk = m.jenis_mutasi === 'masuk';
                  const isKeluar = m.jenis_mutasi === 'keluar';
                  const rowNum = (currentPage - 1) * entriesPerPage + idx + 1;

                  return (
                    <tr
                      key={m.id || idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fcfdfd'}
                    >
                      {/* 1. NO */}
                      <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '700', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>
                        {rowNum}
                      </td>

                      {/* 2. TANGGAL & NO BUKTI */}
                      <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                          <Calendar size={11} color="#64748b" />
                          <span>{m.tanggal}</span>
                        </div>
                        <div style={{ marginTop: '2px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            color: isMasuk ? '#0284c7' : isKeluar ? '#b91c1c' : '#b45309',
                            backgroundColor: isMasuk ? '#f0f9ff' : isKeluar ? '#fff1f2' : '#fffbeb',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            border: `1px solid ${isMasuk ? '#bae6fd' : isKeluar ? '#fecdd3' : '#fde68a'}`
                          }}>
                            {m.no_bukti}
                          </span>
                        </div>
                      </td>

                      {/* 3. JENIS MUTASI */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        {isMasuk ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            fontSize: '10px',
                            fontWeight: '800'
                          }}>
                            <ArrowDownRight size={11} /> MASUK
                          </span>
                        ) : isKeluar ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            fontSize: '10px',
                            fontWeight: '800'
                          }}>
                            <ArrowUpRight size={11} /> KELUAR
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            fontSize: '10px',
                            fontWeight: '800'
                          }}>
                            <Clock size={11} /> PENYESUAIAN
                          </span>
                        )}
                      </td>

                      {/* 4. KATEGORI */}
                      <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          color: '#334155',
                          backgroundColor: '#f1f5f9',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {m.kategori || 'Umum'}
                        </span>
                      </td>

                      {/* 5. SKU & NAMA BARANG */}
                      <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '11.5px' }}>
                          {m.nama_produk}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            color: '#0284c7',
                            backgroundColor: '#e0f2fe',
                            padding: '1px 5px',
                            borderRadius: '3px'
                          }}>
                            {m.kode_sku}
                          </span>
                          {m.varian && (
                            <span style={{ fontSize: '10px', color: '#64748b' }}>
                              ({m.varian})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. JUMLAH (QTY) */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        <span style={{
                          fontSize: '12.5px',
                          fontWeight: '900',
                          color: isMasuk ? '#16a34a' : isKeluar ? '#dc2626' : '#d97706'
                        }}>
                          {isMasuk ? `+${m.jumlah}` : isKeluar ? `-${m.jumlah}` : m.jumlah}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '3px' }}>
                          {m.satuan || 'PCS'}
                        </span>
                      </td>

                      {/* 7. PERUBAHAN STOK */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                          <span style={{ color: '#64748b', fontWeight: '600' }}>{m.stok_sebelum}</span>
                          <span style={{ color: '#94a3b8' }}>➔</span>
                          <span style={{ fontWeight: '800', color: '#0f172a', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px' }}>
                            {m.stok_sesudah} {m.satuan || 'PCS'}
                          </span>
                        </div>
                      </td>

                      {/* 8. NO REFERENSI */}
                      <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0' }}>
                        {m.no_referensi ? (
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: '#475569' }}>
                            {m.no_referensi}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* 9. PIHAK / TUJUAN */}
                      <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0', color: '#334155' }}>
                        {m.pihak_terkait ? (
                          <div style={{ fontSize: '11px', fontWeight: '600' }}>{m.pihak_terkait}</div>
                        ) : (
                          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* 10. PETUGAS */}
                      <td style={{ padding: '8px 10px', borderRight: '1px solid #e2e8f0', color: '#475569', fontSize: '11px' }}>
                        {m.petugas || 'Staff Gudang'}
                      </td>

                      {/* 11. AKSI */}
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(m)}
                            title="Lihat Rincian Bukti Mutasi"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#0284c7',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Eye size={12} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            title="Edit Data Mutasi"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#d97706',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit3 size={12} />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => handleDelete(m)}
                            title="Hapus Catatan Mutasi"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. FOOTER & PAGINATION (GAYA MASTER PRODUK) */}
        <div style={{
          padding: '8px 14px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #cbd5e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11.5px',
          color: '#64748b',
          marginTop: '6px',
          borderRadius: '6px'
        }}>
          <div>
            Menampilkan <b>{mutasiList.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> sampai <b>{Math.min(currentPage * entriesPerPage, mutasiList.length)}</b> dari <b>{mutasiList.length}</b> total mutasi barang
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{
                height: '26px',
                padding: '0 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                color: currentPage <= 1 ? '#94a3b8' : '#334155',
                fontSize: '11px',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Sebelumnya
            </button>
            <span style={{ padding: '0 6px', fontWeight: '800', color: '#0f172a' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{
                height: '26px',
                padding: '0 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#334155',
                fontSize: '11px',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Selanjutnya
            </button>
          </div>
        </div>

      </div>

      {/* ── MODAL FULLSCREEN: TAMBAH / EDIT MUTASI BARANG ── */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0f172a',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header Fullscreen Compact (42px) */}
          <div style={{
            height: '42px',
            padding: '0 16px',
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: formData.jenis_mutasi === 'masuk' ? 'rgba(16, 185, 129, 0.2)' : formData.jenis_mutasi === 'keluar' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: formData.jenis_mutasi === 'masuk' ? '1px solid rgba(16, 185, 129, 0.4)' : formData.jenis_mutasi === 'keluar' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                color: formData.jenis_mutasi === 'masuk' ? '#34d399' : formData.jenis_mutasi === 'keluar' ? '#f87171' : '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Boxes size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                {editingId
                  ? 'Edit Data Mutasi Barang'
                  : (formData.jenis_mutasi === 'masuk' ? 'Input Mutasi Barang Masuk (BM)' : formData.jenis_mutasi === 'keluar' ? 'Input Mutasi Barang Keluar (BK)' : 'Input Penyesuaian Stok (ADJ)')}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Form Pencatatan Arus Stok Gudang & Pembukuan Mutasi ({activeCompany?.code || 'RSG'})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '5px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#f87171';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Form Body Fullscreen */}
          <form onSubmit={handleSaveMutasi} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              
              {/* 1. Toggle Jenis Mutasi */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '12px 16px',
                marginBottom: '14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    Pilih Jenis Mutasi Barang <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Mode: <b style={{ color: formData.jenis_mutasi === 'masuk' ? '#047857' : formData.jenis_mutasi === 'keluar' ? '#b91c1c' : '#b45309' }}>
                      {formData.jenis_mutasi === 'masuk' ? 'Penambahan Stok (+)' : formData.jenis_mutasi === 'keluar' ? 'Pengurangan Stok (-)' : 'Koreksi Fisik (Opname)'}
                    </b>
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleSwitchJenisMutasi('masuk')}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1.5px solid ${formData.jenis_mutasi === 'masuk' ? '#059669' : '#cbd5e1'}`,
                      backgroundColor: formData.jenis_mutasi === 'masuk' ? '#ecfdf5' : '#ffffff',
                      color: formData.jenis_mutasi === 'masuk' ? '#047857' : '#64748b',
                      fontWeight: '800',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ArrowDownRight size={17} />
                    <span>Barang Masuk (BM)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchJenisMutasi('keluar')}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1.5px solid ${formData.jenis_mutasi === 'keluar' ? '#dc2626' : '#cbd5e1'}`,
                      backgroundColor: formData.jenis_mutasi === 'keluar' ? '#fef2f2' : '#ffffff',
                      color: formData.jenis_mutasi === 'keluar' ? '#b91c1c' : '#64748b',
                      fontWeight: '800',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <ArrowUpRight size={17} />
                    <span>Barang Keluar (BK)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchJenisMutasi('penyesuaian')}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: `1.5px solid ${formData.jenis_mutasi === 'penyesuaian' ? '#d97706' : '#cbd5e1'}`,
                      backgroundColor: formData.jenis_mutasi === 'penyesuaian' ? '#fffbeb' : '#ffffff',
                      color: formData.jenis_mutasi === 'penyesuaian' ? '#b45309' : '#64748b',
                      fontWeight: '800',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Clock size={17} />
                    <span>Penyesuaian Opname (ADJ)</span>
                  </button>
                </div>
              </div>

              {/* 2. Grid Dua Kolom Form Info Mutasi & Produk */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                
                {/* CARD KIRI: 1. KLASIFIKASI & DOKUMEN MUTASI */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="#0284c7" />
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                        1. KLASIFIKASI & DOKUMEN MUTASI
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: formData.jenis_mutasi === 'masuk' ? '#ecfdf5' : formData.jenis_mutasi === 'keluar' ? '#fef2f2' : '#fffbeb',
                      color: formData.jenis_mutasi === 'masuk' ? '#047857' : formData.jenis_mutasi === 'keluar' ? '#b91c1c' : '#b45309',
                      textTransform: 'uppercase'
                    }}>
                      {formData.jenis_mutasi === 'masuk' ? 'Penerimaan Gudang' : formData.jenis_mutasi === 'keluar' ? 'Pengeluaran Gudang' : 'Koreksi Fisik'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Tanggal Transaksi <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.tanggal}
                        onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontWeight: '600',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                          No. Bukti Mutasi <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, no_bukti: generateNoBukti(formData.jenis_mutasi) })}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#0284c7',
                            fontSize: '10px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Auto Generate
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.no_bukti}
                        onChange={(e) => setFormData({ ...formData, no_bukti: e.target.value })}
                        placeholder="Contoh: BM-20261031-001"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          color: '#0369a1',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Kategori Mutasi dengan SearchableSelect */}
                  <SearchableSelect
                    label="Kategori Mutasi"
                    required
                    value={formData.kategori}
                    onChange={(val) => setFormData(prev => ({ ...prev, kategori: val }))}
                    options={kategoriOptions}
                    placeholder="Pilih atau cari kategori mutasi..."
                    rightAction={(
                      <button
                        type="button"
                        onClick={() => setIsKategoriModalOpen(true)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#0284c7',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Settings size={12} />
                        <span>+ Tambah / Edit Kategori</span>
                      </button>
                    )}
                    renderItem={(opt, isSelected) => (
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: isSelected ? '700' : '500' }}>
                          {opt.label}
                        </span>
                        {opt.jenis && opt.jenis !== 'semua' && (
                          <span style={{
                            fontSize: '9.5px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: opt.jenis === 'masuk' ? '#ecfdf5' : '#fef2f2',
                            color: opt.jenis === 'masuk' ? '#047857' : '#b91c1c',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>
                            {opt.jenis}
                          </span>
                        )}
                      </div>
                    )}
                  />

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      No. Referensi (SPK / Faktur / Resi / PO)
                    </label>
                    <input
                      type="text"
                      value={formData.no_referensi}
                      onChange={(e) => setFormData({ ...formData, no_referensi: e.target.value })}
                      placeholder="Contoh: SPK-KE9A-01 / OFF-20261030-KE9A"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Pihak Terkait / Rekanan / Sumber / Tujuan
                    </label>
                    <input
                      type="text"
                      value={formData.pihak_terkait}
                      onChange={(e) => setFormData({ ...formData, pihak_terkait: e.target.value })}
                      placeholder="Contoh: Penjahit Makloon Mas Deni / Pembeli Offline / Vendor Kain"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Petugas / Penanggung Jawab
                    </label>
                    <input
                      type="text"
                      value={formData.petugas}
                      onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                      placeholder="Nama staff gudang..."
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* CARD KANAN: 2. PRODUK MASTER & ARUS STOK FISIK */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Boxes size={16} color="#059669" />
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                        2. PRODUK MASTER & ESTIMASI ARUS STOK FISIK
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7'
                    }}>
                      GUDANG UTAMA
                    </span>
                  </div>

                  {/* Pilih Produk dari Master dengan SearchableSelect */}
                  <SearchableSelect
                    label="Pilih Produk dari Master"
                    required
                    value={formData.kode_sku}
                    onChange={(val) => handleSelectProduct(val)}
                    options={productOptions}
                    placeholder={`-- Cari dari ${productOptions.length} Produk Master (Ketik SKU, Nama, Ukuran...) --`}
                    renderItem={(opt, isSelected) => (
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            fontSize: '11px',
                            color: '#0284c7',
                            backgroundColor: '#e0f2fe',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginRight: '6px'
                          }}>
                            {opt.sku}
                          </span>
                          <span style={{ fontSize: '12px', color: '#1e293b' }}>
                            {opt.nama_produk}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          color: Number(opt.stok) > 0 ? '#16a34a' : '#ef4444',
                          backgroundColor: Number(opt.stok) > 0 ? '#dcfce7' : '#fee2e2',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}>
                          Stok: {opt.stok} {opt.satuan}
                        </span>
                      </div>
                    )}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Nama Produk
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nama_produk}
                        onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
                        placeholder="Nama produk..."
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Satuan
                      </label>
                      <input
                        type="text"
                        value={formData.satuan}
                        onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Input Jumlah & Flow Perubahan Stok */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '12px 14px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '14px', alignItems: 'center' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: formData.jenis_mutasi === 'masuk' ? '#15803d' : '#b91c1c', marginBottom: '4px' }}>
                          Jumlah Qty ({formData.jenis_mutasi.toUpperCase()}) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.jumlah}
                          onChange={(e) => handleUpdateQty(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: `2px solid ${formData.jenis_mutasi === 'masuk' ? '#16a34a' : '#dc2626'}`,
                            fontSize: '16px',
                            fontWeight: '800',
                            textAlign: 'center',
                            backgroundColor: '#ffffff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                          Estimasi Arus Stok Fisik:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <div style={{ textAlign: 'center', padding: '4px 10px', backgroundColor: '#ffffff', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '9.5px', color: '#64748b' }}>Sebelum</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>{formData.stok_sebelum}</div>
                          </div>
                          <span style={{ fontSize: '16px', color: '#94a3b8' }}>➔</span>
                          <div style={{ textAlign: 'center', padding: '4px 10px', backgroundColor: '#ffffff', borderRadius: '5px', border: `1.5px solid ${formData.jenis_mutasi === 'masuk' ? '#16a34a' : '#dc2626'}` }}>
                            <div style={{ fontSize: '9.5px', color: formData.jenis_mutasi === 'masuk' ? '#16a34a' : '#dc2626' }}>Sesudah</div>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: formData.jenis_mutasi === 'masuk' ? '#15803d' : '#b91c1c' }}>
                              {formData.stok_sesudah} {formData.satuan}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      borderRadius: '5px',
                      backgroundColor: formData.jenis_mutasi === 'masuk' ? '#ecfdf5' : '#fef2f2',
                      fontSize: '11px',
                      color: formData.jenis_mutasi === 'masuk' ? '#065f46' : '#991b1b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <CheckCircle2 size={13} />
                      <span>
                        Transaksi ini akan <b>{formData.jenis_mutasi === 'masuk' ? 'menambah (+)' : 'mengurangi (-)'}</b> stok fisik produk sebanyak <b>{formData.jumlah} {formData.satuan}</b>.
                      </span>
                    </div>
                  </div>

                  {/* Keterangan Rincian Mutasi */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Keterangan / Deskripsi Rincian Mutasi
                    </label>
                    <textarea
                      rows={2}
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      placeholder="Catatan penerimaan, kendala, hasil inspeksi QC, atau instruksi mutasi..."
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky Fullscreen Footer */}
            <div style={{
              height: '56px',
              padding: '0 24px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
            }}>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: formData.jenis_mutasi === 'masuk' ? '#059669' : formData.jenis_mutasi === 'keluar' ? '#dc2626' : '#d97706',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                <Save size={15} />
                <span>{isSaving ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan Mutasi' : 'Simpan Mutasi Barang')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL FULLSCREEN: DETAIL / VOUCHER BUKTI MUTASI BARANG ── */}
      {isDetailModalOpen && selectedMutasi && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0f172a',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header Fullscreen Compact (42px) */}
          <div style={{
            height: '42px',
            padding: '0 16px',
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: selectedMutasi.jenis_mutasi === 'masuk' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: selectedMutasi.jenis_mutasi === 'masuk' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                color: selectedMutasi.jenis_mutasi === 'masuk' ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Rincian Bukti Mutasi: {selectedMutasi.no_bukti}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {selectedMutasi.jenis_mutasi === 'masuk' ? 'Barang Masuk (BM)' : selectedMutasi.jenis_mutasi === 'keluar' ? 'Barang Keluar (BK)' : 'Penyesuaian Stok'} — {selectedMutasi.kategori}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedMutasi);
                }}
                style={{
                  height: '26px',
                  padding: '0 10px',
                  borderRadius: '5px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Edit3 size={12} />
                <span>Edit Mutasi</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '5px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body Detail Fullscreen */}
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f1f5f9', padding: '16px 24px' }}>
            
            {/* Hero Voucher Card */}
            <div style={{
              background: selectedMutasi.jenis_mutasi === 'masuk'
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : selectedMutasi.jenis_mutasi === 'keluar'
                  ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                  : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              borderRadius: '8px',
              padding: '18px 24px',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    padding: '2px 10px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    textTransform: 'uppercase'
                  }}>
                    BUKTI {selectedMutasi.jenis_mutasi === 'masuk' ? 'BARANG MASUK (BBM)' : selectedMutasi.jenis_mutasi === 'keluar' ? 'BARANG KELUAR (BBK)' : 'PENYESUAIAN STOK'}
                  </span>
                  <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '6px', fontFamily: 'monospace' }}>
                    {selectedMutasi.jenis_mutasi === 'masuk' ? `+${selectedMutasi.jumlah}` : `-${selectedMutasi.jumlah}`} {selectedMutasi.satuan || 'PCS'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>Nomor Bukti Mutasi:</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'monospace' }}>
                    {selectedMutasi.no_bukti}
                  </div>
                  <div style={{ fontSize: '10.5px', opacity: 0.85, marginTop: '2px' }}>
                    Perusahaan: <b>{activeCompany?.code || 'RSG'}</b>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', opacity: 0.85 }}>TANGGAL TRANSAKSI</div>
                  <div style={{ fontSize: '13px', fontWeight: '800' }}>{selectedMutasi.tanggal}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', opacity: 0.85 }}>KATEGORI MUTASI</div>
                  <div style={{ fontSize: '13px', fontWeight: '800' }}>{selectedMutasi.kategori}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', opacity: 0.85 }}>PIHAK / REKANAN</div>
                  <div style={{ fontSize: '13px', fontWeight: '800' }}>{selectedMutasi.pihak_terkait || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', opacity: 0.85 }}>STATUS TRANSAKSI</div>
                  <div style={{ fontSize: '12.5px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    <span>Tercatat & Terverifikasi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rincian Produk Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '16px 20px',
              marginBottom: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Boxes size={16} color="#0284c7" />
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                    RINCIAN BARANG YANG DIMUTASI
                  </h4>
                </div>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                  SKU: {selectedMutasi.kode_sku}
                </span>
              </div>

              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
                {selectedMutasi.nama_produk}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>No. Referensi (SPK / Faktur):</div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0284c7', fontFamily: 'monospace' }}>
                    {selectedMutasi.no_referensi || '-'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>Perubahan Stok Fisik:</div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>
                    {selectedMutasi.stok_sebelum} ➔ <span style={{ color: selectedMutasi.jenis_mutasi === 'masuk' ? '#16a34a' : '#dc2626', fontWeight: '900' }}>{selectedMutasi.stok_sesudah}</span> {selectedMutasi.satuan || 'PCS'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>Petugas / Penanggung Jawab:</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                    {selectedMutasi.petugas || 'Staff Gudang'}
                  </div>
                </div>
              </div>
            </div>

            {/* Keterangan & Catatan Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <FileText size={15} color="#64748b" />
                <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                  KETERANGAN & CATATAN TRANSAKSI
                </h4>
              </div>
              <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.5, backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {selectedMutasi.keterangan || 'Tidak ada catatan atau instruksi khusus untuk transaksi mutasi ini.'}
              </div>
            </div>

          </div>

          {/* Sticky Fullscreen Detail Footer */}
          <div style={{
            height: '56px',
            padding: '0 24px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
          }}>
            <button
              type="button"
              onClick={() => setIsDetailModalOpen(false)}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#64748b',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Kembali ke Daftar Mutasi
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handlePrintBukti(selectedMutasi)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: '1px solid #0f172a',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={14} />
                <span>Cetak Bukti Mutasi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedMutasi);
                }}
                style={{
                  padding: '8px 22px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Edit3 size={14} />
                <span>Edit Mutasi Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KELOLA KATEGORI MUTASI BARANG ── */}
      {isKategoriModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '12px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              padding: '12px 18px',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  Kelola Kategori Mutasi Barang
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKategoriModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 18px' }}>
              {/* Form Input / Edit Kategori */}
              <form onSubmit={handleSaveKategori} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input
                  type="text"
                  required
                  placeholder="Nama kategori mutasi baru..."
                  value={kategoriForm.nama_kategori}
                  onChange={(e) => setKategoriForm({ ...kategoriForm, nama_kategori: e.target.value })}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px'
                  }}
                />
                <select
                  value={kategoriForm.jenis_mutasi}
                  onChange={(e) => setKategoriForm({ ...kategoriForm, jenis_mutasi: e.target.value })}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px'
                  }}
                >
                  <option value="semua">Semua Jenis</option>
                  <option value="masuk">Barang Masuk</option>
                  <option value="keluar">Barang Keluar</option>
                </select>
                <button
                  type="submit"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {editingKategoriId ? 'Update' : '+ Tambah'}
                </button>
                {editingKategoriId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKategoriId(null);
                      setKategoriForm({ id: null, nama_kategori: '', jenis_mutasi: 'semua' });
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '11.5px',
                      cursor: 'pointer'
                    }}
                  >
                    Batal
                  </button>
                )}
              </form>

              {/* Tabel Daftar Kategori */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: '800', fontSize: '10.5px' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '30px' }}>No</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Nama Kategori</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '110px' }}>Jenis</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', width: '70px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kategoriList.map((k, idx) => (
                      <tr key={k.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 10px', fontWeight: '700', color: '#0f172a' }}>{k.nama_kategori}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: '800',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: k.jenis_mutasi === 'masuk' ? '#dcfce7' : k.jenis_mutasi === 'keluar' ? '#fee2e2' : '#f1f5f9',
                            color: k.jenis_mutasi === 'masuk' ? '#15803d' : k.jenis_mutasi === 'keluar' ? '#b91c1c' : '#475569'
                          }}>
                            {k.jenis_mutasi.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingKategoriId(k.id);
                                setKategoriForm({ id: k.id, nama_kategori: k.nama_kategori, jenis_mutasi: k.jenis_mutasi || 'semua' });
                              }}
                              style={{ border: 'none', background: 'transparent', color: '#d97706', cursor: 'pointer' }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKategori(k.id, k.nama_kategori)}
                              style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

