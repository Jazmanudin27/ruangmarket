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
  Filter
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../utils/alert.util';
import { getActiveCompany } from '../utils/tenant.util';

export const PRODUK_MARKETPLACE_KEY = 'ruangmarket_produk_marketplace_v1';
const PRODUK_MASTER_KEY = 'ruangmarket_produk_gamis_v4';

export default function ProdukMarketplaceView({ onNavigate }) {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('Semua');

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  // Data staging produk marketplace (sebelum masuk ke master produk)
  const [mktProdukList, setMktProdukList] = useState(() => {
    try {
      const saved = localStorage.getItem(PRODUK_MARKETPLACE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'mp_01',
        item_id: '25983719283',
        company_code: 'RSG',
        channel: 'shopee',
        channelName: 'Shopee Marketplace',
        shopName: 'RAGANTARA UNIFORM',
        nama_produk: 'Seragam Kemeja PDL Lapangan Tactical Ripstop',
        sku_marketplace: 'RAGAN-PDL-001',
        harga_jual: 145000,
        stok_marketplace: 120,
        varian_marketplace: 'Khaki Army - Size L, XL',
        status: 'Belum Dimapping',
        syncedAt: '27 Okt 2026, 19:35'
      },
      {
        id: 'mp_02',
        item_id: '25983719284',
        company_code: 'RSG',
        channel: 'shopee',
        channelName: 'Shopee Marketplace',
        shopName: 'RAGANTARA UNIFORM',
        nama_produk: 'Baju Seragam Guru Kemeja Putih Toyobo Fodu',
        sku_marketplace: 'RAGAN-GRU-002',
        harga_jual: 165000,
        stok_marketplace: 85,
        varian_marketplace: 'Putih Bersih - Size M, L',
        status: 'Belum Dimapping',
        syncedAt: '27 Okt 2026, 19:35'
      },
      {
        id: 'mp_03',
        item_id: '172948291048',
        company_code: 'RSG',
        channel: 'tiktok',
        channelName: 'TikTok Shop',
        shopName: 'RUANG SERAGAM',
        nama_produk: 'Abaya Dubai Silk Jetblack Turkey Mewah Busui',
        sku_marketplace: 'RSG-TT-ABY-01',
        harga_jual: 289000,
        stok_marketplace: 60,
        varian_marketplace: 'Hitam Jetblack - All Size',
        status: 'Belum Dimapping',
        syncedAt: '27 Okt 2026, 19:38'
      }
    ];
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

  // Action: Salin produk marketplace terpilih ke Data Master Produk
  const handleImportToMaster = async (item) => {
    const confirmed = await showConfirm(
      'Salin ke Master Produk?',
      `Masukkan "${item.nama_produk}" ke Data Master Produk ERP? Anda dapat menambahkan rincian estimasi kain nantinya.`,
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
        kategori: item.channel === 'tiktok' ? 'Gamis Syari' : 'Gamis Casual',
        tipe_set: 'Single',
        status_order: 'Ready Stok',
        varian: item.varian_marketplace || 'All Size',
        stok: item.stok_marketplace,
        min_stok: 10,
        satuan: 'PCS',
        harga_beli: Math.round(item.harga_jual * 0.65),
        harga_jual: item.harga_jual,
        estimasi_kain: 'Kain Drill / Silk Standar',
        panjang_kain_cm: 240,
        harga_kain_cm: 180,
        source: `${item.channelName} (${item.shopName})`
      };

      localStorage.setItem(PRODUK_MASTER_KEY, JSON.stringify([newMasterProduct, ...masterList]));
      window.dispatchEvent(new Event('storage'));

      // Update status staging
      setMktProdukList(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Sudah di Master' } : p));

      toastSuccess(`Produk ${item.nama_produk} berhasil masuk ke Master Data!`);
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
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7'
          }}>
            <ShoppingBag size={20} />
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
              Daftar produk mentah hasil tarikan API Shopee & TikTok. Data di sini terpisah dan belum masuk ke Master Data sebelum Anda setujui.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            ← Kembali ke Toko
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
          padding: '12px 18px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          {/* Search box */}
          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder="Cari nama produk, SKU marketplace, atau toko..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 30px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Channel Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {['Semua', 'shopee', 'tiktok'].map((ch) => (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '5px',
                  border: filterChannel === ch ? '1px solid #0284c7' : '1px solid #cbd5e1',
                  backgroundColor: filterChannel === ch ? '#0284c7' : '#ffffff',
                  color: filterChannel === ch ? '#ffffff' : '#475569',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {ch === 'Semua' ? 'Semua Channel' : ch === 'shopee' ? 'Shopee' : 'TikTok Shop'}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE STAGING */}
        {filteredItems.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <ShoppingBag size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>Belum ada produk di tabel marketplace</div>
            <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Klik tombol "Tarik Produk" pada menu Toko Marketplace untuk menarik produk baru.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '12px 16px' }}>Channel / Toko</th>
                  <th style={{ padding: '12px 16px' }}>Nama Produk & Item ID</th>
                  <th style={{ padding: '12px 16px' }}>SKU Marketplace</th>
                  <th style={{ padding: '12px 16px' }}>Varian</th>
                  <th style={{ padding: '12px 16px' }}>Stok</th>
                  <th style={{ padding: '12px 16px' }}>Harga Jual</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '800',
                        fontSize: '11px',
                        backgroundColor: item.channel === 'shopee' ? '#fee2e2' : '#f1f5f9',
                        color: item.channel === 'shopee' ? '#dc2626' : '#0f172a'
                      }}>
                        {item.channelName}
                      </span>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {item.shopName}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a' }}>{item.nama_produk}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Item ID: {item.item_id}</div>
                    </td>

                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#0369a1' }}>
                      {item.sku_marketplace}
                    </td>

                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {item.varian_marketplace}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: '800', color: '#059669' }}>{item.stok_marketplace} PCS</span>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                      Rp {item.harga_jual.toLocaleString('id-ID')}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
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

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
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

    </div>
  );
}
