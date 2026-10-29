import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  CheckCircle2, 
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { INITIAL_KATEGORI_DATA } from '../../data/initialKategori';

export const KATEGORI_STORAGE_KEY = 'ruangmarket_kategori_v1';

export default function KategoriView() {
  const [kategoriList, setKategoriList] = useState(() => {
    try {
      const saved = localStorage.getItem(KATEGORI_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    try {
      localStorage.setItem(KATEGORI_STORAGE_KEY, JSON.stringify(INITIAL_KATEGORI_DATA));
    } catch (e) {}
    return INITIAL_KATEGORI_DATA;
  });

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nama: '',
    deskripsi: '',
    status: 'Aktif'
  });

  // Fetch data dari database MySQL on mount
  const fetchKategoriFromApi = async () => {
    try {
      const res = await fetch('/api/marketplace/kategori');
      const json = await res.json();
      if (res.ok && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        setKategoriList(json.data);
      }
    } catch (e) {
      console.error('Gagal fetch kategori dari API:', e);
    }
  };

  useEffect(() => {
    fetchKategoriFromApi();
  }, []);

  // Sync state to local storage & trigger window event so ProdukView can update
  useEffect(() => {
    try {
      localStorage.setItem(KATEGORI_STORAGE_KEY, JSON.stringify(kategoriList));
      window.dispatchEvent(new Event('kategori_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }, [kategoriList]);

  const filteredKategori = kategoriList.filter(k => 
    (k.nama || '').toLowerCase().includes(search.toLowerCase()) ||
    (k.deskripsi || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ nama: '', deskripsi: '', status: 'Aktif' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormData({ nama: item.nama, deskripsi: item.deskripsi || '', status: item.status || 'Aktif' });
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      'Hapus Kategori?',
      `Yakin ingin menghapus kategori "${item.nama}"? Data produk yang menggunakan kategori ini mungkin terpengaruh.`,
      'Ya, Hapus',
      'Batal'
    );
    if (confirmed) {
      try {
        await fetch(`/api/marketplace/kategori/${item.id}`, { method: 'DELETE' });
      } catch (err) {}
      setKategoriList(prev => prev.filter(k => k.id !== item.id));
      toastSuccess('Kategori berhasil dihapus');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanNama = formData.nama.trim();
    if (!cleanNama) {
      toastError('Nama kategori wajib diisi!');
      return;
    }

    // Duplicate check
    const isDup = kategoriList.some(k => 
      (k.nama || '').toLowerCase() === cleanNama.toLowerCase() && k.id !== editingId
    );
    if (isDup) {
      toastError('Nama kategori sudah ada!');
      return;
    }

    if (editingId) {
      try {
        await fetch(`/api/marketplace/kategori/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama: cleanNama, deskripsi: formData.deskripsi, status: formData.status })
        });
      } catch (err) {}
      setKategoriList(prev => prev.map(k => k.id === editingId ? { ...formData, id: editingId, nama: cleanNama } : k));
      toastSuccess('Kategori berhasil diperbarui');
    } else {
      let createdId = Date.now();
      try {
        const res = await fetch('/api/marketplace/kategori', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama: cleanNama, deskripsi: formData.deskripsi, status: formData.status })
        });
        const json = await res.json();
        if (json?.id) createdId = json.id;
      } catch (err) {}
      setKategoriList(prev => [...prev, { ...formData, id: createdId, nama: cleanNama }]);
      toastSuccess('Kategori baru berhasil ditambahkan');
    }
    setIsModalOpen(false);
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
        
        {/* HEADER SECTION (DARK SLATE BLUE) */}
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
              <Tag size={16} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '14px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Kategori Produk
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
                Kelola daftar kelompok dan klasifikasi katalog produk toko
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
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
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              <Plus size={14} />
              <span>Tambah Kategori</span>
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '8px' }} />
            <input
              type="text"
              placeholder="Cari kategori produk..."
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
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
            Total: <b>{filteredKategori.length}</b> Kategori
          </div>
        </div>

        {/* DATA TABLE */}
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
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155' }}>NAMA KATEGORI</th>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155' }}>DESKRIPSI</th>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155', width: '100px' }}>STATUS</th>
                <th style={{ padding: '8px 12px', fontWeight: '800', color: '#334155', width: '90px', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredKategori.length > 0 ? (
                filteredKategori.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: '600' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={13} color="#0284c7" />
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{item.nama}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>
                      {item.deskripsi || '-'}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: item.status === 'Aktif' ? '#ecfdf5' : '#f1f5f9',
                        color: item.status === 'Aktif' ? '#059669' : '#64748b',
                        border: item.status === 'Aktif' ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                      }}>
                        {item.status || 'Aktif'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Kategori"
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
                          onClick={() => handleDelete(item)}
                          title="Hapus Kategori"
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
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Tidak ada kategori ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL FORM TAMBAH / EDIT KATEGORI */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '10px 14px',
              background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={15} color="#38bdf8" />
                <span style={{ fontSize: '13px', fontWeight: '800' }}>
                  {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Nama Kategori <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gamis Syari / Abaya"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 9px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    color: '#0f172a'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat kategori..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 9px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    color: '#0f172a',
                    resize: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 9px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    color: '#0f172a',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    height: '28px',
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
                    height: '28px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0 14px',
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
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
