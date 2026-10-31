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
            harga_jual: Number(p.harga_jual || 0),
            sku_kain: p.sku_kain || "",
            nama_kain: p.nama_kain || "",
            panjang_kain_cm: (() => {
              const raw = p.estimasi_kain ?? p.panjang_kain_cm;
              const num = parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
              return !isNaN(num) ? Math.round(num) : 200;
            })(),
            estimasi_kain: (() => {
              const raw = p.estimasi_kain ?? p.panjang_kain_cm;
              const num = parseFloat(String(raw ?? "").replace(/[^0-9.]/g, ""));
              return !isNaN(num) ? Math.round(num) : 200;
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
  }, [activeCompany]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterPenjahit, setFilterPenjahit] = useState("Semua");
  const [filterTahapan, setFilterTahapan] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [detailSpk, setDetailSpk] = useState(null);
  const [expandedBatch, setExpandedBatch] = useState({ 1: true });
  const [activeTabSpkIdx, setActiveTabSpkIdx] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [previewDesign, setPreviewDesign] = useState(null); // { url, title }
  const [printModalData, setPrintModalData] = useState(null); // { batch, spk }
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

      // Jika qty diubah, hitung ulang estimasi kain otomatis jika ada spesifikasi kain
      if (field === "qty") {
        const q = Number(val || 0);
        const kainNama =
          current.kain_nama ||
          current.estimasi_kain?.split(" - ")?.[0] ||
          "Kain";
        const cmPerPcs = Number(current.panjang_kain_cm || 0);
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
        return { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
      case "sampling":
        return { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" };
      case "print_kain":
        return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
      case "potong":
        return { bg: "#fef3c7", color: "#d97706", border: "#fde68a" };
      case "jahit":
        return { bg: "#e0f2fe", color: "#0284c7", border: "#bae6fd" };
      case "finishing":
        return { bg: "#ecfeff", color: "#0891b2", border: "#a5f3fc" };
      case "selesai":
        return { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" };
      case "batal":
        return { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
      default:
        return { bg: "#f8fafc", color: "#334155", border: "#e2e8f0" };
    }
  };

  // Flatten batch produksi menjadi baris SPK individu (gaya Penjualan Offline)
  const allSpkRows = useMemo(() => {
    const rows = [];
    companyBatches.forEach((batch) => {
      const list = batch.spk_list || [];
      if (list.length === 0) {
        rows.push({
          id_spk: `SPK-${batch.kode_produksi?.replace(/[^a-zA-Z0-9]/g, "") || "01"}`,
          nama_spk: "SPK Produksi",
          penjahit: "-",
          status_spk: batch.status || "Perencanaan",
          design_img: null,
          produk_items: [],
          batch_id: batch.id,
          batch_obj: batch,
          kode_produksi: batch.kode_produksi,
          nama_pelanggan: batch.nama_pelanggan,
          tgl_pesan: batch.tgl_pesan,
          deadline: batch.deadline,
          company_code: batch.company_code,
          spk_index: 0,
        });
      } else {
        list.forEach((spk, sIdx) => {
          rows.push({
            ...spk,
            batch_id: batch.id,
            batch_obj: batch,
            kode_produksi: batch.kode_produksi,
            nama_pelanggan: batch.nama_pelanggan,
            tgl_pesan: batch.tgl_pesan,
            deadline: batch.deadline,
            company_code: batch.company_code,
            spk_index: sIdx,
          });
        });
      }
    });
    return rows;
  }, [companyBatches]);

  const countByTahapan = (val) => {
    if (val === "semua") return allSpkRows.length;
    return allSpkRows.filter(
      (r) => getNormalizedStatus(r.status_spk || r.batch_obj?.status) === val,
    ).length;
  };

  const SPK_TABS_CONFIG = [
    {
      value: "semua",
      label: `Semua SPK (${allSpkRows.length})`,
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
    allSpkRows.forEach((r) => {
      if (r.penjahit && r.penjahit !== "-") set.add(r.penjahit);
    });
    karyawanOptions.forEach((k) => {
      if (k.nama) set.add(k.nama);
    });
    return Array.from(set);
  }, [allSpkRows, karyawanOptions]);

  const tahapanFilterOptions = useMemo(() => {
    const set = new Set();
    allSpkRows.forEach((r) => {
      if (r.status_spk) set.add(r.status_spk);
    });
    tahapanOptions.forEach((t) => {
      if (t.nama_tahapan) set.add(t.nama_tahapan);
    });
    return Array.from(set);
  }, [allSpkRows, tahapanOptions]);

  const filteredSpkRows = useMemo(() => {
    return allSpkRows.filter((spk) => {
      if (filterStatus !== "semua") {
        const norm = getNormalizedStatus(
          spk.status_spk || spk.batch_obj?.status,
        );
        if (norm !== filterStatus) return false;
      }
      if (filterPenjahit !== "Semua") {
        if ((spk.penjahit || "") !== filterPenjahit) return false;
      }
      if (filterTahapan !== "Semua") {
        if ((spk.status_spk || "") !== filterTahapan) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = (spk.id_spk || "").toLowerCase().includes(q);
        const matchNama = (spk.nama_spk || "").toLowerCase().includes(q);
        const matchBatch = (spk.kode_produksi || "").toLowerCase().includes(q);
        const matchPelanggan = (spk.nama_pelanggan || "")
          .toLowerCase()
          .includes(q);
        const matchPenjahit = (spk.penjahit || "").toLowerCase().includes(q);
        const matchProduk = (spk.produk_items || []).some(
          (p) =>
            (p.nama_produk || "").toLowerCase().includes(q) ||
            (p.sku || "").toLowerCase().includes(q) ||
            (p.kain_nama || "").toLowerCase().includes(q),
        );
        if (
          !matchId &&
          !matchNama &&
          !matchBatch &&
          !matchPelanggan &&
          !matchPenjahit &&
          !matchProduk
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allSpkRows, filterStatus, filterPenjahit, filterTahapan, search]);

  const totalPages = Math.ceil(filteredSpkRows.length / entriesPerPage);
  const paginatedSpkRows = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredSpkRows.slice(start, start + entriesPerPage);
  }, [filteredSpkRows, currentPage, entriesPerPage]);

  const handleDeleteSpkItem = async (spkRow) => {
    const ok = await showConfirm(
      "Hapus SPK",
      `Apakah Anda yakin ingin menghapus SPK ${spkRow.id_spk} (${spkRow.nama_spk})?`,
      "Ya, Hapus",
    );
    if (!ok) return;

    const targetBatch = batchList.find((b) => b.id === spkRow.batch_id);
    if (!targetBatch) return;

    if (!targetBatch.spk_list || targetBatch.spk_list.length <= 1) {
      await handleDeleteBatch(targetBatch);
    } else {
      const updatedSpkList = targetBatch.spk_list.filter(
        (_, idx) => idx !== spkRow.spk_index,
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

      toastSuccess(`SPK ${spkRow.id_spk} berhasil dihapus`);
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
                    NO SPK & PRODUKSI
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
                    STATUS / TAHAPAN
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
                ) : paginatedSpkRows.length === 0 ? (
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
                  paginatedSpkRows.map((spk, idx) => {
                    const rowNumber =
                      (currentPage - 1) * entriesPerPage + idx + 1;
                    const items = spk.produk_items || [];
                    const spkTotalQty = items.reduce(
                      (acc, p) => acc + Number(p.qty || 0),
                      0,
                    );
                    const badgeStyle = getStatusBadgeStyle(
                      spk.status_spk || spk.batch_obj?.status,
                    );

                    const firstKainItem = items.find(
                      (p) => Number(p.panjang_kain_cm) > 0 || p.kain_nama,
                    );

                    return (
                      <tr
                        key={`${spk.batch_id}-${spk.id_spk}-${idx}`}
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

                        {/* 2. NO SPK & PRODUKSI */}
                        <td
                          style={{
                            padding: "6px 8px",
                            border: "1px solid #cbd5e1",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: "800",
                                color: "#0284c7",
                                fontSize: "12px",
                              }}
                            >
                              {spk.id_spk}
                            </span>
                            {spk.design_img && (
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
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#1e293b",
                              marginTop: "1px",
                            }}
                          >
                            {spk.nama_spk || "SPK Produksi"}
                          </div>
                          <div
                            style={{
                              fontSize: "9.5px",
                              color: "#6b21a8",
                              fontFamily: "monospace",
                              fontWeight: "700",
                              backgroundColor: "#faf5ff",
                              border: "1px solid #f3e8ff",
                              borderRadius: "3px",
                              display: "inline-block",
                              padding: "0 4px",
                              marginTop: "2px",
                            }}
                          >
                            {spk.kode_produksi}
                          </div>
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
                            {spk.nama_pelanggan || "-"}
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
                                {spk.deadline || "-"}
                              </b>
                            </span>
                          </div>
                          {spk.tgl_pesan && (
                            <div
                              style={{
                                fontSize: "9.5px",
                                color: "#94a3b8",
                                marginTop: "1px",
                              }}
                            >
                              Tgl Pesan: {spk.tgl_pesan}
                            </div>
                          )}
                        </td>

                        {/* 4. STATUS / TAHAPAN */}
                        <td
                          style={{
                            padding: "6px 8px",
                            border: "1px solid #cbd5e1",
                            textAlign: "center",
                            verticalAlign: "middle",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "10.5px",
                              fontWeight: "800",
                              textTransform: "uppercase",
                              letterSpacing: "0.02em",
                              backgroundColor: badgeStyle.bg,
                              color: badgeStyle.color,
                              border: `1px solid ${badgeStyle.border}`,
                            }}
                          >
                            {spk.status_spk || spk.batch_obj?.status || "Proses"}
                          </span>
                        </td>

                        {/* 8. AKSI (STYLE PENJUALAN OFFLINE) */}
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
                            {/* Detail Button */}
                            <button
                              type="button"
                              onClick={() => setDetailSpk(spk)}
                              title="Lihat Detail SPK"
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "1px solid #38bdf8",
                                backgroundColor: "#0284c7",
                                color: "#ffffff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <Eye size={12} />
                            </button>

                            {/* Print Button */}
                            <button
                              type="button"
                              onClick={() =>
                                setPrintModalData({
                                  batch: spk.batch_obj,
                                  spk: spk,
                                })
                              }
                              title="Cetak SPK"
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "1px solid #818cf8",
                                backgroundColor: "#6366f1",
                                color: "#ffffff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <Printer size={12} />
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenEdit(spk.batch_obj, spk.spk_index)
                              }
                              title="Edit SPK & Produksi"
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "1px solid #38bdf8",
                                backgroundColor: "#f0f9ff",
                                color: "#0284c7",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <Edit3 size={12} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSpkItem(spk)}
                              title="Hapus SPK"
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "4px",
                                border: "1px solid #fca5a5",
                                backgroundColor: "#ef4444",
                                color: "#ffffff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
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
                {filteredSpkRows.length === 0
                  ? 0
                  : (currentPage - 1) * entriesPerPage + 1}
              </b>{" "}
              sampai{" "}
              <b style={{ color: "#0f172a" }}>
                {Math.min(currentPage * entriesPerPage, filteredSpkRows.length)}
              </b>{" "}
              dari{" "}
              <b style={{ color: "#0f172a" }}>{filteredSpkRows.length}</b> SPK
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

      {/* DETAIL SPK MODAL (MATCHING PENJUALAN OFFLINE DETAIL MODAL) */}
      {detailSpk && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            zIndex: 2100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setDetailSpk(null)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "780px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
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
                <ClipboardList size={18} />
                <span style={{ fontSize: "14px", fontWeight: "800" }}>
                  Detail SPK: {detailSpk.id_spk} — {detailSpk.nama_spk}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailSpk(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
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
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>
                    NO PRODUKSI
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#0284c7", fontFamily: "monospace" }}>
                    {detailSpk.kode_produksi}
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
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>
                    PELANGGAN
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a" }}>
                    {detailSpk.nama_pelanggan || "-"}
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
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>
                    PENJAHIT / MAKLOON
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a" }}>
                    {detailSpk.penjahit || "-"}
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
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "700" }}>
                    DEADLINE & STATUS
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#0284c7" }}>
                    {detailSpk.deadline || "-"} •{" "}
                    <span style={{ color: "#166534" }}>
                      {detailSpk.status_spk || "Proses"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Design Image Preview */}
              {detailSpk.design_img && (
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
                    src={detailSpk.design_img}
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
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a" }}>
                      File Design SPK
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                      Foto / instruksi pola dan mockup pengerjaan
                    </div>
                  </div>
                </div>
              )}

              {/* Products Table */}
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#0f172a",
                    marginBottom: "6px",
                  }}
                >
                  Daftar Produk ({detailSpk.produk_items?.length || 0} Macam):
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
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px", width: "35px", textAlign: "center" }}>NO</th>
                        <th style={{ padding: "6px 8px" }}>SKU & NAMA PRODUK</th>
                        <th style={{ padding: "6px 8px", textAlign: "center", width: "80px" }}>QTY</th>
                        <th style={{ padding: "6px 8px" }}>ESTIMASI KAIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailSpk.produk_items || []).map((p, pIdx) => (
                        <tr key={pIdx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "5px 8px", textAlign: "center", color: "#64748b" }}>
                            {pIdx + 1}
                          </td>
                          <td style={{ padding: "5px 8px" }}>
                            <div style={{ fontWeight: "700", color: "#0f172a" }}>
                              {p.nama_produk}
                            </div>
                            {p.sku && (
                              <span style={{ fontSize: "9.5px", fontFamily: "monospace", color: "#0284c7" }}>
                                {p.sku}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: "800" }}>
                            {p.qty} {p.satuan || "PCS"}
                          </td>
                          <td style={{ padding: "5px 8px" }}>
                            {Number(p.panjang_kain_cm) > 0 ? (
                              <span style={{ fontSize: "10px", color: "#166534" }}>
                                ✂️ {p.kain_nama || "Kain"} ({p.panjang_kain_cm} cm/pcs) • Butuh:{" "}
                                {((Number(p.panjang_kain_cm) || 0) * (Number(p.qty) || 1)).toLocaleString("id-ID")} cm
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
                  setPrintModalData({
                    batch: detailSpk.batch_obj,
                    spk: detailSpk,
                  });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "5px",
                  border: "1px solid #818cf8",
                  backgroundColor: "#6366f1",
                  color: "#ffffff",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                <Printer size={13} />
                <span>Cetak SPK</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const b = detailSpk.batch_obj;
                  const idx = detailSpk.spk_index;
                  setDetailSpk(null);
                  handleOpenEdit(b, idx);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "5px",
                  border: "1px solid #38bdf8",
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                <Edit3 size={13} />
                <span>Edit SPK</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailSpk(null)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "5px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
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
                  </div>
                  <SearchableSelect
                    value={formData.nama_pelanggan}
                    onChange={(val, opt) => {
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
                    options={pelangganOptions.map((p) => ({
                      value: p.nama_pelanggan,
                      label: p.nama_pelanggan,
                      displayLabel: p.nama_pelanggan,
                      item: p,
                    }))}
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
                    Tahapan Saat Ini
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px 9px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      color: "#0f172a",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {tahapanOptions.map((t) => (
                      <option key={t.id || t.kode_tahapan} value={t.nama_tahapan}>
                        {t.emoji ? `${t.emoji} ` : ""}{t.nama_tahapan}
                      </option>
                    ))}
                  </select>
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
                                  }}
                                >
                                  NAMA PRODUK
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
                                    width: "35px",
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
                                          bundle_items: prod.bundle_items || [],
                                        },
                                        ...productSelectOptions,
                                      ];

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

                                    {/* 2. NAMA PRODUK, SKU & ESTIMASI KAIN */}
                                    <td style={{ padding: "4px 6px", verticalAlign: "middle" }}>
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

                                        {/* Estimasi Kain Gabungan Ringkas */}
                                        {(Number(prod.panjang_kain_cm) > 0 || prod.kain_nama) && (
                                          <span
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "4px",
                                              padding: "1px 6px",
                                              borderRadius: "3px",
                                              backgroundColor: "#f0fdf4",
                                              color: "#166534",
                                              fontSize: "9px",
                                              fontWeight: "600",
                                              border: "1px solid #bbf7d0",
                                            }}
                                          >
                                            <Scissors size={9} color="#16a34a" />
                                            <b style={{ color: "#15803d" }}>
                                              {prod.kain_nama || "Kain"}
                                            </b>
                                            <span style={{ color: "#16a34a" }}>
                                              ({prod.panjang_kain_cm || 0} cm/pcs)
                                            </span>
                                            <span style={{ color: "#86efac" }}>•</span>
                                            <span>
                                              Butuh:{" "}
                                              <b style={{ fontFamily: "monospace", color: "#166534" }}>
                                                {(
                                                  (Number(prod.panjang_kain_cm) || 0) *
                                                  (Number(prod.qty) || 1)
                                                ).toLocaleString("id-ID")}{" "}
                                                cm
                                              </b>{" "}
                                              (
                                              {(
                                                ((Number(prod.panjang_kain_cm) || 0) *
                                                  (Number(prod.qty) || 1)) /
                                                100
                                              ).toFixed(1)}
                                              m)
                                            </span>
                                            {Number(prod.harga_kain_cm) > 0 && (
                                              <>
                                                <span style={{ color: "#86efac" }}>•</span>
                                                <span>
                                                  Est. Biaya:{" "}
                                                  <b style={{ color: "#15803d" }}>
                                                    Rp{" "}
                                                    {(
                                                      (Number(prod.panjang_kain_cm) || 0) *
                                                      (Number(prod.qty) || 1) *
                                                      (Number(prod.harga_kain_cm) || 0)
                                                    ).toLocaleString("id-ID")}
                                                  </b>{" "}
                                                  <span style={{ color: "#16a34a", fontSize: "8.5px" }}>
                                                    (@Rp {Number(prod.harga_kain_cm || 0).toLocaleString("id-ID")}/cm)
                                                  </span>
                                                </span>
                                              </>
                                            )}
                                          </span>
                                        )}

                                      </div>
                                    </td>

                                    {/* 3. QTY */}
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

                                    {/* 4. AKSI */}
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
      {/* Modal Cetak SPK */}
      <CetakSPKModal
        isOpen={Boolean(printModalData)}
        onClose={() => setPrintModalData(null)}
        batch={printModalData?.batch}
        spk={printModalData?.spk}
        adminName={activeCompany?.name || "RUANG SERAGAM"}
      />
    </div>
  );
}
