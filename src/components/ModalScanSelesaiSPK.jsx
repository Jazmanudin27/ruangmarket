import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Clock,
  Printer,
  Sparkles,
  Search,
  Volume2,
  RefreshCw,
  Camera,
  Check,
  User,
  ArrowRight
} from 'lucide-react';

// Web Audio API Synthesizer Beep (tidak perlu download mp3)
const playBeep = (isSuccess = true) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      // High pitch double beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.2);
      }, 80);
    } else {
      // Low pitch buzz error
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    // Audio context not allowed or not supported
  }
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
  const [errorMsg, setErrorMsg] = useState('');
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
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Process barcode string
  const handleProcessScan = (code) => {
    const rawCode = (code || barcodeInput).trim();
    if (!rawCode) return;

    setErrorMsg('');

    // Search in batches -> spk_list
    let foundBatch = null;
    let foundSpk = null;

    // Clean code if prefixed with URL or #
    const cleanCode = rawCode.replace(/^#/, '').trim();

    for (const b of batches) {
      const spks = b.spk_list || [];
      const match = spks.find(
        (s) =>
          (s.id_spk && s.id_spk.toLowerCase() === cleanCode.toLowerCase()) ||
          (s.no_spk && s.no_spk.toLowerCase() === cleanCode.toLowerCase()) ||
          (rawCode.includes(s.id_spk))
      );
      if (match) {
        foundBatch = b;
        foundSpk = match;
        break;
      }
    }

    if (!foundBatch || !foundSpk) {
      playBeep(false);
      setErrorMsg(`Barcode "${rawCode}" tidak ditemukan di daftar SPK Produksi.`);
      setBarcodeInput('');
      inputRef.current?.focus();
      return;
    }

    // Success found!
    playBeep(true);

    const oldStatus = foundSpk.status_spk || 'Potong Pola';
    const totalQty = (foundSpk.produk_items || []).reduce(
      (sum, it) => sum + Number(it.qty || 0),
      0
    );

    const scanRecord = {
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      batch: foundBatch,
      spk: foundSpk,
      oldStatus: oldStatus,
      newStatus: targetStatus,
      totalQty: totalQty,
    };

    setLastScanned(scanRecord);
    setScanHistory((prev) => [scanRecord, ...prev.filter((item) => item.spk.id_spk !== foundSpk.id_spk)]);

    // Callback to parent to update status
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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
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
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800' }}>
                Scan Barcode SPK — Penerimaan Selesai Produksi
              </div>
              <div style={{ fontSize: '10.5px', color: '#a7f3d0' }}>
                Scan label barcode di plastik bungkusan jahitan saat barang datang di workshop
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Target Status Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '8px 12px',
              borderRadius: '8px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>
              Ubah Status SPK yang di-scan otomatis menjadi:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['Selesai', 'Finishing & Sortir', 'Siap Kirim'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTargetStatus(st)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '5px',
                    fontSize: '11px',
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

          {/* Barcode Scanner Gun / Input Box */}
          <div
            style={{
              border: '2px dashed #059669',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
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
                <QrCode size={14} color="#059669" />
                <span>TEMBAK BARCODE SCANNER / KETIK NO SPK:</span>
              </label>
              <span style={{ fontSize: '10px', color: '#047857', fontWeight: '600' }}>
                ⚡ Auto-detect saat scanner USB/Bluetooth membaca barcode
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Arahkan barcode scanner ke sini (contoh: SPK-20261103-0001)..."
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #059669',
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
                  padding: '0 16px',
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
                <Check size={14} />
                <span>Scan Masuk</span>
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#dc2626',
                  fontWeight: '700',
                  backgroundColor: '#fee2e2',
                  padding: '6px 10px',
                  borderRadius: '5px',
                  border: '1px solid #fca5a5',
                }}
              >
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Last Scanned SPK Card (Hasil Scan Terakhir) */}
          {lastScanned && (
            <div
              style={{
                border: '1.5px solid #86efac',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                animation: 'fadeIn 0.2s ease-in-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#065f46' }}>
                      BERHASIL DITERIMA: {lastScanned.spk.id_spk}
                    </div>
                    <div style={{ fontSize: '10px', color: '#047857' }}>
                      Pukul {lastScanned.timestamp} • Status diubah ke: <b>{lastScanned.newStatus}</b>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '900',
                      color: '#065f46',
                      backgroundColor: '#bbf7d0',
                      padding: '3px 10px',
                      borderRadius: '5px',
                    }}
                  >
                    TOTAL: {lastScanned.totalQty} PCS
                  </span>
                  {onOpenPrintLabel && (
                    <button
                      type="button"
                      onClick={() => onOpenPrintLabel(lastScanned.batch, lastScanned.spk)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #059669',
                        backgroundColor: '#ffffff',
                        color: '#065f46',
                        fontSize: '10px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Cetak Label Ulang
                    </button>
                  )}
                </div>
              </div>

              {/* Detail Info Ringkas */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.2fr 1fr',
                  gap: '8px',
                  backgroundColor: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                  fontSize: '10.5px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>No Produksi:</span>{' '}
                  <b>{lastScanned.batch.kode_produksi}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Pemesan:</span>{' '}
                  <b>{lastScanned.batch.nama_pelanggan || 'Umum'}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Penjahit:</span>{' '}
                  <b>{lastScanned.spk.penjahit || '-'}</b>
                </div>
              </div>

              {/* Breakdown Produk yang ada di dalam bungkusan */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#ecfdf5',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#065f46',
                    borderBottom: '1px solid #bbf7d0',
                  }}
                >
                  Rincian Barang dalam SPK Ini:
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '4px 8px', textAlign: 'left' }}>SKU & Varian</th>
                      <th style={{ padding: '4px 8px', textAlign: 'center', width: '70px' }}>Ukuran</th>
                      <th style={{ padding: '4px 8px', textAlign: 'right', width: '80px' }}>Qty (Pcs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lastScanned.spk.produk_items || []).map((it, iIdx) => {
                      const sku = it.sku || it.kode_sku || 'PROD';
                      const upper = (sku + ' ' + (it.nama_produk || '')).toUpperCase();
                      let size = 'ALL';
                      ['4XL', '3XL', 'XXL', '2XL', 'XL', 'L', 'M', 'S'].forEach((sz) => {
                        if (upper.includes(`-${sz}`) || upper.includes(` ${sz}`) || upper.endsWith(sz)) {
                          size = sz;
                        }
                      });

                      return (
                        <tr key={iIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 8px' }}>
                            <div style={{ fontWeight: '800', color: '#0f172a' }}>{sku}</div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>{it.nama_produk}</div>
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: '800' }}>
                            {size}
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: '900', color: '#047857' }}>
                            {it.qty} pcs
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Riwayat Scan Sesi Ini */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#334155' }}>
                Riwayat Barang Masuk Di-scan Hari Ini ({scanHistory.length} SPK):
              </div>
              {scanHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScanHistory([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  Bersihkan Riwayat
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '11px',
                }}
              >
                Belum ada SPK yang di-scan pada sesi ini. Tembak barcode di atas untuk memulai.
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '5px 8px', textAlign: 'left', width: '65px' }}>Waktu</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>No SPK</th>
                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Pemesan / Penjahit</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '70px' }}>Total Pcs</th>
                      <th style={{ padding: '5px 8px', textAlign: 'center', width: '90px' }}>Status Baru</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanHistory.map((sc, sIdx) => (
                      <tr key={sIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '5px 8px', color: '#64748b' }}>{sc.timestamp}</td>
                        <td style={{ padding: '5px 8px' }}>
                          <b style={{ color: '#0284c7', fontFamily: 'monospace' }}>{sc.spk.id_spk}</b>
                        </td>
                        <td style={{ padding: '5px 8px' }}>
                          <div><b>{sc.batch.nama_pelanggan || 'Umum'}</b></div>
                          <div style={{ fontSize: '9px', color: '#64748b' }}>Penjahit: {sc.spk.penjahit}</div>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '800', color: '#047857' }}>
                          {sc.totalQty} pcs
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              fontWeight: '800',
                              fontSize: '10px',
                            }}
                          >
                            ✓ {sc.newStatus}
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

        {/* Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Total Barang Masuk Sesi Ini:{' '}
            <b style={{ color: '#059669' }}>
              {scanHistory.reduce((s, it) => s + Number(it.totalQty || 0), 0)} PCS
            </b>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Tutup Scanner
          </button>
        </div>
      </div>
    </div>
  );
}

