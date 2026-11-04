import React, { useRef } from 'react';
import { Printer, X, QrCode, Tag, CheckCircle2, Scissors, Calendar, User, Package } from 'lucide-react';

export default function CetakLabelBarcodeSPKModal({
  isOpen,
  onClose,
  batch,
  spk,
  adminName = 'RUANG SERAGAM'
}) {
  const printRef = useRef(null);

  if (!isOpen || !spk || !batch) return null;

  const noProduksi = batch.kode_produksi || batch.no_produksi || '-';
  const noSpk = spk.id_spk || spk.no_spk || '-';
  const orderDate = batch.tgl_pesan || batch.created_at?.slice(0, 10) || '-';
  const deadline = batch.deadline || '-';
  const pemesan = batch.nama_pelanggan || batch.pelanggan || 'Umum';
  const instansi = batch.instansi || '—';
  const penjahit = spk.penjahit || 'Workshop Konveksi';
  const rawItems = spk.produk_items || [];

  const totalQty = rawItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(noSpk)}`;

  const handlePrint = () => {
    const printContent = document.getElementById('barcode-label-print-area');
    if (!printContent) return;

    const win = window.open('', '', 'width=600,height=800');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Label Barcode SPK - ${noSpk}</title>
        <style>
          @page {
            size: 100mm 150mm;
            margin: 0;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 4mm;
            color: #000;
            background: #fff;
            width: 100mm;
            height: 150mm;
            max-height: 150mm;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justifyContent: space-between;
          }
          .label-container {
            border: 2px solid #000;
            padding: 3mm;
            height: 100%;
            display: flex;
            flex-direction: column;
            justifyContent: space-between;
          }
          .header {
            border-bottom: 2px solid #000;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
            display: flex;
            justifyContent: space-between;
            align-items: center;
          }
          .brand-title {
            font-size: 13pt;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .brand-sub {
            font-size: 7pt;
            font-weight: 700;
            color: #333;
          }
          .batch-pill {
            font-size: 7.5pt;
            font-weight: 800;
            border: 1.5px solid #000;
            padding: 1mm 2mm;
            border-radius: 2mm;
            text-align: right;
          }
          .qr-section {
            border: 1.5px solid #000;
            padding: 2.5mm;
            margin-bottom: 2mm;
            display: flex;
            align-items: center;
            gap: 3mm;
            background: #fff;
          }
          .qr-img {
            width: 32mm;
            height: 32mm;
            display: block;
            border: 1px solid #000;
            flex-shrink: 0;
          }
          .spk-id {
            font-size: 15pt;
            font-weight: 900;
            letter-spacing: 1px;
            margin-bottom: 1.5mm;
            word-break: break-all;
          }
          .meta-row {
            font-size: 8pt;
            line-height: 1.35;
          }
          .table-items {
            width: 100%;
            border-collapse: collapse;
            font-size: 7.5pt;
            margin-bottom: 2mm;
          }
          .table-items th, .table-items td {
            border: 1px solid #000;
            padding: 1.5mm 1.5mm;
            text-align: left;
          }
          .table-items th {
            background: #f0f0f0;
            font-weight: 800;
            text-transform: uppercase;
            font-size: 7pt;
          }
          .footer-box {
            border-top: 1.5px dashed #000;
            padding-top: 1.5mm;
            font-size: 6.5pt;
            text-align: center;
            font-weight: 800;
            line-height: 1.25;
          }
          @media print {
            body { padding: 3mm; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 2600,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#1e293b',
          borderRadius: '10px 10px 0 0',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800' }}>
          <Tag size={16} color="#38bdf8" />
          <span>Label Barcode SPK (Kertas 100mm x 150mm)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)',
            }}
          >
            <Printer size={14} />
            <span>Cetak Label (100x150 mm)</span>
          </button>
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
      </div>

      {/* Sheet Preview Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '82vh',
          backgroundColor: '#94a3b8',
          overflowY: 'auto',
          padding: '16px',
          borderRadius: '0 0 10px 10px',
          display: 'flex',
          justifyContent: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Label (100mm x 150mm proportions) */}
        <div
          id="barcode-label-print-area"
          ref={printRef}
          style={{
            width: '380px',
            minHeight: '570px',
            backgroundColor: '#ffffff',
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.35)',
            padding: '14px',
            boxSizing: 'border-box',
            color: '#000000',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '2px solid #000000',
          }}
        >
          {/* Top Label Header */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid #000000',
                paddingBottom: '6px',
                marginBottom: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {adminName}
                </div>
                <div style={{ fontSize: '9px', fontWeight: '700', color: '#475569' }}>
                  LABEL PACKING & SORTIR PRODUKSI
                </div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  fontSize: '9px',
                  fontWeight: '800',
                  border: '1.5px solid #000000',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                <div>BATCH: {noProduksi}</div>
                <div style={{ color: '#dc2626' }}>DL: {deadline}</div>
              </div>
            </div>

            {/* QR Code & SPK Highlight Box */}
            <div
              style={{
                border: '2px solid #000000',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <img
                  src={qrUrl}
                  alt="QR SPK"
                  style={{
                    width: '105px',
                    height: '105px',
                    display: 'block',
                    border: '1.5px solid #000000',
                  }}
                />
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: '900',
                    display: 'block',
                    marginTop: '2px',
                    letterSpacing: '0.5px',
                  }}
                >
                  SCAN SAAT DITERIMA
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: '900',
                    letterSpacing: '1px',
                    color: '#000000',
                    wordBreak: 'break-all',
                    lineHeight: '1.2',
                    marginBottom: '4px',
                  }}
                >
                  {noSpk}
                </div>
                <div style={{ fontSize: '9.5px', lineHeight: '1.4' }}>
                  <div><b>Nama SPK:</b> {spk.nama_spk || 'SPK Jahit'}</div>
                  <div><b>Penjahit:</b> {penjahit}</div>
                  <div><b>Pemesan:</b> {pemesan}</div>
                  {instansi && instansi !== '—' && <div><b>Instansi:</b> {instansi}</div>}
                  <div><b>Tgl SPK:</b> {orderDate}</div>
                </div>
              </div>
            </div>

            {/* Product Items Breakdown Table */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9.5px', fontWeight: '800', marginBottom: '3px', textTransform: 'uppercase' }}>
                📦 DAFTAR PRODUK DALAM BUNGKUSAN INI:
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '9px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #000', padding: '3px 4px', width: '22px', textAlign: 'center' }}>#</th>
                    <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'left' }}>SKU & Varian</th>
                    <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '45px' }}>Ukuran</th>
                    <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', width: '50px' }}>Qty (Pcs)</th>
                  </tr>
                </thead>
                <tbody>
                  {rawItems.map((item, idx) => {
                    const sku = item.sku || item.kode_sku || 'PROD';
                    const name = item.nama_produk || sku;
                    // Auto detect size
                    const upper = (sku + ' ' + name).toUpperCase();
                    let sizeLabel = 'ALL';
                    ['4XL', '3XL', 'XXL', '2XL', 'XL', 'L', 'M', 'S'].forEach((sz) => {
                      if (upper.includes(`-${sz}`) || upper.includes(` ${sz}`) || upper.endsWith(sz)) {
                        sizeLabel = sz;
                      }
                    });

                    return (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '3px 6px' }}>
                          <div style={{ fontWeight: '800' }}>{sku}</div>
                          <div style={{ fontSize: '8px', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                            {name}
                          </div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: '800' }}>
                          {sizeLabel}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontWeight: '900', fontSize: '10px' }}>
                          {item.qty} pcs
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: '900' }}>
                    <td colSpan={3} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>
                      TOTAL DALAM PLASTIK:
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontSize: '11px', color: '#000000' }}>
                      {totalQty} PCS
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Instruction for Warehouse / Sorter */}
          <div
            style={{
              borderTop: '1.5px dashed #000000',
              paddingTop: '6px',
              fontSize: '8px',
              textAlign: 'center',
              lineHeight: '1.3',
              fontWeight: '700',
            }}
          >
            <div>📌 <b>PETUNJUK:</b> TEMPELKAN LABEL INI PADA BUNGKUSAN PLASTIK HASIL JAHITAN SPK.</div>
            <div style={{ color: '#475569' }}>
              Saat barang datang menumpuk di workshop, scan barcode di atas untuk langsung verifikasi SPK & otomatis ubah status ke <b>SELESAI PRODUKSI</b>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

