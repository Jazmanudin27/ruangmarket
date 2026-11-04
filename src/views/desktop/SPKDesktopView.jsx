import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ClipboardList,
  Plus,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Layers,
  Scissors,
  Calendar,
  Eye,
  CheckCircle2,
  Package,
  User,
  Trash2,
  Edit3,
  X,
  Save,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  Building,
  Check,
  Tag,
  Boxes,
  Sparkles,
  Image as ImageIcon,
  Upload,
  ZoomIn,
  Calculator,
  Coins,
  QrCode,
} from "lucide-react";
import { showConfirm, toastSuccess, toastError } from "../../utils/alert.util";
import { INITIAL_BATCH_PRODUKSI } from "../../data/initialSPK";
import { INITIAL_KARYAWAN_DATA } from "../../data/initialKaryawan";
import { INITIAL_PRODUK_DATA } from "../../data/initialProduk";
import { KARYAWAN_STORAGE_KEY } from "./KaryawanDesktopView";
import { INITIAL_PELANGGAN_DATA } from "./PelangganDesktopView";
import { INITIAL_TAHAPAN_DATA } from "./TahapanSPKDesktopView";
import { getActiveCompany } from "../../utils/tenant.util";
import CetakSPKModal from "../../components/CetakSPKModal";
import CetakLabelBarcodeSPKModal from "../../components/CetakLabelBarcodeSPKModal";
import ModalScanSelesaiSPK from "../../components/ModalScanSelesaiSPK";
import ModalDetailHPP from "../../components/ModalDetailHPP";

export const SPK_STORAGE_KEY = "ruangmarket_spk_v2"; // version bump for new nested structure
const PRODUK_STORAGE_KEY = "ruangmarket_produk_gamis_v4";

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

// Helper format angka ribuan Indonesia
const formatNumberId = (val) => {
  if (val === undefined || val === null || val === "" || isNaN(val)) return "";
  return Number(val).toLocaleString("id-ID");
};

// Helper parse input ribuan ke angka murni
const parseNumberId = (str) => {
  if (!str) return 0;
  const clean = String(str).replace(/[^0-9]/g, "");
  return Number(clean) || 0;
};

