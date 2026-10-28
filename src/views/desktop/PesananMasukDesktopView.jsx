import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  RotateCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  X, 
  Layers, 
  Store, 
  Package, 
  Truck, 
  Calendar, 
  User, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

// Helper menerjemahkan status pesanan marketplace mentah ke label bahasa Indonesia yang ramah & rapi
function formatStatus(status) {
  if (!status) return { label: 'Perlu Diproses', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
  const s = String(status).toUpperCase().trim();
  
  if (s === 'COMPLETED' || s === 'SELESAI') {
    return { label: 'Selesai', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
  }
  if (s === 'READY_TO_SHIP' || s === 'SIAP DIKIRIM' || s === 'PROCESSED') {
    return { label: 'Siap Dikirim', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
  }
  if (s === 'TO_CONFIRM_RECEIVE' || s === 'SHIPPED' || s === 'DIKIRIM') {
    return { label: 'Dalam Pengiriman', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
  }
  if (s === 'UNPAID' || s === 'BELUM BAYAR') {
    return { label: 'Menunggu Pembayaran', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
  }
  if (s === 'CANCELLED' || s === 'DIBATALKAN' || s === 'IN_CANCEL') {
    return { label: 'Dibatalkan', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
  }
  if (s === 'TO_RETURN' || s === 'RETUR') {
    return { label: 'Retur / Pengembalian', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' };
  }
  if (s === 'AWAITING_SHIPMENT') {
    return { label: 'Perlu Dikirim', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
  }
  return { label: status, bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
}

export default function PesananMasukDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Filter States
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [activeFilterTab, setActiveFilterTab] = useState('semua');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Modal State
  const [detailOrder, setDetailOrder] = useState(null);

  // Listen to company change
  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  // Fetch orders from MySQL
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/marketplace/orders');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          setOrders(json.data);
          setIsLoading(false);
          return;
        }
      }
      setOrders([]);
    } catch (e) {
      console.warn('Gagal memuat pesanan:', e.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const handleOrdersUpdated = () => loadOrders();
    window.addEventListener('ordersUpdated', handleOrdersUpdated);
    return () => window.removeEventListener('ordersUpdated', handleOrdersUpdated);
  }, []);

  // Tarik semua pesanan dari seluruh toko aktif (Shopee & TikTok)
  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncMessage('Menghubungkan ke Shopee & TikTok Shop API...');
    try {
      const res = await fetch('/api/marketplace/orders/sync-all', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess(`Berhasil menarik ${json.totalSynced || 0} pesanan baru dari marketplace!`);
        await loadOrders();
      } else {
        throw new Error(json.message || 'Gagal sinkronisasi pesanan');
      }
    } catch (err) {
      toastError(`Gagal tarik pesanan: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  // Filter Company List
  const companyOrders = orders.filter(o => 
    !o.company_code || o.company_code === activeCompany.code
  );

  // Summary Counts
  const totalOrders = companyOrders.length;
  const countPerluKirim = companyOrders.filter(o => {
    const s = String(o.status || '').toUpperCase();
    return s === 'READY_TO_SHIP' || s === 'SIAP DIKIRIM' || s === 'PERLU DIPROSES' || s === 'AWAITING_SHIPMENT';
  }).length;
  const countKirim = companyOrders.filter(o => {
    const s = String(o.status || '').toUpperCase();
    return s === 'TO_CONFIRM_RECEIVE' || s === 'SHIPPED' || s === 'DIKIRIM';
  }).length;
  const countSelesai = companyOrders.filter(o => {
    const s = String(o.status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'SELESAI';
  }).length;
  const countTikTok = companyOrders.filter(o => o.channel === 'tiktok').length;
  const countShopee = companyOrders.filter(o => o.channel === 'shopee').length;

  // Filtered List
  const filteredOrders = companyOrders.filter(ord => {
    const s = String(ord.status || '').toUpperCase();

    // 1. Tab filter
    if (activeFilterTab === 'siap_kirim') {
      const isSiap = s === 'READY_TO_SHIP' || s === 'SIAP DIKIRIM' || s === 'PERLU DIPROSES' || s === 'AWAITING_SHIPMENT';
      if (!isSiap) return false;
    }
    if (activeFilterTab === 'dikirim') {
      const isKirim = s === 'TO_CONFIRM_RECEIVE' || s === 'SHIPPED' || s === 'DIKIRIM';
      if (!isKirim) return false;
    }
    if (activeFilterTab === 'selesai') {
      const isSelesai = s === 'COMPLETED' || s === 'SELESAI';
      if (!isSelesai) return false;
    }
    if (activeFilterTab === 'tiktok' && ord.channel !== 'tiktok') return false;
    if (activeFilterTab === 'shopee' && ord.channel !== 'shopee') return false;

    // 2. Dropdown filters
    if (filterChannel !== 'Semua' && ord.channel !== filterChannel) return false;
    if (filterStatus !== 'Semua') {
      const target = filterStatus.toUpperCase();
      if (target === 'SIAP DIKIRIM' && s !== 'READY_TO_SHIP' && s !== 'SIAP DIKIRIM' && s !== 'PERLU DIPROSES') return false;
      if (target === 'DALAM PENGIRIMAN' && s !== 'TO_CONFIRM_RECEIVE' && s !== 'SHIPPED' && s !== 'DIKIRIM') return false;
      if (target === 'SELESAI' && s !== 'COMPLETED' && s !== 'SELESAI') return false;
      if (target === 'DIBATALKAN' && s !== 'CANCELLED' && s !== 'DIBATALKAN') return false;
    }

    // 3. Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNo = (ord.no_pesanan || '').toLowerCase().includes(q);
      const matchBuyer = (ord.customerName || '').toLowerCase().includes(q);
      const matchShop = (ord.shopName || '').toLowerCase().includes(q);
      const matchResi = (ord.no_resi || '').toLowerCase().includes(q);
      const matchItems = (ord.items || []).some(it => 
        (it.nama_produk || '').toLowerCase().includes(q) ||
        (it.sku || '').toLowerCase().includes(q) ||
        (it.varian || '').toLowerCase().includes(q)
      );
      return matchNo || matchBuyer || matchShop || matchResi || matchItems;
    }

    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / entriesPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const changeTab = (tab) => {
    setActiveFilterTab(tab);
    setCurrentPage(1);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* 1. MASTER HEADER CARD */}
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
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(2, 132, 199, 0.15) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.2)'
          }}>
            <ShoppingBag size={21} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Pesanan Masuk Marketplace
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '1.5px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.18)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)'
              }}>
                {activeCompany.code}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
              Daftar seluruh transaksi pesanan pembeli langsung dari marketplace Shopee dan TikTok Shop.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            style={{
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '0 16px',
              borderRadius: '7px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCw size={14} className={isSyncing ? 'spin-icon' : ''} />
            <span>{isSyncing ? (syncMessage || 'Menarik...') : 'Tarik Pesanan Shopee & TikTok'}</span>
          </button>

          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            style={{
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              borderRadius: '7px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCw size={13} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        
        {/* Tab Semua */}
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
          <span>Semua Pesanan ({totalOrders})</span>
        </button>

        {/* Tab Siap Dikirim */}
        <button
          onClick={() => changeTab('siap_kirim')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'siap_kirim' ? '1px solid #2563eb' : '1px solid #bfdbfe',
            backgroundColor: activeFilterTab === 'siap_kirim' ? '#2563eb' : '#eff6ff',
            color: activeFilterTab === 'siap_kirim' ? '#ffffff' : '#1d4ed8',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Clock size={13} />
          <span>Siap Dikirim ({countPerluKirim})</span>
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
          <span>Dalam Pengiriman ({countKirim})</span>
        </button>

        {/* Tab Selesai */}
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
          <span>Selesai ({countSelesai})</span>
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

      {/* 3. FILTER CONTROLS BAR */}
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
            placeholder="Cari No Pesanan, Nama Pembeli, Toko, SKU, No Resi..."
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
          <option value="Siap Dikirim">Siap Dikirim</option>
          <option value="Dalam Pengiriman">Dalam Pengiriman</option>
          <option value="Selesai">Selesai</option>
          <option value="Dibatalkan">Dibatalkan</option>
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

      {/* 4. DATA TABLE PESANAN */}
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
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '45px', border: '1px solid #cbd5e1' }}>NO</th>
                <th style={{ padding: '8px 12px', width: '220px', border: '1px solid #cbd5e1' }}>NO PESANAN & SALURAN</th>
                <th style={{ padding: '8px 12px', width: '210px', border: '1px solid #cbd5e1' }}>TOKO & PEMBELI</th>
                <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>PRODUK & VARIAN</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px', border: '1px solid #cbd5e1' }}>TOTAL HARGA</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '150px', border: '1px solid #cbd5e1' }}>STATUS PESANAN</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '85px', border: '1px solid #cbd5e1' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                    <ShoppingBag size={38} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#334155' }}>Belum ada pesanan yang sesuai filter</div>
                    <div style={{ fontSize: '11.5px', marginTop: '3px', color: '#64748b' }}>
                      Klik tombol <b>"Tarik Pesanan Shopee & TikTok"</b> di atas untuk menarik transaksi terbaru dari akun marketplace Anda.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord, index) => {
                  const rowNumber = (currentPage - 1) * entriesPerPage + index + 1;
                  const isTikTok = ord.channel === 'tiktok';
                  const isShopee = ord.channel === 'shopee';
                  const statusInfo = formatStatus(ord.status);
                  const items = ord.items || [];
                  const firstItem = items[0] || null;
                  const extraCount = items.length > 1 ? items.length - 1 : 0;

                  return (
                    <tr
                      key={ord.id}
                      style={{
                        backgroundColor: '#ffffff',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      {/* NO */}
                      <td style={{ padding: '7px 8px', textAlign: 'center', color: '#64748b', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                        {rowNumber}
                      </td>

                      {/* NO PESANAN & SALURAN */}
                      <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: isTikTok ? '#0f172a' : isShopee ? '#fff3ee' : '#eff6ff',
                            color: isTikTok ? '#38bdf8' : isShopee ? '#ee4d2d' : '#0284c7',
                            border: isTikTok ? '1px solid #334155' : isShopee ? '1px solid #ffccb8' : '1px solid #bfdbfe'
                          }}>
                            {isTikTok ? 'TikTok Shop' : isShopee ? 'Shopee' : ord.channel}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            {ord.orderTime || ord.syncedAt || '-'}
                          </span>
                        </div>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px', fontFamily: 'monospace' }}>
                          {ord.no_pesanan}
                        </div>
                        {ord.no_resi && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            Resi: <code style={{ color: '#0284c7', fontWeight: '700' }}>{ord.no_resi}</code> ({ord.kurir || 'Kurir'})
                          </div>
                        )}
                      </td>

                      {/* TOKO & PEMBELI */}
                      <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px' }}>
                          {ord.shopName || '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <User size={11} color="#64748b" />
                          <span>{ord.customerName || 'Pembeli Marketplace'}</span>
                        </div>
                      </td>

                      {/* RINCIAN PRODUK & VARIAN (RANGKUMAN BERSIH) */}
                      <td style={{ padding: '7px 10px', border: '1px solid #cbd5e1' }}>
                        {firstItem ? (
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', lineHeight: '1.3' }}>
                              {firstItem.nama_produk}
                              <span style={{
                                marginLeft: '6px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#eff6ff',
                                color: '#0284c7',
                                fontSize: '10.5px',
                                fontWeight: '800',
                                border: '1px solid #bfdbfe'
                              }}>
                                x{firstItem.qty || 1}
                              </span>
                            </div>
                            
                            <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              SKU: <code>{firstItem.sku || '-'}</code> {firstItem.varian ? `• Varian: ${firstItem.varian}` : ''}
                            </div>

                            {extraCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setDetailOrder(ord)}
                                style={{
                                  marginTop: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f1f5f9',
                                  border: '1px dashed #cbd5e1',
                                  color: '#0284c7',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <span>+{extraCount} produk lainnya</span>
                                <ChevronRight size={10} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>1 Item Pesanan Marketplace</div>
                        )}
                      </td>

                      {/* TOTAL HARGA */}
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '12.5px', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(ord.totalPrice)}
                      </td>

                      {/* STATUS PESANAN */}
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2.5px 9px',
                          borderRadius: '5px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: statusInfo.bg,
                          color: statusInfo.color,
                          border: `1px solid ${statusInfo.border}`
                        }}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* AKSI (HANYA TOMBOL DETAIL) */}
                      <td style={{ padding: '7px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <button
                          type="button"
                          onClick={() => setDetailOrder(ord)}
                          title="Lihat Detail Lengkap Produk & Pesanan"
                          style={{
                            height: '26px',
                            padding: '0 9px',
                            borderRadius: '5px',
                            border: '1px solid #0284c7',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '700',
                            boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. FOOTER & PAGINATION */}
        <div style={{
          padding: '8px 14px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #cbd5e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '12px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <b>{filteredOrders.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> - <b>{Math.min(currentPage * entriesPerPage, filteredOrders.length)}</b> dari <b>{filteredOrders.length}</b> total pesanan
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                fontSize: '11.5px',
                fontWeight: '700'
              }}
            >
              Sebelumnya
            </button>

            <span style={{ padding: '0 8px', fontWeight: '800', color: '#0f172a' }}>
              Halaman {currentPage} dari {totalPages}
            </span>

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
                fontSize: '11.5px',
                fontWeight: '700'
              }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* 6. MODAL DETAIL LENGKAP PRODUK & PESANAN */}
      {detailOrder && (
        <div 
          onClick={() => setDetailOrder(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '680px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
              color: '#ffffff',
              padding: '12px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontWeight: '800', fontSize: '14.5px' }}>
                <ShoppingBag size={18} color="#38bdf8" />
                <span>Rincian Lengkap Pesanan Marketplace</span>
              </div>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 18px', maxHeight: '78vh', overflowY: 'auto' }}>
              
              {/* Order Info Banner */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Nomor Pesanan:</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                      {detailOrder.no_pesanan}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      padding: '2.5px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: detailOrder.channel === 'tiktok' ? '#0f172a' : '#fff3ee',
                      color: detailOrder.channel === 'tiktok' ? '#38bdf8' : '#ee4d2d',
                      border: detailOrder.channel === 'tiktok' ? '1px solid #334155' : '1px solid #ffccb8'
                    }}>
                      {detailOrder.channel === 'tiktok' ? 'TikTok Shop' : 'Shopee'}
                    </span>
                    <span style={{
                      padding: '2.5px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: formatStatus(detailOrder.status).bg,
                      color: formatStatus(detailOrder.status).color,
                      border: `1px solid ${formatStatus(detailOrder.status).border}`
                    }}>
                      {formatStatus(detailOrder.status).label}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', fontSize: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Toko Marketplace: </span>
                    <b style={{ color: '#0f172a' }}>{detailOrder.shopName || '-'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Nama Pembeli: </span>
                    <b style={{ color: '#0f172a' }}>{detailOrder.customerName || '-'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Waktu Transaksi: </span>
                    <b>{detailOrder.orderTime || detailOrder.syncedAt || '-'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Kurir Pengiriman: </span>
                    <b>{detailOrder.kurir || '-'}</b>
                  </div>
                  {detailOrder.no_resi && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b' }}>Nomor Resi: </span>
                      <code style={{ color: '#0284c7', fontWeight: '800', fontSize: '12.5px' }}>{detailOrder.no_resi}</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List Table ("di detail aja rincian produk nya") */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={15} color="#0284c7" />
                  <span>Daftar Produk yang Dipesan ({detailOrder.items ? detailOrder.items.length : 0} Item)</span>
                </div>
                
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                        <th style={{ padding: '7px 10px', width: '35px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>NO</th>
                        <th style={{ padding: '7px 10px', borderBottom: '1px solid #cbd5e1' }}>PRODUK & SKU</th>
                        <th style={{ padding: '7px 10px', width: '130px', borderBottom: '1px solid #cbd5e1' }}>VARIAN</th>
                        <th style={{ padding: '7px 10px', width: '60px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>QTY</th>
                        <th style={{ padding: '7px 10px', width: '110px', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>HARGA</th>
                        <th style={{ padding: '7px 10px', width: '120px', textAlign: 'right', borderBottom: '1px solid #cbd5e1' }}>SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items && detailOrder.items.length > 0 ? (
                        detailOrder.items.map((it, idx) => {
                          const itemQty = Number(it.qty) || 1;
                          const itemPrice = Number(it.harga) || 0;
                          const subtotal = itemQty * itemPrice;

                          return (
                            <tr key={idx} style={{ borderBottom: idx < detailOrder.items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ fontWeight: '700', color: '#0f172a', lineHeight: '1.3' }}>
                                  {it.nama_produk}
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                  SKU: <code style={{ color: '#0284c7' }}>{it.sku || '-'}</code>
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', color: '#475569', fontSize: '11.5px' }}>
                                {it.varian || '-'}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '800', color: '#0f172a' }}>
                                {itemQty}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>
                                {formatRupiah(itemPrice)}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', color: '#059669' }}>
                                {formatRupiah(subtotal > 0 ? subtotal : detailOrder.totalPrice)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>
                            Tidak ada rincian item produk
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary Card */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: '800', letterSpacing: '0.04em' }}>
                    TOTAL PEMBAYARAN PESANAN
                  </div>
                  <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                    Sudah termasuk biaya dan rincian transaksi marketplace
                  </div>
                </div>

                <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803d' }}>
                  {formatRupiah(detailOrder.totalPrice)}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 18px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                style={{
                  height: '32px',
                  padding: '0 18px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
