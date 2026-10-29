import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Boxes, 
  Plus, 
  RotateCw, 
  Search, 
  Eye, 
  Edit3, 
  Trash2, 
  Clock, 
  X, 
  Sparkles, 
  Save,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Tag,
  Printer,
  ShoppingBag,
  Store,
  Layers,
  ArrowUpDown,
  Filter,
  DollarSign,
  ShieldAlert,
  ChevronDown,
  Check,
  CheckSquare,
  Loader2
} from 'lucide-react';
import { showConfirm, toastSuccess, toastError } from '../../utils/alert.util';
import { INITIAL_PRODUK_DATA } from '../../data/initialProduk';
import { INITIAL_KATEGORI_DATA } from '../../data/initialKategori';
import { getActiveCompany, getActiveCompanyCode } from '../../utils/tenant.util';
import { detectStatusOrder, detectBundleSet } from '../../utils/orderStatus.util';

const STORAGE_KEY = 'ruangmarket_produk_gamis_v4';
const KATEGORI_STORAGE_KEY = 'ruangmarket_kategori_v1';

// Helper memecah SKU Bundle menjadi rincian komponen cerdas
export function parseBundleComponents(bundleSku = '', bundleName = '', allProducts = [], hargaBeli = 0, panjangKain = 200, hargaKainCm = 150) {
  const cleanSku = (bundleSku || '').replace(/^SET[-_]/i, '').trim();
  const splitRegex = /-(?=CLN-|ROK-|JLB-|RMP-|CELANA-|BAWAHAN-)/i;
  let part1Sku = '';
  let part2Sku = '';

  if (splitRegex.test(cleanSku)) {
    const parts = cleanSku.split(splitRegex);
    part1Sku = parts[0] || '';
    part2Sku = parts[1] || '';
  } else {
    // Cari produk terpanjang yang cocok di awal
    const candidates = [...allProducts]
      .filter(p => p.sku && !p.sku.startsWith('SET-') && cleanSku.startsWith(p.sku + '-'))
      .sort((a, b) => b.sku.length - a.sku.length);
    if (candidates.length > 0) {
      part1Sku = candidates[0].sku;
      part2Sku = cleanSku.slice(candidates[0].sku.length + 1);
    } else {
      part1Sku = cleanSku;
      part2Sku = '';
    }
  }

  // Komponen 1: Baju / Atasan
  const found1 = allProducts.find(p => p.sku && p.sku.toLowerCase() === part1Sku.toLowerCase());
  const comp1 = {
    id: `bi-${Date.now()}-1`,
    produk_id: found1 ? found1.id : null,
    sku: found1 ? found1.sku : (part1Sku || 'BP-KOMP'),
    nama_komponen: found1 ? found1.nama_produk : `Baju / Atasan (${part1Sku || 'Atasan'})`,
    qty: 1,
    kain_nama: found1?.estimasi_kain || 'Drill Premium',
    panjang_kain_cm: Number(found1?.panjang_kain_cm) || Math.round((Number(panjangKain) || 200) * 0.55),
    harga_kain_cm: Number(found1?.harga_kain_cm) || Number(hargaKainCm || 150),
    harga_modal_item: Number(found1?.harga_beli) || Math.round((Number(hargaBeli) || 60000) * 0.55)
  };

  // Komponen 2: Celana / Bawahan
  const found2 = allProducts.find(p => p.sku && p.sku.toLowerCase() === part2Sku.toLowerCase());
  const isRok = /ROK/i.test(part2Sku);
  const comp2 = {
    id: `bi-${Date.now()}-2`,
    produk_id: found2 ? found2.id : null,
    sku: found2 ? found2.sku : (part2Sku || (isRok ? 'ROK-KOMP' : 'CLN-KOMP')),
    nama_komponen: found2 ? found2.nama_produk : (isRok ? `Rok Bawahan (${part2Sku || 'ROK'})` : `Celana Bawahan (${part2Sku || 'CLN'})`),
    qty: 1,
    kain_nama: found2?.estimasi_kain || 'Drill Premium',
    panjang_kain_cm: Number(found2?.panjang_kain_cm) || Math.round((Number(panjangKain) || 200) * 0.45),
    harga_kain_cm: Number(found2?.harga_kain_cm) || Number(hargaKainCm || 150),
    harga_modal_item: Number(found2?.harga_beli) || Math.round((Number(hargaBeli) || 60000) * 0.45)
  };

  return [comp1, comp2];
}

