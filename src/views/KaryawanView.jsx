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
  CreditCard, 
  UserCheck, 
  Filter,
  CheckCircle2
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../utils/alert.util';
import { INITIAL_KARYAWAN_DATA } from '../data/initialKaryawan';

export const KARYAWAN_STORAGE_KEY = 'ruangmarket_karyawan_v1';

export default function KaryawanView() {
  const [karyawanList, setKaryawanList] = useState(() => {
    try {
      const saved = localStorage.getItem(KARYAWAN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    try {
      localStorage.setItem(KARYAWAN_STORAGE_KEY, JSON.stringify(INITIAL_KARYAWAN_DATA));
    } catch (e) {}
    return INITIAL_KARYAWAN_DATA;
  });

  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialForm = {
    id_karyawan: '',
    nama: '',
    tipe: 'Penjahit',
    bagian: 'Penjahit Gamis',
    no_hp: '',
    alamat: '',
    rekening: '',
    status: 'Aktif'
  };
  const [formData, setFormData] = useState(initialForm);

  // Sync to local storage & trigger events
  useEffect(() => {
    try {
      localStorage.setItem(KARYAWAN_STORAGE_KEY, JSON.stringify(karyawanList));
      window.dispatchEvent(new Event('karyawan_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }, [karyawanList]);

  const filteredList = karyawanList.filter(item => {
    if (filterTipe !== 'Semua' && item.tipe !== filterTipe) return false;
    if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.id_karyawan.toLowerCase().includes(q) ||
        item.nama.toLowerCase().includes(q) ||
        (item.bagian || '').toLowerCase().includes(q) ||
        (item.no_hp || '').toLowerCase().includes(q) ||
        (item.alamat || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    const nextNum = karyawanList.length > 0 ? Math.max(...karyawanList.map(k => k.id)) + 1 : 1;
    setFormData({
      ...initialForm,
      id_karyawan: `KRY-${String(nextNum).padStart(3, '0')}`
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      'Hapus Data Karyawan/Penjahit?',
      `Yakin ingin menghapus "${item.nama}" (${item.id_karyawan})? Data tidak dapat dikembalikan.`,
      'Ya, Hapus',
      'Batal'
    );
    if (confirmed) {
      setKaryawanList(prev => prev.filter(k => k.id !== item.id));
      toastSuccess('Data karyawan berhasil dihapus');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      toastError('Nama karyawan/penjahit/makloon wajib diisi!');
      return;
    }

    if (editingId) {
      setKaryawanList(prev => prev.map(k => k.id === editingId ? { ...formData, id: editingId } : k));
      toastSuccess('Data karyawan berhasil diperbarui');
    } else {
      const nextId = karyawanList.length > 0 ? Math.max(...karyawanList.map(k => k.id)) + 1 : 1;
      setKaryawanList(prev => [
        { ...formData, id: nextId },
        ...prev
      ]);
      toastSuccess('Karyawan/penjahit baru berhasil ditambahkan');
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
        
        {/* HEADER SECTION (BLUE GRADIENT) */}
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
              <Users size={16} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '14px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Data Karyawan
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
                Kelola master tim internal, penjahit spesialis, mitra makloon konveksi, dan rekening bayar
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
              <span>Tambah Karyawan</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '8px' }} />
            <input
              type="text"
              placeholder="Cari ID, nama penjahit/karyawan, bagian, no. HP, alamat..."
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
            value={filterTipe}
            onChange={(e) => setFilterTipe(e.target.value)}
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
            <option value="Semua">Semua Tipe</option>
            <option value="Penjahit">Penjahit</option>
            <option value="Karyawan Tetap">Karyawan Tetap</option>
            <option value="Karyawan Lepas">Karyawan Lepas</option>
            <option value="Makloon">Makloon</option>
          </select>

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
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>

          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginLeft: 'auto' }}>
            Total: <b>{filteredList.length}</b> Data
          </div>
        </div>

        {/* DATA TABLE (8 KOLOM SESUAI REQUEST) */}
        <div style={{
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          overflowX: 'auto',
          backgroundColor: '#ffffff'
        }}>
          <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '40px', textAlign: 'center' }}>NO</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '90px' }}>ID KARYAWAN</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155' }}>NAMA PENJAHIT / KARYAWAN / MAKLOON</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '100px' }}>TIPE</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '130px' }}>BAGIAN</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '110px' }}>NO. HP</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155' }}>ALAMAT</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '180px' }}>REKENING / METODE BAYAR</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '80px', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '8px 10px', fontWeight: '800', color: '#334155', width: '70px', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length > 0 ? (
                filteredList.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: '600', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontWeight: '800', color: '#0284c7', fontFamily: 'monospace' }}>
                        {item.id_karyawan}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.nama}</div>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: item.tipe === 'Makloon' ? '#fdf4ff' : '#f0f9ff',
                        color: item.tipe === 'Makloon' ? '#a21caf' : '#0284c7',
                        border: item.tipe === 'Makloon' ? '1px solid #f0abfc' : '1px solid #bae6fd'
                      }}>
                        {item.tipe}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155', fontWeight: '600' }}>
                      {item.bagian || '-'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={11} color="#64748b" />
                        <span>{item.no_hp || '-'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.alamat || '-'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CreditCard size={11} color="#059669" style={{ flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', fontSize: '11px' }}>{item.rekening || '-'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        backgroundColor: item.status === 'Aktif' ? '#ecfdf5' : '#f1f5f9',
                        color: item.status === 'Aktif' ? '#059669' : '#64748b',
                        border: item.status === 'Aktif' ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                      }}>
                        {item.status || 'Aktif'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Karyawan"
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
                          title="Hapus Karyawan"
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
                  <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Tidak ada data karyawan/penjahit ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL FORM TAMBAH / EDIT KARYAWAN */}
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
            maxWidth: '520px',
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
                <Users size={15} color="#38bdf8" />
                <span style={{ fontSize: '13px', fontWeight: '800' }}>
                  {editingId ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
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
              
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    ID Karyawan <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.id_karyawan}
                    onChange={(e) => setFormData({ ...formData, id_karyawan: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '6px 9px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      color: '#0284c7',
                      backgroundColor: '#f8fafc'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Nama Penjahit / Karyawan / Makloon <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mas Deni / Workshop B"
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Tipe Karyawan
                  </label>
                  <select
                    value={formData.tipe}
                    onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
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
                    <option value="Penjahit">Penjahit</option>
                    <option value="Karyawan Tetap">Karyawan Tetap</option>
                    <option value="Karyawan Lepas">Karyawan Lepas</option>
                    <option value="Makloon">Makloon (Mitra Konveksi)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Bagian / Keahlian
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Jahit Gamis / Cutting / QC"
                    value={formData.bagian}
                    onChange={(e) => setFormData({ ...formData, bagian: e.target.value })}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    No. Handphone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={formData.no_hp}
                    onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
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
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Alamat Lengkap / Lokasi Workshop
                </label>
                <textarea
                  rows={2}
                  placeholder="Alamat penjahit / konveksi..."
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Rekening Bank / Metode Pembayaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BCA 123456789 a/n Budi / Tunai"
                  value={formData.rekening}
                  onChange={(e) => setFormData({ ...formData, rekening: e.target.value })}
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
                  <span>Simpan Karyawan</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
