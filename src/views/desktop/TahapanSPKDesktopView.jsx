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
  ArrowUp,
  ArrowDown,
  CheckCircle2
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

export const TAHAPAN_STORAGE_KEY = 'ruangmarket_tahapan_spk_master';

export const INITIAL_TAHAPAN_DATA = [
  { id: 1, kode_tahapan: 'THP-01', nama_tahapan: 'Perencanaan', emoji: '📋', warna: 'info', urutan: 1, status: 'Aktif', keterangan: 'Pesanan baru / perencanaan jadwal produksi' },
  { id: 2, kode_tahapan: 'THP-02', nama_tahapan: 'Antrian & Sampling', emoji: '⏳', warna: 'primary', urutan: 2, status: 'Aktif', keterangan: 'Menunggu antrian pengerjaan sampel' },
  { id: 3, kode_tahapan: 'THP-03', nama_tahapan: 'Tahap Sampling', emoji: '🧪', warna: 'purple', urutan: 3, status: 'Aktif', keterangan: 'Pembuatan sampel produk' },
  { id: 4, kode_tahapan: 'THP-04', nama_tahapan: 'Tahap Print Kain', emoji: '🖨️', warna: 'info', urutan: 4, status: 'Aktif', keterangan: 'Proses sublim / cetak motif kain' },
  { id: 5, kode_tahapan: 'THP-05', nama_tahapan: 'Tahap Pemotongan', emoji: '✂️', warna: 'warning', urutan: 5, status: 'Aktif', keterangan: 'Pemotongan pola kain' },
  { id: 6, kode_tahapan: 'THP-06', nama_tahapan: 'Tahap Jahit', emoji: '🪡', warna: 'purple', urutan: 6, status: 'Aktif', keterangan: 'Proses penjahitan potongan kain' },
  { id: 7, kode_tahapan: 'THP-07', nama_tahapan: 'Tahap LKPK', emoji: '🧮', warna: 'success', urutan: 7, status: 'Aktif', keterangan: 'Pengecekan lembar kerja & kelengkapan' },
  { id: 8, kode_tahapan: 'THP-08', nama_tahapan: 'Quality Control', emoji: '🔍', warna: 'success', urutan: 8, status: 'Aktif', keterangan: 'Pemeriksaan standar kualitas produk' },
  { id: 9, kode_tahapan: 'THP-09', nama_tahapan: 'Packing / Finishing', emoji: '📦', warna: 'warning', urutan: 9, status: 'Aktif', keterangan: 'Setrika uap, hangtag & pengemasan' },
  { id: 10, kode_tahapan: 'THP-10', nama_tahapan: 'Selesai (Finished Good)', emoji: '✅', warna: 'success', urutan: 10, status: 'Aktif', keterangan: 'Produk selesai masuk ke gudang jadi' },
  { id: 11, kode_tahapan: 'THP-11', nama_tahapan: 'Batal', emoji: '❌', warna: 'danger', urutan: 11, status: 'Aktif', keterangan: 'SPK dibatalkan' }
];

