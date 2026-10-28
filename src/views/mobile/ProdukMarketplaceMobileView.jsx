import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  RefreshCw, 
  Search, 
  Trash2, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Package,
  Store,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { toastSuccess, toastError, showConfirm } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

export const PRODUK_MARKETPLACE_KEY = 'ruangmarket_produk_marketplace_v1';
const PRODUK_MASTER_KEY = 'ruangmarket_produk_gamis_v4';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

export default function ProdukMarketplaceMobileView({ onNavigate }) {
  const [activeCompany] = useState(getActiveCompany);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('semua'); // 'semua' | 'belum_dimapping' | 'tersedia' | 'habis'
  const [isLoadingSync, setIsLoadingSync] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(15);

  const [mktProdukList, setMktProdukList] = useState(() => {
    try {
      const saved = localStorage.getItem(PRODUK_MARKETPLACE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

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

  const companyItems = mktProdukList.filter(item => !item.company_code || item.company_code === activeCompany.code);
  const totalProduk = companyItems.length;

  const filteredItems = companyItems.filter(item => {
    if (activeTab === 'belum_dimapping' && (item.status === 'Sudah di Master' || item.status === 'Sudah Dimapping')) return false;
    if (activeTab === 'tersedia' && (Number(item.stok_marketplace) || 0) <= 0) return false;
    if (activeTab === 'habis' && (Number(item.stok_marketplace) || 0) > 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.nama_produk.toLowerCase().includes(q) ||
        (item.sku_marketplace || '').toLowerCase().includes(q) ||
        (item.varian_marketplace || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / entriesPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const handleSyncFromShopee = async () => {
    setIsLoadingSync(true);
    toastSuccess('Menghubungi Shopee API...');
    try {
      const res = await fetch('/api/marketplace/shopee/products?shop_id=1030191310');
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setMktProdukList(json.data);
        localStorage.setItem(PRODUK_MARKETPLACE_KEY, JSON.stringify(json.data));
        toastSuccess(`Berhasil menarik ${json.data.length} produk Shopee!`);
      } else {
        toastError(json.message || 'Gagal menarik produk');
      }
    } catch (e) {
      toastError(`Koneksi error: ${e.message}`);
    } finally {
      setIsLoadingSync(false);
    }
  };

  const handleSalinKeMaster = async (item) => {
    try {
      const savedMaster = localStorage.getItem(PRODUK_MASTER_KEY);
      const masterList = savedMaster ? JSON.parse(savedMaster) : [];

      const newMasterItem = {
        id: Date.now(),
        company_code: activeCompany.code || 'RSG',
        kode_sku: item.sku_marketplace || `RSG-${Date.now().toString().slice(-6)}`,
        nama_produk: item.nama_produk,
        kategori: 'Gamis Dewasa',
        satuan: 'PCS',
        harga_jual: Number(item.harga_jual) || 0,
        harga_modal: Math.round((Number(item.harga_jual) || 0) * 0.7),
        stok_fisik: Number(item.stok_marketplace) || 0,
        varian: item.varian_marketplace || 'Standard',
        status: 'Aktif'
      };

      localStorage.setItem(PRODUK_MASTER_KEY, JSON.stringify([newMasterItem, ...masterList]));
      setMktProdukList(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Sudah di Master' } : p));
      toastSuccess(`Produk [${item.sku_marketplace}] disalin ke Master ERP!`);
    } catch (e) {
      toastError('Gagal menyalin ke Master Produk');
    }
  };

  return (
    <div style={{ padding: '12px', width: '100%', boxSizing: 'border-box', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* 1. MOBILE HEADER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '12px',
        padding: '14px 16px',
        color: '#ffffff',
        marginBottom: '10px',
        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Boxes size={20} />
            <span style={{ fontSize: '14px', fontWeight: '800' }}>Produk Marketplace</span>
          </div>
          <span style={{
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            fontSize: '10px',
            fontWeight: '800'
          }}>
            {activeCompany.code}
          </span>
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'rgba(255, 255, 255, 0.9)' }}>
          Katalog staging Shopee & TikTok ({totalProduk} item).
        </p>

        {/* Mobile Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSyncFromShopee}
            disabled={isLoadingSync}
            style={{
              flex: 1,
              height: '34px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={isLoadingSync ? 'spin' : ''} />
            <span>{isLoadingSync ? 'Menarik...' : 'Tarik Shopee'}</span>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('marketplace')}
            style={{
              height: '34px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Store size={13} />
            <span>Toko</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH INPUT */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Cari SKU, varian, nama produk..."
          style={{
            width: '100%',
            height: '36px',
            padding: '0 10px 0 32px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            fontSize: '12px',
            boxSizing: 'border-box',
            outline: 'none'
          }}
        />
      </div>

      {/* 3. MOBILE FILTER PILLS (SCROLL HORIZONTAL) */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '4px'
      }}>
        {[
          { key: 'semua', label: 'Semua', count: totalProduk, color: '#0284c7' },
          { key: 'belum_dimapping', label: 'Belum Mapped', count: companyItems.filter(i => i.status !== 'Sudah di Master').length, color: '#ea580c' },
          { key: 'tersedia', label: 'Tersedia', count: companyItems.filter(i => (Number(i.stok_marketplace) || 0) > 0).length, color: '#059669' },
          { key: 'habis', label: 'Habis', count: companyItems.filter(i => (Number(i.stok_marketplace) || 0) <= 0).length, color: '#dc2626' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            style={{
              padding: '6px 10px',
              borderRadius: '20px',
              border: activeTab === tab.key ? `1px solid ${tab.color}` : '1px solid #cbd5e1',
              backgroundColor: activeTab === tab.key ? tab.color : '#ffffff',
              color: activeTab === tab.key ? '#ffffff' : '#475569',
              fontSize: '11px',
              fontWeight: '700',
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* 4. MOBILE CARD LIST (RESPONSIF & RINGAN) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {paginatedItems.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
            <Package size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div style={{ fontWeight: '700', color: '#64748b', fontSize: '13px' }}>Tidak ada produk ditemukan</div>
          </div>
        ) : (
          paginatedItems.map((item) => {
            const isMapped = item.status === 'Sudah di Master' || item.status === 'Sudah Dimapping';
            const stockNum = Number(item.stok_marketplace) || 0;

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}
              >
                {/* Header Card: Nama Toko + Status Mapping */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '800',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626'
                  }}>
                    <ShoppingBag size={10} />
                    <span>Shopee</span>
                  </span>

                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '9.5px',
                    fontWeight: '800',
                    backgroundColor: isMapped ? '#ecfdf5' : '#fff7ed',
                    color: isMapped ? '#059669' : '#c2410c'
                  }}>
                    {isMapped ? 'Mapped' : 'Belum Mapped'}
                  </span>
                </div>

                {/* Nama Produk */}
                <div style={{ fontWeight: '800', fontSize: '12.5px', color: '#0f172a', lineHeight: 1.3, marginBottom: '4px' }}>
                  {item.nama_produk}
                </div>

                {/* SKU & Varian Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#f1f5f9',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#0284c7'
                  }}>
                    {item.sku_marketplace}
                  </span>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    fontSize: '10.5px',
                    color: '#475569',
                    fontWeight: '600'
                  }}>
                    {item.varian_marketplace || 'Standard'}
                  </span>
                </div>

                {/* Harga, Stok, dan Tombol Action */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>
                      {formatRupiah(item.harga_jual)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: stockNum > 0 ? '#64748b' : '#dc2626', fontWeight: '600' }}>
                      Stok: {stockNum} PCS
                    </div>
                  </div>

                  {!isMapped && (
                    <button
                      onClick={() => handleSalinKeMaster(item)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>Ke Master</span>
                      <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. MOBILE PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '14px', paddingBottom: '20px' }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
              color: '#334155',
              fontSize: '11px',
              fontWeight: '700'
            }}
          >
            Prev
          </button>
          <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0f172a' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
              color: '#334155',
              fontSize: '11px',
              fontWeight: '700'
            }}
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
}
