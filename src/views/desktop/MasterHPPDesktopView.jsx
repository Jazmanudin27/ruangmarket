import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  RotateCw,
  ChevronDown,
  ChevronRight,
  ListPlus,
  Coins
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

export const HPP_STORAGE_KEY = 'ruangmarket_master_hpp_produk';

export default function MasterHPPDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('company_changed', handleCompanyChange);
    return () => window.removeEventListener('company_changed', handleCompanyChange);
  }, []);

  const [hppList, setHppList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    id_kategori_hpp: '',
    nama_kategori_hpp: '',
    keterangan: '',
    status: 'Aktif',
    details: [
      { nama_jasa: 'Jasa Potong', jumlah: 1, harga: 2000, total: 2000 },
      { nama_jasa: 'Jasa Jahit', jumlah: 1, harga: 7000, total: 7000 },
      { nama_jasa: 'Finishing', jumlah: 1, harga: 550, total: 550 },
      { nama_jasa: 'BOP', jumlah: 1, harga: 2500, total: 2500 }
    ]
  };
  const [formData, setFormData] = useState(initialForm);

  // Load HPP dari API Server per Halaman (Server-side Pagination)
  const loadHPP = async (page = currentPage, limit = entriesPerPage) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCompany?.code) params.set('kode_perusahaan', activeCompany.code);
      params.set('page', page);
      params.set('limit', limit);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/marketplace/hpp-produk?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const rawData = Array.isArray(json) ? json : (json.data || []);
        const pagination = json.pagination || { total: rawData.length, totalPages: Math.ceil(rawData.length / limit) || 1 };
        setHppList(rawData);
        setTotalCount(pagination.total);
        setTotalPages(pagination.totalPages);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Gagal load HPP dari server:', e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadHPP(currentPage, entriesPerPage);
  }, [currentPage, entriesPerPage, search, activeCompany?.code]);

  const filteredList = hppList;

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleOpenAdd = () => {
    const nextNum = hppList.length + 1;
    const autoId = `HPP-BARU-${String(nextNum).padStart(3, '0')}`;
    setFormData({
      ...initialForm,
      id_kategori_hpp: autoId
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  // Formatter pemisah ribuan (titik) untuk input angka
  const formatNumberId = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return '';
    return num.toLocaleString('id-ID');
  };

  const parseNumberId = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const clean = String(val).replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const handleOpenEdit = (item) => {
    setFormData({
      id_kategori_hpp: item.id_kategori_hpp || '',
      nama_kategori_hpp: item.nama_kategori_hpp || '',
      keterangan: item.keterangan || '',
      status: item.status || 'Aktif',
      details: item.details && item.details.length > 0 
        ? item.details.map(d => ({
            nama_jasa: d.nama_jasa || '',
            jumlah: Number(d.jumlah) || 1,
            harga: Number(d.harga) || 0,
            total: Number(d.total) || ((Number(d.jumlah) || 1) * (Number(d.harga) || 0))
          }))
        : [{ nama_jasa: 'Jasa Jahit', jumlah: 1, harga: Number(item.total_hpp) || 0, total: Number(item.total_hpp) || 0 }]
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    const ok = await showConfirm(
      'Hapus Kategori HPP?',
      `Yakin ingin menghapus kategori HPP "${item.nama_kategori_hpp}" (${item.id_kategori_hpp}) beserta seluruh rincian detailnya?`,
      'Ya, Hapus',
      'Batal'
    );
    if (!ok) return;

    try {
      await fetch(`/api/marketplace/hpp-produk?id_kategori_hpp=${encodeURIComponent(item.id_kategori_hpp)}`, {
        method: 'DELETE'
      });
      toastSuccess('Kategori HPP berhasil dihapus dari database!');
      loadHPP();
    } catch (e) {
      toastError('Gagal menghapus data dari server');
    }
  };

  // Dynamic Row Detail Form Handler
  const handleDetailChange = (index, field, value) => {
    const updated = [...formData.details];
    if (field === 'jumlah') {
      const parsed = parseNumberId(value);
      updated[index].jumlah = value === '' ? '' : parsed;
      const jml = parsed;
      const hrg = Number(updated[index].harga) || 0;
      updated[index].total = jml * hrg;
    } else if (field === 'harga') {
      const parsed = parseNumberId(value);
      updated[index].harga = value === '' ? '' : parsed;
      const jml = Number(updated[index].jumlah) || 0;
      const hrg = parsed;
      updated[index].total = jml * hrg;
    } else {
      updated[index][field] = value;
    }
    setFormData(prev => ({ ...prev, details: updated }));
  };

  const handleAddDetailRow = () => {
    setFormData(prev => ({
      ...prev,
      details: [
        ...prev.details,
        { nama_jasa: '', jumlah: 1, harga: 0, total: 0 }
      ]
    }));
  };

  const handleRemoveDetailRow = (index) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, idx) => idx !== index)
    }));
  };

  const calculatedTotalHpp = formData.details.reduce((sum, d) => sum + (Number(d.total) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_kategori_hpp.trim()) {
      toastError('Nama Kategori HPP wajib diisi!');
      return;
    }

    const payload = {
      ...formData,
      id: editingId || null,
      kode_perusahaan: activeCompany?.code || 'RSG',
      total_hpp: calculatedTotalHpp
    };

    try {
      const res = await fetch('/api/marketplace/hpp-produk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadHPP();
        toastSuccess(editingId ? 'Master HPP berhasil diperbarui!' : 'Master HPP baru berhasil disimpan!');
        setIsModalOpen(false);
        return;
      }
    } catch (e) {
      console.warn('Gagal simpan ke server:', e);
    }
    toastError('Gagal menyimpan master HPP ke server');
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calculator size={17} color="#0284c7" />
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Data Master HPP Produk
              </h2>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
              Daftar tarif pokok produksi (Jasa Potong, Jahit, Kancing, Finishing, dll) untuk di-join ke SKU produk
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={loadHPP}
              disabled={isLoading}
              style={{
                height: '28px',
                padding: '0 10px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '11px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <RotateCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Muat Ulang</span>
            </button>

            <button
              onClick={handleOpenAdd}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(2, 132, 199, 0.4)'
              }}
            >
              <Plus size={14} />
              <span>Tambah Kategori HPP</span>
            </button>
          </div>
        </div>

        {/* FILTER & SEARCH */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '10px',
          backgroundColor: '#f8fafc',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari ID / Nama Kategori HPP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: '28px',
                paddingLeft: '26px',
                paddingRight: '8px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1' }}>
            Total: {filteredList.length} Kategori HPP Terdaftar
          </div>
        </div>

        {/* DATA TABLE */}
        <div style={{
          overflowX: 'auto',
          border: '1px solid #cbd5e1',
          borderRadius: '6px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11.5px',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f1f5f9',
                borderBottom: '1px solid #cbd5e1',
                color: '#334155'
              }}>
                <th style={{ padding: '8px 10px', width: '30px' }}></th>
                <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center', fontWeight: '800' }}>NO</th>
                <th style={{ padding: '8px 10px', width: '180px', fontWeight: '800' }}>ID KATEGORI HPP</th>
                <th style={{ padding: '8px 10px', fontWeight: '800' }}>NAMA KATEGORI HPP</th>
                <th style={{ padding: '8px 10px', fontWeight: '800' }}>KETERANGAN</th>
                <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right', fontWeight: '800' }}>TOTAL HPP</th>
                <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center', fontWeight: '800' }}>STATUS</th>
                <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center', fontWeight: '800' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada master HPP produk ditemukan.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isExpanded = expandedId === (item.id || idx);
                  const detailList = item.details || [];
                  return (
                    <React.Fragment key={item.id || idx}>
                      <tr
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: isExpanded ? '#f0f9ff' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')
                        }}
                      >
                        <td style={{ padding: '7px 6px', textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleExpand(item.id || idx)}>
                          {detailList.length > 0 && (
                            isExpanded ? <ChevronDown size={14} color="#0284c7" /> : <ChevronRight size={14} color="#64748b" />
                          )}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>
                          {(currentPage - 1) * entriesPerPage + idx + 1}
                        </td>
                        <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: '800', color: '#0284c7' }}>
                          {item.id_kategori_hpp}
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: '800', color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{item.nama_kategori_hpp}</span>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                              ({detailList.length} jasa)
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '11px' }}>
                          {item.keterangan || <span style={{ color: '#cbd5e1' }}>-</span>}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '12px' }}>
                          Rp{Number(item.total_hpp || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0'
                          }}>
                            {item.status || 'Aktif'}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Kategori & Detail HPP"
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #38bdf8',
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
                              onClick={() => handleDelete(item)}
                              title="Hapus Kategori HPP"
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

                      {/* SUB-TABLE RINCIAN DETAIL (detail_master_hpp_produk) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: '8px 16px 12px 40px', backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                            <div style={{
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                padding: '6px 12px',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <span>Rincian Jasa & Komponen Biaya: {item.nama_kategori_hpp}</span>
                                <span>{detailList.length} Komponen</span>
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                    <th style={{ padding: '5px 10px', textAlign: 'center', width: '30px' }}>#</th>
                                    <th style={{ padding: '5px 10px', fontWeight: '800' }}>NAMA JASA / KOMPONEN</th>
                                    <th style={{ padding: '5px 10px', width: '80px', textAlign: 'center', fontWeight: '800' }}>JUMLAH</th>
                                    <th style={{ padding: '5px 10px', width: '110px', textAlign: 'right', fontWeight: '800' }}>HARGA</th>
                                    <th style={{ padding: '5px 10px', width: '120px', textAlign: 'right', fontWeight: '800' }}>TOTAL</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailList.map((d, dIdx) => (
                                    <tr key={d.id || dIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '5px 10px', textAlign: 'center', color: '#94a3b8' }}>{dIdx + 1}</td>
                                      <td style={{ padding: '5px 10px', fontWeight: '700', color: '#1e293b' }}>{d.nama_jasa}</td>
                                      <td style={{ padding: '5px 10px', textAlign: 'center', color: '#334155' }}>{d.jumlah}</td>
                                      <td style={{ padding: '5px 10px', textAlign: 'right', color: '#475569' }}>
                                        Rp{Number(d.harga || 0).toLocaleString('id-ID')}
                                      </td>
                                      <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: '800', color: '#0369a1' }}>
                                        Rp{Number(d.total || 0).toLocaleString('id-ID')}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr style={{ backgroundColor: '#f0fdf4', fontWeight: '800' }}>
                                    <td colSpan={4} style={{ padding: '6px 10px', textAlign: 'right', color: '#166534' }}>
                                      TOTAL HPP PRODUK:
                                    </td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', color: '#166534', fontSize: '11.5px' }}>
                                      Rp{Number(item.total_hpp || 0).toLocaleString('id-ID')}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGING FOOTER */}
        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '11.5px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <strong>{totalCount === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> sampai <strong>{Math.min(currentPage * entriesPerPage, totalCount)}</strong> dari <strong>{totalCount}</strong> kategori HPP
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                padding: '4px 12px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                color: currentPage <= 1 ? '#94a3b8' : '#334155',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '11.5px',
                fontWeight: '700',
                transition: 'all 0.15s ease'
              }}
            >
              Sebelumnya
            </button>
            <span style={{ padding: '0 8px', fontWeight: '800', color: '#0f172a', fontSize: '12px' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '4px 12px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#334155',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '11.5px',
                fontWeight: '700',
                transition: 'all 0.15s ease'
              }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* MODAL INPUT / EDIT MASTER & DETAIL HPP */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              backgroundColor: '#0284c7',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '13px' }}>
                <Calculator size={16} />
                <span>{editingId ? 'Edit Master & Detail HPP Produk' : 'Tambah Kategori & Detail HPP Baru'}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Scrollable */}
            <form onSubmit={handleSubmit} style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {/* Header Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    ID Kategori HPP *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.id_kategori_hpp}
                    onChange={(e) => setFormData({ ...formData, id_kategori_hpp: e.target.value })}
                    placeholder="Contoh: HPP-KEM-LP-TK"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '32px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      fontWeight: '700'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Nama Kategori HPP *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama_kategori_hpp}
                    onChange={(e) => setFormData({ ...formData, nama_kategori_hpp: e.target.value })}
                    placeholder="Contoh: Kemeja Lengan Panjang (TK)"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '32px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '11.5px',
                      fontWeight: '700'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  Keterangan
                </label>
                <input
                  type="text"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Catatan atau spesifikasi bahan (opsional)..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '32px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    padding: '0 8px',
                    fontSize: '11.5px'
                  }}
                />
              </div>

              {/* DETAIL JASA & KOMPONEN BIAYA */}
              <div style={{
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '10px',
                backgroundColor: '#f8fafc',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Coins size={14} color="#0284c7" />
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                      Rincian Jasa & Komponen (detail_master_hpp_produk)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDetailRow}
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      borderRadius: '4px',
                      border: '1px solid #0284c7',
                      backgroundColor: '#f0f9ff',
                      color: '#0284c7',
                      fontSize: '11px',
                      fontWeight: '800',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={12} />
                    <span>Tambah Jasa/Biaya</span>
                  </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: '800' }}>NAMA JASA / BIAYA</th>
                      <th style={{ padding: '4px 6px', width: '70px', textAlign: 'center', fontWeight: '800' }}>JUMLAH</th>
                      <th style={{ padding: '4px 6px', width: '110px', textAlign: 'right', fontWeight: '800' }}>HARGA (RP)</th>
                      <th style={{ padding: '4px 6px', width: '120px', textAlign: 'right', fontWeight: '800' }}>TOTAL (RP)</th>
                      <th style={{ padding: '4px 6px', width: '30px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.details.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Jasa Jahit / Kancing"
                            value={row.nama_jasa}
                            onChange={(e) => handleDetailChange(idx, 'nama_jasa', e.target.value)}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              padding: '0 6px',
                              fontSize: '11px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            value={row.jumlah === '' ? '' : formatNumberId(row.jumlah)}
                            onChange={(e) => handleDetailChange(idx, 'jumlah', e.target.value)}
                            placeholder="1"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              padding: '0 6px',
                              fontSize: '11px',
                              textAlign: 'center',
                              fontWeight: '600'
                            }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="text"
                            value={row.harga === '' ? '' : formatNumberId(row.harga)}
                            onChange={(e) => handleDetailChange(idx, 'harga', e.target.value)}
                            placeholder="0"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              padding: '0 6px',
                              fontSize: '11px',
                              textAlign: 'right',
                              fontWeight: '600'
                            }}
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'right', fontWeight: '800', color: '#0369a1' }}>
                          Rp{Number(row.total || 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveDetailRow(idx)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '2px'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#ecfdf5', fontWeight: '800' }}>
                      <td colSpan={3} style={{ padding: '8px 6px', textAlign: 'right', color: '#166534', fontSize: '11.5px' }}>
                        TOTAL ESTIMASI HPP:
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', color: '#166534', fontSize: '12px' }}>
                        Rp{calculatedTotalHpp.toLocaleString('id-ID')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '5px',
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
                    height: '32px',
                    padding: '0 16px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  <Save size={13} />
                  <span>Simpan ke Database</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