export default function TahapanSPKDesktopView() {
  const [tahapanList, setTahapanList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    kode_tahapan: '',
    nama_tahapan: '',
    emoji: '📋',
    warna: 'info',
    urutan: 1,
    status: 'Aktif',
    keterangan: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const activeCompany = getActiveCompany();

  // Load tahapan SPK dari MySQL Database
  const loadTahapan = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/marketplace/tahapan-spk?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          if (json.data.length === 0) {
            for (const initItem of INITIAL_TAHAPAN_DATA) {
              await fetch('/api/marketplace/tahapan-spk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...initItem, kode_perusahaan: activeCompany?.code || 'RSG' })
              });
            }
            const refetch = await fetch(`/api/marketplace/tahapan-spk?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
            if (refetch.ok) {
              const refetchJson = await refetch.json();
              setTahapanList(refetchJson.data || []);
              setIsLoading(false);
              return;
            }
          }
          setTahapanList(json.data);
          try {
            localStorage.setItem(TAHAPAN_STORAGE_KEY, JSON.stringify(json.data));
          } catch (e) {}
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Gagal load tahapan dari server, fallback localStorage:', e);
    }

    try {
      const saved = localStorage.getItem(TAHAPAN_STORAGE_KEY);
      if (saved) {
        setTahapanList(JSON.parse(saved) || INITIAL_TAHAPAN_DATA);
      } else {
        setTahapanList(INITIAL_TAHAPAN_DATA);
      }
    } catch (e) {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadTahapan();
  }, []);

  const filteredList = tahapanList.filter(item => {
    if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (item.kode_tahapan || '').toLowerCase().includes(q) ||
        (item.nama_tahapan || '').toLowerCase().includes(q) ||
        (item.keterangan || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    const nextNum = tahapanList.length + 1;
    const autoKode = `THP-${String(nextNum).padStart(2, '0')}`;
    setFormData({
      ...initialForm,
      kode_tahapan: autoKode,
      urutan: nextNum
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({
      kode_tahapan: item.kode_tahapan || '',
      nama_tahapan: item.nama_tahapan || '',
      emoji: item.emoji || '📋',
      warna: item.warna || 'info',
      urutan: item.urutan || 1,
      status: item.status || 'Aktif',
      keterangan: item.keterangan || ''
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    const ok = await showConfirm(
      'Hapus Tahapan SPK?',
      `Yakin ingin menghapus tahapan "${item.emoji} ${item.nama_tahapan}" (${item.kode_tahapan}) dari database?`,
      'Ya, Hapus',
      'Batal'
    );
    if (!ok) return;

    try {
      await fetch(`/api/marketplace/tahapan-spk?id=${item.id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Gagal delete tahapan dari server:', e);
    }

    setTahapanList(prev => prev.filter(p => p.id !== item.id));
    toastSuccess('Tahapan SPK berhasil dihapus dari database!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_tahapan.trim()) {
      toastError('Nama Tahapan wajib diisi!');
      return;
    }

    const payload = {
      ...formData,
      id: editingId || null,
      kode_perusahaan: activeCompany?.code || 'RSG'
    };

    try {
      const res = await fetch('/api/marketplace/tahapan-spk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadTahapan();
        toastSuccess(editingId ? 'Tahapan SPK berhasil diperbarui di database!' : 'Tahapan SPK baru berhasil disimpan!');
        setIsModalOpen(false);
        return;
      }
    } catch (e) {
      console.warn('Gagal simpan ke database, fallback offline:', e);
    }

    if (editingId) {
      setTahapanList(prev => prev.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
      toastSuccess('Tahapan SPK berhasil diperbarui (offline)');
    } else {
      const newId = Date.now();
      setTahapanList(prev => [...prev, { ...formData, id: newId }]);
      toastSuccess('Tahapan SPK baru ditambahkan (offline)');
    }
    setIsModalOpen(false);
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
              <Layers size={17} color="#0284c7" />
              <h2 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Data Master Tahapan SPK
              </h2>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
              Kelola alur tahapan kerja SPK produksi (custom alur, emoji, dan urutan pengerjaan)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={loadTahapan}
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
              <span>Tambah Tahapan Baru</span>
            </button>
          </div>
        </div>

        {/* FILTER & SEARCH */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '10px',
          backgroundColor: '#f8fafc',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari tahapan SPK..."
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

          {/* Filter Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                height: '28px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                padding: '0 8px',
                fontSize: '11px',
                fontWeight: '700',
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '800', color: '#0369a1' }}>
            Total: {filteredList.length} Tahapan
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
                <th style={{ padding: '8px 10px', width: '45px', textAlign: 'center', fontWeight: '800' }}>URUT</th>
                <th style={{ padding: '8px 10px', width: '110px', fontWeight: '800' }}>KODE</th>
                <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center', fontWeight: '800' }}>EMOJI</th>
                <th style={{ padding: '8px 10px', fontWeight: '800' }}>NAMA TAHAPAN SPK</th>
                <th style={{ padding: '8px 10px', fontWeight: '800' }}>KETERANGAN / DESKRIPSI</th>
                <th style={{ padding: '8px 10px', width: '85px', textAlign: 'center', fontWeight: '800' }}>STATUS</th>
                <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center', fontWeight: '800' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data tahapan SPK ditemukan.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isAktif = item.status === 'Aktif';
                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                      }}
                    >
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '800', color: '#0369a1' }}>
                        {item.urutan || idx + 1}
                      </td>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: '700', color: '#0284c7' }}>
                        {item.kode_tahapan}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: '15px' }}>
                        {item.emoji || '📋'}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: '800', color: '#0f172a' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span>{item.nama_tahapan}</span>
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '11px' }}>
                        {item.keterangan || <span style={{ color: '#cbd5e1' }}>-</span>}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '800',
                          backgroundColor: isAktif ? '#ecfdf5' : '#fef2f2',
                          color: isAktif ? '#059669' : '#dc2626',
                          border: `1px solid ${isAktif ? '#a7f3d0' : '#fecaca'}`
                        }}>
                          {item.status || 'Aktif'}
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Tahapan"
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
                            title="Hapus Tahapan"
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
      </div>

      {/* MODAL INPUT / EDIT TAHAPAN */}
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
            maxWidth: '480px',
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
                <Layers size={16} />
                <span>{editingId ? 'Edit Data Master Tahapan SPK' : 'Tambah Tahapan SPK Baru'}</span>
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

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Kode Tahapan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.kode_tahapan}
                    onChange={(e) => setFormData({ ...formData, kode_tahapan: e.target.value })}
                    placeholder="Contoh: THP-01"
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
                    Nomor Urutan *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.urutan}
                    onChange={(e) => setFormData({ ...formData, urutan: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Emoji / Icon
                  </label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                    placeholder="📋"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '32px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '15px',
                      textAlign: 'center'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Nama Tahapan SPK *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama_tahapan}
                    onChange={(e) => setFormData({ ...formData, nama_tahapan: e.target.value })}
                    placeholder="Contoh: Tahap Print Kain / Quality Control"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Warna Badge
                  </label>
                  <select
                    value={formData.warna}
                    onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '32px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="info">Biru Muda (info)</option>
                    <option value="primary">Biru (primary)</option>
                    <option value="purple">Ungu (purple)</option>
                    <option value="warning">Kuning/Oranye (warning)</option>
                    <option value="success">Hijau (success)</option>
                    <option value="danger">Merah (danger)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Status Tahapan
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '32px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      padding: '0 8px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  Keterangan / Deskripsi Tahapan
                </label>
                <textarea
                  rows={2}
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Deskripsi singkat proses pengerjaan tahapan ini..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    padding: '8px',
                    fontSize: '11.5px',
                    resize: 'vertical'
                  }}
                />
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
