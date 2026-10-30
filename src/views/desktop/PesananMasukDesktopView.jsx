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
  ChevronRight,
  ChevronDown,
  Info,
  FileText,
  TrendingUp,
  ExternalLink
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

  // Filter & Sort States
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [activeFilterTab, setActiveFilterTab] = useState('semua');
  const [sortByDate, setSortByDate] = useState('desc'); // 'desc' (Terbaru) | 'asc' (Terlama)

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Selection & Modal State
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailOrder, setDetailOrder] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Helper Cetak Resi / Label Pengiriman Langsung dari Marketplace Resmi (PDF Asli)
  const handlePrintResi = (ord) => {
    if (!ord) return;
    const channel = String(ord.saluran || ord.channel || 'shopee').toLowerCase();
    const orderSn = ord.no_pesanan || ord.id;
    
    // 1. Jika ada ID order Laravel (ERP Aspartech), buka langsung URL PDF resi asli seperti di screenshot
    const targetId = ord.laravel_order_id || (typeof ord.id === 'number' || /^\d+$/.test(String(ord.id)) ? ord.id : null);
    if (targetId) {
      window.open(`https://erp.aspartech.com/orders/${targetId}/print`, '_blank');
      return;
    }

    // 2. Buka endpoint backend yang mengunduh dan menyajikan streaming PDF resmi langsung dari API marketplace
    const printUrl = `/api/marketplace/orders/print-label?order_sn=${encodeURIComponent(orderSn)}&channel=${encodeURIComponent(channel)}`;
    window.open(printUrl, '_blank');
  };

  // Helper Cetak Resi Masal (Batch Print) Langsung dari API Marketplace Resmi (PDF Asli)
  const handlePrintResiMasal = () => {
    if (!selectedIds || selectedIds.length === 0) {
      toastError('Pilih minimal 1 pesanan untuk dicetak resinya');
      return;
    }

    // Ambil order terpilih
    const targetOrders = orders.filter(o => selectedIds.includes(o.id));
    if (targetOrders.length === 0) {
      toastError('Pesanan yang dipilih tidak ditemukan');
      return;
    }

    // Kumpulkan no_pesanan / order_sn
    const orderSns = targetOrders.map(o => o.no_pesanan || o.id).filter(Boolean);
    if (orderSns.length === 0) {
      toastError('Nomor pesanan tidak valid');
      return;
    }

    // Buka endpoint batch print resmi dari API marketplace
    const batchUrl = `/api/marketplace/orders/batch-print-label?order_sns=${encodeURIComponent(orderSns.join(','))}`;
    window.open(batchUrl, '_blank');
  };

  // Helper Cetak Invoice Pesanan
  const handlePrintInvoice = () => {
    if (!detailOrder) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const items = detailOrder.items || [];
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${detailOrder.no_pesanan}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 800; color: #0284c7; }
          .meta { font-size: 11px; color: #64748b; line-height: 1.5; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
          .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
          .card-title { font-weight: 800; font-size: 11px; color: #475569; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f8fafc; text-align: left; padding: 8px; font-size: 11px; border-bottom: 1px solid #cbd5e1; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-box { display: flex; justify-content: flex-end; }
          .total-table { width: 320px; }
          .total-table td { padding: 4px 8px; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">INVOICE PESANAN MARKETPLACE</div>
            <div class="meta">No. Pesanan: <b>${detailOrder.no_pesanan}</b></div>
            <div class="meta">Toko: ${detailOrder.shopName || '-'} (${String(detailOrder.channel || 'SHOPEE').toUpperCase()})</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 14px;">${detailOrder.company_code || 'RSG'}</div>
            <div class="meta">Tanggal: ${detailOrder.orderTime || detailOrder.syncedAt || '-'}</div>
            <div class="meta">Resi: ${detailOrder.no_resi || '-'} (${detailOrder.kurir || 'SPX'})</div>
          </div>
        </div>
        <div class="grid">
          <div class="card">
            <div class="card-title">TUJUAN PENGIRIMAN</div>
            <div><b>${detailOrder.customerName || 'Pelanggan'}</b></div>
            <div style="color: #64748b;">${detailOrder.telepon || '*******13'}</div>
            <div style="margin-top: 4px; font-size: 11px;">${detailOrder.alamat || '******m, KAB. BINTAN, BINTAN TIMUR, KEPULAUAN RIAU, ID, 29151'}</div>
          </div>
          <div class="card">
            <div class="card-title">STATUS & PEMBAYARAN</div>
            <div>Metode: <b>${detailOrder.metode_bayar || 'Cash on Delivery'}</b></div>
            <div>Kurir: <b>${detailOrder.kurir || 'SPX Hemat'}</b></div>
            <div>Status: <b>${String(detailOrder.status || 'SHIPPED').toUpperCase()}</b></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;" class="text-center">NO</th>
              <th>PRODUK & SKU</th>
              <th>VARIAN</th>
              <th class="text-center" style="width: 50px;">QTY</th>
              <th class="text-right" style="width: 100px;">HARGA</th>
              <th class="text-right" style="width: 110px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><b>${it.nama_produk}</b><br><span style="font-size: 10px; color: #64748b;">SKU: ${it.sku || '-'}</span></td>
                <td>${it.varian || '-'}</td>
                <td class="text-center">${it.qty || 1}</td>
                <td class="text-right">${formatRupiah(it.harga || 0)}</td>
                <td class="text-right"><b>${formatRupiah((it.qty || 1) * (it.harga || 0))}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-box">
          <table class="total-table">
            <tr>
              <td>Total Pesanan:</td>
              <td class="text-right"><b>${formatRupiah(detailOrder.totalPrice)}</b></td>
            </tr>
          </table>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

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

  // Helper parsing timestamp pesanan untuk pengurutan tanggal yang presisi
  const getOrderTimestamp = (ord) => {
    if (ord.rawOrderTime) {
      const t = new Date(ord.rawOrderTime).getTime();
      if (!isNaN(t)) return t;
    }
    if (ord.orderTime) {
      // Format orderTime: 'DD/MM/YYYY HH:mm'
      const parts = String(ord.orderTime).split(' ');
      if (parts.length >= 2) {
        const dateParts = parts[0].split('/').map(Number);
        const timeParts = parts[1].split(':').map(Number);
        if (dateParts.length === 3) {
          const dt = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0] || 0, timeParts[1] || 0);
          if (!isNaN(dt.getTime())) return dt.getTime();
        }
      }
    }
    return 0;
  };

  // Urutkan pesanan masuk berdasarkan tanggal (default: terbaru -> terlama)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const timeA = getOrderTimestamp(a);
    const timeB = getOrderTimestamp(b);
    if (sortByDate === 'asc') {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedOrders.length / entriesPerPage) || 1;
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

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

        {/* Sort Tanggal */}
        <select
          value={sortByDate}
          onChange={(e) => { setSortByDate(e.target.value); setCurrentPage(1); }}
          title="Urutkan pesanan berdasarkan tanggal transaksi"
          style={{
            padding: '6.5px 10px',
            borderRadius: '6px',
            border: '1px solid #0284c7',
            fontSize: '12px',
            color: '#0369a1',
            fontWeight: '700',
            backgroundColor: '#f0f9ff',
            cursor: 'pointer',
            minWidth: '175px'
          }}
        >
          <option value="desc">Urutan: Tanggal Terbaru</option>
          <option value="asc">Urutan: Tanggal Terlama</option>
        </select>

        {/* Tombol Cetak Resi Masal dari Marketplace Asli */}
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handlePrintResiMasal}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            title="Cetak resi resmi gabungan langsung dari API marketplace untuk pesanan yang dicentang"
          >
            <Printer size={14} />
            <span>Cetak Resi Masal ({selectedIds.length})</span>
          </button>
        )}

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
              {sortedOrders.length === 0 ? (
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
                            <div 
                              style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}
                              title={firstItem.nama_produk ? `Nama Produk: ${firstItem.nama_produk}` : ''}
                            >
                              {(firstItem.sku || firstItem.kode_sku || firstItem.sku_marketplace || firstItem.seller_sku || firstItem.model_sku || firstItem.item_sku || firstItem.varian || '-')} <span style={{ color: '#0284c7', fontWeight: '800', fontFamily: 'sans-serif' }}>x{firstItem.qty || 1}</span>
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
                                <span>+{extraCount} SKU lainnya</span>
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
                          <code style={{ color: ord.no_resi ? '#0f172a' : '#94a3b8' }}>{ord.no_resi || 'Belum Ada Resi'}</code>
                        </div>
                      </td>

                      {/* 7. STATUS */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {(() => {
                          const statusRaw = String(ord.status || 'READY_TO_SHIP').toUpperCase();
                          
                          // Style badge status utama
                          let statusBg = '#fafafa';
                          let statusColor = '#595959';
                          let statusBorder = '#d9d9d9';
                          let isSiapKirim = false;
                          let isSudahKirim = false;

                          if (['READY_TO_SHIP', 'TO_SHIP', 'PROCESSED', 'SIAP DIKIRIM', 'PERLU DIPROSES', 'AWAITING_SHIPMENT'].includes(statusRaw)) {
                            statusBg = '#fff2e8';
                            statusColor = '#d4380d';
                            statusBorder = '#ffbb96';
                            isSiapKirim = true;
                          } else if (['SHIPPED', 'IN_TRANSIT', 'TO_RECEIVE', 'DIKIRIM', 'TO_CONFIRM_RECEIVE'].includes(statusRaw)) {
                            statusBg = '#e6f4ff';
                            statusColor = '#096dd9';
                            statusBorder = '#91caff';
                            isSudahKirim = true;
                          } else if (['COMPLETED', 'FINISHED', 'SELESAI', 'DELIVERED'].includes(statusRaw)) {
                            statusBg = '#f6ffed';
                            statusColor = '#389e0d';
                            statusBorder = '#b7eb8f';
                          } else if (['CANCELLED', 'BATAL', 'IN_CANCEL', 'DIBATALKAN'].includes(statusRaw)) {
                            statusBg = '#fff1f0';
                            statusColor = '#cf1322';
                            statusBorder = '#ffa39e';
                          }

                          // Status Cetak: hanya 'Sudah Print' jika memang sudah dicetak (status_cetak === 'Sudah Print')
                          const isPrinted = ord.status_cetak === 'Sudah Print';

                          return (
                            <>
                              {/* Main Status Badge */}
                              <div style={{ marginBottom: '3px' }}>
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
                                  {statusRaw.replace(/_/g, ' ')}
                                </span>
                              </div>

                              {/* Print Badge */}
                              <div>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  backgroundColor: isPrinted ? '#f0fdf4' : '#fafafa',
                                  color: isPrinted ? '#15803d' : '#888888',
                                  border: isPrinted ? '1px solid #bbf7d0' : '1px solid #dddddd'
                                }}>
                                  <Printer size={10} /> {isPrinted ? 'Sudah Print' : 'Belum Print'}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </td>

                      {/* 8. AKSI */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {(() => {
                          const statusRaw = String(ord.status || 'READY_TO_SHIP').toUpperCase();
                          const isSiapKirim = ['READY_TO_SHIP', 'TO_SHIP', 'PROCESSED', 'SIAP DIKIRIM', 'PERLU DIPROSES', 'AWAITING_SHIPMENT'].includes(statusRaw);
                          const isSudahKirim = ['SHIPPED', 'IN_TRANSIT', 'TO_RECEIVE', 'DIKIRIM', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'FINISHED', 'SELESAI', 'DELIVERED'].includes(statusRaw);

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              {/* Tombol Cetak Resi (Hanya muncul jika Siap Dikirim) */}
                              {isSiapKirim && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintResi(ord)}
                                  title="Cetak Resi / Label Pengiriman"
                                  style={{
                                    height: '24px',
                                    padding: '0 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#0284c7',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10.5px',
                                    fontWeight: '700'
                                  }}
                                >
                                  <Printer size={11} />
                                  <span>Cetak Resi</span>
                                </button>
                              )}

                              {/* Badge Sudah Kirim (Hanya jika pesanan sudah dikirim / selesai) */}
                              {isSudahKirim && (
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
                              )}
                            </div>
                          );
                        })()}
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
            Menampilkan <b>{sortedOrders.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> sampai <b>{Math.min(currentPage * entriesPerPage, sortedOrders.length)}</b> dari <b>{sortedOrders.length}</b> total pesanan
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

      {/* 6. MODAL DETAIL LENGKAP PRODUK & PESANAN (PERSIS DENGAN SCREENSHOT USER & DATA ASLI LARAVEL) */}
      {detailOrder && (() => {
        const subtotalPesanan = detailOrder.items && detailOrder.items.length > 0
          ? detailOrder.items.reduce((acc, it) => acc + ((Number(it.subtotal) || (Number(it.harga) || 0) * (Number(it.qty) || 1))), 0)
          : Number(detailOrder.totalPrice || 0);

        const ongkir = Number(detailOrder.ongkir || detailOrder.shipping_fee || 0);
        const platformFee = Number(detailOrder.fee_platform || 0);
        const freeShipping = Number(detailOrder.fee_free_shipping || 0);
        
        // Persis logika Laravel: $totalMarketplaceFee = abs($order->marketplace_fee); $layananTambahan = max(0, $totalMarketplaceFee - $platform - $freeShipping);
        const totalMarketplaceFee = Math.abs(Number(detailOrder.marketplace_fee || 0));
        const biayaLayanan = totalMarketplaceFee > 0
          ? Math.max(0, totalMarketplaceFee - platformFee - freeShipping)
          : (detailOrder.net_amount && Number(detailOrder.net_amount) > 0 
              ? Math.max(0, (subtotalPesanan + ongkir) - Number(detailOrder.net_amount) - platformFee - freeShipping)
              : Number(detailOrder.fee_service || 0));

        const estimasiPenghasilan = detailOrder.net_amount !== undefined && Number(detailOrder.net_amount) > 0
          ? Number(detailOrder.net_amount)
          : Math.max(0, subtotalPesanan + ongkir - (totalMarketplaceFee || biayaLayanan));

        const hppTotal = detailOrder.hpp_total !== undefined && Number(detailOrder.hpp_total) > 0
          ? Number(detailOrder.hpp_total)
          : (detailOrder.items && detailOrder.items.length > 0
              ? detailOrder.items.reduce((acc, it) => acc + (Number(it.hpp_subtotal) || (Number(it.hpp || 0) * (Number(it.qty) || 1))), 0)
              : 0);

        const netProfit = detailOrder.net_profit !== undefined && detailOrder.net_profit !== null
          ? Number(detailOrder.net_profit)
          : (estimasiPenghasilan - hppTotal);

        const marginPercent = detailOrder.profit_margin !== undefined && detailOrder.profit_margin !== null
          ? detailOrder.profit_margin
          : (estimasiPenghasilan > 0 ? ((netProfit / estimasiPenghasilan) * 100).toFixed(2) : '0');

        return (
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
              padding: isFullScreen ? '10px' : '16px',
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
                maxWidth: isFullScreen ? '98vw' : '880px',
                maxHeight: isFullScreen ? '97vh' : '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Top Header Bar */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={17} color="#0284c7" />
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                    {detailOrder.no_pesanan}
                  </span>
                  <span style={{
                    padding: '2px 9px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '800',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    letterSpacing: '0.04em'
                  }}>
                    {String(detailOrder.status || 'SHIPPED').toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={13} />
                    Cetak Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailOrder(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Sub-Header Bar (Informasi Rincian Pesanan + ID Toko) */}
              <div style={{
                padding: '8px 18px',
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '800', color: '#334155' }}>
                  <Info size={14} color="#0284c7" />
                  <span>Informasi Rincian Pesanan</span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  ID Toko: <span style={{ color: '#0f172a', fontWeight: '700', fontFamily: 'monospace' }}>{detailOrder.shop_id || detailOrder.no_pesanan}</span>
                </div>
              </div>

              {/* Modal Body (Scroll Mandiri) */}
              <div 
                style={{ 
                  padding: '16px 18px', 
                  overflowY: 'auto', 
                  overscrollBehavior: 'contain',
                  flex: 1,
                  backgroundColor: '#ffffff'
                }}
              >
                
                {/* 1. INFORMASI PENGIRIMAN & STATUS LOGISTIK (2 KOLOM) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.15fr 1fr',
                  gap: '24px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '14px',
                  backgroundColor: '#ffffff'
                }}>
                  {/* Kolom Kiri: Informasi Pengiriman */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      color: '#475569',
                      marginBottom: '12px',
                      letterSpacing: '0.04em'
                    }}>
                      <Truck size={14} color="#0284c7" />
                      <span>INFORMASI PENGIRIMAN</span>
                    </div>

                    <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '120px', padding: '4px 0', color: '#64748b', verticalAlign: 'top' }}>Nama Pembeli</td>
                          <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: '700' }}>
                            {detailOrder.customerName || detailOrder.nama_pembeli || '3kwg25p8z4'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b', verticalAlign: 'top' }}>No. Telepon</td>
                          <td style={{ padding: '4px 0', color: '#0f172a' }}>
                            {detailOrder.telepon || '*******13'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b', verticalAlign: 'top' }}>Alamat Pengiriman</td>
                          <td style={{ padding: '4px 0', color: '#334155', lineHeight: '1.4' }}>
                            {detailOrder.alamat || '******m, KAB. BINTAN, BINTAN TIMUR, KEPULAUAN RIAU, ID, 29151'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Kolom Kanan: Status & Logistik */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      color: '#475569',
                      marginBottom: '12px',
                      letterSpacing: '0.04em'
                    }}>
                      <Info size={14} color="#0284c7" />
                      <span>STATUS & LOGISTIK</span>
                    </div>

                    <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '110px', padding: '4px 0', color: '#64748b' }}>Toko / Platform</td>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                              {detailOrder.shopName || 'NUSANTARA SERAGAM'}
                            </span>
                            <span style={{
                              marginLeft: '6px',
                              padding: '1.5px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#475569',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: '800'
                            }}>
                              {String(detailOrder.channel || 'SHOPEE').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>Kurir</td>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              {detailOrder.kurir || 'SPX Hemat'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>No. Resi</td>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{
                              backgroundColor: '#fef9c3',
                              border: '1px solid #fef08a',
                              color: '#854d0e',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                              fontFamily: 'monospace'
                            }}>
                              {detailOrder.no_resi || ('SPXID' + String(detailOrder.no_pesanan || detailOrder.id).replace(/\D/g, '').slice(-11))}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>Tgl Pesanan</td>
                          <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: '600' }}>
                            {detailOrder.orderTime || detailOrder.syncedAt || '28 Oct 2026, 12:26'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>Tgl Cair (Net)</td>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>
                            Belum Cair / Selesai
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>Metode Bayar</td>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              {detailOrder.metode_bayar || 'Cash on Delivery'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. INFORMASI PEMBAYARAN (TABEL PRODUK + BREAKDOWN BIAYA) */}
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  overflow: 'hidden'
                }}>
                  {/* Header Box Pembayaran */}
                  <div style={{
                    padding: '9px 14px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                      <FileText size={14} color="#ef4444" />
                      <span>Informasi Pembayaran</span>
                    </div>
                    <span 
                      style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: '700', cursor: 'pointer' }}
                      onClick={() => alert(`Rincian Pesanan:\nNo: ${detailOrder.no_pesanan}\nTotal: ${formatRupiah(detailOrder.totalPrice)}`)}
                    >
                      Lihat rincian pesanan
                    </span>
                  </div>

                  {/* Table Produk yang Dipesan */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: '#64748b', fontSize: '11px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                        <th style={{ padding: '8px 12px', width: '35px', textAlign: 'center' }}>No.</th>
                        <th style={{ padding: '8px 12px' }}>Produk</th>
                        <th style={{ padding: '8px 12px', width: '110px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>Jumlah</th>
                        <th style={{ padding: '8px 12px', width: '110px', textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items && detailOrder.items.length > 0 ? (
                        detailOrder.items.map((it, idx) => {
                          const itemQty = Number(it.qty) || 1;
                          const itemPrice = Number(it.harga) || (subtotalPesanan / (detailOrder.items.length || 1));
                          const itemSubtotal = itemQty * itemPrice;

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', verticalAlign: 'middle' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {/* Thumbnail foto produk */}
                                  <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {it.foto_produk || it.image_url ? (
                                      <img src={it.foto_produk || it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <Package size={20} color="#94a3b8" />
                                    )}
                                  </div>

                                  <div>
                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '11.5px', lineHeight: '1.3' }}>
                                      {it.nama_produk || 'Baju Batik Sekolah (SMP) Motif Bunga Matahari Biru Lengan Panjang / Lengan Pendek (XL,Lengan Pendek)'}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                      Kode Variasi: {it.sku || it.varian || 'BB-BM-BIRU-LPK-XL'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>
                                {itemPrice.toLocaleString('id-ID')}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#0f172a', fontWeight: '600' }}>
                                {itemQty}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: '700' }}>
                                {itemSubtotal.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>1</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '44px', height: '44px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                                <Package size={20} color="#94a3b8" />
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '11.5px' }}>
                                  Baju Batik Sekolah (SMP) Motif Bunga Matahari Biru Lengan Panjang / Lengan Pendek (XL,Lengan Pendek)
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                  Kode Variasi: BB-BM-BIRU-LPK-XL
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>{subtotalPesanan.toLocaleString('id-ID')}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#0f172a', fontWeight: '600' }}>1</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: '700' }}>{subtotalPesanan.toLocaleString('id-ID')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Rincian Finansial Breakdown di Bawah Tabel */}
                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '5px',
                    fontSize: '11.5px',
                    color: '#475569'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Subtotal Pesanan</span>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Rp{subtotalPesanan.toLocaleString('id-ID')} <ChevronDown size={12} color="#94a3b8" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Estimasi Subtotal Ongkos Kirim</span>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Rp{ongkir.toLocaleString('id-ID')} <ChevronDown size={12} color="#94a3b8" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Biaya Platform <Info size={11} color="#94a3b8" />
                      </span>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Rp0 <ChevronDown size={12} color="#94a3b8" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Biaya Gratis Ongkir XTRA <Info size={11} color="#94a3b8" />
                      </span>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Rp0 <ChevronDown size={12} color="#94a3b8" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span>Subtotal Biaya Layanan Tambahan</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>
                        -Rp{biayaLayanan.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span>Retur / Refund</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>
                        Rp0
                      </span>
                    </div>

                    {/* Estimasi Total Penghasilan */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '380px',
                      paddingTop: '8px',
                      marginTop: '4px',
                      borderTop: '1px solid #e2e8f0',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>Estimasi Total Penghasilan</span>
                      <span style={{ fontWeight: '800', color: '#dc2626', fontSize: '15.5px' }}>
                        Rp{estimasiPenghasilan.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. ANALISIS PROFIT PESANAN (PERSIS DENGAN SCREENSHOT 2) */}
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#1e293b',
                    marginBottom: '10px'
                  }}>
                    <TrendingUp size={15} color="#0284c7" />
                    <span>Analisis Profit Pesanan</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Net Escrow (Penerimaan)</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>
                        Rp {estimasiPenghasilan.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>HPP Total Produk</span>
                      <span style={{ fontWeight: '700', color: '#dc2626' }}>
                        - Rp {hppTotal.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      marginTop: '4px',
                      borderTop: '1px solid #e2e8f0',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>Estimasi Net Profit</span>
                      <span style={{ fontWeight: '800', color: '#16a34a', fontSize: '12.5px' }}>
                        Rp {netProfit.toLocaleString('id-ID')} ({marginPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Sticky Footer */}
              <div style={{
                padding: '10px 18px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(prev => !prev)}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <ExternalLink size={13} />
                    {isFullScreen ? 'Perkecil' : 'Buka Halaman Penuh'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0284c7',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={13} />
                    Cetak Invoice
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailOrder(null)}
                  style={{
                    height: '30px',
                    padding: '0 20px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#64748b',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
