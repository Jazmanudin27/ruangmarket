import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Package,
  Truck,
  ArrowDownLeft,
  X,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  Clock,
  Layers,
  FileText,
  Eye,
  Plus
} from 'lucide-react';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

export default function ReturBarangDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [returns, setReturns] = useState([]);
  const [summary, setSummary] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('semua');
  const [filterChannel, setFilterChannel] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterCondition, setFilterCondition] = useState('Semua');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailRetur, setDetailRetur] = useState(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState(null);
  const [restockCondition, setRestockCondition] = useState('Bagus / Layak Jual (Restok)');
  const [restockNotes, setRestockNotes] = useState('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Modal Ajukan Retur Manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    no_pesanan: '',
    nama_pembeli: '',
    nama_toko: 'Shopee / TikTok',
    saluran: 'shopee',
    alasan_retur: '',
    no_resi_retur: '',
    kurir_retur: 'J&T Express',
    total_refund: '',
    catatan: ''
  });

  // Listen to company change
  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  // Fetch Returns
  const loadReturns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/marketplace/returns');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          setReturns(json.data);
          setSummary(json.summary || {});
          setIsLoading(false);
          return;
        }
      }
      setReturns([]);
    } catch (err) {
      console.warn('Gagal memuat data retur:', err.message);
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  // Sync Returns dari Marketplace
  const handleSyncReturns = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/marketplace/returns/sync', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess(json.message || 'Sinkronisasi retur selesai!');
        await loadReturns();
      } else {
        throw new Error(json.message || 'Gagal sinkronisasi data retur');
      }
    } catch (e) {
      toastError(`Gagal sync retur: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Buka Modal Restok
  const openRestockModal = (item) => {
    setRestockTarget(item);
    setRestockCondition('Bagus / Layak Jual (Restok)');
    setRestockNotes('');
    setIsRestockModalOpen(true);
  };

  // Submit Restock Barang ke Master Produk
  const handleConfirmRestock = async () => {
    if (!restockTarget) return;
    setIsSubmittingRestock(true);
    try {
      const res = await fetch(`/api/marketplace/returns/${encodeURIComponent(restockTarget.id)}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kondisi_barang: restockCondition,
          catatan: restockNotes,
          do_restock: restockCondition.includes('Layak') || restockCondition.includes('Bagus')
        })
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess(json.message || 'Barang berhasil diterima & stok fisik diupdate!');
        setIsRestockModalOpen(false);
        setRestockTarget(null);
        await loadReturns();
      } else {
        throw new Error(json.message || 'Gagal proses restok retur');
      }
    } catch (e) {
      toastError(`Gagal restok: ${e.message}`);
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Submit Ajukan Retur Manual
  const handleSubmitManual = async (e) => {
    e.preventDefault();
    if (!manualForm.no_pesanan.trim()) {
      toastError('Nomor pesanan wajib diisi');
      return;
    }
    try {
      const res = await fetch('/api/marketplace/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          company_code: activeCompany.code
        })
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess('Data retur berhasil disimpan!');
        setIsManualModalOpen(false);
        setManualForm({
          no_pesanan: '',
          nama_pembeli: '',
          nama_toko: 'Shopee / TikTok',
          saluran: 'shopee',
          alasan_retur: '',
          no_resi_retur: '',
          kurir_retur: 'J&T Express',
          total_refund: '',
          catatan: ''
        });
        await loadReturns();
      } else {
        throw new Error(json.message || 'Gagal menyimpan retur');
      }
    } catch (err) {
      toastError(`Error: ${err.message}`);
    }
  };

  // Filter Company List
  const companyReturns = returns.filter(r => 
    !r.company_code || r.company_code === activeCompany.code
  );

  // Summary Counts
  const totalReturns = companyReturns.length;
  const countMenunggu = companyReturns.filter(r => {
    const s = String(r.status || '').toUpperCase();
    return s === 'REQUESTED' || s === 'MENUNGGU DITERIMA' || s === 'AWAITING_RECEIVE';
  }).length;
  const countDikirim = companyReturns.filter(r => {
    const s = String(r.status || '').toUpperCase();
    return s === 'IN_TRANSIT' || s === 'DALAM PENGIRIMAN' || s === 'RETURNING';
  }).length;
  const countPerluCek = companyReturns.filter(r => {
    const s = String(r.status || '').toUpperCase();
    return s === 'RECEIVED' || s === 'PERLU CEK FISIK' || s === 'CHECKING';
  }).length;
  const countSelesai = companyReturns.filter(r => {
    const s = String(r.status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'SELESAI' || s === 'RESTOCKED' || r.is_restocked;
  }).length;
  const countTikTok = companyReturns.filter(r => String(r.saluran || '').toLowerCase() === 'tiktok').length;
  const countShopee = companyReturns.filter(r => String(r.saluran || '').toLowerCase() === 'shopee').length;

  // Filtered List
  const filteredReturns = companyReturns.filter(item => {
    const s = String(item.status || '').toUpperCase();
    const ch = String(item.saluran || '').toLowerCase();
    const cond = String(item.kondisi_barang || '').toLowerCase();

    // 1. Tab Filter
    if (activeFilterTab === 'menunggu') {
      if (s !== 'REQUESTED' && s !== 'MENUNGGU DITERIMA' && s !== 'AWAITING_RECEIVE') return false;
    }
    if (activeFilterTab === 'dikirim') {
      if (s !== 'IN_TRANSIT' && s !== 'DALAM PENGIRIMAN' && s !== 'RETURNING') return false;
    }
    if (activeFilterTab === 'cek_fisik') {
      if (s !== 'RECEIVED' && s !== 'PERLU CEK FISIK' && s !== 'CHECKING') return false;
    }
    if (activeFilterTab === 'selesai') {
      if (s !== 'COMPLETED' && s !== 'SELESAI' && s !== 'RESTOCKED' && !item.is_restocked) return false;
    }
    if (activeFilterTab === 'tiktok' && ch !== 'tiktok') return false;
    if (activeFilterTab === 'shopee' && ch !== 'shopee') return false;

    // 2. Dropdown Saluran
    if (filterChannel !== 'Semua' && ch !== filterChannel.toLowerCase()) return false;

    // 3. Dropdown Status
    if (filterStatus !== 'Semua') {
      const target = filterStatus.toUpperCase();
      if (target === 'MENUNGGU DITERIMA' && s !== 'REQUESTED' && s !== 'MENUNGGU DITERIMA') return false;
      if (target === 'DALAM PENGIRIMAN' && s !== 'IN_TRANSIT' && s !== 'DALAM PENGIRIMAN') return false;
      if (target === 'PERLU CEK KONDISI' && s !== 'RECEIVED' && s !== 'PERLU CEK FISIK') return false;
      if (target === 'SELESAI RESTOK' && s !== 'COMPLETED' && s !== 'SELESAI' && !item.is_restocked) return false;
      if (target === 'DITOLAK' && s !== 'REJECTED' && s !== 'DITOLAK') return false;
    }

    // 4. Dropdown Kondisi Fisik
    if (filterCondition !== 'Semua') {
      if (filterCondition === 'Bagus / Layak' && !cond.includes('bagus') && !cond.includes('layak')) return false;
      if (filterCondition === 'Rusak / Reject' && !cond.includes('rusak') && !cond.includes('reject')) return false;
      if (filterCondition === 'Belum Dicek' && cond !== '' && cond !== 'belum dicek') return false;
    }

    // 5. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNo = (item.no_pesanan || '').toLowerCase().includes(q);
      const matchBuyer = (item.nama_pembeli || '').toLowerCase().includes(q);
      const matchShop = (item.nama_toko || '').toLowerCase().includes(q);
      const matchResi = (item.no_resi_retur || '').toLowerCase().includes(q);
      const matchAlasan = (item.alasan_retur || '').toLowerCase().includes(q);
      const matchCatatan = (item.catatan || '').toLowerCase().includes(q);
      const matchSku = (item.sku || '').toLowerCase().includes(q);
      return matchNo || matchBuyer || matchShop || matchResi || matchAlasan || matchCatatan || matchSku;
    }

    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredReturns.length / entriesPerPage) || 1;
  const paginatedReturns = filteredReturns.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const changeTab = (tab) => {
    setActiveFilterTab(tab);
    setCurrentPage(1);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedReturns.map(o => o.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* 1. MASTER HEADER CARD (PERSIS DENGAN PESANAN MASUK) */}
      <div style={{
        background: 'linear-gradient(135deg, #090d16 0%, #0f172a 45%, #1e293b 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        padding: '12px 18px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.15) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171',
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.2)'
          }}>
            <RotateCcw size={21} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Retur & Pengembalian Barang
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '1.5px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(239, 68, 68, 0.18)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.35)'
              }}>
                {activeCompany.code}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
              Manajemen paket retur marketplace Shopee, TikTok Shop & restok fisik otomatis ke produk master.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSyncReturns}
            disabled={isSyncing}
            style={{
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 13px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={13} className={isSyncing ? 'spin-icon' : ''} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Cek Retur Marketplace'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            style={{
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Plus size={14} />
            <span>Catat Retur Baru</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER TABS (PERSIS DENGAN PESANAN MASUK) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        
        {/* Tab Semua Retur */}
        <button
          onClick={() => changeTab('semua')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'semua' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: activeFilterTab === 'semua' ? '#0284c7' : '#ffffff',
            color: activeFilterTab === 'semua' ? '#ffffff' : '#334155',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeFilterTab === 'semua' ? '0 2px 4px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <Layers size={13} />
          <span>Semua Retur ({totalReturns})</span>
        </button>

        {/* Tab Menunggu Diterima */}
        <button
          onClick={() => changeTab('menunggu')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'menunggu' ? '1px solid #d97706' : '1px solid #fde68a',
            backgroundColor: activeFilterTab === 'menunggu' ? '#d97706' : '#fffbeb',
            color: activeFilterTab === 'menunggu' ? '#ffffff' : '#b45309',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Clock size={13} />
          <span>Menunggu Diterima ({countMenunggu})</span>
        </button>

        {/* Tab Dalam Pengiriman */}
        <button
          onClick={() => changeTab('dikirim')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'dikirim' ? '1px solid #7c3aed' : '1px solid #ddd6fe',
            backgroundColor: activeFilterTab === 'dikirim' ? '#7c3aed' : '#f5f3ff',
            color: activeFilterTab === 'dikirim' ? '#ffffff' : '#6d28d9',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Truck size={13} />
          <span>Dalam Pengiriman ({countDikirim})</span>
        </button>

        {/* Tab Perlu Cek Fisik */}
        <button
          onClick={() => changeTab('cek_fisik')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'cek_fisik' ? '1px solid #2563eb' : '1px solid #bfdbfe',
            backgroundColor: activeFilterTab === 'cek_fisik' ? '#2563eb' : '#eff6ff',
            color: activeFilterTab === 'cek_fisik' ? '#ffffff' : '#1d4ed8',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <AlertTriangle size={13} />
          <span>Perlu Cek Fisik ({countPerluCek})</span>
        </button>

        {/* Tab Selesai Restok */}
        <button
          onClick={() => changeTab('selesai')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'selesai' ? '1px solid #059669' : '1px solid #bbf7d0',
            backgroundColor: activeFilterTab === 'selesai' ? '#059669' : '#f0fdf4',
            color: activeFilterTab === 'selesai' ? '#ffffff' : '#15803d',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <CheckCircle2 size={13} />
          <span>Selesai Restok ({countSelesai})</span>
        </button>

        {/* Tab TikTok Shop */}
        <button
          onClick={() => changeTab('tiktok')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'tiktok' ? '1px solid #0f172a' : '1px solid #cbd5e1',
            backgroundColor: activeFilterTab === 'tiktok' ? '#0f172a' : '#f8fafc',
            color: activeFilterTab === 'tiktok' ? '#38bdf8' : '#334155',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00f2fe' }} />
          <span>TikTok Shop ({countTikTok})</span>
        </button>

        {/* Tab Shopee */}
        <button
          onClick={() => changeTab('shopee')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'shopee' ? '1px solid #ee4d2d' : '1px solid #ffccb8',
            backgroundColor: activeFilterTab === 'shopee' ? '#ee4d2d' : '#fff3ee',
            color: activeFilterTab === 'shopee' ? '#ffffff' : '#d03b1e',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ee4d2d' }} />
          <span>Shopee ({countShopee})</span>
        </button>
      </div>

      {/* 3. FILTER CONTROLS BAR (PERSIS DENGAN PESANAN MASUK) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '8px 14px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari No Pesanan, Nama Pembeli, Toko, No Resi Retur, Alasan..."
            style={{
              width: '100%',
              padding: '6.5px 10px 6.5px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              outline: 'none',
              backgroundColor: '#f8fafc'
            }}
          />
        </div>

        {/* Select Saluran */}
        <select
          value={filterChannel}
          onChange={(e) => { setFilterChannel(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '6.5px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '130px'
          }}
        >
          <option value="Semua">Semua Saluran</option>
          <option value="shopee">Shopee</option>
          <option value="tiktok">TikTok Shop</option>
          <option value="offline">Offline / Manual</option>
        </select>

        {/* Select Status */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '6.5px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '150px'
          }}
        >
          <option value="Semua">Semua Status</option>
          <option value="Menunggu Diterima">Menunggu Diterima</option>
          <option value="Dalam Pengiriman">Dalam Pengiriman</option>
          <option value="Perlu Cek Kondisi">Perlu Cek Kondisi</option>
          <option value="Selesai Restok">Selesai Restok</option>
          <option value="Ditolak">Ditolak</option>
        </select>

        {/* Select Kondisi Fisik */}
        <select
          value={filterCondition}
          onChange={(e) => { setFilterCondition(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '6.5px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '140px'
          }}
        >
          <option value="Semua">Semua Kondisi</option>
          <option value="Bagus / Layak">Bagus / Layak Jual</option>
          <option value="Rusak / Reject">Rusak / Reject</option>
          <option value="Belum Dicek">Belum Dicek</option>
        </select>

        {/* Rows Per Page */}
        <select
          value={entriesPerPage}
          onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
          style={{
            padding: '6.5px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '105px'
          }}
        >
          <option value={10}>10 Baris</option>
          <option value={25}>25 Baris</option>
          <option value={50}>50 Baris</option>
          <option value={100}>100 Baris</option>
        </select>
      </div>

      {/* 4. DATA TABLE RETUR (STRUKTUR TABEL & BORDER IDENTIK DENGAN PESANAN MASUK) */}
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
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '38px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={paginatedReturns.length > 0 && paginatedReturns.every(o => selectedIds.includes(o.id))}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>PRODUK & PESANAN</th>
                <th style={{ padding: '8px 12px', width: '170px', border: '1px solid #cbd5e1' }}>TOKO & CHANNEL</th>
                <th style={{ padding: '8px 12px', width: '200px', border: '1px solid #cbd5e1' }}>ALASAN RETUR</th>
                <th style={{ padding: '8px 12px', width: '160px', border: '1px solid #cbd5e1' }}>TANGGAL PENGAJUAN</th>
                <th style={{ padding: '8px 12px', width: '180px', border: '1px solid #cbd5e1' }}>KURIR & RESI KEMBALI</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '160px', border: '1px solid #cbd5e1' }}>KONDISI & STATUS</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '135px', border: '1px solid #cbd5e1' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                    <RotateCcw size={38} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#334155' }}>Belum ada data retur barang</div>
                    <div style={{ fontSize: '11.5px', marginTop: '3px', color: '#64748b' }}>
                      Data retur otomatis ditarik saat pembeli mengajukan komplain/batal di Shopee atau TikTok Shop.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((item) => {
                  const isTikTok = String(item.saluran || '').toLowerCase() === 'tiktok';
                  const isShopee = String(item.saluran || '').toLowerCase() === 'shopee';
                  const isSelected = selectedIds.includes(item.id);
                  const isRestocked = Boolean(item.is_restocked);

                  // Status style badges
                  const s = String(item.status || 'MENUNGGU DITERIMA').toUpperCase();
                  let statusBg = '#fffbeb';
                  let statusColor = '#b45309';
                  let statusBorder = '#fde68a';

                  if (s === 'COMPLETED' || s === 'SELESAI' || s === 'RESTOCKED' || isRestocked) {
                    statusBg = '#f0fdf4';
                    statusColor = '#15803d';
                    statusBorder = '#bbf7d0';
                  } else if (s === 'IN_TRANSIT' || s === 'DALAM PENGIRIMAN') {
                    statusBg = '#f5f3ff';
                    statusColor = '#6d28d9';
                    statusBorder = '#ddd6fe';
                  } else if (s === 'RECEIVED' || s === 'PERLU CEK FISIK') {
                    statusBg = '#eff6ff';
                    statusColor = '#1d4ed8';
                    statusBorder = '#bfdbfe';
                  } else if (s === 'REJECTED' || s === 'DITOLAK') {
                    statusBg = '#fef2f2';
                    statusColor = '#b91c1c';
                    statusBorder = '#fecaca';
                  }

                  return (
                    <tr
                      key={item.id}
                      style={{
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      {/* 1. CHECKBOX */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* 2. PRODUK & PESANAN */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        {/* No Pesanan Link */}
                        <div style={{ marginBottom: '3px' }}>
                          <span
                            onClick={() => setDetailRetur(item)}
                            title="Klik untuk lihat rincian lengkap retur"
                            style={{
                              color: '#2563eb',
                              fontWeight: '800',
                              fontFamily: 'monospace',
                              fontSize: '12.5px',
                              cursor: 'pointer',
                              textDecoration: 'none'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {item.no_pesanan}
                          </span>
                        </div>

                        {/* Badges: Retur status & Restock */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: isRestocked ? '#ecfdf5' : '#fef2f2',
                            color: isRestocked ? '#059669' : '#dc2626',
                            border: isRestocked ? '1px solid #a7f3d0' : '1px solid #fecaca'
                          }}>
                            {isRestocked ? <CheckCircle2 size={10} /> : <RotateCcw size={10} />}
                            {isRestocked ? 'Sudah Restok' : 'Retur Barang'}
                          </span>

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #cbd5e1'
                          }}>
                            Buyer: <b>{item.nama_pembeli || 'Pelanggan'}</b>
                          </span>
                        </div>

                        {/* Product Summary */}
                        <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.3' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>
                            {item.sku || 'SKU-MASTER'} <span style={{ color: '#0284c7', fontWeight: '800', fontFamily: 'sans-serif' }}>x{item.qty || 1}</span>
                          </div>
                          {item.nama_produk && (
                            <div style={{ color: '#64748b', fontSize: '10.5px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                              {item.nama_produk}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. TOKO & CHANNEL */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px', marginBottom: '4px' }}>
                          {item.nama_toko || 'Toko Utama'}
                        </div>
                        <div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: isTikTok ? '#0f172a' : isShopee ? '#fff3ee' : '#f1f5f9',
                            color: isTikTok ? '#38bdf8' : isShopee ? '#ee4d2d' : '#475569',
                            border: isTikTok ? '1px solid #334155' : isShopee ? '1px solid #ffccb8' : '1px solid #cbd5e1'
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isTikTok ? '#00f2fe' : isShopee ? '#ee4d2d' : '#64748b'
                            }} />
                            {isTikTok ? 'TIKTOK SHOP' : isShopee ? 'SHOPEE' : 'OFFLINE'}
                          </span>
                        </div>
                      </td>

                      {/* 4. ALASAN RETUR */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          fontWeight: '700',
                          fontSize: '11px',
                          marginBottom: '3px'
                        }}>
                          {item.alasan_retur || 'Pengajuan Retur / Komplain'}
                        </div>
                        {item.catatan && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.3' }}>
                            "{item.catatan}"
                          </div>
                        )}
                      </td>

                      {/* 5. TANGGAL PENGAJUAN */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : '-'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) + ' WIB' : ''}
                        </div>
                      </td>

                      {/* 6. KURIR & RESI KEMBALI */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>
                          <Truck size={12} color="#64748b" />
                          <span>{item.kurir_retur || 'J&T / SPX Return'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#0f172a', fontWeight: '700', marginTop: '3px' }}>
                          <Package size={11} color="#0284c7" />
                          <code style={{ color: item.no_resi_retur ? '#0f172a' : '#94a3b8' }}>
                            {item.no_resi_retur || 'Resi Belum Ada'}
                          </code>
                        </div>
                      </td>

                      {/* 7. KONDISI & STATUS */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {/* Status Retur Badge */}
                        <div style={{ marginBottom: '4px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 9px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusBorder}`,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase'
                          }}>
                            {s.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Kondisi Fisik Badge */}
                        <div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: item.kondisi_barang ? '#f1f5f9' : '#fafafa',
                            color: item.kondisi_barang ? '#334155' : '#94a3b8',
                            border: '1px solid #cbd5e1'
                          }}>
                            {item.kondisi_barang || 'Belum Dicek'}
                          </span>
                        </div>
                      </td>

                      {/* 8. AKSI */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          {!isRestocked ? (
                            <button
                              type="button"
                              onClick={() => openRestockModal(item)}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '5px',
                                border: '1px solid #059669',
                                backgroundColor: '#059669',
                                color: '#ffffff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '700',
                                boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)'
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>Terima & Restok</span>
                            </button>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '700',
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              border: '1px solid #86efac'
                            }}>
                              <CheckCircle2 size={11} color="#16a34a" /> Restocked
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailRetur(item)}
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              fontSize: '10.5px',
                              fontWeight: '700'
                            }}
                          >
                            <Eye size={11} />
                            <span>Rincian</span>
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

        {/* 5. FOOTER & PAGINATION (IDENTIK DENGAN PESANAN MASUK) */}
        <div style={{
          padding: '8px 14px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #cbd5e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11.5px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <b>{filteredReturns.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> sampai <b>{Math.min(currentPage * entriesPerPage, filteredReturns.length)}</b> dari <b>{filteredReturns.length}</b> total retur
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                color: currentPage <= 1 ? '#94a3b8' : '#334155',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                transition: 'all 0.15s ease'
              }}
            >
              Sebelumnya
            </button>

            {/* Tombol Nomor Halaman */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span style={{ padding: '0 3px', color: '#94a3b8' }}>...</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    style={{
                      height: '28px',
                      minWidth: '28px',
                      padding: '0 6px',
                      borderRadius: '5px',
                      border: p === currentPage ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: p === currentPage ? '#0284c7' : '#ffffff',
                      color: p === currentPage ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: p === currentPage ? '800' : '600'
                    }}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#334155',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                transition: 'all 0.15s ease'
              }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* 6. MODAL TERIMA & RESTOK BARANG (CLEAN LIGHT THEME) */}
      {isRestockModalOpen && restockTarget && (
        <div
          onClick={() => setIsRestockModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  Penerimaan Retur & Restok Fisik
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px', fontSize: '12.5px', color: '#334155' }}>
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#f1f5f9',
                borderRadius: '6px',
                marginBottom: '14px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', fontSize: '13px' }}>
                  No. Pesanan: {restockTarget.no_pesanan}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                  Produk: <b>{restockTarget.sku || 'SKU Master'}</b> (Qty: <b>{restockTarget.qty || 1}</b>)
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Pembeli: {restockTarget.nama_pembeli || '-'} | Alasan: {restockTarget.alasan_retur || '-'}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '5px', color: '#0f172a' }}>
                  Pemeriksaan Kondisi Barang
                </label>
                <select
                  value={restockCondition}
                  onChange={(e) => setRestockCondition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="Bagus / Layak Jual (Restok)">Bagus / Layak Jual (Restok Otomatis ke Master Produk)</option>
                  <option value="Kemasan Rusak Tapi Barang Aman (Restok)">Kemasan Rusak Tapi Barang Aman (Restok Otomatis)</option>
                  <option value="Rusak / Cacat Pabrik (Jangan Restok)">Rusak / Cacat Pabrik (Masuk Afkir, Jangan Restok)</option>
                  <option value="Barang Hilang / Salah Kirim (Jangan Restok)">Barang Hilang / Salah Kirim (Jangan Restok)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '5px', color: '#0f172a' }}>
                  Catatan Penerimaan / Fisik
                </label>
                <textarea
                  rows={3}
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="Contoh: Barang segel utuh, barang dikembalikan ke rak A3..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: restockCondition.includes('Restok') ? '#ecfdf5' : '#fff1f2',
                border: restockCondition.includes('Restok') ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                fontSize: '11.5px',
                color: restockCondition.includes('Restok') ? '#065f46' : '#9f1239'
              }}>
                {restockCondition.includes('Restok') ? (
                  <span>✅ <b>Stok Fisik</b> pada produk master akan otomatis ditambah <b>+{restockTarget.qty || 1}</b> setelah Anda konfirmasi.</span>
                ) : (
                  <span>⚠️ Barang ditandai afkir/reject, <b>Stok Fisik</b> tidak akan ditambah.</span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingRestock}
                onClick={handleConfirmRestock}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#059669',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#ffffff',
                  cursor: isSubmittingRestock ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmittingRestock ? 'Memproses...' : 'Konfirmasi & Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DETAIL LENGKAP RETUR */}
      {detailRetur && (
        <div
          onClick={() => setDetailRetur(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '680px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={17} color="#0284c7" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                  {detailRetur.no_pesanan}
                </span>
                <span style={{
                  padding: '2px 9px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '800',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  border: '1px solid #bae6fd'
                }}>
                  {String(detailRetur.status || 'RETUR').toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailRetur(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '18px', fontSize: '12.5px', color: '#334155' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Informasi Pembeli & Toko
                  </div>
                  <div>Nama Pembeli: <b>{detailRetur.nama_pembeli || '-'}</b></div>
                  <div style={{ marginTop: '3px' }}>Toko: <b>{detailRetur.nama_toko || '-'}</b></div>
                  <div style={{ marginTop: '3px' }}>Saluran: <b>{String(detailRetur.saluran || 'SHOPEE').toUpperCase()}</b></div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Pengiriman Balik
                  </div>
                  <div>Kurir: <b>{detailRetur.kurir_retur || '-'}</b></div>
                  <div style={{ marginTop: '3px' }}>No. Resi: <code style={{ color: '#0284c7', fontWeight: '700' }}>{detailRetur.no_resi_retur || 'Belum Ada'}</code></div>
                  <div style={{ marginTop: '3px' }}>Pengembalian Dana: <b>{formatRupiah(detailRetur.total_refund)}</b></div>
                </div>
              </div>

              {/* Produk */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', fontWeight: '800', fontSize: '11px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  RINCIAN BARANG RETUR
                </div>
                <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{detailRetur.sku || 'SKU-MASTER'}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>{detailRetur.nama_produk || 'Produk Retur'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>Qty: {detailRetur.qty || 1}</div>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>{detailRetur.is_restocked ? 'Sudah Di-restok' : 'Belum Di-restok'}</div>
                  </div>
                </div>
              </div>

              {/* Alasan */}
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#92400e', marginBottom: '4px' }}>
                  ALASAN RETUR PEMBELI:
                </div>
                <div style={{ fontWeight: '700', color: '#78350f' }}>{detailRetur.alasan_retur || '-'}</div>
                {detailRetur.catatan && (
                  <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#92400e', fontStyle: 'italic' }}>
                    "{detailRetur.catatan}"
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              {!detailRetur.is_restocked && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailRetur;
                    setDetailRetur(null);
                    openRestockModal(target);
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Terima & Restok Sekarang
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailRetur(null)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL AJUKAN RETUR MANUAL */}
      {isManualModalOpen && (
        <div
          onClick={() => setIsManualModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  Catat Retur Baru Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitManual}>
              <div style={{ padding: '18px', fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px' }}>Nomor Pesanan *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.no_pesanan}
                    onChange={(e) => setManualForm({ ...manualForm, no_pesanan: e.target.value })}
                    placeholder="Contoh: 241029XXXXXX"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px' }}>Saluran</label>
                    <select
                      value={manualForm.saluran}
                      onChange={(e) => setManualForm({ ...manualForm, saluran: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="shopee">Shopee</option>
                      <option value="tiktok">TikTok Shop</option>
                      <option value="offline">Offline / Manual</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px' }}>Nama Toko</label>
                    <input
                      type="text"
                      value={manualForm.nama_toko}
                      onChange={(e) => setManualForm({ ...manualForm, nama_toko: e.target.value })}
                      placeholder="Nama toko"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px' }}>Nama Pembeli</label>
                  <input
                    type="text"
                    value={manualForm.nama_pembeli}
                    onChange={(e) => setManualForm({ ...manualForm, nama_pembeli: e.target.value })}
                    placeholder="Nama pelanggan"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px' }}>Alasan Retur</label>
                  <input
                    type="text"
                    value={manualForm.alasan_retur}
                    onChange={(e) => setManualForm({ ...manualForm, alasan_retur: e.target.value })}
                    placeholder="Contoh: Barang Rusak / Salah Warna"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px' }}>Kurir Pengembalian</label>
                    <input
                      type="text"
                      value={manualForm.kurir_retur}
                      onChange={(e) => setManualForm({ ...manualForm, kurir_retur: e.target.value })}
                      placeholder="J&T / SPX"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px' }}>No. Resi Pengembalian</label>
                    <input
                      type="text"
                      value={manualForm.no_resi_retur}
                      onChange={(e) => setManualForm({ ...manualForm, no_resi_retur: e.target.value })}
                      placeholder="Nomor resi return"
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: '700', marginBottom: '4px' }}>Catatan Tambahan</label>
                  <textarea
                    rows={2}
                    value={manualForm.catatan}
                    onChange={(e) => setManualForm({ ...manualForm, catatan: e.target.value })}
                    placeholder="Keterangan komplain pelanggan..."
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Simpan Retur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
