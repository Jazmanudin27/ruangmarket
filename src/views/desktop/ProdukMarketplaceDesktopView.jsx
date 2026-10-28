import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ArrowRight, 
  CheckCircle, 
  Trash2, 
  AlertCircle,
  Tag,
  Layers,
  Boxes,
  AlertTriangle,
  Package,
  Eye,
  X,
  CheckSquare
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

export const PRODUK_MARKETPLACE_KEY = 'ruangmarket_produk_marketplace_v1';
const PRODUK_MASTER_KEY = 'ruangmarket_produk_gamis_v4';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

async function apiUpdateProduct(id, fields) {
  const res = await fetch(`/api/marketplace/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  });
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.message || 'Gagal memperbarui');
  return json;
}

const isMappedStatus = (status) => status === 'Sudah di Master' || status === 'Sudah Dimapping';

const FILTER_TABS = [
  { key: 'semua', color: 'blue', icon: Layers, label: 'Semua Produk' },
  { key: 'belum_dimapping', color: 'orange', icon: AlertCircle, label: 'Belum Dimapping' },
  { key: 'sudah_dimapping', color: 'green', icon: CheckCircle, label: 'Sudah Dimapping' },
  { key: 'tersedia', color: 'teal', icon: Boxes, label: 'Stok Tersedia' },
  { key: 'habis', color: 'red', icon: AlertTriangle, label: 'Stok Habis' }
];

export default function ProdukMarketplaceDesktopView({ onNavigate }) {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('Semua');
  const [activeFilterTab, setActiveFilterTab] = useState('semua');
  const [filterMapping, setFilterMapping] = useState('Semua');
  const [filterStok, setFilterStok] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

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

  const tabCounts = {
    semua: companyItems.length,
    belum_dimapping: companyItems.filter(i => !isMappedStatus(i.status)).length,
    sudah_dimapping: companyItems.filter(i => isMappedStatus(i.status)).length,
    tersedia: companyItems.filter(i => (Number(i.stok_marketplace) || 0) > 0).length,
    habis: companyItems.filter(i => (Number(i.stok_marketplace) || 0) <= 0).length
  };

  const filteredItems = companyItems.filter(item => {
    const stok = Number(item.stok_marketplace) || 0;
    const mapped = isMappedStatus(item.status);

    // 1. Tab Filter
    if (activeFilterTab === 'belum_dimapping' && mapped) return false;
    if (activeFilterTab === 'sudah_dimapping' && !mapped) return false;
    if (activeFilterTab === 'tersedia' && stok <= 0) return false;
    if (activeFilterTab === 'habis' && stok > 0) return false;

    // 2. Dropdown Filters
    if (filterChannel !== 'Semua' && item.channel !== filterChannel) return false;
    if (filterMapping === 'Belum Dimapping' && mapped) return false;
    if (filterMapping === 'Sudah Dimapping' && !mapped) return false;
    if (filterStok === 'Tersedia' && stok <= 0) return false;
    if (filterStok === 'Habis' && stok > 0) return false;

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

  const totalPages = Math.ceil(filteredItems.length / entriesPerPage) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  // Toggle item selection
  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPage = () => {
    const pageItemIds = paginatedItems.map(i => i.id);
    const allSelected = pageItemIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageItemIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageItemIds])));
    }
  };

  // Action: Salin produk marketplace MASAL ke Data Master Produk
  const handleBatchImportToMaster = async (importAll = false) => {
    let unmappedList = [];
    if (importAll) {
      unmappedList = companyItems.filter(item => !isMappedStatus(item.status));
    } else {
      unmappedList = companyItems.filter(
        item => selectedIds.includes(item.id) && !isMappedStatus(item.status)
      );
    }

    if (unmappedList.length === 0) {
      toastError('Tidak ada produk yang belum terhubung ke Master Data!');
      return;
    }

    const title = importAll ? 'Jadikan Semua ke Master Produk?' : 'Jadikan Master Produk Terpilih?';
    const message = importAll 
      ? `Salin semua ${unmappedList.length} produk yang belum terhubung ke Data Master Produk ERP?`
      : `Salin ${unmappedList.length} produk terpilih ke Data Master Produk ERP?`;

    const confirmed = await showConfirm(title, message, 'Ya, Salin Massal', 'Batal');
    if (!confirmed) return;

    setIsBatchProcessing(true);
    try {
      const savedMaster = localStorage.getItem(PRODUK_MASTER_KEY);
      const masterList = savedMaster ? JSON.parse(savedMaster) : [];
      let currentMaxId = masterList.length > 0 ? Math.max(...masterList.map(p => Number(p.id) || 0)) : 0;

      const newProducts = unmappedList.map((item, idx) => {
        const nextId = currentMaxId + idx + 1;
        return {
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
          harga_beli: Math.round(Number(item.harga_jual || 0) * 0.65),
          harga_jual: item.harga_jual,
          estimasi_kain: 'Kain Drill / Ripstop Standar',
          panjang_kain_cm: 220,
          harga_kain_cm: 180,
          source: `${item.channelName || item.channel} (${item.shopName || ''})`
        };
      });

      localStorage.setItem(PRODUK_MASTER_KEY, JSON.stringify([...newProducts, ...masterList]));
      window.dispatchEvent(new Event('storage'));

      const targetIds = unmappedList.map(i => i.id);

      // Update di state
      setMktProdukList(prev => prev.map(p => targetIds.includes(p.id) ? { ...p, status: 'Sudah di Master' } : p));

      // Update di database MySQL
      await fetch('/api/marketplace/products/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds, status: 'Sudah di Master' })
      });

      toastSuccess(`Berhasil menyalin ${newProducts.length} produk ke Master Data ERP!`);
      setSelectedIds([]);
    } catch (e) {
      toastError(`Gagal proses masal: ${e.message}`);
    } finally {
      setIsBatchProcessing(false);
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

      // Update status staging (state + database)
      setMktProdukList(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Sudah di Master' } : p));
      apiUpdateProduct(item.id, { status: 'Sudah di Master' }).catch(() => {});

      toastSuccess(`Produk "${item.nama_produk}" berhasil disalin ke Data Master Produk!`);
    } catch (e) {
      toastError(`Gagal: ${e.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await showConfirm('Hapus dari Antrian?', `Hapus "${name}" dari staging produk marketplace?`, 'Ya, Hapus', 'Batal');
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/marketplace/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status !== 'success') throw new Error(json.message || 'Gagal menghapus');
      setMktProdukList(prev => prev.filter(p => p.id !== id));
      toastSuccess('Produk dihapus dari antrian');
    } catch (e) {
      toastError(`Gagal menghapus: ${e.message}`);
    }
  };

  const changeTab = (key) => {
    setActiveFilterTab(key);
    setCurrentPage(1);
  };

  const channelClass = (channel) =>
    channel === 'shopee' ? 'pm-channel--shopee' : channel === 'tiktok' ? 'pm-channel--tiktok' : 'pm-channel--other';

  const stockClass = (stok) =>
    stok > 10 ? 'pm-stock--ok' : stok > 0 ? 'pm-stock--low' : 'pm-stock--out';

  return (
    <div className="pm-page">
      
      {/* 1. HEADER CARD */}
      <div className="pm-header">
        <div className="pm-header-left">
          <div className="pm-header-icon">
            <Boxes size={20} />
          </div>
          <div>
            <div className="pm-header-title-row">
              <h1 className="pm-title">Data Induk Produk Marketplace & Varian Stok</h1>
              <span className="pm-company-badge">{activeCompany.code}</span>
            </div>
            <p className="pm-subtitle">
              Hasil sinkronisasi marketplace ({companyItems.length} produk). Kelola katalog staging sebelum disalin ke Master Data ERP
            </p>
          </div>
        </div>

        {/* Global Action: Tombol Jadikan Master Produk Massal (Bahkan tanpa checklist) */}
        {tabCounts.belum_dimapping > 0 && (
          <button
            type="button"
            className="btn btn-success"
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '800',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)'
            }}
            onClick={() => handleBatchImportToMaster(true)}
            disabled={isBatchProcessing}
            title="Salin SEMUA produk yang belum terhubung ke Master Data ERP sekaligus"
          >
            <ArrowRight size={14} />
            <span>{isBatchProcessing ? 'Memproses...' : `Jadikan Semua ke Master (${tabCounts.belum_dimapping})`}</span>
          </button>
        )}
      </div>

      {/* 2. FILTER TABS */}
      <div className="pm-tabs">
        {FILTER_TABS.map(({ key, color, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            className={`pm-tab pm-tab--${color}${activeFilterTab === key ? ' active' : ''}`}
            onClick={() => changeTab(key)}
          >
            <Icon size={13} />
            <span>{label} ({tabCounts[key]})</span>
          </button>
        ))}
      </div>

      {/* 3. FILTER CONTROLS BAR */}
      <div className="pm-filterbar">
        <div className="pm-search">
          <Search size={14} className="pm-search-icon" />
          <input
            type="text"
            className="pm-search-input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari nama produk Shopee/TikTok, SKU, varian, toko, item ID..."
          />
        </div>

        <select
          className="pm-select pm-select--channel"
          value={filterChannel}
          onChange={(e) => { setFilterChannel(e.target.value); setCurrentPage(1); }}
        >
          <option value="Semua">Semua Saluran</option>
          <option value="shopee">Shopee Marketplace</option>
          <option value="tiktok">TikTok Shop</option>
        </select>

        <select
          className="pm-select pm-select--mapping"
          value={filterMapping}
          onChange={(e) => { setFilterMapping(e.target.value); setCurrentPage(1); }}
        >
          <option value="Semua">Semua Status</option>
          <option value="Belum Dimapping">Belum Dimapping</option>
          <option value="Sudah Dimapping">Sudah Dimapping</option>
        </select>

        <select
          className="pm-select pm-select--stok"
          value={filterStok}
          onChange={(e) => { setFilterStok(e.target.value); setCurrentPage(1); }}
        >
          <option value="Semua">Semua Stok</option>
          <option value="Tersedia">Stok Tersedia</option>
          <option value="Habis">Stok Habis</option>
        </select>

        <select
          className="pm-select pm-select--rows"
          value={entriesPerPage}
          onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
        >
          <option value={10}>10 Baris</option>
          <option value={25}>25 Baris</option>
          <option value={50}>50 Baris</option>
          <option value={100}>100 Baris</option>
        </select>
      </div>

      {/* BATCH ACTION BAR (MUNCUL KETIKA ADA ITEM YANG DICENTANG) */}
      {selectedIds.length > 0 && (
        <div className="pm-batch-bar">
          <div className="pm-batch-info">
            <CheckSquare size={16} />
            <span>{selectedIds.length} produk terpilih</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => handleBatchImportToMaster(false)}
              disabled={isBatchProcessing}
            >
              <ArrowRight size={13} />
              <span>{isBatchProcessing ? 'Memproses...' : 'Jadikan Master Produk Terpilih'}</span>
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setSelectedIds([])}
              disabled={isBatchProcessing}
              title="Batalkan pilihan checklist"
            >
              <X size={13} />
              <span>Batal Pilih</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. DATA TABLE */}
      <div className="pm-table-card">
        <div className="pm-table-scroll">
          <table className="pm-table">
            <thead>
              <tr>
                <th className="pm-col-check">
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.includes(i.id))}
                    onChange={toggleSelectAllPage}
                    style={{ cursor: 'pointer' }}
                    title="Pilih Semua di Halaman Ini"
                  />
                </th>
                <th className="pm-col-no">NO</th>
                <th>NAMA PRODUK & SKU MARKETPLACE</th>
                <th>TOKO & SALURAN</th>
                <th>VARIAN & SPESIFIKASI STOK</th>
                <th className="pm-col-center">JUMLAH STOK</th>
                <th className="pm-col-right">HARGA JUAL</th>
                <th className="pm-col-center">STATUS MAPPING</th>
                <th className="pm-col-aksi">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="pm-empty">
                    <Package size={32} className="pm-empty-icon" />
                    <div className="pm-empty-title">Tidak ada produk di antrian staging</div>
                    <div className="pm-empty-desc">
                      {companyItems.length === 0 
                        ? 'Tarik produk dari Shopee/TikTok API lewat halaman Daftar Toko.' 
                        : 'Coba ubah kata kunci pencarian atau reset filter di atas.'}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const stockNum = Number(item.stok_marketplace) || 0;
                  const isMapped = isMappedStatus(item.status);
                  const isSelected = selectedIds.includes(item.id);
                  const rowNumber = (currentPage - 1) * entriesPerPage + index + 1;

                  return (
                    <tr key={item.id} style={{ backgroundColor: isSelected ? '#f0fdf4' : undefined }}>
                      <td className="pm-col-check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td className="pm-cell-no">{rowNumber}</td>

                      <td className="pm-cell-produk">
                        <div className="pm-produk-nama">{item.nama_produk}</div>
                        <div className="pm-produk-meta">
                          <span className="pm-produk-sku">SKU: {item.sku_marketplace}</span>
                          <span className="pm-produk-dot">•</span>
                          <span className="pm-produk-item">Item ID: <code>{item.item_id}</code></span>
                        </div>
                      </td>

                      <td className="pm-cell-nowrap">
                        <div className="pm-channel-row">
                          <span className={`pm-channel ${channelClass(item.channel)}`}>
                            {item.channelName || (item.channel === 'shopee' ? 'Shopee Marketplace' : 'TikTok Shop')}
                          </span>
                        </div>
                        <div className="pm-shop-name">{item.shopName}</div>
                      </td>

                      <td>
                        <div className="pm-varian-row">
                          <Tag size={11} className="pm-varian-icon" />
                          <span className="pm-varian-text">{item.varian_marketplace || 'Standard'}</span>
                        </div>
                        <div className="pm-varian-sync">Ditarik: {item.syncedAt || '-'}</div>
                      </td>

                      <td className="pm-col-center">
                        <span className={`pm-stock ${stockClass(stockNum)}`}>{stockNum} PCS</span>
                      </td>

                      <td className="pm-harga">{formatRupiah(item.harga_jual)}</td>

                      <td className="pm-col-center">
                        <span className={`pm-status ${isMapped ? 'pm-status--mapped' : 'pm-status--unmapped'}`}>
                          {item.status || 'Belum Dimapping'}
                        </span>
                      </td>

                      <td className="pm-col-center">
                        <div className="pm-actions">
                          <button
                            type="button"
                            className="btn-aksi btn-aksi--success"
                            title={isMapped ? 'Sudah ada di Master Data' : 'Salin ke Master Data Produk'}
                            disabled={isMapped}
                            onClick={() => handleImportToMaster(item)}
                          >
                            <ArrowRight size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-aksi btn-aksi--info"
                            title="Lihat Detail Produk Lengkap"
                            onClick={() => setDetailItem(item)}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-aksi btn-aksi--danger"
                            title="Hapus Produk"
                            onClick={() => handleDelete(item.id, item.nama_produk)}
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

        {/* PAGING FOOTER */}
        <div className="pm-paging">
          <div>
            Menampilkan <strong>{filteredItems.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> sampai <strong>{Math.min(currentPage * entriesPerPage, filteredItems.length)}</strong> dari <strong>{filteredItems.length}</strong> produk
          </div>

          <div className="pm-paging-nav">
            <button
              type="button"
              className="pm-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Sebelumnya
            </button>
            <span className="pm-page-info">{currentPage} / {totalPages}</span>
            <button
              type="button"
              className="pm-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL PRODUK (MENARIK & LENGKAP) */}
      {detailItem && (
        <div className="pm-modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff' }}>
              <h3 className="pm-modal-title" style={{ color: '#ffffff' }}>
                <Eye size={18} /> Detail Produk Marketplace
              </h3>
              <button type="button" className="pm-modal-close" onClick={() => setDetailItem(null)} style={{ color: '#ffffff' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="pm-modal-body">
              {/* Product Title Card */}
              <div className="pm-detail-box">
                <div className="pm-detail-name">{detailItem.nama_produk}</div>
                <div className="pm-detail-chips">
                  <span className={`pm-channel ${channelClass(detailItem.channel)}`}>
                    {detailItem.channelName || detailItem.channel}
                  </span>
                  <span className={`pm-status ${isMappedStatus(detailItem.status) ? 'pm-status--mapped' : 'pm-status--unmapped'}`}>
                    {detailItem.status || 'Belum Dimapping'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                    Toko: <strong>{detailItem.shopName || '-'}</strong>
                  </span>
                </div>
              </div>

              {/* Stat Highlight: Harga Jual & Stok */}
              <div className="pm-detail-stats">
                <div className="pm-detail-stat-card pm-detail-stat-card--price">
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>Harga Jual</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#166534', marginTop: '2px' }}>
                    {formatRupiah(detailItem.harga_jual)}
                  </span>
                </div>
                <div className="pm-detail-stat-card pm-detail-stat-card--stock">
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>Stok Marketplace</span>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#075985', marginTop: '2px' }}>
                    {Number(detailItem.stok_marketplace) || 0} PCS
                  </span>
                </div>
              </div>

              {/* Detail Attribute Grid */}
              <div className="pm-detail-grid">
                <div>
                  <span className="pm-detail-label">SKU Marketplace</span>
                  <span className="pm-detail-value" style={{ color: '#0284c7' }}>{detailItem.sku_marketplace || '-'}</span>
                </div>
                <div>
                  <span className="pm-detail-label">Item ID Saluran</span>
                  <span className="pm-detail-value"><code>{detailItem.item_id}</code></span>
                </div>
                <div>
                  <span className="pm-detail-label">Varian / Model</span>
                  <span className="pm-detail-value">{detailItem.varian_marketplace || 'Standard'}</span>
                </div>
                <div>
                  <span className="pm-detail-label">Waktu Terakhir Ditarik</span>
                  <span className="pm-detail-value">{detailItem.syncedAt || '-'}</span>
                </div>
              </div>
            </div>

            <div className="pm-modal-footer">
              {!isMappedStatus(detailItem.status) && (
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => {
                    handleImportToMaster(detailItem);
                    setDetailItem(null);
                  }}
                >
                  <ArrowRight size={14} />
                  <span>Jadikan Master Produk</span>
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setDetailItem(null)}
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
