import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  RotateCw,
  Tag,
  DollarSign,
  Boxes,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

export default function KainDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('company_changed', handleCompanyChange);
    return () => window.removeEventListener('company_changed', handleCompanyChange);
  }, []);

  const [kainList, setKainList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    kode_sku_kain: '',
    nama_kain: '',
    jenis_kain: '',
    warna: '',
    satuan: 'METER',
    stok_kain: 0,
    harga_per_meter: 25000,
    keterangan: ''
  };
  const [formData, setFormData] = useState(initialForm);

  // Load data kain dari server API
  const loadKain = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/kain/master');
      const json = await res.json();
      if (res.ok && json.status === 'success' && Array.isArray(json.data)) {
        setKainList(json.data);
      } else {
        throw new Error(json.message || 'Gagal memuat data kain');
      }
    } catch (err) {
      console.error('[KainView Load Error]:', err);
      toastError(`Gagal memuat data kain: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKain();
  }, []);

  // Filter jenis kain unik
  const jenisOptions = ['Semua', ...Array.from(new Set(kainList.map(k => k.jenis_kain).filter(Boolean)))];

  // Data terfilter
  const filteredKain = kainList.filter(k => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || 
      (k.kode_sku_kain || '').toLowerCase().includes(q) ||
      (k.nama_kain || '').toLowerCase().includes(q) ||
      (k.jenis_kain || '').toLowerCase().includes(q) ||
      (k.warna || '').toLowerCase().includes(q) ||
      (k.keterangan || '').toLowerCase().includes(q);

    const matchJenis = filterJenis === 'Semua' || k.jenis_kain === filterJenis;
    return matchSearch && matchJenis;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      kode_sku_kain: item.kode_sku_kain || '',
      nama_kain: item.nama_kain || '',
      jenis_kain: item.jenis_kain || '',
      warna: item.warna || '',
      satuan: item.satuan || 'METER',
      stok_kain: Number(item.stok_kain || 0),
      harga_per_meter: Number(item.harga_per_meter || 0),
      keterangan: item.keterangan || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    const relasiCount = Number(item.total_produk_terkait || 0);
    const relasiMsg = relasiCount > 0 
      ? ` Kain ini digunakan oleh ${relasiCount} produk di Master Produk.` 
      : '';

    const confirmed = await showConfirm(
      'Hapus Master Kain?',
      `Yakin ingin menghapus kain "${item.nama_kain}" (${item.kode_sku_kain})?${relasiMsg}`,
      'Ya, Hapus',
      'Batal'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/kain/master/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Gagal menghapus data kain');
      }
      toastSuccess(`Kain ${item.kode_sku_kain} berhasil dihapus`);
      loadKain();
    } catch (err) {
      toastError(`Gagal hapus: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.kode_sku_kain.trim() || !formData.nama_kain.trim()) {
      toastError('Kode SKU Kain dan Nama Kain wajib diisi!');
      return;
    }

    try {
      if (editingId) {
        // Edit existing kain
        const res = await fetch(`/api/kain/master/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message || 'Gagal update data kain');
        }
        toastSuccess(`Kain ${formData.kode_sku_kain} berhasil diperbarui`);
      } else {
        // Add new kain
        const res = await fetch('/api/kain/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            kode_perusahaan: activeCompany?.code || 'RSG'
          })
        });
        const json = await res.json();
        if (!res.ok || json.status !== 'success') {
          throw new Error(json.message || 'Gagal menambah kain baru');
        }
        toastSuccess(`Kain baru ${formData.kode_sku_kain} berhasil disimpan`);
      }

      setIsModalOpen(false);
      loadKain();
    } catch (err) {
      toastError(`Gagal simpan: ${err.message}`);
    }
  };

  const totalKain = kainList.length;
  const avgPrice = totalKain > 0
    ? Math.round(kainList.reduce((acc, k) => acc + (Number(k.harga_per_meter) || 0), 0) / totalKain)
    : 0;
  const totalRelasiProduk = kainList.reduce((acc, k) => acc + (Number(k.total_produk_terkait) || 0), 0);

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* MASTER CONTAINER CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
        boxSizing: 'border-box'
      }}>
        
        {/* HEADER SECTION (GRADIENT BLUE IDENTIK DENGAN DATA MASTER LAIN) */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
          borderRadius: '8px',
          padding: '10px 16px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '8px',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.22)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              backdropFilter: 'blur(4px)'
            }}>
              <Layers size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Master Data Kain & Bahan Baku
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
                Kelola daftar SKU Kain, penetapan harga per meter, satuan, stok bahan, dan relasi otomatis ke SPK
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={loadKain}
              disabled={isLoading}
              style={{
                height: '30px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            >
              <RotateCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
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
                lineHeight: 1,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              <Plus size={14} />
              <span>Tambah Kain</span>
            </button>
          </div>
        </div>

        {/* INFO STATISTIK SUMMARY BANNER */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Total SKU Kain:</span>
            <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#0f172a' }}>{totalKain} Jenis</span>
          </div>

          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#065f46' }}>Rata-rata Harga / Meter:</span>
            <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#059669' }}>Rp {avgPrice.toLocaleString('id-ID')} / m</span>
          </div>

          <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e40af' }}>Produk Terhubung Kain:</span>
            <span style={{ fontSize: '12.5px', fontWeight: '900', color: '#1d4ed8' }}>{totalRelasiProduk.toLocaleString('id-ID')} Produk</span>
          </div>
        </div>

        {/* TOOLBAR SEARCH & FILTER JENIS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
              <Search size={13} color="#64748b" style={{ position: 'absolute', left: '10px', top: '8px' }} />
              <input
                type="text"
                placeholder="Cari SKU Kain, Nama, Jenis, Warna..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 10px 5px 30px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a'
                }}
              />
            </div>

            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              style={{
                height: '28px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                color: '#334155',
                backgroundColor: '#ffffff',
                fontWeight: '600'
              }}
            >
              {jenisOptions.map(j => (
                <option key={j} value={j}>{j === 'Semua' ? 'Semua Jenis Kain' : j}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
            Menampilkan <b>{filteredKain.length}</b> dari <b>{kainList.length}</b> kain
          </div>
        </div>

        {/* DATA TABLE (IDENTIK DENGAN KATEGORI & PRODUK MASTER) */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '45px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>NO</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '140px', borderRight: '1px solid #e2e8f0' }}>KODE SKU KAIN</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', minWidth: '180px', borderRight: '1px solid #e2e8f0' }}>NAMA KAIN</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '130px', borderRight: '1px solid #e2e8f0' }}>JENIS KAIN</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '110px', borderRight: '1px solid #e2e8f0' }}>WARNA</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '70px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>SATUAN</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '130px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>HARGA / METER</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '110px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>HARGA / CM</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '110px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>TERHUBUNG</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', minWidth: '130px', borderRight: '1px solid #e2e8f0' }}>KETERANGAN</th>
                  <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '80px', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredKain.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      {isLoading ? 'Sedang memuat data kain...' : 'Tidak ada data kain yang cocok.'}
                    </td>
                  </tr>
                ) : (
                  filteredKain.map((item, idx) => {
                    const meterPrice = Number(item.harga_per_meter || 0);
                    const cmPrice = Math.round(meterPrice / 100);

                    return (
                      <tr 
                        key={item.id || idx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                        }}
                      >
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b', fontWeight: '600', borderRight: '1px solid #e2e8f0' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '7px 10px', borderRight: '1px solid #e2e8f0' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            fontSize: '11px',
                            color: '#0284c7',
                            backgroundColor: '#f0f9ff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #bae6fd'
                          }}>
                            {item.kode_sku_kain}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: '700', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Layers size={13} color="#0284c7" />
                            <span>{item.nama_kain}</span>
                          </div>
                        </td>
                        <td style={{ padding: '7px 10px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>
                          {item.jenis_kain || '-'}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>
                          {item.warna || '-'}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b', fontWeight: '700', borderRight: '1px solid #e2e8f0' }}>
                          {item.satuan || 'METER'}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '900', color: '#059669', fontSize: '12px', borderRight: '1px solid #e2e8f0' }}>
                          Rp {meterPrice.toLocaleString('id-ID')} / m
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', color: '#0284c7', borderRight: '1px solid #e2e8f0' }}>
                          Rp {cmPrice.toLocaleString('id-ID')} / cm
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 7px',
                            borderRadius: '9999px',
                            backgroundColor: Number(item.total_produk_terkait || 0) > 0 ? '#f5f3ff' : '#f1f5f9',
                            color: Number(item.total_produk_terkait || 0) > 0 ? '#7c3aed' : '#94a3b8',
                            border: Number(item.total_produk_terkait || 0) > 0 ? '1px solid #ddd6fe' : '1px solid #e2e8f0'
                          }}>
                            {Number(item.total_produk_terkait || 0).toLocaleString('id-ID')} Produk
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '11px', borderRight: '1px solid #e2e8f0' }}>
                          {item.keterangan || '-'}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Master Kain"
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #0284c7',
                                backgroundColor: '#f0f9ff',
                                color: '#0284c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              title="Hapus Master Kain"
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #ef4444',
                                backgroundColor: '#fef2f2',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER PAGING BAR IDENTIK DENGAN MASTER PRODUK */}
          <div style={{
            padding: '8px 14px',
            borderTop: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: '#64748b'
          }}>
            <div>
              Menampilkan <strong>{filteredKain.length}</strong> master kain
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              ERP RuangMarket • Master Kain & Bahan Baku
            </div>
          </div>
        </div>

      </div>

      {/* MODAL TAMBAH / EDIT KAIN */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1'
          }}>
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={17} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800' }}>
                  {editingId ? 'Edit Data Master Kain' : 'Tambah Master Kain Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '3px' }}>
                  Kode SKU Kain <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: KB-TH-MERAH, K-DRILL-UON"
                  value={formData.kode_sku_kain}
                  onChange={(e) => setFormData({ ...formData, kode_sku_kain: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: '700',
                    fontFamily: 'monospace',
                    color: '#0284c7',
                    backgroundColor: '#f8fafc'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '3px' }}>
                  Nama Kain <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kain Batik TH Merah"
                  value={formData.nama_kain}
                  onChange={(e) => setFormData({ ...formData, nama_kain: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    color: '#0f172a',
                    fontWeight: '600'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Jenis Kain
                  </label>
                  <input
                    type="text"
                    placeholder="Batik / Drill / Calista"
                    value={formData.jenis_kain}
                    onChange={(e) => setFormData({ ...formData, jenis_kain: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      color: '#0f172a'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Warna Kain
                  </label>
                  <input
                    type="text"
                    placeholder="Merah / Putih / Navy"
                    value={formData.warna}
                    onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              {/* HARGA PER METER (POKOK) */}
              <div style={{
                backgroundColor: '#f0fdf4',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #a7f3d0'
              }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#065f46', marginBottom: '4px' }}>
                  Harga Kain Per Meter (Rp / Meter) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '7px', fontSize: '11.5px', fontWeight: '800', color: '#059669' }}>Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formData.harga_per_meter ? Number(formData.harga_per_meter).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, harga_per_meter: raw ? Number(raw) : 0 });
                    }}
                    placeholder="25.000"
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 34px',
                      borderRadius: '6px',
                      border: '1.5px solid #059669',
                      fontSize: '13px',
                      fontWeight: '900',
                      color: '#065f46',
                      textAlign: 'right',
                      backgroundColor: '#ffffff'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '10.5px' }}>
                  <span style={{ color: '#047857' }}>Kalkulasi Otomatis ke Produk Master:</span>
                  <span style={{ fontWeight: '800', color: '#0284c7' }}>
                    @Rp {Math.round((Number(formData.harga_per_meter) || 0) / 100).toLocaleString('id-ID')} / CM
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Keterangan Tambahan
                </label>
                <textarea
                  rows="2"
                  placeholder="Catatan spesifikasi bahan atau gramasi..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    color: '#0f172a',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Save size={13} />
                  <span>{editingId ? 'Simpan Perubahan' : 'Tambah Kain'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
