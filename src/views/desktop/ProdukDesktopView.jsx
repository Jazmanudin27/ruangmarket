import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Boxes, 
  Plus, 
  RotateCw, 
  Search, 
  Eye, 
  Edit3, 
  Trash2, 
  Clock, 
  X, 
  Sparkles, 
  Save,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Tag,
  Printer,
  ShoppingBag,
  Store,
  Layers,
  ArrowUpDown,
  Filter,
  Barcode,
  DollarSign,
  ShieldAlert,
  ChevronDown,
  Check
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { INITIAL_PRODUK_DATA } from '../../data/initialProduk';
import { INITIAL_KATEGORI_DATA } from '../../data/initialKategori';
import { getActiveCompany, getActiveCompanyCode } from '../../utils/tenant.util';

const STORAGE_KEY = 'ruangmarket_produk_gamis_v4';
const KATEGORI_STORAGE_KEY = 'ruangmarket_kategori_v1';

// Searchable Select Component with integrated filter search and dropdown
function SearchableSelect({ label, value, onChange, options, placeholder = "Pilih opsi...", required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    const text = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedDisplay = () => {
    const found = options.find(opt => (typeof opt === 'string' ? opt === value : opt.value === value));
    if (!found) return placeholder;
    return typeof found === 'string' ? found : (found.label || found.value);
  };

  return (
    <div style={{ position: 'relative' }} ref={wrapperRef}>
      {label && (
        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          padding: '6px 9px',
          borderRadius: '5px',
          border: isOpen ? '1px solid #0284c7' : '1px solid #cbd5e1',
          fontSize: '11.5px',
          fontWeight: '600',
          color: value ? '#0f172a' : '#94a3b8',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          textAlign: 'left',
          boxShadow: isOpen ? '0 0 0 2px rgba(2, 132, 199, 0.15)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedDisplay()}
        </span>
        <ChevronDown size={12} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 10px 20px -3px rgba(0, 0, 0, 0.18)',
          zIndex: 3000,
          padding: '6px',
          maxHeight: '220px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search box inside dropdown */}
          <div style={{
            position: 'relative',
            marginBottom: '5px'
          }}>
            <Search size={12} color="#94a3b8" style={{ position: 'absolute', left: '7px', top: '7px' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Ketik untuk mencari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 7px 5px 24px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                fontSize: '11px',
                outline: 'none',
                backgroundColor: '#f8fafc'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', maxHeight: '160px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const optVal = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : (opt.label || opt.value);
                const isSelected = optVal === value;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '5px 7px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
                      color: isSelected ? '#0284c7' : '#1e293b',
                      fontSize: '11px',
                      fontWeight: isSelected ? '700' : '500',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{optLabel}</span>
                    {isSelected && <Check size={12} color="#0284c7" />}
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '8px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                Tidak ada opsi cocok
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProdukView() {
  const [produkList, setProdukList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data produk langsung dari MySQL
  const loadMasterProduk = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/produk/master');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map(p => ({
            id: p.id,
            company_code: p.kode_perusahaan || 'RSG',
            nama_produk: p.nama_produk,
            sku: p.kode_sku,
            barcode: `899${String(1000 + (p.id || 1))}`,
            kategori: p.kategori || 'Gamis Casual',
            tipe_set: 'Single',
            status_order: 'Ready Stok',
            varian: 'Standar',
            stok: Number(p.stok_fisik || 0),
            min_stok: 5,
            satuan: p.satuan || 'PCS',
            harga_beli: Number(p.harga_modal || 0),
            harga_jual: Number(p.harga_jual || 0),
            estimasi_kain: 'Kain Polos',
            panjang_kain_cm: 200,
            harga_kain_cm: 150
          }));
          setProdukList(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Gagal load produk dari database:', err.message);
    }

    // Fallback jika API offline: baca dari localStorage saja tanpa memaksa INITIAL_PRODUK_DATA
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProdukList(JSON.parse(saved));
      } else {
        setProdukList([]);
      }
    } catch (e) {
      setProdukList([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMasterProduk();
  }, []);

  const [activeCompany, setActiveCompany] = useState(getActiveCompany);

  // Listen to company change from topbar
  useEffect(() => {
    const handleCompanyChange = () => {
      setActiveCompany(getActiveCompany());
    };
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  const [activeFilterTab, setActiveFilterTab] = useState('semua');
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterTipeSet, setFilterTipeSet] = useState('Semua');
  const [filterStatusOrder, setFilterStatusOrder] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  // Modals state
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const initialForm = {
    nama_produk: '',
    sku: '',
    barcode: '',
    kategori: 'Gamis Syari',
    tipe_set: 'Single',
    status_order: 'Ready Stok',
    varian: 'Hitam Jetblack - Size L',
    stok: 20,
    min_stok: 5,
    satuan: 'PCS',
    harga_beli: 150000,
    harga_jual: 250000,
    estimasi_kain: 'Silk Jetblack Premium',
    panjang_kain_cm: 250,
    harga_kain_cm: 200
  };
  const [formData, setFormData] = useState(initialForm);

  // Dynamic Kategori List from Storage
  const [kategoriOptions, setKategoriOptions] = useState(() => {
    try {
      const saved = localStorage.getItem(KATEGORI_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(k => k.status !== 'Nonaktif').map(k => k.nama);
        }
      }
    } catch (e) {}
    return INITIAL_KATEGORI_DATA.map(k => k.nama);
  });

  useEffect(() => {
    const handleKategoriUpdate = () => {
      try {
        const saved = localStorage.getItem(KATEGORI_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setKategoriOptions(parsed.filter(k => k.status !== 'Nonaktif').map(k => k.nama));
          }
        }
      } catch (e) {}
    };

    window.addEventListener('kategori_updated', handleKategoriUpdate);
    window.addEventListener('storage', handleKategoriUpdate);
    return () => {
      window.removeEventListener('kategori_updated', handleKategoriUpdate);
      window.removeEventListener('storage', handleKategoriUpdate);
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(produkList));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }, [produkList]);

  // Summary counts
  // Filter produk milik perusahaan aktif (Multi-Tenant)
  const companyProdukList = produkList.filter(p => !p.company_code || p.company_code === activeCompany.code);

  const totalProduk = companyProdukList.length;
  const totalTersedia = companyProdukList.filter(p => p.stok > p.min_stok).length;
  const totalMenipis = companyProdukList.filter(p => p.stok > 0 && p.stok <= p.min_stok).length;
  const totalHabis = companyProdukList.filter(p => p.stok <= 0).length;

  // Filter logic
  const filteredList = companyProdukList.filter(p => {
    const isHabis = p.stok <= 0;
    const isMenipis = p.stok > 0 && p.stok <= p.min_stok;
    const isTersedia = p.stok > p.min_stok;

    if (activeFilterTab === 'tersedia' && !isTersedia) return false;
    if (activeFilterTab === 'menipis' && !isMenipis) return false;
    if (activeFilterTab === 'habis' && !isHabis) return false;

    if (filterKategori !== 'Semua' && p.kategori !== filterKategori) return false;
    if (filterTipeSet !== 'Semua' && (p.tipe_set || 'Single') !== filterTipeSet) return false;
    if (filterStatusOrder !== 'Semua' && (p.status_order || 'Ready Stok') !== filterStatusOrder) return false;
    if (filterStatus === 'Tersedia' && !isTersedia) return false;
    if (filterStatus === 'Menipis' && !isMenipis) return false;
    if (filterStatus === 'Habis' && !isHabis) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.nama_produk.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchBarcode = p.barcode.toLowerCase().includes(q);
      const matchVarian = (p.varian || '').toLowerCase().includes(q);
      const matchTipe = (p.tipe_set || '').toLowerCase().includes(q);
      const matchOrder = (p.status_order || '').toLowerCase().includes(q);
      return matchName || matchSku || matchBarcode || matchVarian || matchTipe || matchOrder;
    }

    return true;
  });

  const handleRefresh = () => {
    setSearch('');
    setActiveFilterTab('semua');
    setFilterKategori('Semua');
    setFilterTipeSet('Semua');
    setFilterStatusOrder('Semua');
    setFilterStatus('Semua');
    loadMasterProduk();
    toastSuccess('Data produk berhasil diperbarui dari database');
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    const nextId = produkList.length > 0 ? Math.max(...produkList.map(p => p.id)) + 1 : 1;
    const prefix = activeCompany.code || 'RSG';
    setFormData({
      ...initialForm,
      sku: `${prefix}-PRD-260${String(nextId).padStart(4, '0')}`,
      barcode: `899${String(1000 + nextId)}`
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      ...item,
      estimasi_kain: item.estimasi_kain || '',
      panjang_kain_cm: item.panjang_kain_cm !== undefined ? item.panjang_kain_cm : 200,
      harga_kain_cm: item.harga_kain_cm !== undefined ? item.harga_kain_cm : 150
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (item) => {
    setSelectedProduk(item);
    setIsDetailModalOpen(true);
  };

  const handleOpenBarcode = (item) => {
    setSelectedProduk(item || null);
    setIsBarcodeModalOpen(true);
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      'Hapus Produk?',
      `Yakin ingin menghapus "${item.nama_produk}" (${item.sku})? Data yang dihapus tidak bisa dikembalikan.`,
      'Ya, Hapus Produk',
      'Batal'
    );
    if (confirmed) {
      try {
        await fetch(`/api/produk/master/${item.id}`, { method: 'DELETE' });
      } catch (e) {}
      setProdukList(prev => prev.filter(p => p.id !== item.id));
      toastSuccess('Produk berhasil dihapus');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_produk.trim()) {
      toastError('Nama produk wajib diisi!');
      return;
    }

    if (editingId) {
      try {
        await fetch(`/api/produk/master/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama_produk: formData.nama_produk,
            kategori: formData.kategori,
            satuan: formData.satuan,
            harga_jual: formData.harga_jual,
            harga_modal: formData.harga_beli,
            stok_fisik: formData.stok,
            status: formData.status || 'Aktif',
            kode_sku: formData.sku
          })
        });
      } catch (err) {}
      setProdukList(prev => prev.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
      toastSuccess('Data produk berhasil diperbarui');
    } else {
      const newId = produkList.length > 0 ? Math.max(...produkList.map(p => p.id)) + 1 : 1;
      const newProduk = {
        ...formData,
        id: newId,
        company_code: activeCompany.code || 'RSG'
      };

      try {
        await fetch('/api/produk/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kode_perusahaan: newProduk.company_code,
            kode_sku: newProduk.sku,
            nama_produk: newProduk.nama_produk,
            kategori: newProduk.kategori,
            satuan: newProduk.satuan,
            harga_jual: newProduk.harga_jual,
            harga_modal: newProduk.harga_beli,
            stok_fisik: newProduk.stok,
            status: 'Aktif'
          })
        });
      } catch (err) {}

      setProdukList(prev => [newProduk, ...prev]);
      toastSuccess('Produk baru berhasil ditambahkan');
    }
    setIsFormModalOpen(false);
  };

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* MASTER CONTAINER CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
      }}>

        {/* HEADER TITLE & ACTION BUTTONS (BERWARNA BLUE GRADIENT) */}
        <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '8px',
        padding: '10px 16px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '6px',
        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.22)'
      }}>
        
        {/* Title and subtitle */}
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
            <Boxes size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Data Induk Produk & Varian Stok
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
              Kelola data produk, SKU/barcode, varian, kategori, status stok, dan cetak label barcode
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          
          <button
            onClick={() => handleOpenBarcode(null)}
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            <QrCode size={14} />
            <span>Cetak Barcode</span>
          </button>

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
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            <Plus size={14} />
            <span>Tambah</span>
          </button>

        </div>

      </div>

      {/* FILTER TABS (BERWARNA COLOR-CODED) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
        
        {/* Tab 1: Semua Produk (Biru) */}
        <button
          onClick={() => setActiveFilterTab('semua')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'semua' ? '1px solid #0284c7' : '1px solid #bfdbfe',
            backgroundColor: activeFilterTab === 'semua' ? '#0284c7' : '#eff6ff',
            color: activeFilterTab === 'semua' ? '#ffffff' : '#1d4ed8',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'semua' ? '0 1px 4px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <Layers size={13} />
          <span>Semua Produk ({totalProduk})</span>
        </button>

        {/* Tab 2: Produk Tersedia (Hijau) */}
        <button
          onClick={() => setActiveFilterTab('tersedia')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'tersedia' ? '1px solid #059669' : '1px solid #a7f3d0',
            backgroundColor: activeFilterTab === 'tersedia' ? '#059669' : '#ecfdf5',
            color: activeFilterTab === 'tersedia' ? '#ffffff' : '#047857',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'tersedia' ? '0 1px 4px rgba(5, 150, 105, 0.25)' : 'none'
          }}
        >
          <Store size={13} />
          <span>Produk Tersedia ({totalTersedia})</span>
        </button>

        {/* Tab 3: Stok Menipis (Oranye/Amber) */}
        <button
          onClick={() => setActiveFilterTab('menipis')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'menipis' ? '1px solid #d97706' : '1px solid #fde68a',
            backgroundColor: activeFilterTab === 'menipis' ? '#d97706' : '#fffbeb',
            color: activeFilterTab === 'menipis' ? '#ffffff' : '#b45309',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'menipis' ? '0 1px 4px rgba(217, 119, 6, 0.25)' : 'none'
          }}
        >
          <Clock size={13} />
          <span>Stok Menipis ({totalMenipis})</span>
        </button>

        {/* Tab 4: Stok Habis (Merah) */}
        <button
          onClick={() => setActiveFilterTab('habis')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'habis' ? '1px solid #ef4444' : '1px solid #fecaca',
            backgroundColor: activeFilterTab === 'habis' ? '#ef4444' : '#fef2f2',
            color: activeFilterTab === 'habis' ? '#ffffff' : '#b91c1c',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'habis' ? '0 1px 4px rgba(239, 68, 68, 0.25)' : 'none'
          }}
        >
          <AlertTriangle size={13} />
          <span>Stok Habis ({totalHabis})</span>
        </button>

      </div>

      {/* FILTER CONTROLS BAR (MEPET 5-6PX) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '8px 12px',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        
        {/* Search input with icon */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk, SKU, varian, tipe set, status order..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              outline: 'none',
              backgroundColor: '#f8fafc',
              transition: 'all 0.15s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#0284c7';
              e.target.style.backgroundColor = '#ffffff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.backgroundColor = '#f8fafc';
            }}
          />
        </div>

        {/* Select Kategori */}
        <select
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '125px'
          }}
        >
          <option value="Semua">Semua Kategori</option>
          {kategoriOptions.map((kat, idx) => (
            <option key={idx} value={kat}>{kat}</option>
          ))}
        </select>

        {/* Select Tipe: Satu Setel / Single */}
        <select
          value={filterTipeSet}
          onChange={(e) => setFilterTipeSet(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '115px'
          }}
        >
          <option value="Semua">Semua Tipe</option>
          <option value="Satu Setel">Satu Setel</option>
          <option value="Single">Single</option>
        </select>

        {/* Select Status Order: Ready Stok / PO */}
        <select
          value={filterStatusOrder}
          onChange={(e) => setFilterStatusOrder(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '120px'
          }}
        >
          <option value="Semua">Semua Order</option>
          <option value="Ready Stok">Ready Stok</option>
          <option value="PO">PO (Pre-Order)</option>
        </select>

        {/* Select Status Stok Fisik */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '115px'
          }}
        >
          <option value="Semua">Semua Stok</option>
          <option value="Tersedia">Tersedia</option>
          <option value="Menipis">Menipis</option>
          <option value="Habis">Habis</option>
        </select>

      </div>

      {/* DATA TABLE (MATCHING HEADER WIDTH & SIDE-TO-SIDE 16PX) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-bordered-hover" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <th style={{ padding: '5px 8px', textAlign: 'center', width: '45px', border: '1px solid #cbd5e1' }}>NO</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>NAMA PRODUK & SKU</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>KATEGORI & VARIAN</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>ESTIMASI KAIN (CM & HARGA)</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>JUMLAH STOK TERSEDIA</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>HARGA HPP</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>HARGA JUAL</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', width: '140px', border: '1px solid #cbd5e1' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                    <Package size={32} color="#cbd5e1" style={{ marginBottom: '6px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#334155' }}>Tidak ada produk ditemukan</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>Coba ubah kata kunci pencarian atau reset filter.</div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  return (
                    <tr 
                      key={item.id}
                      style={{
                        transition: 'background-color 0.15s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* NO */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                        {index + 1}
                      </td>

                      {/* NAMA PRODUK & SKU */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', lineHeight: 1.2 }}>
                          {item.nama_produk}
                        </div>
                        <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
                          SKU: {item.sku}
                        </div>
                      </td>

                      {/* KATEGORI & VARIAN (DISATUKAN) */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                        {/* Baris 1: Kategori + Tipe Set + Status Order */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '2px' }}>
                          {/* Kategori Badge */}
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: item.kategori === 'Gamis Syari' ? '#ecfdf5' : item.kategori === 'Gamis Casual' ? '#eff6ff' : item.kategori === 'Gamis Pesta' ? '#faf5ff' : '#f8fafc',
                            color: item.kategori === 'Gamis Syari' ? '#047857' : item.kategori === 'Gamis Casual' ? '#1d4ed8' : item.kategori === 'Gamis Pesta' ? '#7e22ce' : '#334155',
                            border: item.kategori === 'Gamis Syari' ? '1px solid #a7f3d0' : item.kategori === 'Gamis Casual' ? '1px solid #bfdbfe' : item.kategori === 'Gamis Pesta' ? '1px solid #e9d5ff' : '1px solid #cbd5e1'
                          }}>
                            {item.kategori}
                          </span>

                          {/* Tipe: Satu Setel / Single */}
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: item.tipe_set === 'Satu Setel' ? '#f5f3ff' : '#f1f5f9',
                            color: item.tipe_set === 'Satu Setel' ? '#6d28d9' : '#475569',
                            border: item.tipe_set === 'Satu Setel' ? '1px solid #ddd6fe' : '1px solid #cbd5e1'
                          }}>
                            {item.tipe_set || 'Single'}
                          </span>

                          {/* Status Order: Ready Stok / PO */}
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: item.status_order === 'PO' ? '#fff7ed' : '#f0fdf4',
                            color: item.status_order === 'PO' ? '#c2410c' : '#15803d',
                            border: item.status_order === 'PO' ? '1px solid #fed7aa' : '1px solid #bbf7d0'
                          }}>
                            {item.status_order === 'PO' ? 'PO' : 'Ready Stok'}
                          </span>
                        </div>

                        {/* Baris 2: Nama Varian Warna / Ukuran */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={11} color="#0284c7" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '11px', lineHeight: 1.2 }}>
                            {item.varian || 'Reguler'}
                          </span>
                        </div>
                      </td>

                      {/* ESTIMASI KAIN (CM & HARGA) */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                        <div style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)',
                          border: '1px solid #bae6fd',
                          boxShadow: '0 1px 2px rgba(2, 132, 199, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          minWidth: '200px'
                        }}>
                          {/* Baris 1: Ikon + Jenis Kain + Badge CM */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Layers size={11} color="#0284c7" />
                              <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '11px', lineHeight: 1.2 }}>
                                {item.estimasi_kain || '-'}
                              </span>
                            </div>
                            <span style={{
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: '#ffffff',
                              color: '#0284c7',
                              fontSize: '9.5px',
                              fontWeight: '800',
                              border: '1px solid #bfdbfe',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.panjang_kain_cm || 0} CM
                            </span>
                          </div>

                          {/* Baris 2: Harga / CM & Biaya per Pcs */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '4px',
                            backgroundColor: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            fontSize: '9.5px'
                          }}>
                            <span style={{ color: '#64748b' }}>
                              @Rp {Number(item.harga_kain_cm || 0).toLocaleString('id-ID')}/CM
                            </span>
                            <span style={{
                              fontWeight: '800',
                              color: '#059669',
                              whiteSpace: 'nowrap'
                            }}>
                              Rp {((Number(item.panjang_kain_cm) || 0) * (Number(item.harga_kain_cm) || 0)).toLocaleString('id-ID')}/pcs
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* JUMLAH STOK TERSEDIA */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: item.stok > item.min_stok ? '#ecfdf5' : item.stok > 0 ? '#fffbeb' : '#fef2f2',
                          color: item.stok > item.min_stok ? '#059669' : item.stok > 0 ? '#d97706' : '#dc2626',
                          border: item.stok > item.min_stok ? '1px solid #a7f3d0' : item.stok > 0 ? '1px solid #fde68a' : '1px solid #fecaca',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.stok} {item.satuan}
                        </span>
                      </td>

                      {/* HARGA HPP */}
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '700', color: '#475569', fontSize: '12px', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(item.harga_beli)}
                      </td>

                      {/* HARGA JUAL */}
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '12px', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(item.harga_jual)}
                      </td>

                      {/* 4 ACTION BUTTONS */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          
                          {/* 1. Barcode Button (Green) */}
                          <button
                            onClick={() => handleOpenBarcode(item)}
                            title="Cetak Barcode / Label"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <QrCode size={13} />
                          </button>

                          {/* 2. Detail Eye Button (Teal / Cyan) */}
                          <button
                            onClick={() => handleOpenDetail(item)}
                            title="Lihat Detail Produk"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#06b6d4',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <Eye size={13} />
                          </button>                          {/* 3. Edit Pencil Button (Blue) */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data Produk"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* 4. Delete Trash Button (Red) */}
                          <button
                            onClick={() => handleDelete(item)}
                            title="Hapus Produk"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <Trash2 size={13} />
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

        {/* TABLE FOOTER SUMMARY */}
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#fafbfc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <b>{filteredList.length}</b> dari <b>{totalProduk}</b> total produk terdaftar
          </div>
          <div>
            Data otomatis tersimpan di LocalStorage browser
          </div>
        </div>

      </div>

      </div>

      {/* ========================================================
          MODAL 1: FORM TAMBAH / EDIT PRODUK (FULL SCREEN COMPACT)
          ======================================================== */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0f172a',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          
          {/* Modal Header (Dark Slate Fullscreen Compact) */}
          <div style={{
            height: '42px',
            padding: '0 16px',
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Package size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                {editingId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Form Manajemen Katalog, Spesifikasi, Stok & Harga
              </span>
            </div>
            
            <button 
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '5px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#cbd5e1';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Modal Form Body (Fullscreen 2-Column Compact Layout) */}
          <form onSubmit={handleFormSubmit} style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '10px',
              alignItems: 'start'
            }}>
              
              {/* LEFT COLUMN: IDENTITAS & SPESIFIKASI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 1. Identitas Produk */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <Tag size={13} color="#0284c7" />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      1. Identitas Produk
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Nama Produk <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Gamis Abaya Dubai Silk Jetblack"
                        value={formData.nama_produk}
                        onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 9px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: '#0f172a',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                          Kode SKU <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="GMS-XXXX"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
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
                          Kode Barcode / EAN <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="899XXXX"
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 9px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontFamily: 'monospace',
                            fontWeight: '700',
                            color: '#334155',
                            backgroundColor: '#f8fafc'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Kategori & Spesifikasi */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <Boxes size={13} color="#0284c7" />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      2. Kategori & Spesifikasi
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <SearchableSelect
                        label="Kategori Produk"
                        value={formData.kategori}
                        onChange={(val) => setFormData({ ...formData, kategori: val })}
                        options={kategoriOptions}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Varian / Ukuran / Warna
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Hitam Jetblack - Size L"
                        value={formData.varian}
                        onChange={(e) => setFormData({ ...formData, varian: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 9px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>
                    <div>
                      <SearchableSelect
                        label="Tipe Gamis"
                        value={formData.tipe_set || 'Single'}
                        onChange={(val) => setFormData({ ...formData, tipe_set: val })}
                        options={[
                          { value: 'Single', label: 'Single (Gamis Saja)' },
                          { value: 'Satu Setel', label: 'Satu Setel (Gamis + Khimar/Jilbab)' }
                        ]}
                      />
                    </div>
                    <div>
                      <SearchableSelect
                        label="Status Order"
                        value={formData.status_order || 'Ready Stok'}
                        onChange={(val) => setFormData({ ...formData, status_order: val })}
                        options={[
                          { value: 'Ready Stok', label: 'Ready Stok' },
                          { value: 'PO', label: 'PO (Pre-Order)' }
                        ]}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: INVENTARIS STOK & HARGA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 3. Inventaris & Pengingat Stok */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <Package size={13} color="#0284c7" />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      3. Inventaris & Pengingat Stok
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Satuan Produk
                      </label>
                      <input
                        type="text"
                        placeholder="PCS"
                        value={formData.satuan}
                        onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          textAlign: 'center',
                          textTransform: 'uppercase'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Stok Fisik Tersedia
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stok}
                        onChange={(e) => setFormData({ ...formData, stok: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          textAlign: 'center',
                          color: formData.stok <= (formData.min_stok || 5) ? '#d97706' : '#059669',
                          backgroundColor: formData.stok <= (formData.min_stok || 5) ? '#fffbeb' : '#f0fdf4'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Min. Stok Alert
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.min_stok}
                        onChange={(e) => setFormData({ ...formData, min_stok: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          textAlign: 'center',
                          color: '#64748b'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Penetapan Harga & Profit */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        4. Penetapan Harga & Margin Profit
                      </span>
                    </div>
                    {formData.harga_jual > 0 && formData.harga_beli > 0 && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        padding: '1px 7px',
                        borderRadius: '4px',
                        backgroundColor: (formData.harga_jual - formData.harga_beli) >= 0 ? '#ecfdf5' : '#fef2f2',
                        color: (formData.harga_jual - formData.harga_beli) >= 0 ? '#059669' : '#dc2626',
                        border: (formData.harga_jual - formData.harga_beli) >= 0 ? '1px solid #a7f3d0' : '1px solid #fecaca'
                      }}>
                        Profit: {formatRupiah(formData.harga_jual - formData.harga_beli)} ({Math.round(((formData.harga_jual - formData.harga_beli) / formData.harga_jual) * 100)}%)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Harga Beli / Modal (HPP)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '6px', fontSize: '10.5px', fontWeight: '700', color: '#64748b' }}>Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.harga_beli ? Number(formData.harga_beli).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, harga_beli: raw ? Number(raw) : 0 });
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px 10px 6px 28px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            textAlign: 'right',
                            color: '#0f172a'
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Harga Jual Konsumen
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '6px', fontSize: '10.5px', fontWeight: '700', color: '#0284c7' }}>Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.harga_jual ? Number(formData.harga_jual).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, harga_jual: raw ? Number(raw) : 0 });
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px 10px 6px 28px',
                            borderRadius: '5px',
                            border: '1px solid #38bdf8',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            textAlign: 'right',
                            color: '#0284c7',
                            backgroundColor: '#f0f9ff'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Estimasi Kain & Kebutuhan Bahan (Per Pcs) */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #38bdf8',
                  padding: '10px 12px',
                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #e0f2fe'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        5. Estimasi Kain & Kebutuhan Bahan (Otomatis ke SPK)
                      </span>
                    </div>
                    {Number(formData.panjang_kain_cm || 0) > 0 && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#f0f9ff',
                        color: '#0284c7',
                        border: '1px solid #bae6fd'
                      }}>
                        Kain/Pcs: {formData.panjang_kain_cm} CM ({((Number(formData.panjang_kain_cm) || 0) / 100).toFixed(1)} Meter) • Est. Biaya: {formatRupiah((Number(formData.panjang_kain_cm) || 0) * (Number(formData.harga_kain_cm) || 0))}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Nama / Jenis Kain
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Silk Jetblack, Drill, Rayon Twill"
                        value={formData.estimasi_kain || ''}
                        onChange={(e) => setFormData({ ...formData, estimasi_kain: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          color: '#0f172a'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Panjang Kain (CM / Pcs)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="Contoh: 250"
                          value={formData.panjang_kain_cm || ''}
                          onChange={(e) => setFormData({ ...formData, panjang_kain_cm: Number(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 36px 6px 10px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            textAlign: 'right',
                            color: '#0284c7'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '8px', top: '7px', fontSize: '10.5px', fontWeight: '700', color: '#64748b' }}>CM</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Harga Kain per CM (Rp)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '6px', fontSize: '10.5px', fontWeight: '700', color: '#64748b' }}>Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={formData.harga_kain_cm ? Number(formData.harga_kain_cm).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, harga_kain_cm: raw ? Number(raw) : 0 });
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 36px 6px 28px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            textAlign: 'right',
                            color: '#0f172a'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '6px', top: '7px', fontSize: '10px', fontWeight: '700', color: '#64748b' }}>/CM</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Sticky Action Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              marginTop: '10px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                <span style={{ color: '#ef4444', fontWeight: '800' }}>*</span> Pastikan seluruh data katalog & inventaris terisi benar sebelum disimpan
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    height: '28px',
                    padding: '0 14px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
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
                    padding: '0 16px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                >
                  <Save size={13} />
                  <span>Simpan Produk</span>
                </button>
              </div>
            </div>

          </form>

        </div>
      )}

      {/* ========================================================
          MODAL 2: DETAIL PRODUK (POPUP EYE ICON)
          ======================================================== */}
      {isDetailModalOpen && selectedProduk && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                  {selectedProduk.kategori}
                </span>
                <h3 style={{ margin: '6px 0 2px 0', fontSize: '16px', fontWeight: '800' }}>
                  {selectedProduk.nama_produk}
                </h3>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>
                  SKU: {selectedProduk.sku} • Barcode: {selectedProduk.barcode}
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Details */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>HARGA JUAL</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                    {formatRupiah(selectedProduk.harga_jual)}
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>HARGA MODAL (BELI)</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                    {formatRupiah(selectedProduk.harga_beli)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>VARIAN & SATUAN</div>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{selectedProduk.varian || 'Reguler Pack'}</div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>
                    Tipe: <b>{selectedProduk.tipe_set || 'Single'}</b> • Order: <b>{selectedProduk.status_order || 'Ready Stok'}</b> • Satuan: {selectedProduk.satuan}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '700' }}>JUMLAH STOK</div>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                    {selectedProduk.stok} {selectedProduk.satuan}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '11px' }}>Min. Alert: {selectedProduk.min_stok} {selectedProduk.satuan}</div>
                </div>
              </div>

              {/* Estimasi Kain Detail */}
              <div style={{ padding: '10px 12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '10px', color: '#0369a1', fontWeight: '800', textTransform: 'uppercase' }}>ESTIMASI BAHAN KAIN</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{selectedProduk.estimasi_kain || '-'}</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7' }}>
                    {selectedProduk.panjang_kain_cm || 0} CM ({((selectedProduk.panjang_kain_cm || 0) / 100).toFixed(1)} Meter)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', fontSize: '11px', color: '#64748b' }}>
                  <span>Harga Kain: <b>{formatRupiah(selectedProduk.harga_kain_cm || 0)}/CM</b></span>
                  <span>Est. Biaya Bahan/Pcs: <b style={{ color: '#059669' }}>{formatRupiah((selectedProduk.panjang_kain_cm || 0) * (selectedProduk.harga_kain_cm || 0))}</b></span>
                </div>
              </div>

              {/* Barcode Visual */}
              <div style={{ textAlign: 'center', padding: '10px', border: '1px dashed #cbd5e1', borderRadius: '6px', backgroundColor: '#fafbfc' }}>
                <div style={{ letterSpacing: '4px', fontFamily: 'monospace', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                  ||||| | |||| ||| |||| ||
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginTop: '2px' }}>
                  {selectedProduk.barcode}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenBarcode(selectedProduk);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={14} />
                <span>Cetak Barcode</span>
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: CETAK BARCODE & KARTU LABEL PRODUK
          ======================================================== */}
      {isBarcodeModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Cetak Barcode & Kartu Produk
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Label harga & barcode siap cetak untuk etalase rak toko
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsBarcodeModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Cards Grid */}
            <div style={{ overflowY: 'auto', padding: '18px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {(selectedProduk ? [selectedProduk] : produkList).map(item => (
                <div 
                  key={item.id}
                  style={{
                    border: '2px solid #0f172a',
                    borderRadius: '6px',
                    padding: '12px',
                    backgroundColor: '#ffffff',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: '800', color: '#0284c7' }}>RUANG MARKET</div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', maxWidth: '170px', lineHeight: 1.2 }}>
                        {item.nama_produk}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '9px', fontWeight: '700', backgroundColor: '#f1f5f9', padding: '2px 5px', borderRadius: '3px' }}>
                        {item.varian || 'Reguler Pack'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '700' }}>HARGA KONSUMEN</div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#059669' }}>
                        {formatRupiah(item.harga_jual)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'monospace', letterSpacing: '2px', fontWeight: '800', fontSize: '14px' }}>
                        |||||||||||
                      </div>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: '#334155' }}>
                        {item.barcode}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
                    <span>SKU: {item.sku}</span>
                    <span>Varian: {item.varian || 'Reguler Pack'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '12px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Total <b>{selectedProduk ? 1 : produkList.length}</b> label siap dicetak
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsBarcodeModalOpen(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    toastSuccess('Mengirim ke printer label...');
                    window.print();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={14} />
                  <span>Cetak ke Printer</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
