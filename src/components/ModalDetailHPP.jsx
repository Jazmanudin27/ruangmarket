import React, { useState, useEffect } from "react";
import {
  Calculator,
  X,
  Plus,
  Trash2,
  Check,
  Scissors,
  Save,
  Layers,
  Coins,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toastSuccess, toastError } from "../utils/alert.util";
import SearchableSelect from "./SearchableSelect";

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

export default function ModalDetailHPP({
  isOpen,
  onClose,
  produkId,
  sku,
  namaProduk,
  currentHpp = 0,
  currentPanjangKain = 200,
  currentKainNama = "",
  currentHargaKainCm = 150,
  onSave,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [prodInfo, setProdInfo] = useState({
    id: produkId,
    sku: sku || "",
    nama_produk: namaProduk || "",
  });

  // Kain state
  const [kainState, setKainState] = useState({
    sku_kain: "",
    nama_kain: currentKainNama || "Kain",
    panjang_kain_cm: Number(currentPanjangKain || 200),
    harga_kain_cm: Number(currentHargaKainCm || 150),
    harga_per_meter: Number(currentHargaKainCm || 150) * 100,
  });

  // Jasa details
  const [jasaDetails, setJasaDetails] = useState([
    { nama_jasa: "Jasa Potong", jumlah: 1, harga: 2000, total: 2000 },
    { nama_jasa: "Jasa Jahit", jumlah: 1, harga: 7000, total: 7000 },
    { nama_jasa: "Kain Keras", jumlah: 1, harga: 500, total: 500 },
    { nama_jasa: "Kancing", jumlah: 1, harga: 50, total: 50 },
    { nama_jasa: "Jasa Lubang Kancing", jumlah: 1, harga: 200, total: 200 },
    { nama_jasa: "Plastik Packing", jumlah: 1, harga: 400, total: 400 },
    { nama_jasa: "Finishing", jumlah: 1, harga: 500, total: 500 },
    { nama_jasa: "Beban Listrik", jumlah: 1, harga: 550, total: 550 },
    { nama_jasa: "Benang", jumlah: 1, harga: 200, total: 200 },
    { nama_jasa: "Biaya DLL", jumlah: 1, harga: 800, total: 800 },
    { nama_jasa: "Label Size", jumlah: 1, harga: 150, total: 150 },
    { nama_jasa: "BOP", jumlah: 1, harga: 2500, total: 2500 },
  ]);

  // Daftar Jasa Referensi dari Database
  const [daftarJasaReferensi, setDaftarJasaReferensi] = useState([
    { nama_jasa: "Jasa Potong", harga: 2000 },
    { nama_jasa: "Jasa Potong Pola", harga: 2000 },
    { nama_jasa: "Jasa Jahit", harga: 7000 },
    { nama_jasa: "Jasa Jahit & Obras", harga: 7500 },
    { nama_jasa: "Kain Keras", harga: 500 },
    { nama_jasa: "Kancing", harga: 50 },
    { nama_jasa: "Jasa Lubang Kancing", harga: 200 },
    { nama_jasa: "Plastik Packing", harga: 400 },
    { nama_jasa: "Finishing", harga: 500 },
    { nama_jasa: "Finishing & Pasang Kancing", harga: 1500 },
    { nama_jasa: "Beban Listrik", harga: 550 },
    { nama_jasa: "Benang", harga: 200 },
    { nama_jasa: "Biaya DLL", harga: 800 },
    { nama_jasa: "Label Size", harga: 150 },
    { nama_jasa: "BOP", harga: 2500 },
    { nama_jasa: "BOP & Kemasan Plastik/Label", harga: 2000 },
    { nama_jasa: "Bordir / Sablon", harga: 3000 },
    { nama_jasa: "Pasang Resleting", harga: 1500 },
    { nama_jasa: "Jasa Obras", harga: 1500 },
  ]);

  const [pilihanKain, setPilihanKain] = useState([]);
  const [idKategoriHpp, setIdKategoriHpp] = useState("");
  const [namaKategoriHpp, setNamaKategoriHpp] = useState("");
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [manualHpp, setManualHpp] = useState(currentHpp || 0);
  const [updateMasterProduk, setUpdateMasterProduk] = useState(true);

  // Fetch breakdown from server when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const params = new URLSearchParams();
    if (produkId) params.set("produk_id", produkId);
    if (sku) params.set("sku", sku);
    if (namaProduk) params.set("nama_produk", namaProduk);

    fetch(`/api/marketplace/hpp-produk/breakdown?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json && json.status === "success" && json.data) {
          const d = json.data;
          setProdInfo({
            id: d.produk.id || produkId,
            sku: d.produk.sku || sku || "",
            nama_produk: d.produk.nama_produk || namaProduk || "",
          });

          setKainState({
            sku_kain: d.kain.sku_kain || "",
            nama_kain: d.kain.nama_kain || currentKainNama || "Kain",
            panjang_kain_cm: Number(currentPanjangKain || d.kain.panjang_kain_cm || 200),
            harga_kain_cm: Number(currentHargaKainCm || d.kain.harga_kain_cm || 150),
            harga_per_meter: Number(d.kain.harga_per_meter || 15000),
          });

          if (Array.isArray(d.jasa_details) && d.jasa_details.length > 0) {
            setJasaDetails(d.jasa_details);
          }

          if (Array.isArray(d.daftar_jasa_referensi) && d.daftar_jasa_referensi.length > 0) {
            setDaftarJasaReferensi(d.daftar_jasa_referensi);
          }

          setIdKategoriHpp(d.produk.id_kategori_hpp || "");
          setNamaKategoriHpp(d.produk.nama_kategori_hpp || "");
          setPilihanKain(d.pilihan_kain || []);

          const actual = Number(currentHpp || d.harga_modal_actual || 0);
          setManualHpp(actual);
        }
      })
      .catch((err) => {
        console.warn("Gagal load breakdown HPP:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, produkId, sku, namaProduk]);

  // Calculations
  const subtotalKain = Math.round(
    Number(kainState.panjang_kain_cm || 0) * Number(kainState.harga_kain_cm || 0)
  );
  const subtotalJasa = jasaDetails.reduce(
    (sum, it) => sum + Number(it.total || 0),
    0
  );
  const calculatedHpp = subtotalKain + subtotalJasa;
  const finalHpp = isManualOverride ? Number(manualHpp || 0) : calculatedHpp;

  // Handle Jasa Row updates
  const handleUpdateJasa = (idx, field, val) => {
    setJasaDetails((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: val };
      if (field === "jumlah" || field === "harga") {
        const j = field === "jumlah" ? Number(val || 1) : Number(item.jumlah || 1);
        const h = field === "harga" ? Number(val || 0) : Number(item.harga || 0);
        item.total = Math.round(j * h);
      }
      copy[idx] = item;
      return copy;
    });
  };

  // Handle Select Jasa dari Dropdown Database
  const handleSelectJasa = (idx, selectedNama) => {
    if (selectedNama === "__CUSTOM__") {
      setJasaDetails((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], is_custom: true };
        return copy;
      });
      return;
    }

    const found = daftarJasaReferensi.find(
      (item) => item.nama_jasa.toLowerCase() === selectedNama.toLowerCase()
    );

    setJasaDetails((prev) => {
      const copy = [...prev];
      const prevItem = copy[idx] || {};
      const jumlah = Number(prevItem.jumlah || 1);
      const hargaBaru = found ? Number(found.harga || 0) : Number(prevItem.harga || 0);
      copy[idx] = {
        ...prevItem,
        nama_jasa: selectedNama,
        harga: hargaBaru,
        total: Math.round(jumlah * hargaBaru),
        is_custom: false,
      };
      return copy;
    });
  };

  const handleAddJasa = () => {
    // Cari opsi referensi yang belum ada di list agar langsung variatif
    const unused =
      daftarJasaReferensi.find(
        (ref) =>
          !jasaDetails.some(
            (j) => (j.nama_jasa || "").toLowerCase() === ref.nama_jasa.toLowerCase()
          )
      ) || daftarJasaReferensi[0] || { nama_jasa: "Jasa Jahit", harga: 7000 };

    setJasaDetails((prev) => [
      ...prev,
      {
        nama_jasa: unused.nama_jasa,
        jumlah: 1,
        harga: Number(unused.harga || 0),
        total: Number(unused.harga || 0),
        is_custom: false,
      },
    ]);
  };

  const handleRemoveJasa = (idx) => {
    if (jasaDetails.length <= 1) {
      toastError("Minimal harus ada 1 rincian jasa / biaya!");
      return;
    }
    setJasaDetails((prev) => prev.filter((_, i) => i !== idx));
  };

  // Options untuk SearchableSelect Kain
  const kainOptions = React.useMemo(() => {
    const opts = (pilihanKain || []).map((k) => ({
      value: k.kode_sku_kain || k.nama_kain,
      label: `${k.nama_kain || k.kode_sku_kain}`,
      subtitle: `@Rp ${Number(k.harga_per_meter || 0).toLocaleString("id-ID")}/m`,
    }));

    if (
      kainState.nama_kain &&
      !pilihanKain.some(
        (k) =>
          k.kode_sku_kain === kainState.nama_kain ||
          k.nama_kain === kainState.nama_kain
      )
    ) {
      opts.unshift({
        value: kainState.nama_kain,
        label: `${kainState.nama_kain} (Manual)`,
        subtitle: `@Rp ${Number(kainState.harga_per_meter || 0).toLocaleString("id-ID")}/m`,
      });
    }

    return opts;
  }, [pilihanKain, kainState.nama_kain, kainState.harga_per_meter]);

  // Options untuk SearchableSelect Jasa Konveksi
  const jasaOptions = React.useMemo(() => {
    const opts = (daftarJasaReferensi || []).map((ref) => ({
      value: ref.nama_jasa,
      label: ref.nama_jasa,
      subtitle: `@Rp ${Number(ref.harga || 0).toLocaleString("id-ID")}`,
    }));

    opts.push({
      value: "__CUSTOM__",
      label: "✏️ Ketik Manual / Jasa Kustom...",
      subtitle: "Input nama jasa / biaya baru",
    });

    return opts;
  }, [daftarJasaReferensi]);

  // Handler ganti kain dari SearchableSelect
  const handleKainChange = (sel) => {
    if (!sel) return;
    const found = pilihanKain.find(
      (k) => k.kode_sku_kain === sel || k.nama_kain === sel
    );
    if (found) {
      const hrgMtr = Number(found.harga_per_meter || 15000);
      const hrgCm = Math.round(hrgMtr / 100);
      setKainState((prev) => ({
        ...prev,
        sku_kain: found.kode_sku_kain || sel,
        nama_kain: found.nama_kain || sel,
        harga_kain_cm: hrgCm,
        harga_per_meter: hrgMtr,
      }));
    } else {
      setKainState((prev) => ({
        ...prev,
        sku_kain: sel,
        nama_kain: sel,
      }));
    }
  };

  // Submit & Save
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        produk_id: prodInfo.id,
        sku: prodInfo.sku,
        harga_modal: finalHpp,
        panjang_kain_cm: Number(kainState.panjang_kain_cm || 0),
        sku_kain: kainState.sku_kain || kainState.nama_kain,
        id_kategori_hpp: idKategoriHpp || `HPP-${prodInfo.sku}`,
        nama_kategori_hpp: namaKategoriHpp || `HPP ${prodInfo.nama_produk}`,
        jasa_details: jasaDetails,
        update_master_produk: updateMasterProduk,
      };

      const res = await fetch("/api/marketplace/hpp-produk/update-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        toastSuccess(
          `HPP Rp ${finalHpp.toLocaleString("id-ID")} berhasil diperbarui${
            updateMasterProduk ? " dan disinkronkan ke Master Produk!" : "!"
          }`
        );

        if (onSave) {
          onSave({
            hpp: finalHpp,
            panjang_kain_cm: Number(kainState.panjang_kain_cm || 0),
            kain_nama: kainState.nama_kain,
            harga_kain_cm: Number(kainState.harga_kain_cm || 0),
            jasa_details: jasaDetails,
          });
        }
        onClose();
      } else {
        toastError(json.message || "Gagal menyimpan HPP");
      }
    } catch (err) {
      toastError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        zIndex: 2600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "12px 16px",
            background: "linear-gradient(135deg, #090d16 0%, #1e293b 100%)",
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
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calculator size={15} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "800" }}>
                Rincian & Edit HPP Produk
              </div>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                Transparan: Mengetahui dari mana saja biaya produksi produk ini
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              cursor: "pointer",
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "14px 16px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Info Produk */}
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                {prodInfo.nama_produk}
              </div>
              {prodInfo.sku && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#0284c7",
                    fontFamily: "monospace",
                    fontWeight: "700",
                  }}
                >
                  SKU: {prodInfo.sku}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "9.5px", color: "#64748b" }}>
                HPP Saat Ini:
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "800",
                  color: "#059669",
                }}
              >
                Rp {Number(finalHpp).toLocaleString("id-ID")}
              </div>
            </div>
          </div>

          {/* Section 1: Biaya Kain */}
          <div
            style={{
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              backgroundColor: "#f0fdf4",
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#166534",
                }}
              >
                <Scissors size={13} color="#16a34a" />
                <span>1. Biaya Bahan Baku / Kain:</span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#15803d",
                }}
              >
                Subtotal: Rp {subtotalKain.toLocaleString("id-ID")}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 1fr",
                gap: "8px",
              }}
            >
              {/* Jenis Kain */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "2px",
                  }}
                >
                  Pilih Kain (Master)
                </label>
                <SearchableSelect
                  size="sm"
                  placeholder="-- Cari / Pilih Kain --"
                  value={kainState.sku_kain || kainState.nama_kain}
                  onChange={handleKainChange}
                  options={kainOptions}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Panjang Kain (CM) */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "2px",
                  }}
                >
                  Panjang Kain (CM)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={kainState.panjang_kain_cm === 0 ? "" : formatNumberId(kainState.panjang_kain_cm)}
                    placeholder="0"
                    onChange={(e) =>
                      setKainState((prev) => ({
                        ...prev,
                        panjang_kain_cm: parseNumberId(e.target.value),
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #86efac",
                      fontSize: "11px",
                      textAlign: "right",
                      fontWeight: "700",
                      backgroundColor: "#ffffff",
                      color: "#047857",
                    }}
                  />
                  <span style={{ fontSize: "10px", color: "#64748b" }}>cm</span>
                </div>
              </div>

              {/* Harga Kain (@Rp/CM) */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "2px",
                  }}
                >
                  Harga Kain (@Rp/CM)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={kainState.harga_kain_cm === 0 ? "" : formatNumberId(kainState.harga_kain_cm)}
                    placeholder="0"
                    onChange={(e) => {
                      const val = parseNumberId(e.target.value);
                      setKainState((prev) => ({
                        ...prev,
                        harga_kain_cm: val,
                        harga_per_meter: val * 100,
                      }));
                    }}
                    style={{
                      width: "100%",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #86efac",
                      fontSize: "11px",
                      textAlign: "right",
                      fontWeight: "700",
                      backgroundColor: "#ffffff",
                      color: "#0f172a",
                    }}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: "9.5px",
                color: "#166534",
                marginTop: "5px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>
                Rumus: {kainState.panjang_kain_cm} cm × Rp{" "}
                {kainState.harga_kain_cm}/cm (
                {((kainState.panjang_kain_cm || 0) / 100).toFixed(2)} Meter @Rp{" "}
                {(Number(kainState.harga_kain_cm || 0) * 100).toLocaleString(
                  "id-ID"
                )}
                /m)
              </span>
            </div>
          </div>

          {/* Section 2: Biaya Jasa Konveksi */}
          <div
            style={{
              border: "1px solid #bae6fd",
              borderRadius: "8px",
              backgroundColor: "#f0f9ff",
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "#0369a1",
                }}
              >
                <Coins size={13} color="#0284c7" />
                <span>2. Biaya Jasa Jahit & Konveksi:</span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#0284c7",
                }}
              >
                Subtotal: Rp {subtotalJasa.toLocaleString("id-ID")}
              </div>
            </div>

            {/* Tabel Jasa */}
            <div
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "5px",
                overflow: "visible",
                backgroundColor: "#ffffff",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "10.5px",
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
                    <th style={{ padding: "4px 8px", width: "24px" }}>#</th>
                    <th style={{ padding: "4px 8px" }}>Komponen / Jasa</th>
                    <th
                      style={{
                        padding: "4px 8px",
                        textAlign: "right",
                        width: "120px",
                      }}
                    >
                      Biaya (Rp)
                    </th>
                    <th style={{ padding: "4px 8px", width: "30px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {jasaDetails.map((j, jIdx) => (
                    <tr
                      key={jIdx}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td
                        style={{
                          padding: "4px 8px",
                          textAlign: "center",
                          color: "#94a3b8",
                        }}
                      >
                        {jIdx + 1}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <SearchableSelect
                            size="sm"
                            placeholder="-- Cari / Pilih Jasa --"
                            value={
                              j.is_custom
                                ? "__CUSTOM__"
                                : daftarJasaReferensi.some(
                                    (ref) =>
                                      ref.nama_jasa.toLowerCase() ===
                                      (j.nama_jasa || "").toLowerCase()
                                  )
                                ? j.nama_jasa
                                : j.nama_jasa
                                ? "__CUSTOM__"
                                : ""
                            }
                            dropUp={
                              jIdx >= Math.max(1, jasaDetails.length - 2) &&
                              jasaDetails.length > 2
                            }
                            onChange={(val) => {
                              if (val === "__CUSTOM__") {
                                setJasaDetails((prev) => {
                                  const copy = [...prev];
                                  copy[jIdx] = { ...copy[jIdx], is_custom: true };
                                  return copy;
                                });
                              } else {
                                handleSelectJasa(jIdx, val);
                              }
                            }}
                            options={jasaOptions}
                            style={{ width: "100%" }}
                          />

                          {(j.is_custom ||
                            (j.nama_jasa &&
                              !daftarJasaReferensi.some(
                                (ref) =>
                                  ref.nama_jasa.toLowerCase() ===
                                  j.nama_jasa.toLowerCase()
                              ))) && (
                            <input
                              type="text"
                              placeholder="Ketik nama komponen / jasa..."
                              value={j.nama_jasa}
                              onChange={(e) =>
                                handleUpdateJasa(jIdx, "nama_jasa", e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "3px 6px",
                                borderRadius: "3px",
                                border: "1px solid #0284c7",
                                backgroundColor: "#f0f9ff",
                                fontSize: "10.5px",
                                color: "#0369a1",
                                fontWeight: "600",
                              }}
                            />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                            justifyContent: "flex-end",
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
                            inputMode="numeric"
                            value={
                              j.harga === 0 ? "" : formatNumberId(j.harga)
                            }
                            placeholder="0"
                            onChange={(e) =>
                              handleUpdateJasa(
                                jIdx,
                                "harga",
                                parseNumberId(e.target.value)
                              )
                            }
                            style={{
                              width: "85px",
                              padding: "3px 6px",
                              borderRadius: "3px",
                              border: "1px solid #cbd5e1",
                              fontSize: "11px",
                              textAlign: "right",
                              fontWeight: "700",
                              color: "#0f172a",
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveJasa(jIdx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddJasa}
              style={{
                marginTop: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                padding: "3px 8px",
                borderRadius: "4px",
                border: "1px dashed #0284c7",
                backgroundColor: "#ffffff",
                color: "#0284c7",
                fontSize: "10px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              <Plus size={10} /> Tambah Komponen Jasa
            </button>
          </div>

          {/* Section 3: Ringkasan Total HPP */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Total Kalkulasi: Kain (Rp {subtotalKain.toLocaleString("id-ID")})
                + Jasa (Rp {subtotalJasa.toLocaleString("id-ID")})
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "900",
                  color: "#0f172a",
                }}
              >
                = Rp {calculatedHpp.toLocaleString("id-ID")}
              </div>
            </div>

            {/* Manual Override checkbox */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "6px",
                borderTop: "1px dashed #cbd5e1",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "10.5px",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isManualOverride}
                  onChange={(e) => setIsManualOverride(e.target.checked)}
                />
                <span>Kustomisasi / Ubah nominal HPP langsung:</span>
              </label>

              {isManualOverride && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700" }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={manualHpp === 0 ? "" : formatNumberId(manualHpp)}
                    placeholder="0"
                    onChange={(e) =>
                      setManualHpp(parseNumberId(e.target.value))
                    }
                    style={{
                      width: "105px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid #0284c7",
                      fontSize: "12px",
                      fontWeight: "800",
                      textAlign: "right",
                      color: "#0284c7",
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sync to Master checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              fontWeight: "700",
              color: "#047857",
              backgroundColor: "#ecfdf5",
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #a7f3d0",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={updateMasterProduk}
              onChange={(e) => setUpdateMasterProduk(e.target.checked)}
            />
            <span>
              Otomatis Update HPP & Estimasi Kain ini ke Master Produk MySQL
            </span>
          </label>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: "11px", color: "#64748b" }}>
            HPP Baru:{" "}
            <b style={{ color: "#059669", fontSize: "13px" }}>
              Rp {finalHpp.toLocaleString("id-ID")}
            </b>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "6px 12px",
                borderRadius: "5px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 16px",
                borderRadius: "5px",
                border: "none",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: "11.5px",
                fontWeight: "800",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(5, 150, 105, 0.25)",
              }}
            >
              {saving ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Simpan & Sinkronkan HPP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

