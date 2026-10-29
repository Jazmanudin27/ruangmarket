import React, { useRef } from 'react';
import { Printer, X, Download } from 'lucide-react';

export default function CetakSPKModal({ isOpen, onClose, batch, spk, adminName = 'RUANG SERAGAM' }) {
  const printRef = useRef(null);

  if (!isOpen || !spk || !batch) return null;

  const noProduksi = batch.kode_produksi || 'JN2610008';
  const noSpk = spk.id_spk || 'SPK-20261026-0001';
  const orderDate = batch.tgl_pesan || '2026-10-26';
  const deadline = batch.deadline || '2026-11-02';
  const pemesan = batch.nama_pelanggan || 'SALMAH KHAIRANI NASUTION';
  const noTelp = batch.no_telepon || '+62 852-1858-3688';
  const instansi = batch.instansi || '—';
  const catatan = spk.catatan || batch.catatan || 'untuk size XXXL lpk pake size SMA 1 pcs LD 120';
  const designImg = spk.design_img || spk.mockup_img || null;

  // Sizes columns
  const SIZE_COLS = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'ALL SIZE'];

  // Parse products into size matrix rows
  const rawItems = spk.produk_items || [];
  
  // Aggregate items by model or render each item
  const rows = [];
  const totals = { S: 0, M: 0, L: 0, XL: 0, XXL: 0, '3XL': 0, '4XL': 0, 'ALL SIZE': 0, qty: 0 };

  rawItems.forEach((item) => {
    const sku = item.sku || item.nama_produk || 'PROD';
    const qty = Number(item.qty || 1);
    
    // Check if item has explicit size breakdown
    const rowSizes = { S: '', M: '', L: '', XL: '', XXL: '', '3XL': '', '4XL': '', 'ALL SIZE': '' };
    
    if (item.size_breakdown && typeof item.size_breakdown === 'object') {
      Object.keys(item.size_breakdown).forEach((sz) => {
        const val = Number(item.size_breakdown[sz] || 0);
        if (val > 0) {
          rowSizes[sz] = val;
          if (totals[sz] !== undefined) totals[sz] += val;
        }
      });
    } else {
      // Auto detect size from SKU or name
      const upper = (item.sku + ' ' + item.nama_produk).toUpperCase();
      let matched = false;
      
      if (upper.includes('-4XL') || upper.includes(' 4XL') || upper.includes('XXXXL')) {
        rowSizes['4XL'] = qty; totals['4XL'] += qty; matched = true;
      } else if (upper.includes('-3XL') || upper.includes(' 3XL') || upper.includes('XXXL')) {
        rowSizes['3XL'] = qty; totals['3XL'] += qty; matched = true;
      } else if (upper.includes('-XXL') || upper.includes(' XXL')) {
        rowSizes['XXL'] = qty; totals['XXL'] += qty; matched = true;
      } else if (upper.includes('-XL') || upper.includes(' XL')) {
        rowSizes['XL'] = qty; totals['XL'] += qty; matched = true;
      } else if (upper.includes('-L') || upper.includes(' L ')) {
        rowSizes['L'] = qty; totals['L'] += qty; matched = true;
      } else if (upper.includes('-M') || upper.includes(' M ')) {
        rowSizes['M'] = qty; totals['M'] += qty; matched = true;
      } else if (upper.includes('-S') || upper.includes(' S ')) {
        rowSizes['S'] = qty; totals['S'] += qty; matched = true;
      }
      
      if (!matched) {
        rowSizes['ALL SIZE'] = qty;
        totals['ALL SIZE'] += qty;
      }
    }

    totals.qty += qty;

    rows.push({
      model: sku,
      sizes: rowSizes,
      qty: qty,
      estimasiKain: item.estimasi_kain ? (item.panjang_kain_cm ? `${((item.panjang_kain_cm * qty) / 100).toFixed(1)} M` : '—') : '—',
      sisaKain: item.sisa_kain || '—'
    });
  });

  const handlePrint = () => {
    const printContent = document.getElementById('spk-print-area');
    if (!printContent) return;

    const win = window.open('', '', 'width=900,height=1000');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak SPK - ${noSpk}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 10px; color: #000; font-size: 11px; }
          .header-tbl { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
          .header-tbl td { vertical-align: middle; }
          .title-spk { font-size: 26px; font-weight: 900; letter-spacing: 6px; text-align: center; }
          .sub-spk { font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-align: center; }
          .divider-double { border-top: 2.5px solid #000; border-bottom: 1px solid #000; height: 3px; margin: 6px 0; }
          .info-strip { font-size: 10.5px; font-weight: 800; padding: 4px 0; border-bottom: 2px solid #000; margin-bottom: 12px; }
          .box-container { border: 1.5px solid #000; margin-bottom: 12px; }
          .box-header-dark { background: #334155; color: #fff; font-weight: 800; text-align: center; padding: 5px; font-size: 11px; text-transform: uppercase; }
          .box-header-blue { background: #2563eb; color: #fff; font-weight: 800; text-align: center; padding: 5px; font-size: 11px; text-transform: uppercase; }
          .mockup-body { min-height: 260px; max-height: 380px; display: flex; align-items: center; justify-content: center; padding: 10px; border: 1.5px dashed #94a3b8; margin: 4px; }
          .mockup-img { max-width: 100%; max-height: 350px; object-fit: contain; }
          .spk-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
          .spk-table th, .spk-table td { border: 1px solid #000; padding: 5px 6px; text-align: center; }
          .spk-table th { background: #fff; font-weight: 800; }
          .spk-table .th-red { background: #dc2626 !important; color: #fff !important; }
          .spk-table .td-red { background: #dc2626 !important; color: #fff !important; font-weight: 800; }
          .note-box { border: 1.5px solid #000; border-radius: 4px; padding: 8px 12px; font-size: 10.5px; margin-top: 10px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(noSpk)}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Top Action Bar */}
      <div style={{
        width: '100%',
        maxWidth: '860px',
        backgroundColor: '#1e293b',
        borderRadius: '8px 8px 0 0',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px' }}>
          <Printer size={16} color="#38bdf8" />
          <span>Preview Cetak SPK: {noSpk}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>Cetak SPK (Print / PDF)</span>
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Sheet Content Scrollable Container */}
      <div style={{
        width: '100%',
        maxWidth: '860px',
        height: '85vh',
        backgroundColor: '#cbd5e1',
        overflowY: 'auto',
        padding: '20px',
        borderRadius: '0 0 8px 8px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        {/* Printable Paper A4 View */}
        <div
          id="spk-print-area"
          ref={printRef}
          style={{
            width: '100%',
            maxWidth: '800px',
            backgroundColor: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            padding: '24px 30px',
            boxSizing: 'border-box',
            color: '#000000',
            fontFamily: "'Segoe UI', Arial, sans-serif"
          }}
        >
          {/* Header 3-Column */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
            <tbody>
              <tr>
                <td style={{ width: '32%', verticalAlign: 'top', fontSize: '10px', lineHeight: '1.5' }}>
                  <div><b>NO PRODUKSI :</b> {noProduksi}</div>
                  <div><b>NO PESANAN :</b> {noSpk}</div>
                </td>
                <td style={{ width: '36%', textAlign: 'center', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '6px', color: '#000' }}>S P K</div>
                  <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1.2px', color: '#000' }}>SURAT PERINTAH KERJA</div>
                </td>
                <td style={{ width: '32%', verticalAlign: 'top', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right', fontSize: '10px', lineHeight: '1.5' }}>
                      <div><b>ORDER DATE :</b> {orderDate}</div>
                      <div><b>DEADLINE :</b> <span style={{ color: '#dc2626', fontWeight: '800' }}>{deadline}</span></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={qrUrl}
                        alt="QR"
                        style={{ width: '56px', height: '56px', display: 'block', border: '1px solid #000' }}
                      />
                      <span style={{ fontSize: '7.5px', fontWeight: '800', display: 'block', marginTop: '2px' }}>SCAN TRACKING</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Divider */}
          <div style={{ borderTop: '2.5px solid #000', borderBottom: '1px solid #000', height: '3px', margin: '6px 0' }} />

          {/* Info Strip */}
          <div style={{
            fontSize: '10px',
            fontWeight: '800',
            padding: '4px 0',
            borderBottom: '2px solid #000',
            marginBottom: '10px'
          }}>
            PEMESAN: {pemesan} {noTelp ? `(${noTelp})` : ''} | INSTANSI: {instansi} | ADMIN: {adminName}
          </div>

          {/* Box 1: Gambar Desain / Mockup */}
          <div style={{ border: '1.5px solid #000', marginBottom: '10px' }}>
            <div style={{
              background: '#334155',
              color: '#ffffff',
              fontWeight: '800',
              textAlign: 'center',
              padding: '4px',
              fontSize: '10.5px',
              textTransform: 'uppercase'
            }}>
              🖼️ GAMBAR DESAIN / MOCKUP
            </div>
            <div style={{
              minHeight: '240px',
              maxHeight: '340px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              border: '1.5px dashed #94a3b8',
              margin: '4px',
              backgroundColor: '#fafafa'
            }}>
              {designImg ? (
                <img
                  src={designImg}
                  alt="Mockup Desain"
                  style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' }}>
                  Belum ada gambar desain / mockup diunggah untuk SPK ini.
                </div>
              )}
            </div>
          </div>

          {/* Box 2: Rincian Varian Produk & Kebutuhan Kain */}
          <div style={{ border: '1.5px solid #000', marginBottom: '10px' }}>
            <div style={{
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: '800',
              textAlign: 'center',
              padding: '4px',
              fontSize: '10.5px',
              textTransform: 'uppercase'
            }}>
              RINCIAN VARIAN PRODUK & KEBUTUHAN KAIN
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ background: '#ffffff' }}>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '26%', textAlign: 'center' }}>
                    MODEL VARIAN
                  </th>
                  <th colSpan={8} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                    SIZE TARGET / POTONG
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '10%', background: '#dc2626', color: '#fff', textAlign: 'center' }}>
                    TOTAL QTY
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '13%', textAlign: 'center' }}>
                    ESTIMASI KAIN (M)
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000', padding: '6px 4px', width: '13%', textAlign: 'center' }}>
                    SISA KAIN (M)
                  </th>
                </tr>
                <tr style={{ background: '#ffffff' }}>
                  {SIZE_COLS.map((sz) => (
                    <th key={sz} style={{ border: '1px solid #000', padding: '4px 2px', width: sz === 'ALL SIZE' ? '6%' : '4.5%', textAlign: 'center', fontSize: '9px' }}>
                      {sz}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', color: '#64748b' }}>
                      Tidak ada rincian produk
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'left', fontWeight: '700' }}>
                        {r.model}
                      </td>
                      {SIZE_COLS.map((sz) => (
                        <td key={sz} style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center' }}>
                          {r.sizes[sz] || ''}
                        </td>
                      ))}
                      <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', background: '#dc2626', color: '#ffffff', fontWeight: '800' }}>
                        {r.qty}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
                        {r.estimasiKain}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
                        {r.sisaKain}
                      </td>
                    </tr>
                  ))
                )}
                {/* Total Row */}
                <tr style={{ fontWeight: '800', background: '#f8fafc' }}>
                  <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>
                    TOTAL
                  </td>
                  {SIZE_COLS.map((sz) => (
                    <td key={sz} style={{ border: '1px solid #000', padding: '5px 2px', textAlign: 'center' }}>
                      {totals[sz] || ''}
                    </td>
                  ))}
                  <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', background: '#dc2626', color: '#ffffff', fontWeight: '800' }}>
                    {totals.qty}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
                    —
                  </td>
                  <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>
                    —
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Box 3: Catatan / Keterangan */}
          <div style={{
            border: '1.5px solid #000',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '10px',
            lineHeight: '1.4'
          }}>
            <div style={{ fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px' }}>
              CATATAN / KETERANGAN:
            </div>
            <div>{catatan || '-'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
