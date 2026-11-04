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
    { nama_jasa: "Jasa Potong Pola", jumlah: 1, harga: 2000, total: 2000 },
    { nama_jasa: "Jasa Jahit & Obras", jumlah: 1, harga: 7500, total: 7500 },
    { nama_jasa: "Finishing & Kancing", jumlah: 1, harga: 1500, total: 1500 },
    { nama_jasa: "BOP & Kemasan/Label", jumlah: 1, harga: 2000, total: 2000 },
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

  const handleAddJasa = () => {
    setJasaDetails((prev) => [
      ...prev,
      { nama_jasa: "Komponen Biaya Baru", jumlah: 1, harga: 1000, total: 1000 },
    ]);
  };

  const handleRemoveJasa = (idx) => {
    if (jasaDetails.length <= 1) {
      toastError("Minimal harus ada 1 rincian jasa / biaya!");
      return;
    }
    setJasaDetails((prev) => prev.filter((_, i) => i !== idx));
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
                <select
                  value={kainState.sku_kain || kainState.nama_kain}
                  onChange={(e) => {
                    const sel = e.target.value;
                    const found = pilihanKain.find(
                      (k) =>
                        k.kode_sku_kain === sel ||
                        k.nama_kain === sel
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
                  }}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    border: "1px solid #86efac",
                    fontSize: "11px",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    fontWeight: "600",
                  }}
                >
                  <option value="">-- Pilih Kain --</option>
                  {pilihanKain.map((k, kIdx) => (
                    <option key={kIdx} value={k.kode_sku_kain || k.nama_kain}>
                      {k.nama_kain || k.kode_sku_kain} (@Rp{" "}
                      {Number(k.harga_per_meter || 0).toLocaleString("id-ID")}/m)
                    </option>
                  ))}
                  {kainState.nama_kain &&
                    !pilihanKain.some(
                      (k) =>
                        k.kode_sku_kain === kainState.nama_kain ||
                        k.nama_kain === kainState.nama_kain
                    ) && (
                      <option value={kainState.nama_kain}>
                        {kainState.nama_kain} (Manual)
                      </option>
                    )}
                </select>
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
                    type="number"
                    min="0"
                    step="5"
                    value={kainState.panjang_kain_cm}
                    onChange={(e) =>
                      setKainState((prev) => ({
                        ...prev,
                        panjang_kain_cm: Number(e.target.value || 0),
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "4px 6px",
                      borderRadius: "4px",
                      border: "1px solid #86efac",
                      fontSize: "11px",
                      textAlign: "center",
                      fontWeight: "700",
                      backgroundColor: "#ffffff",
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
                    type="number"
                    min="0"
                    step="10"
                    value={kainState.harga_kain_cm}
                    onChange={(e) =>
                      setKainState((prev) => ({
                        ...prev,
                        harga_kain_cm: Number(e.target.value || 0),
                        harga_per_meter: Number(e.target.value || 0) * 100,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "4px 6px",
                      borderRadius: "4px",
                      border: "1px solid #86efac",
                      fontSize: "11px",
                      textAlign: "right",
                      fontWeight: "700",
                      backgroundColor: "#ffffff",
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
                overflow: "hidden",
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
                        width: "80px",
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
                        <input
                          type="text"
                          value={j.nama_jasa}
                          onChange={(e) =>
                            handleUpdateJasa(jIdx, "nama_jasa", e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: "3px 5px",
                            borderRadius: "3px",
                            border: "1px solid #cbd5e1",
                            fontSize: "10.5px",
                          }}
                        />
                      </td>
                      <td style={{ padding: "4px 6px", textAlign: "right" }}>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={j.harga}
                          onChange={(e) =>
                            handleUpdateJasa(
                              jIdx,
                              "harga",
                              Number(e.target.value || 0)
                            )
                          }
                          style={{
                            width: "70px",
                            padding: "3px 5px",
                            borderRadius: "3px",
                            border: "1px solid #cbd5e1",
                            fontSize: "10.5px",
                            textAlign: "right",
                            fontWeight: "700",
                          }}
                        />
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
                    type="number"
                    min="0"
                    step="500"
                    value={manualHpp}
                    onChange={(e) => setManualHpp(Number(e.target.value || 0))}
                    style={{
                      width: "90px",
                      padding: "4px 6px",
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

