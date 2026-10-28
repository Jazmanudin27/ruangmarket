import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  RotateCw, 
  Scissors, 
  Clock, 
  CheckCircle, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  Trash2, 
  X, 
  CheckSquare, 
  Layers, 
  Boxes, 
  Store, 
  Package, 
  Truck, 
  Calendar, 
  User, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

const SPK_STORAGE_KEY = 'ruangmarket_spk_v2';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

export default function PesananMasukDesktopView({ onNavigate }) {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Filter States
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterSPK, setFilterSPK] = useState('Semua');
  const [activeFilterTab, setActiveFilterTab] = useState('semua');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Selection & Modal States
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
  }, []);

  // Tarik semua pesanan dari seluruh toko aktif (Shopee & TikTok)
  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncMessage('Menghubungkan ke Shopee & TikTok Shop API...');
    try {
      const res = await fetch('/api/marketplace/orders/sync-all', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess(`Berhasil menarik ${json.totalSynced || 0} pesanan dari marketplace ke Database!`);
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
  const countPerluProses = companyOrders.filter(o => o.status === 'Perlu Diproses' || o.status === 'UNPAID' || o.status === 'AWAITING_SHIPMENT').length;
  const countBelumSPK = companyOrders.filter(o => !o.no_spk).length;
  const countAdaSPK = companyOrders.filter(o => Boolean(o.no_spk)).length;
  const countTikTok = companyOrders.filter(o => o.channel === 'tiktok').length;
  const countShopee = companyOrders.filter(o => o.channel === 'shopee').length;

  // Filtered List
  const filteredOrders = companyOrders.filter(ord => {
    const hasSpk = Boolean(ord.no_spk);
    const isPerluProses = ord.status === 'Perlu Diproses' || ord.status === 'UNPAID' || ord.status === 'AWAITING_SHIPMENT';

    // 1. Tab filter
    if (activeFilterTab === 'perlu_proses' && !isPerluProses) return false;
    if (activeFilterTab === 'belum_spk' && hasSpk) return false;
    if (activeFilterTab === 'ada_spk' && !hasSpk) return false;
    if (activeFilterTab === 'tiktok' && ord.channel !== 'tiktok') return false;
    if (activeFilterTab === 'shopee' && ord.channel !== 'shopee') return false;

    // 2. Dropdown filters
    if (filterChannel !== 'Semua' && ord.channel !== filterChannel) return false;
    if (filterStatus !== 'Semua' && ord.status !== filterStatus) return false;
    if (filterSPK === 'Belum Ada SPK' && hasSpk) return false;
    if (filterSPK === 'Sudah Ada SPK' && !hasSpk) return false;

    // 3. Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNo = (ord.no_pesanan || '').toLowerCase().includes(q);
      const matchBuyer = (ord.customerName || '').toLowerCase().includes(q);
      const matchShop = (ord.shopName || '').toLowerCase().includes(q);
      const matchSpk = (ord.no_spk || '').toLowerCase().includes(q);
      const matchResi = (ord.no_resi || '').toLowerCase().includes(q);
      const matchItems = (ord.items || []).some(it => 
        (it.nama_produk || '').toLowerCase().includes(q) ||
        (it.sku || '').toLowerCase().includes(q) ||
        (it.varian || '').toLowerCase().includes(q)
      );
      return matchNo || matchBuyer || matchShop || matchSpk || matchResi || matchItems;
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

  // Toggle selection
  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPage = () => {
    const pageIds = paginatedOrders.map(o => o.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Konversi Pesanan Tunggal ke SPK Produksi
  const handleCreateSPK = async (order) => {
    const defaultSpkId = `SPK-${(order.channel || 'ORD').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const confirmed = await showConfirm(
      'Buat SPK Produksi?',
      `Buat SPK Jahit & Potong otomatis untuk pesanan "${order.no_pesanan}" (${order.shopName})?`,
      'Ya, Buat SPK',
      'Batal'
    );
    if (!confirmed) return;

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const items = (order.items && order.items.length > 0) ? order.items : [
        {
          id: `item-${Date.now()}`,
          nama_produk: `Pesanan ${order.shopName}`,
          sku: 'RSG-ORD-01',
          satuan: 'PCS',
          qty: 1,
          harga: order.totalPrice || 0,
          varian: 'Standar'
        }
      ];

      const newBatch = {
        id: Date.now(),
        company_code: activeCompany.code || 'RSG',
        kode_produksi: order.no_pesanan,
        nama_batch: `Pesanan ${order.shopName} - ${order.customerName}`,
        tanggal_mulai: dateStr,
        target_selesai: dateStr,
        status: 'Dalam Proses',
        catatan: `Pesanan otomatis dari ${order.channel === 'tiktok' ? 'TikTok Shop' : 'Shopee'} (${order.shopName}) - No Pesanan: ${order.no_pesanan}`,
        items: items.map((it, idx) => ({
          id: `spk-item-${Date.now()}-${idx}`,
          no_spk: `${defaultSpkId}-${idx + 1}`,
          nama_spk: `SPK Jahit #${defaultSpkId}-${idx + 1}`,
          kategori_spk: 'Jahit',
          produk_id: it.item_id || idx + 1,
          nama_produk: it.nama_produk || 'Produk Pesanan',
          varian: it.varian || 'Standar',
          tipe_set: 'Single',
          target_qty: Number(it.qty) || 1,
          estimasi_kain_meter: 2.5,
          biaya_jasa: 35000,
          catatan: `Item SKU: ${it.sku || '-'}`
        }))
      };

      // Simpan ke localStorage SPK
      const savedSPK = localStorage.getItem(SPK_STORAGE_KEY);
      const spkList = savedSPK ? JSON.parse(savedSPK) : [];
      localStorage.setItem(SPK_STORAGE_KEY, JSON.stringify([newBatch, ...spkList]));
      window.dispatchEvent(new Event('storage'));

      // Update di database MySQL
      await fetch('/api/marketplace/orders/update-spk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [order.id], no_spk: defaultSpkId, status_pesanan: 'Sedang Diproduksi' })
      });

      // Update state
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, no_spk: defaultSpkId, status: 'Sedang Diproduksi' } : o));
      toastSuccess(`SPK [${defaultSpkId}] berhasil dibuat & terhubung ke pesanan!`);

      if (onNavigate) {
        const jump = await showConfirm(
          'Buka SPK Produksi?',
          `SPK baru [${defaultSpkId}] telah tersimpan. Ingin membuka halaman SPK Produksi sekarang?`,
          'Buka Halaman SPK',
          'Tetap di Pesanan Masuk'
        );
        if (jump) onNavigate('spk');
      }
    } catch (err) {
      toastError(`Gagal membuat SPK: ${err.message}`);
    }
  };

  // Konversi Pesanan Masal ke SPK Produksi
  const handleBatchCreateSPK = async () => {
    const unassigned = orders.filter(o => selectedIds.includes(o.id) && !o.no_spk);
    if (unassigned.length === 0) {
      toastError('Semua pesanan terpilih sudah memiliki SPK Produksi!');
      return;
    }

    const confirmed = await showConfirm(
      'Buat SPK Masal?',
      `Buat SPK Produksi (Jahit & Potong) untuk ${unassigned.length} pesanan terpilih sekaligus?`,
      'Ya, Buat SPK Masal',
      'Batal'
    );
    if (!confirmed) return;

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const savedSPK = localStorage.getItem(SPK_STORAGE_KEY);
      const spkList = savedSPK ? JSON.parse(savedSPK) : [];

      const newBatches = unassigned.map((ord, idx) => {
        const spkId = `SPK-${(ord.channel || 'ORD').toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const items = (ord.items && ord.items.length > 0) ? ord.items : [
          {
            id: `item-${Date.now()}-${idx}`,
            nama_produk: `Pesanan ${ord.shopName}`,
            sku: 'RSG-ORD-01',
            satuan: 'PCS',
            qty: 1,
            harga: ord.totalPrice || 0,
            varian: 'Standar'
          }
        ];

        return {
          id: Date.now() + idx,
          company_code: activeCompany.code || 'RSG',
          kode_produksi: ord.no_pesanan,
          nama_batch: `Pesanan ${ord.shopName} - ${ord.customerName}`,
          tanggal_mulai: dateStr,
          target_selesai: dateStr,
          status: 'Dalam Proses',
          spk_number: spkId,
          catatan: `Pesanan otomatis dari ${ord.channel === 'tiktok' ? 'TikTok Shop' : 'Shopee'} (${ord.shopName}) - No Pesanan: ${ord.no_pesanan}`,
          items: items.map((it, iIdx) => ({
            id: `spk-item-${Date.now()}-${idx}-${iIdx}`,
            no_spk: `${spkId}-${iIdx + 1}`,
            nama_spk: `SPK Jahit #${spkId}-${iIdx + 1}`,
            kategori_spk: 'Jahit',
            produk_id: it.item_id || iIdx + 1,
            nama_produk: it.nama_produk || 'Produk Pesanan',
            varian: it.varian || 'Standar',
            tipe_set: 'Single',
            target_qty: Number(it.qty) || 1,
            estimasi_kain_meter: 2.5,
            biaya_jasa: 35000,
            catatan: `Item SKU: ${it.sku || '-'}`
          }))
        };
      });

      // Simpan ke localStorage SPK
      localStorage.setItem(SPK_STORAGE_KEY, JSON.stringify([...newBatches, ...spkList]));
      window.dispatchEvent(new Event('storage'));

      // Update di database MySQL
      for (const b of newBatches) {
        await fetch('/api/marketplace/orders/update-spk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [b.kode_produksi], no_spk: b.spk_number, status_pesanan: 'Sedang Diproduksi' })
        }).catch(() => {});
      }

      await loadOrders();
      setSelectedIds([]);
      toastSuccess(`Berhasil membuat ${newBatches.length} SPK Produksi!`);
    } catch (err) {
      toastError(`Gagal membuat SPK masal: ${err.message}`);
    }
  };

  // Hapus pesanan dari database
  const handleDeleteOrder = async (order) => {
    const confirmed = await showConfirm(
      'Hapus Pesanan?',
      `Hapus pesanan "${order.no_pesanan}" (${order.shopName}) dari daftar?`,
      'Ya, Hapus',
      'Batal'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/marketplace/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== order.id));
        toastSuccess('Pesanan berhasil dihapus');
      } else {
        throw new Error('Gagal menghapus pesanan di server');
      }
    } catch (err) {
      toastError(err.message);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* 1. MASTER HEADER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #090d16 0%, #0f172a 45%, #1e293b 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        padding: '12px 16px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '6px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            flexShrink: 0
          }}>
            <ShoppingBag size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Pesanan Masuk Marketplace (Shopee & TikTok Shop)
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '1px 7px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)'
              }}>
                {activeCompany.code}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              Daftar seluruh transaksi pesanan pembeli dari marketplace Shopee dan TikTok Shop yang siap diproduksi dan dikirim.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncing}
            style={{
              height: '30px',
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
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCw size={13} className={isSyncing ? 'spin-icon' : ''} />
            <span>{isSyncing ? (syncMessage || 'Menarik...') : 'Tarik Pesanan Shopee & TikTok'}</span>
          </button>

          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RotateCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
        
        {/* Tab Semua */}
        <button
          onClick={() => changeTab('semua')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'semua' ? '1px solid #0284c7' : '1px solid #bfdbfe',
            backgroundColor: activeFilterTab === 'semua' ? '#0284c7' : '#eff6ff',
            color: activeFilterTab === 'semua' ? '#ffffff' : '#1d4ed8',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Layers size={13} />
          <span>Semua Pesanan ({totalOrders})</span>
        </button>

        {/* Tab Perlu Diproses */}
        <button
          onClick={() => changeTab('perlu_proses')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'perlu_proses' ? '1px solid #ea580c' : '1px solid #fed7aa',
            backgroundColor: activeFilterTab === 'perlu_proses' ? '#ea580c' : '#fff7ed',
            color: activeFilterTab === 'perlu_proses' ? '#ffffff' : '#c2410c',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Clock size={13} />
          <span>Perlu Diproses ({countPerluProses})</span>
        </button>

        {/* Tab Belum Ada SPK */}
        <button
          onClick={() => changeTab('belum_spk')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'belum_spk' ? '1px solid #e11d48' : '1px solid #fecdd3',
            backgroundColor: activeFilterTab === 'belum_spk' ? '#e11d48' : '#fff1f2',
            color: activeFilterTab === 'belum_spk' ? '#ffffff' : '#be123c',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <AlertCircle size={13} />
          <span>Belum Ada SPK ({countBelumSPK})</span>
        </button>

        {/* Tab Sudah Ada SPK */}
        <button
          onClick={() => changeTab('ada_spk')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'ada_spk' ? '1px solid #059669' : '1px solid #bbf7d0',
            backgroundColor: activeFilterTab === 'ada_spk' ? '#059669' : '#f0fdf4',
            color: activeFilterTab === 'ada_spk' ? '#ffffff' : '#15803d',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Scissors size={13} />
          <span>Sudah Ada SPK ({countAdaSPK})</span>
        </button>

        {/* Tab TikTok Shop */}
        <button
          onClick={() => changeTab('tiktok')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'tiktok' ? '1px solid #0f172a' : '1px solid #cbd5e1',
            backgroundColor: activeFilterTab === 'tiktok' ? '#0f172a' : '#f8fafc',
            color: activeFilterTab === 'tiktok' ? '#ffffff' : '#334155',
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
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
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
        padding: '8px 12px',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari No Pesanan, Nama Pembeli, Toko, SKU, No Resi..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
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
          <option value="Semua">Semua Saluran</option>
          <option value="shopee">Shopee</option>
          <option value="tiktok">TikTok Shop</option>
        </select>

        {/* Select Status */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
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
          <option value="Semua">Semua Status</option>
          <option value="Perlu Diproses">Perlu Diproses</option>
          <option value="Sedang Diproduksi">Sedang Diproduksi</option>
          <option value="Siap Dikirim">Siap Dikirim</option>
          <option value="Selesai">Selesai</option>
          <option value="Dibatalkan">Dibatalkan</option>
        </select>

        {/* Select SPK */}
        <select
          value={filterSPK}
          onChange={(e) => { setFilterSPK(e.target.value); setCurrentPage(1); }}
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
          <option value="Semua">Semua Status SPK</option>
          <option value="Belum Ada SPK">Belum Ada SPK</option>
          <option value="Sudah Ada SPK">Sudah Ada SPK</option>
        </select>

        {/* Rows Per Page */}
        <select
          value={entriesPerPage}
          onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
          style={{
            padding: '6px 10px',
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

      {/* 4. BATCH ACTION BAR (KETIKA ADA PESANAN DICENTANG) */}
      {selectedIds.length > 0 && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #93c5fd',
          borderRadius: '8px',
          padding: '8px 14px',
          marginBottom: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          boxShadow: '0 2px 6px rgba(2, 132, 199, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', color: '#1e40af' }}>
            <CheckSquare size={16} color="#0284c7" />
            <span>{selectedIds.length} pesanan terpilih</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Tombol Buat SPK Masal */}
            <button
              type="button"
              onClick={handleBatchCreateSPK}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)'
              }}
            >
              <Scissors size={13} />
              <span>Buat SPK Produksi Masal</span>
            </button>

            {/* Tombol Batal */}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                height: '28px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#64748b',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <X size={13} />
              <span>Batal</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. DATA TABLE PESANAN */}
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
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '36px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedIds.includes(o.id))}
                    onChange={toggleSelectAllPage}
                    style={{ cursor: 'pointer' }}
                    title="Pilih Semua di Halaman Ini"
                  />
                </th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '45px', border: '1px solid #cbd5e1' }}>NO</th>
                <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>NO PESANAN & SALURAN</th>
                <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>TOKO & PEMBELI</th>
                <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>RINCIAN PRODUK & VARIAN</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>TOTAL HARGA</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>STATUS PESANAN</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>STATUS SPK PRODUKSI</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '120px', border: '1px solid #cbd5e1' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                    <ShoppingBag size={34} color="#cbd5e1" style={{ marginBottom: '6px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#334155' }}>Belum ada pesanan masuk</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                      Klik tombol <b>"Tarik Pesanan Shopee & TikTok"</b> di atas untuk menyinkronkan transaksi terbaru dari toko Anda.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord, index) => {
                  const rowNumber = (currentPage - 1) * entriesPerPage + index + 1;
                  const isSelected = selectedIds.includes(ord.id);
                  const isTikTok = ord.channel === 'tiktok';
                  const isShopee = ord.channel === 'shopee';
                  const hasSPK = Boolean(ord.no_spk);

                  return (
                    <tr
                      key={ord.id}
                      style={{
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(ord.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* NO */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                        {rowNumber}
                      </td>

                      {/* NO PESANAN & SALURAN */}
                      <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
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
                            Resi: <code style={{ color: '#0284c7' }}>{ord.no_resi}</code> ({ord.kurir || 'Kurir'})
                          </div>
                        )}
                      </td>

                      {/* TOKO & PEMBELI */}
                      <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px' }}>
                          {ord.shopName || '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <User size={11} color="#64748b" />
                          <span>{ord.customerName || 'Pembeli Marketplace'}</span>
                        </div>
                      </td>

                      {/* RINCIAN PRODUK & VARIAN */}
                      <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                        {ord.items && ord.items.length > 0 ? (
                          ord.items.map((it, iIdx) => (
                            <div key={iIdx} style={{ fontSize: '11px', marginBottom: iIdx < ord.items.length - 1 ? '4px' : 0 }}>
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>
                                {it.nama_produk} <span style={{ color: '#0284c7', fontWeight: '800' }}>x{it.qty || 1}</span>
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>
                                SKU: <code>{it.sku || '-'}</code> {it.varian ? `• Varian: ${it.varian}` : ''}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Produk Pesanan (1 Item)</div>
                        )}
                      </td>

                      {/* TOTAL HARGA */}
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '12px', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(ord.totalPrice)}
                      </td>

                      {/* STATUS PESANAN */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: '800',
                          backgroundColor: ord.status === 'Perlu Diproses' ? '#fff7ed' : ord.status === 'Sedang Diproduksi' ? '#eff6ff' : ord.status === 'Selesai' ? '#f0fdf4' : '#f8fafc',
                          color: ord.status === 'Perlu Diproses' ? '#c2410c' : ord.status === 'Sedang Diproduksi' ? '#0284c7' : ord.status === 'Selesai' ? '#15803d' : '#475569',
                          border: ord.status === 'Perlu Diproses' ? '1px solid #fed7aa' : ord.status === 'Sedang Diproduksi' ? '1px solid #bfdbfe' : ord.status === 'Selesai' ? '1px solid #bbf7d0' : '1px solid #cbd5e1'
                        }}>
                          {ord.status || 'Perlu Diproses'}
                        </span>
                      </td>

                      {/* STATUS SPK PRODUKSI */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {hasSPK ? (
                          <span 
                            onClick={() => {
                              if (onNavigate) onNavigate('spk');
                            }}
                            title="Klik untuk lihat di SPK Produksi"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '800',
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              cursor: 'pointer'
                            }}
                          >
                            <Scissors size={11} />
                            <span>{ord.no_spk}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCreateSPK(ord)}
                            title="Buat SPK Jahit & Potong Sekarang"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '700',
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid #fecdd3',
                              cursor: 'pointer'
                            }}
                          >
                            <Scissors size={11} />
                            <span>Buat SPK</span>
                          </button>
                        )}
                      </td>

                      {/* AKSI */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setDetailOrder(ord)}
                            title="Lihat Rincian Pesanan"
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
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(ord)}
                            title="Hapus Pesanan"
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
                              cursor: 'pointer'
                            }}
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

        {/* 6. PAGING FOOTER */}
        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '11.5px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <strong>{filteredOrders.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> sampai <strong>{Math.min(currentPage * entriesPerPage, filteredOrders.length)}</strong> dari <strong>{filteredOrders.length}</strong> pesanan (Total: {totalOrders})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                padding: '4px 12px',
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
            <span style={{ padding: '0 8px', fontWeight: '800', color: '#0f172a', fontSize: '12px' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '4px 12px',
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

      {/* 7. MODAL DETAIL PESANAN */}
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
              maxWidth: '580px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px' }}>
                <ShoppingBag size={18} />
                <span>Rincian Pesanan Marketplace</span>
              </div>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
              
              {/* Order Info Banner */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Nomor Pesanan:</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                      {detailOrder.no_pesanan}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '800',
                    backgroundColor: detailOrder.channel === 'tiktok' ? '#0f172a' : '#fff3ee',
                    color: detailOrder.channel === 'tiktok' ? '#38bdf8' : '#ee4d2d',
                    border: detailOrder.channel === 'tiktok' ? '1px solid #334155' : '1px solid #ffccb8'
                  }}>
                    {detailOrder.channel === 'tiktok' ? 'TikTok Shop' : 'Shopee'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px', fontSize: '11.5px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Toko: </span>
                    <b>{detailOrder.shopName}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Pembeli: </span>
                    <b>{detailOrder.customerName}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Kurir: </span>
                    <b>{detailOrder.kurir || '-'}</b>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>No. Resi: </span>
                    <code style={{ color: '#0284c7' }}>{detailOrder.no_resi || '-'}</code>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  Daftar Barang Dipesan:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detailOrder.items && detailOrder.items.length > 0 ? (
                    detailOrder.items.map((it, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff'
                      }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
                            {it.nama_produk}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            SKU: <code>{it.sku || '-'}</code> {it.varian ? `| Varian: ${it.varian}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a' }}>
                            {it.qty || 1} PCS
                          </div>
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                            {formatRupiah(it.harga || 0)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '8px', fontSize: '11.5px', color: '#94a3b8' }}>
                      Tidak ada data detail item pesanan
                    </div>
                  )}
                </div>
              </div>

              {/* Total & SPK Status */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                marginBottom: '14px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700' }}>TOTAL TRANSAKSI</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#15803d' }}>
                    {formatRupiah(detailOrder.totalPrice)}
                  </div>
                </div>

                <div>
                  {detailOrder.no_spk ? (
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      fontSize: '11.5px',
                      fontWeight: '800'
                    }}>
                      SPK #{detailOrder.no_spk}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const ord = detailOrder;
                        setDetailOrder(null);
                        handleCreateSPK(ord);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Scissors size={13} />
                      <span>Buat SPK Produksi</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '10px 16px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
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
