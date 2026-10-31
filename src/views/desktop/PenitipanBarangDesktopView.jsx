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
  ShoppingBag,
  TrendingUp,
  Warehouse,
  User,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  ArrowRight,
  Send,
  HelpCircle
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

function formatRp(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
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
              placeholder="Ketik untuk mencari produk..."
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
                Tidak ada data produk yang cocok
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

export default function PenitipanBarangDesktopView() {
  const [activeCompany] = useState(getActiveCompany);
  const [penitipanList, setPenitipanList] = useState([]);
  const [penitipFilterOptions, setPenitipFilterOptions] = useState([]);
  const [summary, setSummary] = useState({
    total_transaksi: 0,
    stok_di_gudang: 0,
    rp_di_gudang: 0,
    stok_terjual: 0,
    rp_terjual_modal: 0,
    rp_terjual_omset: 0,
    sisa_stok: 0,
    rp_sisa_stok: 0,
    laba_kotor: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua'); // 'Semua' | 'Masih Ada Stok' | 'Habis' | 'Aktif'
  const [penitipFilter, setPenitipFilter] = useState('Semua');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Master Data Produk
  const [masterProdukList, setMasterProdukList] = useState([]);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isJualModalOpen, setIsJualModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Selected item for action
  const [editingId, setEditingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Quick Sell Modal state
  const [jualQty, setJualQty] = useState(1);
  const [jualKeterangan, setJualKeterangan] = useState('');

  // Form State
  const initialForm = {
    tanggal: new Date().toISOString().slice(0, 10),
    no_titipan: '',
    nama_penitip: '',
    kontak_penitip: '',
    produk_id: null,
    kode_sku: '',
    nama_produk: '',
    varian: '',
    satuan: 'PCS',
    harga_titip: 0,
    harga_jual: 0,
    qty_titip: 10,
    qty_terjual: 0,
    qty_retur: 0,
    status: 'Aktif',
    lokasi_rak: 'Gudang Konsinyasi',
    petugas: 'Staff Gudang',
    keterangan: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Auto generate no bukti titipan
  const generateNoTitipan = () => {
    const ymd = (formData.tanggal || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TTP-${ymd}-${rand}`;
  };

  // Load Data Penitipan
  const loadPenitipan = async () => {
    setIsLoading(true);
    try {
      const company = activeCompany?.code || 'RSG';
      const params = new URLSearchParams({
        company,
        search,
        status: statusFilter,
        penitip: penitipFilter
      });

      const res = await fetch(`/api/penitipan-barang?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setPenitipanList(json.data);
        if (json.summary) setSummary(json.summary);
        if (json.penitip_list) setPenitipFilterOptions(json.penitip_list);
      } else {
        setPenitipanList([]);
      }
    } catch (err) {
      toastError(`Gagal memuat data penitipan barang: ${err.message}`);
      setPenitipanList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Master Produk untuk referensi autocomplete SKU & nama produk
  const loadMasterProduk = async () => {
    try {
      const res = await fetch('/api/marketplace/master?limit=1000');
      const json = await res.json();
      if (res.ok && json.data) {
        setMasterProdukList(json.data);
      }
    } catch (_) {
      setMasterProdukList([]);
    }
  };

  useEffect(() => {
    loadPenitipan();
  }, [statusFilter, penitipFilter, activeCompany?.code]);

  useEffect(() => {
    loadMasterProduk();
  }, [activeCompany?.code]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPenitipan();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Formatted Product Options
  const productOptions = useMemo(() => {
    return [...masterProdukList].sort(compareProducts).map(p => ({
      value: p.sku,
      label: `${p.sku} — ${p.nama_produk}`,
      sku: p.sku,
      nama_produk: p.nama_produk,
      satuan: p.satuan || 'PCS',
      harga_jual: p.harga_jual || p.harga || 0,
      harga_titip: p.harga_modal || p.hpp || Math.round((p.harga_jual || p.harga || 0) * 0.75),
      kategori: p.kategori_nama || p.kategori || ''
    }));
  }, [masterProdukList]);

  // Handler Pilih Produk dari Master
  const handleSelectProduct = (skuOrId) => {
    const prod = masterProdukList.find(p => String(p.id) === String(skuOrId) || p.sku === skuOrId);
    if (prod) {
      const hJual = Number(prod.harga_jual || prod.harga || 0);
      const hTitip = Number(prod.harga_modal || prod.hpp || Math.round(hJual * 0.75));

      setFormData(prev => ({
        ...prev,
        produk_id: prod.id,
        kode_sku: prod.sku || '',
        nama_produk: prod.nama_produk || '',
        satuan: prod.satuan || 'PCS',
        harga_titip: hTitip,
        harga_jual: hJual
      }));
    }
  };

  // Open Form Tambah
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      ...initialForm,
      no_titipan: generateNoTitipan()
    });
    setIsFormModalOpen(true);
  };

  // Open Form Edit
  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      ...item,
      harga_titip: Number(item.harga_titip || 0),
      harga_jual: Number(item.harga_jual || 0),
      qty_titip: Number(item.qty_titip || 0),
      qty_terjual: Number(item.qty_terjual || 0),
      qty_retur: Number(item.qty_retur || 0)
    });
    setIsFormModalOpen(true);
  };

  // Open Detail
  const handleOpenDetail = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // Open Quick Sell Modal
  const handleOpenQuickSell = (item) => {
    setSelectedItem(item);
    setJualQty(1);
    setJualKeterangan('');
    setIsJualModalOpen(true);
  };

  // Save Quick Sell
  const handleSaveQuickSell = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedItem) return;

    const sisa = Number(selectedItem.sisa_stok || 0);
    const qty = Number(jualQty);
    if (qty <= 0) {
      toastError('Jumlah terjual harus minimal 1!');
      return;
    }
    if (qty > sisa) {
      toastError(`Jumlah terjual (${qty}) melebihi sisa stok yang ada (${sisa})!`);
      return;
    }

    try {
      const res = await fetch(`/api/penitipan-barang/${selectedItem.id}/terjual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty_terjual: qty, keterangan: jualKeterangan })
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Gagal mencatat penjualan');

      toastSuccess(`Berhasil mencatat penjualan ${qty} ${selectedItem.satuan || 'PCS'}!`);
      setIsJualModalOpen(false);
      loadPenitipan();
    } catch (err) {
      toastError(err.message);
    }
  };

  // Delete Penitipan
  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      'Hapus Data Penitipan?',
      `Hapus data penitipan "${item.nama_produk}" dari "${item.nama_penitip}"? Data yang sudah dihapus tidak dapat dikembalikan.`,
      'Ya, Hapus Data',
      'Batal'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/penitipan-barang/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Gagal menghapus');

      toastSuccess('Data penitipan berhasil dihapus.');
      loadPenitipan();
    } catch (err) {
      toastError(err.message);
    }
  };

  // Save Form (Create / Update)
  const handleSavePenitipan = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formData.nama_penitip?.trim()) {
      toastError('Nama penitip / mitra wajib diisi!');
      return;
    }
    if (!formData.nama_produk?.trim()) {
      toastError('Nama produk titipan wajib diisi!');
      return;
    }
    if (Number(formData.qty_titip) <= 0) {
      toastError('Jumlah stok titipan harus lebih dari 0!');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingId ? `/api/penitipan-barang/${editingId}` : '/api/penitipan-barang';
      const method = editingId ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        kode_perusahaan: activeCompany?.code || 'RSG',
        harga_titip: Number(formData.harga_titip || 0),
        harga_jual: Number(formData.harga_jual || 0),
        qty_titip: Number(formData.qty_titip || 0),
        qty_terjual: Number(formData.qty_terjual || 0),
        qty_retur: Number(formData.qty_retur || 0)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.message || 'Gagal menyimpan data penitipan');

      toastSuccess(json.message || 'Data penitipan barang berhasil disimpan!');
      setIsFormModalOpen(false);
      loadPenitipan();
    } catch (err) {
      toastError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculations for Realtime Form Preview
  const previewSisa = Math.max(0, Number(formData.qty_titip || 0) - Number(formData.qty_terjual || 0) - Number(formData.qty_retur || 0));
  const previewRpTitip = Number(formData.qty_titip || 0) * Number(formData.harga_titip || 0);
  const previewRpTerjualModal = Number(formData.qty_terjual || 0) * Number(formData.harga_titip || 0);
  const previewRpTerjualOmset = Number(formData.qty_terjual || 0) * Number(formData.harga_jual || 0);
  const previewRpSisaModal = previewSisa * Number(formData.harga_titip || 0);

  // Pagination Slice
  const totalPages = Math.ceil(penitipanList.length / entriesPerPage) || 1;
  const paginatedList = penitipanList.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

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

        {/* 1. HEADER TITLE & SINGLE ACTION BUTTON */}
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
          marginBottom: '8px',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.22)'
        }}>
          {/* Title & Subtitle */}
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
              <Warehouse size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  Penitipan Barang (Konsinyasi Mitra & Vendor)
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
                Monitoring stok barang titipan di gudang, barang laku terjual, sisa stok fisik, dan nilai rupiah aset konsinyasi
              </p>
            </div>
          </div>

          {/* Action Button: Cukup Satu Tombol Sesuai Permintaan User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleOpenAdd}
              style={{
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 16px',
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
              <span>+ Catat Penitipan Barang</span>
            </button>
          </div>
        </div>

        {/* 2. STAT SUMMARY CARDS: STOK DI GUDANG, TERJUAL, SISA STOK & RUPIAHNYA */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {/* Card 1: Stok di Gudang & Nilai Rp */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                1. Stok Masuk di Gudang
              </div>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Boxes size={15} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <div style={{ fontSize: '19px', fontWeight: '900', color: '#0f172a' }}>
                {Number(summary.stok_di_gudang || 0).toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>PCS Titipan</div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', marginTop: '2px' }}>
              Nilai: {formatRp(summary.rp_di_gudang)}
            </div>
            <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
              Total modal seluruh barang konsinyasi masuk
            </div>
          </div>

          {/* Card 2: Stok Terjual & Nilai Rp */}
          <div style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
                2. Stok yang Terjual
              </div>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={15} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <div style={{ fontSize: '19px', fontWeight: '900', color: '#15803d' }}>
                {Number(summary.stok_terjual || 0).toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534' }}>PCS Laku</div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>
              Omset: {formatRp(summary.rp_terjual_omset)}
            </div>
            <div style={{ fontSize: '9.5px', color: '#166534', marginTop: '2px' }}>
              Modal Titipan Terjual: <b>{formatRp(summary.rp_terjual_modal)}</b>
            </div>
          </div>

          {/* Card 3: Sisa Stok di Gudang & Nilai Rp */}
          <div style={{
            backgroundColor: '#f5f3ff',
            borderRadius: '8px',
            border: '1px solid #ddd6fe',
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#5b21b6', textTransform: 'uppercase' }}>
                3. Sisa Stok di Gudang
              </div>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Warehouse size={15} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <div style={{ fontSize: '19px', fontWeight: '900', color: '#6d28d9' }}>
                {Number(summary.sisa_stok || 0).toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#5b21b6' }}>PCS Fisik</div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: '900', color: '#6d28d9', marginTop: '2px' }}>
              Nilai Aset: {formatRp(summary.rp_sisa_stok)}
            </div>
            <div style={{ fontSize: '9.5px', color: '#5b21b6', marginTop: '2px' }}>
              Nilai rupiah sisa barang yang masih tersimpan
            </div>
          </div>

          {/* Card 4: Estimasi Margin / Keuntungan Bersih Toko */}
          <div style={{
            backgroundColor: '#ecfdf5',
            borderRadius: '8px',
            border: '1px solid #a7f3d0',
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#065f46', textTransform: 'uppercase' }}>
                4. Margin / Laba Penjualan
              </div>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={15} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <div style={{ fontSize: '19px', fontWeight: '900', color: '#047857' }}>
                {formatRp(summary.laba_kotor)}
              </div>
            </div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#065f46', marginTop: '2px' }}>
              {summary.rp_terjual_omset > 0 
                ? `Margin Keuntungan: ${Math.round((summary.laba_kotor / summary.rp_terjual_omset) * 100)}%` 
                : 'Belum ada transaksi penjualan'}
            </div>
            <div style={{ fontSize: '9.5px', color: '#047857', marginTop: '2px' }}>
              Selisih omset jual dikurangi kewajiban bayar ke penitip
            </div>
          </div>
        </div>

        {/* 3. FILTER TABS & SEARCH BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setStatusFilter('Semua'); setCurrentPage(1); }}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '5px',
                border: statusFilter === 'Semua' ? '1px solid #0284c7' : '1px solid #cbd5e1',
                backgroundColor: statusFilter === 'Semua' ? '#0284c7' : '#ffffff',
                color: statusFilter === 'Semua' ? '#ffffff' : '#475569',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Semua ({summary.total_transaksi || penitipanList.length})
            </button>

            <button
              type="button"
              onClick={() => { setStatusFilter('Masih Ada Stok'); setCurrentPage(1); }}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '5px',
                border: statusFilter === 'Masih Ada Stok' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                backgroundColor: statusFilter === 'Masih Ada Stok' ? '#16a34a' : '#ffffff',
                color: statusFilter === 'Masih Ada Stok' ? '#ffffff' : '#475569',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Masih Ada Stok
            </button>

            <button
              type="button"
              onClick={() => { setStatusFilter('Habis'); setCurrentPage(1); }}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '5px',
                border: statusFilter === 'Habis' ? '1px solid #dc2626' : '1px solid #cbd5e1',
                backgroundColor: statusFilter === 'Habis' ? '#dc2626' : '#ffffff',
                color: statusFilter === 'Habis' ? '#ffffff' : '#475569',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Habis Terjual
            </button>
          </div>

          {/* Filter Penitip & Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {penitipFilterOptions.length > 0 && (
              <select
                value={penitipFilter}
                onChange={(e) => { setPenitipFilter(e.target.value); setCurrentPage(1); }}
                style={{
                  height: '28px',
                  padding: '0 8px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px',
                  color: '#334155',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="Semua">Semua Mitra Penitip</option>
                {penitipFilterOptions.map((p, idx) => (
                  <option key={idx} value={p}>{p}</option>
                ))}
              </select>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '5px',
              padding: '0 8px',
              height: '28px'
            }}>
              <Search size={13} color="#64748b" />
              <input
                type="text"
                placeholder="Cari penitip, produk, no bukti..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  paddingLeft: '6px',
                  fontSize: '11.5px',
                  color: '#0f172a',
                  width: '180px'
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={loadPenitipan}
              title="Refresh Data"
              style={{
                height: '28px',
                padding: '0 8px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '700'
              }}
            >
              <RotateCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 4. TABEL PENITIPAN BARANG */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '7px',
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1.5px solid #cbd5e1',
                color: '#334155',
                fontSize: '10.5px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.01em'
              }}>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '30px' }}>No</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '130px' }}>No. Titipan & Tgl</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '150px' }}>Mitra / Penitip</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '200px' }}>Produk Titipan</th>
                <th style={{ padding: '8px 8px', textAlign: 'right', width: '120px' }}>Harga Titip / Jual</th>
                <th style={{ padding: '8px 8px', textAlign: 'center', width: '130px', backgroundColor: '#f0f9ff' }}>
                  Stok Masuk (Rp)
                </th>
                <th style={{ padding: '8px 8px', textAlign: 'center', width: '130px', backgroundColor: '#f0fdf4' }}>
                  Terjual (Rp)
                </th>
                <th style={{ padding: '8px 8px', textAlign: 'center', width: '140px', backgroundColor: '#f5f3ff' }}>
                  Sisa Stok (Rp)
                </th>
                <th style={{ padding: '8px 8px', textAlign: 'center', width: '120px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <RotateCw size={16} className="animate-spin" />
                      <span>Memuat data penitipan barang...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '35px', textAlign: 'center', color: '#94a3b8' }}>
                    <Warehouse size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                      Belum ada data penitipan barang
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '3px' }}>
                      Klik tombol <b>"+ Catat Penitipan Barang"</b> untuk mencatat barang konsinyasi baru.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const sisa = Number(item.sisa_stok || 0);
                  const isHabis = sisa <= 0;

                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fcfdfd'}
                    >
                      {/* No */}
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>
                        {(currentPage - 1) * entriesPerPage + idx + 1}
                      </td>

                      {/* No Titipan & Tgl */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0369a1', fontSize: '11px' }}>
                          {item.no_titipan}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                          <Calendar size={10} />
                          <span>{item.tanggal}</span>
                        </div>
                      </td>

                      {/* Mitra / Penitip */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>
                          {item.nama_penitip}
                        </div>
                        {item.kontak_penitip && (
                          <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                            <Phone size={10} />
                            <span>{item.kontak_penitip}</span>
                          </div>
                        )}
                      </td>

                      {/* Produk Titipan */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '9.5px',
                            fontWeight: '800',
                            backgroundColor: '#e0f2fe',
                            color: '#0284c7',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            flexShrink: 0
                          }}>
                            {item.kode_sku}
                          </span>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>
                            {item.nama_produk}
                          </span>
                        </div>
                        {item.varian && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            Varian: {item.varian}
                          </div>
                        )}
                        {item.lokasi_rak && (
                          <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '1px' }}>
                            Lokasi: {item.lokasi_rak}
                          </div>
                        )}
                      </td>

                      {/* Harga Titip & Jual */}
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
                          {formatRp(item.harga_titip)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>
                          Jual: {formatRp(item.harga_jual)}
                        </div>
                      </td>

                      {/* Stok di Gudang */}
                      <td style={{ padding: '8px 8px', textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#0369a1' }}>
                          {item.qty_titip} <span style={{ fontSize: '10px', fontWeight: '700' }}>{item.satuan}</span>
                        </div>
                        <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0284c7', marginTop: '1px' }}>
                          {formatRp(item.rp_total_titip)}
                        </div>
                      </td>

                      {/* Stok yang Terjual */}
                      <td style={{ padding: '8px 8px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                        <div style={{ fontSize: '13px', fontWeight: '900', color: '#15803d' }}>
                          {item.qty_terjual} <span style={{ fontSize: '10px', fontWeight: '700' }}>{item.satuan}</span>
                        </div>
                        <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#16a34a', marginTop: '1px' }}>
                          {formatRp(item.rp_terjual_omset)}
                        </div>
                      </td>

                      {/* Sisa Stok di Gudang */}
                      <td style={{ padding: '8px 8px', textAlign: 'center', backgroundColor: '#f5f3ff' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: isHabis ? '#fee2e2' : '#ede9fe',
                          color: isHabis ? '#b91c1c' : '#6d28d9',
                          fontWeight: '900',
                          fontSize: '12px'
                        }}>
                          <span>{sisa} {item.satuan}</span>
                          {isHabis && <span style={{ fontSize: '9px', fontWeight: '800' }}>(HABIS)</span>}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#6d28d9', marginTop: '2px' }}>
                          {formatRp(item.rp_sisa_stok_modal)}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {/* Tombol Catat Terjual Cepat */}
                          {!isHabis && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickSell(item)}
                              title="Catat Penjualan / Laku Terjual"
                              style={{
                                padding: '4px 7px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                fontWeight: '800'
                              }}
                            >
                              <ShoppingBag size={11} />
                              <span>Laku</span>
                            </button>
                          )}

                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            title="Lihat Rincian Penitipan"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#0284c7',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={12} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data Penitipan"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#d97706',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={12} />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            title="Hapus Data"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#dc2626',
                              cursor: 'pointer'
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

        {/* 5. FOOTER PAGINATION */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <b>{penitipanList.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> - <b>{Math.min(currentPage * entriesPerPage, penitipanList.length)}</b> dari <b>{penitipanList.length}</b> data penitipan
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                color: currentPage <= 1 ? '#94a3b8' : '#334155',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: '700'
              }}
            >
              Sebelumnya
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#334155',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: '700'
              }}
            >
              Selanjutnya
            </button>
          </div>
        </div>

      </div>

      {/* ── MODAL FULLSCREEN: TAMBAH / EDIT PENITIPAN BARANG ── */}
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
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Warehouse size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                {editingId ? 'Edit Data Penitipan Barang' : 'Catat Penitipan Barang Baru (Konsinyasi)'}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Form Registrasi Barang Konsinyasi & Perhitungan Stok/Rupiah ({activeCompany?.code || 'RSG'})
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
          <form onSubmit={handleSavePenitipan} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              
              {/* Grid 2 Kolom: Kiri Info Dokumen & Penitip, Kanan Produk & Stok/Rupiah */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                
                {/* CARD KIRI: INFORMASI MITRA PENITIP & DOKUMEN */}
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
                      <User size={16} color="#0284c7" />
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                        1. INFORMASI MITRA PENITIP & DOKUMEN
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: '#e0f2fe',
                      color: '#0284c7',
                      textTransform: 'uppercase'
                    }}>
                      KONSINYASI
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Tanggal Penitipan <span style={{ color: '#ef4444' }}>*</span>
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
                          No. Titipan <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, no_titipan: generateNoTitipan() })}
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
                        value={formData.no_titipan}
                        onChange={(e) => setFormData({ ...formData, no_titipan: e.target.value })}
                        placeholder="Contoh: TTP-20261031-001"
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

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Nama Mitra / Penitip Barang <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nama_penitip}
                      onChange={(e) => setFormData({ ...formData, nama_penitip: e.target.value })}
                      placeholder="Contoh: Konveksi Berkah Mandiri / Pak Joko / Ibu Nur"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        color: '#0f172a',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        No. Kontak / Telepon / WA
                      </label>
                      <input
                        type="text"
                        value={formData.kontak_penitip}
                        onChange={(e) => setFormData({ ...formData, kontak_penitip: e.target.value })}
                        placeholder="Contoh: 0812-3456-7890"
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
                        Lokasi Rak / Penyimpanan
                      </label>
                      <input
                        type="text"
                        value={formData.lokasi_rak}
                        onChange={(e) => setFormData({ ...formData, lokasi_rak: e.target.value })}
                        placeholder="Contoh: Rak Konsinyasi A-01"
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Petugas Penerima Gudang
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
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Status Konsinyasi
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Selesai">Selesai (Semua Lunas)</option>
                        <option value="Ditarik">Ditarik / Dikembalikan</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Catatan / Perjanjian Konsinyasi
                    </label>
                    <textarea
                      rows={3}
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      placeholder="Contoh: Kesepakatan pembayaran per akhir bulan, biaya bagi hasil, atau kondisi fisik barang..."
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

                {/* CARD KANAN: PRODUK, STOK & PERHITUNGAN RUPIAH */}
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
                        2. PRODUK TITIPAN & KALKULASI RUPIAH
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: '#dcfce7',
                      color: '#15803d'
                    }}>
                      STOK & RUPIAH
                    </span>
                  </div>

                  {/* Searchable Select Produk */}
                  <SearchableSelect
                    label="Pilih Produk dari Master (Opsional)"
                    value={formData.kode_sku}
                    onChange={(val) => handleSelectProduct(val)}
                    options={productOptions}
                    placeholder="Pilih dari Master Produk untuk auto-fill..."
                    renderItem={(opt) => (
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
                        <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#16a34a', whiteSpace: 'nowrap' }}>
                          {formatRp(opt.harga_jual)}
                        </span>
                      </div>
                    )}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Kode SKU <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.kode_sku}
                        onChange={(e) => setFormData({ ...formData, kode_sku: e.target.value })}
                        placeholder="Contoh: TITIP-MK-01"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          color: '#0369a1',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Nama Produk Titipan <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nama_produk}
                        onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
                        placeholder="Contoh: Mukena Silk Bordir Premium"
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Varian / Warna / Ukuran
                      </label>
                      <input
                        type="text"
                        value={formData.varian}
                        onChange={(e) => setFormData({ ...formData, varian: e.target.value })}
                        placeholder="Contoh: Maroon / XL"
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
                        placeholder="PCS"
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

                  {/* Input Harga Modal Titip & Harga Jual */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0369a1', marginBottom: '3px' }}>
                        Harga Titip / Modal (Rp) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.harga_titip}
                        onChange={(e) => setFormData({ ...formData, harga_titip: Number(e.target.value) })}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1.5px solid #0284c7',
                          fontSize: '14px',
                          fontWeight: '800',
                          color: '#0369a1',
                          backgroundColor: '#f0f9ff',
                          boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
                        Kewajiban bayar ke pemilik per unit
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#16a34a', marginBottom: '3px' }}>
                        Harga Jual Konsumen (Rp) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.harga_jual}
                        onChange={(e) => setFormData({ ...formData, harga_jual: Number(e.target.value) })}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1.5px solid #16a34a',
                          fontSize: '14px',
                          fontWeight: '800',
                          color: '#15803d',
                          backgroundColor: '#f0fdf4',
                          boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ fontSize: '9.5px', color: '#16a34a', marginTop: '2px' }}>
                        Margin: {formatRp(Math.max(0, Number(formData.harga_jual || 0) - Number(formData.harga_titip || 0)))} / {formData.satuan}
                      </div>
                    </div>
                  </div>

                  {/* Input Qty Titip & Qty Terjual */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '3px' }}>
                        Stok Dititipkan (Masuk Gudang) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.qty_titip}
                        onChange={(e) => setFormData({ ...formData, qty_titip: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1.5px solid #0284c7',
                          fontSize: '15px',
                          fontWeight: '900',
                          textAlign: 'center',
                          color: '#0369a1',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '3px' }}>
                        Stok yang Sudah Terjual
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={formData.qty_titip}
                        value={formData.qty_terjual}
                        onChange={(e) => setFormData({ ...formData, qty_terjual: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1.5px solid #16a34a',
                          fontSize: '15px',
                          fontWeight: '900',
                          textAlign: 'center',
                          color: '#15803d',
                          backgroundColor: '#f0fdf4',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Realtime Live Preview Box (Menjawab Kebutuhan User: Stok & Rupiahnya) */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '12px 14px',
                    marginTop: '4px'
                  }}>
                    <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Kalkulasi Otomatis Stok & Nilai Rupiah:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                      {/* 1. Gudang */}
                      <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #e0f2fe' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#0369a1' }}>STOK DI GUDANG</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>
                          {formData.qty_titip} {formData.satuan}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', marginTop: '1px' }}>
                          {formatRp(previewRpTitip)}
                        </div>
                      </div>

                      {/* 2. Terjual */}
                      <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: '#15803d' }}>STOK TERJUAL</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>
                          {formData.qty_terjual} {formData.satuan}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', marginTop: '1px' }}>
                          {formatRp(previewRpTerjualOmset)}
                        </div>
                      </div>

                      {/* 3. Sisa */}
                      <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1.5px solid #ddd6fe' }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#6d28d9' }}>SISA STOK GUDANG</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#6d28d9', marginTop: '2px' }}>
                          {previewSisa} {formData.satuan}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#6d28d9', marginTop: '1px' }}>
                          {formatRp(previewRpSisaModal)}
                        </div>
                      </div>
                    </div>
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
                  backgroundColor: '#0284c7',
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
                <span>{isSaving ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan Penitipan' : 'Simpan Data Penitipan Barang')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL CEPAT: CATAT PENJUALAN TITIPAN (LAKU TERJUAL) ── */}
      {isJualModalOpen && selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10002,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              padding: '12px 18px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  Catat Penjualan Barang Titipan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJualModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSell} style={{ padding: '16px 20px' }}>
              <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', fontFamily: 'monospace' }}>
                  {selectedItem.kode_sku}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {selectedItem.nama_produk}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Penitip: <b>{selectedItem.nama_penitip}</b>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#6d28d9', marginTop: '4px' }}>
                  Sisa Stok Saat Ini: {selectedItem.sisa_stok} {selectedItem.satuan}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#166534', marginBottom: '3px' }}>
                  Jumlah Terjual Baru ({selectedItem.satuan}) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.sisa_stok}
                  required
                  value={jualQty}
                  onChange={(e) => setJualQty(Math.min(Number(selectedItem.sisa_stok), Math.max(1, Number(e.target.value))))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '2px solid #16a34a',
                    fontSize: '16px',
                    fontWeight: '900',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Rincian Finansial Transaksi */}
              <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '3px' }}>
                  <span style={{ color: '#166534' }}>Omset Penjualan ({jualQty} x {formatRp(selectedItem.harga_jual)}):</span>
                  <b style={{ color: '#15803d' }}>{formatRp(jualQty * selectedItem.harga_jual)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '3px' }}>
                  <span style={{ color: '#166534' }}>Bayar ke Penitip ({jualQty} x {formatRp(selectedItem.harga_titip)}):</span>
                  <b style={{ color: '#0369a1' }}>{formatRp(jualQty * selectedItem.harga_titip)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '4px', borderTop: '1px solid #bbf7d0' }}>
                  <span style={{ fontWeight: '800', color: '#166534' }}>Laba / Margin Toko:</span>
                  <b style={{ color: '#15803d' }}>{formatRp(jualQty * (selectedItem.harga_jual - selectedItem.harga_titip))}</b>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Catatan Transaksi / No Faktur
                </label>
                <input
                  type="text"
                  value={jualKeterangan}
                  onChange={(e) => setJualKeterangan(e.target.value)}
                  placeholder="Contoh: Laku di Toko Offline / Pesanan Reseller"
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsJualModalOpen(false)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Konfirmasi Penjualan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL FULLSCREEN: DETAIL / VOUCHER PENITIPAN BARANG ── */}
      {isDetailModalOpen && selectedItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0f172a',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header 42px */}
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
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Rincian Penitipan Barang: {selectedItem.no_titipan}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Mitra: {selectedItem.nama_penitip} ({activeCompany?.code || 'RSG'})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedItem);
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
                <span>Edit Data</span>
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
            
            {/* Hero Card */}
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
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
                    BUKTI KONSINYASI PENITIPAN BARANG
                  </span>
                  <div style={{ fontSize: '24px', fontWeight: '900', marginTop: '6px' }}>
                    {selectedItem.nama_penitip}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Kontak: {selectedItem.kontak_penitip || '-'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>Nomor Dokumen Titipan:</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'monospace' }}>
                    {selectedItem.no_titipan}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                    Tanggal: {selectedItem.tanggal}
                  </div>
                </div>
              </div>

              {/* 3 Metrik Stok & Rupiah Utama Sesuai Request User */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.25)'
              }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: '10px 14px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', opacity: 0.85 }}>1. TOTAL STOK DI GUDANG</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '2px' }}>
                    {selectedItem.qty_titip} {selectedItem.satuan}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '800', opacity: 0.95 }}>
                    Nilai: {formatRp(selectedItem.rp_total_titip)}
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', padding: '10px 14px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', opacity: 0.85 }}>2. STOK YANG TERJUAL</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '2px' }}>
                    {selectedItem.qty_terjual} {selectedItem.satuan}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '800', opacity: 0.95 }}>
                    Omset: {formatRp(selectedItem.rp_terjual_omset)}
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: '11px', opacity: 0.95, fontWeight: '800' }}>3. SISA STOK FISIK</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', marginTop: '2px' }}>
                    {selectedItem.sisa_stok} {selectedItem.satuan}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '900' }}>
                    Aset: {formatRp(selectedItem.rp_sisa_stok_modal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Rincian Finansial & Bagi Hasil */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '16px 20px',
              marginBottom: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                RINCIAN HARGA & BAGI HASIL PENJUALAN
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>Harga Titip (Modal):</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{formatRp(selectedItem.harga_titip)}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>Harga Jual Konsumen:</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#16a34a' }}>{formatRp(selectedItem.harga_jual)}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '10.5px', color: '#166534' }}>Kewajiban Bayar ke Penitip:</div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#0369a1' }}>{formatRp(selectedItem.rp_terjual_modal)}</div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '10.5px', color: '#166534' }}>Keuntungan Toko:</div>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#15803d' }}>
                    {formatRp(Number(selectedItem.rp_terjual_omset || 0) - Number(selectedItem.rp_terjual_modal || 0))}
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan Transaksi */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                CATATAN & INSTRUKSI PENITIPAN
              </h4>
              <div style={{ fontSize: '12px', color: '#334155', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {selectedItem.keterangan || 'Tidak ada catatan tambahan.'}
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
            flexShrink: 0
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
              Kembali ke Daftar Penitipan
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '8px 20px',
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
              <span>Cetak Bukti Penitipan</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

