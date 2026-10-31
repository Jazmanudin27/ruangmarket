import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  X,
  Save,
  RotateCw,
  Download,
  Calendar,
  Building,
  CreditCard,
  Tag,
  FileText,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Receipt,
  Settings,
  Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';
import { INITIAL_MUTASI_DATA, KATEGORI_MUTASI_DEFAULT, BANK_DEFAULT } from '../../data/initialKeuangan';

const STORAGE_KEY = 'ruangmarket_mutasi_keuangan_v1';
const KATEGORI_STORAGE_KEY = 'ruangmarket_kategori_keuangan_v1';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

export default function KeuanganDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('company_changed', handleCompanyChange);
    return () => window.removeEventListener('company_changed', handleCompanyChange);
  }, []);

  const [mutasiList, setMutasiList] = useState([]);
  const [bankList, setBankList] = useState(BANK_DEFAULT);
  const [kategoriList, setKategoriList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Kategori Management Modal State
  const [isKategoriModalOpen, setIsKategoriModalOpen] = useState(false);
  const [editingKategoriId, setEditingKategoriId] = useState(null);
  const [kategoriForm, setKategoriForm] = useState({
    nama_kategori: '',
    jenis_mutasi: 'semua'
  });

  // Filters
  const [search, setSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('semua'); // 'semua' | 'masuk' | 'keluar'
  const [filterBank, setFilterBank] = useState('Semua');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterTglAwal, setFilterTglAwal] = useState('');
  const [filterTglAkhir, setFilterTglAkhir] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMutasi, setSelectedMutasi] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const initialForm = {
    tanggal: new Date().toISOString().slice(0, 10),
    no_bukti: '',
    kode_bank: 'KAS TUNAI',
    jumlah: '',
    keterangan: '',
    jenis_mutasi: 'masuk',
    kategori: 'Penjualan Offline'
  };
  const [formData, setFormData] = useState(initialForm);

  // Load Kategori from Server API with local fallback
  const loadKategori = async () => {
    try {
      const res = await fetch(`/api/keuangan/kategori?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          setKategoriList(json.data);
          try { localStorage.setItem(KATEGORI_STORAGE_KEY, JSON.stringify(json.data)); } catch (_) {}
          return;
        }
      }
    } catch (_) {}

    // Fallback localStorage or initial
    try {
      const saved = localStorage.getItem(KATEGORI_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setKategoriList(parsed);
          return;
        }
      }
    } catch (_) {}

    const defaults = KATEGORI_MUTASI_DEFAULT.map((name, i) => ({
      id: i + 1,
      nama_kategori: name,
      jenis_mutasi: 'semua'
    }));
    setKategoriList(defaults);
  };

  // Load Banks from Master Bank (if available)
  const loadBanks = async () => {
    try {
      const res = await fetch(`/api/bank?kode_perusahaan=${activeCompany?.code || 'RSG'}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const names = json.data.map(b => b.nama_bank || b.kode_bank).filter(Boolean);
          const combined = Array.from(new Set(['KAS TUNAI', ...names, ...BANK_DEFAULT]));
          setBankList(combined);
          return;
        }
      }
    } catch (_) {}
    setBankList(BANK_DEFAULT);
  };

  // Load Data Mutasi from Server API with local fallback
  const loadMutasi = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCompany?.code) params.set('kode_perusahaan', activeCompany.code);
      const res = await fetch(`/api/keuangan/mutasi?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          setMutasiList(json.data);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
          } catch (_) {}
          setIsLoading(false);
          return;
        }
      }
      throw new Error('API server unavailable');
    } catch (err) {
      // Fallback local storage / initial data
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMutasiList(parsed);
            setIsLoading(false);
            return;
          }
        }
      } catch (_) {}
      setMutasiList(INITIAL_MUTASI_DATA);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBanks();
    loadKategori();
    loadMutasi();
  }, [activeCompany?.code]);

  // ─── KATEGORI MUTASI HANDLERS ───────────────────────────────────────
  const handleStartEditKategori = (kat) => {
    setEditingKategoriId(kat.id);
    setKategoriForm({
      nama_kategori: kat.nama_kategori || '',
      jenis_mutasi: kat.jenis_mutasi || 'semua'
    });
  };

  const handleCancelEditKategori = () => {
    setEditingKategoriId(null);
    setKategoriForm({ nama_kategori: '', jenis_mutasi: 'semua' });
  };

  const handleSaveKategori = async (e) => {
    e.preventDefault();
    const nama = (kategoriForm.nama_kategori || '').trim();
    if (!nama) {
      toastError('Nama kategori wajib diisi!');
      return;
    }

    const payload = {
      id: editingKategoriId || null,
      kode_perusahaan: activeCompany?.code || 'RSG',
      nama_kategori: nama,
      jenis_mutasi: kategoriForm.jenis_mutasi || 'semua'
    };

    try {
      const res = await fetch('/api/keuangan/kategori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toastSuccess(editingKategoriId ? 'Kategori berhasil diperbarui!' : 'Kategori baru berhasil ditambahkan!');
        setEditingKategoriId(null);
        setKategoriForm({ nama_kategori: '', jenis_mutasi: 'semua' });
        await loadKategori();
        setFormData(prev => ({ ...prev, kategori: nama }));
        return;
      }
    } catch (_) {}

    // Fallback Local
    if (editingKategoriId) {
      const updated = kategoriList.map(k => k.id === editingKategoriId ? { ...k, nama_kategori: nama, jenis_mutasi: kategoriForm.jenis_mutasi } : k);
      setKategoriList(updated);
      try { localStorage.setItem(KATEGORI_STORAGE_KEY, JSON.stringify(updated)); } catch (_) {}
      toastSuccess('Kategori berhasil diperbarui (offline)');
    } else {
      const newId = Date.now();
      const updated = [...kategoriList, { id: newId, nama_kategori: nama, jenis_mutasi: kategoriForm.jenis_mutasi }];
      setKategoriList(updated);
      try { localStorage.setItem(KATEGORI_STORAGE_KEY, JSON.stringify(updated)); } catch (_) {}
      toastSuccess('Kategori baru berhasil ditambahkan (offline)');
    }
    setEditingKategoriId(null);
    setKategoriForm({ nama_kategori: '', jenis_mutasi: 'semua' });
    setFormData(prev => ({ ...prev, kategori: nama }));
  };

  const handleDeleteKategori = async (kat) => {
    const confirmed = await showConfirm(
      'Hapus Kategori Mutasi?',
      `Yakin ingin menghapus kategori "${kat.nama_kategori}"?`,
      'Ya, Hapus',
      'Batal'
    );
    if (!confirmed) return;

    try {
      await fetch(`/api/keuangan/kategori?id=${kat.id}`, { method: 'DELETE' });
    } catch (_) {}

    const updated = kategoriList.filter(k => k.id !== kat.id);
    setKategoriList(updated);
    try { localStorage.setItem(KATEGORI_STORAGE_KEY, JSON.stringify(updated)); } catch (_) {}
    toastSuccess(`Kategori "${kat.nama_kategori}" berhasil dihapus.`);
    if (formData.kategori === kat.nama_kategori && updated.length > 0) {
      setFormData(prev => ({ ...prev, kategori: updated[0].nama_kategori }));
    }
  };

  // Helper Auto Generate No Bukti
  const generateNoBukti = (jenis, tgl) => {
    const prefix = (jenis === 'keluar') ? 'BKK' : 'BKM';
    const dateStr = (tgl || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${dateStr}-${rand}`;
  };

  // Open Add Modal
  const handleOpenAdd = (defaultJenis = 'masuk') => {
    setEditingId(null);
    const today = new Date().toISOString().slice(0, 10);
    setFormData({
      ...initialForm,
      tanggal: today,
      jenis_mutasi: defaultJenis,
      no_bukti: generateNoBukti(defaultJenis, today),
      kategori: defaultJenis === 'masuk' ? 'Penjualan Offline' : 'Pembelian Bahan / Kain'
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      tanggal: item.tanggal ? String(item.tanggal).slice(0, 10) : new Date().toISOString().slice(0, 10),
      no_bukti: item.no_bukti || '',
      kode_bank: item.kode_bank || 'KAS TUNAI',
      jumlah: item.jumlah || '',
      keterangan: item.keterangan || '',
      jenis_mutasi: (item.jenis_mutasi || 'masuk').toLowerCase(),
      kategori: item.kategori || 'Umum'
    });
    setIsFormModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (item) => {
    setSelectedMutasi(item);
    setIsDetailModalOpen(true);
  };

  // Save Mutasi (Submit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.tanggal) {
      toastError('Tanggal transaksi wajib diisi!');
      return;
    }
    if (!formData.jumlah || Number(formData.jumlah) <= 0) {
      toastError('Jumlah / Nominal mutasi harus lebih besar dari 0!');
      return;
    }

    const payload = {
      id: editingId || null,
      kode_perusahaan: activeCompany?.code || 'RSG',
      tanggal: formData.tanggal,
      no_bukti: (formData.no_bukti || '').trim() || generateNoBukti(formData.jenis_mutasi, formData.tanggal),
      kode_bank: (formData.kode_bank || 'KAS TUNAI').trim(),
      jumlah: Math.abs(Number(formData.jumlah)),
      keterangan: (formData.keterangan || '').trim(),
      jenis_mutasi: formData.jenis_mutasi,
      kategori: (formData.kategori || 'Umum').trim()
    };

    try {
      const res = await fetch('/api/keuangan/mutasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toastSuccess(editingId ? 'Mutasi kas berhasil diperbarui!' : 'Mutasi kas berhasil dicatat!');
        setIsFormModalOpen(false);
        loadMutasi();
        return;
      }
    } catch (_) {}

    // Fallback Local
    if (editingId) {
      const updated = mutasiList.map(m => m.id === editingId ? { ...payload, id: editingId } : m);
      setMutasiList(updated);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (_) {}
      toastSuccess('Mutasi kas berhasil diperbarui (offline)');
    } else {
      const newId = Date.now();
      const updated = [{ ...payload, id: newId }, ...mutasiList];
      setMutasiList(updated);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (_) {}
      toastSuccess('Mutasi kas baru berhasil ditambahkan (offline)');
    }
    setIsFormModalOpen(false);
  };

  // Delete Mutasi
  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      'Hapus Mutasi Kas?',
      `Hapus mutasi ${item.no_bukti} (${item.jenis_mutasi?.toUpperCase()} - ${formatRupiah(item.jumlah)})? Tindakan ini tidak dapat dibatalkan.`,
      'Ya, Hapus',
      'Batal'
    );
    if (!confirmed) return;

    try {
      await fetch(`/api/keuangan/mutasi?id=${item.id}`, { method: 'DELETE' });
    } catch (_) {}

    const updated = mutasiList.filter(m => m.id !== item.id);
    setMutasiList(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (_) {}
    toastSuccess(`Mutasi ${item.no_bukti} berhasil dihapus.`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredMutasi.length === 0) {
      toastError('Tidak ada data mutasi untuk diekspor!');
      return;
    }

    const exportRows = filteredMutasi.map((m, idx) => ({
      No: idx + 1,
      Tanggal: m.tanggal ? String(m.tanggal).slice(0, 10) : '',
      'No Bukti': m.no_bukti,
      'Jenis Mutasi': m.jenis_mutasi === 'masuk' ? 'Kas Masuk' : 'Kas Keluar',
      'Kode Bank / Akun': m.kode_bank,
      Kategori: m.kategori,
      Keterangan: m.keterangan || '-',
      'Masuk (Rp)': m.jenis_mutasi === 'masuk' ? Number(m.jumlah) : 0,
      'Keluar (Rp)': m.jenis_mutasi === 'keluar' ? Number(m.jumlah) : 0,
      'Perusahaan': m.kode_perusahaan || activeCompany?.code || 'RSG'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mutasi Kas');
    const filename = `Mutasi_Kas_${activeCompany?.code || 'RSG'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    toastSuccess(`Data mutasi berhasil diekspor ke ${filename}`);
  };

  // KPI Calculations
  const { totalMasuk, totalKeluar, saldoBersih, countMasuk, countKeluar } = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    let cMasuk = 0;
    let cKeluar = 0;
    mutasiList.forEach(m => {
      const nom = Number(m.jumlah || 0);
      if (m.jenis_mutasi === 'masuk') {
        masuk += nom;
        cMasuk++;
      } else {
        keluar += nom;
        cKeluar++;
      }
    });
    return {
      totalMasuk: masuk,
      totalKeluar: keluar,
      saldoBersih: masuk - keluar,
      countMasuk: cMasuk,
      countKeluar: cKeluar
    };
  }, [mutasiList]);

  // Filtered List
  const filteredMutasi = useMemo(() => {
    return mutasiList.filter(m => {
      // Tab filter
      if (activeFilterTab === 'masuk' && m.jenis_mutasi !== 'masuk') return false;
      if (activeFilterTab === 'keluar' && m.jenis_mutasi !== 'keluar') return false;

      // Bank filter
      if (filterBank !== 'Semua' && m.kode_bank !== filterBank) return false;

      // Kategori filter
      if (filterKategori !== 'Semua' && m.kategori !== filterKategori) return false;

      // Tanggal filter
      const tgl = m.tanggal ? String(m.tanggal).slice(0, 10) : '';
      if (filterTglAwal && tgl < filterTglAwal) return false;
      if (filterTglAkhir && tgl > filterTglAkhir) return false;

      // Search term
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchBukti = (m.no_bukti || '').toLowerCase().includes(q);
        const matchKet = (m.keterangan || '').toLowerCase().includes(q);
        const matchBank = (m.kode_bank || '').toLowerCase().includes(q);
        const matchKat = (m.kategori || '').toLowerCase().includes(q);
        const matchNom = String(m.jumlah || '').includes(q);
        if (!matchBukti && !matchKet && !matchBank && !matchKat && !matchNom) return false;
      }

      return true;
    });
  }, [mutasiList, activeFilterTab, filterBank, filterKategori, filterTglAwal, filterTglAkhir, search]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredMutasi.length / entriesPerPage) || 1;
  const paginatedMutasi = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredMutasi.slice(start, start + entriesPerPage);
  }, [filteredMutasi, currentPage, entriesPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilterTab, filterBank, filterKategori, filterTglAwal, filterTglAkhir, search, entriesPerPage]);

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* MASTER CONTAINER CARD (STYLE PERSIS MASTER PRODUK) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
      }}>

        {/* 1. HEADER TITLE & ACTION BUTTONS (BERWARNA BLUE GRADIENT) */}
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
          marginBottom: '8px',
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
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                  Data Keuangan & Mutasi Kas Masuk / Keluar
                </h1>
                <span style={{
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '10px',
                  fontWeight: '800',
                  color: '#ffffff'
                }}>
                  {activeCompany?.code || 'RSG'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
                Buku kas operasional, pencatatan transaksi masuk & keluar, rekening bank, dan saldo keuangan
              </p>
            </div>
          </div>

          {/* Action Button: Cukup Satu Tombol Catat Kas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleOpenAdd('masuk')}
              style={{
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 15px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#0284c7',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f9ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <Plus size={15} />
              <span>+ Catat Kas</span>
            </button>
          </div>
        </div>

        {/* 2. STATS SUMMARY CARDS (ARUS KAS & SALDO) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {/* Card 1: Total Kas Masuk */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '7px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>
                Total Kas Masuk
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#15803d', marginTop: '2px' }}>
                {formatRupiah(totalMasuk)}
              </div>
              <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '1px' }}>
                {countMasuk} transaksi kas masuk
              </div>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a'
            }}>
              <TrendingUp size={18} />
            </div>
          </div>

          {/* Card 2: Total Kas Keluar */}
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '7px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' }}>
                Total Kas Keluar
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#b91c1c', marginTop: '2px' }}>
                {formatRupiah(totalKeluar)}
              </div>
              <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '1px' }}>
                {countKeluar} transaksi kas keluar
              </div>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626'
            }}>
              <TrendingDown size={18} />
            </div>
          </div>

          {/* Card 3: Saldo Bersih / Cash Flow */}
          <div style={{
            backgroundColor: saldoBersih >= 0 ? '#f0f9ff' : '#fff1f2',
            border: saldoBersih >= 0 ? '1px solid #bae6fd' : '1px solid #fecdd3',
            borderRadius: '7px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: saldoBersih >= 0 ? '#0369a1' : '#be123c', textTransform: 'uppercase' }}>
                Saldo Bersih (Net Cash)
              </div>
              <div style={{
                fontSize: '15px',
                fontWeight: '800',
                color: saldoBersih >= 0 ? '#0284c7' : '#e11d48',
                marginTop: '2px'
              }}>
                {formatRupiah(saldoBersih)}
              </div>
              <div style={{ fontSize: '10px', color: saldoBersih >= 0 ? '#0284c7' : '#e11d48', marginTop: '1px' }}>
                {saldoBersih >= 0 ? 'Surplus Kas' : 'Defisit Kas'}
              </div>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: saldoBersih >= 0 ? '#e0f2fe' : '#ffe4e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: saldoBersih >= 0 ? '#0284c7' : '#e11d48'
            }}>
              <Wallet size={18} />
            </div>
          </div>

          {/* Card 4: Total Transaksi Mutasi */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '7px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                Total Transaksi
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                {mutasiList.length} Mutasi
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                Tercatat di pembukuan
              </div>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569'
            }}>
              <Receipt size={18} />
            </div>
          </div>
        </div>

        {/* 3. FILTER TABS (COLOR-CODED PERSIS MASTER PRODUK) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {/* Tab 1: Semua Mutasi */}
          <button
            type="button"
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
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeFilterTab === 'semua' ? '0 1px 4px rgba(2, 132, 199, 0.25)' : 'none'
            }}
          >
            <DollarSign size={13} />
            <span>Semua Mutasi ({mutasiList.length})</span>
          </button>

          {/* Tab 2: Kas Masuk (Hijau) */}
          <button
            type="button"
            onClick={() => setActiveFilterTab('masuk')}
            style={{
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: activeFilterTab === 'masuk' ? '1px solid #059669' : '1px solid #a7f3d0',
              backgroundColor: activeFilterTab === 'masuk' ? '#059669' : '#ecfdf5',
              color: activeFilterTab === 'masuk' ? '#ffffff' : '#047857',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeFilterTab === 'masuk' ? '0 1px 4px rgba(5, 150, 105, 0.25)' : 'none'
            }}
          >
            <ArrowDownLeft size={13} />
            <span>Kas Masuk ({countMasuk})</span>
          </button>

          {/* Tab 3: Kas Keluar (Merah) */}
          <button
            type="button"
            onClick={() => setActiveFilterTab('keluar')}
            style={{
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: activeFilterTab === 'keluar' ? '1px solid #ef4444' : '1px solid #fecaca',
              backgroundColor: activeFilterTab === 'keluar' ? '#ef4444' : '#fef2f2',
              color: activeFilterTab === 'keluar' ? '#ffffff' : '#b91c1c',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeFilterTab === 'keluar' ? '0 1px 4px rgba(239, 68, 68, 0.25)' : 'none'
            }}
          >
            <ArrowUpRight size={13} />
            <span>Kas Keluar ({countKeluar})</span>
          </button>
        </div>

        {/* 4. FILTER TOOLBAR (SEARCH, BANK, KATEGORI, DATE RANGE, REFRESH) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          flexWrap: 'wrap',
          backgroundColor: '#f8fafc',
          padding: '8px 10px',
          borderRadius: '7px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no bukti, keterangan, bank, kategori..."
              style={{
                width: '100%',
                padding: '5px 8px 5px 28px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {search && (
              <X
                size={12}
                color="#94a3b8"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
              />
            )}
          </div>

          {/* Filter Bank */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Bank:</span>
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: '#ffffff',
                color: '#334155'
              }}
            >
              <option value="Semua">Semua Bank / Kas</option>
              {bankList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Filter Kategori */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Kategori:</span>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: '#ffffff',
                color: '#334155'
              }}
            >
              <option value="Semua">Semua Kategori</option>
              {kategoriList.map(k => (
                <option key={k.id || k.nama_kategori} value={k.nama_kategori}>{k.nama_kategori}</option>
              ))}
            </select>
          </div>

          {/* Filter Tanggal Rentang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Tgl:</span>
            <input
              type="date"
              value={filterTglAwal}
              onChange={(e) => setFilterTglAwal(e.target.value)}
              title="Dari Tanggal"
              style={{
                padding: '3px 6px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                backgroundColor: '#ffffff',
                color: '#334155'
              }}
            />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>s/d</span>
            <input
              type="date"
              value={filterTglAkhir}
              onChange={(e) => setFilterTglAkhir(e.target.value)}
              title="Sampai Tanggal"
              style={{
                padding: '3px 6px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                backgroundColor: '#ffffff',
                color: '#334155'
              }}
            />
            {(filterTglAwal || filterTglAkhir) && (
              <button
                type="button"
                onClick={() => { setFilterTglAwal(''); setFilterTglAkhir(''); }}
                title="Reset filter tanggal"
                style={{
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Reset Tgl
              </button>
            )}
          </div>

          {/* Entries per page */}
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadMutasi}
            title="Muat ulang data mutasi"
            style={{
              height: '28px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 10px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0284c7',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <RotateCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* 5. DATA TABLE (MATCHING PERSIS DENGAN MASTER PRODUK & PENJUALAN OFFLINE) */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '7px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table
              className="table-bordered-hover"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11.5px',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center', width: '38px' }}>NO</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '90px' }}>TANGGAL</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '135px' }}>NO BUKTI</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center', width: '105px' }}>JENIS MUTASI</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '100px' }}>KODE BANK</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '140px' }}>KATEGORI</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>KETERANGAN</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'right', width: '130px' }}>JUMLAH (RP)</th>
                  <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center', width: '90px' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <RotateCw size={22} color="#0284c7" className="animate-spin" />
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>Memuat Data Mutasi Keuangan...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedMutasi.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      <FileText size={32} color="#cbd5e1" style={{ marginBottom: '6px' }} />
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                        Tidak ada transaksi mutasi kas
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '2px' }}>
                        Ubah filter pencarian atau klik "+ Kas Masuk" / "+ Kas Keluar" untuk mencatat baru
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedMutasi.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * entriesPerPage + idx + 1;
                    const isMasuk = item.jenis_mutasi === 'masuk';

                    return (
                      <tr
                        key={item.id || idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                          borderBottom: '1px solid #e2e8f0'
                        }}
                      >
                        {/* 1. NO */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                          color: '#64748b',
                          fontWeight: '700'
                        }}>
                          {rowNumber}
                        </td>

                        {/* 2. TANGGAL */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0',
                          color: '#0f172a',
                          fontWeight: '700',
                          whiteSpace: 'nowrap'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} color="#0284c7" />
                            <span>{item.tanggal ? String(item.tanggal).slice(0, 10) : '-'}</span>
                          </div>
                        </td>

                        {/* 3. NO BUKTI */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: '800',
                            color: '#0f172a'
                          }}>
                            {item.no_bukti || '-'}
                          </span>
                        </td>

                        {/* 4. JENIS MUTASI */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: '800',
                            backgroundColor: isMasuk ? '#ecfdf5' : '#fef2f2',
                            color: isMasuk ? '#047857' : '#b91c1c',
                            border: isMasuk ? '1px solid #a7f3d0' : '1px solid #fecaca',
                            textTransform: 'uppercase'
                          }}>
                            {isMasuk ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                            <span>{isMasuk ? 'Kas Masuk' : 'Kas Keluar'}</span>
                          </span>
                        </td>

                        {/* 5. KODE BANK */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            color: '#0284c7'
                          }}>
                            <CreditCard size={10} />
                            <span>{item.kode_bank || 'KAS TUNAI'}</span>
                          </div>
                        </td>

                        {/* 6. KATEGORI */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            color: '#334155'
                          }}>
                            {item.kategori || 'Umum'}
                          </span>
                        </td>

                        {/* 7. KETERANGAN */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0',
                          color: '#334155',
                          fontSize: '11px'
                        }}>
                          <div style={{ maxWidth: '320px', lineHeight: 1.35 }}>
                            {item.keterangan || '-'}
                          </div>
                        </td>

                        {/* 8. JUMLAH (RP) */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0',
                          textAlign: 'right',
                          verticalAlign: 'middle'
                        }}>
                          <span style={{
                            fontWeight: '800',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: isMasuk ? '#15803d' : '#b91c1c'
                          }}>
                            {isMasuk ? '+' : '-'}{formatRupiah(item.jumlah)}
                          </span>
                        </td>

                        {/* 9. AKSI */}
                        <td style={{
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                          verticalAlign: 'middle'
                        }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {/* Detail */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(item)}
                              title="Lihat Rincian Mutasi"
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #38bdf8',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <Eye size={11} />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Data Mutasi"
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#0284c7',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit3 size={11} />
                            </button>

                            {/* Hapus */}
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              title="Hapus Mutasi"
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: '1px solid #fca5a5',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={11} />
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

          {/* TABLE FOOTER / PAGINATION */}
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748b',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              Menampilkan{' '}
              <b style={{ color: '#0f172a' }}>
                {filteredMutasi.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}
              </b>{' '}
              sampai{' '}
              <b style={{ color: '#0f172a' }}>
                {Math.min(currentPage * entriesPerPage, filteredMutasi.length)}
              </b>{' '}
              dari <b style={{ color: '#0f172a' }}>{filteredMutasi.length}</b> mutasi kas
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                  color: currentPage <= 1 ? '#94a3b8' : '#334155',
                  fontWeight: '700',
                  fontSize: '11px',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Sebelumnya
              </button>

              <span style={{ padding: '2px 6px', fontWeight: '800', color: '#0f172a' }}>
                {currentPage} / {totalPages || 1}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                  color: currentPage >= totalPages ? '#94a3b8' : '#334155',
                  fontWeight: '700',
                  fontSize: '11px',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================
          MODAL FULL SCREEN COMPACT: FORM TAMBAH / EDIT MUTASI KAS
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
          {/* Fullscreen Header (Dark Slate Compact - 42px) */}
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
                backgroundColor: formData.jenis_mutasi === 'masuk' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: formData.jenis_mutasi === 'masuk' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                color: formData.jenis_mutasi === 'masuk' ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {formData.jenis_mutasi === 'masuk' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                {editingId
                  ? 'Edit Data Mutasi Kas'
                  : (formData.jenis_mutasi === 'masuk' ? 'Input Mutasi Kas Masuk (BKM)' : 'Input Mutasi Kas Keluar (BKK)')}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Form Pencatatan Arus Kas & Pembukuan Perusahaan ({activeCompany?.code || 'RSG'})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Fullscreen Body (2-Column Grid Layout) */}
          <div style={{
            flex: 1,
            height: 'calc(100vh - 42px)',
            overflowY: 'auto',
            padding: '14px 18px 40px 18px',
            backgroundColor: '#f1f5f9'
          }}>
            <form onSubmit={handleSubmitForm} style={{ width: '100%', margin: '0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
                gap: '12px'
              }}>

                {/* KOLOM KIRI: KLASIFIKASI & METODE PEMBAYARAN */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={14} color="#0284c7" />
                      <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        1. Klasifikasi & Rekening Kas
                      </span>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: formData.jenis_mutasi === 'masuk' ? '#ecfdf5' : '#fef2f2',
                      color: formData.jenis_mutasi === 'masuk' ? '#047857' : '#b91c1c',
                      border: formData.jenis_mutasi === 'masuk' ? '1px solid #a7f3d0' : '1px solid #fecaca'
                    }}>
                      {formData.jenis_mutasi === 'masuk' ? 'PENERIMAAN KAS' : 'PENGELUARAN KAS'}
                    </span>
                  </div>

                  {/* Jenis Mutasi Switch Buttons */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '5px' }}>
                      Pilih Jenis Mutasi <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newJenis = 'masuk';
                          setFormData(prev => ({
                            ...prev,
                            jenis_mutasi: newJenis,
                            no_bukti: generateNoBukti(newJenis, prev.tanggal),
                            kategori: 'Penjualan Offline'
                          }));
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: formData.jenis_mutasi === 'masuk' ? '2px solid #059669' : '1px solid #cbd5e1',
                          backgroundColor: formData.jenis_mutasi === 'masuk' ? '#ecfdf5' : '#ffffff',
                          color: formData.jenis_mutasi === 'masuk' ? '#047857' : '#64748b',
                          fontWeight: '800',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <ArrowDownLeft size={16} />
                        <span>Kas Masuk (BKM)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newJenis = 'keluar';
                          setFormData(prev => ({
                            ...prev,
                            jenis_mutasi: newJenis,
                            no_bukti: generateNoBukti(newJenis, prev.tanggal),
                            kategori: 'Pembelian Bahan / Kain'
                          }));
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: formData.jenis_mutasi === 'keluar' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                          backgroundColor: formData.jenis_mutasi === 'keluar' ? '#fef2f2' : '#ffffff',
                          color: formData.jenis_mutasi === 'keluar' ? '#b91c1c' : '#64748b',
                          fontWeight: '800',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <ArrowUpRight size={16} />
                        <span>Kas Keluar (BKK)</span>
                      </button>
                    </div>
                  </div>

                  {/* Tanggal & No Bukti */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Tanggal Transaksi <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.tanggal}
                        onChange={(e) => {
                          const newTgl = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            tanggal: newTgl,
                            no_bukti: prev.no_bukti ? prev.no_bukti : generateNoBukti(prev.jenis_mutasi, newTgl)
                          }));
                        }}
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                          No. Bukti Kas <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, no_bukti: generateNoBukti(prev.jenis_mutasi, prev.tanggal) }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284c7',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          Auto Generate
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.no_bukti}
                        onChange={(e) => setFormData({ ...formData, no_bukti: e.target.value })}
                        placeholder="Contoh: BKM-20261031-001"
                        style={{
                          width: '100%',
                          padding: '7px 9px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Kode Bank / Akun Kas */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Kode Bank / Akun Kas <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={formData.kode_bank}
                      onChange={(e) => setFormData({ ...formData, kode_bank: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: '#ffffff',
                        color: '#0284c7',
                        boxSizing: 'border-box'
                      }}
                    >
                      {bankList.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kategori Mutasi */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                        Kategori Mutasi <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsKategoriModalOpen(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0 2px'
                        }}
                      >
                        <Settings size={12} />
                        <span>+ Tambah / Edit Kategori</span>
                      </button>
                    </div>
                    <select
                      value={formData.kategori}
                      onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        boxSizing: 'border-box'
                      }}
                    >
                      {kategoriList
                        .filter(k => !k.jenis_mutasi || k.jenis_mutasi === 'semua' || k.jenis_mutasi === formData.jenis_mutasi)
                        .map(k => (
                          <option key={k.id || k.nama_kategori} value={k.nama_kategori}>
                            {k.nama_kategori}
                          </option>
                        ))}
                    </select>
                  </div>

                </div>

                {/* KOLOM KANAN: NOMINAL & KETERANGAN RINCIAN */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={14} color="#0284c7" />
                      <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Nominal & Rincian Transaksi
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Mata Uang: IDR (Rupiah)
                    </span>
                  </div>

                  {/* Jumlah / Nominal Mutasi */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                      Jumlah / Nominal Mutasi (Rp) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontWeight: '800',
                        fontSize: '13px',
                        color: formData.jenis_mutasi === 'masuk' ? '#059669' : '#dc2626'
                      }}>
                        Rp
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={formData.jumlah}
                        onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 42px',
                          borderRadius: '6px',
                          border: formData.jenis_mutasi === 'masuk' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                          backgroundColor: formData.jenis_mutasi === 'masuk' ? '#f0fdf4' : '#fef2f2',
                          fontSize: '16px',
                          fontWeight: '800',
                          fontFamily: 'monospace',
                          color: formData.jenis_mutasi === 'masuk' ? '#15803d' : '#b91c1c',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    {formData.jumlah > 0 && (
                      <div style={{
                        fontSize: '11.5px',
                        color: '#475569',
                        marginTop: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0'
                      }}>
                        Terbilang: <b style={{ color: formData.jenis_mutasi === 'masuk' ? '#15803d' : '#b91c1c' }}>{formatRupiah(formData.jumlah)}</b>
                      </div>
                    )}
                  </div>

                  {/* Keterangan / Deskripsi */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                      Keterangan / Deskripsi Lengkap
                    </label>
                    <textarea
                      rows={5}
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      placeholder="Contoh: Pembayaran DP Pesanan Seragam SD 50 pcs / Pembelian kain katun toyobo 2 roll di Toko Kain Jaya..."
                      style={{
                        width: '100%',
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        lineHeight: 1.4
                      }}
                    />
                  </div>

                  {/* Info Dampak Saldo Card */}
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: formData.jenis_mutasi === 'masuk' ? '#f0fdf4' : '#fff1f2',
                    border: formData.jenis_mutasi === 'masuk' ? '1px solid #bbf7d0' : '1px solid #fecdd3',
                    fontSize: '11px',
                    color: formData.jenis_mutasi === 'masuk' ? '#166534' : '#9f1239'
                  }}>
                    💡 Transaksi ini akan <b>{formData.jenis_mutasi === 'masuk' ? 'menambah (+)' : 'mengurangi (-)'}</b> saldo rekening <b>{formData.kode_bank}</b> sebesar <b>{formatRupiah(formData.jumlah || 0)}</b>.
                  </div>

                </div>

              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '7px 22px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: formData.jenis_mutasi === 'masuk' ? '#059669' : '#ef4444',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Save size={14} />
                    <span>{editingId ? 'Simpan Perubahan Mutasi' : 'Catat Mutasi Kas Sekarang'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL FULL SCREEN COMPACT: DETAIL / RINCIAN MUTASI KAS
          ======================================================== */}
      {isDetailModalOpen && selectedMutasi && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0f172a',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Fullscreen Header (Dark Slate Compact - 42px) */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
                <Receipt size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                Rincian Bukti Kas: {selectedMutasi.no_bukti}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedMutasi.jenis_mutasi === 'masuk' ? 'Bukti Kas Masuk (BKM)' : 'Bukti Kas Keluar (BKK)'} — {selectedMutasi.kategori}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedMutasi);
                }}
                style={{
                  height: '26px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0 10px',
                  borderRadius: '5px',
                  border: '1px solid #38bdf8',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={12} />
                <span>Edit Mutasi</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
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
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Fullscreen Body */}
          <div style={{
            flex: 1,
            height: 'calc(100vh - 42px)',
            overflowY: 'auto',
            padding: '16px 20px 40px 20px',
            backgroundColor: '#f1f5f9'
          }}>
            <div style={{ width: '100%', margin: '0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* VOUCHER / KUITANSI BANNER CARD */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)'
              }}>
                {/* Banner Top Strip */}
                <div style={{
                  padding: '16px 20px',
                  background: selectedMutasi.jenis_mutasi === 'masuk'
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        fontSize: '11px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {selectedMutasi.jenis_mutasi === 'masuk' ? 'BUKTI KAS MASUK (BKM)' : 'BUKTI KAS KELUAR (BKK)'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)' }}>
                        Perusahaan: <b>{selectedMutasi.kode_perusahaan || activeCompany?.code || 'RSG'}</b>
                      </span>
                    </div>

                    <div style={{
                      fontSize: '28px',
                      fontWeight: '800',
                      marginTop: '6px',
                      fontFamily: 'monospace',
                      letterSpacing: '-0.02em'
                    }}>
                      {selectedMutasi.jenis_mutasi === 'masuk' ? '+' : '-'}{formatRupiah(selectedMutasi.jumlah)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)' }}>
                      Nomor Bukti Kas
                    </div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '800',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      padding: '3px 10px',
                      borderRadius: '5px',
                      marginTop: '2px'
                    }}>
                      {selectedMutasi.no_bukti}
                    </div>
                  </div>
                </div>

                {/* Voucher Meta Grid */}
                <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', backgroundColor: '#ffffff' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>TANGGAL TRANSAKSI</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} color="#0284c7" />
                      <span>{selectedMutasi.tanggal ? String(selectedMutasi.tanggal).slice(0, 10) : '-'}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>REKENING BANK / KAS</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0284c7', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CreditCard size={13} />
                      <span>{selectedMutasi.kode_bank}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>KATEGORI MUTASI</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Tag size={13} color="#64748b" />
                      <span>{selectedMutasi.kategori}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>STATUS TRANSAKSI</div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#16a34a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} color="#16a34a" />
                      <span>Tercatat & Terverifikasi</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KETERANGAN CARD */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '16px 20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{
                  fontSize: '11.5px',
                  fontWeight: '800',
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <FileText size={14} color="#0284c7" />
                  <span>Keterangan & Catatan Transaksi</span>
                </div>
                <div style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: '#1e293b',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  minHeight: '80px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedMutasi.keterangan || 'Tidak ada catatan keterangan transaksi.'}
                </div>
              </div>

              {/* BOTTOM ACTION BUTTONS */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Kembali ke Daftar Mutasi
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenEdit(selectedMutasi);
                    }}
                    style={{
                      padding: '7px 18px',
                      borderRadius: '5px',
                      border: '1px solid #0284c7',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Edit Mutasi Ini</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL KELOLA KATEGORI MUTASI KAS (TAMBAH & EDIT)
          ======================================================== */}
      {isKategoriModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(2, 132, 199, 0.2)',
                  border: '1px solid rgba(2, 132, 199, 0.4)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Settings size={15} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                    Kelola Kategori Mutasi Kas
                  </h3>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '1px' }}>
                    Daftar kategori kas masuk & keluar ({activeCompany?.code || 'RSG'})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleCancelEditKategori();
                  setIsKategoriModalOpen(false);
                }}
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
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Form Input / Edit Kategori */}
              <form onSubmit={handleSaveKategori} style={{
                backgroundColor: editingKategoriId ? '#f0f9ff' : '#f8fafc',
                border: editingKategoriId ? '1px solid #7dd3fc' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: editingKategoriId ? '#0369a1' : '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {editingKategoriId ? '✏️ Edit Nama Kategori' : '➕ Tambah Kategori Baru'}
                  </span>
                  {editingKategoriId && (
                    <button
                      type="button"
                      onClick={handleCancelEditKategori}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '0 4px'
                      }}
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                      Nama Kategori <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Operasional & Packing"
                      value={kategoriForm.nama_kategori}
                      onChange={(e) => setKategoriForm({ ...kategoriForm, nama_kategori: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                      Digunakan Pada
                    </label>
                    <select
                      value={kategoriForm.jenis_mutasi}
                      onChange={(e) => setKategoriForm({ ...kategoriForm, jenis_mutasi: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="semua">Semua Mutasi (Masuk & Keluar)</option>
                      <option value="masuk">Hanya Kas Masuk (BKM)</option>
                      <option value="keluar">Hanya Kas Keluar (BKK)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    style={{
                      height: '34px',
                      padding: '0 14px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: editingKategoriId ? '#0284c7' : '#059669',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {editingKategoriId ? <Save size={13} /> : <Plus size={13} />}
                    <span>{editingKategoriId ? 'Simpan' : 'Tambah'}</span>
                  </button>
                </div>
              </form>

              {/* Table List Kategori */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#ffffff'
              }}>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#475569'
                }}>
                  <span>DAFTAR KATEGORI MUTASI ({kategoriList.length})</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Dapat diedit atau dihapus kapan saja</span>
                </div>

                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '10.5px', fontWeight: '800', textAlign: 'left' }}>
                        <th style={{ padding: '7px 10px', width: '38px', textAlign: 'center' }}>NO</th>
                        <th style={{ padding: '7px 10px' }}>NAMA KATEGORI</th>
                        <th style={{ padding: '7px 10px', width: '140px' }}>BERLAKU UNTUK</th>
                        <th style={{ padding: '7px 10px', width: '85px', textAlign: 'center' }}>AKSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kategoriList.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                            Belum ada kategori mutasi kas. Silakan tambah baru di atas.
                          </td>
                        </tr>
                      ) : (
                        kategoriList.map((kat, idx) => {
                          const isEditingThis = editingKategoriId === kat.id;
                          return (
                            <tr
                              key={kat.id || kat.nama_kategori}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                backgroundColor: isEditingThis ? '#f0f9ff' : 'transparent',
                                transition: 'background-color 0.15s'
                              }}
                            >
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: '700' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '8px 10px', fontWeight: '700', color: isEditingThis ? '#0284c7' : '#1e293b' }}>
                                {kat.nama_kategori}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor:
                                    kat.jenis_mutasi === 'masuk' ? '#ecfdf5' :
                                    kat.jenis_mutasi === 'keluar' ? '#fef2f2' : '#f1f5f9',
                                  color:
                                    kat.jenis_mutasi === 'masuk' ? '#047857' :
                                    kat.jenis_mutasi === 'keluar' ? '#b91c1c' : '#475569',
                                  border:
                                    kat.jenis_mutasi === 'masuk' ? '1px solid #a7f3d0' :
                                    kat.jenis_mutasi === 'keluar' ? '1px solid #fecaca' : '1px solid #e2e8f0'
                                }}>
                                  {kat.jenis_mutasi === 'masuk' ? 'Kas Masuk' :
                                   kat.jenis_mutasi === 'keluar' ? 'Kas Keluar' : 'Semua'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditKategori(kat)}
                                    title="Edit Kategori"
                                    style={{
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #cbd5e1',
                                      backgroundColor: '#ffffff',
                                      color: '#0284c7',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Edit3 size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKategori(kat)}
                                    title="Hapus Kategori"
                                    style={{
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fff1f2',
                                      color: '#e11d48',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <Trash2 size={11} />
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

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '10px 18px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => {
                  handleCancelEditKategori();
                  setIsKategoriModalOpen(false);
                }}
                style={{
                  padding: '7px 18px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Selesai / Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

