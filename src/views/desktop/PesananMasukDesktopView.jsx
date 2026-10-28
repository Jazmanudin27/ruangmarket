import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  RotateCw, 
  CheckCircle2, 
  Eye, 
  X, 
  Layers, 
  Truck, 
  Calendar, 
  Package, 
  Printer, 
  ChevronRight
} from 'lucide-react';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
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

  // Selection & Modal State
  const [selectedIds, setSelectedIds] = useState([]);
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

  // Lock body scroll saat modal detail terbuka agar halaman index tidak ikut ter-scroll
  useEffect(() => {
    if (detailOrder) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [detailOrder]);

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

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedOrders.map(o => o.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
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

        {/* Quick Page Nav di Bar Atas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{
              height: '28px',
              padding: '0 10px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage <= 1 ? '#f8fafc' : '#ffffff',
              color: currentPage <= 1 ? '#94a3b8' : '#334155',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              fontWeight: '700'
            }}
          >
            &lt; Prev
          </button>
          <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a', padding: '0 4px' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{
              height: '28px',
              padding: '0 10px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
              color: currentPage >= totalPages ? '#94a3b8' : '#334155',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              fontWeight: '700'
            }}
          >
            Next &gt;
          </button>
        </div>
      </div>

      {/* 4. DATA TABLE PESANAN (STRUKTUR KOLOM PERSIS DENGAN PERMINTAAN USER) */}
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
                    checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedIds.includes(o.id))}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>PRODUK & PESANAN</th>
                <th style={{ padding: '8px 12px', width: '180px', border: '1px solid #cbd5e1' }}>TOKO & CHANNEL</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px', border: '1px solid #cbd5e1' }}>DIBAYAR</th>
                <th style={{ padding: '8px 12px', width: '180px', border: '1px solid #cbd5e1' }}>TANGGAL & BATAS KIRIM</th>
                <th style={{ padding: '8px 12px', width: '180px', border: '1px solid #cbd5e1' }}>JASA KIRIM & RESI</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '140px', border: '1px solid #cbd5e1' }}>STATUS</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '125px', border: '1px solid #cbd5e1' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                    <ShoppingBag size={38} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#334155' }}>Belum ada pesanan yang sesuai filter</div>
                    <div style={{ fontSize: '11.5px', marginTop: '3px', color: '#64748b' }}>
                      Klik tombol <b>"Tarik Pesanan Shopee & TikTok"</b> di atas untuk menarik transaksi terbaru dari akun marketplace Anda.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => {
                  const isTikTok = ord.channel === 'tiktok';
                  const isShopee = ord.channel === 'shopee';
                  const items = ord.items || [];
                  const firstItem = items[0] || null;
                  const extraCount = items.length > 1 ? items.length - 1 : 0;
                  const isSelected = selectedIds.includes(ord.id);
                  const hasSPK = Boolean(ord.no_spk);

                  return (
                    <tr
                      key={ord.id}
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
                          onChange={() => toggleSelectOne(ord.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* 2. PRODUK & PESANAN */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        {/* No Pesanan Link */}
                        <div style={{ marginBottom: '3px' }}>
                          <span 
                            onClick={() => setDetailOrder(ord)}
                            title="Klik untuk lihat rincian lengkap pesanan"
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
                            {ord.no_pesanan}
                          </span>
                        </div>

                        {/* Badges: Ready & Belum SPK / Sudah SPK */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0'
                          }}>
                            <CheckCircle2 size={10} /> Ready
                          </span>

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: hasSPK ? '#eff6ff' : '#f8fafc',
                            color: hasSPK ? '#1d4ed8' : '#64748b',
                            border: hasSPK ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', border: '1.5px solid currentColor' }} />
                            {hasSPK ? `SPK: ${ord.no_spk}` : 'Belum SPK'}
                          </span>
                        </div>

                        {/* Product summary preview */}
                        {firstItem ? (
                          <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.3' }}>
                            <div style={{ fontWeight: '600' }}>
                              {firstItem.nama_produk} <span style={{ color: '#0284c7', fontWeight: '800' }}>x{firstItem.qty || 1}</span>
                            </div>
                            {extraCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setDetailOrder(ord)}
                                style={{
                                  marginTop: '2px',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: '#f1f5f9',
                                  border: '1px dashed #cbd5e1',
                                  color: '#0284c7',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <span>+{extraCount} produk lainnya</span>
                                <ChevronRight size={9} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>1 Item Pesanan Marketplace</div>
                        )}
                      </td>

                      {/* 3. TOKO & CHANNEL */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px', marginBottom: '4px' }}>
                          {ord.shopName || '-'}
                        </div>
                        <div>
                          {isShopee ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '800',
                              backgroundColor: '#ee4d2d',
                              color: '#ffffff'
                            }}>
                              <ShoppingBag size={10} /> Shopee
                            </span>
                          ) : isTikTok ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '800',
                              backgroundColor: '#0f172a',
                              color: '#38bdf8',
                              border: '1px solid #334155'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00f2fe' }} /> TikTok Shop
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '800',
                              backgroundColor: '#0284c7',
                              color: '#ffffff'
                            }}>
                              {ord.channel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. DIBAYAR */}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: '#0f172a', fontSize: '12.5px', fontFamily: 'monospace', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(ord.totalPrice)}
                      </td>

                      {/* 5. TANGGAL & BATAS KIRIM */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#334155', fontWeight: '600' }}>
                          <Calendar size={12} color="#64748b" />
                          <span>{ord.orderTime || ord.syncedAt || '-'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                          Batas: <b style={{ color: '#0f172a' }}>{ord.batasKirim || '-'}</b>
                        </div>
                      </td>

                      {/* 6. JASA KIRIM & RESI */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>
                          <Truck size={12} color="#64748b" />
                          <span>{ord.kurir || 'SPX Hemat'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#0f172a', fontWeight: '700', marginTop: '3px' }}>
                          <Package size={11} color="#0284c7" />
                          <code style={{ color: '#0f172a' }}>{ord.no_resi || ('SPXID' + String(ord.id).slice(-11))}</code>
                        </div>
                      </td>

                      {/* 7. STATUS */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {/* Main Status Badge */}
                        <div style={{ marginBottom: '3px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 9px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase'
                          }}>
                            {String(ord.status || 'SHIPPED').toUpperCase()}
                          </span>
                        </div>

                        {/* Print Badge */}
                        <div style={{ marginBottom: '2px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0'
                          }}>
                            <Printer size={10} /> {ord.status_cetak || 'Sudah Print'}
                          </span>
                        </div>

                        {/* Verified Badge */}
                        <div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0'
                          }}>
                            <CheckCircle2 size={10} /> {ord.status_verifikasi || 'Verified'}
                          </span>
                        </div>
                      </td>

                      {/* 8. AKSI */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          {/* Status Badge Sudah Kirim */}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #86efac'
                          }}>
                            <CheckCircle2 size={11} color="#16a34a" /> Sudah Kirim
                          </span>

                          {/* Tombol Detail */}
                          <button
                            type="button"
                            onClick={() => setDetailOrder(ord)}
                            title="Lihat Detail Pesanan"
                            style={{
                              height: '24px',
                              padding: '0 8px',
                              borderRadius: '4px',
                              border: '1px solid #0284c7',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              fontSize: '10.5px',
                              fontWeight: '700'
                            }}
                          >
                            <Eye size={11} />
                            <span>Detail</span>
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

        {/* 5. FOOTER & PAGINATION (GAYA MASTER PRODUK) */}
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
            Menampilkan <b>{filteredOrders.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> sampai <b>{Math.min(currentPage * entriesPerPage, filteredOrders.length)}</b> dari <b>{filteredOrders.length}</b> total pesanan
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
                      minWidth: '28px',
                      height: '28px',
                      padding: '0 6px',
                      borderRadius: '5px',
                      border: p === currentPage ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: p === currentPage ? '#0284c7' : '#ffffff',
                      color: p === currentPage ? '#ffffff' : '#334155',
                      fontWeight: '800',
                      fontSize: '11px',
                      cursor: 'pointer'
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

      {/* 6. MODAL DETAIL LENGKAP PRODUK & PESANAN (TERISOLASI DARI SCROLL INDEX) */}
      {detailOrder && (
        <div 
          onClick={() => setDetailOrder(null)}
          onWheel={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
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
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              flexShrink: 0
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

            {/* Modal Body (Scroll hanya di dalam modal) */}
            <div 
              style={{ 
                padding: '16px 18px', 
                overflowY: 'auto', 
                overscrollBehavior: 'contain',
                flex: 1 
              }}
            >
              
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
                      backgroundColor: detailOrder.channel === 'tiktok' ? '#0f172a' : '#ee4d2d',
                      color: detailOrder.channel === 'tiktok' ? '#38bdf8' : '#ffffff'
                    }}>
                      {detailOrder.channel === 'tiktok' ? 'TikTok Shop' : 'Shopee'}
                    </span>
                    <span style={{
                      padding: '2.5px 8px',
                      borderRadius: '12px',
                      fontSize: '10.5px',
                      fontWeight: '800',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe'
                    }}>
                      {String(detailOrder.status || 'SHIPPED').toUpperCase()}
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
                    <span style={{ color: '#64748b' }}>Batas Kirim: </span>
                    <b style={{ color: '#0f172a' }}>{detailOrder.batasKirim || '-'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Kurir: </span>
                    <b>{detailOrder.kurir || 'SPX Hemat'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Nomor Resi: </span>
                    <code style={{ color: '#0284c7', fontWeight: '800', fontSize: '12px' }}>{detailOrder.no_resi || ('SPXID' + String(detailOrder.id).slice(-11))}</code>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
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
