import React, { useState } from 'react';
import { 
  Factory, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  Scissors, 
  Tag, 
  Calendar,
  Eye,
  CheckCircle2,
  Package
} from 'lucide-react';
import { toastSuccess } from '../../utils/alert.util';

const INITIAL_PRODUKSI = [
  {
    id: 1,
    no_spk: 'SPK-2610-001',
    nama_produk: 'Gamis Abaya Dubai Silk Jetblack',
    kategori: 'Abaya Dubai',
    target_qty: 100,
    qty_selesai: 65,
    satuan: 'PCS',
    penjahit: 'Workshop Konveksi A (Mas Deni)',
    tgl_mulai: '2026-10-20',
    deadline: '2026-11-02',
    status: 'Proses Jahit'
  },
  {
    id: 2,
    no_spk: 'SPK-2610-002',
    nama_produk: 'Gamis Crinkle Airflow Casual Dress',
    kategori: 'Gamis Casual',
    target_qty: 80,
    qty_selesai: 80,
    satuan: 'PCS',
    penjahit: 'Workshop Konveksi B (Bu Siti)',
    tgl_mulai: '2026-10-18',
    deadline: '2026-10-26',
    status: 'Selesai QC'
  },
  {
    id: 3,
    no_spk: 'SPK-2610-003',
    nama_produk: 'Gamis Brokat Pesta Marwah Exclusive',
    kategori: 'Gamis Pesta',
    target_qty: 50,
    qty_selesai: 15,
    satuan: 'PCS',
    penjahit: 'Workshop Butik Pesta (Teh Rina)',
    tgl_mulai: '2026-10-24',
    deadline: '2026-11-08',
    status: 'Potong Pola'
  }
];

export default function ProduksiView() {
  const [listProduksi, setListProduksi] = useState(INITIAL_PRODUKSI);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const filtered = listProduksi.filter(item => {
    if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.no_spk.toLowerCase().includes(q) ||
        item.nama_produk.toLowerCase().includes(q) ||
        item.penjahit.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selesai QC':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case 'Proses Jahit':
        return { bg: '#eff6ff', color: '#0284c7', border: '#93c5fd' };
      case 'Potong Pola':
        return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      default:
        return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* MASTER CONTAINER CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
        padding: '10px 14px',
        boxSizing: 'border-box'
      }}>
        
        {/* HEADER SECTION */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '10px',
          boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)'
            }}>
              <Factory size={16} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '14px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Manajemen Produksi & Jahit Gamis
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
                Pantau Surat Perintah Kerja (SPK), progress potong pola, jahit konveksi, dan kontrol QC
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => toastSuccess('Form Buat SPK Produksi dibuka')}
              style={{
                height: '30px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#0284c7',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              <Plus size={14} />
              <span>Buat SPK Produksi</span>
            </button>
          </div>
        </div>

        {/* METRIC STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '10px' }}>
          <div style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '5px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={14} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>TOTAL SPK AKTIF</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{listProduksi.length} SPK</div>
            </div>
          </div>
          <div style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '5px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scissors size={14} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#1e40af', fontWeight: '700' }}>SEDANG DIJAHIT</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#1d4ed8' }}>
                {listProduksi.filter(p => p.status === 'Proses Jahit').length} Batch
              </div>
            </div>
          </div>
          <div style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #a7f3d0', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '5px', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={14} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#065f46', fontWeight: '700' }}>SELESAI QC & GUDANG</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>
                {listProduksi.filter(p => p.status === 'Selesai QC').length} Batch
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '8px' }} />
            <input
              type="text"
              placeholder="Cari nomor SPK, nama produk, workshop konveksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                backgroundColor: '#f8fafc'
              }}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '11.5px',
              color: '#334155',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">Semua Status Produksi</option>
            <option value="Potong Pola">Potong Pola</option>
            <option value="Proses Jahit">Proses Jahit</option>
            <option value="Selesai QC">Selesai QC</option>
          </select>
        </div>

        {/* TABLE PRODUKSI */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155', width: '50px' }}>NO</th>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155' }}>NO. SPK & PRODUK</th>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155' }}>WORKSHOP / PENJAHIT</th>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155', textAlign: 'center' }}>PROGRESS QTY</th>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155' }}>DEADLINE</th>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155', width: '110px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const badge = getStatusBadge(item.status);
                const percent = Math.min(100, Math.round((item.qty_selesai / item.target_qty) * 100));

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: '600' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: '800', color: '#0284c7', fontFamily: 'monospace' }}>{item.no_spk}</div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.nama_produk}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>Kategori: {item.kategori}</div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155', fontWeight: '600' }}>
                      {item.penjahit}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a' }}>
                        {item.qty_selesai} / {item.target_qty} {item.satuan} ({percent}%)
                      </div>
                      <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', marginTop: '4px' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: percent === 100 ? '#059669' : '#0284c7', borderRadius: '9999px' }} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} color="#64748b" />
                        <span>{item.deadline}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {item.status}
                      </span>
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
}
