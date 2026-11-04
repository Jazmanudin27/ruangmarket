import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Package,
  Layers,
  Clock,
  Printer,
  Sparkles,
  Search,
  Volume2,
  RefreshCw,
  Check,
  User,
  ArrowRight,
  ShieldCheck,
  Ban
} from 'lucide-react';

// Web Audio API Synthesizer Beep
const playBeep = (type = 'success') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // High pitch double beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1174.66, ctx.currentTime);
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.15);
      }, 70);
    } else if (type === 'double') {
      // Double scan alert: 2 harsh low buzzes
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(280, ctx.currentTime);
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.25);
      }, 120);
    } else {
      // General error
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
};

export default function ModalScanSelesaiSPK({
  isOpen,
  onClose,
  batches = [],
  onUpdateSpkStatus,
  onOpenPrintLabel,
}) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const [doubleScanWarning, setDoubleScanWarning] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  // Set of scanned unique QR strings to prevent double scans: "NoProduksi|NoSPK|SKU|NoPcs"
  const [scannedQrSet, setScannedQrSet] = useState(new Set());
  const [scanHistory, setScanHistory] = useState([]);
  const [targetStatus, setTargetStatus] = useState('Selesai');
  const inputRef = useRef(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setBarcodeInput('');
      setLastScanned(null);
      setDoubleScanWarning(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process barcode scan
  const handleProcessScan = (code) => {
    const rawCode = (code || barcodeInput).trim();
    if (!rawCode) return;

    setErrorMsg('');
    setDoubleScanWarning(null);

    // Parsing barcode format:
    // Format A: No Produksi|No SPK|SKU|No Produk (contoh: JN2611002|SPK1-001|BT-LPJ-S|001)
    // Format B: No SPK langsung (contoh: SPK-20261103-0001)
    const parts = rawCode.split('|');
    const isPipeFormat = parts.length >= 3;

    let targetNoProduksi = isPipeFormat ? parts[0].trim() : '';
    let targetNoSpk = isPipeFormat ? parts[1].trim() : rawCode.replace(/^#/, '').trim();
    let targetSku = isPipeFormat ? parts[2].trim() : '';
    let targetNoPcs = isPipeFormat && parts[3] ? parts[3].trim() : '';

    // Cek proteksi ANTI DOUBLE SCAN jika barcode per-pcs
    const uniqueKey = isPipeFormat
      ? `${targetNoProduksi}|${targetNoSpk}|${targetSku}|${targetNoPcs}`
      : `${targetNoSpk}`;

    if (scannedQrSet.has(uniqueKey)) {
      playBeep('double');
      setDoubleScanWarning({
        code: uniqueKey,
        sku: targetSku || targetNoSpk,
        pcsIndex: targetNoPcs ? parseInt(targetNoPcs, 10) : '-',
        noSpk: targetNoSpk,
      });
      setBarcodeInput('');
      inputRef.current?.focus();
      return;
    }

    // Cari SPK dalam batches
    let foundBatch = null;
    let foundSpk = null;

    for (const b of batches) {
      const matchBatch = !targetNoProduksi || b.kode_produksi === targetNoProduksi || b.id === targetNoProduksi;
      if (matchBatch) {
        const spks = b.spk_list || [];
        const match = spks.find(
          (s) =>
            (s.id_spk && s.id_spk.toLowerCase() === targetNoSpk.toLowerCase()) ||
            (s.no_spk && s.no_spk.toLowerCase() === targetNoSpk.toLowerCase()) ||
            rawCode.includes(s.id_spk)
        );
        if (match) {
          foundBatch = b;
          foundSpk = match;
          break;
        }
      }
    }

    // Fallback pencarian tanpa filter batch jika batch code berbeda
    if (!foundBatch || !foundSpk) {
      for (const b of batches) {
        const spks = b.spk_list || [];
        const match = spks.find(
          (s) =>
            (s.id_spk && s.id_spk.toLowerCase() === targetNoSpk.toLowerCase()) ||
            (s.no_spk && s.no_spk.toLowerCase() === targetNoSpk.toLowerCase()) ||
            rawCode.includes(s.id_spk)
        );
        if (match) {
          foundBatch = b;
          foundSpk = match;
          break;
        }
      }
    }

    if (!foundBatch || !foundSpk) {
      playBeep('error');
      setErrorMsg(`Barcode "${rawCode}" tidak ditemukan di database produksi.`);
      setBarcodeInput('');
      inputRef.current?.focus();
      return;
    }

    // Cari item produk yang sesuai jika ada SKU
    const rawItems = foundSpk.produk_items || [];
    let matchedItem = null;
    if (targetSku) {
      matchedItem = rawItems.find(
        (it) =>
          (it.sku && it.sku.toLowerCase() === targetSku.toLowerCase()) ||
          (it.kode_sku && it.kode_sku.toLowerCase() === targetSku.toLowerCase()) ||
          (it.nama_produk && it.nama_produk.toLowerCase().includes(targetSku.toLowerCase()))
      );
    }

    // Berhasil scan!
    playBeep('success');

    // Catat ke unique set anti double scan
    setScannedQrSet((prev) => new Set(prev).add(uniqueKey));

    const totalSpkQty = rawItems.reduce((sum, it) => sum + Number(it.qty || 0), 0);

    const record = {
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      uniqueKey,
      batch: foundBatch,
      spk: foundSpk,
      sku: targetSku || (matchedItem ? matchedItem.sku : '-'),
      namaProduk: matchedItem ? matchedItem.nama_produk : (foundSpk.nama_spk || 'Produk'),
      pcsIndex: targetNoPcs ? parseInt(targetNoPcs, 10) : null,
      totalQtySku: matchedItem ? Number(matchedItem.qty || 1) : null,
      totalSpkQty,
      status: targetStatus,
    };

    setLastScanned(record);
    setScanHistory((prev) => [record, ...prev]);

    // Update status SPK di parent jika dipanggil
    if (onUpdateSpkStatus) {
      onUpdateSpkStatus(foundBatch.id, foundSpk.id_spk, targetStatus);
    }

    setBarcodeInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessScan(barcodeInput);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f172a',
        zIndex: 2500,
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Full Screen Top Header */}
      <div
        style={{
          height: '48px',
          padding: '0 20px',
          background: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
          borderBottom: '1px solid #047857',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.25)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QrCode size={17} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', lineHeight: 1.2 }}>
              Scanner Barcode Penerimaan SPK (Per-Produk)
            </div>
            <div style={{ fontSize: '10px', color: '#a7f3d0' }}>
              Format Barcode: <code style={{ color: '#ffffff' }}>NoProduksi|NoSPK|SKU|NoPcs</code> • Sistem Proteksi Anti Double Scan Aktif
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Tutup Scanner (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Full Screen Body Grid 2-Kolom */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          backgroundColor: '#f1f5f9',
          display: 'grid',
          gridTemplateColumns: 'minmax(380px, 1fr) minmax(420px, 1.2fr)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* KOLOM KIRI: Scanner Input, Status Selector & Hasil Scan Terakhir */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Target Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <span style={{ fontWeight: '700', color: '#334155' }}>
              Status SPK otomatis diubah menjadi:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['Selesai', 'Finishing & Sortir', 'Siap Kirim'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTargetStatus(st)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    border: targetStatus === st ? '1px solid #059669' : '1px solid #cbd5e1',
                    backgroundColor: targetStatus === st ? '#10b981' : '#ffffff',
                    color: targetStatus === st ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {targetStatus === st && '✓ '}
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Barcode Scanner Gun Input */}
          <div
            style={{
              border: '2px dashed #059669',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 2px 5px rgba(5, 150, 105, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  color: '#065f46',
                }}
              >
                <QrCode size={15} color="#059669" />
                <span>TEMBAK SCANNER GUN KE BARCODE PLASTIK:</span>
              </label>
              <span style={{ fontSize: '10px', color: '#047857', fontWeight: '800' }}>
                🛡️ Anti Double Scan Aktif
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Arahkan scanner ke sini (contoh: JN2611002|SPK1-001|BT-LPJ-S|001)..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '2px solid #059669',
                  fontSize: '14px',
                  fontWeight: '800',
                  color: '#0f172a',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => handleProcessScan(barcodeInput)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)',
                }}
              >
                <Check size={15} />
                <span>Scan Masuk</span>
              </button>
            </div>
          </div>

          {/* WARNING DOUBLE SCAN */}
          {doubleScanWarning && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '2px solid #ef4444',
                borderRadius: '8px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Ban size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#b91c1c' }}>
                  ⚠️ PERINGATAN: BAJU INI SUDAH PERNAH DI-SCAN (DOUBLE SCAN)!
                </div>
                <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px', lineHeight: '1.4' }}>
                  Produk: <b>{doubleScanWarning.sku}</b> (Pcs #{doubleScanWarning.pcsIndex}) di SPK #{doubleScanWarning.noSpk} sudah tercatat sebelumnya. Baju ini tidak ditambahkan ulang ke counter.
                </div>
              </div>
            </div>
          )}

          {/* ERROR NOT FOUND */}
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                color: '#dc2626',
                fontWeight: '700',
                backgroundColor: '#fee2e2',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #fca5a5',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* HASIL SCAN TERAKHIR (KARTU SUKSES) */}
          {lastScanned && !doubleScanWarning && (
            <div
              style={{
                border: '1.5px solid #86efac',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#065f46' }}>
                      BERHASIL DITERIMA: {lastScanned.sku}{' '}
                      {lastScanned.pcsIndex ? (
                        <span style={{ color: '#0284c7' }}>(Pcs #{lastScanned.pcsIndex}{lastScanned.totalQtySku ? `/${lastScanned.totalQtySku}` : ''})</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '11px', color: '#047857' }}>
                      SPK: <b>{lastScanned.spk.id_spk}</b> • No Produksi: <b>{lastScanned.batch.kode_produksi}</b>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '800',
                    color: '#065f46',
                    backgroundColor: '#dcfce7',
                    padding: '3px 10px',
                    borderRadius: '5px',
                    border: '1px solid #86efac',
                  }}
                >
                  Status: {lastScanned.status}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.2fr 1fr',
                  gap: '8px',
                  backgroundColor: '#f8fafc',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '11px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>Pemesan:</span>{' '}
                  <b>{lastScanned.batch.nama_pelanggan || 'Umum'}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Penjahit:</span>{' '}
                  <b>{lastScanned.spk.penjahit || '-'}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Waktu Scan:</span>{' '}
                  <b>{lastScanned.timestamp}</b>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KOLOM KANAN: LIVE LOG RIWAYAT BARANG MASUK HARI INI */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                Riwayat Barang Masuk Di-scan Sesi Ini
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                Total diterima: <b>{scanHistory.length} Pcs</b> baju
              </div>
            </div>

            {scanHistory.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setScanHistory([]);
                  setScannedQrSet(new Set());
                  setLastScanned(null);
                  setDoubleScanWarning(null);
                }}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  color: '#64748b',
                  fontSize: '10.5px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Reset Riwayat
              </button>
            )}
          </div>

          {scanHistory.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '12px',
                marginTop: '10px',
              }}
            >
              Belum ada produk yang di-scan pada sesi ini. Tembak barcode di plastik untuk mulai menerima barang.
            </div>
          ) : (
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                overflow: 'hidden',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', width: '70px' }}>Waktu</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>SKU & Varian</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', width: '80px' }}>No Pcs</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', width: '150px' }}>No SPK</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', width: '85px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scanHistory.map((sc, sIdx) => (
                    <tr key={sIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{sc.timestamp}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <b style={{ color: '#0f172a' }}>{sc.sku}</b>
                        {sc.namaProduk && (
                          <div style={{ fontSize: '9.5px', color: '#64748b' }}>{sc.namaProduk}</div>
                        )}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: '800',
                            color: '#0284c7',
                            backgroundColor: '#f0f9ff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          Pcs #{sc.pcsIndex || 1}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#334155' }}>
                          {sc.spk.id_spk}
                        </span>
                        <div style={{ fontSize: '9.5px', color: '#64748b' }}>{sc.batch.nama_pelanggan || 'Umum'}</div>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            fontWeight: '800',
                            fontSize: '10px',
                          }}
                        >
                          ✓ {sc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Bottom Footer */}
      <div
        style={{
          height: '46px',
          padding: '0 20px',
          borderTop: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '12px', color: '#475569' }}>
          Total Baju Berhasil Diterima Sesi Ini:{' '}
          <b style={{ color: '#059669', fontSize: '14px' }}>
            {scanHistory.length} PCS
          </b>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '6px 18px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            color: '#334155',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
          }}
        >
          Tutup Scanner
        </button>
      </div>
    </div>
  );
}
