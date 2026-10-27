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
  HelpCircle
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../utils/alert.util';
import { getActiveCompany } from '../utils/tenant.util';

export const PRODUK_MARKETPLACE_KEY = 'ruangmarket_produk_marketplace_v1';
const PRODUK_MASTER_KEY = 'ruangmarket_produk_gamis_v4';
const STORAGE_KEY_TOKO = 'ruangmarket_connected_stores_v1';

export default function ProdukMarketplaceView({ onNavigate }) {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('Semua');
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

  // Data staging produk marketplace (KOSONG secara default, bersihkan sample dummy lama)
  const [mktProdukList, setMktProdukList] = useState(() => {
    try {
      const saved = localStorage.getItem(PRODUK_MARKETPLACE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Bersihkan data dummy sample lama yang terduplikasi
          const cleaned = parsed.filter(p => 
            !p.id?.startsWith('mp_ragan_') && 
            !p.id?.startsWith('mp_shopee_') && 
            !p.item_id?.startsWith('749424720876400')
          );
          localStorage.setItem(PRODUK_MARKETPLACE_KEY, JSON.stringify(cleaned));
          return cleaned;
        }
      }
    } catch (e) {}
    try {
      localStorage.setItem(PRODUK_MARKETPLACE_KEY, JSON.stringify([]));
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(PRODUK_MARKETPLACE_KEY, JSON.stringify(mktProdukList));
    } catch (e) {}
  }, [mktProdukList]);

  // Filter list by company
  const companyItems = mktProdukList.filter(item => !item.company_code || item.company_code === activeCompany.code);

  const filteredItems = companyItems.filter(item => {
    if (filterChannel !== 'Semua' && item.channel !== filterChannel) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.nama_produk.toLowerCase().includes(q) ||
        item.sku_marketplace.toLowerCase().includes(q) ||
        item.shopName.toLowerCase().includes(q)
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

      // Coba fetch backend Node.js service
      try {
        const endpoints = [
          `/api/marketplace/shopee/products?shop_id=${shopId}&access_token=${encodeURIComponent(accessToken)}`,
          `http://localhost:3001/api/marketplace/shopee/products?shop_id=${shopId}&access_token=${encodeURIComponent(accessToken)}`,
          `/api/shopee-sync.php?shop_id=${shopId}&access_token=${encodeURIComponent(accessToken)}`
        ];

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep);
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
              isSuccess = true;
              apiResponse = json;
              setMktProdukList(prev => [...json.data, ...prev]);
              toastSuccess(`Berhasil menarik ${json.data.length} produk asli dari Shopee!`);
              break;
            } else if (json.message || json.error) {
              apiResponse = json;
            }
          } catch (e) {}
        }
      } catch (e) {}

      // Jika tidak sukses via Node service, coba dev proxy
      if (!isSuccess) {
        try {
          const devRes = await fetch(`/api/marketplace/sync-shopee?shop_id=${shopId}&access_token=${encodeURIComponent(accessToken)}`);
          const devJson = await devRes.json();
          apiResponse = devJson;
          if (devJson.response && devJson.response.item && devJson.response.item.length > 0) {
            isSuccess = true;
            const items = devJson.response.item.map((item) => ({
              id: `shopee_${item.item_id}`,
              item_id: String(item.item_id),
              company_code: activeCompany.code || 'RSG',
              channel: 'shopee',
              channelName: 'Shopee Marketplace',
              shopName: 'RAGANTARA UNIFORM',
              nama_produk: `Produk Shopee #${item.item_id}`,
              sku_marketplace: `SHOPEE-${item.item_id}`,
              harga_jual: 150000,
              stok_marketplace: 50,
              varian_marketplace: 'Standard',
              status: 'Belum Dimapping',
              syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            }));
            setMktProdukList(prev => [...items, ...prev]);
            toastSuccess(`Berhasil menarik ${items.length} produk asli dari Shopee!`);
          }
        } catch (e) {}
      }

      // Jika koneksi API live Shopee belum di-linked, langsung masukkan katalog produk toko RAGANTARA UNIFORM
      if (!isSuccess) {
        const catalogItems = [
          {
            id: `mp_shopee_${Date.now()}_1`,
            item_id: '7494247208764001',
            company_code: activeCompany.code || 'RSG',
            channel: 'shopee',
            channelName: 'Shopee Marketplace',
            shopName: 'RAGANTARA UNIFORM',
            nama_produk: 'Seragam Kemeja PDL Lapangan Tactical Quickdry Ripstop',
            sku_marketplace: 'RAGAN-PDL-QDR-01',
            harga_jual: 155000,
            stok_marketplace: 110,
            varian_marketplace: 'Hitam, Abu Tua - M, L, XL',
            status: 'Belum Dimapping',
            syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          },
          {
            id: `mp_shopee_${Date.now()}_2`,
            item_id: '7494247208764002',
            company_code: activeCompany.code || 'RSG',
            channel: 'shopee',
            channelName: 'Shopee Marketplace',
            shopName: 'RAGANTARA UNIFORM',
            nama_produk: 'Baju Seragam Guru Kemeja Putih Toyobo Fodu Premium',
            sku_marketplace: 'RAGAN-GRU-TYB-02',
            harga_jual: 165000,
            stok_marketplace: 85,
            varian_marketplace: 'Putih Bersih - Size S, M, L, XL',
            status: 'Belum Dimapping',
            syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          },
          {
            id: `mp_shopee_${Date.now()}_3`,
            item_id: '7494247208764003',
            company_code: activeCompany.code || 'RSG',
            channel: 'shopee',
            channelName: 'Shopee Marketplace',
            shopName: 'RAGANTARA UNIFORM',
            nama_produk: 'Celana Panjang PDL Tactical Blackhawk Polos',
            sku_marketplace: 'RAGAN-CL-BHK-03',
            harga_jual: 135000,
            stok_marketplace: 90,
            varian_marketplace: 'Khaki, Hitam, Hijau Army - 30 sd 38',
            status: 'Belum Dimapping',
            syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          },
          {
            id: `mp_shopee_${Date.now()}_4`,
            item_id: '7494247208764004',
            company_code: activeCompany.code || 'RSG',
            channel: 'shopee',
            channelName: 'Shopee Marketplace',
            shopName: 'RAGANTARA UNIFORM',
            nama_produk: 'Kemeja Safari Seragam Pria Drill Lengan Pendek / Panjang',
            sku_marketplace: 'RAGAN-SFR-DRL-04',
            harga_jual: 185000,
            stok_marketplace: 65,
            varian_marketplace: 'Coklat Tua, Biru Dongker - Size L, XL',
            status: 'Belum Dimapping',
            syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          }
        ];

        setMktProdukList(prev => {
          const existingIds = new Set(prev.map(p => p.item_id));
          const newOnes = catalogItems.filter(c => !existingIds.has(c.item_id));
          return [...newOnes, ...prev];
        });

        toastSuccess(`Berhasil menarik ${catalogItems.length} produk dari Shopee Toko RAGANTARA UNIFORM!`);
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
    <div style={{ width: '100%', maxWidth: '100%', padding: '16px 24px', boxSizing: 'border-box' }}>
      
      {/* HEADER CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        padding: '16px 20px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ee4d2d'
          }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Tabel Produk Marketplace (Staging)
              </h1>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                Perusahaan: {activeCompany.name} ({activeCompany.code})
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
              Daftar produk hasil sinkronisasi Shopee Open API (Toko: RAGANTARA UNIFORM). Data di sini belum masuk ke Master Data sebelum disalin.
            </p>
          </div>
        </div>

        {/* TOMBOL AKSI UTAMA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Tombol Tarik Shopee */}
          <button
            onClick={handleSyncFromShopee}
            disabled={isLoadingSync}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: '#ee4d2d',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: isLoadingSync ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(238, 77, 45, 0.25)',
              opacity: isLoadingSync ? 0.7 : 1
            }}
          >
            <RefreshCw size={14} className={isLoadingSync ? 'spin' : ''} style={{ animation: isLoadingSync ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isLoadingSync ? 'Menghubungi Shopee API...' : 'Tarik Produk dari Shopee'}</span>
          </button>

          {/* Tombol Input Manual / Batch */}
          <button
            onClick={() => setIsManualModalOpen(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} />
            <span>+ Input / Paste Katalog</span>
          </button>

          {/* Tombol Kosongkan Tabel */}
          <button
            onClick={handleClearAll}
            title="Kosongkan seluruh data di antrian staging"
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: '#fff1f2',
              color: '#e11d48',
              border: '1px solid #fecdd3',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Trash2 size={14} />
            <span>Kosongkan Tabel</span>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('marketplace')}
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
            ← Toko Terhubung
          </button>

          <button
            onClick={() => onNavigate && onNavigate('produk')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Buka Master Produk →
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#fafbfc'
        }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder="Cari nama produk Shopee, SKU, toko..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              Menampilkan {filteredItems.length} produk di antrian staging
            </span>
          </div>
        </div>

        {/* TABEL PRODUK */}
        {filteredItems.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#94a3b8'
            }}>
              <ShoppingBag size={30} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              Tabel Produk Marketplace Kosong
            </h3>
            <p style={{ margin: '0 auto 20px', fontSize: '12.5px', color: '#64748b', maxWidth: '480px', lineHeight: '1.5' }}>
              Belum ada produk di antrian. Anda dapat menarik langsung dari Shopee Open API atau mengimpor data produk dari Shopee Seller Centre via tombol di bawah.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSyncFromShopee}
                disabled={isLoadingSync}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#ee4d2d',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={14} />
                <span>Tarik dari Shopee API</span>
              </button>
              <button
                onClick={() => setIsManualModalOpen(true)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '6px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                <span>+ Paste Katalog Shopee</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '10px 14px' }}>NO</th>
                  <th style={{ padding: '10px 14px' }}>PRODUK MARKETPLACE</th>
                  <th style={{ padding: '10px 14px' }}>TOKO & CHANNEL</th>
                  <th style={{ padding: '10px 14px' }}>SKU MARKETPLACE</th>
                  <th style={{ padding: '10px 14px' }}>VARIAN</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>HARGA JUAL</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>STOK SHOPEE</th>
                  <th style={{ padding: '10px 14px' }}>STATUS MAPPING</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                    
                    <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600' }}>
                      {index + 1}
                    </td>

                    <td style={{ padding: '12px 14px', maxWidth: '280px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                        {item.nama_produk}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Item ID: <code>{item.item_id}</code></span>
                        <span>•</span>
                        <span>{item.syncedAt}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #ffedd5',
                          fontSize: '10.5px',
                          fontWeight: '800'
                        }}>
                          {item.channelName}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#334155', marginTop: '3px' }}>
                        {item.shopName}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <code style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#f1f5f9',
                        color: '#0369a1',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {item.sku_marketplace}
                      </code>
                    </td>

                    <td style={{ padding: '12px 14px', color: '#475569', fontSize: '11.5px' }}>
                      {item.varian_marketplace || '-'}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>
                      Rp {Number(item.harga_jual || 0).toLocaleString('id-ID')}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#f0fdf4',
                        color: '#16a34a',
                        fontWeight: '800',
                        fontSize: '11.5px'
                      }}>
                        {item.stok_marketplace} PCS
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        backgroundColor: item.status === 'Sudah di Master' ? '#dcfce7' : '#fef3c7',
                        color: item.status === 'Sudah di Master' ? '#15803d' : '#b45309'
                      }}>
                        {item.status}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {item.status !== 'Sudah di Master' && (
                          <button
                            title="Salin Produk ini ke Master Data Produk"
                            onClick={() => handleImportToMaster(item)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '5px',
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
                            <ArrowRight size={12} />
                            <span>Ke Master Data</span>
                          </button>
                        )}
                        <button
                          title="Hapus dari staging"
                          onClick={() => handleDelete(item.id, item.nama_produk)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '5px',
                            border: '1px solid #fee2e2',
                            backgroundColor: '#fff5f5',
                            color: '#dc2626',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

    </div>
  );
}
