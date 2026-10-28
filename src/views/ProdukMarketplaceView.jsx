import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle, 
  ExternalLink, 
  Trash2, 
  AlertCircle,
  Tag,
  Building,
  Store,
  Layers,
  Filter,
  Plus,
  DownloadCloud,
  FileText,
  X,
  Copy,
  ShieldAlert,
  HelpCircle,
  Boxes,
  AlertTriangle,
  Package
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../utils/alert.util';
import { getActiveCompany } from '../utils/tenant.util';

export const PRODUK_MARKETPLACE_KEY = 'ruangmarket_produk_marketplace_v1';
const PRODUK_MASTER_KEY = 'ruangmarket_produk_gamis_v4';
const STORAGE_KEY_TOKO = 'ruangmarket_connected_stores_v1';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

export default function ProdukMarketplaceView({ onNavigate }) {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('Semua');
  const [activeFilterTab, setActiveFilterTab] = useState('semua');
  const [filterMapping, setFilterMapping] = useState('Semua');
  const [filterStok, setFilterStok] = useState('Semua');
  const [isLoadingSync, setIsLoadingSync] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [apiErrorModal, setApiErrorModal] = useState(null);

  // Form input manual / paste
  const [manualForm, setManualForm] = useState({
    nama_produk: '',
    sku_marketplace: '',
    harga_jual: '',
    stok_marketplace: '',
    varian_marketplace: 'All Size',
    batchText: ''
  });

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  // Data staging produk marketplace
  const [mktProdukList, setMktProdukList] = useState(() => {
    try {
      const saved = localStorage.getItem(PRODUK_MARKETPLACE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  // Selalu load data terkini langsung dari database MySQL (/api/marketplace/products)
  useEffect(() => {
    let isMounted = true;
    fetch('/api/marketplace/products')
      .then(res => res.json())
      .then(json => {
        if (isMounted && json.status === 'success' && Array.isArray(json.data)) {
          setMktProdukList(json.data);
          try {
            localStorage.setItem(PRODUK_MARKETPLACE_KEY, JSON.stringify(json.data));
          } catch (e) {}
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PRODUK_MARKETPLACE_KEY, JSON.stringify(mktProdukList));
    } catch (e) {}
  }, [mktProdukList]);

  // Filter list by company
  const companyItems = mktProdukList.filter(item => !item.company_code || item.company_code === activeCompany.code);

  const totalProduk = companyItems.length;
  const totalBelumMapped = companyItems.filter(i => i.status !== 'Sudah di Master' && i.status !== 'Sudah Dimapping').length;
  const totalMapped = companyItems.filter(i => i.status === 'Sudah di Master' || i.status === 'Sudah Dimapping').length;
  const totalTersedia = companyItems.filter(i => (Number(i.stok_marketplace) || 0) > 0).length;
  const totalHabis = companyItems.filter(i => (Number(i.stok_marketplace) || 0) <= 0).length;

  const filteredItems = companyItems.filter(item => {
    // 1. Tab Filter
    if (activeFilterTab === 'belum_dimapping' && (item.status === 'Sudah di Master' || item.status === 'Sudah Dimapping')) return false;
    if (activeFilterTab === 'sudah_dimapping' && item.status !== 'Sudah di Master' && item.status !== 'Sudah Dimapping') return false;
    if (activeFilterTab === 'tersedia' && (Number(item.stok_marketplace) || 0) <= 0) return false;
    if (activeFilterTab === 'habis' && (Number(item.stok_marketplace) || 0) > 0) return false;

    // 2. Dropdown Filters
    if (filterChannel !== 'Semua' && item.channel !== filterChannel) return false;
    if (filterMapping === 'Belum Dimapping' && (item.status === 'Sudah di Master' || item.status === 'Sudah Dimapping')) return false;
    if (filterMapping === 'Sudah Dimapping' && item.status !== 'Sudah di Master' && item.status !== 'Sudah Dimapping') return false;
    if (filterStok === 'Tersedia' && (Number(item.stok_marketplace) || 0) <= 0) return false;
    if (filterStok === 'Habis' && (Number(item.stok_marketplace) || 0) > 0) return false;

    // 3. Search
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.nama_produk.toLowerCase().includes(q) ||
        (item.sku_marketplace || '').toLowerCase().includes(q) ||
        (item.varian_marketplace || '').toLowerCase().includes(q) ||
        (item.shopName || '').toLowerCase().includes(q) ||
        String(item.item_id || '').includes(q)
      );
    }
    return true;
  });

  // Kosongkan seluruh isi staging
  const handleClearAll = async () => {
    if (mktProdukList.length === 0) {
      toastSuccess('Tabel produk marketplace sudah kosong.');
      return;
    }
    const confirmed = await showConfirm(
      'Kosongkan Tabel Marketplace?',
      `Hapus semua ${mktProdukList.length} produk dari antrian staging marketplace?`,
      'Ya, Kosongkan',
      'Batal'
    );
    if (confirmed) {
      setMktProdukList([]);
      localStorage.setItem(PRODUK_MARKETPLACE_KEY, JSON.stringify([]));
      toastSuccess('Tabel produk marketplace berhasil dikosongkan!');
    }
  };

  // Fungsi Tarik Produk Shopee Resmi
  const handleSyncFromShopee = async () => {
    setIsLoadingSync(true);
    toastSuccess('Menghubungi Shopee Open API v2 (Shop ID: 7494247208764540234)...');

    try {
      let shopId = '1030191310';
      let accessToken = 'eyJhbGciOiJIUzI1NiJ9.CLekfBABGM7xnesDIAEozLKC1wYw_4S4xwk4AUABSAc.Akf_2_Oh892XxGfWUbY4HXNPqIn3DsQUBZpI1DTivMY';

      try {
        const savedStores = localStorage.getItem(STORAGE_KEY_TOKO);
        if (savedStores) {
          const list = JSON.parse(savedStores);
          const found = list.find(s => s.channel === 'shopee');
          if (found) {
            shopId = found.shopId || shopId;
            accessToken = found.accessToken || accessToken;
          }
        }
      } catch (e) {}

      let apiResponse = null;
      let isSuccess = false;

      // Fetch backend Node.js service via Nginx proxy
      try {
        const endpoint = `/api/marketplace/shopee/products?shop_id=${shopId}&access_token=${encodeURIComponent(accessToken)}`;
        const res = await fetch(endpoint);
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          isSuccess = true;
          apiResponse = json;
          const formattedItems = json.data.map(item => ({
            ...item,
            company_code: activeCompany.code || 'RSG'
          }));

          setMktProdukList(prev => {
            const incomingMap = new Map(formattedItems.map(f => [String(f.item_id), f]));
            const updated = formattedItems.concat(prev.filter(p => !incomingMap.has(String(p.item_id))));
            try {
              localStorage.setItem(PRODUK_MARKETPLACE_KEY, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });

          toastSuccess(`Berhasil menarik ${formattedItems.length} produk asli dari Shopee!`);
        } else if (json.message || json.error) {
          apiResponse = json;
        }
      } catch (e) {
        apiResponse = { message: e.message };
      }

      if (!isSuccess) {
        toastError(apiResponse?.message || 'Gagal menarik produk dari API Shopee');
      }

    } catch (err) {
      toastError(`Gagal menghubungi API: ${err.message}`);
    } finally {
      setIsLoadingSync(false);
    }
  };

  // Action: Salin produk marketplace terpilih ke Data Master Produk
  const handleImportToMaster = async (item) => {
    const confirmed = await showConfirm(
      'Salin ke Master Produk?',
      `Masukkan "${item.nama_produk}" ke Data Master Produk ERP? Anda dapat melengkapi rincian kain setelah disalin.`,
      'Ya, Masukkan ke Master',
      'Batal'
    );
    if (!confirmed) return;

    try {
      const savedMaster = localStorage.getItem(PRODUK_MASTER_KEY);
      const masterList = savedMaster ? JSON.parse(savedMaster) : [];
      const nextId = masterList.length > 0 ? Math.max(...masterList.map(p => p.id)) + 1 : 1;

      const newMasterProduct = {
        id: nextId,
        company_code: item.company_code || activeCompany.code || 'RSG',
        nama_produk: item.nama_produk,
        sku: `${activeCompany.code}-${item.sku_marketplace}`,
        barcode: `899${String(1000 + nextId)}`,
        kategori: 'Gamis Casual',
        tipe_set: 'Single',
        status_order: 'Ready Stok',
        varian: item.varian_marketplace || 'All Size',
        stok: item.stok_marketplace,
        min_stok: 10,
        satuan: 'PCS',
        harga_beli: Math.round(item.harga_jual * 0.65),
        harga_jual: item.harga_jual,
        estimasi_kain: 'Kain Drill / Ripstop Standar',
        panjang_kain_cm: 220,
        harga_kain_cm: 180,
        source: `${item.channelName} (${item.shopName})`
      };

      localStorage.setItem(PRODUK_MASTER_KEY, JSON.stringify([newMasterProduct, ...masterList]));
      window.dispatchEvent(new Event('storage'));

      // Update status staging
      setMktProdukList(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Sudah di Master' } : p));

      toastSuccess(`Produk "${item.nama_produk}" berhasil disalin ke Data Master Produk!`);
    } catch (e) {
      toastError(`Gagal: ${e.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await showConfirm('Hapus dari Antrian?', `Hapus "${name}" dari staging produk marketplace?`, 'Ya, Hapus', 'Batal');
    if (confirmed) {
      setMktProdukList(prev => prev.filter(p => p.id !== id));
      toastSuccess('Produk dihapus dari antrian');
    }
  };

  // Submit manual tambah / paste produk Shopee
  const handleSaveManual = (e) => {
    e.preventDefault();
    if (manualForm.batchText.trim()) {
      const lines = manualForm.batchText.split('\n').filter(l => l.trim());
      const newItems = lines.map((line, idx) => {
        const parts = line.split('\t');
        const nama = parts[0]?.trim() || `Produk Shopee #${idx + 1}`;
        const sku = parts[1]?.trim() || `RAGAN-${Math.floor(1000 + Math.random() * 9000)}`;
        const harga = parseInt(parts[2]?.replace(/[^0-9]/g, '')) || 150000;
        const stok = parseInt(parts[3]?.replace(/[^0-9]/g, '')) || 50;
        return {
          id: `mp_manual_${Date.now()}_${idx}`,
          item_id: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
          company_code: activeCompany.code || 'RSG',
          channel: 'shopee',
          channelName: 'Shopee Marketplace',
          shopName: 'RAGANTARA UNIFORM',
          nama_produk: nama,
          sku_marketplace: sku,
          harga_jual: harga,
          stok_marketplace: stok,
          varian_marketplace: 'Standard',
          status: 'Belum Dimapping',
          syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        };
      });

      setMktProdukList(prev => [...newItems, ...prev]);
      toastSuccess(`Berhasil mengimpor ${newItems.length} produk!`);
      setIsManualModalOpen(false);
      setManualForm({ nama_produk: '', sku_marketplace: '', harga_jual: '', stok_marketplace: '', varian_marketplace: 'All Size', batchText: '' });
      return;
    }

    if (!manualForm.nama_produk) {
      toastError('Nama produk wajib diisi');
      return;
    }

    const singleItem = {
      id: `mp_manual_${Date.now()}`,
      item_id: `${Math.floor(10000000000 + Math.random() * 90000000000)}`,
      company_code: activeCompany.code || 'RSG',
      channel: 'shopee',
      channelName: 'Shopee Marketplace',
      shopName: 'RAGANTARA UNIFORM',
      nama_produk: manualForm.nama_produk,
      sku_marketplace: manualForm.sku_marketplace || `RAGAN-${Math.floor(1000 + Math.random() * 9000)}`,
      harga_jual: parseInt(manualForm.harga_jual) || 150000,
      stok_marketplace: parseInt(manualForm.stok_marketplace) || 50,
      varian_marketplace: manualForm.varian_marketplace || 'All Size',
      status: 'Belum Dimapping',
      syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    setMktProdukList(prev => [singleItem, ...prev]);
    toastSuccess('Produk Shopee ditambahkan ke antrian staging!');
    setIsManualModalOpen(false);
    setManualForm({ nama_produk: '', sku_marketplace: '', harga_jual: '', stok_marketplace: '', varian_marketplace: 'All Size', batchText: '' });
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '16px', boxSizing: 'border-box' }}>
      
      {/* 1. HEADER CARD (GRADIENT #0284c7 KE #0369a1, PERSIS DATA INDUK PRODUK) */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '8px',
        padding: '10px 16px',
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Data Induk Produk Marketplace & Varian Stok
              </h1>
              <span style={{
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '800'
              }}>
                {activeCompany.code}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
              Hasil sinkronisasi Shopee Open API ({companyItems.length} produk). Kelola katalog staging sebelum disalin ke Master Data ERP
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          
          {/* Tombol Tarik Shopee */}
          <button
            onClick={handleSyncFromShopee}
            disabled={isLoadingSync}
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#ee4d2d',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              lineHeight: 1,
              cursor: isLoadingSync ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
              opacity: isLoadingSync ? 0.7 : 1
            }}
          >
            <RefreshCw size={13} className={isLoadingSync ? 'spin' : ''} style={{ animation: isLoadingSync ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isLoadingSync ? 'Menarik Shopee API...' : 'Tarik Produk Shopee'}</span>
          </button>

          {/* Tombol Input Manual / Batch */}
          <button
            onClick={() => setIsManualModalOpen(true)}
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
            }}
          >
            <Plus size={13} />
            <span>+ Input / Paste</span>
          </button>

          {/* Tombol Kosongkan Tabel */}
          <button
            onClick={handleClearAll}
            title="Kosongkan seluruh data di antrian staging"
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              lineHeight: 1,
              cursor: 'pointer'
            }}
          >
            <Trash2 size={13} />
            <span>Kosongkan</span>
          </button>

          {/* Tombol Navigasi ke Toko */}
          <button
            onClick={() => onNavigate && onNavigate('marketplace')}
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              lineHeight: 1,
              cursor: 'pointer'
            }}
          >
            ← Toko
          </button>

          {/* Tombol Buka Master Produk */}
          <button
            onClick={() => onNavigate && onNavigate('produk')}
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '0 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#ffffff',
              color: '#0284c7',
              fontSize: '11.5px',
              fontWeight: '800',
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
            }}
          >
            <span>Master Produk →</span>
          </button>

        </div>
      </div>

      {/* 2. FILTER TABS (COLOR-CODED PERSIS DATA INDUK PRODUK) */}
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

        {/* Tab 2: Belum Dimapping (Orange) */}
        <button
          onClick={() => setActiveFilterTab('belum_dimapping')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'belum_dimapping' ? '1px solid #ea580c' : '1px solid #fed7aa',
            backgroundColor: activeFilterTab === 'belum_dimapping' ? '#ea580c' : '#fff7ed',
            color: activeFilterTab === 'belum_dimapping' ? '#ffffff' : '#c2410c',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'belum_dimapping' ? '0 1px 4px rgba(234, 88, 12, 0.25)' : 'none'
          }}
        >
          <AlertCircle size={13} />
          <span>Belum Dimapping ({totalBelumMapped})</span>
        </button>

        {/* Tab 3: Sudah Dimapping (Hijau) */}
        <button
          onClick={() => setActiveFilterTab('sudah_dimapping')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'sudah_dimapping' ? '1px solid #059669' : '1px solid #a7f3d0',
            backgroundColor: activeFilterTab === 'sudah_dimapping' ? '#059669' : '#ecfdf5',
            color: activeFilterTab === 'sudah_dimapping' ? '#ffffff' : '#047857',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'sudah_dimapping' ? '0 1px 4px rgba(5, 150, 105, 0.25)' : 'none'
          }}
        >
          <CheckCircle size={13} />
          <span>Sudah Dimapping ({totalMapped})</span>
        </button>

        {/* Tab 4: Stok Tersedia (Teal) */}
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
            border: activeFilterTab === 'tersedia' ? '1px solid #0d9488' : '1px solid #99f6e4',
            backgroundColor: activeFilterTab === 'tersedia' ? '#0d9488' : '#f0fdfa',
            color: activeFilterTab === 'tersedia' ? '#ffffff' : '#0f766e',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'tersedia' ? '0 1px 4px rgba(13, 148, 136, 0.25)' : 'none'
          }}
        >
          <Boxes size={13} />
          <span>Stok Tersedia ({totalTersedia})</span>
        </button>

        {/* Tab 5: Stok Habis (Merah) */}
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

      {/* 3. FILTER CONTROLS BAR (MEPET 6PX) */}
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
        
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk Shopee, SKU, varian, toko, item ID..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              outline: 'none',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box',
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

        {/* Select Saluran */}
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
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
          <option value="Semua">Semua Saluran</option>
          <option value="shopee">Shopee Marketplace</option>
          <option value="tiktok">TikTok Shop</option>
        </select>

        {/* Select Status Mapping */}
        <select
          value={filterMapping}
          onChange={(e) => setFilterMapping(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '135px'
          }}
        >
          <option value="Semua">Semua Status</option>
          <option value="Belum Dimapping">Belum Dimapping</option>
          <option value="Sudah Dimapping">Sudah Dimapping</option>
        </select>

        {/* Select Status Stok */}
        <select
          value={filterStok}
          onChange={(e) => setFilterStok(e.target.value)}
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
          <option value="Tersedia">Stok Tersedia</option>
          <option value="Habis">Stok Habis</option>
        </select>

        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginLeft: 'auto' }}>
          Menampilkan {filteredItems.length} produk di antrian staging
        </span>

      </div>

      {/* 4. DATA TABLE (PERSIS DATA INDUK PRODUK DENGAN BORDER CBD5E1) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)'
      }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="table-bordered-hover" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <th style={{ padding: '5px 8px', textAlign: 'center', width: '45px', border: '1px solid #cbd5e1' }}>NO</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>NAMA PRODUK & SKU MARKETPLACE</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>TOKO & SALURAN</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>VARIAN & SPESIFIKASI STOK</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>JUMLAH STOK SHOPEE</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>HARGA JUAL</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>STATUS MAPPING</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', width: '140px', border: '1px solid #cbd5e1' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                    <Package size={32} color="#cbd5e1" style={{ marginBottom: '6px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#334155' }}>Tidak ada produk di antrian staging</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                      {companyItems.length === 0 
                        ? 'Tarik produk dari Shopee API atau klik tombol Input / Paste.' 
                        : 'Coba ubah kata kunci pencarian atau reset filter di atas.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const stockNum = Number(item.stok_marketplace) || 0;
                  const isMapped = item.status === 'Sudah di Master' || item.status === 'Sudah Dimapping';

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

                      {/* NAMA PRODUK & SKU MARKETPLACE */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', maxWidth: '340px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', lineHeight: 1.25, marginBottom: '2px' }}>
                          {item.nama_produk}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                          <span style={{ color: '#0284c7', fontWeight: '700' }}>
                            SKU: {item.sku_marketplace}
                          </span>
                          <span style={{ color: '#94a3b8' }}>•</span>
                          <span style={{ color: '#64748b', fontSize: '10px' }}>
                            Item ID: <code>{item.item_id}</code>
                          </span>
                        </div>
                      </td>

                      {/* TOKO & SALURAN */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: item.channel === 'shopee' ? '#fee2e2' : item.channel === 'tiktok' ? '#f1f5f9' : '#e0f2fe',
                            color: item.channel === 'shopee' ? '#dc2626' : item.channel === 'tiktok' ? '#0f172a' : '#0369a1',
                            border: item.channel === 'shopee' ? '1px solid #fca5a5' : item.channel === 'tiktok' ? '1px solid #cbd5e1' : '1px solid #bae6fd'
                          }}>
                            {item.channelName || (item.channel === 'shopee' ? 'Shopee Marketplace' : 'TikTok Shop')}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>
                          {item.shopName}
                        </div>
                      </td>

                      {/* VARIAN & SPESIFIKASI STOK */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <Tag size={11} color="#0284c7" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '11px', lineHeight: 1.2 }}>
                            {item.varian_marketplace || 'Standard'}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Ditarik: {item.syncedAt || '-'}
                        </div>
                      </td>

                      {/* JUMLAH STOK SHOPEE */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: stockNum > 10 ? '#ecfdf5' : stockNum > 0 ? '#fffbeb' : '#fef2f2',
                          color: stockNum > 10 ? '#059669' : stockNum > 0 ? '#d97706' : '#dc2626',
                          border: stockNum > 10 ? '1px solid #a7f3d0' : stockNum > 0 ? '1px solid #fde68a' : '1px solid #fecaca',
                          whiteSpace: 'nowrap'
                        }}>
                          {stockNum} PCS
                        </span>
                      </td>

                      {/* HARGA JUAL */}
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '12px', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(item.harga_jual)}
                      </td>

                      {/* STATUS MAPPING */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          backgroundColor: isMapped ? '#ecfdf5' : '#fff7ed',
                          color: isMapped ? '#047857' : '#c2410c',
                          border: isMapped ? '1px solid #a7f3d0' : '1px solid #fed7aa',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.status || 'Belum Dimapping'}
                        </span>
                      </td>

                      {/* 2 ACTION BUTTONS */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {!isMapped && (
                            <button
                              title="Salin Produk ini ke Master Data Produk ERP"
                              onClick={() => handleImportToMaster(item)}
                              style={{
                                height: '26px',
                                padding: '0 8px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                            >
                              <span>Ke Master Data</span>
                              <ArrowRight size={12} />
                            </button>
                          )}
                          <button
                            title="Hapus dari staging"
                            onClick={() => handleDelete(item.id, item.nama_produk)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.color = '#ffffff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
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
      </div>

      {/* MODAL PENJELASAN SHOPEE API WHITELIST */}
      {apiErrorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#fff7ed',
              borderBottom: '1px solid #fed7aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={22} color="#ea580c" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#9a3412' }}>
                  {apiErrorModal.title}
                </h3>
              </div>
              <button
                onClick={() => setApiErrorModal(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a3412' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '10px 12px',
                borderRadius: '6px',
                marginBottom: '14px',
                fontSize: '12px',
                color: '#991b1b',
                fontFamily: 'monospace'
              }}>
                Error Shopee: <strong>{apiErrorModal.rawError}</strong>
              </div>

              <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#334155', lineHeight: '1.5' }}>
                Shopee Open Platform mewajibkan <strong>IP Address Server</strong> Anda didaftarkan (whitelist) agar API dapat menarik produk toko secara otomatis.
              </p>

              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                  IP SERVER VPS ANDA (Tambahkan ini ke Shopee Console):
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <code style={{ fontSize: '14px', fontWeight: '800', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '4px 8px', borderRadius: '4px' }}>
                    {apiErrorModal.serverIp}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(apiErrorModal.serverIp);
                      toastSuccess('IP Server 31.97.109.165 disalin ke clipboard!');
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Copy size={12} />
                    <span>Salin IP</span>
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                  Domain: <code>{apiErrorModal.domain}</code> • Shop ID: <code>{apiErrorModal.shopId}</code>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#334155', lineHeight: '1.6', marginBottom: '16px' }}>
                <strong>Langkah di Shopee Open Platform Console:</strong>
                <ol style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                  <li>Buka <a href="https://console.open.shopee.com" target="_blank" rel="noreferrer" style={{ color: '#ee4d2d', fontWeight: '700' }}>console.open.shopee.com</a></li>
                  <li>Pilih menu <strong>App list</strong> &gt; Klik App ID <code>2036279</code></li>
                  <li>Masuk ke tab <strong>App Details</strong> &gt; bagian <strong>IP Address Whitelist</strong></li>
                  <li>Masukkan IP <code>{apiErrorModal.serverIp}</code> lalu klik <strong>Save</strong></li>
                </ol>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setApiErrorModal(null);
                    setIsManualModalOpen(true);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Gunakan Paste Katalog Dulu →
                </button>
                <button
                  type="button"
                  onClick={() => setApiErrorModal(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
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
        </div>
      )}

      {/* MODAL INPUT / PASTE PRODUK MANUAL */}
      {isManualModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Tambah / Paste Produk Shopee ke Staging
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManual} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Paste Baris Excel/Shopee (Format: Nama Produk [Tab] SKU [Tab] Harga [Tab] Stok):
                </label>
                <textarea
                  rows={4}
                  placeholder={`Contoh:\nKemeja PDL Tactical\tRAGAN-01\t145000\t50\nBaju Guru Putih Toyobo\tRAGAN-02\t165000\t80`}
                  value={manualForm.batchText}
                  onChange={(e) => setManualForm(prev => ({ ...prev, batchText: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Bisa copy langsung dari tabel Shopee Seller Centre atau Excel.
                </span>
              </div>

              <div style={{ textAlign: 'center', margin: '10px 0', fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                — ATAU ISI SATUAN DI BAWAH —
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                  Nama Produk Shopee:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kemeja Tactical Ripstop Lengan Panjang"
                  value={manualForm.nama_produk}
                  onChange={(e) => setManualForm(prev => ({ ...prev, nama_produk: e.target.value }))}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    SKU Shopee:
                  </label>
                  <input
                    type="text"
                    placeholder="RAGAN-PDL-01"
                    value={manualForm.sku_marketplace}
                    onChange={(e) => setManualForm(prev => ({ ...prev, sku_marketplace: e.target.value }))}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Varian:
                  </label>
                  <input
                    type="text"
                    placeholder="Hitam, M/L"
                    value={manualForm.varian_marketplace}
                    onChange={(e) => setManualForm(prev => ({ ...prev, varian_marketplace: e.target.value }))}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Harga Jual (Rp):
                  </label>
                  <input
                    type="number"
                    placeholder="150000"
                    value={manualForm.harga_jual}
                    onChange={(e) => setManualForm(prev => ({ ...prev, harga_jual: e.target.value }))}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                    Stok Shopee:
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    value={manualForm.stok_marketplace}
                    onChange={(e) => setManualForm(prev => ({ ...prev, stok_marketplace: e.target.value }))}
                    style={{ width: '100%', padding: '7px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  style={{ padding: '7px 14px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '7px 16px', borderRadius: '5px', border: 'none', backgroundColor: '#ee4d2d', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Simpan ke Staging
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PROSES TARIK PRODUK (ANIMASI MODERN) */}
      {isLoadingSync && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px 28px',
            width: '90%',
            maxWidth: '460px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            position: 'relative'
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 0 8px rgba(239, 68, 68, 0.12)'
            }}>
              <RotateCw
                size={34}
                color="#dc2626"
                style={{
                  animation: 'spin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                }}
              />
            </div>

            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '17px',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}>
              Sedang Menarik Seluruh Produk Shopee...
            </h2>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontSize: '11.5px',
              fontWeight: '700',
              marginBottom: '14px'
            }}>
              <Boxes size={12} color="#0284c7" />
              <span>Koperasi Sahabat Anak Bangsa (1030191310)</span>
            </div>

            <p style={{
              margin: '0 0 24px 0',
              fontSize: '12.5px',
              color: '#64748b',
              lineHeight: 1.5
            }}>
              Menghubungi Shopee Open API v2, membaca katalog lengkap, SKU, rincian varian, harga asli, dan stok tersedia.
            </p>

            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#f1f5f9',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '14px'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #ea580c 0%, #f97316 50%, #ea580c 100%)',
                backgroundSize: '200% 100%',
                borderRadius: '999px',
                animation: 'loadingProgress 1.8s ease-in-out infinite'
              }} />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '11.5px',
              color: '#94a3b8',
              fontWeight: '600'
            }}>
              <Clock size={12} />
              <span>Silakan tunggu sebentar, data sedang dipersiapkan...</span>
            </div>

            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes loadingProgress {
                0% { width: 15%; margin-left: 0; }
                50% { width: 60%; margin-left: 20%; }
                100% { width: 30%; margin-left: 70%; }
              }
            `}</style>
          </div>
        </div>
      )}

    </div>
  );
}