// Searchable Select Component with instant search filter
function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  required = false,
  renderItem,
  fallbackLabel = "",
  fallbackSku = "",
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
        : `${opt.label || opt.value || opt.nama_produk || opt.nama || ""} ${opt.sku || ""} ${opt.kategori || ""} ${opt.nama_kain || opt.sku_kain || ""}`
    ).toLowerCase();
    return searchTerms.every((term) => text.includes(term));
  });

  const selectedFound = safeOptions.find((opt) => {
    if (typeof opt === "string") {
      return (
        opt === value ||
        (value && String(opt).toLowerCase() === String(value).toLowerCase()) ||
        (fallbackLabel && String(opt).toLowerCase() === String(fallbackLabel).toLowerCase())
      );
    }
    if (value !== undefined && value !== null && value !== "" && String(opt.value) === String(value)) {
      return true;
    }
    if (fallbackSku && opt.sku && String(opt.sku).trim().toLowerCase() === String(fallbackSku).trim().toLowerCase()) {
      return true;
    }
    if (fallbackLabel && (opt.label || opt.nama_produk) && String(opt.label || opt.nama_produk).trim().toLowerCase() === String(fallbackLabel).trim().toLowerCase()) {
      return true;
    }
    return false;
  });

  const selectedDisplay = () => {
    if (selectedFound) {
      if (typeof selectedFound === "string") return selectedFound;
      return (
        selectedFound.displayLabel ||
        selectedFound.label ||
        selectedFound.nama_produk ||
        selectedFound.value
      );
    }
    if (fallbackLabel) {
      return fallbackLabel.length > 40
        ? fallbackLabel.slice(0, 40).trimEnd() + "..."
        : fallbackLabel;
    }
    return placeholder;
  };

  const selectedTitle =
    selectedFound && typeof selectedFound !== "string"
      ? selectedFound.label || selectedFound.nama_produk || ""
      : selectedFound || fallbackLabel || "";

  const hasSelected = Boolean(value || fallbackLabel || selectedFound);

  return (
    <div style={{ position: "relative", width: "100%" }} ref={wrapperRef}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "10.5px",
            fontWeight: "700",
            color: "#334155",
            marginBottom: "3px",
          }}
        >
          {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "100%",
          padding: "4px 8px",
          borderRadius: "5px",
          border: isOpen ? "1px solid #0284c7" : "1px solid #cbd5e1",
          fontSize: "11px",
          fontWeight: "600",
          color: hasSelected ? "#0f172a" : "#94a3b8",
          backgroundColor: "#ffffff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
          textAlign: "left",
          boxShadow: isOpen ? "0 0 0 2px rgba(2, 132, 199, 0.15)" : "none",
          transition: "all 0.15s ease",
        }}
      >
        <span
          title={selectedTitle}
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedDisplay()}
        </span>
        <ChevronDown
          size={12}
          color="#64748b"
          style={{
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "3px",
            backgroundColor: "#ffffff",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25)",
            zIndex: 9999,
            maxHeight: "280px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px",
              borderBottom: "1px solid #f1f5f9",
              backgroundColor: "#f8fafc",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "3px 7px",
              }}
            >
              <Search size={12} color="#94a3b8" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Ketik untuk mencari produk / SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "11px",
                  width: "100%",
                  color: "#0f172a",
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1, padding: "3px 0" }}>
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "8px",
                  fontSize: "11px",
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                Tidak ditemukan
              </div>
            ) : (
              filteredOptions.map((opt, i) => {
                const optVal = typeof opt === "string" ? opt : opt.value;
                const optLabel =
                  typeof opt === "string" ? opt : opt.label || opt.value;
                const isSelected = selectedFound
                  ? typeof opt === "string"
                    ? opt ===
                      (typeof selectedFound === "string"
                        ? selectedFound
                        : selectedFound.value)
                    : String(opt.value) === String(selectedFound.value)
                  : optVal === value;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      onChange(optVal, opt);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    style={{
                      padding: "6px 10px",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: isSelected ? "#f0f9ff" : "transparent",
                      color: isSelected ? "#0284c7" : "#1e293b",
                      fontWeight: isSelected ? "700" : "500",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {renderItem ? (
                      renderItem(opt, isSelected)
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                            overflow: "hidden",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              color: isSelected ? "#0284c7" : "#0f172a",
                              fontWeight: isSelected ? "700" : "600",
                              lineHeight: 1.3,
                            }}
                          >
                            {optLabel}
                          </span>
                          {opt.sku && (
                            <span
                              style={{
                                fontSize: "9.5px",
                                color: "#64748b",
                                fontFamily: "monospace",
                                fontWeight: "600",
                              }}
                            >
                              SKU:{" "}
                              <span style={{ color: "#0284c7" }}>
                                {opt.sku}
                              </span>
                              {opt.kategori && (
                                <span
                                  style={{
                                    marginLeft: "6px",
                                    color: "#94a3b8",
                                  }}
                                >
                                  • {opt.kategori}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check
                            size={14}
                            color="#0284c7"
                            style={{ flexShrink: 0 }}
                          />
                        )}
                      </div>
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

const DEFAULT_KAIN_OPTIONS = [
  { id: 1, kode_sku_kain: "KB-TH-MERAH", nama_kain: "Kain Batik Tunas Harapan Merah", harga_per_meter: 15000 },
  { id: 2, kode_sku_kain: "KB-BR-ABU", nama_kain: "Kain Batik Bunga Rampai Abu", harga_per_meter: 25000 },
  { id: 3, kode_sku_kain: "KN-DRILL-NGT", nama_kain: "Kain Drill Nagata", harga_per_meter: 28000 },
  { id: 4, kode_sku_kain: "KN-TOYOBO", nama_kain: "Kain Katun Toyobo Fodu", harga_per_meter: 32000 },
  { id: 5, kode_sku_kain: "KN-MADINAH", nama_kain: "Kain Katun Madinah", harga_per_meter: 24000 },
  { id: 6, kode_sku_kain: "KN-RAYON-TWL", nama_kain: "Kain Rayon Twill Premium", harga_per_meter: 22000 },
];

export default function SPKView() {
  const [batchList, setBatchList] = useState([]);
  const [isLoadingSpk, setIsLoadingSpk] = useState(false);

  const loadSpkData = async () => {
    setIsLoadingSpk(true);
    try {
      const res = await fetch(`/api/marketplace/spk?kode_perusahaan=${activeCompany?.code || "RSG"}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          setBatchList(json.data);
          try {
            localStorage.setItem(SPK_STORAGE_KEY, JSON.stringify(json.data));
          } catch (e) {}
          setIsLoadingSpk(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Gagal load SPK dari MySQL:", e);
    }
    // Fallback jika offline
    try {
      const saved = localStorage.getItem(SPK_STORAGE_KEY);
      if (saved) {
        setBatchList(JSON.parse(saved) || []);
      }
    } catch (e) {}
    setIsLoadingSpk(false);
  };

  const [karyawanOptions, setKaryawanOptions] = useState(() => {
    try {
      const saved = localStorage.getItem(KARYAWAN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_KARYAWAN_DATA;
  });

  const [produkList, setProdukList] = useState(() => {
    try {
      const saved = localStorage.getItem(PRODUK_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_PRODUK_DATA;
  });

  const [pelangganOptions, setPelangganOptions] = useState(INITIAL_PELANGGAN_DATA);

  const loadPelangganOptions = async () => {
    try {
      const res = await fetch(`/api/marketplace/pelanggan?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          setPelangganOptions(json.data);
          try {
            localStorage.setItem('ruangmarket_pelanggan_master', JSON.stringify(json.data));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {}
    try {
      const saved = localStorage.getItem('ruangmarket_pelanggan_master');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPelangganOptions(parsed);
          return;
        }
      }
    } catch (e) {}
    setPelangganOptions(INITIAL_PELANGGAN_DATA);
  };

  const [tahapanOptions, setTahapanOptions] = useState(INITIAL_TAHAPAN_DATA);

  const loadTahapanOptions = async () => {
    try {
      const res = await fetch(`/api/marketplace/tahapan-spk?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          setTahapanOptions(json.data);
          try {
            localStorage.setItem('ruangmarket_tahapan_spk_master', JSON.stringify(json.data));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {}
    try {
      const saved = localStorage.getItem('ruangmarket_tahapan_spk_master');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTahapanOptions(parsed);
          return;
        }
      }
    } catch (e) {}
    setTahapanOptions(INITIAL_TAHAPAN_DATA);
  };

  const loadProdukList = async () => {
    try {
      const res = await fetch(
        `/api/marketplace/master?limit=5000&sort=nama_produk${activeCompany?.code ? `&kode_perusahaan=${activeCompany.code}` : ""}`,
      );
      if (res.ok) {
        const json = await res.json();
        const rawData = Array.isArray(json) ? json : json.data || [];
        if (rawData.length > 0) {
          const mapped = rawData.map((p) => ({
            id: p.id,
            company_code: p.kode_perusahaan || "RSG",
            nama_produk: p.nama_produk,
            sku: p.kode_sku || p.sku || "",
            kategori: p.kategori || "Umum",
            tipe_set: p.tipe_set || "Single",
            satuan: p.satuan || "PCS",
            harga_beli: Number(p.harga_modal || 0),
            hpp: Number(p.harga_modal || p.cost_price || p.hpp || 0),
            harga_jual: Number(p.harga_jual || 0),
            sku_kain: p.sku_kain || "",
            nama_kain: p.nama_kain || "",
            panjang_kain_cm: (() => {
              const raw = p.estimasi_kain ?? p.panjang_kain_cm;
              const num = parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
              return !isNaN(num) && num > 0 ? Math.round(num) : 200;
            })(),
            estimasi_kain: (() => {
              const raw = p.estimasi_kain ?? p.panjang_kain_cm;
              const num = parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
              return !isNaN(num) && num > 0 ? Math.round(num) : 200;
            })(),
            harga_kain_cm: Number(p.harga_kain_cm || 150),
            bundle_items: Array.isArray(p.bundle_items) ? p.bundle_items : [],
          }));

          // Merge produk initial jika belum ada di database untuk kelengkapan katalog
          const existingSkus = new Set(mapped.map((p) => String(p.sku).trim().toUpperCase()));
          INITIAL_PRODUK_DATA.forEach((initP) => {
            const initSku = String(initP.sku || initP.kode_sku || "").trim().toUpperCase();
            if (initSku && !existingSkus.has(initSku)) {
              mapped.push({
                ...initP,
                sku: initP.sku || initP.kode_sku || "",
                hpp: Number(initP.harga_modal || initP.hpp || 0),
                panjang_kain_cm: Number(initP.panjang_kain_cm || 200),
                estimasi_kain: Number(initP.panjang_kain_cm || 200),
                harga_kain_cm: Number(initP.harga_kain_cm || 150),
              });
              existingSkus.add(initSku);
            }
          });

          // Urutkan natural berdasarkan nama & size
          mapped.sort(compareProducts);

          setProdukList(mapped);
          try {
            localStorage.setItem(PRODUK_STORAGE_KEY, JSON.stringify(mapped));
          } catch (e) {}
          return;
        }
      }
    } catch (err) {
      console.warn("Gagal load master produk dari API:", err);
    }
  };

  const [kainOptions, setKainOptions] = useState(() => {
    try {
      const saved = localStorage.getItem("ruangmarket_kain_master_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_KAIN_OPTIONS;
  });

  const loadKainOptions = async () => {
    try {
      const res = await fetch(`/api/kain/master`);
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json) ? json : json.data || [];
        if (data.length > 0) {
          setKainOptions(data);
          try {
            localStorage.setItem("ruangmarket_kain_master_v1", JSON.stringify(data));
          } catch (e) {}
          return;
        }
      }
    } catch (e) {}
  };

  const [activeCompany, setActiveCompany] = useState(getActiveCompany);

  useEffect(() => {
    const handleCompanyChange = () => {
      setActiveCompany(getActiveCompany());
    };
    window.addEventListener("companyChange", handleCompanyChange);
    return () =>
      window.removeEventListener("companyChange", handleCompanyChange);
  }, []);

  useEffect(() => {
    loadSpkData();
    loadPelangganOptions();
    loadTahapanOptions();
    loadProdukList();
    loadKainOptions();
  }, [activeCompany]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterPenjahit, setFilterPenjahit] = useState("Semua");
  const [filterTahapan, setFilterTahapan] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [detailSpk, setDetailSpk] = useState(null);
  const [detailBatch, setDetailBatch] = useState(null);
  const [detailActiveSpkIdx, setDetailActiveSpkIdx] = useState(0);
  const [selectPrintBatch, setSelectPrintBatch] = useState(null);
  const [expandedBatch, setExpandedBatch] = useState({});
  const [activeTabSpkIdx, setActiveTabSpkIdx] = useState(0);
  const [editKainModal, setEditKainModal] = useState(null);
  const [hppModalData, setHppModalData] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewDesign, setPreviewDesign] = useState(null); // { url, title }
  const [printModalData, setPrintModalData] = useState(null); // { batch, spk } (A4)
  const [printLabelModalData, setPrintLabelModalData] = useState(null); // { batch, spk } (100mm x 150mm Thermal)
  const [isScanModalOpen, setIsScanModalOpen] = useState(false); // Modal scanner barcode SPK
  const [pelangganModal, setPelangganModal] = useState(null); // Modal Tambah/Edit Pelanggan dari SPK
  const [savingPelanggan, setSavingPelanggan] = useState(false);

  // Handlers Master Pelanggan (Tambah, Edit, Hapus dari dalam SPK)
  const handleOpenAddPelanggan = () => {
    const nextNum = (pelangganOptions?.length || 0) + 1;
    const autoKode = `PLG-${new Date().getFullYear()}-${String(nextNum).padStart(3, "0")}`;
    setPelangganModal({
      isOpen: true,
      mode: "add",
      data: {
        kode_pelanggan: autoKode,
        nama_pelanggan: "",
        no_hp: "",
        alamat: "",
        status: "Aktif",
        kategori_pelanggan: "Umum",
      },
    });
  };

  const handleOpenEditPelanggan = (item) => {
    if (!item) return;
    setPelangganModal({
      isOpen: true,
      mode: "edit",
      data: {
        id: item.id || null,
        kode_pelanggan: item.kode_pelanggan || "",
        nama_pelanggan: item.nama_pelanggan || "",
        no_hp: item.no_hp || "",
        alamat: item.alamat || "",
        status: item.status || "Aktif",
        kategori_pelanggan: item.kategori_pelanggan || "Umum",
      },
    });
  };

  const handleDeletePelanggan = async (item) => {
    if (!item) return;
    const confirmed = await showConfirm(
      "Hapus Pelanggan?",
      `Yakin ingin menghapus pelanggan "${item.nama_pelanggan}" dari database?`,
      "Ya, Hapus",
      "Batal",
    );
    if (!confirmed) return;

    try {
      if (item.id) {
        await fetch(`/api/marketplace/pelanggan?id=${item.id}`, { method: "DELETE" });
      }
      setPelangganOptions((prev) => prev.filter((p) => p.id !== item.id && p.nama_pelanggan !== item.nama_pelanggan));
      if (formData.nama_pelanggan === item.nama_pelanggan) {
        setFormData((prev) => ({ ...prev, nama_pelanggan: "" }));
      }
      toastSuccess(`Pelanggan "${item.nama_pelanggan}" berhasil dihapus`);
      loadPelangganOptions();
    } catch (err) {
      toastError("Gagal menghapus pelanggan: " + err.message);
    }
  };

  const handleSavePelanggan = async (e) => {
    if (e) e.preventDefault();
    if (!pelangganModal?.data?.nama_pelanggan?.trim()) {
      toastError("Nama Pelanggan wajib diisi!");
      return;
    }

    setSavingPelanggan(true);
    try {
      const payload = {
        ...pelangganModal.data,
        kode_perusahaan: activeCompany?.code || "RSG",
      };

      const res = await fetch("/api/marketplace/pelanggan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toastSuccess(
          pelangganModal.mode === "edit"
            ? "Data pelanggan berhasil diperbarui!"
            : "Pelanggan baru berhasil ditambahkan!",
        );
        // Otomatis pilih nama pelanggan yang baru di-save di form SPK
        setFormData((prev) => ({
          ...prev,
          nama_pelanggan: pelangganModal.data.nama_pelanggan.trim(),
          no_telepon: pelangganModal.data.no_hp || prev.no_telepon,
          alamat: pelangganModal.data.alamat || prev.alamat,
        }));
        await loadPelangganOptions();
        setPelangganModal(null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        toastError(errJson.message || "Gagal menyimpan data pelanggan");
      }
    } catch (err) {
      toastError("Error: " + err.message);
    } finally {
      setSavingPelanggan(false);
    }
  };

  // Handler update status SPK dari Scanner Barcode
  const handleUpdateSpkStatusFromScan = (batchId, spkId, newStatus) => {
    setBatchList((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== batchId && b.kode_produksi !== batchId) return b;
        const spks = (b.spk_list || []).map((s) => {
          if (s.id_spk === spkId || s.no_spk === spkId) {
            return { ...s, status_spk: newStatus };
          }
          return s;
        });

        const allDone = spks.every((s) =>
          (s.status_spk || "").toLowerCase().includes("selesai") ||
          (s.status_spk || "").toLowerCase().includes("kirim")
        );
        return {
          ...b,
          spk_list: spks,
          status: allDone ? "Selesai" : b.status,
        };
      });

      try {
        localStorage.setItem(SPK_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}

      fetch("/api/marketplace/spk/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_id: batchId, id_spk: spkId, status_spk: newStatus }),
      }).catch(() => {});

      return updated;
    });

    // Update detailBatch jika sedang dibuka
    setDetailBatch((prev) => {
      if (!prev) return prev;
      if (prev.id !== batchId && prev.kode_produksi !== batchId) return prev;
      const spks = (prev.spk_list || []).map((s) => {
        if (s.id_spk === spkId || s.no_spk === spkId) {
          return { ...s, status_spk: newStatus };
        }
        return s;
      });
      return { ...prev, spk_list: spks };
    });

    toastSuccess(`SPK ${spkId} berhasil di-scan & status diperbarui ke: ${newStatus}!`);
  };
  const [formData, setFormData] = useState({
    kode_produksi: "",
    nama_pelanggan: "",
    tgl_pesan: new Date().toISOString().split("T")[0],
    deadline: "",
    status: "Dalam Proses",
    catatan: "",
    spk_list: [],
  });

  // Helper upload file design ke folder public/designs dengan format: [No Produksi]_[No SPK].[ext]
  const uploadDesignImage = (file, kodeProduksi, noSpk) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        try {
          const res = await fetch("/api/upload-design", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              kode_produksi: kodeProduksi || "PRODUKSI",
              no_spk: noSpk || "SPK",
              base64,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.url) {
              resolve(data.url);
              return;
            }
          }
        } catch (err) {
          console.warn(
            "Gagal upload ke /api/upload-design, menggunakan base64:",
            err,
          );
        }
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Design Image Upload per SPK (dari Modal Form)
  const handleUploadDesignSpk = async (spkIdx, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("File harus berupa gambar (JPG, PNG, WebP)!");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError("Ukuran file maksimal 5 MB!");
      return;
    }
    const currentSpk = formData.spk_list[spkIdx];
    const kodeProduksi = formData.kode_produksi || "PRODUKSI";
    const noSpk = currentSpk?.id_spk || `SPK-${spkIdx + 1}`;

    const finalUrl = await uploadDesignImage(file, kodeProduksi, noSpk);
    handleUpdateSpkHeader(spkIdx, "design_img", finalUrl);
    toastSuccess(`Design disimpan sebagai ${kodeProduksi}_${noSpk}!`);
  };

  // Handle Direct Upload Design per SPK from Main List
  const handleDirectUploadDesignSpk = async (batchId, spkIdx, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("File harus berupa gambar (JPG, PNG, WebP)!");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastError("Ukuran file maksimal 5 MB!");
      return;
    }
    const targetBatch = batchList.find((b) => b.id === batchId);
    const kodeProduksi = targetBatch?.kode_produksi || "PRODUKSI";
    const targetSpk = targetBatch?.spk_list?.[spkIdx];
    const noSpk = targetSpk?.id_spk || `SPK-${spkIdx + 1}`;

    const finalUrl = await uploadDesignImage(file, kodeProduksi, noSpk);
    setBatchList((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        const newSpkList = [...b.spk_list];
        newSpkList[spkIdx] = { ...newSpkList[spkIdx], design_img: finalUrl };
        return { ...b, spk_list: newSpkList };
      }),
    );
    toastSuccess(`Design disimpan sebagai ${kodeProduksi}_${noSpk}!`);
  };

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(SPK_STORAGE_KEY, JSON.stringify(batchList));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  }, [batchList]);

  // Helper generate text & kalkulasi estimasi kain dari data master produk & qty
  const buildEstimasiKain = (kainNama, cmPerPcs, hargaCm, qty) => {
    const q = Number(qty || 1);
    const cm = Math.round(Number(cmPerPcs || 0));
    const hrg = Number(hargaCm || 0);
    const totalCm = Math.round(cm * q);
    const totalMeter = (totalCm / 100).toFixed(1).replace(/\.0$/, "");
    const totalBiaya = Math.round(totalCm * hrg);
    const nama = kainNama || "Kain";
    return `${nama} - ${totalCm.toLocaleString("id-ID")} CM (${totalMeter}M) @Rp${hrg.toLocaleString("id-ID")}/CM (Rp ${totalBiaya.toLocaleString("id-ID")})`;
  };

  // Load Karyawan & Produk dynamically from storage
  useEffect(() => {
    const handleSync = () => {
      try {
        const savedK = localStorage.getItem(KARYAWAN_STORAGE_KEY);
        if (savedK) {
          const parsedK = JSON.parse(savedK);
          if (Array.isArray(parsedK) && parsedK.length > 0)
            setKaryawanOptions(parsedK);
        }
      } catch (e) {}

      try {
        const savedP = localStorage.getItem(PRODUK_STORAGE_KEY);
        if (savedP) {
          const parsedP = JSON.parse(savedP);
          if (Array.isArray(parsedP) && parsedP.length > 0)
            setProdukList(parsedP);
        }
      } catch (e) {}
    };

    window.addEventListener("karyawan_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("karyawan_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const toggleBatch = (id) => {
    setExpandedBatch((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Add New Batch Modal
  const handleOpenAdd = () => {
    loadPelangganOptions();
    loadTahapanOptions();
    loadProdukList();
    setEditingId(null);
    const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
    const nextNum = batchList.length + 1;
    const kodePrd = `PRD-${dateStr}-${String(nextNum).padStart(3, "0")}`;

    // Sample product from master
    const p1 = produkList[0] || {
      id: 1,
      sku: "SKU-001",
      nama_produk: "Produk Baru",
      kategori: "Umum",
      satuan: "PCS",
    };

    setFormData({
      kode_produksi: kodePrd,
      nama_pelanggan: "",
      tgl_pesan: new Date().toISOString().split("T")[0],
      deadline: new Date(Date.now() + 14 * 86400000)
        .toISOString()
        .split("T")[0],
      status: "Dalam Proses",
      catatan: "",
      spk_list: [
        {
          id_spk: "SPK-101",
          nama_spk: "SPK Baru",
          penjahit: karyawanOptions[0]?.nama || "Penjahit Workshop",
          status_spk: "Potong Pola",
          produk_items: [
            {
              id: `item-${Date.now()}-1`,
              no_spk: "SPK-101",
              produk_id: p1.id,
              sku: p1.sku,
              nama_produk: p1.nama_produk,
              kategori: p1.kategori,
              satuan: p1.satuan,
              qty: 50,
              hpp: Number(p1.hpp ?? p1.harga_beli ?? 0),
              kain_nama: p1.nama_kain || p1.sku_kain || "Kain",
              panjang_kain_cm: Number(p1.estimasi_kain || p1.panjang_kain_cm || 200),
              harga_kain_cm: p1.harga_kain_cm || 150,
              estimasi_kain: buildEstimasiKain(
                p1.nama_kain || p1.sku_kain || "Kain",
                Number(p1.estimasi_kain || p1.panjang_kain_cm || 200),
                p1.harga_kain_cm || 150,
                50,
              ),
            },
          ],
        },
      ],
    });
    setActiveTabSpkIdx(0);
    setIsModalOpen(true);
  };

  // Open Edit Batch Modal
  const handleOpenEdit = (batch, initialSpkIdx = 0) => {
    loadPelangganOptions();
    loadTahapanOptions();
    loadProdukList();
    setEditingId(batch.id);
    setFormData({
      kode_produksi: batch.kode_produksi,
      nama_pelanggan: batch.nama_pelanggan,
      tgl_pesan: batch.tgl_pesan || "",
      deadline: batch.deadline || "",
      status: batch.status || "Dalam Proses",
      catatan: batch.catatan || "",
      spk_list: batch.spk_list
        ? JSON.parse(JSON.stringify(batch.spk_list))
        : [],
    });
    setActiveTabSpkIdx(initialSpkIdx || 0);
    setIsModalOpen(true);
  };

  // Add a new SPK block inside this No Produksi
  const handleAddNewSPK = () => {
    const nextIdx = formData.spk_list.length + 1;
    const newSpkId = `SPK-${120 + nextIdx}`;
    const pDefault = produkList[0] || {
      id: 1,
      sku: "SKU-001",
      nama_produk: "Produk Baru",
      kategori: "Umum",
      satuan: "PCS",
      estimasi_kain: "Silk Jetblack Premium",
      panjang_kain_cm: 250,
      harga_kain_cm: 200,
    };
    const qty = 50;
    const kainNama = pDefault.nama_kain || pDefault.sku_kain || "Kain";
    const cmPerPcs = Number(pDefault.estimasi_kain || pDefault.panjang_kain_cm || 200);
    const hargaCm = Number(pDefault.harga_kain_cm || 150);

    const newSpk = {
      id_spk: newSpkId,
      nama_spk: `SPK ${newSpkId}`,
      penjahit: karyawanOptions[0]?.nama || "Penjahit Workshop",
      status_spk: "Potong Pola",
      produk_items: [
        {
          id: `item-${Date.now()}-1`,
          no_spk: newSpkId,
          produk_id: pDefault.id,
          sku: pDefault.sku || pDefault.kode_sku || "",
          nama_produk: pDefault.nama_produk,
          kategori: pDefault.kategori || "Umum",
          satuan: pDefault.satuan || "PCS",
          qty: qty,
          hpp: Number(pDefault.hpp ?? pDefault.harga_beli ?? 0),
          kain_nama: kainNama,
          panjang_kain_cm: cmPerPcs,
          harga_kain_cm: hargaCm,
          estimasi_kain: buildEstimasiKain(kainNama, cmPerPcs, hargaCm, qty),
        },
      ],
    };

    setFormData((prev) => ({
      ...prev,
      spk_list: [...prev.spk_list, newSpk],
    }));
    setActiveTabSpkIdx(formData.spk_list.length);
  };

  // Remove an SPK block
  const handleRemoveSPK = (spkIdx) => {
    if (formData.spk_list.length <= 1) {
      toastError("Minimal harus ada 1 SPK dalam Kode Produksi!");
      return;
    }
    setFormData((prev) => {
      const updated = prev.spk_list.filter((_, i) => i !== spkIdx);
      return { ...prev, spk_list: updated };
    });
    setActiveTabSpkIdx((prev) =>
      prev >= spkIdx ? Math.max(0, prev - 1) : prev,
    );
  };

  // Update SPK header fields (No SPK, Nama SPK, Penjahit, Status)
  const handleUpdateSpkHeader = (spkIdx, field, val) => {
    setFormData((prev) => {
      const list = [...prev.spk_list];
      list[spkIdx] = { ...list[spkIdx], [field]: val };
      // if no_spk changes, synchronize inside all its child products
      if (field === "id_spk") {
        list[spkIdx].produk_items = list[spkIdx].produk_items.map((p) => ({
          ...p,
          no_spk: val,
        }));
      }
      return { ...prev, spk_list: list };
    });
  };

  // Add Product Item inside a specific SPK
  const handleAddProductToSPK = (spkIdx) => {
    const targetSpk = formData.spk_list[spkIdx];
    const pDefault = produkList[0] || {
      id: 1,
      sku: "SKU-001",
      nama_produk: "Produk Baru",
      kategori: "Umum",
      satuan: "PCS",
      estimasi_kain: "Silk Jetblack Premium",
      panjang_kain_cm: 250,
      harga_kain_cm: 200,
    };
    const qty = 50;
    const kainNama = pDefault.nama_kain || pDefault.sku_kain || "Kain";
    const cmPerPcs = Number(pDefault.estimasi_kain || pDefault.panjang_kain_cm || 200);
    const hargaCm = Number(pDefault.harga_kain_cm || 150);

    const newItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      no_spk: targetSpk.id_spk,
      produk_id: pDefault.id,
      sku: pDefault.sku || pDefault.kode_sku || "",
      nama_produk: pDefault.nama_produk,
      kategori: pDefault.kategori || "Umum",
      satuan: pDefault.satuan || "PCS",
      qty: qty,
      hpp: Number(pDefault.hpp ?? pDefault.harga_beli ?? 0),
      kain_nama: kainNama,
      panjang_kain_cm: cmPerPcs,
      harga_kain_cm: hargaCm,
      estimasi_kain: buildEstimasiKain(kainNama, cmPerPcs, hargaCm, qty),
    };

    setFormData((prev) => {
      const list = [...prev.spk_list];
      list[spkIdx] = {
        ...list[spkIdx],
        produk_items: [...list[spkIdx].produk_items, newItem],
      };
      return { ...prev, spk_list: list };
    });
  };

  // Update Product Item inside a specific SPK
  const handleUpdateProductInSPK = (spkIdx, prodIdx, field, val) => {
    setFormData((prev) => {
      const list = [...prev.spk_list];
      const items = [...list[spkIdx].produk_items];
      const current = { ...items[prodIdx], [field]: val };

      // Jika qty atau panjang_kain_cm diubah, hitung ulang estimasi kain otomatis jika ada spesifikasi kain
      if (field === "qty" || field === "panjang_kain_cm") {
        const q = Number(field === "qty" ? val : current.qty || 0);
        const kainNama =
          current.kain_nama ||
          current.estimasi_kain?.split(" - ")?.[0] ||
          "Kain";
        const cmPerPcs = Number(field === "panjang_kain_cm" ? val : current.panjang_kain_cm || 0);
        const hargaCm = Number(current.harga_kain_cm || 0);
        if (cmPerPcs > 0) {
          current.estimasi_kain = buildEstimasiKain(
            kainNama,
            cmPerPcs,
            hargaCm,
            q,
          );
        }
      }

      items[prodIdx] = current;
      list[spkIdx] = { ...list[spkIdx], produk_items: items };
      return { ...prev, spk_list: list };
    });
  };

  // Save Edit Estimasi Kain (Kain Nama, Panjang Kain cm, Harga Kain cm)
  const handleSaveEditKain = () => {
    if (!editKainModal) return;
    const { spkIdx, prodIdx, kain_nama, panjang_kain_cm, harga_kain_cm, applyToAll } = editKainModal;
    const cmVal = Number(panjang_kain_cm || 0);
    const hrgVal = Number(harga_kain_cm || 0);

    setFormData((prev) => {
      const list = [...prev.spk_list];
      const spk = { ...list[spkIdx] };
      const items = [...spk.produk_items];

      if (applyToAll) {
        spk.produk_items = items.map((it) => {
          const q = Number(it.qty || 1);
          return {
            ...it,
            kain_nama: kain_nama,
            panjang_kain_cm: cmVal,
            harga_kain_cm: hrgVal,
            estimasi_kain: buildEstimasiKain(kain_nama, cmVal, hrgVal, q),
          };
        });
      } else {
        const target = { ...items[prodIdx] };
        const q = Number(target.qty || 1);
        items[prodIdx] = {
          ...target,
          kain_nama: kain_nama,
          panjang_kain_cm: cmVal,
          harga_kain_cm: hrgVal,
          estimasi_kain: buildEstimasiKain(kain_nama, cmVal, hrgVal, q),
        };
        spk.produk_items = items;
      }

      list[spkIdx] = spk;
      return { ...prev, spk_list: list };
    });

    toastSuccess("Estimasi kain berhasil disimpan!");
    setEditKainModal(null);
  };

  // When user picks product from master dropdown inside an SPK
  const handleSelectProductForSPK = (spkIdx, prodIdx, selectedId, selectedOpt) => {
    const prod =
      (selectedOpt && selectedOpt.nama_produk ? selectedOpt : null) ||
      produkList.find((p) => String(p.id) === String(selectedId)) ||
      produkList.find((p) => p.id === Number(selectedId)) ||
      produkList.find((p) => p.id === selectedId) ||
      produkList.find(
        (p) =>
          p.sku &&
          selectedOpt?.sku &&
          String(p.sku).trim().toLowerCase() ===
            String(selectedOpt.sku).trim().toLowerCase(),
      );
    if (!prod) return;

    setFormData((prev) => {
      const list = [...prev.spk_list];
      const items = [...list[spkIdx].produk_items];
      const targetQty = items[prodIdx]?.qty || 50;
      const kainNama = prod.nama_kain || prod.sku_kain || "Kain";
      const cmPerPcs = Number(prod.estimasi_kain || prod.panjang_kain_cm || 200);
      const hargaCm = Number(prod.harga_kain_cm || 150);

      const hasBundle =
        Array.isArray(prod.bundle_items) && prod.bundle_items.length > 0;
      let estimasiKainText = buildEstimasiKain(
        kainNama,
        cmPerPcs,
        hargaCm,
        targetQty,
      );
      if (hasBundle) {
        const bundleBreakdown = prod.bundle_items
          .map((bi) => {
            const bCm = (Number(bi.estimasi_kain || bi.panjang_kain_cm) || 0) * targetQty;
            const bMeter = (bCm / 100).toFixed(1).replace(/\.0$/, "");
            const bBiaya = bCm * (Number(bi.harga_kain_cm) || 0);
            return `${bi.nama_komponen}: ${bCm.toLocaleString("id-ID")} CM (${bMeter}M) - Rp ${bBiaya.toLocaleString("id-ID")}`;
          })
          .join(" | ");
        estimasiKainText = `Bundle (${prod.bundle_items.length} Komp) ➔ ${bundleBreakdown}`;
      }

      items[prodIdx] = {
        ...items[prodIdx],
        produk_id: prod.id,
        sku: prod.sku || "",
        nama_produk: prod.nama_produk,
        kategori: prod.kategori || "Umum",
        satuan: prod.satuan || "PCS",
        kain_nama: kainNama,
        panjang_kain_cm: cmPerPcs,
        harga_kain_cm: hargaCm,
        hpp: Number(prod.hpp ?? prod.harga_modal ?? prod.harga_beli ?? 0),
        bundle_items: prod.bundle_items || [],
        estimasi_kain: estimasiKainText,
      };
      list[spkIdx] = { ...list[spkIdx], produk_items: items };
      return { ...prev, spk_list: list };
    });
  };

  // Remove a product row inside an SPK
  const handleRemoveProductFromSPK = (spkIdx, prodIdx) => {
    if (formData.spk_list[spkIdx].produk_items.length <= 1) {
      toastError("Minimal harus ada 1 produk di dalam SPK ini!");
      return;
    }
    setFormData((prev) => {
      const list = [...prev.spk_list];
      list[spkIdx].produk_items = list[spkIdx].produk_items.filter(
        (_, i) => i !== prodIdx,
      );
      return { ...prev, spk_list: list };
    });
  };

  // Form Submit (Simpan ke MySQL Database)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_pelanggan.trim()) {
      toastError("Nama Pelanggan wajib diisi!");
      return;
    }

    const payload = {
      ...formData,
      id: editingId || null,
      company_code: activeCompany.code || "RSG",
    };

    try {
      const res = await fetch("/api/marketplace/spk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await loadSpkData();
        toastSuccess(
          editingId
            ? "Data SPK berhasil diperbarui di database!"
            : "SPK baru berhasil disimpan ke database!",
        );
        setIsModalOpen(false);
        return;
      }
    } catch (err) {
      console.warn("Gagal simpan ke MySQL, fallback ke local:", err);
    }

    // Fallback local jika offline
    if (editingId) {
      setBatchList((prev) =>
        prev.map((b) =>
          b.id === editingId ? { ...formData, id: editingId } : b,
        ),
      );
      toastSuccess("Data SPK berhasil diperbarui");
    } else {
      const nextId =
        batchList.length > 0 ? Math.max(...batchList.map((b) => b.id)) + 1 : 1;
      setBatchList((prev) => [
        { ...formData, id: nextId, company_code: activeCompany.code || "RSG" },
        ...prev,
      ]);
      setExpandedBatch((prev) => ({ ...prev, [nextId]: true }));
      toastSuccess("SPK baru berhasil dibuat");
    }
    setIsModalOpen(false);
  };

  // Delete Batch dari Database MySQL
  const handleDeleteBatch = async (batch) => {
    const totalSpk = batch.spk_list ? batch.spk_list.length : 0;
    const confirmed = await showConfirm(
      "Hapus Kode Produksi?",
      `Yakin ingin menghapus ${batch.kode_produksi} (${batch.nama_pelanggan}) beserta seluruh (${totalSpk}) SPK dari database?`,
      "Ya, Hapus Semua",
      "Batal",
    );
    if (!confirmed) return;

    try {
      await fetch(`/api/marketplace/spk?id=${batch.id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Gagal hapus dari database:", err);
    }

    setBatchList((prev) => prev.filter((b) => b.id !== batch.id));
    toastSuccess("Kode produksi & SPK berhasil dihapus dari database");
  };

  // Filter batch list by company (Multi-Tenant)
  const companyBatches = batchList.filter(
    (b) => !b.company_code || b.company_code === activeCompany.code,
  );

  // Normalisasi status SPK ke kategori tab
  const getNormalizedStatus = (st = "") => {
    const s = String(st || "").toLowerCase();
    if (s.includes("rencana") || s.includes("draft") || s.includes("thp-01"))
      return "perencanaan";
    if (
      s.includes("antri") ||
      s.includes("samp") ||
      s.includes("thp-02") ||
      s.includes("thp-03")
    )
      return "sampling";
    if (s.includes("print") || s.includes("sublim") || s.includes("thp-04"))
      return "print_kain";
    if (
      s.includes("potong") ||
      s.includes("pola") ||
      s.includes("cutting") ||
      s.includes("thp-05")
    )
      return "potong";
    if (s.includes("jahit") || s.includes("sewing") || s.includes("thp-06"))
      return "jahit";
    if (
      s.includes("lkpk") ||
      s.includes("qc") ||
      s.includes("pack") ||
      s.includes("finish") ||
      s.includes("thp-07") ||
      s.includes("thp-08") ||
      s.includes("thp-09")
    )
      return "finishing";
    if (
      s.includes("selesai") ||
      s.includes("finish good") ||
      s.includes("thp-10")
    )
      return "selesai";
    if (s.includes("batal") || s.includes("cancel") || s.includes("thp-11"))
      return "batal";
    return "perencanaan";
  };

  const getStatusBadgeStyle = (statusStr) => {
    const norm = getNormalizedStatus(statusStr);
    switch (norm) {
      case "perencanaan":
        return { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1", emoji: "📋" };
      case "sampling":
        return { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe", emoji: "⏳" };
      case "print_kain":
        return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe", emoji: "🖨️" };
      case "potong":
        return { bg: "#fef3c7", color: "#d97706", border: "#fde68a", emoji: "✂️" };
      case "jahit":
        return { bg: "#e0f2fe", color: "#0284c7", border: "#bae6fd", emoji: "🪡" };
      case "finishing":
        return { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc", emoji: "📦" };
      case "selesai":
        return { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", emoji: "✅" };
      case "batal":
        return { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca", emoji: "❌" };
      default:
        return { bg: "#f8fafc", color: "#334155", border: "#e2e8f0", emoji: "⚙️" };
    }
  };

  // Grouping data berdasarkan No Produksi (Batch Produksi)
  const allBatches = useMemo(() => {
    return companyBatches.map((batch) => {
      const list = Array.isArray(batch.spk_list) ? batch.spk_list : [];
      const rawFaktur =
        batch.no_faktur ||
        (batch.kode_produksi && String(batch.kode_produksi).startsWith("PRD-OFF-")
          ? String(batch.kode_produksi).replace(/^PRD-/, "")
          : "");

      const totalQty = list.reduce((sum, spk) => {
        const pItems = Array.isArray(spk.produk_items) ? spk.produk_items : [];
        return sum + pItems.reduce((pSum, p) => pSum + Number(p.qty || 0), 0);
      }, 0);

      const hasDesign = list.some((spk) => Boolean(spk.design_img));

      // Cek apakah SEMUA SPK di dalam No Produksi ini sudah berstatus Selesai
      const isAllSpkSelesai =
        list.length > 0 &&
        list.every((spk) => getNormalizedStatus(spk.status_spk) === "selesai");
      const computedBatchStatus = isAllSpkSelesai ? "Selesai" : "Diproses";

      return {
        ...batch,
        status: computedBatchStatus,
        no_faktur: rawFaktur,
        spk_list: list,
        total_spk: list.length,
        total_qty: totalQty,
        has_design: hasDesign,
        is_all_selesai: isAllSpkSelesai,
      };
    });
  }, [companyBatches]);

  const countByTahapan = (val) => {
    if (val === "semua") return allBatches.length;
    if (val === "diproses") return allBatches.filter((b) => !b.is_all_selesai).length;
    if (val === "selesai") return allBatches.filter((b) => b.is_all_selesai).length;
    return allBatches.filter((b) => {
      return (b.spk_list || []).some(
        (spk) => getNormalizedStatus(spk.status_spk) === val,
      );
    }).length;
  };

  const totalAllSpkCount = useMemo(() => {
    return allBatches.reduce((acc, b) => acc + (b.spk_list?.length || 0), 0);
  }, [allBatches]);

  const SPK_TABS_CONFIG = [
    {
      value: "semua",
      label: `Semua SPK (${allBatches.length})`,
      icon: Layers,
      activeBorder: "#0284c7",
      inactiveBorder: "#bfdbfe",
      activeBg: "#0284c7",
      inactiveBg: "#eff6ff",
      inactiveColor: "#1d4ed8",
      shadow: "rgba(2, 132, 199, 0.25)",
    },
    {
      value: "perencanaan",
      label: `Perencanaan (${countByTahapan("perencanaan")})`,
      icon: Clock,
      activeBorder: "#475569",
      inactiveBorder: "#cbd5e1",
      activeBg: "#475569",
      inactiveBg: "#f8fafc",
      inactiveColor: "#334155",
      shadow: "rgba(71, 85, 105, 0.25)",
    },
    {
      value: "sampling",
      label: `Antrian & Sampling (${countByTahapan("sampling")})`,
      icon: Clock,
      activeBorder: "#7c3aed",
      inactiveBorder: "#ddd6fe",
      activeBg: "#7c3aed",
      inactiveBg: "#f5f3ff",
      inactiveColor: "#6d28d9",
      shadow: "rgba(124, 58, 237, 0.25)",
    },
    {
      value: "potong",
      label: `Potong Pola (${countByTahapan("potong")})`,
      icon: Scissors,
      activeBorder: "#d97706",
      inactiveBorder: "#fde68a",
      activeBg: "#d97706",
      inactiveBg: "#fffbeb",
      inactiveColor: "#b45309",
      shadow: "rgba(217, 119, 6, 0.25)",
    },
    {
      value: "jahit",
      label: `Jahit (${countByTahapan("jahit")})`,
      icon: Layers,
      activeBorder: "#0284c7",
      inactiveBorder: "#bae6fd",
      activeBg: "#0284c7",
      inactiveBg: "#f0f9ff",
      inactiveColor: "#0369a1",
      shadow: "rgba(2, 132, 199, 0.25)",
    },
    {
      value: "finishing",
      label: `Finishing / QC (${countByTahapan("finishing")})`,
      icon: Package,
      activeBorder: "#0891b2",
      inactiveBorder: "#a5f3fc",
      activeBg: "#0891b2",
      inactiveBg: "#ecfeff",
      inactiveColor: "#0e7490",
      shadow: "rgba(8, 145, 178, 0.25)",
    },
    {
      value: "selesai",
      label: `Selesai (${countByTahapan("selesai")})`,
      icon: CheckCircle,
      activeBorder: "#059669",
      inactiveBorder: "#a7f3d0",
      activeBg: "#059669",
      inactiveBg: "#ecfdf5",
      inactiveColor: "#047857",
      shadow: "rgba(5, 150, 105, 0.25)",
    },
  ];

  const penjahitFilterOptions = useMemo(() => {
    const set = new Set();
    allBatches.forEach((b) => {
      (b.spk_list || []).forEach((s) => {
        if (s.penjahit && s.penjahit !== "-") set.add(s.penjahit);
      });
    });
    karyawanOptions.forEach((k) => {
      if (k.nama) set.add(k.nama);
    });
    return Array.from(set);
  }, [allBatches, karyawanOptions]);

  const tahapanFilterOptions = useMemo(() => {
    const set = new Set();
    allBatches.forEach((b) => {
      if (b.status) set.add(b.status);
      (b.spk_list || []).forEach((s) => {
        if (s.status_spk) set.add(s.status_spk);
      });
    });
    tahapanOptions.forEach((t) => {
      if (t.nama_tahapan) set.add(t.nama_tahapan);
    });
    return Array.from(set);
  }, [allBatches, tahapanOptions]);

  const filteredBatches = useMemo(() => {
    return allBatches.filter((batch) => {
      if (filterStatus !== "semua") {
        if (filterStatus === "selesai") {
          if (!batch.is_all_selesai) return false;
        } else if (filterStatus === "diproses") {
          if (batch.is_all_selesai) return false;
        } else {
          const matchSpk = (batch.spk_list || []).some(
            (s) => getNormalizedStatus(s.status_spk) === filterStatus,
          );
          if (!matchSpk) return false;
        }
      }
      if (filterPenjahit !== "Semua") {
        const matchPenjahit = (batch.spk_list || []).some(
          (s) => (s.penjahit || "") === filterPenjahit,
        );
        if (!matchPenjahit) return false;
      }
      if (filterTahapan !== "Semua") {
        const matchTahapan =
          (batch.status || "") === filterTahapan ||
          (batch.spk_list || []).some(
            (s) => (s.status_spk || "") === filterTahapan,
          );
        if (!matchTahapan) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchBatch = (batch.kode_produksi || "").toLowerCase().includes(q);
        const matchFaktur = (batch.no_faktur || "").toLowerCase().includes(q);
        const matchPelanggan = (batch.nama_pelanggan || "")
          .toLowerCase()
          .includes(q);
        const matchSpk = (batch.spk_list || []).some(
          (spk) =>
            (spk.id_spk || "").toLowerCase().includes(q) ||
            (spk.nama_spk || "").toLowerCase().includes(q) ||
            (spk.penjahit || "").toLowerCase().includes(q) ||
            (spk.produk_items || []).some(
              (p) =>
                (p.nama_produk || "").toLowerCase().includes(q) ||
                (p.sku || "").toLowerCase().includes(q) ||
                (p.kain_nama || "").toLowerCase().includes(q),
            ),
        );
        if (!matchBatch && !matchFaktur && !matchPelanggan && !matchSpk) {
          return false;
        }
      }
      return true;
    });
  }, [allBatches, filterStatus, filterPenjahit, filterTahapan, search]);

  const totalPages = Math.ceil(filteredBatches.length / entriesPerPage) || 1;
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredBatches.slice(start, start + entriesPerPage);
  }, [filteredBatches, currentPage, entriesPerPage]);

  const handleDeleteSpkItem = async (targetBatch, spkIndex, spkObj) => {
    const ok = await showConfirm(
      "Hapus SPK",
      `Apakah Anda yakin ingin menghapus SPK ${spkObj.id_spk} (${spkObj.nama_spk})?`,
      "Ya, Hapus",
    );
    if (!ok) return;

    if (!targetBatch.spk_list || targetBatch.spk_list.length <= 1) {
      await handleDeleteBatch(targetBatch);
    } else {
      const updatedSpkList = targetBatch.spk_list.filter(
        (_, idx) => idx !== spkIndex,
      );
      const updatedBatch = { ...targetBatch, spk_list: updatedSpkList };

      setBatchList((prev) =>
        prev.map((b) => (b.id === targetBatch.id ? updatedBatch : b)),
      );
      try {
        const saved = batchList.map((b) =>
          b.id === targetBatch.id ? updatedBatch : b,
        );
        localStorage.setItem(SPK_STORAGE_KEY, JSON.stringify(saved));
      } catch (e) {}

      try {
        await fetch("/api/marketplace/spk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedBatch),
        });
      } catch (e) {}

      toastSuccess(`SPK ${spkObj.id_spk} berhasil dihapus`);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        padding: "8px 16px",
        boxSizing: "border-box",
      }}
    >
      {/* MASTER CONTAINER CARD */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
          padding: "10px 14px",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER TITLE & ACTION BUTTONS (BERWARNA BLUE GRADIENT - MATCHING PENJUALAN OFFLINE) */}
        <div
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            borderRadius: "8px",
            padding: "10px 16px",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "6px",
            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.22)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backdropFilter: "blur(4px)",
              }}
            >
              <ClipboardList size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "800",
                    color: "#ffffff",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                  }}
                >
                  Surat Perintah Kerja (SPK) Produksi
                </h1>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    padding: "1.5px 7px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                  }}
                >
                  {activeCompany?.code || "RSG"}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.88)",
                }}
              >
                Kelola SPK potong, jahit, bordir & sablon, pantau tahapan produksi, dan cetak lembar kerja SPK.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* Tombol Scan Barcode Selesai Produksi */}
            <button
              type="button"
              onClick={() => setIsScanModalOpen(true)}
              style={{
                height: "30px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "0 14px",
                borderRadius: "6px",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "800",
                lineHeight: 1,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(5, 150, 105, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              <QrCode size={14} />
              <span>Scan Selesai Produksi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.hash = "#tahapan_spk";
              }}
              style={{
                height: "30px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "0 13px",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "800",
                lineHeight: 1,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                transition: "all 0.15s ease",
              }}
            >
              <Layers size={13} />
              <span>Tahapan SPK</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              style={{
                height: "30px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "0 14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#ffffff",
                color: "#0284c7",
                fontSize: "12px",
                fontWeight: "800",
                lineHeight: 1,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
                transition: "all 0.15s ease",
              }}
            >
              <Plus size={14} />
              <span>Buat SPK Baru</span>
            </button>
          </div>
        </div>

        {/* FILTER TABS (BERWARNA COLOR-CODED SEPERTI PENJUALAN OFFLINE) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
            flexWrap: "wrap",
          }}
        >
          {SPK_TABS_CONFIG.map((tab) => {
            const IconComp = tab.icon;
            const isActive = filterStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setFilterStatus(tab.value);
                  setCurrentPage(1);
                }}
                style={{
                  height: "28px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "0 12px",
                  borderRadius: "6px",
                  border: isActive
                    ? `1px solid ${tab.activeBorder}`
                    : `1px solid ${tab.inactiveBorder}`,
                  backgroundColor: isActive ? tab.activeBg : tab.inactiveBg,
                  color: isActive ? "#ffffff" : tab.inactiveColor,
                  fontSize: "12px",
                  fontWeight: "700",
                  lineHeight: 1,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? `0 1px 4px ${tab.shadow}` : "none",
                }}
              >
                <IconComp size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* FILTER CONTROLS BAR (SEPERTI PENJUALAN OFFLINE) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "8px 12px",
            marginBottom: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
          }}
        >
          {/* Search input with icon */}
          <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
            <Search
              size={14}
              color="#94a3b8"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari no SPK, no produksi, pelanggan, penjahit, produk..."
              style={{
                width: "100%",
                padding: "6px 10px 6px 32px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                outline: "none",
                backgroundColor: "#f8fafc",
                transition: "all 0.15s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#0284c7";
                e.target.style.backgroundColor = "#ffffff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#cbd5e1";
                e.target.style.backgroundColor = "#f8fafc";
              }}
            />
          </div>

          {/* Select Penjahit */}
          <select
            value={filterPenjahit}
            onChange={(e) => {
              setFilterPenjahit(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              color: "#334155",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              minWidth: "135px",
            }}
          >
            <option value="Semua">Semua Penjahit</option>
            {penjahitFilterOptions.map((pj, idx) => (
              <option key={idx} value={pj}>
                {pj}
              </option>
            ))}
          </select>

          {/* Select Tahapan SPK */}
          <select
            value={filterTahapan}
            onChange={(e) => {
              setFilterTahapan(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              color: "#334155",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              minWidth: "130px",
            }}
          >
            <option value="Semua">Semua Tahapan</option>
            {tahapanFilterOptions.map((th, idx) => (
              <option key={idx} value={th}>
                {th}
              </option>
            ))}
          </select>

          {/* Select Baris Per Halaman (Paging) */}
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              color: "#334155",
              backgroundColor: "#ffffff",
              cursor: "pointer",
              minWidth: "105px",
            }}
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadSpkData}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "12px",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "700",
              backgroundColor: "#f8fafc",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f1f5f9")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#f8fafc")
            }
          >
            <RefreshCw
              size={13}
              color="#0284c7"
              className={isLoadingSpk ? "animate-spin" : ""}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* DATA TABLE (MATCHING PENJUALAN OFFLINE) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              className="table-bordered-hover"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "12px",
                border: "1px solid #cbd5e1",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    fontSize: "11px",
                    fontWeight: "800",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <th
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      width: "45px",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    NO
                  </th>
                  <th
                    style={{ padding: "5px 8px", border: "1px solid #cbd5e1" }}
                  >
                    NO PRODUKSI & NO FAKTUR
                  </th>
                  <th
                    style={{ padding: "5px 8px", border: "1px solid #cbd5e1" }}
                  >
                    PELANGGAN & DEADLINE
                  </th>
                  <th
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #cbd5e1",
                      textAlign: "center",
                      width: "140px",
                    }}
                  >
                    STATUS
                  </th>
                  <th
                    style={{
                      padding: "5px 8px",
                      border: "1px solid #cbd5e1",
                      textAlign: "center",
                      width: "135px",
                    }}
                  >
                    AKSI
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingSpk ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "48px 16px",
                        textAlign: "center",
                        backgroundColor: "#fbfcfe",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                        }}
                      >
                        <RefreshCw
                          size={24}
                          color="#0284c7"
                          className="animate-spin"
                        />
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: "800",
                            color: "#0f172a",
                          }}
                        >
                          Menarik Data SPK Produksi...
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : paginatedBatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "36px 16px",
                        textAlign: "center",
                        color: "#64748b",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <Package
                        size={32}
                        color="#cbd5e1"
                        style={{ marginBottom: "6px" }}
                      />
                      <div style={{ fontWeight: "700", fontSize: "13px" }}>
                        Tidak ada SPK yang ditemukan
                      </div>
                      <div style={{ fontSize: "11px", marginTop: "2px" }}>
                        Coba ubah kata kunci pencarian atau filter tahapan
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedBatches.map((batch, idx) => {
                    const rowNumber =
                      (currentPage - 1) * entriesPerPage + idx + 1;
                    const spkList = batch.spk_list || [];

                    return (
                      <tr
                        key={`${batch.id}-${batch.kode_produksi}-${idx}`}
                        style={{
                          backgroundColor:
                            idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        {/* 1. NO */}
                        <td
                          style={{
                            padding: "6px 8px",
                            textAlign: "center",
                            fontWeight: "700",
                            color: "#64748b",
                            border: "1px solid #cbd5e1",
                            verticalAlign: "middle",
                          }}
                        >
                          {rowNumber}
                        </td>

                        {/* 2. NO PRODUKSI & NO FAKTUR (GROUPED) */}
                        <td
                          style={{
                            padding: "6px 10px",
                            border: "1px solid #cbd5e1",
                            verticalAlign: "middle",
                          }}
                        >
                          {/* Baris Utama: No Produksi + Design Badge + Total SPK & QTY */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: "800",
                                color: "#0284c7",
                                fontSize: "12.5px",
                              }}
                            >
                              {batch.kode_produksi || "-"}
                            </span>

                              {batch.has_design && (
                                <span
                                  title="Memiliki file design SPK"
                                  style={{
                                    fontSize: "9px",
                                    backgroundColor: "#e0f2fe",
                                    color: "#0369a1",
                                    padding: "1px 4px",
                                    borderRadius: "3px",
                                    fontWeight: "700",
                                  }}
                                >
                                  DESIGN
                                </span>
                              )}

                              <span
                                style={{
                                  fontSize: "9.5px",
                                  backgroundColor: "#f0fdf4",
                                  color: "#166534",
                                  border: "1px solid #bbf7d0",
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  fontWeight: "700",
                                }}
                              >
                                {spkList.length} SPK
                              </span>

                              {batch.total_qty > 0 && (
                                <span
                                  style={{
                                    fontSize: "9.5px",
                                    backgroundColor: "#f8fafc",
                                    color: "#475569",
                                    border: "1px solid #cbd5e1",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                    fontWeight: "700",
                                  }}
                                >
                                  {batch.total_qty} PCS
                                </span>
                              )}
                            </div>

                            {/* No Faktur Penjualan Offline (Jika Ada) */}
                            {batch.no_faktur ? (
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "#047857",
                                  fontFamily: "monospace",
                                  fontWeight: "700",
                                  backgroundColor: "#ecfdf5",
                                  border: "1px solid #a7f3d0",
                                  borderRadius: "3px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  padding: "1px 5px",
                                  marginTop: "3px",
                                }}
                                title="No Faktur / Pesanan Penjualan Offline"
                              >
                                <FileText size={10} color="#059669" />
                                <span>{batch.no_faktur}</span>
                              </div>
                            ) : null}
                          </td>

                          {/* 3. PELANGGAN & DEADLINE */}
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #cbd5e1",
                              verticalAlign: "middle",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "700",
                                color: "#0f172a",
                                fontSize: "12px",
                              }}
                            >
                              {batch.nama_pelanggan || "-"}
                            </div>
                            <div
                              style={{
                                fontSize: "10.5px",
                                color: "#64748b",
                                marginTop: "2px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Calendar size={11} color="#0284c7" />
                              <span>
                                Deadline:{" "}
                                <b style={{ color: "#0284c7" }}>
                                  {batch.deadline || "-"}
                                </b>
                              </span>
                            </div>
                            {batch.tgl_pesan && (
                              <div
                                style={{
                                  fontSize: "9.5px",
                                  color: "#94a3b8",
                                  marginTop: "1px",
                                }}
                              >
                                Tgl Pesan: {batch.tgl_pesan}
                              </div>
                            )}
                          </td>

                          {/* 4. STATUS */}
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #cbd5e1",
                              textAlign: "center",
                              verticalAlign: "middle",
                            }}
                          >
                            {(() => {
                              const isSelesai = Boolean(batch.is_all_selesai);
                              if (isSelesai) {
                                return (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "3px 10px",
                                      borderRadius: "4px",
                                      fontSize: "10.5px",
                                      fontWeight: "800",
                                      backgroundColor: "#dcfce7",
                                      color: "#166534",
                                      border: "1px solid #bbf7d0",
                                    }}
                                  >
                                    ✅ Selesai
                                  </span>
                                );
                              }

                              // Kumpulkan daftar status unik dari seluruh SPK di dalam batch ini
                              const statusList = Array.from(
                                new Set(
                                  spkList.map((s) => s.status_spk || "Antrian & Sampling")
                                )
                              );

                              if (statusList.length === 0) {
                                return (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "3px 10px",
                                      borderRadius: "4px",
                                      fontSize: "10.5px",
                                      fontWeight: "800",
                                      backgroundColor: "#fef3c7",
                                      color: "#d97706",
                                      border: "1px solid #fde68a",
                                    }}
                                  >
                                    Diproses
                                  </span>
                                );
                              }

                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "center" }}>
                                  {statusList.map((st, sIdx) => {
                                    const style = getStatusBadgeStyle(st);
                                    const count = spkList.filter((s) => (s.status_spk || "Antrian & Sampling") === st).length;
                                    return (
                                      <span
                                        key={sIdx}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          fontSize: "10px",
                                          fontWeight: "800",
                                          backgroundColor: style.bg,
                                          color: style.color,
                                          border: `1px solid ${style.border}`,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        <span>{style.emoji || "⏳"}</span>
                                        <span>{st}</span>
                                        {spkList.length > 1 && (
                                          <span style={{ opacity: 0.8, fontSize: "9px" }}>({count})</span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>

                          {/* 5. AKSI */}
                          <td
                            style={{
                              padding: "6px 8px",
                              border: "1px solid #cbd5e1",
                              textAlign: "center",
                              verticalAlign: "middle",
                            }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {/* Detail Button (Biru Solid) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailBatch(batch);
                                  setDetailActiveSpkIdx(0);
                                }}
                                title="Lihat Detail Produksi & SPK"
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "4px",
                                  border: "1px solid #0284c7",
                                  backgroundColor: "#0284c7",
                                  color: "#ffffff",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  boxShadow: "0 1px 2px rgba(2, 132, 199, 0.3)",
                                }}
                              >
                                <Eye size={12} />
                              </button>

                              {/* Cetak Label Barcode 100x150 mm Button (Hijau Emerald Solid) */}
                              <button
                                type="button"
                                onClick={() => {
                                  if ((batch.spk_list || []).length === 1) {
                                    setPrintLabelModalData({
                                      batch,
                                      spk: batch.spk_list[0],
                                    });
                                  } else {
                                    setSelectPrintBatch(batch);
                                  }
                                }}
                                title="Cetak Label Barcode SPK (Kertas 100mm x 150mm)"
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "4px",
                                  border: "1px solid #059669",
                                  backgroundColor: "#059669",
                                  color: "#ffffff",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  boxShadow: "0 1px 2px rgba(5, 150, 105, 0.3)",
                                }}
                              >
                                <Tag size={12} />
                              </button>

                              {/* Edit Button (Kuning / Amber Emas Solid) */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenEdit(batch, 0)
                                }
                                title="Edit SPK & Produksi"
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "4px",
                                  border: "1px solid #d97706",
                                  backgroundColor: "#f59e0b",
                                  color: "#ffffff",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  boxShadow: "0 1px 2px rgba(245, 158, 11, 0.3)",
                                }}
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Delete Button (Merah Solid) */}
                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(batch)}
                                title="Hapus No Produksi"
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  borderRadius: "4px",
                                  border: "1px solid #dc2626",
                                  backgroundColor: "#ef4444",
                                  color: "#ffffff",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  boxShadow: "0 1px 2px rgba(239, 68, 68, 0.3)",
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

          {/* TABLE FOOTER / PAGINATION (MATCHING PENJUALAN OFFLINE) */}
          <div
            style={{
              padding: "8px 14px",
              backgroundColor: "#f8fafc",
              borderTop: "1px solid #cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "#64748b",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              Menampilkan{" "}
              <b style={{ color: "#0f172a" }}>
                {filteredBatches.length === 0
                  ? 0
                  : (currentPage - 1) * entriesPerPage + 1}
              </b>{" "}
              sampai{" "}
              <b style={{ color: "#0f172a" }}>
                {Math.min(currentPage * entriesPerPage, filteredBatches.length)}
              </b>{" "}
              dari{" "}
              <b style={{ color: "#0f172a" }}>{filteredBatches.length}</b> No Produksi{" "}
              <span style={{ color: "#64748b" }}>
                (Total {totalAllSpkCount} SPK)
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "4px 10px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: currentPage <= 1 ? "#f1f5f9" : "#ffffff",
                  color: currentPage <= 1 ? "#94a3b8" : "#334155",
                  fontWeight: "700",
                  fontSize: "11px",
                  cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                }}
              >
                Sebelumnya
              </button>

              <span
                style={{
                  padding: "3px 8px",
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                {currentPage} / {totalPages || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                style={{
                  padding: "4px 10px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  backgroundColor:
                    currentPage >= totalPages ? "#f1f5f9" : "#ffffff",
                  color: currentPage >= totalPages ? "#94a3b8" : "#334155",
                  fontWeight: "700",
                  fontSize: "11px",
                  cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PILIH SPK UNTUK DICETAK (JIKA NO PRODUKSI MEMILIKI LEBIH DARI 1 SPK) */}
      {selectPrintBatch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            zIndex: 2200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setSelectPrintBatch(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "480px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Printer size={16} />
                <span style={{ fontSize: "13px", fontWeight: "800" }}>
                  Pilih Lembar SPK untuk Dicetak
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectPrintBatch(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                No Produksi:{" "}
                <b style={{ color: "#0284c7", fontFamily: "monospace" }}>
                  {selectPrintBatch.kode_produksi}
                </b>{" "}
                {selectPrintBatch.nama_pelanggan ? (
                  <span>({selectPrintBatch.nama_pelanggan})</span>
                ) : null}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#475569",
                  marginBottom: "4px",
                }}
              >
                Pilih lembar SPK yang ingin dicetak:
              </div>

              {(selectPrintBatch.spk_list || []).map((spk, sIdx) => {
                const spkQty = (spk.produk_items || []).reduce(
                  (acc, p) => acc + Number(p.qty || 0),
                  0,
                );
                return (
                  <div
                    key={sIdx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#f8fafc",
                      gap: "10px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: "800",
                          color: "#0284c7",
                          fontSize: "12px",
                          fontFamily: "monospace",
                        }}
                      >
                        {spk.id_spk}
                      </div>
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "#0f172a",
                          fontWeight: "700",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {spk.nama_spk || "SPK Produksi"}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>
                        Penjahit: {spk.penjahit || "-"} • {spkQty} PCS
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      {/* Tombol Cetak SPK A4 */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrintModalData({ batch: selectPrintBatch, spk });
                          setSelectPrintBatch(null);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 10px",
                          borderRadius: "5px",
                          border: "1px solid #0284c7",
                          backgroundColor: "#f0f9ff",
                          color: "#0284c7",
                          fontSize: "10.5px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                        title="Cetak Dokumen SPK Format A4"
                      >
                        <Printer size={13} />
                        <span>Lembar SPK (A4)</span>
                      </button>

                      {/* Tombol Cetak Label Barcode 100x150 mm */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrintLabelModalData({ batch: selectPrintBatch, spk });
                          setSelectPrintBatch(null);
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "6px 10px",
                          borderRadius: "5px",
                          border: "none",
                          backgroundColor: "#059669",
                          color: "#ffffff",
                          fontSize: "10.5px",
                          fontWeight: "800",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(5, 150, 105, 0.3)",
                        }}
                        title="Cetak Label Barcode Thermal 100mm x 150mm untuk ditempel di plastik"
                      >
                        <Tag size={13} />
                        <span>Label Barcode (100x150)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PRODUKSI & SPK MODAL (FULL SCREEN COMPACT) */}
      {detailBatch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#0f172a",
            zIndex: 2100,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              backgroundColor: "#f1f5f9",
              width: "100%",
              height: "100vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header (Full Screen Dark Slate / Blue Gradient) */}
            <div
              style={{
                height: "42px",
                padding: "0 16px",
                background: "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)",
                borderBottom: "1px solid #334155",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardList size={14} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: "800" }}>
                  Detail Produksi: {detailBatch.kode_produksi}{" "}
                  {detailBatch.no_faktur ? `(${detailBatch.no_faktur})` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailBatch(null)}
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "5px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                flex: 1,
                padding: "16px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Summary Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      fontWeight: "700",
                    }}
                  >
                    NO PRODUKSI
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#0284c7",
                      fontFamily: "monospace",
                    }}
                  >
                    {detailBatch.kode_produksi}
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      fontWeight: "700",
                    }}
                  >
                    PELANGGAN
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    {detailBatch.nama_pelanggan || "-"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      fontWeight: "700",
                    }}
                  >
                    TGL PESAN & DEADLINE
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#0284c7",
                    }}
                  >
                    {detailBatch.tgl_pesan || "-"} •{" "}
                    <span style={{ color: "#d97706" }}>
                      {detailBatch.deadline || "-"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      fontWeight: "700",
                    }}
                  >
                    TOTAL SPK
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "800",
                      color: "#166534",
                    }}
                  >
                    {detailBatch.spk_list?.length || 0} SPK
                  </div>
                </div>
              </div>

              {/* Tab Selection if multiple SPK */}
              {detailBatch.spk_list && detailBatch.spk_list.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  {detailBatch.spk_list.map((s, sIdx) => {
                    const isActive = detailActiveSpkIdx === sIdx;
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setDetailActiveSpkIdx(sIdx)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: "700",
                          border: isActive
                            ? "1px solid #0284c7"
                            : "1px solid #cbd5e1",
                          backgroundColor: isActive ? "#0284c7" : "#f8fafc",
                          color: isActive ? "#ffffff" : "#334155",
                          cursor: "pointer",
                        }}
                      >
                        {s.id_spk} ({s.nama_spk || "SPK"})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active SPK Detail */}
              {(() => {
                const currentSpk =
                  detailBatch.spk_list?.[detailActiveSpkIdx] ||
                  detailBatch.spk_list?.[0];
                if (!currentSpk) return null;
                const pItems = currentSpk.produk_items || [];
                return (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#f0f9ff",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #bae6fd",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: "800",
                            color: "#0284c7",
                            fontFamily: "monospace",
                            fontSize: "13px",
                          }}
                        >
                          {currentSpk.id_spk}
                        </span>{" "}
                        —{" "}
                        <span
                          style={{
                            fontWeight: "700",
                            color: "#0f172a",
                            fontSize: "12px",
                          }}
                        >
                          {currentSpk.nama_spk}
                        </span>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            marginTop: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            Penjahit:{" "}
                            <b style={{ color: "#0f172a" }}>
                              {currentSpk.penjahit || "-"}
                            </b>
                          </span>
                          <span>• Status SPK:</span>
                          <select
                            value={currentSpk.status_spk || (tahapanOptions[0]?.nama_tahapan || "Potong Pola")}
                            onChange={async (e) => {
                              const newSpkStatus = e.target.value;
                              const targetIdx = detailBatch.spk_list?.[detailActiveSpkIdx] ? detailActiveSpkIdx : 0;
                              const updatedSpkList = (detailBatch.spk_list || []).map((s, idx) =>
                                idx === targetIdx ? { ...s, status_spk: newSpkStatus } : s
                              );
                              const updatedBatch = {
                                ...detailBatch,
                                status: updatedSpkList.every(
                                  (s) => getNormalizedStatus(s.status_spk) === "selesai"
                                )
                                  ? "Selesai"
                                  : "Diproses",
                                spk_list: updatedSpkList,
                              };
                              setDetailBatch(updatedBatch);
                              setBatchList((prev) =>
                                prev.map((b) => (b.id === detailBatch.id ? updatedBatch : b))
                              );
                              try {
                                await fetch("/api/marketplace/spk", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    ...updatedBatch,
                                    company_code: activeCompany.code || "RSG",
                                  }),
                                });
                                toastSuccess(`Status ${currentSpk.id_spk} diubah ke "${newSpkStatus}"`);
                              } catch (err) {
                                console.warn("Gagal simpan status SPK:", err);
                              }
                            }}
                            style={{
                              padding: "3px 8px",
                              borderRadius: "5px",
                              border: "1px solid #fcd34d",
                              backgroundColor: "#fffbeb",
                              color: "#b45309",
                              fontSize: "11px",
                              fontWeight: "800",
                              cursor: "pointer",
                              outline: "none",
                            }}
                          >
                            {tahapanOptions.map((t) => (
                              <option key={t.id || t.kode_tahapan} value={t.nama_tahapan}>
                                {t.emoji ? `${t.emoji} ` : ""}{t.nama_tahapan}
                              </option>
                            ))}
                            {currentSpk.status_spk &&
                              !tahapanOptions.some((t) => t.nama_tahapan === currentSpk.status_spk) && (
                                <option value={currentSpk.status_spk}>{currentSpk.status_spk}</option>
                              )}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() =>
                            setPrintModalData({
                              batch: detailBatch,
                              spk: currentSpk,
                            })
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 10px",
                            borderRadius: "4px",
                            border: "1px solid #818cf8",
                            backgroundColor: "#6366f1",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          <Printer size={12} /> Cetak SPK Ini
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPrintLabelModalData({
                              batch: detailBatch,
                              spk: currentSpk,
                            })
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 10px",
                            borderRadius: "4px",
                            border: "none",
                            backgroundColor: "#059669",
                            color: "#ffffff",
                            fontSize: "11px",
                            fontWeight: "800",
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(5, 150, 105, 0.3)",
                          }}
                          title="Cetak Label Barcode Thermal 100x150 mm untuk ditempel pada bungkusan plastik"
                        >
                          <Tag size={12} /> Label Barcode (100x150)
                        </button>
                      </div>
                    </div>

                    {currentSpk.design_img && (
                      <div
                        style={{
                          padding: "10px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <img
                          src={currentSpk.design_img}
                          alt="Design SPK"
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: "800",
                              color: "#0f172a",
                            }}
                          >
                            File Design SPK
                          </div>
                          <div
                            style={{
                              fontSize: "10.5px",
                              color: "#64748b",
                              marginTop: "2px",
                            }}
                          >
                            Foto / instruksi pola dan mockup pengerjaan
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "800",
                          color: "#0f172a",
                          marginBottom: "6px",
                        }}
                      >
                        Daftar Produk ({pItems.length} Macam):
                      </div>
                      <div
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "11px",
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                backgroundColor: "#f8fafc",
                                borderBottom: "1px solid #cbd5e1",
                                textAlign: "left",
                              }}
                            >
                              <th
                                style={{
                                  padding: "6px 8px",
                                  width: "35px",
                                  textAlign: "center",
                                }}
                              >
                                NO
                              </th>
                              <th style={{ padding: "6px 8px" }}>
                                SKU & NAMA PRODUK
                              </th>
                              <th
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "center",
                                  width: "84px",
                                }}
                              >
                                QTY
                              </th>
                              <th style={{ padding: "6px 8px" }}>
                                ESTIMASI KAIN
                              </th>
                              <th
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "right",
                                  width: "95px",
                                }}
                              >
                                HPP/PCS
                              </th>
                              <th
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "right",
                                  width: "105px",
                                }}
                              >
                                TOTAL HPP
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pItems.map((p, pIdx) => {
                              const cm = Number(p.panjang_kain_cm || parseFloat(p.estimasi_kain) || 0);
                              const totalCm = cm * Number(p.qty || 1);
                              const totalM = (totalCm / 100).toFixed(1);
                              const hppVal = Number(p.hpp || p.harga_modal || p.cost_price || 0);
                              const totalHpp = hppVal * Number(p.qty || 1);

                              return (
                                <tr
                                  key={pIdx}
                                  style={{
                                    borderBottom: "1px solid #f1f5f9",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding: "5px 8px",
                                      textAlign: "center",
                                      color: "#64748b",
                                    }}
                                  >
                                    {pIdx + 1}
                                  </td>
                                  <td style={{ padding: "5px 8px" }}>
                                    <div
                                      style={{
                                        fontWeight: "700",
                                        color: "#0f172a",
                                      }}
                                    >
                                      {p.nama_produk}
                                    </div>
                                    {p.sku && (
                                      <span
                                        style={{
                                          fontSize: "9.5px",
                                          fontFamily: "monospace",
                                          color: "#0284c7",
                                        }}
                                      >
                                        {p.sku}
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: "5px 8px",
                                      textAlign: "center",
                                      fontWeight: "800",
                                    }}
                                  >
                                    {p.qty} {p.satuan || "PCS"}
                                  </td>
                                  <td style={{ padding: "5px 8px" }}>
                                    {cm > 0 ? (
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          color: "#166534",
                                          fontWeight: "600",
                                        }}
                                      >
                                        ✂️ {p.kain_nama || "Kain"} (
                                        {cm} cm/pcs) • Butuh:{" "}
                                        <b>{totalCm.toLocaleString("id-ID")} cm</b> ({totalM} m)
                                      </span>
                                    ) : (p.estimasi_kain && typeof p.estimasi_kain === "string" && p.estimasi_kain.trim() !== "" && p.estimasi_kain !== "0") ? (
                                      <span
                                        style={{
                                          fontSize: "10px",
                                          color: "#166534",
                                          fontWeight: "600",
                                        }}
                                      >
                                        ✂️ {p.estimasi_kain}
                                      </span>
                                    ) : (
                                      <span style={{ color: "#94a3b8" }}>-</span>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: "5px 8px",
                                      textAlign: "right",
                                      fontWeight: "700",
                                      color: "#334155",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        justifyContent: "flex-end",
                                      }}
                                    >
                                      <span>
                                        {hppVal > 0
                                          ? `Rp ${hppVal.toLocaleString("id-ID")}`
                                          : "-"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setHppModalData({
                                            mode: "detail",
                                            spkIdx: detailActiveSpkIdx,
                                            prodIdx: pIdx,
                                            produkId: p.produk_id,
                                            sku: p.sku,
                                            namaProduk: p.nama_produk,
                                            currentHpp: hppVal,
                                            currentPanjangKain: cm,
                                            currentKainNama: p.kain_nama || "Kain",
                                            currentHargaKainCm: p.harga_kain_cm || 150,
                                          })
                                        }
                                        title="Lihat / Edit Rincian HPP (Kain & Jasa Konveksi) & Update ke Master"
                                        style={{
                                          width: "18px",
                                          height: "18px",
                                          borderRadius: "3px",
                                          border: "1px solid #bae6fd",
                                          backgroundColor: "#f0f9ff",
                                          color: "#0284c7",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          cursor: "pointer",
                                          padding: 0,
                                        }}
                                      >
                                        <Calculator size={10} />
                                      </button>
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      padding: "5px 8px",
                                      textAlign: "right",
                                      fontWeight: "800",
                                      color: "#0284c7",
                                    }}
                                  >
                                    {totalHpp > 0 ? `Rp ${totalHpp.toLocaleString("id-ID")}` : "-"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot
                            style={{
                              backgroundColor: "#f8fafc",
                              borderTop: "2px solid #cbd5e1",
                              fontWeight: "800",
                              fontSize: "10.5px",
                            }}
                          >
                            <tr>
                              <td
                                colSpan={2}
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "right",
                                  color: "#475569",
                                }}
                              >
                                TOTAL:
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "center",
                                  color: "#0f172a",
                                }}
                              >
                                {pItems.reduce((acc, it) => acc + Number(it.qty || 0), 0)} PCS
                              </td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  color: "#166534",
                                }}
                              >
                                Total Kebutuhan Kain:{" "}
                                <b>
                                  {(
                                    pItems.reduce((acc, it) => {
                                      const cm = Number(it.panjang_kain_cm || parseFloat(it.estimasi_kain) || 0);
                                      return acc + cm * Number(it.qty || 1);
                                    }, 0) / 100
                                  ).toFixed(1)}{" "}
                                  Meter
                                </b>
                              </td>
                              <td style={{ padding: "6px 8px" }}></td>
                              <td
                                style={{
                                  padding: "6px 8px",
                                  textAlign: "right",
                                  color: "#0284c7",
                                }}
                              >
                                Rp{" "}
                                {pItems
                                  .reduce((acc, it) => {
                                    const hppVal = Number(it.hpp || it.harga_modal || it.cost_price || 0);
                                    return acc + hppVal * Number(it.qty || 1);
                                  }, 0)
                                  .toLocaleString("id-ID")}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "10px 16px",
                borderTop: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  const b = detailBatch;
                  const idx = detailActiveSpkIdx;
                  setDetailBatch(null);
                  handleOpenEdit(b, idx);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                <Edit3 size={13} />
                <span>Edit Produksi</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailBatch(null)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL FULL SCREEN COMPACT: HIRARKI 1 NO PRODUKSI -> MULTI SPK -> MULTI PRODUK
          ======================================================== */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#0f172a",
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Modal Header (Dark Slate Fullscreen Compact - 42px) */}
          <div
            style={{
              height: "42px",
              padding: "0 16px",
              background:
                "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)",
              borderBottom: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ClipboardList size={14} />
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#ffffff",
                  letterSpacing: "-0.01em",
                }}
              >
                {editingId
                  ? "Edit Data Produksi & SPK"
                  : "Form Input No Produksi, Multi SPK & Multi Produk"}
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>•</span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Struktur: 1 No Produksi ➔ Memuat beberapa SPK ➔ Di dalam tiap
                SPK terdapat beberapa Produk
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "5px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(239, 68, 68, 0.2)";
                e.currentTarget.style.color = "#ef4444";
                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.color = "#cbd5e1";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Modal Form Body (Fullscreen Compact) */}
          <form
            onSubmit={handleFormSubmit}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px 140px 16px",
              backgroundColor: "#f1f5f9",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {/* 1. INFORMASI INDUK: NO PRODUKSI & PELANGGAN */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                padding: "10px 14px",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "8px",
                  paddingBottom: "5px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <FileText size={13} color="#0284c7" />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  1. Informasi No Produksi & Pemesan
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    No Produksi <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.kode_produksi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kode_produksi: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontFamily: "monospace",
                      fontWeight: "800",
                      color: "#0284c7",
                      backgroundColor: "#f8fafc",
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                    <label
                      style={{
                        fontSize: "10.5px",
                        fontWeight: "700",
                        color: "#334155",
                      }}
                    >
                      Pelanggan <span style={{ color: "#ef4444" }}>*</span>
                    </label>

                    {/* Tombol Aksi Pelanggan: Edit & Hapus jika terpilih, dan Tambah Baru */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {formData.nama_pelanggan && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const found = pelangganOptions.find(
                                (p) => p.nama_pelanggan === formData.nama_pelanggan
                              );
                              if (found) handleOpenEditPelanggan(found);
                              else handleOpenAddPelanggan();
                            }}
                            title="Edit data pelanggan yang dipilih"
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#d97706",
                              backgroundColor: "#fffbeb",
                              border: "1px solid #fde68a",
                              borderRadius: "4px",
                              padding: "1px 6px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Edit3 size={10} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const found = pelangganOptions.find(
                                (p) => p.nama_pelanggan === formData.nama_pelanggan
                              );
                              if (found) handleDeletePelanggan(found);
                            }}
                            title="Hapus pelanggan yang dipilih dari database"
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#ef4444",
                              backgroundColor: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: "4px",
                              padding: "1px 6px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Trash2 size={10} /> Hapus
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenAddPelanggan}
                        title="Tambah Pelanggan Baru ke Database"
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          color: "#0284c7",
                          backgroundColor: "#f0f9ff",
                          border: "1px solid #bae6fd",
                          borderRadius: "4px",
                          padding: "1px 7px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Plus size={10} /> + Tambah Pelanggan
                      </button>
                    </div>
                  </div>

                  <SearchableSelect
                    value={formData.nama_pelanggan}
                    onChange={(val, opt) => {
                      if (val === "__ADD_NEW_PELANGGAN__") {
                        handleOpenAddPelanggan();
                        return;
                      }
                      if (opt && opt.item) {
                        setFormData((prev) => ({
                          ...prev,
                          nama_pelanggan: opt.item.nama_pelanggan,
                          no_telepon: opt.item.no_hp || prev.no_telepon || "",
                          instansi: opt.item.kategori_pelanggan === "Sekolah / Instansi" ? opt.item.nama_pelanggan : (prev.instansi || ""),
                          alamat: opt.item.alamat || prev.alamat || ""
                        }));
                      } else {
                        setFormData((prev) => ({ ...prev, nama_pelanggan: val }));
                      }
                    }}
                    options={[
                      {
                        value: "__ADD_NEW_PELANGGAN__",
                        label: "➕ Tambah Pelanggan Baru...",
                        displayLabel: "➕ Tambah Pelanggan Baru...",
                      },
                      ...(() => {
                        const seen = new Set();
                        const list = [];
                        (pelangganOptions || []).forEach((p) => {
                          const key = (p.nama_pelanggan || "").trim().toLowerCase();
                          if (key && !seen.has(key)) {
                            seen.add(key);
                            list.push({
                              value: p.nama_pelanggan,
                              label: p.nama_pelanggan,
                              displayLabel: p.nama_pelanggan,
                              item: p,
                            });
                          }
                        });
                        return list;
                      })()
                    ]}
                    placeholder="Pilih pelanggan dari master data..."
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "3px",
                    }}
                  >
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={formData.tgl_pesan}
                    onChange={(e) =>
                      setFormData({ ...formData, tgl_pesan: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      color: "#0f172a",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: "8px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "10.5px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "3px",
                  }}
                >
                  Keterangan Produksi
                </label>
                <input
                  type="text"
                  placeholder="Catatan pesanan dan alur pengerjaan..."
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "5px 9px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "11px",
                    color: "#334155",
                  }}
                />
              </div>
            </div>

            {/* 2. DAFTAR SPK & PRODUK DI DALAMNYA */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                padding: "10px 14px",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  paddingBottom: "5px",
                  borderBottom: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Boxes size={14} color="#0284c7" />
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontWeight: "800",
                      color: "#0f172a",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    2. Daftar SPK & Produk Terkait ({formData.spk_list.length}{" "}
                    SPK)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewSPK}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "5px",
                    border: "1px solid #0284c7",
                    backgroundColor: "#f0f9ff",
                    color: "#0284c7",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={13} />
                  <span>Tambah SPK Baru</span>
                </button>
              </div>

              {/* RENDER SETIAP BLOK SPK */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  flex: 1,
                }}
              >
                {formData.spk_list.map((spk, sIdx) => {
                  const tailorSelectOptions = karyawanOptions.map((k) => ({
                    value: k.nama,
                    label: `${k.nama} (${k.tipe} - ${k.bagian})`,
                    nama: k.nama,
                  }));

                  return (
                    <div
                      key={sIdx}
                      style={{
                        border: "1px solid #0284c7",
                        borderRadius: "7px",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 1px 3px rgba(2, 132, 199, 0.08)",
                      }}
                    >
                      {/* SPK Header Form (No SPK, Nama SPK, Penjahit, Status, Upload Design) */}
                      <div
                        style={{
                          padding: "8px 12px",
                          background:
                            "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                          borderBottom: "1px solid #bae6fd",
                          display: "grid",
                          gridTemplateColumns:
                            "110px 1fr 200px 130px 100px 32px",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "10px",
                              fontWeight: "800",
                              color: "#0369a1",
                              marginBottom: "2px",
                            }}
                          >
                            No SPK
                          </label>
                          <input
                            type="text"
                            required
                            value={spk.id_spk}
                            onChange={(e) =>
                              handleUpdateSpkHeader(
                                sIdx,
                                "id_spk",
                                e.target.value,
                              )
                            }
                            style={{
                              width: "100%",
                              padding: "4px 6px",
                              borderRadius: "4px",
                              border: "1px solid #38bdf8",
                              fontSize: "11px",
                              fontFamily: "monospace",
                              fontWeight: "800",
                              color: "#0284c7",
                              backgroundColor: "#ffffff",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "10px",
                              fontWeight: "800",
                              color: "#0369a1",
                              marginBottom: "2px",
                            }}
                          >
                            Nama SPK
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: SPK ABCD / SPK Pembuatan Topi"
                            value={spk.nama_spk}
                            onChange={(e) =>
                              handleUpdateSpkHeader(
                                sIdx,
                                "nama_spk",
                                e.target.value,
                              )
                            }
                            style={{
                              width: "100%",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #cbd5e1",
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#0f172a",
                              backgroundColor: "#ffffff",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "10px",
                              fontWeight: "800",
                              color: "#0369a1",
                              marginBottom: "2px",
                            }}
                          >
                            Penjahit / Makloon
                          </label>
                          <SearchableSelect
                            value={spk.penjahit}
                            options={tailorSelectOptions}
                            placeholder="Pilih Penjahit..."
                            onChange={(val) =>
                              handleUpdateSpkHeader(sIdx, "penjahit", val)
                            }
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "10px",
                              fontWeight: "800",
                              color: "#0369a1",
                              marginBottom: "2px",
                            }}
                          >
                            Tahapan SPK
                          </label>
                          <select
                            value={spk.status_spk || (tahapanOptions[0]?.nama_tahapan || "Perencanaan")}
                            onChange={(e) =>
                              handleUpdateSpkHeader(
                                sIdx,
                                "status_spk",
                                e.target.value,
                              )
                            }
                            style={{
                              width: "100%",
                              padding: "5px 7px",
                              borderRadius: "4px",
                              border: "1px solid #cbd5e1",
                              fontSize: "11px",
                              fontWeight: "700",
                              backgroundColor: "#ffffff",
                              color: "#0284c7",
                            }}
                          >
                            {tahapanOptions.map((t) => (
                              <option key={t.id || t.kode_tahapan} value={t.nama_tahapan}>
                                {t.emoji ? `${t.emoji} ` : ""}{t.nama_tahapan}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Upload Design SPK */}
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "10px",
                              fontWeight: "800",
                              color: "#0369a1",
                              marginBottom: "2px",
                            }}
                          >
                            Design SPK
                          </label>
                          {spk.design_img ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <div
                                onClick={() =>
                                  setPreviewDesign({
                                    url: spk.design_img,
                                    title: `Design SPK: ${spk.id_spk} - ${spk.nama_spk}`,
                                  })
                                }
                                title="Klik perbesar design"
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "4px",
                                  border: "1px solid #38bdf8",
                                  overflow: "hidden",
                                  cursor: "pointer",
                                  backgroundColor: "#f0f9ff",
                                  flexShrink: 0,
                                }}
                              >
                                <img
                                  src={spk.design_img}
                                  alt="Design"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSpkHeader(
                                    sIdx,
                                    "design_img",
                                    null,
                                  )
                                }
                                title="Hapus gambar design SPK"
                                style={{
                                  padding: "2px 5px",
                                  borderRadius: "3px",
                                  border: "1px solid #fca5a5",
                                  backgroundColor: "#fef2f2",
                                  color: "#ef4444",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                              >
                                Ganti
                              </button>
                            </div>
                          ) : (
                            <label
                              title="Upload file design SPK (JPG, PNG)"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 7px",
                                borderRadius: "4px",
                                border: "1px dashed #0284c7",
                                backgroundColor: "#ffffff",
                                color: "#0284c7",
                                fontSize: "10.5px",
                                fontWeight: "700",
                                cursor: "pointer",
                                width: "100%",
                                boxSizing: "border-box",
                              }}
                            >
                              <Upload size={12} />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadDesignSpk(sIdx, file);
                                }}
                              />
                            </label>
                          )}
                        </div>

                        <div
                          style={{ paddingTop: "14px", textAlign: "center" }}
                        >
                          <button
                            type="button"
                            onClick={() => handleRemoveSPK(sIdx)}
                            title="Hapus SPK ini"
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "4px",
                              border: "1px solid #fca5a5",
                              backgroundColor: "#fef2f2",
                              color: "#ef4444",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Sub-table: Daftar Produk di dalam SPK ini */}
                      <div style={{ padding: "8px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: "800",
                              color: "#475569",
                              textTransform: "uppercase",
                            }}
                          >
                            Produk Dalam {spk.id_spk} ({spk.produk_items.length}{" "}
                            Produk):
                          </span>

                          <button
                            type="button"
                            onClick={() => handleAddProductToSPK(sIdx)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              border: "1px solid #38bdf8",
                              backgroundColor: "#ffffff",
                              color: "#0284c7",
                              fontSize: "10.5px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            <Plus size={11} />
                            <span>Tambah Produk ke {spk.id_spk}</span>
                          </button>
                        </div>

                        <div
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "5px",
                            overflow: "visible",
                          }}
                        >
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: "11px",
                            }}
                          >
                            <thead>
                              <tr
                                style={{
                                  backgroundColor: "#f8fafc",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "left",
                                }}
                              >
                                <th
                                  style={{
                                    padding: "6px 8px",
                                    fontWeight: "800",
                                    color: "#475569",
                                    width: "35px",
                                    textAlign: "center",
                                  }}
                                >
                                  NO
                                </th>
                                <th
                                  style={{
                                    padding: "6px 8px",
                                    fontWeight: "800",
                                    color: "#475569",
                                    width: "320px",
                                  }}
                                >
                                  NAMA PRODUK
                                </th>
                                <th
                                  style={{
                                    padding: "6px 8px",
                                    fontWeight: "800",
                                    color: "#475569",
                                    width: "195px",
                                    textAlign: "center",
                                  }}
                                >
                                  ESTIMASI KAIN (CM/PCS)
                                </th>
                                <th
                                  style={{
                                    padding: "6px 8px",
                                    fontWeight: "800",
                                    color: "#475569",
                                    width: "185px",
                                    textAlign: "center",
                                  }}
                                >
                                  HPP / MODAL (RP)
                                </th>
                                <th
                                  style={{
                                    padding: "6px 8px",
                                    fontWeight: "800",
                                    color: "#475569",
                                    width: "95px",
                                    textAlign: "center",
                                  }}
                                >
                                  QTY
                                </th>
                                <th
                                  style={{
                                    padding: "6px 8px",
                                    fontWeight: "800",
                                    color: "#475569",
                                    width: "45px",
                                    textAlign: "center",
                                  }}
                                >
                                  AKSI
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {spk.produk_items.map((prod, pIdx) => {
                                const productSelectOptions = produkList.map(
                                  (p) => {
                                    const nama = p.nama_produk || "";
                                    const namaShort =
                                      nama.length > 40
                                        ? nama.slice(0, 40).trimEnd() + "..."
                                        : nama;
                                    return {
                                      value: p.id,
                                      label: nama,
                                      displayLabel: namaShort,
                                      nama_produk: p.nama_produk,
                                      sku: p.sku || p.kode_sku || "",
                                      kategori: p.kategori,
                                      satuan: p.satuan,
                                      nama_kain: p.nama_kain || p.sku_kain,
                                      sku_kain: p.sku_kain,
                                      panjang_kain_cm: p.panjang_kain_cm,
                                      harga_kain_cm: p.harga_kain_cm,
                                      hpp: Number(p.hpp ?? p.harga_modal ?? p.harga_beli ?? 0),
                                      bundle_items: p.bundle_items,
                                    };
                                  },
                                );

                                const hasMatch = productSelectOptions.some(
                                  (opt) =>
                                    String(opt.value) === String(prod.produk_id) ||
                                    (prod.sku &&
                                      opt.sku &&
                                      String(opt.sku).trim().toLowerCase() ===
                                        String(prod.sku).trim().toLowerCase()) ||
                                    (prod.nama_produk &&
                                      opt.nama_produk &&
                                      String(opt.nama_produk).trim().toLowerCase() ===
                                        String(prod.nama_produk).trim().toLowerCase()),
                                );

                                const effectiveOptions =
                                  hasMatch || !prod.nama_produk
                                    ? productSelectOptions
                                    : [
                                        {
                                          value:
                                            prod.produk_id ||
                                            prod.sku ||
                                            prod.nama_produk,
                                          label: prod.nama_produk,
                                          displayLabel:
                                            prod.nama_produk.length > 40
                                              ? prod.nama_produk
                                                  .slice(0, 40)
                                                  .trimEnd() + "..."
                                              : prod.nama_produk,
                                          nama_produk: prod.nama_produk,
                                          sku: prod.sku || "",
                                          kategori: prod.kategori || "Umum",
                                          satuan: prod.satuan || "PCS",
                                          nama_kain: prod.kain_nama || "",
                                          panjang_kain_cm:
                                            prod.panjang_kain_cm || 0,
                                          harga_kain_cm:
                                            prod.harga_kain_cm || 150,
                                          hpp: Number(prod.hpp ?? prod.harga_modal ?? prod.harga_beli ?? 0),
                                          bundle_items: prod.bundle_items || [],
                                        },
                                        ...productSelectOptions,
                                      ];

                                const cmVal = Number(prod.panjang_kain_cm || parseFloat(prod.estimasi_kain) || 0);
                                const qVal = Number(prod.qty || 1);
                                const totMeter = ((cmVal * qVal) / 100).toFixed(1);
                                const hppNum = Number(prod.hpp || 0);
                                const totHpp = hppNum * qVal;

                                return (
                                  <tr
                                    key={pIdx}
                                    style={{
                                      borderBottom: "1px solid #f1f5f9",
                                    }}
                                  >
                                    {/* 1. NO */}
                                    <td
                                      style={{
                                        padding: "4px 6px",
                                        textAlign: "center",
                                        fontWeight: "700",
                                        fontSize: "11px",
                                        color: "#64748b",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {pIdx + 1}
                                    </td>

                                    {/* 2. NAMA PRODUK & SKU */}
                                    <td style={{ padding: "4px 6px", verticalAlign: "middle", width: "320px", maxWidth: "320px" }}>
                                      <SearchableSelect
                                        value={prod.produk_id}
                                        fallbackLabel={prod.nama_produk}
                                        fallbackSku={prod.sku}
                                        options={effectiveOptions}
                                        placeholder="Pilih dari Master..."
                                        onChange={(val, opt) =>
                                          handleSelectProductForSPK(
                                            sIdx,
                                            pIdx,
                                            val,
                                            opt,
                                          )
                                        }
                                      />
                                      <div
                                        style={{
                                          marginTop: "3px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "5px",
                                          flexWrap: "wrap",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {prod.sku && (
                                          <span
                                            style={{
                                              fontSize: "9.5px",
                                              color: "#475569",
                                              fontFamily: "monospace",
                                              fontWeight: "700",
                                              backgroundColor: "#f1f5f9",
                                              padding: "1px 5px",
                                              borderRadius: "3px",
                                              border: "1px solid #e2e8f0",
                                            }}
                                          >
                                            SKU:{" "}
                                            <span style={{ color: "#0284c7" }}>
                                              {prod.sku}
                                            </span>
                                          </span>
                                        )}
                                        {prod.produk_id && (
                                          <span
                                            style={{
                                              display: "inline-block",
                                              padding: "1px 5px",
                                              borderRadius: "3px",
                                              backgroundColor: "#e0f2fe",
                                              color: "#0369a1",
                                              fontSize: "9px",
                                              fontWeight: "700",
                                              border: "1px solid #bae6fd",
                                            }}
                                          >
                                            {prod.kategori || "Umum"}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* 3. INPUT ESTIMASI KAIN (CM/PCS) */}
                                    <td
                                      style={{
                                        padding: "4px 6px",
                                        textAlign: "center",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          flexDirection: "column",
                                          gap: "2px",
                                          alignItems: "center",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={prod.panjang_kain_cm ?? ""}
                                            placeholder="0"
                                            onChange={(e) =>
                                              handleUpdateProductInSPK(
                                                sIdx,
                                                pIdx,
                                                "panjang_kain_cm",
                                                parseNumberId(e.target.value),
                                              )
                                            }
                                            title="Panjang kain per potong / pcs dalam centimeter"
                                            style={{
                                              width: "55px",
                                              padding: "3px 4px",
                                              borderRadius: "4px",
                                              border: "1px solid #cbd5e1",
                                              fontSize: "11px",
                                              fontWeight: "800",
                                              color: "#047857",
                                              textAlign: "center",
                                              backgroundColor: "#ffffff",
                                            }}
                                          />
                                          <span
                                            style={{
                                              fontSize: "10px",
                                              color: "#64748b",
                                              fontWeight: "600",
                                            }}
                                          >
                                            cm
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditKainModal({
                                                spkIdx: sIdx,
                                                prodIdx: pIdx,
                                                nama_produk: prod.nama_produk,
                                                sku: prod.sku,
                                                qty: prod.qty || 1,
                                                kain_nama: prod.kain_nama || "Kain",
                                                panjang_kain_cm: prod.panjang_kain_cm || 0,
                                                harga_kain_cm: prod.harga_kain_cm || 150,
                                                applyToAll: false,
                                              })
                                            }
                                            title="Atur Jenis Kain & Harga Master"
                                            style={{
                                              width: "20px",
                                              height: "20px",
                                              borderRadius: "4px",
                                              border: "1px solid #bbf7d0",
                                              backgroundColor: "#f0fdf4",
                                              color: "#16a34a",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              cursor: "pointer",
                                            }}
                                          >
                                            <Scissors size={10} />
                                          </button>
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "9px",
                                            color: "#059669",
                                            fontWeight: "600",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          Tot: <b>{totMeter} m</b>
                                          {prod.kain_nama
                                            ? ` • ${prod.kain_nama.length > 12 ? prod.kain_nama.slice(0, 12) + "..." : prod.kain_nama}`
                                            : ""}
                                        </div>
                                      </div>
                                    </td>

                                    {/* 4. INPUT HPP / MODAL (RP) */}
                                    <td
                                      style={{
                                        padding: "4px 6px",
                                        textAlign: "right",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          flexDirection: "column",
                                          gap: "2px",
                                          alignItems: "flex-end",
                                          width: "100%",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "3px",
                                            justifyContent: "flex-end",
                                            width: "100%",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: "10px",
                                              color: "#64748b",
                                              fontWeight: "700",
                                            }}
                                          >
                                            Rp
                                          </span>
                                          <input
                                            type="text"
                                            value={formatNumberId(prod.hpp)}
                                            placeholder="0"
                                            onChange={(e) =>
                                              handleUpdateProductInSPK(
                                                sIdx,
                                                pIdx,
                                                "hpp",
                                                parseNumberId(e.target.value),
                                              )
                                            }
                                            title="Harga Pokok Produksi (HPP) per PCS"
                                            style={{
                                              width: "84px",
                                              padding: "3px 4px",
                                              borderRadius: "4px",
                                              border: "1px solid #cbd5e1",
                                              fontSize: "11px",
                                              fontWeight: "800",
                                              color: "#0f172a",
                                              textAlign: "right",
                                              backgroundColor: "#ffffff",
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setHppModalData({
                                                mode: "form",
                                                spkIdx: sIdx,
                                                prodIdx: pIdx,
                                                produkId: prod.produk_id,
                                                sku: prod.sku,
                                                namaProduk: prod.nama_produk,
                                                currentHpp: prod.hpp || 0,
                                                currentPanjangKain: prod.panjang_kain_cm || 200,
                                                currentKainNama: prod.kain_nama || "Kain",
                                                currentHargaKainCm: prod.harga_kain_cm || 150,
                                              })
                                            }
                                            title="Buka Rincian Komponen HPP & Update ke Master Produk"
                                            style={{
                                              width: "20px",
                                              height: "20px",
                                              borderRadius: "4px",
                                              border: "1px solid #bae6fd",
                                              backgroundColor: "#f0f9ff",
                                              color: "#0284c7",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              cursor: "pointer",
                                              padding: 0,
                                              flexShrink: 0,
                                            }}
                                          >
                                            <Calculator size={10} />
                                          </button>
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "9px",
                                            color: "#64748b",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          Tot:{" "}
                                          <b style={{ color: "#0284c7" }}>
                                            Rp {totHpp.toLocaleString("id-ID")}
                                          </b>
                                        </div>
                                      </div>
                                    </td>

                                    {/* 5. QTY */}
                                    <td
                                      style={{
                                        padding: "4px 6px",
                                        textAlign: "center",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                        }}
                                      >
                                        <input
                                          type="number"
                                          min="1"
                                          value={prod.qty}
                                          onChange={(e) =>
                                            handleUpdateProductInSPK(
                                              sIdx,
                                              pIdx,
                                              "qty",
                                              Number(e.target.value),
                                            )
                                          }
                                          style={{
                                            width: "48px",
                                            padding: "3px 4px",
                                            borderRadius: "4px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "11px",
                                            fontWeight: "800",
                                            textAlign: "center",
                                          }}
                                        />
                                        <span
                                          style={{
                                            fontSize: "10.5px",
                                            fontWeight: "700",
                                            color: "#64748b",
                                          }}
                                        >
                                          {prod.satuan || "PCS"}
                                        </span>
                                      </div>
                                    </td>

                                    {/* 6. AKSI */}
                                    <td
                                      style={{
                                        padding: "4px 6px",
                                        textAlign: "center",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveProductFromSPK(sIdx, pIdx)
                                        }
                                        style={{
                                          width: "20px",
                                          height: "20px",
                                          borderRadius: "4px",
                                          border: "1px solid #fca5a5",
                                          backgroundColor: "#fef2f2",
                                          color: "#ef4444",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          cursor: "pointer",
                                        }}
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot
                              style={{
                                backgroundColor: "#f8fafc",
                                borderTop: "2px solid #e2e8f0",
                                fontWeight: "800",
                                fontSize: "10px",
                              }}
                            >
                              <tr>
                                <td
                                  colSpan={2}
                                  style={{
                                    padding: "5px 8px",
                                    textAlign: "right",
                                    color: "#475569",
                                  }}
                                >
                                  TOTAL SPK INI:
                                </td>
                                <td
                                  style={{
                                    padding: "5px 8px",
                                    textAlign: "center",
                                    color: "#166534",
                                  }}
                                >
                                  ✂️{" "}
                                  {(
                                    spk.produk_items.reduce((acc, it) => {
                                      const cm = Number(it.panjang_kain_cm || parseFloat(it.estimasi_kain) || 0);
                                      return acc + cm * Number(it.qty || 1);
                                    }, 0) / 100
                                  ).toFixed(1)}{" "}
                                  m
                                </td>
                                <td
                                  style={{
                                    padding: "5px 8px",
                                    textAlign: "right",
                                    color: "#0284c7",
                                  }}
                                >
                                  Rp{" "}
                                  {spk.produk_items
                                    .reduce((acc, it) => {
                                      const hpp = Number(it.hpp || 0);
                                      return acc + hpp * Number(it.qty || 1);
                                    }, 0)
                                    .toLocaleString("id-ID")}
                                </td>
                                <td
                                  style={{
                                    padding: "5px 8px",
                                    textAlign: "center",
                                    color: "#0f172a",
                                  }}
                                >
                                  {spk.produk_items.reduce((acc, it) => acc + Number(it.qty || 0), 0)} PCS
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER BUTTONS */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Total <b>{formData.spk_list.length}</b> SPK terdaftar dalam No
                Produksi <b>{formData.kode_produksi || "-"}</b>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    height: "28px",
                    padding: "0 14px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#64748b",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  style={{
                    height: "28px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "0 18px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)",
                  }}
                >
                  <Save size={13} />
                  <span>Simpan SPK Produksi</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* LIGHTBOX PREVIEW DESIGN MODAL */}
      {previewDesign && (
        <div
          onClick={() => setPreviewDesign(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: "800" }}>
                Preview Gambar Design: {previewDesign.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewDesign(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={previewDesign.url}
                alt="Design Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  objectFit: "contain",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Modal Edit Estimasi Kain Produk */}
      {editKainModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            zIndex: 2500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setEditKainModal(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "460px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "12px 16px",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Scissors size={16} />
                <span style={{ fontSize: "13px", fontWeight: "800" }}>
                  Edit Estimasi Pemakaian Kain
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditKainModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {/* Produk Info */}
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#0f172a",
                  }}
                >
                  {editKainModal.nama_produk}
                </div>
                <div
                  style={{
                    fontSize: "10.5px",
                    color: "#64748b",
                    marginTop: "2px",
                  }}
                >
                  SKU:{" "}
                  <span
                    style={{
                      color: "#0284c7",
                      fontFamily: "monospace",
                      fontWeight: "700",
                    }}
                  >
                    {editKainModal.sku || "-"}
                  </span>{" "}
                  • Qty:{" "}
                  <b style={{ color: "#047857" }}>{editKainModal.qty} PCS</b>
                </div>
              </div>

              {/* Form Inputs */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "4px",
                  }}
                >
                  Pilih Kain (Dari Master Kain)
                </label>
                <select
                  value={
                    kainOptions.find(
                      (k) =>
                        (k.kode_sku_kain || "").trim().toLowerCase() === (editKainModal.kain_nama || "").trim().toLowerCase() ||
                        (k.nama_kain || "").trim().toLowerCase() === (editKainModal.kain_nama || "").trim().toLowerCase()
                    )?.kode_sku_kain || (editKainModal.kain_nama || "")
                  }
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const found = kainOptions.find(
                      (k) =>
                        k.kode_sku_kain === selectedVal ||
                        k.nama_kain === selectedVal ||
                        String(k.id) === selectedVal
                    );
                    if (found) {
                      const hargaCm = found.harga_per_meter
                        ? Math.round(Number(found.harga_per_meter) / 100)
                        : editKainModal.harga_kain_cm;
                      setEditKainModal({
                        ...editKainModal,
                        kain_nama: found.kode_sku_kain || found.nama_kain,
                        harga_kain_cm: hargaCm > 0 ? hargaCm : editKainModal.harga_kain_cm,
                      });
                    } else {
                      setEditKainModal({
                        ...editKainModal,
                        kain_nama: selectedVal,
                      });
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    boxSizing: "border-box",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <option value="">-- Pilih Kain dari Master Kain --</option>
                  {kainOptions.map((k, idx) => {
                    const val = k.kode_sku_kain || k.nama_kain;
                    const hargaCm = k.harga_per_meter
                      ? Math.round(Number(k.harga_per_meter) / 100)
                      : 0;
                    return (
                      <option key={k.id || idx} value={val}>
                        {k.kode_sku_kain ? `[${k.kode_sku_kain}] ` : ""}
                        {k.nama_kain || val}
                        {hargaCm > 0
                          ? ` (@Rp ${hargaCm}/cm - Rp ${Number(k.harga_per_meter).toLocaleString("id-ID")}/m)`
                          : ""}
                      </option>
                    );
                  })}
                  {editKainModal.kain_nama &&
                    !kainOptions.some(
                      (k) =>
                        (k.kode_sku_kain || "").trim().toLowerCase() === (editKainModal.kain_nama || "").trim().toLowerCase() ||
                        (k.nama_kain || "").trim().toLowerCase() === (editKainModal.kain_nama || "").trim().toLowerCase()
                    ) && (
                      <option value={editKainModal.kain_nama}>
                        {editKainModal.kain_nama} (Kustom / Saat Ini)
                      </option>
                    )}
                </select>

                <div style={{ marginTop: "5px" }}>
                  <input
                    type="text"
                    value={editKainModal.kain_nama || ""}
                    onChange={(e) =>
                      setEditKainModal({
                        ...editKainModal,
                        kain_nama: e.target.value,
                      })
                    }
                    placeholder="Atau ketik nama / kode kain manual..."
                    style={{
                      width: "100%",
                      padding: "5px 8px",
                      borderRadius: "4px",
                      border: "1px dashed #cbd5e1",
                      fontSize: "11px",
                      boxSizing: "border-box",
                      color: "#475569",
                      backgroundColor: "#f8fafc",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "4px",
                    }}
                  >
                    Panjang Kain per Pcs (CM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editKainModal.panjang_kain_cm}
                    onChange={(e) =>
                      setEditKainModal({
                        ...editKainModal,
                        panjang_kain_cm: parseNumberId(e.target.value),
                      })
                    }
                    placeholder="Contoh: 95"
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                      fontWeight: "700",
                      color: "#047857",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "4px",
                    }}
                  >
                    Harga Kain per CM (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={editKainModal.harga_kain_cm}
                    onChange={(e) =>
                      setEditKainModal({
                        ...editKainModal,
                        harga_kain_cm: parseNumberId(e.target.value),
                      })
                    }
                    placeholder="Contoh: 150"
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                      fontWeight: "700",
                      color: "#0284c7",
                    }}
                  />
                </div>
              </div>

              {/* Live Calculation Preview */}
              {(() => {
                const cm = Number(editKainModal.panjang_kain_cm || 0);
                const q = Number(editKainModal.qty || 1);
                const hrg = Number(editKainModal.harga_kain_cm || 0);
                const totalCm = cm * q;
                const totalMeter = (totalCm / 100).toFixed(1);
                const totalBiaya = totalCm * hrg;

                return (
                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      borderRadius: "6px",
                      border: "1px solid #bbf7d0",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#166534",
                      }}
                    >
                      Hasil Kalkulasi Kebutuhan Kain:
                    </div>
                    <div style={{ fontSize: "12px", color: "#15803d" }}>
                      Total Kebutuhan: <b>{totalCm.toLocaleString("id-ID")} cm</b>{" "}
                      ({totalMeter} Meter) untuk {q} PCS
                    </div>
                    {hrg > 0 && (
                      <div style={{ fontSize: "12px", color: "#15803d" }}>
                        Estimasi Biaya Kain:{" "}
                        <b>Rp {totalBiaya.toLocaleString("id-ID")}</b> (@Rp{" "}
                        {hrg.toLocaleString("id-ID")}/cm atau @Rp{" "}
                        {(hrg * 100).toLocaleString("id-ID")}/meter)
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Checkbox Apply to All */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "11.5px",
                  color: "#334155",
                  cursor: "pointer",
                  marginTop: "2px",
                }}
              >
                <input
                  type="checkbox"
                  checked={editKainModal.applyToAll}
                  onChange={(e) =>
                    setEditKainModal({
                      ...editKainModal,
                      applyToAll: e.target.checked,
                    })
                  }
                />
                <span>
                  Terapkan jenis & harga kain ini ke semua produk di SPK ini
                </span>
              </label>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "10px 16px",
                borderTop: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => setEditKainModal(null)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveEditKain}
                style={{
                  padding: "6px 14px",
                  borderRadius: "5px",
                  border: "none",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Check size={14} />
                <span>Simpan Estimasi Kain</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak SPK (Format A4) */}
      <CetakSPKModal
        isOpen={Boolean(printModalData)}
        onClose={() => setPrintModalData(null)}
        batch={printModalData?.batch}
        spk={printModalData?.spk}
        adminName={activeCompany?.name || "RUANG SERAGAM"}
      />

      {/* Modal Cetak Label Barcode SPK (Thermal 100mm x 150mm) */}
      {printLabelModalData && (
        <CetakLabelBarcodeSPKModal
          isOpen={Boolean(printLabelModalData)}
          onClose={() => setPrintLabelModalData(null)}
          batch={printLabelModalData.batch}
          spk={printLabelModalData.spk}
          adminName={activeCompany?.name || "RUANG SERAGAM"}
        />
      )}

      {/* Modal Scanner Barcode SPK Selesai Produksi */}
      {isScanModalOpen && (
        <ModalScanSelesaiSPK
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          batches={batchList}
          onUpdateSpkStatus={handleUpdateSpkStatusFromScan}
          onOpenPrintLabel={(b, s) => {
            setPrintLabelModalData({ batch: b, spk: s });
          }}
        />
      )}

      {/* Modal Detail & Edit HPP Produk */}
      {hppModalData && (
        <ModalDetailHPP
          isOpen={Boolean(hppModalData)}
          onClose={() => setHppModalData(null)}
          produkId={hppModalData.produkId}
          sku={hppModalData.sku}
          namaProduk={hppModalData.namaProduk}
          currentHpp={hppModalData.currentHpp}
          currentPanjangKain={hppModalData.currentPanjangKain}
          currentKainNama={hppModalData.currentKainNama}
          currentHargaKainCm={hppModalData.currentHargaKainCm}
          onSave={(updated) => {
            const { hpp, panjang_kain_cm, kain_nama, harga_kain_cm } = updated;

            if (hppModalData.mode === "form") {
              const { spkIdx, prodIdx } = hppModalData;
              setFormData((prev) => {
                const list = [...prev.spk_list];
                const items = [...list[spkIdx].produk_items];
                const q = Number(items[prodIdx]?.qty || 1);
                items[prodIdx] = {
                  ...items[prodIdx],
                  hpp: Number(hpp || 0),
                  panjang_kain_cm: Number(panjang_kain_cm || 0),
                  kain_nama: kain_nama || items[prodIdx]?.kain_nama,
                  harga_kain_cm: Number(harga_kain_cm || items[prodIdx]?.harga_kain_cm || 150),
                  estimasi_kain: buildEstimasiKain(
                    kain_nama || items[prodIdx]?.kain_nama || "Kain",
                    Number(panjang_kain_cm || 0),
                    Number(harga_kain_cm || 150),
                    q,
                  ),
                };
                list[spkIdx] = { ...list[spkIdx], produk_items: items };
                return { ...prev, spk_list: list };
              });
            } else if (hppModalData.mode === "detail") {
              // Update detailBatch state
              setDetailBatch((prev) => {
                if (!prev) return prev;
                const spkList = [...(prev.spk_list || [])];
                const sIdx = hppModalData.spkIdx;
                const pIdx = hppModalData.prodIdx;
                if (spkList[sIdx] && spkList[sIdx].produk_items) {
                  const items = [...spkList[sIdx].produk_items];
                  items[pIdx] = {
                    ...items[pIdx],
                    hpp: Number(hpp || 0),
                    panjang_kain_cm: Number(panjang_kain_cm || 0),
                    kain_nama: kain_nama || items[pIdx]?.kain_nama,
                  };
                  spkList[sIdx] = { ...spkList[sIdx], produk_items: items };
                }
                return { ...prev, spk_list: spkList };
              });

              // Also update batchList in memory
              setBatchList((prev) =>
                prev.map((b) => {
                  if (b.id !== detailBatch?.id) return b;
                  const spkList = [...(b.spk_list || [])];
                  const sIdx = hppModalData.spkIdx;
                  const pIdx = hppModalData.prodIdx;
                  if (spkList[sIdx] && spkList[sIdx].produk_items) {
                    const items = [...spkList[sIdx].produk_items];
                    items[pIdx] = {
                      ...items[pIdx],
                      hpp: Number(hpp || 0),
                      panjang_kain_cm: Number(panjang_kain_cm || 0),
                      kain_nama: kain_nama || items[pIdx]?.kain_nama,
                    };
                    spkList[sIdx] = { ...spkList[sIdx], produk_items: items };
                  }
                  return { ...b, spk_list: spkList };
                }),
              );
            }

            // Sync master produk list in memory
            loadProdukList();
            setHppModalData(null);
          }}
        />
      )}

      {/* Modal Tambah / Edit Pelanggan (Langsung dari Form SPK) */}
      {pelangganModal && pelangganModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            zIndex: 2700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setPelangganModal(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "12px 16px",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={18} />
                <span style={{ fontSize: "13px", fontWeight: "800" }}>
                  {pelangganModal.mode === "edit" ? "Edit Data Pelanggan" : "Tambah Pelanggan Baru"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPelangganModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePelanggan}>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                    Kode Pelanggan
                  </label>
                  <input
                    type="text"
                    value={pelangganModal.data?.kode_pelanggan || ""}
                    onChange={(e) =>
                      setPelangganModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, kode_pelanggan: e.target.value },
                      }))
                    }
                    placeholder="PLG-2026-001"
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontFamily: "monospace",
                      fontWeight: "700",
                      backgroundColor: "#f8fafc",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                    Nama Pelanggan / Instansi <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pelangganModal.data?.nama_pelanggan || ""}
                    onChange={(e) =>
                      setPelangganModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, nama_pelanggan: e.target.value },
                      }))
                    }
                    placeholder="Contoh: Pesantren Al-Hikmah Bandung"
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "600",
                      color: "#0f172a",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                      No. WhatsApp / HP
                    </label>
                    <input
                      type="text"
                      value={pelangganModal.data?.no_hp || ""}
                      onChange={(e) =>
                        setPelangganModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, no_hp: e.target.value },
                        }))
                      }
                      placeholder="08123456789"
                      style={{
                        width: "100%",
                        padding: "6px 9px",
                        borderRadius: "5px",
                        border: "1px solid #cbd5e1",
                        fontSize: "11.5px",
                        color: "#0f172a",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                      Kategori Pelanggan
                    </label>
                    <select
                      value={pelangganModal.data?.kategori_pelanggan || "Umum"}
                      onChange={(e) =>
                        setPelangganModal((prev) => ({
                          ...prev,
                          data: { ...prev.data, kategori_pelanggan: e.target.value },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "6px 9px",
                        borderRadius: "5px",
                        border: "1px solid #cbd5e1",
                        fontSize: "11.5px",
                        color: "#0f172a",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <option value="Umum">Umum</option>
                      <option value="Dropship">Dropship</option>
                      <option value="Sekolah / Instansi">Sekolah / Instansi</option>
                      <option value="Konveksi">Konveksi</option>
                      <option value="Reseller">Reseller</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                    Alamat Lengkap
                  </label>
                  <textarea
                    rows={2}
                    value={pelangganModal.data?.alamat || ""}
                    onChange={(e) =>
                      setPelangganModal((prev) => ({
                        ...prev,
                        data: { ...prev.data, alamat: e.target.value },
                      }))
                    }
                    placeholder="Alamat pengiriman / domisili..."
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      color: "#0f172a",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPelangganModal(null)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPelanggan}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "5px",
                    border: "none",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontSize: "11.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    opacity: savingPelanggan ? 0.7 : 1,
                  }}
                >
                  <Save size={13} />
                  <span>{savingPelanggan ? "Menyimpan..." : "Simpan Pelanggan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
