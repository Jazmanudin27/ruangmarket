import React, { useState, useEffect, useRef } from "react";
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
import { getActiveCompany } from "../../utils/tenant.util";
import CetakSPKModal from "../../components/CetakSPKModal";

export const SPK_STORAGE_KEY = "ruangmarket_spk_v2"; // version bump for new nested structure
const PRODUK_STORAGE_KEY = "ruangmarket_produk_gamis_v4";

// Searchable Select Component with instant search filter
function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  required = false,
  renderItem,
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

  const filteredOptions = options.filter((opt) => {
    const text =
      typeof opt === "string"
        ? opt
        : `${opt.label || opt.value || opt.nama_produk || opt.nama || ""} ${opt.sku || ""} ${opt.kategori || ""}`;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedFound = options.find((opt) =>
    typeof opt === "string" ? opt === value : opt.value === value,
  );
  const selectedDisplay = () => {
    const found = selectedFound;
    if (!found) return placeholder;
    return typeof found === "string"
      ? found
      : found.displayLabel || found.label || found.value;
  };
  const selectedTitle =
    selectedFound && typeof selectedFound !== "string"
      ? selectedFound.label || ""
      : selectedFound || "";

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
          padding: "6px 9px",
          borderRadius: "5px",
          border: isOpen ? "1px solid #0284c7" : "1px solid #cbd5e1",
          fontSize: "11px",
          fontWeight: "600",
          color: value ? "#0f172a" : "#94a3b8",
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
            zIndex: 3000,
            maxHeight: "220px",
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
                placeholder="Ketik untuk mencari..."
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
                const isSelected = optVal === value;

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
      const res = await fetch(`/api/spk?kode_perusahaan=${activeCompany?.code || "RSG"}`);
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

  const [pelangganOptions, setPelangganOptions] = useState([]);

  const loadPelangganOptions = async () => {
    try {
      const res = await fetch(`/api/pelanggan?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          setPelangganOptions(json.data);
          return;
        }
      }
    } catch (e) {}
    try {
      const saved = localStorage.getItem('ruangmarket_pelanggan_master');
      if (saved) setPelangganOptions(JSON.parse(saved) || []);
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
  }, [activeCompany]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
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
    const cm = Number(cmPerPcs || 0);
    const hrg = Number(hargaCm || 0);
    const totalCm = cm * q;
    const totalMeter = (totalCm / 100).toFixed(1).replace(/\.0$/, "");
    const totalBiaya = totalCm * hrg;
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
              kain_nama: p1.estimasi_kain || "Kain Polos",
              panjang_kain_cm: p1.panjang_kain_cm || 200,
              harga_kain_cm: p1.harga_kain_cm || 150,
              estimasi_kain: buildEstimasiKain(
                p1.estimasi_kain || "Kain Polos",
                p1.panjang_kain_cm || 200,
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
  const handleOpenEdit = (batch) => {
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
    setActiveTabSpkIdx(0);
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
    const kainNama = pDefault.estimasi_kain || "Kain Polos";
    const cmPerPcs = Number(pDefault.panjang_kain_cm || 200);
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
          sku: pDefault.sku,
          nama_produk: pDefault.nama_produk,
          kategori: pDefault.kategori,
          satuan: pDefault.satuan,
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
    const kainNama = pDefault.estimasi_kain || "Kain Polos";
    const cmPerPcs = Number(pDefault.panjang_kain_cm || 200);
    const hargaCm = Number(pDefault.harga_kain_cm || 150);

    const newItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      no_spk: targetSpk.id_spk,
      produk_id: pDefault.id,
      sku: pDefault.sku,
      nama_produk: pDefault.nama_produk,
      kategori: pDefault.kategori,
      satuan: pDefault.satuan,
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
  const handleSelectProductForSPK = (spkIdx, prodIdx, selectedId) => {
    const prod =
      produkList.find((p) => p.id === Number(selectedId)) ||
      produkList.find((p) => p.id === selectedId);
    if (!prod) return;

    setFormData((prev) => {
      const list = [...prev.spk_list];
      const items = [...list[spkIdx].produk_items];
      const targetQty = items[prodIdx]?.qty || 50;
      const kainNama = prod.estimasi_kain || "Kain Polos";
      const cmPerPcs = Number(prod.panjang_kain_cm || 200);
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
            const bCm = (Number(bi.panjang_kain_cm) || 0) * targetQty;
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
      const res = await fetch("/api/spk", {
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
      await fetch(`/api/spk?id=${batch.id}`, { method: "DELETE" });
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

  const filteredBatch = companyBatches.filter((b) => {
    const q = search.toLowerCase();
    const matchHeader =
      (b.kode_produksi || "").toLowerCase().includes(q) ||
      (b.nama_pelanggan || "").toLowerCase().includes(q);
    const matchSpk = (b.spk_list || []).some(
      (s) =>
        (s.id_spk || "").toLowerCase().includes(q) ||
        (s.nama_spk || "").toLowerCase().includes(q) ||
        (s.penjahit || "").toLowerCase().includes(q) ||
        (s.produk_items || []).some(
          (p) =>
            (p.nama_produk || "").toLowerCase().includes(q) ||
            (p.sku || "").toLowerCase().includes(q),
        ),
    );
    return matchHeader || matchSpk;
  });

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
        {/* HEADER SECTION (BLUE GRADIENT) */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "10px",
            boxShadow: "0 2px 4px rgba(2, 132, 199, 0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <ClipboardList size={16} />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: "800",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                Surat Perintah Kerja (SPK) Produksi
              </h1>
              <div
                style={{
                  fontSize: "10.5px",
                  color: "#e0f2fe",
                  marginTop: "1px",
                }}
              >
                Hirarki: 1 No Produksi ➔ Memiliki Beberapa SPK ➔ Setiap SPK
                Memiliki Beberapa Produk
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={loadSpkData}
              title="Muat ulang data dari database"
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "0 10px",
                borderRadius: "5px",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={12} className={isLoadingSpk ? "animate-spin" : ""} />
              <span>Muat Ulang</span>
            </button>

            <button
              onClick={handleOpenAdd}
              style={{
                height: "28px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "0 12px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "#ffffff",
                color: "#0284c7",
                fontSize: "11.5px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Plus size={13} />
              <span>Buat No Produksi Baru</span>
            </button>
          </div>
        </div>

        {/* SEARCH FILTER BAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 10px",
            backgroundColor: "#f8fafc",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
            marginBottom: "10px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "5px",
              padding: "4px 8px",
              flex: "1 1 250px",
            }}
          >
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Cari no produksi, no spk, penjahit, nama produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                fontSize: "11px",
                width: "100%",
                color: "#0f172a",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#64748b",
              marginLeft: "auto",
            }}
          >
            Total {filteredBatch.length} Batch Produksi
          </div>
        </div>

        {/* LIST OF BATCH PRODUKSI */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredBatch.map((batch) => {
            const isExp = expandedBatch[batch.id];
            const spkList = batch.spk_list || [];

            // Calculate totals across all SPK and all Produk
            let totalProdukCount = 0;
            let totalQtyTarget = 0;
            spkList.forEach((s) => {
              (s.produk_items || []).forEach((p) => {
                totalProdukCount += 1;
                totalQtyTarget += Number(p.qty || 0);
              });
            });

            return (
              <div
                key={batch.id}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  overflow: "hidden",
                }}
              >
                {/* 1. LEVEL 1: NO PRODUKSI CARD HEADER */}
                <div
                  onClick={() => toggleBatch(batch.id)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderBottom: isExp ? "1px solid #cbd5e1" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "4px",
                        backgroundColor: "#e0f2fe",
                        color: "#0284c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isExp ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </div>

                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "800",
                            color: "#0284c7",
                            fontFamily: "monospace",
                          }}
                        >
                          {batch.kode_produksi}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "1px 7px",
                            borderRadius: "4px",
                            backgroundColor: "#e0f2fe",
                            color: "#0369a1",
                          }}
                        >
                          {spkList.length} SPK Terkait
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "1px 7px",
                            borderRadius: "4px",
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                          }}
                        >
                          {totalProdukCount} Total Produk ({totalQtyTarget} PCS)
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "800",
                          color: "#0f172a",
                          marginTop: "2px",
                        }}
                      >
                        Pelanggan: {batch.nama_pelanggan}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Dates */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                        Tgl Pesan:{" "}
                        <b style={{ color: "#0f172a" }}>
                          {batch.tgl_pesan || "-"}
                        </b>
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                        Deadline:{" "}
                        <b style={{ color: "#0284c7" }}>
                          {batch.deadline || "-"}
                        </b>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {batch.spk_list && batch.spk_list.length > 0 && (
                        <button
                          onClick={() => setPrintModalData({ batch, spk: batch.spk_list[0] })}
                          title="Cetak SPK Pertama"
                          style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "5px",
                            border: "1px solid #0284c7",
                            backgroundColor: "#f0f9ff",
                            color: "#0284c7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <Printer size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(batch)}
                        title="Edit Kode Produksi & SPK"
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "5px",
                          border: "1px solid #38bdf8",
                          backgroundColor: "#f0f9ff",
                          color: "#0284c7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        onClick={() => handleDeleteBatch(batch)}
                        title="Hapus Kode Produksi & SPK"
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "5px",
                          border: "1px solid #ef4444",
                          backgroundColor: "#fef2f2",
                          color: "#ef4444",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. LEVEL 2 & 3: SPK CARDS & PRODUK TABLES */}
                {isExp && (
                  <div
                    style={{
                      padding: "10px 14px",
                      backgroundColor: "#f1f5f9",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {spkList.map((spk, sIdx) => {
                      const produkItems = spk.produk_items || [];
                      const spkTotalQty = produkItems.reduce(
                        (acc, p) => acc + Number(p.qty || 0),
                        0,
                      );

                      return (
                        <div
                          key={sIdx}
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "7px",
                            backgroundColor: "#ffffff",
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                            overflow: "hidden",
                          }}
                        >
                          {/* SPK Header Strip with Design Thumbnail */}
                          <div
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#f8fafc",
                              borderBottom: "1px solid #e2e8f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: "#0284c7",
                                  color: "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                  fontFamily: "monospace",
                                }}
                              >
                                {spk.id_spk}
                              </span>

                              {/* Design Image Thumbnail on SPK Header (Per SPK) */}
                              {spk.design_img ? (
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <div
                                    onClick={() =>
                                      setPreviewDesign({
                                        url: spk.design_img,
                                        title: `Design SPK: ${spk.id_spk} - ${spk.nama_spk}`,
                                      })
                                    }
                                    title="Klik untuk memperbesar gambar design SPK"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "4px",
                                      border: "1px solid #38bdf8",
                                      overflow: "hidden",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: "#f0f9ff",
                                    }}
                                  >
                                    <img
                                      src={spk.design_img}
                                      alt="Design SPK"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  </div>
                                  <label
                                    title="Ganti gambar design SPK ini"
                                    style={{
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      border: "1px solid #bae6fd",
                                      backgroundColor: "#f0f9ff",
                                      color: "#0284c7",
                                      fontSize: "10px",
                                      fontWeight: "700",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                    }}
                                  >
                                    <Upload size={10} />
                                    <span>Ganti</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file)
                                          handleDirectUploadDesignSpk(
                                            batch.id,
                                            sIdx,
                                            file,
                                          );
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label
                                  title="Upload file design untuk SPK ini (JPG, PNG)"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    border: "1px dashed #38bdf8",
                                    backgroundColor: "#f0f9ff",
                                    color: "#0284c7",
                                    fontSize: "10px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Upload size={10} />
                                  <span>+ Upload Design SPK</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file)
                                        handleDirectUploadDesignSpk(
                                          batch.id,
                                          sIdx,
                                          file,
                                        );
                                    }}
                                  />
                                </label>
                              )}

                              <span
                                style={{
                                  fontSize: "11.5px",
                                  fontWeight: "800",
                                  color: "#0f172a",
                                }}
                              >
                                {spk.nama_spk}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "11px",
                                  color: "#334155",
                                }}
                              >
                                <User size={12} color="#0284c7" />
                                <span>
                                  Penjahit:{" "}
                                  <b style={{ color: "#0f172a" }}>
                                    {spk.penjahit || "-"}
                                  </b>
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "800",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  backgroundColor: "#eff6ff",
                                  color: "#0284c7",
                                  border: "1px solid #bfdbfe",
                                }}
                              >
                                {spk.status_spk || "Proses"}
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "800",
                                  color: "#0f172a",
                                }}
                              >
                                Total: {spkTotalQty} PCS
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrintModalData({ batch, spk });
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "3px 9px",
                                  borderRadius: "4px",
                                  border: "1px solid #0284c7",
                                  backgroundColor: "#0284c7",
                                  color: "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                }}
                                title="Cetak Surat Perintah Kerja (SPK)"
                              >
                                <Printer size={12} />
                                <span>Cetak SPK</span>
                              </button>
                            </div>
                          </div>

                          {/* Table of Products Inside This SPK (Matching Excel Columns) */}
                          <div style={{ overflowX: "auto" }}>
                            <table
                              style={{
                                width: "100%",
                                minWidth: "820px",
                                borderCollapse: "collapse",
                                fontSize: "11px",
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    backgroundColor: "#ffffff",
                                    borderBottom: "1px solid #cbd5e1",
                                    textAlign: "left",
                                  }}
                                >
                                  <th
                                    style={{
                                      padding: "6px 10px",
                                      fontWeight: "800",
                                      color: "#475569",
                                      width: "30px",
                                      textAlign: "center",
                                    }}
                                  >
                                    NO
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 10px",
                                      fontWeight: "800",
                                      color: "#475569",
                                      width: "90px",
                                    }}
                                  >
                                    NO SPK
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 10px",
                                      fontWeight: "800",
                                      color: "#475569",
                                      width: "100px",
                                    }}
                                  >
                                    SKU
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 10px",
                                      fontWeight: "800",
                                      color: "#475569",
                                    }}
                                  >
                                    NAMA PRODUK
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 10px",
                                      fontWeight: "800",
                                      color: "#475569",
                                      width: "120px",
                                    }}
                                  >
                                    KATEGORI
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 10px",
                                      fontWeight: "800",
                                      color: "#475569",
                                      width: "70px",
                                      textAlign: "center",
                                    }}
                                  >
                                    SATUAN
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 10px",
                                      fontWeight: "800",
                                      color: "#475569",
                                      width: "80px",
                                      textAlign: "center",
                                    }}
                                  >
                                    QTY
                                  </th>
                                  <th
                                    style={{
                                      padding: "6px 10px",
                                      fontWeight: "800",
                                      color: "#0369a1",
                                      width: "260px",
                                    }}
                                  >
                                    ESTIMASI KAIN (CM & BIAYA)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {produkItems.map((prod, pIdx) => (
                                  <tr
                                    key={pIdx}
                                    style={{
                                      borderBottom: "1px solid #f1f5f9",
                                      backgroundColor:
                                        pIdx % 2 === 0 ? "#ffffff" : "#fafafa",
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: "5px 10px",
                                        textAlign: "center",
                                        color: "#64748b",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {pIdx + 1}
                                    </td>
                                    <td
                                      style={{
                                        padding: "5px 10px",
                                        fontWeight: "800",
                                        color: "#0284c7",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {prod.no_spk || spk.id_spk}
                                    </td>
                                    <td
                                      style={{
                                        padding: "5px 10px",
                                        fontWeight: "700",
                                        color: "#475569",
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {prod.sku || "-"}
                                    </td>
                                    <td
                                      style={{
                                        padding: "5px 10px",
                                        fontWeight: "700",
                                        color: "#0f172a",
                                      }}
                                    >
                                      {prod.nama_produk}
                                    </td>
                                    <td
                                      style={{
                                        padding: "5px 10px",
                                        color: "#475569",
                                      }}
                                    >
                                      <span
                                        style={{
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          backgroundColor: "#f1f5f9",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {prod.kategori || "Umum"}
                                      </span>
                                    </td>
                                    <td
                                      style={{
                                        padding: "5px 10px",
                                        textAlign: "center",
                                        color: "#64748b",
                                        fontWeight: "700",
                                      }}
                                    >
                                      {prod.satuan || "PCS"}
                                    </td>
                                    <td
                                      style={{
                                        padding: "5px 10px",
                                        textAlign: "center",
                                        fontWeight: "800",
                                        color: "#0f172a",
                                      }}
                                    >
                                      {prod.qty}
                                    </td>
                                    <td
                                      style={{
                                        padding: "6px 10px",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      {prod.panjang_kain_cm ? (
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "4px",
                                            padding: "6px 9px",
                                            borderRadius: "7px",
                                            background:
                                              "linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)",
                                            border: "1px solid #bbf7d0",
                                            boxShadow:
                                              "0 1px 3px rgba(16, 185, 129, 0.08)",
                                            minWidth: "245px",
                                          }}
                                        >
                                          {/* Baris 1: Header Badge Kain & CM per Pcs */}
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              gap: "6px",
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                              }}
                                            >
                                              <Scissors
                                                size={11}
                                                color="#0284c7"
                                              />
                                              <span
                                                style={{
                                                  fontSize: "11px",
                                                  fontWeight: "800",
                                                  color: "#0f172a",
                                                }}
                                              >
                                                {prod.kain_nama || "Kain"}
                                              </span>
                                            </div>
                                            <span
                                              style={{
                                                fontSize: "9.5px",
                                                fontWeight: "700",
                                                padding: "1px 6px",
                                                borderRadius: "4px",
                                                backgroundColor: "#ffffff",
                                                color: "#475569",
                                                border: "1px solid #e2e8f0",
                                                letterSpacing: "0.02em",
                                              }}
                                            >
                                              {prod.panjang_kain_cm} CM / pcs
                                            </span>
                                          </div>

                                          {/* Baris 2: Dual Metric Box (Total Panjang vs Total Biaya) */}
                                          <div
                                            style={{
                                              display: "grid",
                                              gridTemplateColumns: "1fr 1fr",
                                              gap: "5px",
                                            }}
                                          >
                                            {/* Box 1: Total Panjang CM & Meter */}
                                            <div
                                              style={{
                                                padding: "4px 6px",
                                                borderRadius: "5px",
                                                backgroundColor: "#eff6ff",
                                                border: "1px solid #bfdbfe",
                                                display: "flex",
                                                flexDirection: "column",
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: "8.5px",
                                                  fontWeight: "800",
                                                  color: "#1e40af",
                                                  textTransform: "uppercase",
                                                  letterSpacing: "0.03em",
                                                }}
                                              >
                                                Total Panjang
                                              </span>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "baseline",
                                                  gap: "2px",
                                                  marginTop: "1px",
                                                }}
                                              >
                                                <b
                                                  style={{
                                                    fontSize: "12px",
                                                    fontWeight: "800",
                                                    color: "#0284c7",
                                                    fontFamily: "monospace",
                                                  }}
                                                >
                                                  {(
                                                    (Number(
                                                      prod.panjang_kain_cm,
                                                    ) || 0) *
                                                    (Number(prod.qty) || 1)
                                                  ).toLocaleString("id-ID")}
                                                </b>
                                                <span
                                                  style={{
                                                    fontSize: "9px",
                                                    fontWeight: "800",
                                                    color: "#0369a1",
                                                  }}
                                                >
                                                  CM
                                                </span>
                                              </div>
                                              <span
                                                style={{
                                                  fontSize: "9px",
                                                  color: "#64748b",
                                                  fontWeight: "600",
                                                }}
                                              >
                                                ≈{" "}
                                                {(
                                                  ((Number(
                                                    prod.panjang_kain_cm,
                                                  ) || 0) *
                                                    (Number(prod.qty) || 1)) /
                                                  100
                                                ).toFixed(1)}{" "}
                                                Meter
                                              </span>
                                            </div>

                                            {/* Box 2: Total Biaya Kain */}
                                            <div
                                              style={{
                                                padding: "4px 6px",
                                                borderRadius: "5px",
                                                backgroundColor: "#ecfdf5",
                                                border: "1px solid #a7f3d0",
                                                display: "flex",
                                                flexDirection: "column",
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: "8.5px",
                                                  fontWeight: "800",
                                                  color: "#065f46",
                                                  textTransform: "uppercase",
                                                  letterSpacing: "0.03em",
                                                }}
                                              >
                                                Total Biaya
                                              </span>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "baseline",
                                                  gap: "2px",
                                                  marginTop: "1px",
                                                }}
                                              >
                                                <b
                                                  style={{
                                                    fontSize: "12px",
                                                    fontWeight: "800",
                                                    color: "#059669",
                                                  }}
                                                >
                                                  Rp{" "}
                                                  {(
                                                    (Number(
                                                      prod.panjang_kain_cm,
                                                    ) || 0) *
                                                    (Number(prod.qty) || 1) *
                                                    (Number(
                                                      prod.harga_kain_cm,
                                                    ) || 0)
                                                  ).toLocaleString("id-ID")}
                                                </b>
                                              </div>
                                              <span
                                                style={{
                                                  fontSize: "9px",
                                                  color: "#64748b",
                                                }}
                                              >
                                                @Rp{" "}
                                                {Number(
                                                  prod.harga_kain_cm || 0,
                                                ).toLocaleString("id-ID")}
                                                /CM
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            padding: "4px 8px",
                                            borderRadius: "5px",
                                            backgroundColor: "#f8fafc",
                                            border: "1px solid #e2e8f0",
                                            color: "#64748b",
                                            fontSize: "11px",
                                            fontWeight: "600",
                                          }}
                                        >
                                          {prod.estimasi_kain || "-"}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
                      Pelanggan (Dari Master Data) <span style={{ color: "#ef4444" }}>*</span>
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
                      label: `${p.nama_pelanggan} (${p.kode_pelanggan} - ${p.kategori_pelanggan || "Reguler"})`,
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
                    Status Produksi
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
                    <option value="Dalam Proses">Dalam Proses</option>
                    <option value="Menunggu Bahan">Menunggu Bahan</option>
                    <option value="Selesai QC">Selesai QC</option>
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
                            Status SPK
                          </label>
                          <select
                            value={spk.status_spk || "Potong Pola"}
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
                            <option value="Potong Pola">Potong Pola</option>
                            <option value="Proses Jahit">Proses Jahit</option>
                            <option value="Selesai QC">Selesai QC</option>
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
                            overflowX: "auto",
                            minHeight: "240px",
                          }}
                        >
                          <table
                            style={{
                              width: "100%",
                              minWidth: "880px",
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
                                    minWidth: "320px",
                                  }}
                                >
                                  PRODUK & SKU
                                </th>
                                <th
                                  style={{
                                    padding: "6px 8px",
                                    fontWeight: "800",
                                    color: "#475569",
                                    width: "110px",
                                    textAlign: "center",
                                  }}
                                >
                                  QTY
                                </th>
                                <th
                                  style={{
                                    padding: "6px 8px",
                                    fontWeight: "800",
                                    color: "#0369a1",
                                    width: "280px",
                                  }}
                                >
                                  ESTIMASI KAIN (AUTO DARI MASTER)
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
                                      sku: p.sku,
                                      kategori: p.kategori,
                                      satuan: p.satuan,
                                    };
                                  },
                                );

                                return (
                                  <tr
                                    key={pIdx}
                                    style={{
                                      borderBottom: "1px solid #f1f5f9",
                                    }}
                                  >
                                    {/* Produk, SKU & Kategori */}
                                    <td style={{ padding: "6px 8px" }}>
                                      <SearchableSelect
                                        value={prod.produk_id}
                                        options={productSelectOptions}
                                        placeholder="Pilih dari Master..."
                                        onChange={(val) =>
                                          handleSelectProductForSPK(
                                            sIdx,
                                            pIdx,
                                            val,
                                          )
                                        }
                                      />
                                      <div
                                        style={{
                                          marginTop: "4px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {prod.sku && (
                                          <span
                                            style={{
                                              fontSize: "10px",
                                              color: "#64748b",
                                              fontFamily: "monospace",
                                              fontWeight: "600",
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
                                              padding: "1px 6px",
                                              borderRadius: "4px",
                                              backgroundColor: "#e0f2fe",
                                              color: "#0369a1",
                                              fontSize: "9.5px",
                                              fontWeight: "700",
                                            }}
                                          >
                                            {prod.kategori || "Umum"}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Qty & Satuan (Gabung) */}
                                    <td
                                      style={{
                                        padding: "5px 8px",
                                        textAlign: "center",
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
                                            width: "52px",
                                            padding: "4px",
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

                                    {/* Estimasi Kain & Keterangan */}
                                    <td
                                      style={{
                                        padding: "6px 8px",
                                        verticalAlign: "middle",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "4px",
                                          padding: "5px 8px",
                                          borderRadius: "6px",
                                          background:
                                            "linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)",
                                          border: "1px solid #bae6fd",
                                          minWidth: "270px",
                                        }}
                                      >
                                        {/* Micro Dashboard Row */}
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: "4px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "4px",
                                            }}
                                          >
                                            <Scissors
                                              size={11}
                                              color="#0284c7"
                                            />
                                            <b
                                              style={{
                                                fontSize: "11px",
                                                color: "#0f172a",
                                              }}
                                            >
                                              {prod.kain_nama || "Kain"}
                                            </b>
                                          </div>
                                          <span
                                            style={{
                                              fontSize: "9.5px",
                                              fontWeight: "800",
                                              padding: "1px 6px",
                                              borderRadius: "3px",
                                              backgroundColor: "#ffffff",
                                              color: "#0284c7",
                                              border: "1px solid #bfdbfe",
                                            }}
                                          >
                                            {prod.panjang_kain_cm || 0} CM / pcs
                                          </span>
                                        </div>

                                        {/* Metrics Strip */}
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            backgroundColor: "#ffffff",
                                            padding: "3px 8px",
                                            borderRadius: "4px",
                                            border: "1px solid #e2e8f0",
                                            fontSize: "10.5px",
                                          }}
                                        >
                                          <div>
                                            <span
                                              style={{
                                                color: "#64748b",
                                                fontSize: "8.5px",
                                                display: "block",
                                                fontWeight: "800",
                                                textTransform: "uppercase",
                                              }}
                                            >
                                              TOTAL KEBUTUHAN
                                            </span>
                                            <b
                                              style={{
                                                color: "#0284c7",
                                                fontFamily: "monospace",
                                                fontSize: "11.5px",
                                              }}
                                            >
                                              {(
                                                (Number(prod.panjang_kain_cm) ||
                                                  0) * (Number(prod.qty) || 1)
                                              ).toLocaleString("id-ID")}{" "}
                                              CM
                                            </b>
                                            <span
                                              style={{
                                                color: "#64748b",
                                                fontSize: "9px",
                                                marginLeft: "3px",
                                                fontWeight: "600",
                                              }}
                                            >
                                              (
                                              {(
                                                ((Number(
                                                  prod.panjang_kain_cm,
                                                ) || 0) *
                                                  (Number(prod.qty) || 1)) /
                                                100
                                              ).toFixed(1)}
                                              M)
                                            </span>
                                          </div>

                                          <div style={{ textAlign: "right" }}>
                                            <span
                                              style={{
                                                color: "#065f46",
                                                fontSize: "8.5px",
                                                display: "block",
                                                fontWeight: "800",
                                                textTransform: "uppercase",
                                              }}
                                            >
                                              EST. BIAYA KAIN
                                            </span>
                                            <b
                                              style={{
                                                color: "#059669",
                                                fontSize: "11.5px",
                                              }}
                                            >
                                              Rp{" "}
                                              {(
                                                (Number(prod.panjang_kain_cm) ||
                                                  0) *
                                                (Number(prod.qty) || 1) *
                                                (Number(prod.harga_kain_cm) ||
                                                  0)
                                              ).toLocaleString("id-ID")}
                                            </b>
                                            <span
                                              style={{
                                                color: "#94a3b8",
                                                fontSize: "8.5px",
                                                display: "block",
                                              }}
                                            >
                                              @Rp{" "}
                                              {Number(
                                                prod.harga_kain_cm || 0,
                                              ).toLocaleString("id-ID")}
                                              /CM
                                            </span>
                                          </div>
                                        </div>

                                        {/* Editable override / note */}
                                        <input
                                          type="text"
                                          placeholder="Catatan / rincian estimasi kain..."
                                          value={prod.estimasi_kain || ""}
                                          onChange={(e) =>
                                            handleUpdateProductInSPK(
                                              sIdx,
                                              pIdx,
                                              "estimasi_kain",
                                              e.target.value,
                                            )
                                          }
                                          style={{
                                            width: "100%",
                                            padding: "3px 7px",
                                            borderRadius: "4px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "10px",
                                            color: "#334155",
                                            backgroundColor: "#ffffff",
                                          }}
                                        />
                                      </div>
                                    </td>

                                    {/* Hapus Produk Row */}
                                    <td
                                      style={{
                                        padding: "5px 8px",
                                        textAlign: "center",
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
