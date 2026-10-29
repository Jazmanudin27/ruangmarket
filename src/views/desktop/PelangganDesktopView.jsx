import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  Phone, 
  MapPin, 
  UserCheck, 
  Filter,
  CheckCircle2,
  RefreshCw,
  Building,
  Tag
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

export const PELANGGAN_STORAGE_KEY = 'ruangmarket_pelanggan_master';

export const INITIAL_PELANGGAN_DATA = [
  {
    id: 1,
    kode_perusahaan: 'RSG',
    kode_pelanggan: 'PLG-2026-001',
    nama_pelanggan: 'Salmah Khairani Nasution',
    alamat: 'Jl. Merdeka No. 45, Medan',
    no_hp: '+62 852-1858-3688',
    status: 'Aktif',
    kategori_pelanggan: 'Umum'
  },
  {
    id: 2,
    kode_perusahaan: 'RSG',
    kode_pelanggan: 'PLG-2026-002',
    nama_pelanggan: 'Distributor Utama Jakarta (Pelanggan ABC)',
    alamat: 'Kawasan Pergudangan Pluit Blok C No. 12, Jakarta Utara',
    no_hp: '+62 812-3456-7890',
    status: 'Aktif',
    kategori_pelanggan: 'Dropship'
  },
  {
    id: 3,
    kode_perusahaan: 'RSG',
    kode_pelanggan: 'PLG-2026-003',
    nama_pelanggan: 'Pesantren Al-Hikmah Bandung',
    alamat: 'Jl. Pesantren No. 88, Cibiru, Bandung',
    no_hp: '+62 878-9988-1122',
    status: 'Aktif',
    kategori_pelanggan: 'Lainnya'
  }
];

