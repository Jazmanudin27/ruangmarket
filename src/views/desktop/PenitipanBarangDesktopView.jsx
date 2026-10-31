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
  HelpCircle,
  CreditCard,
  Building,
  MapPin,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  ExternalLink
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
  const name = item.nama_produk || "";
  const sku = item.kode_sku || "";
  const target = `${name} ${sku}`.toUpperCase();

  for (const [key, weight] of Object.entries(SIZE_WEIGHTS)) {
    const regex = new RegExp(`(^|[\\s-_/])${key}([\\s-_/]|$)`, "i");
    if (regex.test(target)) {
      const baseName = name
        .replace(new RegExp(`(^|[\\s-_/])${key}([\\s-_/]|$)`, "gi"), " ")
        .trim();
      return {
        base: baseName.toLowerCase(),
        weight: weight,
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
  placeholder = "-- Pilih --",
  required = false,
  zIndex = 1050
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const sortedOptions = useMemo(() => {
    return [...options].sort(compareProducts);
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return sortedOptions;
    const q = searchTerm.toLowerCase();
    return sortedOptions.filter((opt) => {
      const valStr = typeof opt === "string" ? opt : (opt.label || opt.value || "");
      const skuStr = typeof opt === "object" && opt.sku ? opt.sku : "";
      const namaStr = typeof opt === "object" && opt.nama_produk ? opt.nama_produk : "";
      return (
        valStr.toLowerCase().includes(q) ||
        skuStr.toLowerCase().includes(q) ||
        namaStr.toLowerCase().includes(q)
      );
    });
  }, [sortedOptions, searchTerm]);

  const selectedOpt = options.find((opt) => {
    const val = typeof opt === "string" ? opt : opt.value;
    return String(val) === String(value);
  });

  const displayText = selectedOpt
    ? typeof selectedOpt === "string"
      ? selectedOpt
      : selectedOpt.label || selectedOpt.value
    : "";

  return (
    <div style={{ position: "relative", width: "100%" }} ref={dropdownRef}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: "700",
            color: "#334155",
            marginBottom: "3px"
          }}
        >
          {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
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
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px 8px" }}>
              <Search size={13} color="#64748b" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari produk / SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  width: "100%",
                  fontSize: "11.5px",
                  color: "#0f172a",
                  background: "transparent"
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "#94a3b8" }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List items */}
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", fontSize: "11.5px", color: "#94a3b8" }}>
                Produk tidak ditemukan
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optVal = typeof opt === "string" ? opt : opt.value;
                const isSelected = String(optVal) === String(value);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onChange(optVal, opt);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    style={{
                      padding: "7px 10px",
                      fontSize: "11.5px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: isSelected ? "#f0f9ff" : "transparent",
                      color: isSelected ? "#0369a1" : "#1e293b",
                      fontWeight: isSelected ? "700" : "500",
                      transition: "background-color 0.1s"
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {typeof opt === "object" && opt.sku ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <span style={{
                            fontFamily: "monospace",
                            fontSize: "10px",
                            fontWeight: "800",
                            backgroundColor: "#e0f2fe",
                            color: "#0284c7",
                            padding: "1px 4px",
                            borderRadius: "3px",
                            marginRight: "6px"
                          }}>
                            {opt.sku}
                          </span>
                          <span>{opt.nama_produk || opt.label}</span>
                        </div>
                        {opt.stok !== undefined && (
                          <span style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            color: opt.stok > 0 ? "#16a34a" : "#dc2626",
                            flexShrink: 0
                          }}>
                            Stok: {opt.stok}
                          </span>
                        )}
                      </div>
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

  // Master Data States
  const [mitraList, setMitraList] = useState([]);
  const [penitipanList, setPenitipanList] = useState([]);
  const [pembayaranList, setPembayaranList] = useState([]);
  const [masterProdukList, setMasterProdukList] = useState([]);

  // Aggregate Summary
  const [summary, setSummary] = useState({
    total_transaksi: 0,
    stok_di_gudang: 0,
    rp_di_gudang: 0,
    stok_terjual: 0,
    rp_terjual_modal: 0,
    sisa_stok: 0,
    rp_sisa_stok: 0,
    total_kewajiban: 0,
    total_sudah_dibayar: 0,
    sisa_hutang: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  // DRILL-DOWN NAVIGATION:
  // selectedMitra === null -> Level 1 (Tampilan Awal: Daftar Mitra Penitip)
  // selectedMitra !== null -> Level 2 (Detail Histori Titipan Mitra Terpilih)
  const [selectedMitra, setSelectedMitra] = useState(null);
  const [mitraActiveTab, setMitraActiveTab] = useState('titipan'); // 'titipan' | 'pembayaran'

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua'); // 'Semua' | 'Masih Ada Stok' | 'Habis'
  const [statusHutangFilter, setStatusHutangFilter] = useState('Semua'); // 'Semua' | 'Belum Lunas' | 'Lunas'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Modals
  const [isMitraModalOpen, setIsMitraModalOpen] = useState(false);
  const [editingMitraId, setEditingMitraId] = useState(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [isJualModalOpen, setIsJualModalOpen] = useState(false);
  const [jualQty, setJualQty] = useState(1);
  const [jualKeterangan, setJualKeterangan] = useState('');

  const [isBayarModalOpen, setIsBayarModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State: Mitra Penitip
  const initialMitraForm = {
    nama_mitra: '',
    kontak: '',
    alamat: '',
    bank_nama: 'BCA',
    bank_rekening: '',
    bank_atas_nama: '',
    keterangan: ''
  };
  const [mitraForm, setMitraForm] = useState(initialMitraForm);

  // Form State: Penitipan Barang (Harga Jual DITIADAKAN)
  const initialForm = {
    tanggal: new Date().toISOString().slice(0, 10),
    mitra_id: null,
    no_titipan: '',
    nama_penitip: '',
    kontak_penitip: '',
    produk_id: null,
    kode_sku: '',
    nama_produk: '',
    varian: '',
    satuan: 'PCS',
    harga_titip: 0,
    qty_titip: 10,
    qty_terjual: 0,
    qty_retur: 0,
    status: 'Aktif',
    lokasi_rak: 'Gudang Konsinyasi',
    petugas: 'Staff Gudang',
    keterangan: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Form State: Pembayaran Mitra
  const initialBayarForm = {
    mitra_id: null,
    nama_mitra: '',
    no_pembayaran: '',
    tanggal: new Date().toISOString().slice(0, 10),
    nominal: 0,
    metode_pembayaran: 'Transfer Bank BCA',
    no_referensi: '',
    petugas: 'Finance Titipan',
    catatan: ''
  };
  const [bayarForm, setBayarForm] = useState(initialBayarForm);

  // 1. Fetch All Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const comp = activeCompany?.code || 'RSG';

      // Load Mitra
      const resMitra = await fetch(`/api/penitipan-barang/mitra?company=${comp}`);
      if (resMitra.ok) {
        const jsonMitra = await resMitra.json();
        setMitraList(jsonMitra.data || []);
      }

      // Load Penitipan Barang
      const resPenitipan = await fetch(`/api/penitipan-barang?company=${comp}`);
      if (resPenitipan.ok) {
        const jsonP = await resPenitipan.json();
        setPenitipanList(jsonP.data || []);
        if (jsonP.summary) {
          setSummary(jsonP.summary);
        }
      }

      // Load Pembayaran
      const resBayar = await fetch(`/api/penitipan-barang/pembayaran?company=${comp}`);
      if (resBayar.ok) {
        const jsonB = await resBayar.json();
        setPembayaranList(jsonB.data || []);
      }

      // Load Master Produk untuk autocomplete select
      const resProd = await fetch('/api/marketplace/produk');
      if (resProd.ok) {
        const jsonProd = await resProd.json();
        setMasterProdukList(jsonProd.data || []);
      }
    } catch (err) {
      console.error('Error fetching penitipan data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompany]);

  // Keep selectedMitra in sync with updated data
  useEffect(() => {
    if (selectedMitra) {
      const refreshed = mitraList.find(m => m.id === selectedMitra.id || m.nama_mitra === selectedMitra.nama_mitra);
      if (refreshed) {
        setSelectedMitra(refreshed);
      }
    }
  }, [mitraList]);

  // 2. Filtered Lists
  // List Mitra Terfilter (Level 1)
  const filteredMitraList = useMemo(() => {
    return mitraList.filter(m => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (m.nama_mitra && m.nama_mitra.toLowerCase().includes(q)) ||
        (m.kontak && m.kontak.toLowerCase().includes(q)) ||
        (m.alamat && m.alamat.toLowerCase().includes(q)) ||
        (m.bank_nama && m.bank_nama.toLowerCase().includes(q));

      const matchHutang =
        statusHutangFilter === 'Semua' ||
        (statusHutangFilter === 'Belum Lunas' && Number(m.sisa_hutang) > 0) ||
        (statusHutangFilter === 'Lunas' && Number(m.sisa_hutang) <= 0);

      return matchSearch && matchHutang;
    });
  }, [mitraList, search, statusHutangFilter]);

  // List Barang Titipan untuk Mitra Terpilih (Level 2)
  const filteredPenitipanForMitra = useMemo(() => {
    if (!selectedMitra) return [];
    return penitipanList.filter(p => {
      const isMitra = (p.mitra_id && Number(p.mitra_id) === Number(selectedMitra.id)) ||
                      (p.nama_penitip && p.nama_penitip.trim().toLowerCase() === selectedMitra.nama_mitra.trim().toLowerCase());
      if (!isMitra) return false;

      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (p.no_titipan && p.no_titipan.toLowerCase().includes(q)) ||
        (p.kode_sku && p.kode_sku.toLowerCase().includes(q)) ||
        (p.nama_produk && p.nama_produk.toLowerCase().includes(q));

      const sisa = Number(p.sisa_stok || 0);
      const matchStatus =
        statusFilter === 'Semua' ||
        (statusFilter === 'Masih Ada Stok' && sisa > 0) ||
        (statusFilter === 'Habis' && sisa <= 0);

      return matchSearch && matchStatus;
    });
  }, [penitipanList, selectedMitra, search, statusFilter]);

  // List Pembayaran untuk Mitra Terpilih (Level 2)
  const filteredPembayaranForMitra = useMemo(() => {
    if (!selectedMitra) return [];
    return pembayaranList.filter(b => {
      return (b.mitra_id && Number(b.mitra_id) === Number(selectedMitra.id)) ||
             (b.nama_mitra && b.nama_mitra.trim().toLowerCase() === selectedMitra.nama_mitra.trim().toLowerCase());
    });
  }, [pembayaranList, selectedMitra]);

  // Pagination Helper
  const paginatedMitra = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredMitraList.slice(start, start + entriesPerPage);
  }, [filteredMitraList, currentPage, entriesPerPage]);

  const paginatedTitipan = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredPenitipanForMitra.slice(start, start + entriesPerPage);
  }, [filteredPenitipanForMitra, currentPage, entriesPerPage]);

  // =========================================================================
  // ACTIONS: MITRA PENITIP (CRUD)
  // =========================================================================
  const handleOpenTambahMitra = () => {
    setMitraForm(initialMitraForm);
    setEditingMitraId(null);
    setIsMitraModalOpen(true);
  };

  const handleOpenEditMitra = (mitra, e) => {
    if (e) e.stopPropagation();
    setMitraForm({
      nama_mitra: mitra.nama_mitra || '',
      kontak: mitra.kontak || '',
      alamat: mitra.alamat || '',
      bank_nama: mitra.bank_nama || 'BCA',
      bank_rekening: mitra.bank_rekening || '',
      bank_atas_nama: mitra.bank_atas_nama || '',
      keterangan: mitra.keterangan || ''
    });
    setEditingMitraId(mitra.id);
    setIsMitraModalOpen(true);
  };

  const handleSaveMitra = async (e) => {
    e.preventDefault();
    if (!mitraForm.nama_mitra.trim()) {
      toastError('Nama Mitra wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingMitraId
        ? `/api/penitipan-barang/mitra/${editingMitraId}`
        : '/api/penitipan-barang/mitra';
      const method = editingMitraId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mitraForm,
          kode_perusahaan: activeCompany?.code || 'RSG'
        })
      });

      const resJson = await res.json();
      if (res.ok) {
        toastSuccess(resJson.message || 'Data Mitra berhasil disimpan!');
        setIsMitraModalOpen(false);
        loadData();
      } else {
        toastError(resJson.message || 'Gagal menyimpan data Mitra.');
      }
    } catch (err) {
      console.error(err);
      toastError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMitra = async (mitra, e) => {
    if (e) e.stopPropagation();
    const ok = await showConfirm(`Yakin ingin menghapus mitra "${mitra.nama_mitra}"? Histori titipan dan pembayarannya akan ikut terpengaruh.`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/penitipan-barang/mitra/${mitra.id}`, { method: 'DELETE' });
      const resJson = await res.json();
      if (res.ok) {
        toastSuccess('Mitra berhasil dihapus.');
        if (selectedMitra && selectedMitra.id === mitra.id) {
          setSelectedMitra(null);
        }
        loadData();
      } else {
        toastError(resJson.message || 'Gagal menghapus mitra.');
      }
    } catch (err) {
      console.error(err);
      toastError('Terjadi kesalahan jaringan.');
    }
  };

  // =========================================================================
  // ACTIONS: PENITIPAN BARANG (CRUD)
  // =========================================================================
  const handleOpenTambahBarang = (forMitra = null) => {
    const targetMitra = forMitra || selectedMitra;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const autoNo = `TTP-${dateStr.replace(/-/g, '')}-${rand}`;

    setFormData({
      ...initialForm,
      no_titipan: autoNo,
      tanggal: dateStr,
      mitra_id: targetMitra ? targetMitra.id : (mitraList[0]?.id || null),
      nama_penitip: targetMitra ? targetMitra.nama_mitra : (mitraList[0]?.nama_mitra || ''),
      kontak_penitip: targetMitra ? targetMitra.kontak : (mitraList[0]?.kontak || '')
    });
    setEditingId(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditBarang = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      tanggal: item.tanggal,
      mitra_id: item.mitra_id || null,
      no_titipan: item.no_titipan,
      nama_penitip: item.nama_penitip,
      kontak_penitip: item.kontak_penitip || '',
      produk_id: item.produk_id || null,
      kode_sku: item.kode_sku,
      nama_produk: item.nama_produk,
      varian: item.varian || '',
      satuan: item.satuan || 'PCS',
      harga_titip: Number(item.harga_titip || 0),
      qty_titip: Number(item.qty_titip || 0),
      qty_terjual: Number(item.qty_terjual || 0),
      qty_retur: Number(item.qty_retur || 0),
      status: item.status || 'Aktif',
      lokasi_rak: item.lokasi_rak || 'Gudang Konsinyasi',
      petugas: item.petugas || 'Staff Gudang',
      keterangan: item.keterangan || ''
    });
    setEditingId(item.id);
    setIsFormModalOpen(true);
  };

  const handleSaveBarang = async (e) => {
    e.preventDefault();
    if (!formData.nama_penitip || !formData.nama_produk || Number(formData.qty_titip) <= 0) {
      toastError('Nama Mitra Penitip, Nama Produk, dan Qty Titip wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingId ? `/api/penitipan-barang/${editingId}` : '/api/penitipan-barang';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          kode_perusahaan: activeCompany?.code || 'RSG'
        })
      });

      const resJson = await res.json();
      if (res.ok) {
        toastSuccess(resJson.message || 'Data penitipan barang berhasil disimpan!');
        setIsFormModalOpen(false);
        loadData();
      } else {
        toastError(resJson.message || 'Gagal menyimpan penitipan barang.');
      }
    } catch (err) {
      console.error(err);
      toastError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBarang = async (item, e) => {
    if (e) e.stopPropagation();
    const ok = await showConfirm(`Hapus data penitipan "${item.nama_produk}" (${item.no_titipan})?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/penitipan-barang/${item.id}`, { method: 'DELETE' });
      const resJson = await res.json();
      if (res.ok) {
        toastSuccess('Data penitipan barang berhasil dihapus.');
        loadData();
      } else {
        toastError(resJson.message || 'Gagal menghapus data.');
      }
    } catch (err) {
      console.error(err);
      toastError('Terjadi kesalahan jaringan.');
    }
  };

  // =========================================================================
  // ACTIONS: CATAT LAKU CEPAT (QUICK SELL)
  // =========================================================================
  const handleOpenQuickSell = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setJualQty(1);
    setJualKeterangan('');
    setIsJualModalOpen(true);
  };

  const handleSimpanPenjualanCepat = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qty = Number(jualQty);
    const sisa = Number(selectedItem.sisa_stok || 0);

    if (qty <= 0) {
      toastError('Jumlah laku terjual harus lebih dari 0!');
      return;
    }
    if (qty > sisa) {
      toastError(`Jumlah terjual (${qty}) melebihi sisa stok gudang (${sisa})!`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/penitipan-barang/${selectedItem.id}/terjual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qty_terjual: qty, keterangan: jualKeterangan })
      });
      const resJson = await res.json();
      if (res.ok) {
        toastSuccess(resJson.message || `Berhasil mencatat ${qty} ${selectedItem.satuan} laku terjual!`);
        setIsJualModalOpen(false);
        loadData();
      } else {
        toastError(resJson.message || 'Gagal mencatat penjualan.');
      }
    } catch (err) {
      console.error(err);
      toastError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // ACTIONS: PEMBAYARAN KE MITRA
  // =========================================================================
  const handleOpenBayarMitra = (mitra = null, e) => {
    if (e) e.stopPropagation();
    const target = mitra || selectedMitra || mitraList[0];
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const autoNo = `BYR-${dateStr.replace(/-/g, '')}-${rand}`;

    const defaultNominal = target ? Number(target.sisa_hutang || 0) : 0;

    setBayarForm({
      mitra_id: target ? target.id : null,
      nama_mitra: target ? target.nama_mitra : '',
      no_pembayaran: autoNo,
      tanggal: dateStr,
      nominal: defaultNominal,
      metode_pembayaran: target?.bank_nama ? `Transfer Bank ${target.bank_nama}` : 'Transfer Bank BCA',
      no_referensi: '',
      petugas: 'Finance Titipan',
      catatan: `Pembayaran konsinyasi produk terjual untuk ${target ? target.nama_mitra : 'Mitra'}`
    });
    setIsBayarModalOpen(true);
  };

  const handleSavePembayaran = async (e) => {
    e.preventDefault();
    if (!bayarForm.nama_mitra || Number(bayarForm.nominal) <= 0) {
      toastError('Nama Mitra dan Nominal Pembayaran (harus > 0) wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/penitipan-barang/pembayaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bayarForm,
          kode_perusahaan: activeCompany?.code || 'RSG'
        })
      });

      const resJson = await res.json();
      if (res.ok) {
        toastSuccess(resJson.message || 'Pembayaran berhasil dicatat!');
        setIsBayarModalOpen(false);
        loadData();
      } else {
        toastError(resJson.message || 'Gagal menyimpan pembayaran.');
      }
    } catch (err) {
      console.error(err);
      toastError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePembayaran = async (bayar, e) => {
    if (e) e.stopPropagation();
    const ok = await showConfirm(`Hapus histori pembayaran "${bayar.no_pembayaran}" (${formatRp(bayar.nominal)})?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/penitipan-barang/pembayaran/${bayar.id}`, { method: 'DELETE' });
      const resJson = await res.json();
      if (res.ok) {
        toastSuccess('Catatan pembayaran berhasil dihapus.');
        loadData();
      } else {
        toastError(resJson.message || 'Gagal menghapus pembayaran.');
      }
    } catch (err) {
      console.error(err);
      toastError('Terjadi kesalahan jaringan.');
    }
  };

  // =========================================================================
  // ACTIONS: DETAIL / SHOW MODAL
  // =========================================================================
  const handleOpenDetail = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // Helper sync master produk saat dipilih di form barang
  const handleSelectMasterProduk = (val, opt) => {
    if (!opt) return;
    setFormData(prev => ({
      ...prev,
      produk_id: opt.id || null,
      kode_sku: opt.sku || prev.kode_sku,
      nama_produk: opt.nama_produk || opt.label || prev.nama_produk,
      varian: opt.varian || prev.varian,
      satuan: opt.satuan || prev.satuan || 'PCS',
      harga_titip: Number(opt.harga_beli || opt.hpp_total || prev.harga_titip || 0)
    }));
  };

  // Preview Realtime Calculation di Form Barang (Murni Harga Titip)
  const previewSisa = Math.max(0, Number(formData.qty_titip) - Number(formData.qty_terjual) - Number(formData.qty_retur));
  const previewRpMasuk = Number(formData.qty_titip) * Number(formData.harga_titip);
  const previewRpTerjualKewajiban = Number(formData.qty_terjual) * Number(formData.harga_titip);
  const previewRpSisa = previewSisa * Number(formData.harga_titip);

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* 1. HEADER CARD DENGAN METRIK UTAMA */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
        padding: '12px 16px',
        marginBottom: '10px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          {/* Judul & Breadcrumb */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)'
              }}>
                <Warehouse size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Penitipan Barang (Konsinyasi)
                  </h2>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1'
                  }}>
                    {activeCompany?.code || 'RSG'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                  {selectedMitra ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        onClick={() => setSelectedMitra(null)}
                        style={{ color: '#0284c7', cursor: 'pointer', fontWeight: '700' }}
                      >
                        Semua Mitra Penitip
                      </span>
                      <ChevronRight size={12} />
                      <span style={{ fontWeight: '800', color: '#0f172a' }}>{selectedMitra.nama_mitra}</span>
                    </span>
                  ) : (
                    'Kelola mitra konsinyasi, stok gudang, penjualan laku, dan pelunasan pembayaran ke mitra'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {selectedMitra && (
              <button
                type="button"
                onClick={() => setSelectedMitra(null)}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Daftar Mitra</span>
              </button>
            )}

            {/* Tombol Tambah Mitra */}
            <button
              type="button"
              onClick={handleOpenTambahMitra}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #0284c7',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Plus size={14} />
              <span>Tambah Mitra Penitip</span>
            </button>

            {/* Tombol Bayar Mitra */}
            <button
              type="button"
              onClick={() => handleOpenBayarMitra(selectedMitra)}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #059669',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
              }}
            >
              <DollarSign size={14} />
              <span>Catat Pembayaran Mitra</span>
            </button>

            {/* Tombol Tambah Barang Titipan */}
            <button
              type="button"
              onClick={() => handleOpenTambahBarang(selectedMitra)}
              style={{
                height: '32px',
                padding: '0 14px',
                borderRadius: '6px',
                border: '1px solid #0f172a',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.25)'
              }}
            >
              <Plus size={14} />
              <span>+ Catat Barang Titipan</span>
            </button>
          </div>
        </div>

        {/* 2. KARTU REKAP METRIK KEUANGAN & STOK KONSINYASI */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '10px',
          marginTop: '12px'
        }}>
          {/* Card 1: Total Mitra & Produk */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '7px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Building size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                TOTAL MITRA KONSINYASI
              </div>
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', lineHeight: 1.2 }}>
                {mitraList.length} <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>Mitra</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#0284c7', marginTop: '2px' }}>
                {penitipanList.length} Transaksi Titipan
              </div>
            </div>
          </div>

          {/* Card 2: Stok di Gudang */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '7px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Warehouse size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>
                TOTAL STOK MASUK
              </div>
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#0369a1', lineHeight: 1.2 }}>
                {summary.stok_di_gudang.toLocaleString('id-ID')} <span style={{ fontSize: '11px', fontWeight: '600' }}>PCS</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>
                {formatRp(summary.rp_di_gudang)}
              </div>
            </div>
          </div>

          {/* Card 3: Stok Terjual (Kewajiban) */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '7px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>
                STOK TERJUAL (KEWAJIBAN)
              </div>
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#15803d', lineHeight: 1.2 }}>
                {summary.stok_terjual.toLocaleString('id-ID')} <span style={{ fontSize: '11px', fontWeight: '600' }}>PCS</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                Wajib Setor: {formatRp(summary.total_kewajiban)}
              </div>
            </div>
          </div>

          {/* Card 4: Sisa Stok di Gudang */}
          <div style={{
            backgroundColor: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '7px',
              backgroundColor: '#8b5cf6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Boxes size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase' }}>
                SISA STOK GUDANG
              </div>
              <div style={{ fontSize: '17px', fontWeight: '900', color: '#7c3aed', lineHeight: 1.2 }}>
                {summary.sisa_stok.toLocaleString('id-ID')} <span style={{ fontSize: '11px', fontWeight: '600' }}>PCS</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#8b5cf6', marginTop: '2px' }}>
                Nilai Aset: {formatRp(summary.rp_sisa_stok)}
              </div>
            </div>
          </div>

          {/* Card 5: Status Hutang Konsinyasi */}
          <div style={{
            backgroundColor: summary.sisa_hutang > 0 ? '#fffbeb' : '#f8fafc',
            border: summary.sisa_hutang > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '7px',
              backgroundColor: summary.sisa_hutang > 0 ? '#f59e0b' : '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: summary.sisa_hutang > 0 ? '#b45309' : '#15803d', textTransform: 'uppercase' }}>
                SISA HUTANG KONSINYASI
              </div>
              <div style={{ fontSize: '17px', fontWeight: '900', color: summary.sisa_hutang > 0 ? '#b45309' : '#15803d', lineHeight: 1.2 }}>
                {formatRp(summary.sisa_hutang)}
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', marginTop: '2px' }}>
                Dibayar: {formatRp(summary.total_sudah_dibayar)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* LEVEL 1: TAMPILAN AWAL DAFTAR MITRA PENITIP                        */}
      {/* =================================================================== */}
      {!selectedMitra && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
          padding: '12px 16px'
        }}>
          {/* Toolbar Level 1 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                Daftar Mitra Penitip
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: '#f1f5f9',
                color: '#475569'
              }}>
                {filteredMitraList.length} Mitra
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Filter Hutang */}
              <select
                value={statusHutangFilter}
                onChange={(e) => { setStatusHutangFilter(e.target.value); setCurrentPage(1); }}
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
                <option value="Semua">Semua Status Hutang</option>
                <option value="Belum Lunas">Ada Hutang (Belum Lunas)</option>
                <option value="Lunas">Lunas</option>
              </select>

              {/* Search Mitra */}
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
                  placeholder="Cari mitra, kontak, bank..."
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

              {/* Entries per page */}
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  height: '28px',
                  padding: '0 8px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  color: '#334155',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value={25}>25 Baris</option>
                <option value={50}>50 Baris</option>
                <option value={100}>100 Baris</option>
              </select>

              <button
                type="button"
                onClick={loadData}
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

          {/* TABEL MASTER PRODUK STYLE: DAFTAR MITRA */}
          <div style={{
            overflowX: 'auto',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)'
          }}>
            <table
              className="table-bordered-hover"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '12px',
                border: '1px solid #cbd5e1'
              }}
            >
              <thead>
                <tr style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '35px', border: '1px solid #cbd5e1' }}>NO</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', minWidth: '220px', border: '1px solid #cbd5e1' }}>MITRA PENITIP & REKENING</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '90px', border: '1px solid #cbd5e1' }}>TITIPAN</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '130px', backgroundColor: '#f0f9ff', border: '1px solid #cbd5e1' }}>STOK MASUK (RP)</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '130px', backgroundColor: '#f0fdf4', border: '1px solid #cbd5e1' }}>TERJUAL (RP)</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '130px', backgroundColor: '#faf5ff', border: '1px solid #cbd5e1' }}>SISA STOK (RP)</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', width: '130px', border: '1px solid #cbd5e1' }}>TOTAL KEWAJIBAN</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', width: '120px', border: '1px solid #cbd5e1' }}>SUDAH DIBAYAR</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '120px', border: '1px solid #cbd5e1' }}>SISA HUTANG</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', width: '120px', border: '1px solid #cbd5e1' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <RotateCw size={16} className="animate-spin" />
                        <span>Memuat data mitra konsinyasi...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedMitra.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '35px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                      <Building size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                        Belum ada data mitra penitip
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '3px' }}>
                        Klik tombol <b>"+ Tambah Mitra Penitip"</b> untuk mendaftarkan mitra konsinyasi baru.
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMitra.map((mitra, idx) => {
                    const rowNumber = (currentPage - 1) * entriesPerPage + idx + 1;
                    const sisaHutang = Number(mitra.sisa_hutang || 0);
                    const isLunas = sisaHutang <= 0;

                    return (
                      <tr
                        key={mitra.id || idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                          transition: 'background-color 0.15s ease',
                          cursor: 'pointer'
                        }}
                        onClick={() => { setSelectedMitra(mitra); setCurrentPage(1); }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fcfdfd'}
                      >
                        {/* No */}
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b', fontWeight: '700', border: '1px solid #cbd5e1' }}>
                          {rowNumber}
                        </td>

                        {/* Mitra & Info Bank */}
                        <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '800', color: '#0284c7', fontSize: '12px', textDecoration: 'underline' }}>
                              {mitra.nama_mitra}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {mitra.kontak && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <Phone size={10} />
                                <span>{mitra.kontak}</span>
                              </span>
                            )}
                            {mitra.bank_nama && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px' }}>
                                <CreditCard size={10} color="#0284c7" />
                                <span>{mitra.bank_nama} {mitra.bank_rekening} ({mitra.bank_atas_nama || '-'})</span>
                              </span>
                            )}
                          </div>
                          {mitra.alamat && (
                            <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
                              {mitra.alamat}
                            </div>
                          )}
                        </td>

                        {/* Total Titipan & Produk */}
                        <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                            {mitra.total_titipan || 0}
                          </div>
                          <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                            {mitra.total_produk || 0} SKU
                          </div>
                        </td>

                        {/* Stok Masuk (Qty + Rp) */}
                        <td style={{ padding: '5px 8px', textAlign: 'center', backgroundColor: '#f0f9ff', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: '#0369a1' }}>
                            {Number(mitra.stok_masuk || 0)} <span style={{ fontSize: '9.5px', fontWeight: '700' }}>PCS</span>
                          </div>
                          <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0284c7', marginTop: '1px' }}>
                            {formatRp(mitra.total_nilai_titip)}
                          </div>
                        </td>

                        {/* Terjual (Qty + Rp) */}
                        <td style={{ padding: '5px 8px', textAlign: 'center', backgroundColor: '#f0fdf4', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: '#15803d' }}>
                            {Number(mitra.stok_terjual || 0)} <span style={{ fontSize: '9.5px', fontWeight: '700' }}>PCS</span>
                          </div>
                          <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#16a34a', marginTop: '1px' }}>
                            {formatRp(mitra.total_kewajiban_bayar)}
                          </div>
                        </td>

                        {/* Sisa Stok (Qty + Rp) */}
                        <td style={{ padding: '5px 8px', textAlign: 'center', backgroundColor: '#faf5ff', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '13px', fontWeight: '900', color: '#7c3aed' }}>
                            {Number(mitra.sisa_stok || 0)} <span style={{ fontSize: '9.5px', fontWeight: '700' }}>PCS</span>
                          </div>
                          <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#8b5cf6', marginTop: '1px' }}>
                            {formatRp(mitra.total_nilai_sisa)}
                          </div>
                        </td>

                        {/* Total Kewajiban (Rp) */}
                        <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a' }}>
                            {formatRp(mitra.total_kewajiban_bayar)}
                          </div>
                        </td>

                        {/* Sudah Dibayar (Rp) */}
                        <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#16a34a' }}>
                            {formatRp(mitra.total_sudah_dibayar)}
                          </div>
                        </td>

                        {/* Sisa Hutang (Badge) */}
                        <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: isLunas ? '#dcfce7' : '#fee2e2',
                            color: isLunas ? '#15803d' : '#b91c1c',
                            fontWeight: '900',
                            fontSize: '11.5px'
                          }}>
                            {isLunas ? 'Lunas' : formatRp(sisaHutang)}
                          </div>
                        </td>

                        {/* AKSI (Kotak 26x26px ala Master Produk) */}
                        <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }} onClick={e => e.stopPropagation()}>
                            {/* 1. Detail / Buka Histori (Cyan) */}
                            <button
                              type="button"
                              onClick={() => { setSelectedMitra(mitra); setCurrentPage(1); }}
                              title="Buka Histori Titipan & Pembayaran Mitra"
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#06b6d4',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <Eye size={13} />
                            </button>

                            {/* 2. Bayar Mitra (Hijau Emerald) */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenBayarMitra(mitra, e)}
                              title="Catat Pembayaran ke Mitra"
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <DollarSign size={13} />
                            </button>

                            {/* 3. Edit Mitra (Biru) */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditMitra(mitra, e)}
                              title="Edit Data Mitra"
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <Edit3 size={13} />
                            </button>

                            {/* 4. Delete Mitra (Merah) */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteMitra(mitra, e)}
                              title="Hapus Mitra"
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'opacity 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <Trash2 size={13} />
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

          {/* Footer Pagination Level 1 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
            fontSize: '11px',
            color: '#64748b'
          }}>
            <div>
              Menampilkan <b>{filteredMitraList.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> - <b>{Math.min(currentPage * entriesPerPage, filteredMitraList.length)}</b> dari <b>{filteredMitraList.length}</b> mitra penitip
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
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Sebelumnya
              </button>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>
                Halaman {currentPage} / {Math.max(1, Math.ceil(filteredMitraList.length / entriesPerPage))}
              </span>
              <button
                type="button"
                disabled={currentPage >= Math.ceil(filteredMitraList.length / entriesPerPage)}
                onClick={() => setCurrentPage(prev => prev + 1)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage >= Math.ceil(filteredMitraList.length / entriesPerPage) ? '#f1f5f9' : '#ffffff',
                  color: currentPage >= Math.ceil(filteredMitraList.length / entriesPerPage) ? '#94a3b8' : '#334155',
                  cursor: currentPage >= Math.ceil(filteredMitraList.length / entriesPerPage) ? 'not-allowed' : 'pointer'
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LEVEL 2: DETAIL HISTORI TITIPAN & PEMBAYARAN MITRA TERPILIH        */}
      {/* =================================================================== */}
      {selectedMitra && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
          padding: '14px 16px'
        }}>
          {/* Banner Profil Mitra Terpilih */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Building size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    {selectedMitra.nama_mitra}
                  </h3>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: Number(selectedMitra.sisa_hutang) <= 0 ? '#dcfce7' : '#fee2e2',
                    color: Number(selectedMitra.sisa_hutang) <= 0 ? '#15803d' : '#b91c1c'
                  }}>
                    {Number(selectedMitra.sisa_hutang) <= 0 ? 'LUNAS' : `HUTANG: ${formatRp(selectedMitra.sisa_hutang)}`}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {selectedMitra.kontak && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Phone size={11} color="#0284c7" />
                      <span>{selectedMitra.kontak}</span>
                    </span>
                  )}
                  {selectedMitra.bank_nama && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <CreditCard size={11} color="#059669" />
                      <span>Rek: <b>{selectedMitra.bank_nama} {selectedMitra.bank_rekening}</b> a.n. {selectedMitra.bank_atas_nama || '-'}</span>
                    </span>
                  )}
                  {selectedMitra.alamat && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={11} color="#d97706" />
                      <span>{selectedMitra.alamat}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Mitra */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleOpenTambahBarang(selectedMitra)}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '5px',
                  border: '1px solid #0284c7',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={13} />
                <span>+ Titipan Produk Baru</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenBayarMitra(selectedMitra)}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '5px',
                  border: '1px solid #059669',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <DollarSign size={13} />
                <span>Bayar Mitra</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenEditMitra(selectedMitra)}
                title="Edit Profil Mitra"
                style={{
                  height: '30px',
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
                <Edit3 size={12} />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Tab Switcher: Barang Titipan vs Histori Pembayaran */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #e2e8f0',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => { setMitraActiveTab('titipan'); setCurrentPage(1); }}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '800',
                  border: 'none',
                  borderBottom: mitraActiveTab === 'titipan' ? '2.5px solid #0284c7' : '2.5px solid transparent',
                  backgroundColor: 'transparent',
                  color: mitraActiveTab === 'titipan' ? '#0284c7' : '#64748b',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Warehouse size={14} />
                <span>Daftar Barang Titipan ({filteredPenitipanForMitra.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { setMitraActiveTab('pembayaran'); setCurrentPage(1); }}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '800',
                  border: 'none',
                  borderBottom: mitraActiveTab === 'pembayaran' ? '2.5px solid #10b981' : '2.5px solid transparent',
                  backgroundColor: 'transparent',
                  color: mitraActiveTab === 'pembayaran' ? '#10b981' : '#64748b',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <DollarSign size={14} />
                <span>Histori Pembayaran ({filteredPembayaranForMitra.length})</span>
              </button>
            </div>

            {/* Filter Khusus Tab Barang Titipan */}
            {mitraActiveTab === 'titipan' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '6px' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    height: '26px',
                    padding: '0 6px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    color: '#334155'
                  }}
                >
                  <option value="Semua">Semua Stok</option>
                  <option value="Masih Ada Stok">Masih Ada Stok</option>
                  <option value="Habis">Habis Terjual</option>
                </select>
              </div>
            )}
          </div>

          {/* TAB 1 CONTENT: TABEL BARANG TITIPAN MITRA TERPILIH (NO HARGA JUAL!) */}
          {mitraActiveTab === 'titipan' && (
            <div>
              <div style={{
                overflowX: 'auto',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)'
              }}>
                <table
                  className="table-bordered-hover"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <thead>
                    <tr style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #cbd5e1',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '35px', border: '1px solid #cbd5e1' }}>NO</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left', width: '135px', border: '1px solid #cbd5e1' }}>NO. TITIPAN & TGL</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left', minWidth: '220px', border: '1px solid #cbd5e1' }}>PRODUK TITIPAN & SKU</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right', width: '120px', border: '1px solid #cbd5e1' }}>HARGA TITIP</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '130px', backgroundColor: '#f0f9ff', border: '1px solid #cbd5e1' }}>STOK MASUK (RP)</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '130px', backgroundColor: '#f0fdf4', border: '1px solid #cbd5e1' }}>TERJUAL (RP)</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '130px', backgroundColor: '#faf5ff', border: '1px solid #cbd5e1' }}>SISA STOK (RP)</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '90px', border: '1px solid #cbd5e1' }}>STATUS</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '120px', border: '1px solid #cbd5e1' }}>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTitipan.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                          <Warehouse size={28} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                            Belum ada barang titipan tercatat untuk {selectedMitra.nama_mitra}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenTambahBarang(selectedMitra)}
                            style={{
                              marginTop: '8px',
                              padding: '5px 12px',
                              borderRadius: '4px',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            + Catat Barang Titipan Sekarang
                          </button>
                        </td>
                      </tr>
                    ) : (
                      paginatedTitipan.map((item, idx) => {
                        const rowNumber = (currentPage - 1) * entriesPerPage + idx + 1;
                        const sisa = Number(item.sisa_stok || 0);
                        const isHabis = sisa <= 0;

                        return (
                          <tr
                            key={item.id || idx}
                            style={{
                              backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                              transition: 'background-color 0.15s ease',
                              cursor: 'default'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fcfdfd'}
                          >
                            {/* No */}
                            <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b', fontWeight: '700', border: '1px solid #cbd5e1' }}>
                              {rowNumber}
                            </td>

                            {/* No Titipan & Tgl */}
                            <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                              <div style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0369a1', fontSize: '11px' }}>
                                {item.no_titipan}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                                <Calendar size={10} />
                                <span>{item.tanggal}</span>
                              </div>
                            </td>

                            {/* Produk Titipan */}
                            <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
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

                            {/* Harga Titip (MURNI HARGA TITIP, NO HARGA JUAL!) */}
                            <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>
                                {formatRp(item.harga_titip)}
                              </div>
                              <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                                /{item.satuan}
                              </div>
                            </td>

                            {/* Stok Masuk (Qty + Rp) */}
                            <td style={{ padding: '5px 8px', textAlign: 'center', backgroundColor: '#f0f9ff', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: '13px', fontWeight: '900', color: '#0369a1' }}>
                                {item.qty_titip} <span style={{ fontSize: '10px', fontWeight: '700' }}>{item.satuan}</span>
                              </div>
                              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0284c7', marginTop: '1px' }}>
                                {formatRp(item.rp_total_titip)}
                              </div>
                            </td>

                            {/* Stok Terjual (Qty + Rp) */}
                            <td style={{ padding: '5px 8px', textAlign: 'center', backgroundColor: '#f0fdf4', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: '13px', fontWeight: '900', color: '#15803d' }}>
                                {item.qty_terjual} <span style={{ fontSize: '10px', fontWeight: '700' }}>{item.satuan}</span>
                              </div>
                              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#16a34a', marginTop: '1px' }}>
                                {formatRp(item.rp_terjual_modal)}
                              </div>
                            </td>

                            {/* Sisa Stok (Qty + Rp) */}
                            <td style={{ padding: '5px 8px', textAlign: 'center', backgroundColor: '#faf5ff', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
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

                            {/* Status */}
                            <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isHabis ? '#f1f5f9' : '#ecfdf5',
                                color: isHabis ? '#64748b' : '#059669',
                                border: isHabis ? '1px solid #cbd5e1' : '1px solid #a7f3d0'
                              }}>
                                {isHabis ? 'Selesai' : 'Aktif'}
                              </span>
                            </td>

                            {/* AKSI Presisi Master Produk */}
                            <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                {/* 1. Catat Laku Cepat (Green) */}
                                {!isHabis && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenQuickSell(item, e)}
                                    title="Catat Laku Terjual"
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '4px',
                                      border: 'none',
                                      backgroundColor: '#10b981',
                                      color: '#ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      transition: 'opacity 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                  >
                                    <ShoppingBag size={13} />
                                  </button>
                                )}

                                {/* 2. Detail Show Button (Cyan) */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenDetail(item, e)}
                                  title="Lihat Detail Produk"
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#06b6d4',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                  <Eye size={13} />
                                </button>

                                {/* 3. Edit Button (Blue) */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEditBarang(item, e)}
                                  title="Edit Data Penitipan"
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#0284c7',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                  <Edit3 size={13} />
                                </button>

                                {/* 4. Delete Trash Button (Red) */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteBarang(item, e)}
                                  title="Hapus Data"
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                  <Trash2 size={13} />
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

              {/* Pagination Level 2 (Barang) */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px',
                fontSize: '11px',
                color: '#64748b'
              }}>
                <div>
                  Menampilkan <b>{filteredPenitipanForMitra.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> - <b>{Math.min(currentPage * entriesPerPage, filteredPenitipanForMitra.length)}</b> dari <b>{filteredPenitipanForMitra.length}</b> barang titipan
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
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>
                    Halaman {currentPage} / {Math.max(1, Math.ceil(filteredPenitipanForMitra.length / entriesPerPage))}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= Math.ceil(filteredPenitipanForMitra.length / entriesPerPage)}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: currentPage >= Math.ceil(filteredPenitipanForMitra.length / entriesPerPage) ? '#f1f5f9' : '#ffffff',
                      color: currentPage >= Math.ceil(filteredPenitipanForMitra.length / entriesPerPage) ? '#94a3b8' : '#334155',
                      cursor: currentPage >= Math.ceil(filteredPenitipanForMitra.length / entriesPerPage) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 CONTENT: TABEL HISTORI PEMBAYARAN KE MITRA */}
          {mitraActiveTab === 'pembayaran' && (
            <div>
              <div style={{
                overflowX: 'auto',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)'
              }}>
                <table
                  className="table-bordered-hover"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <thead>
                    <tr style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #cbd5e1',
                      color: '#475569',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '35px', border: '1px solid #cbd5e1' }}>NO</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left', width: '150px', border: '1px solid #cbd5e1' }}>NO. BUKTI & TGL</th>
                      <th style={{ padding: '5px 8px', textAlign: 'right', width: '140px', backgroundColor: '#f0fdf4', border: '1px solid #cbd5e1' }}>NOMINAL DIBAYAR</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left', width: '160px', border: '1px solid #cbd5e1' }}>METODE PEMBAYARAN</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left', width: '150px', border: '1px solid #cbd5e1' }}>NO. REFERENSI / TRF</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left', minWidth: '180px', border: '1px solid #cbd5e1' }}>CATATAN</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left', width: '110px', border: '1px solid #cbd5e1' }}>PETUGAS</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '60px', border: '1px solid #cbd5e1' }}>AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPembayaranForMitra.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', border: '1px solid #cbd5e1' }}>
                          <DollarSign size={28} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                            Belum ada histori pembayaran untuk mitra {selectedMitra.nama_mitra}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenBayarMitra(selectedMitra)}
                            style={{
                              marginTop: '8px',
                              padding: '5px 12px',
                              borderRadius: '4px',
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            + Catat Pembayaran Sekarang
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredPembayaranForMitra.map((byr, idx) => (
                        <tr
                          key={byr.id || idx}
                          style={{
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b', fontWeight: '700', border: '1px solid #cbd5e1' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                            <div style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0369a1', fontSize: '11px' }}>
                              {byr.no_pembayaran}
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                              <Calendar size={10} />
                              <span>{byr.tanggal}</span>
                            </div>
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', backgroundColor: '#f0fdf4', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '13px', fontWeight: '900', color: '#15803d' }}>
                              {formatRp(byr.nominal)}
                            </div>
                          </td>
                          <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              <CreditCard size={11} color="#0284c7" />
                              <span>{byr.metode_pembayaran}</span>
                            </span>
                          </td>
                          <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '11px', color: '#0f172a' }}>
                            {byr.no_referensi || '-'}
                          </td>
                          <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle', fontSize: '11px', color: '#475569' }}>
                            {byr.catatan || '-'}
                          </td>
                          <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle', fontSize: '11px', color: '#64748b' }}>
                            {byr.petugas || '-'}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              onClick={(e) => handleDeletePembayaran(byr, e)}
                              title="Hapus Bukti Pembayaran"
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: TAMBAH & EDIT MITRA PENITIP                                */}
      {/* =================================================================== */}
      {isMitraModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '12px 18px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  {editingMitraId ? 'Edit Data Mitra Penitip' : 'Tambah Mitra Penitip Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMitraModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Mitra */}
            <form onSubmit={handleSaveMitra} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Nama Mitra / Pemilik Barang <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mitraForm.nama_mitra}
                    onChange={(e) => setMitraForm({ ...mitraForm, nama_mitra: e.target.value })}
                    placeholder="Contoh: Konveksi Berkah Mandiri (Pak Joko)"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      No. Kontak / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={mitraForm.kontak}
                      onChange={(e) => setMitraForm({ ...mitraForm, kontak: e.target.value })}
                      placeholder="0812-3456-7890"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Nama Bank
                    </label>
                    <input
                      type="text"
                      value={mitraForm.bank_nama}
                      onChange={(e) => setMitraForm({ ...mitraForm, bank_nama: e.target.value })}
                      placeholder="BCA / BRI / Mandiri / BSI"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Nomor Rekening Bank
                    </label>
                    <input
                      type="text"
                      value={mitraForm.bank_rekening}
                      onChange={(e) => setMitraForm({ ...mitraForm, bank_rekening: e.target.value })}
                      placeholder="1234567890"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Atas Nama Rekening
                    </label>
                    <input
                      type="text"
                      value={mitraForm.bank_atas_nama}
                      onChange={(e) => setMitraForm({ ...mitraForm, bank_atas_nama: e.target.value })}
                      placeholder="Nama pemilik rek"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Alamat Lengkap Mitra
                  </label>
                  <textarea
                    rows={2}
                    value={mitraForm.alamat}
                    onChange={(e) => setMitraForm({ ...mitraForm, alamat: e.target.value })}
                    placeholder="Alamat kantor / gudang / tempat produksi mitra..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                      resize: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Catatan / Perjanjian Kerjasama
                  </label>
                  <input
                    type="text"
                    value={mitraForm.keterangan}
                    onChange={(e) => setMitraForm({ ...mitraForm, keterangan: e.target.value })}
                    placeholder="Sistem konsinyasi, tempo pelunasan..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Footer Modal Mitra */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => setIsMitraModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '5px',
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
                  disabled={isSaving}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={13} />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Mitra'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: CATAT PEMBAYARAN KE MITRA                                  */}
      {/* =================================================================== */}
      {isBayarModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '12px 18px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={18} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  Catat Pembayaran ke Mitra Konsinyasi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBayarModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePembayaran} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Pilih Mitra */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Pilih Mitra Penerima Pembayaran <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={bayarForm.mitra_id || ''}
                    onChange={(e) => {
                      const m = mitraList.find(item => String(item.id) === String(e.target.value));
                      if (m) {
                        setBayarForm({
                          ...bayarForm,
                          mitra_id: m.id,
                          nama_mitra: m.nama_mitra,
                          nominal: Number(m.sisa_hutang || 0),
                          metode_pembayaran: m.bank_nama ? `Transfer Bank ${m.bank_nama}` : 'Transfer Bank BCA',
                          catatan: `Pembayaran konsinyasi produk terjual untuk ${m.nama_mitra}`
                        });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: '1.5px solid #0284c7',
                      fontSize: '12px',
                      fontWeight: '700',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="">-- Pilih Mitra --</option>
                    {mitraList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nama_mitra} (Hutang: {formatRp(m.sisa_hutang)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Box Info Sisa Hutang Mitra */}
                {bayarForm.mitra_id && (
                  (() => {
                    const mInfo = mitraList.find(m => String(m.id) === String(bayarForm.mitra_id));
                    if (!mInfo) return null;
                    return (
                      <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>STATUS KEWAJIBAN SAAT INI</div>
                          <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                            Wajib: <b>{formatRp(mInfo.total_kewajiban_bayar)}</b> · Dibayar: <b style={{ color: '#16a34a' }}>{formatRp(mInfo.total_sudah_dibayar)}</b>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', color: '#b45309', fontWeight: '700' }}>SISA HUTANG</div>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: Number(mInfo.sisa_hutang) > 0 ? '#dc2626' : '#16a34a' }}>
                            {formatRp(mInfo.sisa_hutang)}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Tanggal Pembayaran <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={bayarForm.tanggal}
                      onChange={(e) => setBayarForm({ ...bayarForm, tanggal: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Nominal Bayar (Rp) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={bayarForm.nominal}
                      onChange={(e) => setBayarForm({ ...bayarForm, nominal: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1.5px solid #10b981',
                        fontSize: '14px',
                        fontWeight: '900',
                        color: '#15803d',
                        backgroundColor: '#f0fdf4',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Metode Pembayaran
                    </label>
                    <input
                      type="text"
                      value={bayarForm.metode_pembayaran}
                      onChange={(e) => setBayarForm({ ...bayarForm, metode_pembayaran: e.target.value })}
                      placeholder="Transfer BCA / Tunai / BSI"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      No. Referensi / Bukti Transfer
                    </label>
                    <input
                      type="text"
                      value={bayarForm.no_referensi}
                      onChange={(e) => setBayarForm({ ...bayarForm, no_referensi: e.target.value })}
                      placeholder="TRF-BCA-12345"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Catatan Pembayaran
                  </label>
                  <input
                    type="text"
                    value={bayarForm.catatan}
                    onChange={(e) => setBayarForm({ ...bayarForm, catatan: e.target.value })}
                    placeholder="Pelunasan barang laku bulan Oktober..."
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Footer Modal Bayar */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => setIsBayarModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '5px',
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
                  disabled={isSaving}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={13} />
                  <span>{isSaving ? 'Menyimpan...' : 'Konfirmasi Pembayaran'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: FULLSCREEN FORM INPUT / EDIT BARANG TITIPAN                */}
      {/* (HARGA JUAL DIHILANGKAN, TAMPILAN JAUH LEBIH MENARIK)               */}
      {/* =================================================================== */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ffffff',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header Fullscreen */}
          <div style={{
            height: '52px',
            padding: '0 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Warehouse size={18} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  {editingId ? 'Edit Data Barang Titipan (Konsinyasi)' : 'Catat Barang Titipan Baru'}
                </h3>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  Pencatatan barang konsinyasi mitra dengan rincian stok & nilai modal titip
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '5px',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSaveBarang} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                
                {/* CARD KIRI: MITRA PENITIP & INFORMASI DOKUMEN */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                    <Building size={16} color="#0284c7" />
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      1. MITRA PENITIP & DOKUMEN
                    </h4>
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
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        No. Bukti Titipan
                      </label>
                      <input
                        type="text"
                        value={formData.no_titipan}
                        onChange={(e) => setFormData({ ...formData, no_titipan: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          backgroundColor: '#f8fafc',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Pilih Dari Mitra Terdaftar */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Pilih Dari Master Mitra Penitip:
                    </label>
                    <select
                      value={formData.mitra_id || ''}
                      onChange={(e) => {
                        const m = mitraList.find(item => String(item.id) === String(e.target.value));
                        if (m) {
                          setFormData({
                            ...formData,
                            mitra_id: m.id,
                            nama_penitip: m.nama_mitra,
                            kontak_penitip: m.kontak || ''
                          });
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1.5px solid #0284c7',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: '#f0f9ff'
                      }}
                    >
                      <option value="">-- Ketik Manual atau Pilih Mitra --</option>
                      {mitraList.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nama_mitra} {m.kontak ? `(${m.kontak})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Nama Mitra / Penitip <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nama_penitip}
                        onChange={(e) => setFormData({ ...formData, nama_penitip: e.target.value })}
                        placeholder="Nama konveksi / produsen..."
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        No. Telepon / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={formData.kontak_penitip}
                        onChange={(e) => setFormData({ ...formData, kontak_penitip: e.target.value })}
                        placeholder="0812-xxxx-xxxx"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
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
                        Lokasi Rak / Penyimpanan
                      </label>
                      <input
                        type="text"
                        value={formData.lokasi_rak}
                        onChange={(e) => setFormData({ ...formData, lokasi_rak: e.target.value })}
                        placeholder="Rak Konsinyasi A-01"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Petugas Penerima Gudang
                      </label>
                      <input
                        type="text"
                        value={formData.petugas}
                        onChange={(e) => setFormData({ ...formData, petugas: e.target.value })}
                        placeholder="Nama staff"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Catatan / Perjanjian Penitipan
                    </label>
                    <textarea
                      rows={3}
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      placeholder="Instruksi konsinyasi, kondisi barang saat diterima, catatan khusus..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                {/* CARD KANAN: IDENTITAS PRODUK, HARGA TITIP & STOK */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                    <Boxes size={16} color="#0284c7" />
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      2. PRODUK TITIPAN, HARGA TITIP & JUMLAH STOK
                    </h4>
                  </div>

                  {/* Autocomplete dari Master Produk */}
                  {masterProdukList.length > 0 && (
                    <SearchableSelect
                      label="Cari dari Master Produk (Opsional Autocomplete):"
                      value={formData.kode_sku}
                      options={masterProdukList.map(p => ({
                        value: p.sku,
                        sku: p.sku,
                        label: `${p.sku} - ${p.nama_produk}`,
                        nama_produk: p.nama_produk,
                        varian: p.varian,
                        satuan: p.satuan || 'PCS',
                        harga_beli: p.harga_beli || 0
                      }))}
                      placeholder="-- Ketik SKU / Nama Produk Master --"
                      onChange={handleSelectMasterProduk}
                    />
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Kode SKU Barang <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.kode_sku}
                        onChange={(e) => setFormData({ ...formData, kode_sku: e.target.value })}
                        placeholder="TITIP-MUKENA-01"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Varian / Ukuran / Warna
                      </label>
                      <input
                        type="text"
                        value={formData.varian}
                        onChange={(e) => setFormData({ ...formData, varian: e.target.value })}
                        placeholder="Contoh: All Size / Putih"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
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
                      placeholder="Nama lengkap barang konsinyasi..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: '700',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* HARGA TITIP SATUAN & SATUAN (MURNI HARGA TITIP, HARGA JUAL DIHILANGKAN!) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0284c7', marginBottom: '3px' }}>
                        Harga Titip / Satuan (Rp) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.harga_titip}
                        onChange={(e) => setFormData({ ...formData, harga_titip: Number(e.target.value) })}
                        placeholder="120000"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1.5px solid #0284c7',
                          fontSize: '14px',
                          fontWeight: '900',
                          color: '#0369a1',
                          backgroundColor: '#f0f9ff',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Satuan Barang
                      </label>
                      <select
                        value={formData.satuan}
                        onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <option value="PCS">PCS</option>
                        <option value="SET">SET</option>
                        <option value="LUSIN">LUSIN</option>
                        <option value="KODI">KODI</option>
                        <option value="LEMBAR">LEMBAR</option>
                        <option value="METER">METER</option>
                        <option value="ROLL">ROLL</option>
                      </select>
                    </div>
                  </div>

                  {/* QTY STOK MASUK, TERJUAL & RETUR */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0369a1', marginBottom: '3px' }}>
                        Qty Masuk Gudang <span style={{ color: '#ef4444' }}>*</span>
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
                          fontSize: '14px',
                          fontWeight: '900',
                          textAlign: 'center',
                          color: '#0369a1',
                          backgroundColor: '#f0f9ff',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#15803d', marginBottom: '3px' }}>
                        Qty Terjual (Laku)
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
                          fontSize: '14px',
                          fontWeight: '900',
                          textAlign: 'center',
                          color: '#15803d',
                          backgroundColor: '#f0fdf4',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#dc2626', marginBottom: '3px' }}>
                        Qty Retur / Rusak
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.qty_retur}
                        onChange={(e) => setFormData({ ...formData, qty_retur: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '5px',
                          border: '1px solid #f87171',
                          fontSize: '14px',
                          fontWeight: '800',
                          textAlign: 'center',
                          color: '#b91c1c',
                          backgroundColor: '#fef2f2',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* KOTAK KALKULASI REALTIME LIVE PREVIEW (MURNI HARGA TITIP & KEWAJIBAN) */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    padding: '12px',
                    marginTop: '4px'
                  }}>
                    <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Kalkulasi Otomatis Stok & Kewajiban Mitra:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                      <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#0369a1' }}>TOTAL MASUK</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>
                          {formData.qty_titip} {formData.satuan}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#0369a1', marginTop: '1px' }}>
                          {formatRp(previewRpMasuk)}
                        </div>
                      </div>

                      <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#15803d' }}>TERJUAL (WAJIB SETOR)</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>
                          {formData.qty_terjual} {formData.satuan}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: '#15803d', marginTop: '1px' }}>
                          {formatRp(previewRpTerjualKewajiban)}
                        </div>
                      </div>

                      <div style={{ padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1.5px solid #ddd6fe' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: '800', color: '#7c3aed' }}>SISA DI GUDANG</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#7c3aed', marginTop: '2px' }}>
                          {previewSisa} {formData.satuan}
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: '#7c3aed', marginTop: '1px' }}>
                          {formatRp(previewRpSisa)}
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
              justifyContent: 'flex-end',
              gap: '10px',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{
                  padding: '8px 18px',
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
                disabled={isSaving}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)'
                }}
              >
                <Save size={14} />
                <span>{isSaving ? 'Menyimpan...' : (editingId ? 'Perbarui Data Penitipan' : 'Simpan Barang Titipan')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: CATAT LAKU TERJUAL CEPAT                                   */}
      {/* =================================================================== */}
      {isJualModalOpen && selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '12px 18px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  Catat Laku Terjual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJualModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSimpanPenjualanCepat} style={{ padding: '16px 18px' }}>
              <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Produk Titipan:</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {selectedItem.nama_produk}
                </div>
                <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '1px' }}>
                  SKU: {selectedItem.kode_sku} · Mitra: <b>{selectedItem.nama_penitip}</b>
                </div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', marginTop: '4px' }}>
                  Harga Titip: {formatRp(selectedItem.harga_titip)} / {selectedItem.satuan}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#15803d', marginBottom: '3px' }}>
                  Jumlah Terjual (Maks: {selectedItem.sisa_stok} {selectedItem.satuan}) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.sisa_stok}
                  required
                  value={jualQty}
                  onChange={(e) => setJualQty(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '5px',
                    border: '1.5px solid #16a34a',
                    fontSize: '16px',
                    fontWeight: '900',
                    textAlign: 'center',
                    color: '#15803d',
                    backgroundColor: '#f0fdf4',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Rincian Wajib Setor ke Mitra dari Penjualan Ini */}
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '6px',
                border: '1px solid #bbf7d0',
                padding: '10px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d' }}>
                  Total Kewajiban Disetor ke Mitra:
                </span>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#16a34a' }}>
                  {formatRp(Number(jualQty) * Number(selectedItem.harga_titip))}
                </span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Keterangan / Nomor Pesanan / Pembeli
                </label>
                <input
                  type="text"
                  value={jualKeterangan}
                  onChange={(e) => setJualKeterangan(e.target.value)}
                  placeholder="Contoh: Terjual di toko offline / via WhatsApp"
                  style={{
                    width: '100%',
                    padding: '7px 10px',
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
                    padding: '7px 14px',
                    borderRadius: '5px',
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
                  disabled={isSaving}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Penjualan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 5: DETAIL SHOW TRANSAKSI TITIPAN (JAUH LEBIH MENARIK)         */}
      {/* =================================================================== */}
      {isDetailModalOpen && selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ffffff',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            height: '52px',
            padding: '0 20px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Warehouse size={20} />
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  Rincian Dokumen Penitipan: {selectedItem.no_titipan}
                </h3>
                <div style={{ fontSize: '11px', color: '#e0f2fe' }}>
                  Tanggal: {selectedItem.tanggal} · Mitra: {selectedItem.nama_penitip}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDetailModalOpen(false)}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Show Modal */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', backgroundColor: '#f8fafc' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px'
            }}>
              
              {/* Card 1: Mitra & Dokumen */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <Building size={16} color="#0284c7" />
                  <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                    INFORMASI MITRA & DOKUMEN
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Nama Mitra:</span>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>{selectedItem.nama_penitip}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>No. Kontak:</span>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{selectedItem.kontak_penitip || '-'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Lokasi Rak / Penyimpanan:</span>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{selectedItem.lokasi_rak || 'Gudang Konsinyasi'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Petugas Penerima:</span>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{selectedItem.petugas || 'Staff Gudang'}</div>
                  </div>
                </div>
              </div>

              {/* Card 2: Identitas Produk */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <Boxes size={16} color="#0284c7" />
                  <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                    SPESIFIKASI PRODUK TITIPAN
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Kode SKU:</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0284c7', fontSize: '13px' }}>
                      {selectedItem.kode_sku}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Nama Produk:</span>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>{selectedItem.nama_produk}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Varian / Ukuran:</span>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{selectedItem.varian || 'Reguler'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Satuan:</span>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{selectedItem.satuan}</div>
                  </div>
                </div>
              </div>

              {/* Card 3: Finansial & Stok (MURNI HARGA TITIP, NO HARGA JUAL!) */}
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <DollarSign size={16} color="#10b981" />
                  <h4 style={{ margin: 0, fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                    FINANSIAL & REKAP STOK
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#64748b' }}>Harga Titip Satuan:</span>
                    <span style={{ fontWeight: '900', color: '#0f172a', fontSize: '13px' }}>
                      {formatRp(selectedItem.harga_titip)} / {selectedItem.satuan}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#0369a1' }}>Total Masuk Gudang:</span>
                    <span style={{ fontWeight: '800', color: '#0369a1' }}>
                      {selectedItem.qty_titip} {selectedItem.satuan} ({formatRp(selectedItem.rp_total_titip)})
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ color: '#15803d' }}>Terjual (Kewajiban Setor):</span>
                    <span style={{ fontWeight: '900', color: '#16a34a' }}>
                      {selectedItem.qty_terjual} {selectedItem.satuan} ({formatRp(selectedItem.rp_terjual_modal)})
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7c3aed' }}>Sisa Fisik di Gudang:</span>
                    <span style={{ fontWeight: '900', color: '#7c3aed' }}>
                      {selectedItem.sisa_stok} {selectedItem.satuan} ({formatRp(selectedItem.rp_sisa_stok_modal)})
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Catatan Dokumen */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '14px 16px',
              marginTop: '16px'
            }}>
              <h5 style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                CATATAN & KETERANGAN TAMBAHAN
              </h5>
              <div style={{ fontSize: '12px', color: '#334155', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {selectedItem.keterangan || 'Tidak ada catatan khusus.'}
              </div>
            </div>
          </div>

          {/* Footer Detail */}
          <div style={{
            height: '52px',
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
                padding: '7px 16px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '7px 16px',
                borderRadius: '5px',
                border: '1px solid #0f172a',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '12px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Printer size={13} />
              <span>Cetak Bukti Penitipan</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
