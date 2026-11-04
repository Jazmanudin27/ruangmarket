import React, { useRef, useMemo } from 'react';
import { Printer, X, Tag, QrCode, Grid, Layers, CheckCircle2 } from 'lucide-react';

export default function CetakLabelBarcodeSPKModal({
  isOpen,
  onClose,
  batch,
  spk,
  adminName = 'RUANG SERAGAM'
}) {
  const printRef = useRef(null);

  if (!isOpen || !spk || !batch) return null;

  const noProduksi = (batch.kode_produksi || batch.no_produksi || 'PRD').trim();
  const noSpk = (spk.id_spk || spk.no_spk || 'SPK').trim();
  const rawItems = spk.produk_items || [];

  // Generate daftar label per-pcs produk
  // Setiap item dengan Qty N akan di-generate menjadi N lembar label stiker unik
  const labelList = useMemo(() => {
    const list = [];
    let globalIndex = 1;

    rawItems.forEach((item) => {
      const sku = (item.sku || item.kode_sku || 'PROD').trim();
      const nama = item.nama_produk || sku;
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);

      // Extract size label jika ada
      const upper = (sku + ' ' + nama).toUpperCase();
      let size = 'ALL';
      ['4XL', '3XL', 'XXL', '2XL', 'XL', 'L', 'M', 'S'].forEach((sz) => {
        if (upper.includes(`-${sz}`) || upper.includes(` ${sz}`) || upper.endsWith(sz)) {
          size = sz;
        }
      });

      for (let i = 1; i <= qty; i++) {
        const noProdukPadded = String(i).padStart(3, '0');
        // Format Barcode persis permintaan user:
        // No Produksi|No SPK|SKU|No Produk (Biar gak double scan)
        const qrString = `${noProduksi}|${noSpk}|${sku}|${noProdukPadded}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrString)}`;

        list.push({
          id: `${sku}-${i}`,
          noProduksi,
          noSpk,
          sku,
          nama,
          size,
          pcsIndex: i,
          totalQtySku: qty,
          globalIndex: globalIndex++,
          qrString,
          qrUrl
        });
      }
    });

    return list;
  }, [batch, spk, rawItems, noProduksi, noSpk]);

  const handlePrint = () => {
    const printContent = document.getElementById('print-labels-container');
    if (!printContent) return;

    const win = window.open('', '', 'width=900,height=950');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Label Stiker Produk - ${noSpk}</title>
        <style>
          @page {
            size: auto;
            margin: 6mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 5px;
            background: #fff;
            color: #000;
          }
          .label-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .label-card {
            border: 1.5px solid #d97706;
            border-radius: 8px;
            padding: 8px 10px;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            justifyContent: space-between;
            page-break-inside: avoid;
            height: 240px;
          }
          .card-header {
            display: flex;
            align-items: center;
            justifyContent: space-between;
            margin-bottom: 4px;
          }
          .spk-badge {
            background-color: #f59e0b;
            color: #ffffff;
            font-size: 8pt;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .counter-badge {
            font-size: 8pt;
            font-weight: 800;
            color: #64748b;
          }
          .spk-number {
            font-size: 8.5pt;
            font-weight: 800;
            color: #0f172a;
            text-align: center;
            margin-bottom: 4px;
            font-family: monospace;
          }
          .qr-wrapper {
            display: flex;
            justifyContent: center;
            align-items: center;
            margin: 4px 0;
          }
          .qr-image {
            width: 120px;
            height: 120px;
            display: block;
          }
          .card-footer {
            text-align: center;
            margin-top: 4px;
          }
          .sku-title {
            font-size: 9.5pt;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.2;
            word-break: break-all;
          }
          .pcs-subtitle {
            font-size: 8pt;
            color: #64748b;
            font-weight: 700;
            margin-top: 2px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            .label-card {
              border: 1.5px solid #000;
            }
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
        backgroundColor: '#0f172a',
        zIndex: 2600,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100vw',
        height: '100vh',
      }}
    >
      {/* Top Header Modal (Full Screen Bar) */}
      <div
        style={{
          width: '100%',
          height: '46px',
          backgroundColor: '#090d16',
          borderBottom: '1px solid #334155',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Tag size={15} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: '800', lineHeight: 1.2 }}>
              Cetak Label Stiker Per-Produk — SPK #{noSpk}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Format Barcode: <code style={{ color: '#38bdf8' }}>NoProduksi|NoSPK|SKU|NoPcs</code> (Anti Double Scan) • Total: <b>{labelList.length} Pcs</b>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 18px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)',
            }}
          >
            <Printer size={14} />
            <span>Cetak Semua Label ({labelList.length} Pcs)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Tutup (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Sheet Scrollable Container Full Screen */}
      <div
        style={{
          flex: 1,
          width: '100%',
          backgroundColor: '#94a3b8',
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          id="print-labels-container"
          ref={printRef}
          style={{
            width: '100%',
            maxWidth: '1280px',
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
            minHeight: '100%',
          }}
        >
          {/* Label Grid Full Width persis seperti di screenshot erp.aspartech.com */}
          <div
            className="label-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '14px',
            }}
          >
            {labelList.map((lbl, idx) => (
              <div
                key={lbl.id || idx}
                className="label-card"
                style={{
                  border: '1.5px solid #d97706',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                  minHeight: '240px',
                }}
              >
                {/* Header Card: SPK Badge & Counter 1/2 */}
                <div
                  className="card-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    className="spk-badge"
                    style={{
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      fontSize: '9.5px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    SPK
                  </span>
                  <span
                    className="counter-badge"
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#64748b',
                    }}
                  >
                    {lbl.pcsIndex}/{lbl.totalQtySku}
                  </span>
                </div>

                {/* Nomor SPK */}
                <div
                  className="spk-number"
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '800',
                    color: '#0f172a',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    marginBottom: '4px',
                  }}
                >
                  #{lbl.noSpk}
                </div>

                {/* QR Code di tengah */}
                <div
                  className="qr-wrapper"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    margin: '6px 0',
                  }}
                >
                  <img
                    src={lbl.qrUrl}
                    alt={`QR ${lbl.sku}`}
                    className="qr-image"
                    style={{
                      width: '125px',
                      height: '125px',
                      display: 'block',
                    }}
                  />
                </div>

                {/* Bawah QR: SKU & Pcs #1 */}
                <div className="card-footer" style={{ textAlign: 'center', marginTop: '4px' }}>
                  <div
                    className="sku-title"
                    style={{
                      fontSize: '12px',
                      fontWeight: '900',
                      color: '#0f172a',
                      lineHeight: '1.25',
                      wordBreak: 'break-all',
                    }}
                  >
                    {lbl.sku}
                  </div>
                  <div
                    className="pcs-subtitle"
                    style={{
                      fontSize: '10.5px',
                      color: '#64748b',
                      fontWeight: '700',
                      marginTop: '3px',
                    }}
                  >
                    Pcs #{lbl.pcsIndex}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