export default function PelangganDesktopView() {
  const [pelangganList, setPelangganList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    kode_pelanggan: '',
    nama_pelanggan: '',
    alamat: '',
    no_hp: '',
    status: 'Aktif',
    kategori_pelanggan: 'Umum'
  };
  const [formData, setFormData] = useState(initialForm);

  const activeCompany = getActiveCompany();

  // Load pelanggan dari MySQL Database
  const loadPelanggan = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pelanggan?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          // Jika di database belum ada data sama sekali, seeded initial 3 data agar langsung bisa dites
          if (json.data.length === 0) {
            for (const initItem of INITIAL_PELANGGAN_DATA) {
              await fetch('/api/pelanggan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...initItem, kode_perusahaan: activeCompany?.code || 'RSG' })
              });
            }
            const refetch = await fetch(`/api/pelanggan?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
            if (refetch.ok) {
              const refetchJson = await refetch.json();
              setPelangganList(refetchJson.data || []);
              setIsLoading(false);
              return;
            }
          }
          setPelangganList(json.data);
          try {
            localStorage.setItem(PELANGGAN_STORAGE_KEY, JSON.stringify(json.data));
          } catch (e) {}
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Gagal load pelanggan dari database, cek local storage:', e);
    }
    // Fallback localStorage jika offline
    try {
      const saved = localStorage.getItem(PELANGGAN_STORAGE_KEY);
      if (saved) {
        setPelangganList(JSON.parse(saved) || INITIAL_PELANGGAN_DATA);
      } else {
        setPelangganList(INITIAL_PELANGGAN_DATA);
      }
    } catch (e) {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadPelanggan();
  }, []);

  const filteredList = pelangganList.filter(item => {
    if (filterKategori !== 'Semua' && item.kategori_pelanggan !== filterKategori) return false;
    if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (item.kode_pelanggan || '').toLowerCase().includes(q) ||
        (item.nama_pelanggan || '').toLowerCase().includes(q) ||
        (item.no_hp || '').toLowerCase().includes(q) ||
        (item.alamat || '').toLowerCase().includes(q) ||
        (item.kategori_pelanggan || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    const nextNum = pelangganList.length + 1;
    const autoKode = `PLG-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
    setFormData({
      ...initialForm,
      kode_pelanggan: autoKode
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({
      kode_pelanggan: item.kode_pelanggan || '',
      nama_pelanggan: item.nama_pelanggan || '',
      alamat: item.alamat || '',
      no_hp: item.no_hp || '',
      status: item.status || 'Aktif',
      kategori_pelanggan: item.kategori_pelanggan || 'Reguler'
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    const ok = await showConfirm(
      'Hapus Pelanggan?',
      `Yakin ingin menghapus ${item.nama_pelanggan} (${item.kode_pelanggan}) dari database?`,
      'Ya, Hapus',
      'Batal'
    );
    if (!ok) return;

    try {
      await fetch(`/api/pelanggan?id=${item.id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Gagal delete pelanggan dari server:', e);
    }

    setPelangganList(prev => prev.filter(p => p.id !== item.id));
    toastSuccess('Data pelanggan berhasil dihapus dari database!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_pelanggan.trim()) {
      toastError('Nama Pelanggan wajib diisi!');
      return;
    }

    const payload = {
      ...formData,
      id: editingId || null,
      kode_perusahaan: activeCompany?.code || 'RSG'
    };

    try {
      const res = await fetch('/api/pelanggan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await loadPelanggan();
        toastSuccess(editingId ? 'Data pelanggan berhasil diperbarui di database!' : 'Pelanggan baru berhasil disimpan ke database!');
        setIsModalOpen(false);
        return;
      }
    } catch (e) {
      console.warn('Gagal simpan ke server, fallback ke local state:', e);
    }

    // Fallback local
    if (editingId) {
      setPelangganList(prev => prev.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
      toastSuccess('Pelanggan berhasil diperbarui (offline)');
    } else {
      const newId = Date.now();
      setPelangganList(prev => [{ ...formData, id: newId }, ...prev]);
      toastSuccess('Pelanggan baru berhasil ditambahkan (offline)');
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
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          padding: '8px 12px',
          borderRadius: '7px',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Users size={16} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '14px', fontWeight: '800', lineHeight: 1.2 }}>
                Data Master Pelanggan
              </h1>
              <div style={{ fontSize: '10.5px', color: '#e0f2fe', marginTop: '1px' }}>
                Kelola basis data pelanggan, toko mitra, distributor, dan instansi pemesan seragam (Tersimpan di MySQL)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={loadPelanggan}
              title="Muat ulang data dari database"
              style={{
                height: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 10px',
                borderRadius: '5px',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Muat Ulang</span>
            </button>

            <button
              onClick={handleOpenAdd}
              style={{
                height: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 12px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#0284c7',
                fontSize: '11.5px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.15)'
              }}
            >
              <Plus size={13} />
              <span>Tambah Pelanggan Baru</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          marginBottom: '10px',
          flexWrap: 'wrap'
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '5px',
            padding: '0 8px',
            height: '28px',
            flex: '1 1 200px'
          }}>
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Cari kode, nama pelanggan, no hp, alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '11.5px',
                width: '100%',
                color: '#0f172a'
              }}
            />
            {search && (
              <X size={12} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
            )}
          </div>

          {/* Filter Kategori */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Kategori:</span>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
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
              <option value="Semua">Semua Kategori</option>
              <option value="Dropship">Dropship</option>
              <option value="Umum">Umum</option>
              <option value="Lainnya">Lainnya</option>
            </select>
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
            Total: {filteredList.length} Pelanggan
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
                <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center', fontWeight: '800' }}>NO</th>
                <th style={{ padding: '8px 10px', width: '130px', fontWeight: '800' }}>KODE PELANGGAN</th>
                <th style={{ padding: '8px 10px', fontWeight: '800' }}>NAMA PELANGGAN</th>
                <th style={{ padding: '8px 10px', width: '150px', fontWeight: '800' }}>KATEGORI</th>
                <th style={{ padding: '8px 10px', width: '150px', fontWeight: '800' }}>NO. HP / KONTAK</th>
                <th style={{ padding: '8px 10px', fontWeight: '800' }}>ALAMAT LENGKAP</th>
                <th style={{ padding: '8px 10px', width: '90px', textAlign: 'center', fontWeight: '800' }}>STATUS</th>
                <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center', fontWeight: '800' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontWeight: '700', fontSize: '12px' }}>Belum ada data pelanggan</div>
                    <div style={{ fontSize: '11px' }}>Klik tombol "Tambah Pelanggan Baru" di kanan atas</div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isAktif = item.status === 'Aktif';
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        transition: 'background-color 0.1s'
                      }}
                    >
                      <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: '800', color: '#0284c7' }}>
                        {item.kode_pelanggan}
                      </td>
                      <td style={{ padding: '7px 10px', fontWeight: '800', color: '#0f172a' }}>
                        {item.nama_pelanggan}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '800',
                          backgroundColor: item.kategori_pelanggan === 'Dropship' ? '#eff6ff' : (item.kategori_pelanggan === 'Umum' ? '#f0fdf4' : '#f8fafc'),
                          color: item.kategori_pelanggan === 'Dropship' ? '#1d4ed8' : (item.kategori_pelanggan === 'Umum' ? '#15803d' : '#475569'),
                          border: `1px solid ${item.kategori_pelanggan === 'Dropship' ? '#bfdbfe' : (item.kategori_pelanggan === 'Umum' ? '#bbf7d0' : '#e2e8f0')}`
                        }}>
                          <Tag size={10} />
                          <span>{item.kategori_pelanggan || 'Umum'}</span>
                        </span>
                      </td>
                      <td style={{ padding: '7px 10px', color: '#334155', fontWeight: '600' }}>
                        {item.no_hp ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Phone size={11} color="#0284c7" />
                            <span>{item.no_hp}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '7px 10px', color: '#475569', fontSize: '11px', maxWidth: '280px' }}>
                        {item.alamat || <span style={{ color: '#94a3b8' }}>-</span>}
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
                            title="Edit Pelanggan"
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
                            title="Hapus Pelanggan"
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

      {/* MODAL INPUT / EDIT PELANGGAN */}
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
            maxWidth: '520px',
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
                <Users size={16} />
                <span>{editingId ? 'Edit Data Master Pelanggan' : 'Tambah Pelanggan Baru'}</span>
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
                    Kode Pelanggan *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.kode_pelanggan}
                    onChange={(e) => setFormData({ ...formData, kode_pelanggan: e.target.value })}
                    placeholder="Contoh: PLG-2026-001"
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
                    Kategori Pelanggan *
                  </label>
                  <select
                    value={formData.kategori_pelanggan}
                    onChange={(e) => setFormData({ ...formData, kategori_pelanggan: e.target.value })}
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
                    <option value="Umum">Umum</option>
                    <option value="Dropship">Dropship</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  Nama Pelanggan / Instansi / Toko *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_pelanggan}
                  onChange={(e) => setFormData({ ...formData, nama_pelanggan: e.target.value })}
                  placeholder="Contoh: Salmah Khairani Nasution / SMA Negeri 1 Jakarta"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                    placeholder="Contoh: +62 852-1858-3688"
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

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    Status Pelanggan
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
                  Alamat Lengkap
                </label>
                <textarea
                  rows={3}
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Contoh: Jl. Merdeka No. 45, RT 02/05, Medan Baru..."
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

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '6px 14px',
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
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 16px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer'
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
