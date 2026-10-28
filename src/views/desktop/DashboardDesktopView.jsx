import React from 'react';
import { 
  Package, 
  Store, 
  Boxes, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Clock,
  Sparkles,
  QrCode,
  AlertTriangle,
  BadgeDollarSign
} from 'lucide-react';
import { INITIAL_PRODUK_DATA } from '../../data/initialProduk';

const STORAGE_KEY = 'ruangmarket_produk_gamis_v4';

export default function DashboardView({ onNavigate }) {
  let produkList = INITIAL_PRODUK_DATA;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) produkList = JSON.parse(saved);
  } catch (e) {}

  const totalProduk = produkList.length;
  const totalTersedia = produkList.filter(p => p.stok > p.min_stok).length;
  const totalMenipis = produkList.filter(p => p.stok > 0 && p.stok <= p.min_stok).length;
  const totalHabis = produkList.filter(p => p.stok <= 0).length;

  const totalNilaiAset = produkList.reduce((acc, curr) => acc + ((Number(curr.harga_jual) || 0) * (Number(curr.stok) || 0)), 0);

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* WELCOME BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '16px',
        padding: '28px 32px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '28px',
        boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.2)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.2)', fontSize: '12px', fontWeight: '600', marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>Ruang Market • Sistem Manajemen Produk & Inventaris</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 8px 0' }}>
            Selamat Datang di Portal Ruang Market
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px', maxWidth: '620px', lineHeight: 1.5 }}>
            Kelola katalog produk, cetak barcode label, pantau posisi rak & etalase, serta kontrol ketersediaan stok barang secara realtime.
          </p>
        </div>

        <button
          onClick={() => onNavigate('produk')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            color: '#0284c7',
            border: 'none',
            padding: '12px 22px',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Buka Data Produk
          <ArrowRight size={16} />
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Total Produk Terdaftar</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <Package size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{totalProduk}</div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <CheckCircle2 size={14} /> Terdata di Katalog
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Stok Siap Jual</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <Store size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{totalTersedia}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Status stok aman & tersedia</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Perlu Restock</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{totalMenipis + totalHabis}</div>
          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: '600' }}>Stok menipis atau habis</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Nilai Est. Inventaris</span>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{formatRupiah(totalNilaiAset)}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Akumulasi nilai jual stok fisik</div>
        </div>

      </div>

      {/* OVERVIEW CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* RECENT PRODUCTS LIST */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Katalog Produk Terbaru</h3>
            <button
              onClick={() => onNavigate('produk')}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Lihat Semua <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {produkList.slice(0, 5).map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                    {p.nama_produk}
                  </div>
                  <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>
                    SKU: {p.sku} • {p.etalase}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>
                    {formatRupiah(p.harga_jual)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Stok: {p.stok} {p.satuan}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK GUIDE CARD */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Panduan Cepat Ruang Market</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QrCode size={18} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>Cetak Barcode Otomatis</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Setiap produk dilengkapi kode barcode dan kartu label rak yang siap dicetak ke printer.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Boxes size={18} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>Pemetaan Rak & Etalase</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Catat nomor etalase dan rak secara presisi agar proses penataan dan pencarian barang lebih cepat.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={18} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>Peringatan Stok Menipis</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Sistem otomatis memberi tanda peringatan bila stok fisik menyentuh batas minimum.
                </div>
              </div>
            </div>

          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={() => onNavigate('produk')}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Menuju Halaman Master Produk
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
