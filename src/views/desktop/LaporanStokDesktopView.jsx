import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes,
  Package,
  Search,
  RefreshCw,
  Download,
  Printer,
  Filter,
  DollarSign,
  TrendingUp,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

export default function LaporanStokDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    total_sku: 0,
    total_stok_gudang: 0,
    total_stok_titipan: 0,
    total_jumlah_stok: 0,
    total_nilai_hpp_gudang: 0,
    total_nilai_hpp_titipan: 0,
    avg_margin_gudang_persen: 0,
    avg_margin_titipan_persen: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [filterStatusStok, setFilterStatusStok] = useState('Semua');
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'jumlah_stok', direction: 'desc' });

  // Sync tenant company
  useEffect(() => {
    const handleCompanyChange = () => {
      setActiveCompany(getActiveCompany());
    };
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  // Fetch data laporan dari backend
  const fetchLaporanStok = async () => {
    setIsLoading(true);
    try {
      const companyCode = activeCompany?.code || 'RSG';
      const params = new URLSearchParams();
      params.append('company', companyCode);
      if (filterKategori !== 'Semua') params.append('kategori', filterKategori);
      if (filterStatusStok !== 'Semua') params.append('filter_stok', filterStatusStok);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/laporan/stok-barang?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setData(json.data);
        if (json.summary) {
          setSummary(json.summary);
        }
      } else {
        throw new Error(json.message || 'Gagal memuat data laporan');
      }
    } catch (err) {
      console.warn('[Fetch Laporan Stok Warning]:', err.message);
      // Fallback: hitung dari localStorage jika ada data master
      try {
        const savedProd = localStorage.getItem('ruangmarket_produk_gamis_v4');
        const savedTitip = localStorage.getItem('ruangmarket_penitipan_barang_v1');
        const prods = savedProd ? JSON.parse(savedProd) : [];
        const titips = savedTitip ? JSON.parse(savedTitip) : [];

        const titipMap = new Map();
        titips.forEach(t => {
          const sku = String(t.kode_sku || '').trim().toUpperCase();
          const sisa = Math.max(0, Number(t.qty_titip || 0) - Number(t.qty_terjual || 0) - Number(t.qty_retur || 0));
          if (!titipMap.has(sku)) {
            titipMap.set(sku, { sisa: 0, harga_titip: Number(t.harga_titip || 0) });
          }
          const cur = titipMap.get(sku);
          cur.sisa += sisa;
          if (Number(t.harga_titip || 0) > 0) cur.harga_titip = Number(t.harga_titip);
        });

        const mapped = prods.map((p, idx) => {
          const sku = String(p.sku || p.kode_sku || '').trim().toUpperCase();
          const titipInfo = titipMap.get(sku) || { sisa: 0, harga_titip: 0 };
          const stokGdg = Number(p.stok || p.stok_fisik || 0);
          const stokTtp = titipInfo.sisa;
          const totStok = stokGdg + stokTtp;
          const hppGdg = Number(p.harga_beli || p.harga_modal || 0);
          const hppTtp = titipInfo.harga_titip;
          const hrgJual = Number(p.harga_jual || 0);
          const mrgGdg = hrgJual - hppGdg;
          const mrgTtp = hrgJual - hppTtp;
          const mrgGdgPct = hrgJual > 0 ? Number(((mrgGdg / hrgJual) * 100).toFixed(1)) : 0;
          const mrgTtpPct = (hrgJual > 0 && hppTtp > 0) ? Number(((mrgTtp / hrgJual) * 100).toFixed(1)) : 0;

          return {
            id: p.id || idx + 1,
            kode_sku: p.sku || p.kode_sku || '-',
            nama_produk: p.nama_produk || p.nama || '-',
            kategori: p.kategori || 'Umum',
            varian: p.varian || 'Standard',
            satuan: p.satuan || 'PCS',
            stok_gudang: stokGdg,
            stok_titipan: stokTtp,
            jumlah_stok: totStok,
            hpp_gudang: hppGdg,
            hpp_titipan: hppTtp,
            harga_jual: hrgJual,
            margin_gudang: mrgGdg,
            margin_titipan: mrgTtp,
            margin_gudang_persen: mrgGdgPct,
            margin_titipan_persen: mrgTtpPct
          };
        });

        setData(mapped);
        setSummary({
          total_sku: mapped.length,
          total_stok_gudang: mapped.reduce((acc, r) => acc + r.stok_gudang, 0),
          total_stok_titipan: mapped.reduce((acc, r) => acc + r.stok_titipan, 0),
          total_jumlah_stok: mapped.reduce((acc, r) => acc + r.jumlah_stok, 0),
          total_nilai_hpp_gudang: mapped.reduce((acc, r) => acc + (r.stok_gudang * r.hpp_gudang), 0),
          total_nilai_hpp_titipan: mapped.reduce((acc, r) => acc + (r.stok_titipan * r.hpp_titipan), 0),
          avg_margin_gudang_persen: mapped.length > 0 ? (mapped.reduce((acc, r) => acc + r.margin_gudang_persen, 0) / mapped.length).toFixed(1) : 0,
          avg_margin_titipan_persen: mapped.length > 0 ? (mapped.reduce((acc, r) => acc + r.margin_titipan_persen, 0) / mapped.length).toFixed(1) : 0
        });
      } catch (errFallback) {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporanStok();
  }, [activeCompany, filterKategori, filterStatusStok]);

  // Handle Search Debounce / Direct
  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    fetchLaporanStok();
  };

  // Kategori unik untuk filter dropdown
  const kategoriList = useMemo(() => {
    const setKat = new Set();
    data.forEach(item => {
      if (item.kategori) setKat.add(item.kategori);
    });
    return ['Semua', ...Array.from(setKat)];
  }, [data]);

  // Sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedData = useMemo(() => {
    const list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return list.filter(item =>
        String(item.kode_sku || '').toLowerCase().includes(q) ||
        String(item.nama_produk || '').toLowerCase().includes(q) ||
        String(item.kategori || '').toLowerCase().includes(q) ||
        String(item.varian || '').toLowerCase().includes(q)
      );
    }

    if (!sortConfig.key) return list;

    return list.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = String(bVal || '').toLowerCase();
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? (Number(aVal || 0) - Number(bVal || 0)) : (Number(bVal || 0) - Number(aVal || 0));
    });
  }, [data, search, sortConfig]);

  // Pagination
  const totalRows = sortedData.length;
  const totalPages = entriesPerPage === 'Semua' ? 1 : Math.max(1, Math.ceil(totalRows / Number(entriesPerPage)));
  const paginatedData = useMemo(() => {
    if (entriesPerPage === 'Semua') return sortedData;
    const limit = Number(entriesPerPage);
    const start = (currentPage - 1) * limit;
    return sortedData.slice(start, start + limit);
  }, [sortedData, currentPage, entriesPerPage]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!sortedData || sortedData.length === 0) {
      toastError('Tidak ada data untuk diekspor!');
      return;
    }

    const exportRows = sortedData.map((item, idx) => ({
      'No': idx + 1,
      'SKU': item.kode_sku || '-',
      'Nama Barang': item.nama_produk || '-',
      'Kategori': item.kategori || 'Umum',
      'Varian': item.varian || 'Standard',
      'Stok Gudang': Number(item.stok_gudang || 0),
      'Stok Titipan': Number(item.stok_titipan || 0),
      'Jumlah Stok (Marketplace)': Number(item.jumlah_stok || 0),
      'HPP Gudang (Rp)': Number(item.hpp_gudang || 0),
      'HPP Titipan (Rp)': Number(item.hpp_titipan || 0),
      'Harga Jual (Rp)': Number(item.harga_jual || 0),
      'Margin Gudang (Rp)': Number(item.margin_gudang || 0),
      'Margin Titipan (Rp)': Number(item.margin_titipan || 0),
      'Margin Gudang (%)': Number(item.margin_gudang_persen || 0),
      'Margin Titipan (%)': Number(item.margin_titipan_persen || 0)
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan_Stok_Barang');

    const fileName = `Laporan_Stok_Barang_${activeCompany?.code || 'RSG'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toastSuccess(`Laporan berhasil diekspor: ${fileName}`);
  };

  // Print Laporan
  const handlePrint = () => {
    window.print();
  };

  const formatRupiah = (val) => {
    const n = Number(val || 0);
    return `Rp ${n.toLocaleString('id-ID')}`;
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '10px 16px', boxSizing: 'border-box' }}>
      
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
        marginBottom: '10px',
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
            flexShrink: 0
          }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Laporan Stok Barang (Gudang & Titipan)
              </h1>
              <span style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                fontWeight: '700'
              }}>
                {activeCompany?.code || 'RSG'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
              Rekapitulasi stok fisik gudang sendiri vs titipan konsinyasi, kalkulasi HPP, margin profit & stok marketplace.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchLaporanStok}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Memuat...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #16a34a',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
            }}
          >
            <Download size={13} />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #0284c7',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            <Printer size={13} />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '10px',
        marginBottom: '10px'
      }}>
        {/* Card 1: Stok Gudang Utama */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          padding: '10px 14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Boxes size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Stok Gudang Sendiri
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#1d4ed8' }}>
                {Number(summary.total_stok_gudang || 0).toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Pcs</span>
            </div>
            <div style={{ fontSize: '10px', color: '#0369a1', fontWeight: '600', marginTop: '1px' }}>
              Nilai Aset: {formatRupiah(summary.total_nilai_hpp_gudang)}
            </div>
          </div>
        </div>

        {/* Card 2: Stok Titipan Barang */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          padding: '10px 14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Warehouse size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Stok Titipan Konsinyasi
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#b45309' }}>
                {Number(summary.total_stok_titipan || 0).toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Pcs</span>
            </div>
            <div style={{ fontSize: '10px', color: '#92400e', fontWeight: '600', marginTop: '1px' }}>
              Kewajiban Titip: {formatRupiah(summary.total_nilai_hpp_titipan)}
            </div>
          </div>
        </div>

        {/* Card 3: Total Jumlah Stok (Marketplace) */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #86efac',
          padding: '10px 14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Package size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
              Jumlah Stok (Marketplace)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#15803d' }}>
                {Number(summary.total_jumlah_stok || 0).toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700' }}>Pcs Gabungan</span>
            </div>
            <div style={{ fontSize: '10px', color: '#15803d', fontWeight: '600', marginTop: '1px' }}>
              Gudang ({Number(summary.total_stok_gudang || 0)}) + Titipan ({Number(summary.total_stok_titipan || 0)})
            </div>
          </div>
        </div>

        {/* Card 4: Margin Gudang vs Titipan */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          padding: '10px 14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Rata-rata Margin
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe'
              }}>
                Gudang: {summary.avg_margin_gudang_persen}%
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a'
              }}>
                Titipan: {summary.avg_margin_titipan_persen}%
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
              Total SKU: {summary.total_sku} Produk
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTER & TOOLBAR */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '8px 12px',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari SKU, Nama Barang, Varian, Kategori..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '11.5px',
              outline: 'none',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box'
            }}
          />
        </form>

        {/* Filter Kategori */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Kategori:</span>
          <select
            value={filterKategori}
            onChange={(e) => {
              setFilterKategori(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '5.5px 8px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              fontSize: '11.5px',
              fontWeight: '600',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            {kategoriList.map((kat, i) => (
              <option key={i} value={kat}>{kat}</option>
            ))}
          </select>
        </div>

        {/* Filter Status Stok */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Status Stok:</span>
          <select
            value={filterStatusStok}
            onChange={(e) => {
              setFilterStatusStok(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '5.5px 8px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              fontSize: '11.5px',
              fontWeight: '600',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="Semua">Semua Stok</option>
            <option value="tersedia">Stok Tersedia (&gt; 0)</option>
            <option value="habis">Stok Habis (0)</option>
            <option value="gabungan">Ada Gudang &amp; Titipan</option>
            <option value="hanya_gudang">Hanya Ada di Gudang</option>
            <option value="hanya_titipan">Hanya Ada di Titipan</option>
          </select>
        </div>

        {/* Entries Per Page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Tampil:</span>
          <select
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '5.5px 8px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              fontSize: '11.5px',
              fontWeight: '600',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="25">25 Baris</option>
            <option value="50">50 Baris</option>
            <option value="100">100 Baris</option>
            <option value="Semua">Semua Data</option>
          </select>
        </div>
      </div>

      {/* 4. TABEL LAPORAN STOK BARANG */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        marginBottom: '10px'
      }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            whiteSpace: 'nowrap'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#0f172a',
                color: '#ffffff',
                textAlign: 'left',
                borderBottom: '1px solid #334155'
              }}>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '35px' }}>NO</th>
                <th 
                  onClick={() => handleSort('kode_sku')}
                  style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>SKU</span>
                    <ArrowUpDown size={11} color="#94a3b8" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nama_produk')}
                  style={{ padding: '8px 10px', cursor: 'pointer', userSelect: 'none', minWidth: '220px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>NAMA BARANG</span>
                    <ArrowUpDown size={11} color="#94a3b8" />
                  </div>
                </th>
                <th style={{ padding: '8px 10px' }}>KATEGORI</th>
                <th style={{ padding: '8px 10px' }}>VARIAN</th>

                {/* Kolom Stok */}
                <th 
                  onClick={() => handleSort('stok_gudang')}
                  style={{ padding: '8px 10px', textAlign: 'center', backgroundColor: '#1e293b', cursor: 'pointer', userSelect: 'none' }}
                  title="Stok Fisik Milik Sendiri di Gudang Utama"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>STOK GUDANG</span>
                    <ArrowUpDown size={11} color="#94a3b8" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('stok_titipan')}
                  style={{ padding: '8px 10px', textAlign: 'center', backgroundColor: '#1e293b', cursor: 'pointer', userSelect: 'none' }}
                  title="Stok Barang Konsinyasi dari Mitra Penitip"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>STOK TITIPAN</span>
                    <ArrowUpDown size={11} color="#94a3b8" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('jumlah_stok')}
                  style={{ padding: '8px 10px', textAlign: 'center', backgroundColor: '#064e3b', color: '#a7f3d0', cursor: 'pointer', userSelect: 'none' }}
                  title="Total Stok Gabungan yang Terpajang di Marketplace (Gudang + Titipan)"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span>JUMLAH STOK</span>
                    <ArrowUpDown size={11} color="#a7f3d0" />
                  </div>
                </th>

                {/* Kolom HPP */}
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>HPP GUDANG</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>HPP TITIPAN</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>HARGA JUAL</th>

                {/* Kolom Margin */}
                <th style={{ padding: '8px 10px', textAlign: 'right', backgroundColor: '#0f172a' }}>MARGIN GUDANG</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', backgroundColor: '#0f172a' }}>MARGIN TITIPAN</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', backgroundColor: '#1e293b' }}>MARGIN GUDANG (%)</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', backgroundColor: '#1e293b' }}>MARGIN TITIPAN (%)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={15} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Sedang memuat data laporan stok...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    Tidak ada data stok barang yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const globalIdx = entriesPerPage === 'Semua' ? idx + 1 : (currentPage - 1) * Number(entriesPerPage) + idx + 1;
                  const isHabis = item.jumlah_stok <= 0;
                  const hasGudang = item.stok_gudang > 0;
                  const hasTitipan = item.stok_titipan > 0;

                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isHabis ? '#fff1f2' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc'),
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isHabis ? '#ffe4e6' : '#f0f9ff'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isHabis ? '#fff1f2' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')}
                    >
                      {/* NO */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>
                        {globalIdx}
                      </td>

                      {/* SKU */}
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          color: '#0284c7',
                          backgroundColor: '#f0f9ff',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          border: '1px solid #bae6fd'
                        }}>
                          {item.kode_sku}
                        </span>
                      </td>

                      {/* NAMA BARANG */}
                      <td style={{ padding: '6px 10px', maxWidth: '320px', whiteSpace: 'normal' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', lineHeight: 1.25 }}>
                          {item.nama_produk}
                        </div>
                      </td>

                      {/* KATEGORI */}
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#475569',
                          backgroundColor: '#f1f5f9',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {item.kategori}
                        </span>
                      </td>

                      {/* VARIAN */}
                      <td style={{ padding: '6px 10px', color: '#334155', fontWeight: '600' }}>
                        {item.varian || 'Standard'}
                      </td>

                      {/* STOK GUDANG */}
                      <td style={{ padding: '6px 10px', textAlign: 'center', backgroundColor: 'rgba(239, 246, 255, 0.4)' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: hasGudang ? '#eff6ff' : '#f8fafc',
                          color: hasGudang ? '#1d4ed8' : '#94a3b8',
                          border: hasGudang ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                        }}>
                          {Number(item.stok_gudang || 0)} {item.satuan}
                        </span>
                      </td>

                      {/* STOK TITIPAN */}
                      <td style={{ padding: '6px 10px', textAlign: 'center', backgroundColor: 'rgba(254, 243, 199, 0.3)' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: hasTitipan ? '#fef3c7' : '#f8fafc',
                          color: hasTitipan ? '#b45309' : '#94a3b8',
                          border: hasTitipan ? '1px solid #fde68a' : '1px solid #e2e8f0'
                        }}>
                          {Number(item.stok_titipan || 0)} {item.satuan}
                        </span>
                      </td>

                      {/* JUMLAH STOK (MARKETPLACE) */}
                      <td style={{ padding: '6px 10px', textAlign: 'center', backgroundColor: 'rgba(220, 252, 231, 0.4)' }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '900',
                          padding: '2px 9px',
                          borderRadius: '5px',
                          backgroundColor: isHabis ? '#fee2e2' : '#dcfce7',
                          color: isHabis ? '#b91c1c' : '#15803d',
                          border: isHabis ? '1.5px solid #fecaca' : '1.5px solid #86efac',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {Number(item.jumlah_stok || 0)} {item.satuan}
                        </span>
                      </td>

                      {/* HPP GUDANG */}
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                        {formatRupiah(item.hpp_gudang)}
                      </td>

                      {/* HPP TITIPAN */}
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: '#b45309' }}>
                        {item.hpp_titipan > 0 ? formatRupiah(item.hpp_titipan) : '-'}
                      </td>

                      {/* HARGA JUAL */}
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: '#0284c7' }}>
                        {formatRupiah(item.harga_jual)}
                      </td>

                      {/* MARGIN GUDANG */}
                      <td style={{
                        padding: '6px 10px',
                        textAlign: 'right',
                        fontWeight: '800',
                        color: item.margin_gudang >= 0 ? '#15803d' : '#dc2626'
                      }}>
                        {formatRupiah(item.margin_gudang)}
                      </td>

                      {/* MARGIN TITIPAN */}
                      <td style={{
                        padding: '6px 10px',
                        textAlign: 'right',
                        fontWeight: '800',
                        color: item.margin_titipan >= 0 ? '#0284c7' : '#dc2626'
                      }}>
                        {item.hpp_titipan > 0 ? formatRupiah(item.margin_titipan) : '-'}
                      </td>

                      {/* MARGIN GUDANG (%) */}
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1.5px 6px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: '800',
                          backgroundColor: item.margin_gudang_persen >= 20 ? '#dcfce7' : (item.margin_gudang_persen > 0 ? '#eff6ff' : '#fee2e2'),
                          color: item.margin_gudang_persen >= 20 ? '#15803d' : (item.margin_gudang_persen > 0 ? '#1d4ed8' : '#b91c1c'),
                          border: item.margin_gudang_persen >= 20 ? '1px solid #86efac' : (item.margin_gudang_persen > 0 ? '1px solid #bfdbfe' : '1px solid #fecaca')
                        }}>
                          {item.margin_gudang_persen}%
                        </span>
                      </td>

                      {/* MARGIN TITIPAN (%) */}
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {item.hpp_titipan > 0 ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '1.5px 6px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: '800',
                            backgroundColor: item.margin_titipan_persen >= 15 ? '#fef3c7' : '#fee2e2',
                            color: item.margin_titipan_persen >= 15 ? '#b45309' : '#b91c1c',
                            border: item.margin_titipan_persen >= 15 ? '1px solid #fde68a' : '1px solid #fecaca'
                          }}>
                            {item.margin_titipan_persen}%
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '10px' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. FOOTER PAGING & REKAP */}
        <div style={{
          padding: '8px 14px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11.5px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <b>{paginatedData.length}</b> dari total <b>{totalRows}</b> produk SKU.
          </div>

          {entriesPerPage !== 'Semua' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  color: currentPage === 1 ? '#cbd5e1' : '#334155'
                }}
              >
                Prev
              </button>
              <span style={{ padding: '0 6px', fontWeight: '800', color: '#0f172a' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  color: currentPage === totalPages ? '#cbd5e1' : '#334155'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