// Searchable Select Component with integrated filter search and dropdown
function SearchableSelect({ label, value, onChange, options, placeholder = "Pilih opsi...", required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    const optLabel = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
    const optSku = typeof opt === 'object' && opt.sku ? opt.sku : '';
    const q = searchTerm.toLowerCase();
    return optLabel.toLowerCase().includes(q) || optSku.toLowerCase().includes(q);
  });

  const selectedDisplay = () => {
    const found = options.find(opt => (typeof opt === 'string' ? opt === value : String(opt.value) === String(value)));
    if (!found) return placeholder;
    if (typeof found === 'string') return found.length > 50 ? `${found.slice(0, 50)}...` : found;
    const rawLabel = found.label || found.value || '';
    const cleanLabel = rawLabel.length > 45 ? `${rawLabel.slice(0, 45)}...` : rawLabel;
    return found.sku ? `[${found.sku}] ${cleanLabel}` : cleanLabel;
  };

  return (
    <div style={{ position: 'relative' }} ref={wrapperRef}>
      {label && (
        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          padding: '6px 9px',
          borderRadius: '5px',
          border: isOpen ? '1px solid #0284c7' : '1px solid #cbd5e1',
          fontSize: '11.5px',
          fontWeight: '600',
          color: value ? '#0f172a' : '#94a3b8',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          textAlign: 'left',
          boxShadow: isOpen ? '0 0 0 2px rgba(2, 132, 199, 0.15)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedDisplay()}
        </span>
        <ChevronDown size={12} color="#64748b" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.22)',
          zIndex: 3500,
          padding: '6px',
          maxHeight: '260px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Search box inside dropdown */}
          <div style={{
            position: 'relative',
            marginBottom: '6px'
          }}>
            <Search size={12} color="#94a3b8" style={{ position: 'absolute', left: '7px', top: '7px' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari SKU atau nama produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 7px 5px 24px',
                borderRadius: '4px',
                border: '1px solid #e2e8f0',
                fontSize: '11px',
                outline: 'none',
                backgroundColor: '#f8fafc'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', maxHeight: '190px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.slice(0, 50).map((opt, idx) => {
                const optVal = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : (opt.label || opt.value);
                const optSku = typeof opt === 'object' ? opt.sku : '';
                const isSelected = String(optVal) === String(value);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '5px 7px',
                      borderRadius: '4px',
                      border: isSelected ? '1px solid #bae6fd' : '1px solid transparent',
                      backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                      color: isSelected ? '#0369a1' : '#1e293b',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {optSku && (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '9.5px',
                            fontWeight: '800',
                            color: '#0284c7',
                            backgroundColor: '#e0f2fe',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            flexShrink: 0
                          }}>
                            {optSku}
                          </span>
                        )}
                        <span 
                          title={optLabel}
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: '700', 
                            color: '#0f172a', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap' 
                          }}
                        >
                          {optLabel.length > 55 ? `${optLabel.slice(0, 55)}...` : optLabel}
                        </span>
                      </div>
                      {typeof opt === 'object' && opt.panjang_kain_cm !== undefined && (
                        <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                          Kain: <b>{opt.estimasi_kain || 'Drill'}</b> ({opt.panjang_kain_cm || 0}cm) • Modal: Rp {Number(opt.harga_beli || 0).toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check size={14} color="#0284c7" style={{ flexShrink: 0 }} />}
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '8px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                Tidak ada produk cocok "{searchTerm}"
              </div>
            )}
            {filteredOptions.length > 50 && (
              <div style={{ padding: '4px 8px', fontSize: '9.5px', color: '#64748b', textAlign: 'center', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                Menampilkan 50 dari {filteredOptions.length} produk. Ketik untuk mencari lebih spesifik.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProdukView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('company_changed', handleCompanyChange);
    return () => window.removeEventListener('company_changed', handleCompanyChange);
  }, []);

  const [produkList, setProdukList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeFilterTab, setActiveFilterTab] = useState('semua');
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterTipeSet, setFilterTipeSet] = useState('Semua');
  const [filterStatusOrder, setFilterStatusOrder] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('Memproses...');

  // Modals state
  const [selectedProduk, setSelectedProduk] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [serverCounts, setServerCounts] = useState({
    semua: 0,
    tersedia: 0,
    menipis: 0,
    habis: 0,
    po: 0,
    ready: 0
  });

  // Fetch data produk langsung dari MySQL per halaman (Server-side Pagination)
  const loadMasterProduk = async (page = currentPage, limit = entriesPerPage) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCompany?.code) params.set('kode_perusahaan', activeCompany.code);
      params.set('page', page);
      params.set('limit', limit);
      if (search.trim()) params.set('search', search.trim());
      if (filterKategori !== 'Semua') params.set('kategori', filterKategori);
      if (filterTipeSet !== 'Semua') params.set('tipe_set', filterTipeSet);
      if (filterStatusOrder !== 'Semua') params.set('status_order', filterStatusOrder);
      if (filterStatus !== 'Semua') params.set('status', filterStatus);
      if (activeFilterTab && activeFilterTab !== 'semua') params.set('tab', activeFilterTab);

      const res = await fetch(`/api/marketplace/master?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const rawData = Array.isArray(json) ? json : (json.data || []);
        const pagination = json.pagination || { total: rawData.length, totalPages: Math.ceil(rawData.length / limit) || 1 };

        if (json.counts) {
          setServerCounts(json.counts);
        }

        const rawMapped = rawData.map(p => {
          const detectedBundle = detectBundleSet(p.nama_produk, p.kode_sku);
          const tipeSet = p.tipe_set || (detectedBundle.isBundle ? 'Satu Setel' : 'Single');
          let bundleItems = Array.isArray(p.bundle_items) ? p.bundle_items : (typeof p.bundle_items === 'string' && p.bundle_items ? JSON.parse(p.bundle_items) : []);

          return {
            id: p.id,
            company_code: p.kode_perusahaan || 'RSG',
            nama_produk: p.nama_produk,
            sku: p.kode_sku,
            kategori: p.kategori || 'Gamis Casual',
            tipe_set: tipeSet,
            bundle_items: bundleItems,
            status_order: p.status_order || detectStatusOrder(p.nama_produk, p.kode_sku),
            varian: p.varian || 'Standar',
            stok: Number(p.stok_fisik || 0),
            min_stok: 5,
            satuan: p.satuan || 'PCS',
            harga_beli: Number(p.harga_modal || 0),
            harga_jual: Number(p.harga_jual || 0),
            estimasi_kain: p.estimasi_kain || 'Kain Polos',
            panjang_kain_cm: Number(p.panjang_kain_cm) || 200,
            harga_kain_cm: Number(p.harga_kain_cm || 150),
            id_kategori_hpp: p.id_kategori_hpp || '',
            nama_kategori_hpp: p.nama_kategori_hpp || '',
            hpp_kategori: Number(p.hpp_kategori || 0)
          };
        });

        // Lengkapi bundle_items dengan auto match ke master produk jika belum memiliki produk_id
        const mapped = rawMapped.map(item => {
          if ((item.tipe_set === 'Satu Setel' || item.tipe_set === 'Bundle') || (item.sku && item.sku.startsWith('SET-'))) {
            const needsParse = !item.bundle_items || item.bundle_items.length === 0 || item.bundle_items.some(bi => !bi.produk_id);
            if (needsParse) {
              const parsed = parseBundleComponents(item.sku, item.nama_produk, rawMapped, item.harga_beli, item.panjang_kain_cm, item.harga_kain_cm);
              const merged = parsed.map((pi, idx) => {
                const existing = item.bundle_items?.[idx];
                return existing ? { ...existing, produk_id: existing.produk_id || pi.produk_id, sku: existing.sku || pi.sku } : pi;
              });
              return { ...item, bundle_items: merged };
            }
          }
          return item;
        });

        setProdukList(mapped);
        setTotalCount(pagination.total);
        setTotalPages(pagination.totalPages);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Gagal load produk dari database:', err.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMasterProduk(currentPage, entriesPerPage);
  }, [currentPage, entriesPerPage, search, filterKategori, filterTipeSet, filterStatusOrder, filterStatus, activeFilterTab, activeCompany?.code]);

  // Form State
  const initialForm = {
    nama_produk: '',
    sku: '',
    barcode: '',
    kategori: 'Gamis Syari',
    tipe_set: 'Single',
    status_order: 'Ready Stok',
    varian: 'Hitam Jetblack - Size L',
    stok: 20,
    min_stok: 5,
    satuan: 'PCS',
    harga_beli: 150000,
    harga_jual: 250000,
    estimasi_kain: 'Silk Jetblack Premium',
    panjang_kain_cm: 250,
    harga_kain_cm: 200,
    id_kategori_hpp: '',
    bundle_items: [] // Komponen pemisah jika produk bertipe Bundle / Setel
  };
  const [formData, setFormData] = useState(initialForm);

  // Daftar opsi Kategori HPP dari master_hpp_produk
  const [hppOptions, setHppOptions] = useState([]);

  useEffect(() => {
    async function fetchHppList() {
      try {
        const res = await fetch('/api/marketplace/hpp-produk');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data)) {
            setHppOptions(json.data.map(h => ({
              value: h.id_kategori_hpp,
              label: `${h.nama_kategori_hpp} (HPP: Rp ${Number(h.total_hpp || 0).toLocaleString('id-ID')})`,
              total_hpp: Number(h.total_hpp || 0)
            })));
          }
        }
      } catch (e) {
        console.warn('Gagal memuat HPP options:', e);
      }
    }
    fetchHppList();
  }, []);

  // Dynamic Kategori List from Storage
  const [kategoriOptions, setKategoriOptions] = useState(() => {
    try {
      const saved = localStorage.getItem(KATEGORI_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(k => k.status !== 'Nonaktif').map(k => k.nama);
        }
      }
    } catch (e) {}
    return INITIAL_KATEGORI_DATA.map(k => k.nama);
  });

  useEffect(() => {
    const handleKategoriUpdate = () => {
      try {
        const saved = localStorage.getItem(KATEGORI_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setKategoriOptions(parsed.filter(k => k.status !== 'Nonaktif').map(k => k.nama));
          }
        }
      } catch (e) {}
    };

    window.addEventListener('kategori_updated', handleKategoriUpdate);
    window.addEventListener('storage', handleKategoriUpdate);
    return () => {
      window.removeEventListener('kategori_updated', handleKategoriUpdate);
      window.removeEventListener('storage', handleKategoriUpdate);
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(produkList));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }, [produkList]);

  // Summary counts dari keseluruhan database (Server-side)
  const totalProduk = serverCounts.semua;
  const totalTersedia = serverCounts.tersedia;
  const totalMenipis = serverCounts.menipis;
  const totalHabis = serverCounts.habis;
  const totalPO = serverCounts.po;
  const totalReady = serverCounts.ready;

  // Data yang ditampilkan langsung berasal dari server yang sudah dipaginasi
  const paginatedList = produkList;

  const changeTab = (tab) => {
    setActiveFilterTab(tab);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setSearch('');
    setActiveFilterTab('semua');
    setFilterKategori('Semua');
    setFilterTipeSet('Semua');
    setFilterStatusOrder('Semua');
    setFilterStatus('Semua');
    setCurrentPage(1);
    setSelectedIds([]);
    loadMasterProduk();
    toastSuccess('Data produk berhasil diperbarui dari database');
  };

  // Toggle item selection
  const toggleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPage = () => {
    const pageItemIds = paginatedList.map(i => i.id);
    const allSelected = pageItemIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageItemIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageItemIds])));
    }
  };

  // Batch action: Ubah masal status order (PO atau Ready Stok)
  const handleBatchSetStatusOrder = async (targetStatus) => {
    if (selectedIds.length === 0) {
      toastError('Pilih setidaknya 1 produk terlebih dahulu!');
      return;
    }

    const confirmed = await showConfirm(
      `Ubah ke ${targetStatus}?`,
      `Ubah status order ${selectedIds.length} produk terpilih menjadi "${targetStatus}"?`,
      `Ya, Ubah ke ${targetStatus}`,
      'Batal'
    );
    if (!confirmed) return;

    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/marketplace/master/batch-status-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status_order: targetStatus })
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Gagal update status di server');
      }

      setProdukList(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, status_order: targetStatus } : p));
      toastSuccess(`Berhasil mengubah ${selectedIds.length} produk menjadi "${targetStatus}"!`);
      setSelectedIds([]);
    } catch (err) {
      toastError(`Gagal: ${err.message}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Batch action: Deteksi otomatis masal (PO jika ada kata PO / Custom, bukan Polos)
  const handleBatchAutoDetectStatusOrder = async (useSelectionOnly = true) => {
    const targets = (useSelectionOnly && selectedIds.length > 0)
      ? produkList.filter(p => selectedIds.includes(p.id))
      : filteredList;

    if (targets.length === 0) {
      toastError('Tidak ada produk untuk dideteksi!');
      return;
    }

    const itemsToUpdate = targets.map(p => ({
      id: p.id,
      status_order: detectStatusOrder(p.nama_produk, p.sku)
    }));

    const countPO = itemsToUpdate.filter(i => i.status_order === 'PO').length;
    const countReady = itemsToUpdate.length - countPO;

    const confirmed = await showConfirm(
      'Deteksi Otomatis PO & Ready Stok?',
      `Sistem akan menganalisis nama & SKU dari ${targets.length} produk. Kata PO, Pre Order & Custom akan otomatis dijadikan PO, lainnya Ready Stok.\n\nHasil analisis: ${countPO} PO, ${countReady} Ready Stok. Terapkan?`,
      'Ya, Terapkan Sekarang',
      'Batal'
    );
    if (!confirmed) return;

    setProcessMessage(`Mendeteksi Status PO & Ready Stok untuk ${targets.length} produk...`);
    setIsBatchProcessing(true);
    try {
      const res = await fetch('/api/marketplace/master/batch-status-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToUpdate })
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Gagal menyimpan hasil deteksi');
      }

      const mapUpdates = new Map(itemsToUpdate.map(it => [it.id, it.status_order]));
      setProdukList(prev => prev.map(p => mapUpdates.has(p.id) ? { ...p, status_order: mapUpdates.get(p.id) } : p));
      toastSuccess(`Berhasil! ${countPO} produk diset PO, ${countReady} produk diset Ready Stok.`);
      setSelectedIds([]);
    } catch (err) {
      toastError(`Gagal deteksi: ${err.message}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Deteksi Otomatis Produk Bundle / Satu Setel (Mendeteksi SET-, Setelan, dll)
  const handleAutoDetectBundle = async (onlySelected = false) => {
    const targets = onlySelected && selectedIds.length > 0
      ? produkList.filter(p => selectedIds.includes(p.id))
      : filteredList;

    if (targets.length === 0) {
      toastError('Tidak ada produk untuk dideteksi!');
      return;
    }

    const itemsToUpdate = targets.map(p => {
      const detectedTipe = detectBundleSet(p.nama_produk, p.sku);
      let updatedBundleItems = Array.isArray(p.bundle_items) ? [...p.bundle_items] : [];
      
      // Jika terdeteksi Satu Setel / Bundle dan belum ada komponennya atau belum linked ke master
      if (detectedTipe === 'Satu Setel' && (updatedBundleItems.length === 0 || updatedBundleItems.some(bi => !bi.produk_id))) {
        updatedBundleItems = parseBundleComponents(p.sku, p.nama_produk, produkList, p.harga_beli, p.panjang_kain_cm, p.harga_kain_cm);
      }

      return {
        ...p,
        tipe_set: detectedTipe,
        bundle_items: updatedBundleItems
      };
    });

    const countBundle = itemsToUpdate.filter(i => i.tipe_set === 'Satu Setel').length;
    const countSingle = itemsToUpdate.length - countBundle;

    const confirmed = await showConfirm(
      'Deteksi Bundle / Satu Setel?',
      `Sistem akan menganalisis nama & SKU dari ${targets.length} produk. SKU berawalan "SET-" atau nama yang memuat "Setelan/1 Set/Bundle" akan diset sebagai Bundle (Satu Setel).\n\nHasil: ${countBundle} Bundle/Setel, ${countSingle} Single. Terapkan?`,
      'Ya, Terapkan Sekarang',
      'Batal'
    );
    if (!confirmed) return;

    setProcessMessage(`Mendeteksi & Menyimpan ${countBundle} Paket Bundle ke Database...`);
    setIsBatchProcessing(true);
    try {
      // 1. Simpan permanen ke database MySQL
      const payloadItems = itemsToUpdate.map(it => ({
        id: it.id,
        tipe_set: it.tipe_set,
        bundle_items: it.bundle_items
      }));

      try {
        await fetch('/api/marketplace/master/batch-bundle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payloadItems })
        });
      } catch (apiErr) {
        console.warn('Gagal sync batch-bundle ke backend API:', apiErr);
      }

      const mapUpdates = new Map(itemsToUpdate.map(it => [it.id, it]));
      setProdukList(prev => prev.map(p => mapUpdates.has(p.id) ? mapUpdates.get(p.id) : p));
      
      const updatedAll = produkList.map(p => mapUpdates.has(p.id) ? mapUpdates.get(p.id) : p);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAll));
      } catch (e) {}

      toastSuccess(`Berhasil! ${countBundle} produk diset Bundle dan disimpan permanen ke Database.`);
      setSelectedIds([]);
    } catch (err) {
      toastError(`Gagal deteksi bundle: ${err.message}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    const nextId = produkList.length > 0 ? Math.max(...produkList.map(p => p.id)) + 1 : 1;
    setFormData({
      ...initialForm,
      sku: `PRD-260${String(nextId).padStart(4, '0')}`
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    let bundleItems = Array.isArray(item.bundle_items) ? JSON.parse(JSON.stringify(item.bundle_items)) : [];
    const isBundle = (item.tipe_set === 'Satu Setel' || item.tipe_set === 'Bundle') || (item.sku && item.sku.startsWith('SET-'));
    
    // Jika bundle tapi bundle_items kosong atau belum memiliki produk_id, auto-parse dari SKU
    if (isBundle && (bundleItems.length === 0 || bundleItems.some(bi => !bi.produk_id))) {
      const parsed = parseBundleComponents(item.sku, item.nama_produk, produkList, item.harga_beli, item.panjang_kain_cm, item.harga_kain_cm);
      bundleItems = parsed.map((pi, idx) => {
        const existing = bundleItems[idx];
        return existing ? { ...existing, produk_id: existing.produk_id || pi.produk_id, sku: existing.sku || pi.sku } : pi;
      });
    }

    setFormData({
      ...item,
      id_kategori_hpp: item.id_kategori_hpp || '',
      estimasi_kain: item.estimasi_kain || '',
      panjang_kain_cm: item.panjang_kain_cm !== undefined ? item.panjang_kain_cm : 200,
      harga_kain_cm: item.harga_kain_cm !== undefined ? item.harga_kain_cm : 150,
      bundle_items: bundleItems
    });
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (item) => {
    let resolvedItem = { ...item };
    const isBundle = (item.tipe_set === 'Satu Setel' || item.tipe_set === 'Bundle') || (item.sku && item.sku.startsWith('SET-'));
    let bundleItems = Array.isArray(item.bundle_items) ? [...item.bundle_items] : [];
    if (isBundle && (bundleItems.length === 0 || bundleItems.some(bi => !bi.produk_id))) {
      const parsed = parseBundleComponents(item.sku, item.nama_produk, produkList, item.harga_beli, item.panjang_kain_cm, item.harga_kain_cm);
      bundleItems = parsed.map((pi, idx) => {
        const existing = bundleItems[idx];
        return existing ? { ...existing, produk_id: existing.produk_id || pi.produk_id, sku: existing.sku || pi.sku } : pi;
      });
      resolvedItem.bundle_items = bundleItems;
    }
    setSelectedProduk(resolvedItem);
    setIsDetailModalOpen(true);
  };

  // Helper Bundle / Paket Setel Components
  const handleAddBundleItem = () => {
    // Cari produk single pertama sebagai template
    const singleProds = produkList.filter(p => (p.tipe_set || 'Single') === 'Single');
    const pRef = singleProds[0] || produkList[0] || {
      id: 0,
      nama_produk: 'Komponen Baru (Baju/Celana/Dll)',
      sku: 'SKU-KOMP',
      estimasi_kain: 'Drill',
      panjang_kain_cm: 100,
      harga_kain_cm: 150,
      harga_beli: 30000
    };

    const newItem = {
      id: `bi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      produk_id: pRef.id || null,
      nama_komponen: pRef.nama_produk || 'Komponen Baju',
      sku: pRef.sku || '',
      qty: 1,
      kain_nama: pRef.estimasi_kain || 'Kain Polos',
      panjang_kain_cm: Number(pRef.panjang_kain_cm || 120),
      harga_kain_cm: Number(pRef.harga_kain_cm || 150),
      harga_modal_item: Number(pRef.harga_beli || 35000)
    };

    setFormData(prev => {
      const nextItems = [...(prev.bundle_items || []), newItem];
      // Auto kalkulasi total modal dan estimasi kain dari gabungan item
      const totalModal = nextItems.reduce((acc, it) => acc + (Number(it.harga_modal_item || 0) * (Number(it.qty) || 1)), 0);
      const totalCm = nextItems.reduce((acc, it) => acc + (Number(it.panjang_kain_cm || 0) * (Number(it.qty) || 1)), 0);
      const avgHargaCm = nextItems.length > 0 ? Math.round(nextItems.reduce((acc, it) => acc + Number(it.harga_kain_cm || 0), 0) / nextItems.length) : 150;
      const combinedKainNama = nextItems.map(it => `${it.nama_komponen}: ${it.kain_nama || 'Kain'} (${it.panjang_kain_cm}cm)`).join(' + ');

      return {
        ...prev,
        bundle_items: nextItems,
        harga_beli: totalModal > 0 ? totalModal : prev.harga_beli,
        panjang_kain_cm: totalCm > 0 ? totalCm : prev.panjang_kain_cm,
        harga_kain_cm: avgHargaCm,
        estimasi_kain: combinedKainNama || prev.estimasi_kain
      };
    });
  };

  const handleRemoveBundleItem = (index) => {
    setFormData(prev => {
      const nextItems = (prev.bundle_items || []).filter((_, i) => i !== index);
      const totalModal = nextItems.reduce((acc, it) => acc + (Number(it.harga_modal_item || 0) * (Number(it.qty) || 1)), 0);
      const totalCm = nextItems.reduce((acc, it) => acc + (Number(it.panjang_kain_cm || 0) * (Number(it.qty) || 1)), 0);
      const avgHargaCm = nextItems.length > 0 ? Math.round(nextItems.reduce((acc, it) => acc + Number(it.harga_kain_cm || 0), 0) / nextItems.length) : 150;
      const combinedKainNama = nextItems.map(it => `${it.nama_komponen}: ${it.kain_nama || 'Kain'} (${it.panjang_kain_cm}cm)`).join(' + ');

      return {
        ...prev,
        bundle_items: nextItems,
        harga_beli: totalModal > 0 ? totalModal : prev.harga_beli,
        panjang_kain_cm: totalCm > 0 ? totalCm : prev.panjang_kain_cm,
        harga_kain_cm: avgHargaCm,
        estimasi_kain: combinedKainNama || prev.estimasi_kain
      };
    });
  };

  const handleUpdateBundleItem = (index, field, val) => {
    setFormData(prev => {
      const nextItems = [...(prev.bundle_items || [])];
      let updatedItem = { ...nextItems[index], [field]: val };

      // Jika user memilih produk dari master untuk komponen ini
      if (field === 'produk_id') {
        const found = produkList.find(p => String(p.id) === String(val));
        if (found) {
          updatedItem = {
            ...updatedItem,
            produk_id: found.id,
            nama_komponen: found.nama_produk,
            sku: found.sku,
            kain_nama: found.estimasi_kain || 'Kain Polos',
            panjang_kain_cm: Number(found.panjang_kain_cm || 100),
            harga_kain_cm: Number(found.harga_kain_cm || 150),
            harga_modal_item: Number(found.harga_beli || 0)
          };
        } else {
          updatedItem.produk_id = val;
        }
      } else if (field === 'sku') {
        const found = produkList.find(p => p.sku && p.sku.toLowerCase() === (val || '').toLowerCase());
        if (found) {
          updatedItem = {
            ...updatedItem,
            produk_id: found.id,
            nama_komponen: found.nama_produk,
            sku: found.sku,
            kain_nama: found.estimasi_kain || 'Kain Polos',
            panjang_kain_cm: Number(found.panjang_kain_cm || 100),
            harga_kain_cm: Number(found.harga_kain_cm || 150),
            harga_modal_item: Number(found.harga_beli || 0)
          };
        } else {
          updatedItem.sku = val;
        }
      }

      nextItems[index] = updatedItem;

      const totalModal = nextItems.reduce((acc, it) => acc + (Number(it.harga_modal_item || 0) * (Number(it.qty) || 1)), 0);
      const totalCm = nextItems.reduce((acc, it) => acc + (Number(it.panjang_kain_cm || 0) * (Number(it.qty) || 1)), 0);
      const avgHargaCm = nextItems.length > 0 ? Math.round(nextItems.reduce((acc, it) => acc + Number(it.harga_kain_cm || 0), 0) / nextItems.length) : 150;
      const combinedKainNama = nextItems.map(it => `${it.nama_komponen}: ${it.kain_nama || 'Kain'} (${it.panjang_kain_cm}cm)`).join(' + ');

      return {
        ...prev,
        bundle_items: nextItems,
        harga_beli: totalModal > 0 ? totalModal : prev.harga_beli,
        panjang_kain_cm: totalCm > 0 ? totalCm : prev.panjang_kain_cm,
        harga_kain_cm: avgHargaCm,
        estimasi_kain: combinedKainNama || prev.estimasi_kain
      };
    });
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm(
      'Hapus Produk?',
      `Yakin ingin menghapus "${item.nama_produk}" (${item.sku})? Data yang dihapus tidak bisa dikembalikan.`,
      'Ya, Hapus Produk',
      'Batal'
    );
    if (confirmed) {
      try {
        await fetch(`/api/marketplace/master/${item.id}`, { method: 'DELETE' });
      } catch (e) {}
      setProdukList(prev => prev.filter(p => p.id !== item.id));
      toastSuccess('Produk berhasil dihapus');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_produk.trim()) {
      toastError('Nama produk wajib diisi!');
      return;
    }

    if (editingId) {
      try {
        await fetch(`/api/marketplace/master/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama_produk: formData.nama_produk,
            kategori: formData.kategori,
            satuan: formData.satuan,
            harga_jual: formData.harga_jual,
            harga_modal: formData.harga_beli,
            stok_fisik: formData.stok,
            status: formData.status || 'Aktif',
            status_order: formData.status_order || 'Ready Stok',
            kode_sku: formData.sku,
            tipe_set: formData.tipe_set || 'Single',
            bundle_items: formData.bundle_items || [],
            estimasi_kain: formData.estimasi_kain || 'Kain Polos',
            panjang_kain_cm: Number(formData.panjang_kain_cm) || 200,
            harga_kain_cm: Number(formData.harga_kain_cm) || 150,
            id_kategori_hpp: formData.id_kategori_hpp || null
          })
        });
      } catch (err) {}
      const selectedHpp = hppOptions.find(h => h.value === formData.id_kategori_hpp);
      const updatedList = produkList.map(p => p.id === editingId ? { 
        ...formData, 
        id: editingId,
        nama_kategori_hpp: selectedHpp ? selectedHpp.label.split(' (HPP:')[0] : '',
        hpp_kategori: selectedHpp ? selectedHpp.total_hpp : 0
      } : p);
      setProdukList(updatedList);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList)); } catch (e) {}
      toastSuccess('Data produk berhasil diperbarui');
    } else {
      const newId = produkList.length > 0 ? Math.max(...produkList.map(p => p.id)) + 1 : 1;
      const selectedHpp = hppOptions.find(h => h.value === formData.id_kategori_hpp);
      const newProduk = {
        ...formData,
        id: newId,
        company_code: activeCompany.code || 'RSG',
        status_order: formData.status_order || detectStatusOrder(formData.nama_produk, formData.sku),
        nama_kategori_hpp: selectedHpp ? selectedHpp.label.split(' (HPP:')[0] : '',
        hpp_kategori: selectedHpp ? selectedHpp.total_hpp : 0
      };

      try {
        await fetch('/api/marketplace/master', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kode_perusahaan: newProduk.company_code,
            kode_sku: newProduk.sku,
            nama_produk: newProduk.nama_produk,
            kategori: newProduk.kategori,
            satuan: newProduk.satuan,
            harga_jual: newProduk.harga_jual,
            harga_modal: newProduk.harga_beli,
            stok_fisik: newProduk.stok,
            status: 'Aktif',
            status_order: newProduk.status_order,
            tipe_set: newProduk.tipe_set || 'Single',
            bundle_items: newProduk.bundle_items || [],
            estimasi_kain: newProduk.estimasi_kain || 'Kain Polos',
            panjang_kain_cm: Number(newProduk.panjang_kain_cm) || 200,
            harga_kain_cm: Number(newProduk.harga_kain_cm) || 150,
            id_kategori_hpp: newProduk.id_kategori_hpp || null
          })
        });
      } catch (err) {}

      const updatedList = [newProduk, ...produkList];
      setProdukList(updatedList);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList)); } catch (e) {}
      toastSuccess('Produk baru berhasil ditambahkan');
    }
    setIsFormModalOpen(false);
  };

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
      {/* MASTER CONTAINER CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
      }}>

        {/* HEADER TITLE & ACTION BUTTONS (BERWARNA BLUE GRADIENT) */}
        <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '8px',
        padding: '10px 16px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '6px',
        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.22)'
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
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Data Induk Produk & Varian Stok
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.88)' }}>
              Kelola data produk, SKU, varian, kategori, status stok, dan estimasi kain
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          
          {/* Tombol Deteksi PO */}
          <button
            disabled={isBatchProcessing}
            onClick={() => handleBatchAutoDetectStatusOrder(false)}
            title="Scan dan deteksi otomatis semua produk: kata PO (bukan Polos) & Custom otomatis jadi PO, lainnya Ready Stok"
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isBatchProcessing ? '#a78bfa' : '#8b5cf6',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              lineHeight: 1,
              cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { if (!isBatchProcessing) e.currentTarget.style.backgroundColor = '#7c3aed'; }}
            onMouseLeave={(e) => { if (!isBatchProcessing) e.currentTarget.style.backgroundColor = '#8b5cf6'; }}
          >
            {isBatchProcessing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            <span>{isBatchProcessing ? 'Memproses...' : 'Deteksi PO'}</span>
          </button>

          {/* Tombol Deteksi Bundle */}
          <button
            disabled={isBatchProcessing}
            onClick={() => handleAutoDetectBundle(false)}
            title="Scan SKU 'SET-' atau nama produk 'Setelan / 1 Set / Bundle' dan jadikan Bundle Set otomatis"
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isBatchProcessing ? '#38bdf8' : '#0284c7',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              lineHeight: 1,
              cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { if (!isBatchProcessing) e.currentTarget.style.backgroundColor = '#0369a1'; }}
            onMouseLeave={(e) => { if (!isBatchProcessing) e.currentTarget.style.backgroundColor = '#0284c7'; }}
          >
            {isBatchProcessing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Boxes size={13} />
            )}
            <span>{isBatchProcessing ? 'Memproses...' : 'Deteksi Bundle'}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            style={{
              height: '30px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#ffffff',
              color: '#0284c7',
              fontSize: '12px',
              fontWeight: '800',
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            <Plus size={14} />
            <span>Tambah</span>
          </button>

        </div>

      </div>

      {/* FILTER TABS (BERWARNA COLOR-CODED) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
        
        {/* Tab 1: Semua Produk (Biru) */}
        <button
          onClick={() => changeTab('semua')}
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

        {/* Tab 2: Produk Tersedia (Hijau) */}
        <button
          onClick={() => changeTab('tersedia')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'tersedia' ? '1px solid #059669' : '1px solid #a7f3d0',
            backgroundColor: activeFilterTab === 'tersedia' ? '#059669' : '#ecfdf5',
            color: activeFilterTab === 'tersedia' ? '#ffffff' : '#047857',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'tersedia' ? '0 1px 4px rgba(5, 150, 105, 0.25)' : 'none'
          }}
        >
          <Store size={13} />
          <span>Produk Tersedia ({totalTersedia})</span>
        </button>

        {/* Tab 3: Stok Menipis (Oranye/Amber) */}
        <button
          onClick={() => changeTab('menipis')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'menipis' ? '1px solid #d97706' : '1px solid #fde68a',
            backgroundColor: activeFilterTab === 'menipis' ? '#d97706' : '#fffbeb',
            color: activeFilterTab === 'menipis' ? '#ffffff' : '#b45309',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'menipis' ? '0 1px 4px rgba(217, 119, 6, 0.25)' : 'none'
          }}
        >
          <Clock size={13} />
          <span>Stok Menipis ({totalMenipis})</span>
        </button>

        {/* Tab 4: Stok Habis (Merah) */}
        <button
          onClick={() => changeTab('habis')}
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

        {/* Tab 5: Pre-Order / PO (Oranye Spesial) */}
        <button
          onClick={() => changeTab('po')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'po' ? '1px solid #ea580c' : '1px solid #fed7aa',
            backgroundColor: activeFilterTab === 'po' ? '#ea580c' : '#fff7ed',
            color: activeFilterTab === 'po' ? '#ffffff' : '#c2410c',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'po' ? '0 1px 4px rgba(234, 88, 12, 0.25)' : 'none'
          }}
        >
          <Clock size={13} />
          <span>PO / Pre-Order ({totalPO})</span>
        </button>

        {/* Tab 6: Ready Stok (Hijau) */}
        <button
          onClick={() => changeTab('ready')}
          style={{
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 12px',
            borderRadius: '6px',
            border: activeFilterTab === 'ready' ? '1px solid #059669' : '1px solid #bbf7d0',
            backgroundColor: activeFilterTab === 'ready' ? '#059669' : '#f0fdf4',
            color: activeFilterTab === 'ready' ? '#ffffff' : '#15803d',
            fontSize: '12px',
            fontWeight: '700',
            lineHeight: 1,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeFilterTab === 'ready' ? '0 1px 4px rgba(5, 150, 105, 0.25)' : 'none'
          }}
        >
          <CheckCircle size={13} />
          <span>Ready Stok ({totalReady})</span>
        </button>

      </div>

      {/* FILTER CONTROLS BAR (MEPET 5-6PX) */}
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
        
        {/* Search input with icon */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama produk, SKU, varian, tipe set, status order..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              outline: 'none',
              backgroundColor: '#f8fafc',
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

        {/* Select Kategori */}
        <select
          value={filterKategori}
          onChange={(e) => {
            setFilterKategori(e.target.value);
            setCurrentPage(1);
          }}
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
          <option value="Semua">Semua Kategori</option>
          {kategoriOptions.map((kat, idx) => (
            <option key={idx} value={kat}>{kat}</option>
          ))}
        </select>

        {/* Select Tipe: Satu Setel / Single */}
        <select
          value={filterTipeSet}
          onChange={(e) => {
            setFilterTipeSet(e.target.value);
            setCurrentPage(1);
          }}
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
          <option value="Semua">Semua Tipe</option>
          <option value="Satu Setel">Satu Setel</option>
          <option value="Single">Single</option>
        </select>

        {/* Select Status Order: Ready Stok / PO */}
        <select
          value={filterStatusOrder}
          onChange={(e) => {
            setFilterStatusOrder(e.target.value);
            setCurrentPage(1);
          }}
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
          <option value="Semua">Semua Order</option>
          <option value="Ready Stok">Ready Stok</option>
          <option value="PO">PO (Pre-Order)</option>
        </select>

        {/* Select Status Stok Fisik */}
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
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
          <option value="Tersedia">Tersedia</option>
          <option value="Menipis">Menipis</option>
          <option value="Habis">Habis</option>
        </select>

        {/* Select Baris Per Halaman (Paging) */}
        <select
          value={entriesPerPage}
          onChange={(e) => {
            setEntriesPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
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
          <option value={250}>250 Baris</option>
        </select>

      </div>

      {/* BATCH ACTION BAR (MUNCUL KETIKA ADA ITEM YANG DICENTANG) */}
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
            <span>{selectedIds.length} produk terpilih</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Tombol Masal: Ubah ke PO */}
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={() => handleBatchSetStatusOrder('PO')}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #f97316',
                backgroundColor: '#ea580c',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(234, 88, 12, 0.3)'
              }}
            >
              <Clock size={13} />
              <span>{isBatchProcessing ? 'Memproses...' : 'Ubah Masal ke PO'}</span>
            </button>

            {/* Tombol Masal: Ubah ke Ready Stok */}
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={() => handleBatchSetStatusOrder('Ready Stok')}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #059669',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle size={13} />
              <span>{isBatchProcessing ? 'Memproses...' : 'Ubah Masal ke Ready Stok'}</span>
            </button>

            {/* Tombol Masal: Deteksi PO */}
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={() => handleBatchAutoDetectStatusOrder(true)}
              title="Deteksi kata PO & Custom (bukan Polos)"
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #7c3aed',
                backgroundColor: isBatchProcessing ? '#a78bfa' : '#8b5cf6',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(139, 92, 246, 0.3)'
              }}
            >
              {isBatchProcessing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{isBatchProcessing ? 'Memproses...' : 'Deteksi PO'}</span>
            </button>

            {/* Tombol Masal: Deteksi Bundle */}
            <button
              type="button"
              disabled={isBatchProcessing}
              onClick={() => handleAutoDetectBundle(true)}
              title="Deteksi SKU 'SET-' atau nama produk 'Setelan / 1 Set / Bundle' untuk produk terpilih"
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #0284c7',
                backgroundColor: isBatchProcessing ? '#38bdf8' : '#0284c7',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)'
              }}
            >
              {isBatchProcessing ? <Loader2 size={13} className="animate-spin" /> : <Boxes size={13} />}
              <span>{isBatchProcessing ? 'Memproses...' : 'Deteksi Bundle'}</span>
            </button>

            {/* Tombol Batal Pilih */}
            <button
              type="button"
              disabled={isBatchProcessing}
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

      {/* DATA TABLE (MATCHING HEADER WIDTH & SIDE-TO-SIDE 16PX) */}
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
                <th style={{ padding: '5px 8px', textAlign: 'center', width: '36px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={paginatedList.length > 0 && paginatedList.every(i => selectedIds.includes(i.id))}
                    onChange={toggleSelectAllPage}
                    style={{ cursor: 'pointer' }}
                    title="Pilih Semua di Halaman Ini"
                  />
                </th>
                <th style={{ padding: '5px 8px', textAlign: 'center', width: '45px', border: '1px solid #cbd5e1' }}>NO</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>NAMA PRODUK & SKU</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>KATEGORI & VARIAN</th>
                <th style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>ESTIMASI KAIN (CM & HARGA)</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>JUMLAH STOK TERSEDIA</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>HARGA HPP</th>
                <th style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>HARGA JUAL</th>
                <th style={{ padding: '5px 8px', textAlign: 'center', width: '140px', border: '1px solid #cbd5e1' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" style={{ padding: '48px 16px', textAlign: 'center', backgroundColor: '#fbfcfe', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0fdf4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.12)'
                      }}>
                        <Loader2 size={24} color="#0284c7" className="animate-spin" />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.01em' }}>
                          Menarik Data Master Produk...
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                          Sinkronisasi katalog dari database MySQL & perhitungan stok real-time
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                    <Package size={32} color="#cbd5e1" style={{ marginBottom: '6px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#334155' }}>Tidak ada produk ditemukan</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>Coba ubah kata kunci pencarian atau reset filter.</div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, index) => {
                  const rowNumber = (currentPage - 1) * entriesPerPage + index + 1;
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id}
                      style={{
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                        transition: 'background-color 0.15s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* CHECKBOX */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* NO */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                        {rowNumber}
                      </td>

                      {/* NAMA PRODUK & SKU */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.foto_produk ? (
                            <img 
                              src={item.foto_produk} 
                              alt={item.nama_produk} 
                              style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #cbd5e1', flexShrink: 0 }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : null}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', lineHeight: 1.2 }}>
                              {item.nama_produk}
                            </div>
                            <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>
                              {item.sku}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* KATEGORI & VARIAN (DISATUKAN) */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1' }}>
                        {/* Baris 1: Kategori + Tipe Set + Status Order */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '2px' }}>
                          {/* Kategori Badge */}
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: item.kategori === 'Gamis Syari' ? '#ecfdf5' : item.kategori === 'Gamis Casual' ? '#eff6ff' : item.kategori === 'Gamis Pesta' ? '#faf5ff' : '#f8fafc',
                            color: item.kategori === 'Gamis Syari' ? '#047857' : item.kategori === 'Gamis Casual' ? '#1d4ed8' : item.kategori === 'Gamis Pesta' ? '#7e22ce' : '#334155',
                            border: item.kategori === 'Gamis Syari' ? '1px solid #a7f3d0' : item.kategori === 'Gamis Casual' ? '1px solid #bfdbfe' : item.kategori === 'Gamis Pesta' ? '1px solid #e9d5ff' : '1px solid #cbd5e1'
                          }}>
                            {item.kategori}
                          </span>

                          {/* Tipe: Bundle / Satu Setel / Single */}
                          <span style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: (item.tipe_set === 'Satu Setel' || item.tipe_set === 'Bundle') ? '#f5f3ff' : '#f1f5f9',
                            color: (item.tipe_set === 'Satu Setel' || item.tipe_set === 'Bundle') ? '#6d28d9' : '#475569',
                            border: (item.tipe_set === 'Satu Setel' || item.tipe_set === 'Bundle') ? '1px solid #ddd6fe' : '1px solid #cbd5e1'
                          }}>
                            {(item.tipe_set === 'Satu Setel' || item.tipe_set === 'Bundle') 
                              ? `Bundle Set (${Array.isArray(item.bundle_items) ? item.bundle_items.length : 2} Komp)` 
                              : (item.tipe_set || 'Single')}
                          </span>

                          {/* Status Order: Ready Stok / PO (Bisa diklik untuk ubah cepat) */}
                          <span 
                            onClick={async (e) => {
                              e.stopPropagation();
                              const nextStatus = item.status_order === 'PO' ? 'Ready Stok' : 'PO';
                              try {
                                await fetch(`/api/marketplace/master/${item.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status_order: nextStatus })
                                });
                                setProdukList(prev => prev.map(p => p.id === item.id ? { ...p, status_order: nextStatus } : p));
                                toastSuccess(`Status "${item.nama_produk}" diubah ke ${nextStatus}`);
                              } catch (err) {}
                            }}
                            title="Klik untuk ubah cepat PO / Ready Stok"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '700',
                              backgroundColor: item.status_order === 'PO' ? '#fff7ed' : '#f0fdf4',
                              color: item.status_order === 'PO' ? '#c2410c' : '#15803d',
                              border: item.status_order === 'PO' ? '1px solid #fed7aa' : '1px solid #bbf7d0',
                              cursor: 'pointer'
                            }}
                          >
                            {item.status_order === 'PO' ? 'PO' : 'Ready Stok'}
                          </span>
                        </div>

                        {/* Baris 2: Nama Varian Warna / Ukuran */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={11} color="#0284c7" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '11px', lineHeight: 1.2 }}>
                            {item.varian || 'Reguler'}
                          </span>
                        </div>

                        {/* Baris 3: Kategori HPP Terhubung */}
                        {item.id_kategori_hpp ? (
                          <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontSize: '9.5px',
                              fontWeight: '700',
                              backgroundColor: '#ecfdf5',
                              color: '#047857',
                              border: '1px solid #a7f3d0'
                            }} title={`Terhubung ke HPP: ${item.nama_kategori_hpp || item.id_kategori_hpp} (Rp ${Number(item.hpp_kategori || 0).toLocaleString('id-ID')})`}>
                              <span>HPP: {item.nama_kategori_hpp ? (item.nama_kategori_hpp.length > 25 ? `${item.nama_kategori_hpp.slice(0, 25)}...` : item.nama_kategori_hpp) : item.id_kategori_hpp}</span>
                            </span>
                          </div>
                        ) : null}
                      </td>

                      {/* ESTIMASI KAIN (CM & HARGA) */}
                      <td style={{ padding: '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                        <div style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)',
                          border: '1px solid #bae6fd',
                          boxShadow: '0 1px 2px rgba(2, 132, 199, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          minWidth: '200px'
                        }}>
                          {/* Baris 1: Ikon + Jenis Kain + Badge CM */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Layers size={11} color="#0284c7" />
                              <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '11px', lineHeight: 1.2 }}>
                                {item.estimasi_kain || '-'}
                              </span>
                            </div>
                            <span style={{
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: '#ffffff',
                              color: '#0284c7',
                              fontSize: '9.5px',
                              fontWeight: '800',
                              border: '1px solid #bfdbfe',
                              whiteSpace: 'nowrap'
                            }}>
                              {item.panjang_kain_cm || 0} CM
                            </span>
                          </div>

                          {/* Baris 2: Harga / CM & Biaya per Pcs */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '4px',
                            backgroundColor: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            fontSize: '9.5px'
                          }}>
                            <span style={{ color: '#64748b' }}>
                              @Rp {Number(item.harga_kain_cm || 0).toLocaleString('id-ID')}/CM
                            </span>
                            <span style={{
                              fontWeight: '800',
                              color: '#059669',
                              whiteSpace: 'nowrap'
                            }}>
                              Rp {((Number(item.panjang_kain_cm) || 0) * (Number(item.harga_kain_cm) || 0)).toLocaleString('id-ID')}/pcs
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* JUMLAH STOK TERSEDIA */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: item.stok > item.min_stok ? '#ecfdf5' : item.stok > 0 ? '#fffbeb' : '#fef2f2',
                          color: item.stok > item.min_stok ? '#059669' : item.stok > 0 ? '#d97706' : '#dc2626',
                          border: item.stok > item.min_stok ? '1px solid #a7f3d0' : item.stok > 0 ? '1px solid #fde68a' : '1px solid #fecaca',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.stok} {item.satuan}
                        </span>
                      </td>

                      {/* HARGA HPP */}
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '700', color: '#475569', fontSize: '12px', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(item.harga_beli)}
                      </td>

                      {/* HARGA JUAL */}
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: '800', color: '#059669', fontSize: '12px', whiteSpace: 'nowrap', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(item.harga_jual)}
                      </td>

                      {/* ACTION BUTTONS (Detail, Edit, Hapus) */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          
                          {/* 1. Detail Eye Button (Teal / Cyan) */}
                          <button
                            onClick={() => handleOpenDetail(item)}
                            title="Lihat Detail Produk"
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#06b6d4',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <Eye size={13} />
                          </button>                          {/* 3. Edit Pencil Button (Blue) */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data Produk"
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
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* 4. Delete Trash Button (Red) */}
                          <button
                            onClick={() => handleDelete(item)}
                            title="Hapus Produk"
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
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
            Menampilkan <strong>{totalCount === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</strong> sampai <strong>{Math.min(currentPage * entriesPerPage, totalCount)}</strong> dari <strong>{totalCount}</strong> produk
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
                fontWeight: '700',
                transition: 'all 0.15s ease'
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
                fontWeight: '700',
                transition: 'all 0.15s ease'
              }}
            >
              Selanjutnya
            </button>
          </div>
        </div>

      </div>

      </div>

      {/* ========================================================
          MODAL 1: FORM TAMBAH / EDIT PRODUK (FULL SCREEN COMPACT)
          ======================================================== */}
      {isFormModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0f172a',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          
          {/* Modal Header (Dark Slate Fullscreen Compact) */}
          <div style={{
            height: '42px',
            padding: '0 16px',
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Package size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                {editingId ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Form Manajemen Katalog, Spesifikasi, Stok & Harga
              </span>
            </div>
            
            <button 
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '5px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#cbd5e1';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Modal Form Body (Fullscreen 2-Column Compact Layout) */}
          <form onSubmit={handleFormSubmit} style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '10px',
              alignItems: 'start'
            }}>
              
              {/* LEFT COLUMN: IDENTITAS & SPESIFIKASI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 1. Identitas Produk */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <Tag size={13} color="#0284c7" />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      1. Identitas Produk
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Nama Produk <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Gamis Abaya Dubai Silk Jetblack"
                        value={formData.nama_produk}
                        onChange={(e) => setFormData({ ...formData, nama_produk: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 9px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: '#0f172a',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Kode SKU <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="GMS-XXXX"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 9px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: '#0284c7',
                          backgroundColor: '#f8fafc'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Kategori & Spesifikasi */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #38bdf8',
                  padding: '10px 12px',
                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #e0f2fe'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Boxes size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Kategori & Spesifikasi
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: (formData.tipe_set === 'Satu Setel' || formData.tipe_set === 'Bundle') ? '#f3e8ff' : '#f0f9ff',
                        color: (formData.tipe_set === 'Satu Setel' || formData.tipe_set === 'Bundle') ? '#7e22ce' : '#0284c7',
                        border: (formData.tipe_set === 'Satu Setel' || formData.tipe_set === 'Bundle') ? '1px solid #d8b4fe' : '1px solid #bae6fd'
                      }}>
                        {(formData.tipe_set === 'Satu Setel' || formData.tipe_set === 'Bundle') ? 'Paket Bundle' : 'Single Item'}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: formData.status_order === 'PO' ? '#fff7ed' : '#f0fdf4',
                        color: formData.status_order === 'PO' ? '#c2410c' : '#15803d',
                        border: formData.status_order === 'PO' ? '1px solid #fed7aa' : '1px solid #bbf7d0'
                      }}>
                        {formData.status_order === 'PO' ? 'PO' : 'Ready'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <SearchableSelect
                        label="Kategori Produk"
                        value={formData.kategori}
                        onChange={(val) => setFormData({ ...formData, kategori: val })}
                        options={kategoriOptions}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Varian / Ukuran / Warna
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Hitam Jetblack - Size L"
                        value={formData.varian}
                        onChange={(e) => setFormData({ ...formData, varian: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 9px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: '#0f172a',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>
                    <div>
                      <SearchableSelect
                        label="Tipe Produk"
                        value={formData.tipe_set || 'Single'}
                        onChange={(val) => {
                          setFormData(prev => {
                            const updated = { ...prev, tipe_set: val };
                            if ((val === 'Bundle' || val === 'Satu Setel') && (!prev.bundle_items || prev.bundle_items.length === 0)) {
                              // Inisialisasi awal 2 komponen (misal: Baju + Celana)
                              const singleProds = produkList.filter(p => (p.tipe_set || 'Single') === 'Single');
                              const p1 = singleProds[0] || { id: 0, nama_produk: 'Baju / Atasan', sku: 'SKU-ATAS', panjang_kain_cm: 120, harga_kain_cm: 150, harga_beli: 40000 };
                              const p2 = singleProds[1] || { id: 0, nama_produk: 'Celana / Bawahan', sku: 'SKU-BAWAH', panjang_kain_cm: 100, harga_kain_cm: 150, harga_beli: 35000 };
                              
                              const it1 = {
                                id: `bi-${Date.now()}-1`,
                                produk_id: p1.id || null,
                                nama_komponen: p1.nama_produk || 'Baju Kemeja Seragam',
                                sku: p1.sku || '',
                                qty: 1,
                                kain_nama: p1.estimasi_kain || 'Drill Premium',
                                panjang_kain_cm: Number(p1.panjang_kain_cm || 120),
                                harga_kain_cm: Number(p1.harga_kain_cm || 150),
                                harga_modal_item: Number(p1.harga_beli || 40000)
                              };
                              const it2 = {
                                id: `bi-${Date.now()}-2`,
                                produk_id: p2.id || null,
                                nama_komponen: p2.nama_produk || 'Celana Seragam',
                                sku: p2.sku || '',
                                qty: 1,
                                kain_nama: p2.estimasi_kain || 'Drill Premium',
                                panjang_kain_cm: Number(p2.panjang_kain_cm || 100),
                                harga_kain_cm: Number(p2.harga_kain_cm || 150),
                                harga_modal_item: Number(p2.harga_beli || 35000)
                              };
                              updated.bundle_items = [it1, it2];
                              updated.harga_beli = it1.harga_modal_item + it2.harga_modal_item;
                              updated.panjang_kain_cm = it1.panjang_kain_cm + it2.panjang_kain_cm;
                              updated.estimasi_kain = `${it1.nama_komponen}: ${it1.kain_nama} (${it1.panjang_kain_cm}cm) + ${it2.nama_komponen}: ${it2.kain_nama} (${it2.panjang_kain_cm}cm)`;
                            }
                            return updated;
                          });
                        }}
                        options={[
                          { value: 'Single', label: 'Single (Satuan / Non-Bundle)' },
                          { value: 'Satu Setel', label: 'Bundle / Satu Setel (Multi Komponen: Baju + Celana dll)' }
                        ]}
                      />
                    </div>
                    <div>
                      <SearchableSelect
                        label="Status Order"
                        value={formData.status_order || 'Ready Stok'}
                        onChange={(val) => setFormData({ ...formData, status_order: val })}
                        options={[
                          { value: 'Ready Stok', label: 'Ready Stok' },
                          { value: 'PO', label: 'PO (Pre-Order)' }
                        ]}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <SearchableSelect
                        label="Kategori HPP Produk (dari Master HPP)"
                        value={formData.id_kategori_hpp}
                        onChange={(val) => {
                          const chosen = hppOptions.find(h => h.value === val);
                          setFormData(prev => ({
                            ...prev,
                            id_kategori_hpp: val,
                            harga_beli: (chosen && chosen.total_hpp > 0) ? chosen.total_hpp : prev.harga_beli
                          }));
                        }}
                        options={[
                          { value: '', label: '-- Tidak Terhubung HPP --' },
                          ...hppOptions
                        ]}
                        placeholder="Pilih Kategori HPP (misal: Batik SMA, Kemeja SD, dll)..."
                      />
                      {formData.id_kategori_hpp && (
                        <div style={{ fontSize: '10px', color: '#0369a1', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>✓ Terhubung ke: <b>{hppOptions.find(h => h.value === formData.id_kategori_hpp)?.label || formData.id_kategori_hpp}</b></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* KOMPONEN PEMISAH BUNDLE / SATU SETEL (JIKA TIPE SATU SETEL) */}
                {(formData.tipe_set === 'Satu Setel' || formData.tipe_set === 'Bundle') && (
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1.5px solid #8b5cf6',
                    padding: '10px 12px',
                    boxShadow: '0 2px 5px rgba(139, 92, 246, 0.1)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      paddingBottom: '5px',
                      borderBottom: '1px solid #ede9fe'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Boxes size={14} color="#7c3aed" />
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Komponen Pemisah Bundle ({(formData.bundle_items || []).length} Item)
                          </span>
                          <span style={{ display: 'block', fontSize: '9.5px', color: '#6b7280' }}>
                            Contoh: Setelan = Baju (120cm) + Celana (100cm). Modal & Kain otomatis terakumulasi!
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddBundleItem}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid #c4b5fd',
                          backgroundColor: '#f5f3ff',
                          color: '#7c3aed',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={12} />
                        <span>Tambah Komponen</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(() => {
                        const singleOptions = produkList.map(p => ({
                          value: p.id,
                          label: p.nama_produk,
                          sku: p.sku,
                          kategori: p.kategori,
                          estimasi_kain: p.estimasi_kain,
                          panjang_kain_cm: p.panjang_kain_cm,
                          harga_kain_cm: p.harga_kain_cm,
                          harga_beli: p.harga_beli
                        }));

                        return (formData.bundle_items || []).map((bi, bIdx) => (
                          <div
                            key={bIdx}
                            style={{
                              backgroundColor: '#fbfbfe',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '10px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>
                                #{bIdx + 1}. Komponen: {bi.sku ? `(${bi.sku})` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveBundleItem(bIdx)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Hapus komponen ini"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1.1fr', gap: '8px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '9.5px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                                  Pilih dari Master (Opsional)
                                </label>
                                <SearchableSelect
                                  value={bi.produk_id}
                                  options={singleOptions}
                                  placeholder="Pilih produk..."
                                  onChange={(val) => handleUpdateBundleItem(bIdx, 'produk_id', val)}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '9.5px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                                  Kode SKU Komponen
                                </label>
                                <input
                                  type="text"
                                  value={bi.sku || ''}
                                  onChange={(e) => handleUpdateBundleItem(bIdx, 'sku', e.target.value)}
                                  placeholder="Contoh: BP-SMA-LPK-XXXL"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: '#0284c7',
                                    backgroundColor: '#f8fafc'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '9.5px', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                                  Nama Komponen
                                </label>
                                <input
                                  type="text"
                                  value={bi.nama_komponen || ''}
                                  onChange={(e) => handleUpdateBundleItem(bIdx, 'nama_komponen', e.target.value)}
                                  placeholder="Contoh: Kemeja Seragam"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#0f172a'
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', alignItems: 'center' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                  JENIS KAIN
                                </label>
                                <input
                                  type="text"
                                  value={bi.kain_nama || ''}
                                  onChange={(e) => handleUpdateBundleItem(bIdx, 'kain_nama', e.target.value)}
                                  placeholder="Kain Drill"
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '10.5px',
                                    fontWeight: '600'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                  EST. KAIN (CM)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={bi.panjang_kain_cm || ''}
                                  onChange={(e) => handleUpdateBundleItem(bIdx, 'panjang_kain_cm', Number(e.target.value))}
                                  placeholder="120"
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '10.5px',
                                    fontWeight: '700',
                                    textAlign: 'right',
                                    color: '#0284c7'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                  HARGA/CM
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={bi.harga_kain_cm || ''}
                                  onChange={(e) => handleUpdateBundleItem(bIdx, 'harga_kain_cm', Number(e.target.value))}
                                  placeholder="150"
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '10.5px',
                                    fontWeight: '700',
                                    textAlign: 'right'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                  MODAL ITEM (RP)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={bi.harga_modal_item || ''}
                                  onChange={(e) => handleUpdateBundleItem(bIdx, 'harga_modal_item', Number(e.target.value))}
                                  placeholder="35000"
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '10.5px',
                                    fontWeight: '800',
                                    textAlign: 'right',
                                    color: '#059669'
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: INVENTARIS STOK & HARGA */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 3. Inventaris & Pengingat Stok */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <Package size={13} color="#0284c7" />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      3. Inventaris & Pengingat Stok
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Satuan Produk
                      </label>
                      <input
                        type="text"
                        placeholder="PCS"
                        value={formData.satuan}
                        onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          textAlign: 'center',
                          textTransform: 'uppercase'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Stok Fisik Tersedia
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stok}
                        onChange={(e) => setFormData({ ...formData, stok: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          textAlign: 'center',
                          color: formData.stok <= (formData.min_stok || 5) ? '#d97706' : '#059669',
                          backgroundColor: formData.stok <= (formData.min_stok || 5) ? '#fffbeb' : '#f0fdf4'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Min. Stok Alert
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.min_stok}
                        onChange={(e) => setFormData({ ...formData, min_stok: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          textAlign: 'center',
                          color: '#64748b'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Penetapan Harga & Profit */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        4. Penetapan Harga & Margin Profit
                      </span>
                    </div>
                    {formData.harga_jual > 0 && formData.harga_beli > 0 && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        padding: '1px 7px',
                        borderRadius: '4px',
                        backgroundColor: (formData.harga_jual - formData.harga_beli) >= 0 ? '#ecfdf5' : '#fef2f2',
                        color: (formData.harga_jual - formData.harga_beli) >= 0 ? '#059669' : '#dc2626',
                        border: (formData.harga_jual - formData.harga_beli) >= 0 ? '1px solid #a7f3d0' : '1px solid #fecaca'
                      }}>
                        Profit: {formatRupiah(formData.harga_jual - formData.harga_beli)} ({Math.round(((formData.harga_jual - formData.harga_beli) / formData.harga_jual) * 100)}%)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Harga Beli / Modal (HPP)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '6px', fontSize: '10.5px', fontWeight: '700', color: '#64748b' }}>Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.harga_beli ? Number(formData.harga_beli).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, harga_beli: raw ? Number(raw) : 0 });
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px 10px 6px 28px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            textAlign: 'right',
                            color: '#0f172a'
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Harga Jual Konsumen
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '6px', fontSize: '10.5px', fontWeight: '700', color: '#0284c7' }}>Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.harga_jual ? Number(formData.harga_jual).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, harga_jual: raw ? Number(raw) : 0 });
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '6px 10px 6px 28px',
                            borderRadius: '5px',
                            border: '1px solid #38bdf8',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            textAlign: 'right',
                            color: '#0284c7',
                            backgroundColor: '#f0f9ff'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Estimasi Kain & Kebutuhan Bahan (Per Pcs) */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #38bdf8',
                  padding: '10px 12px',
                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #e0f2fe'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        5. Estimasi Kain & Kebutuhan Bahan (Otomatis ke SPK)
                      </span>
                    </div>
                    {Number(formData.panjang_kain_cm || 0) > 0 && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#f0f9ff',
                        color: '#0284c7',
                        border: '1px solid #bae6fd'
                      }}>
                        Kain/Pcs: {formData.panjang_kain_cm} CM ({((Number(formData.panjang_kain_cm) || 0) / 100).toFixed(1)} Meter) • Est. Biaya: {formatRupiah((Number(formData.panjang_kain_cm) || 0) * (Number(formData.harga_kain_cm) || 0))}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Nama / Jenis Kain
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Silk Jetblack, Drill, Rayon Twill"
                        value={formData.estimasi_kain || ''}
                        onChange={(e) => setFormData({ ...formData, estimasi_kain: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          color: '#0f172a'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Panjang Kain (CM / Pcs)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="Contoh: 250"
                          value={formData.panjang_kain_cm || ''}
                          onChange={(e) => setFormData({ ...formData, panjang_kain_cm: Number(e.target.value) || 0 })}
                          style={{
                            width: '100%',
                            padding: '6px 36px 6px 10px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            textAlign: 'right',
                            color: '#0284c7'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '8px', top: '7px', fontSize: '10.5px', fontWeight: '700', color: '#64748b' }}>CM</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>
                        Harga Kain per CM (Rp)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '6px', fontSize: '10.5px', fontWeight: '700', color: '#64748b' }}>Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={formData.harga_kain_cm ? Number(formData.harga_kain_cm).toLocaleString('id-ID') : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, harga_kain_cm: raw ? Number(raw) : 0 });
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 36px 6px 28px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            textAlign: 'right',
                            color: '#0f172a'
                          }}
                        />
                        <span style={{ position: 'absolute', right: '6px', top: '7px', fontSize: '10px', fontWeight: '700', color: '#64748b' }}>/CM</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Sticky Action Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              marginTop: '10px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                <span style={{ color: '#ef4444', fontWeight: '800' }}>*</span> Pastikan seluruh data katalog & inventaris terisi benar sebelum disimpan
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    height: '28px',
                    padding: '0 14px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    height: '28px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0 16px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                >
                  <Save size={13} />
                  <span>Simpan Produk</span>
                </button>
              </div>
            </div>

          </form>

        </div>
      )}

      {/* ========================================================
          MODAL 2: DETAIL PRODUK (FULL SCREEN PREMIUM DASHBOARD)
          ======================================================== */}
      {isDetailModalOpen && selectedProduk && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          maxHeight: '100vh',
          backgroundColor: '#0f172a',
          zIndex: 2500,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header Bar Fullscreen (44px) */}
          <div style={{
            height: '44px',
            padding: '0 18px',
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e293b 100%)',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Eye size={14} />
              </div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                Detail Produk & Estimasi Material
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>•</span>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedProduk.nama_produk}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedProduk);
                }}
                style={{
                  height: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0 12px',
                  borderRadius: '5px',
                  border: '1px solid #38bdf8',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={12} />
                <span>Edit Produk</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '5px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Fullscreen Body (2-Column Layout Identical to Edit Modal) */}
          <div style={{
            flex: 1,
            height: 'calc(100vh - 44px)',
            overflowY: 'scroll',
            WebkitOverflowScrolling: 'touch',
            padding: '12px 16px 50px 16px',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '10px',
              alignItems: 'start'
            }}>
              {/* LEFT COLUMN: IDENTITAS, KATEGORI, & KOMPONEN BUNDLE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 1. Identitas Produk */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        1. Identitas Produk
                      </span>
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '1px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd'
                    }}>
                      {selectedProduk.company_code || 'RSG'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Nama Produk
                      </span>
                      <div style={{
                        padding: '6px 9px',
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: '800',
                        color: '#0f172a',
                        lineHeight: 1.3
                      }}>
                        {selectedProduk.nama_produk}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                          Kode SKU
                        </span>
                        <div style={{
                          padding: '6px 9px',
                          borderRadius: '5px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          fontSize: '11.5px',
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          color: '#0284c7'
                        }}>
                          {selectedProduk.sku || '-'}
                        </div>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                          Barcode / EAN
                        </span>
                        <div style={{
                          padding: '6px 9px',
                          borderRadius: '5px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          fontSize: '11.5px',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          color: '#475569'
                        }}>
                          {selectedProduk.barcode || selectedProduk.sku || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Kategori & Spesifikasi */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #38bdf8',
                  padding: '10px 12px',
                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #e0f2fe'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Boxes size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        2. Kategori & Spesifikasi
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: (selectedProduk.tipe_set === 'Satu Setel' || selectedProduk.tipe_set === 'Bundle') ? '#f3e8ff' : '#f0f9ff',
                        color: (selectedProduk.tipe_set === 'Satu Setel' || selectedProduk.tipe_set === 'Bundle') ? '#7e22ce' : '#0284c7',
                        border: (selectedProduk.tipe_set === 'Satu Setel' || selectedProduk.tipe_set === 'Bundle') ? '1px solid #d8b4fe' : '1px solid #bae6fd'
                      }}>
                        {(selectedProduk.tipe_set === 'Satu Setel' || selectedProduk.tipe_set === 'Bundle') ? 'Paket Bundle' : 'Single Item'}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: selectedProduk.status_order === 'PO' ? '#fff7ed' : '#f0fdf4',
                        color: selectedProduk.status_order === 'PO' ? '#c2410c' : '#15803d',
                        border: selectedProduk.status_order === 'PO' ? '1px solid #fed7aa' : '1px solid #bbf7d0'
                      }}>
                        {selectedProduk.status_order === 'PO' ? 'PO' : 'Ready'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Kategori Produk
                      </span>
                      <div style={{
                        padding: '6px 9px',
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#0f172a'
                      }}>
                        {selectedProduk.kategori || 'Umum'}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Varian / Ukuran / Warna
                      </span>
                      <div style={{
                        padding: '6px 9px',
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: '#0f172a'
                      }}>
                        {selectedProduk.varian || 'Standar'}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Tipe Produk
                      </span>
                      <div style={{
                        padding: '6px 9px',
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: (selectedProduk.tipe_set === 'Satu Setel' || selectedProduk.tipe_set === 'Bundle') ? '#7e22ce' : '#334155'
                      }}>
                        {(selectedProduk.tipe_set === 'Satu Setel' || selectedProduk.tipe_set === 'Bundle') ? 'Bundle / Satu Setel' : 'Single Item (Satuan)'}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Status Order
                      </span>
                      <div style={{
                        padding: '6px 9px',
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: selectedProduk.status_order === 'PO' ? '#c2410c' : '#15803d'
                      }}>
                        {selectedProduk.status_order === 'PO' ? 'Pre-Order (PO)' : 'Ready Stok'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* KOMPONEN PEMISAH BUNDLE / SATU SETEL (JIKA TIPE SATU SETEL) */}
                {(() => {
                  const isBundle = selectedProduk.tipe_set === 'Satu Setel' || selectedProduk.tipe_set === 'Bundle';
                  if (!isBundle && (!Array.isArray(selectedProduk.bundle_items) || selectedProduk.bundle_items.length === 0)) {
                    return null;
                  }

                  const activeBundleItems = (Array.isArray(selectedProduk.bundle_items) && selectedProduk.bundle_items.length > 0)
                    ? selectedProduk.bundle_items
                    : [
                        {
                          id: `bi-${selectedProduk.id}-1`,
                          nama_komponen: 'Baju Atasan',
                          sku: selectedProduk.sku || '',
                          qty: 1,
                          kain_nama: selectedProduk.estimasi_kain || 'Toyobo Premium',
                          panjang_kain_cm: Math.round((Number(selectedProduk.panjang_kain_cm) || 200) * 0.55),
                          harga_kain_cm: Number(selectedProduk.harga_kain_cm || 150),
                          harga_modal_item: Math.round((Number(selectedProduk.harga_beli) || 60000) * 0.55)
                        },
                        {
                          id: `bi-${selectedProduk.id}-2`,
                          nama_komponen: 'Celana / Bawahan',
                          sku: '',
                          qty: 1,
                          kain_nama: selectedProduk.estimasi_kain || 'Drill Premium',
                          panjang_kain_cm: Math.round((Number(selectedProduk.panjang_kain_cm) || 200) * 0.45),
                          harga_kain_cm: Number(selectedProduk.harga_kain_cm || 150),
                          harga_modal_item: Math.round((Number(selectedProduk.harga_beli) || 60000) * 0.45)
                        }
                      ];

                  const totalAccumCm = activeBundleItems.reduce((acc, it) => acc + (Number(it.panjang_kain_cm) || 0), 0);
                  const totalAccumModal = activeBundleItems.reduce((acc, it) => acc + (Number(it.harga_modal_item) || 0), 0);

                  return (
                    <div style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: '1.5px solid #8b5cf6',
                      padding: '10px 12px',
                      boxShadow: '0 2px 5px rgba(139, 92, 246, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        paddingBottom: '5px',
                        borderBottom: '1px solid #ede9fe'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Boxes size={14} color="#7c3aed" />
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Komponen Pemisah Bundle ({activeBundleItems.length} Item)
                            </span>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#f5f3ff',
                          color: '#7c3aed',
                          border: '1px solid #ddd6fe'
                        }}>
                          Total: {totalAccumCm} CM • {formatRupiah(totalAccumModal)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeBundleItems.map((bi, bIdx) => {
                          const pctKain = totalAccumCm > 0 ? Math.round(((Number(bi.panjang_kain_cm) || 0) / totalAccumCm) * 100) : 50;
                          return (
                            <div
                              key={bIdx}
                              style={{
                                backgroundColor: '#fbfbfe',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>
                                  #{bIdx + 1}. Komponen: {bi.sku ? `(${bi.sku})` : ''}
                                </span>
                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>
                                  Proporsi: {pctKain}%
                                </span>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1.1fr', gap: '8px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                    Nama Komponen
                                  </label>
                                  <div style={{ padding: '4px 6px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>
                                    {bi.nama_komponen}
                                  </div>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                    Kode SKU
                                  </label>
                                  <div style={{ padding: '4px 6px', borderRadius: '4px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', color: '#0284c7' }}>
                                    {bi.sku || '-'}
                                  </div>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                    Jenis Kain
                                  </label>
                                  <div style={{ padding: '4px 6px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                                    {bi.kain_nama || 'Kain Polos'}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', alignItems: 'center' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                    EST. KAIN (CM)
                                  </label>
                                  <div style={{ padding: '4px 6px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '800', color: '#0284c7', textAlign: 'right' }}>
                                    {bi.panjang_kain_cm || 0} CM
                                  </div>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                    HARGA/CM
                                  </label>
                                  <div style={{ padding: '4px 6px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>
                                    Rp {Number(bi.harga_kain_cm || 0).toLocaleString('id-ID')}
                                  </div>
                                </div>

                                <div>
                                  <label style={{ display: 'block', fontSize: '9px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                                    MODAL ITEM (RP)
                                  </label>
                                  <div style={{ padding: '4px 6px', borderRadius: '4px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '800', color: '#059669', textAlign: 'right' }}>
                                    {formatRupiah(bi.harga_modal_item || 0)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* RIGHT COLUMN: INVENTARIS STOK, HARGA & ESTIMASI KAIN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* 3. Inventaris & Pengingat Stok */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <Package size={13} color="#0284c7" />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      3. Inventaris & Pengingat Stok
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Satuan Produk
                      </span>
                      <div style={{
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        color: '#0f172a',
                        backgroundColor: '#f8fafc'
                      }}>
                        {selectedProduk.satuan || 'PCS'}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Stok Fisik Tersedia
                      </span>
                      <div style={{
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: '900',
                        textAlign: 'center',
                        color: selectedProduk.stok <= (selectedProduk.min_stok || 5) ? '#d97706' : '#059669',
                        backgroundColor: selectedProduk.stok <= (selectedProduk.min_stok || 5) ? '#fffbeb' : '#f0fdf4'
                      }}>
                        {selectedProduk.stok || 0}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Min. Stok Alert
                      </span>
                      <div style={{
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        textAlign: 'center',
                        color: '#64748b',
                        backgroundColor: '#f8fafc'
                      }}>
                        {selectedProduk.min_stok || 5}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Penetapan Harga & Profit */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        4. Penetapan Harga & Margin Profit
                      </span>
                    </div>

                    {selectedProduk.harga_jual > 0 && selectedProduk.harga_beli > 0 && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        padding: '1px 7px',
                        borderRadius: '4px',
                        backgroundColor: (selectedProduk.harga_jual - selectedProduk.harga_beli) >= 0 ? '#ecfdf5' : '#fef2f2',
                        color: (selectedProduk.harga_jual - selectedProduk.harga_beli) >= 0 ? '#059669' : '#dc2626',
                        border: (selectedProduk.harga_jual - selectedProduk.harga_beli) >= 0 ? '1px solid #a7f3d0' : '1px solid #fecaca'
                      }}>
                        Profit: {formatRupiah(selectedProduk.harga_jual - selectedProduk.harga_beli)} ({Math.round(((selectedProduk.harga_jual - selectedProduk.harga_beli) / selectedProduk.harga_jual) * 100)}%)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Harga Beli / Modal (HPP)
                      </span>
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        fontWeight: '800',
                        textAlign: 'right',
                        color: '#0f172a',
                        backgroundColor: '#f8fafc'
                      }}>
                        {formatRupiah(selectedProduk.harga_beli || 0)}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#0284c7', marginBottom: '2px' }}>
                        Harga Jual Konsumen
                      </span>
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: '5px',
                        border: '1px solid #38bdf8',
                        fontSize: '12px',
                        fontWeight: '900',
                        textAlign: 'right',
                        color: '#0284c7',
                        backgroundColor: '#f0f9ff'
                      }}>
                        {formatRupiah(selectedProduk.harga_jual || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Estimasi Kain & Kebutuhan Bahan (Per Pcs) */}
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #38bdf8',
                  padding: '10px 12px',
                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '5px',
                    borderBottom: '1px solid #e0f2fe'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={13} color="#0284c7" />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        5. Estimasi Kain & Kebutuhan Bahan (Otomatis ke SPK)
                      </span>
                    </div>

                    {Number(selectedProduk.panjang_kain_cm || 0) > 0 && (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '800',
                        padding: '1px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#f0f9ff',
                        color: '#0284c7',
                        border: '1px solid #bae6fd'
                      }}>
                        Kain/Pcs: {selectedProduk.panjang_kain_cm} CM ({((Number(selectedProduk.panjang_kain_cm) || 0) / 100).toFixed(1)} Meter) • Est. Biaya: {formatRupiah((Number(selectedProduk.panjang_kain_cm) || 0) * (Number(selectedProduk.harga_kain_cm) || 0))}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Nama / Jenis Kain
                      </span>
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#0f172a',
                        backgroundColor: '#f8fafc'
                      }}>
                        {selectedProduk.estimasi_kain || '-'}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Panjang Kain (CM / Pcs)
                      </span>
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        textAlign: 'right',
                        color: '#0284c7',
                        backgroundColor: '#f8fafc'
                      }}>
                        {selectedProduk.panjang_kain_cm || 0} CM
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '2px' }}>
                        Harga Kain per CM (Rp)
                      </span>
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        textAlign: 'right',
                        color: '#0f172a',
                        backgroundColor: '#f8fafc'
                      }}>
                        @Rp {Number(selectedProduk.harga_kain_cm || 0).toLocaleString('id-ID')} / CM
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN BATCH PROCESSING OVERLAY / POPUP */}
      {isBatchProcessing && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(5px)',
          zIndex: 4000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1.5px solid #e0f2fe',
            padding: '28px 36px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}>
            {/* Pulsing Spinner Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)'
            }}>
              <Loader2 size={32} className="animate-spin" />
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Sedang Memproses Data
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.4, fontWeight: '600' }}>
                {processMessage}
              </p>
            </div>

            {/* Progress Bar Visual */}
            <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: '70%',
                height: '100%',
                background: 'linear-gradient(90deg, #0284c7 0%, #7c3aed 100%)',
                borderRadius: '3px'
              }} />
            </div>

            <span style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic' }}>
              Harap jangan menutup browser selama proses sinkronisasi berlangsung...
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
