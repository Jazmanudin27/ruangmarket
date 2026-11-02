import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  FileText,
  Package,
  Search,
  RefreshCw,
  Download,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  ArrowUpDown,
  Wallet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

export default function LaporanPenjualanCairDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [reportFormat, setReportFormat] = useState('per_tanggal'); // 'per_tanggal' | 'per_transaksi' | 'per_barang'
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterSaluran, setFilterSaluran] = useState('Semua');
  const [filterToko, setFilterToko] = useState('Semua');
  const [statusCair, setStatusCair] = useState('cair'); // 'cair' | 'semua'
  const [tokoOptions, setTokoOptions] = useState([]);

  // Paging & Sorting
  const [entriesPerPage, setEntriesPerPage] = useState('50');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'desc' });

  // Data States
  const [summary, setSummary] = useState({
    total_transaksi: 0,
    total_qty: 0,
    total_omset_kotor: 0,
    total_potongan_fee: 0,
    total_dana_cair: 0,
    total_hpp: 0,
    total_laba_bersih: 0,
    margin_persen: 0
  });
  const [perTanggal, setPerTanggal] = useState([]);
  const [perTransaksi, setPerTransaksi] = useState([]);
  const [perBarang, setPerBarang] = useState([]);

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  useEffect(() => {
    fetch('/api/marketplace/stores')
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json && Array.isArray(json.data)) {
          setTokoOptions(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const fetchLaporanCair = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('company', activeCompany?.code || 'RSG');
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (filterSaluran !== 'Semua') params.append('saluran', filterSaluran);
      if (filterToko !== 'Semua') params.append('toko', filterToko);
      if (statusCair) params.append('status_cair', statusCair);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/laporan/penjualan-cair?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === 'success') {
        setSummary(json.summary || {});
        setPerTanggal(Array.isArray(json.per_tanggal) ? json.per_tanggal : []);
        setPerTransaksi(Array.isArray(json.per_transaksi) ? json.per_transaksi : []);
        setPerBarang(Array.isArray(json.per_barang) ? json.per_barang : []);
      }
    } catch (err) {
      console.warn('[Laporan Penjualan Cair Error]:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompany, startDate, endDate, filterSaluran, filterToko, statusCair, search]);

  useEffect(() => {
    fetchLaporanCair();
  }, [fetchLaporanCair]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const activeRows = useMemo(() => {
    let base = [];
    if (reportFormat === 'per_tanggal') base = [...perTanggal];
    else if (reportFormat === 'per_transaksi') base = [...perTransaksi];
    else base = [...perBarang];

    if (sortConfig.key) {
      base.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === 'string') {
          return sortConfig.direction === 'asc'
            ? String(aVal).localeCompare(String(bVal || ''))
            : String(bVal || '').localeCompare(String(aVal));
        }
        return sortConfig.direction === 'asc'
          ? Number(aVal || 0) - Number(bVal || 0)
          : Number(bVal || 0) - Number(aVal || 0);
      });
    }
    return base;
  }, [reportFormat, perTanggal, perTransaksi, perBarang, sortConfig]);

  const totalRows = activeRows.length;
  const totalPages = entriesPerPage === 'Semua' ? 1 : Math.max(1, Math.ceil(totalRows / Number(entriesPerPage)));
  const paginatedRows = useMemo(() => {
    if (entriesPerPage === 'Semua') return activeRows;
    const limit = Number(entriesPerPage);
    const start = (currentPage - 1) * limit;
    return activeRows.slice(start, start + limit);
  }, [activeRows, currentPage, entriesPerPage]);

  const formatRupiah = (val) => `Rp ${Math.round(Number(val || 0)).toLocaleString('id-ID')}`;

  const handleExportExcel = () => {
    if (!activeRows || activeRows.length === 0) {
      toastError('Tidak ada data untuk diekspor!');
      return;
    }

    let exportData = [];
    let sheetName = 'Laporan_Penjualan_Cair';

    if (reportFormat === 'per_tanggal') {
      sheetName = 'Rekap_Per_Tanggal';
      exportData = activeRows.map((r, i) => ({
        'No': i + 1,
        'Tanggal': r.tanggal,
        'Jumlah Transaksi': r.jumlah_transaksi,
        'Qty Barang Terjual': r.total_qty,
        'Omset Kotor (Rp)': r.omset_kotor,
        'Potongan Fee Admin (Rp)': r.potongan_fee,
        'Dana Cair Bersih (Rp)': r.dana_cair,
        'Total HPP Modal (Rp)': r.total_hpp,
        'Laba Bersih (Rp)': r.laba_bersih,
        'Margin (%)': r.margin_persen
      }));
    } else if (reportFormat === 'per_transaksi') {
      sheetName = 'Rincian_Per_Transaksi';
      exportData = activeRows.map((r, i) => ({
        'No': i + 1,
        'Tanggal': r.tanggal,
        'No. Pesanan': r.no_pesanan,
        'Saluran': String(r.saluran || '').toUpperCase(),
        'Nama Toko': r.nama_toko,
        'Pembeli': r.nama_pembeli,
        'Rincian Barang': r.rincian_barang,
        'Qty': r.total_qty,
        'Omset Kotor (Rp)': r.omset_kotor,
        'Potongan Fee Admin (Rp)': r.potongan_fee,
        'Dana Cair Bersih (Rp)': r.dana_cair,
        'Total HPP Modal (Rp)': r.total_hpp,
        'Laba Bersih (Rp)': r.laba_bersih,
        'Margin (%)': r.margin_persen
      }));
    } else {
      sheetName = 'Rekap_Per_Barang';
      exportData = activeRows.map((r, i) => ({
        'No': i + 1,
        'SKU': r.kode_sku,
        'Nama Barang': r.nama_produk,
        'Kategori': r.kategori,
        'Jumlah Transaksi': r.jumlah_transaksi,
        'Qty Terjual': r.total_qty,
        'Omset Kotor (Rp)': r.omset_kotor,
        'Potongan Fee (Rp)': r.potongan_fee,
        'Dana Cair Bersih (Rp)': r.dana_cair,
        'HPP Satuan (Rp)': r.hpp_satuan,
        'Total HPP (Rp)': r.total_hpp,
        'Laba Bersih (Rp)': r.laba_bersih,
        'Margin (%)': r.margin_persen
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const fileName = `Laporan_Penjualan_Cair_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toastSuccess(`Laporan berhasil diekspor: ${fileName}`);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '10px 16px', boxSizing: 'border-box' }}>
      {/* 1. HEADER CARD */}
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
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.15) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
            flexShrink: 0
          }}>
            <Wallet size={21} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.01em' }}>
                Laporan Transaksi Penjualan Cair (Settlement)
              </h1>
              <span style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                fontWeight: '700'
              }}>
                {activeCompany?.code || 'RSG'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Rekapitulasi transaksi penjualan yang sudah selesai/cair dengan pilihan format Per Tanggal, Per Transaksi, dan Per Barang.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchLaporanCair}
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
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '10px',
        marginBottom: '10px'
      }}>
        {/* Card 1: Total Transaksi & Qty */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          padding: '10px 14px',
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
            <ShoppingBag size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Volume Penjualan Cair
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#1d4ed8' }}>
                {Number(summary.total_transaksi || 0).toLocaleString('id-ID')}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Transaksi</span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#0369a1', fontWeight: '700' }}>
              Total Barang: {Number(summary.total_qty || 0).toLocaleString('id-ID')} Pcs
            </div>
          </div>
        </div>

        {/* Card 2: Omset Kotor & Potongan */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          padding: '10px 14px',
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
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Omset Penjualan Kotor
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
              {formatRupiah(summary.total_omset_kotor)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: '700' }}>
              Potongan Admin/Fee: -{formatRupiah(summary.total_potongan_fee)}
            </div>
          </div>
        </div>

        {/* Card 3: Dana Cair Bersih */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #86efac',
          padding: '10px 14px',
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
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>
              Total Dana Cair Bersih
            </div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#15803d' }}>
              {formatRupiah(summary.total_dana_cair)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#166534', fontWeight: '700' }}>
              Dana masuk ke saldo/rekening
            </div>
          </div>
        </div>

        {/* Card 4: Total HPP & Laba Bersih */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            backgroundColor: '#f3e8ff',
            border: '1px solid #d8b4fe',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
              Laba Bersih ({summary.margin_persen || 0}%)
            </div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: '#7c3aed' }}>
              {formatRupiah(summary.total_laba_bersih)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: '700' }}>
              Total HPP Modal: {formatRupiah(summary.total_hpp)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. PILIHAN FORMAT LAPORAN & FILTER BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '10px 12px',
        marginBottom: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Baris Atas: Pilihan Format Laporan */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#334155', marginRight: '4px' }}>
              Format Laporan:
            </span>

            <button
              type="button"
              onClick={() => {
                setReportFormat('per_tanggal');
                setCurrentPage(1);
                setSortConfig({ key: '', direction: 'desc' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: reportFormat === 'per_tanggal' ? '1px solid #0284c7' : '1px solid #cbd5e1',
                backgroundColor: reportFormat === 'per_tanggal' ? '#0284c7' : '#f8fafc',
                color: reportFormat === 'per_tanggal' ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: reportFormat === 'per_tanggal' ? '0 2px 5px rgba(2, 132, 199, 0.25)' : 'none'
              }}
            >
              <Calendar size={13} />
              <span>Per Tanggal ({perTanggal.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setReportFormat('per_transaksi');
                setCurrentPage(1);
                setSortConfig({ key: '', direction: 'desc' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: reportFormat === 'per_transaksi' ? '1px solid #059669' : '1px solid #cbd5e1',
                backgroundColor: reportFormat === 'per_transaksi' ? '#059669' : '#f8fafc',
                color: reportFormat === 'per_transaksi' ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: reportFormat === 'per_transaksi' ? '0 2px 5px rgba(5, 150, 105, 0.25)' : 'none'
              }}
            >
              <FileText size={13} />
              <span>Per Transaksi ({perTransaksi.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setReportFormat('per_barang');
                setCurrentPage(1);
                setSortConfig({ key: '', direction: 'desc' });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: reportFormat === 'per_barang' ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                backgroundColor: reportFormat === 'per_barang' ? '#7c3aed' : '#f8fafc',
                color: reportFormat === 'per_barang' ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: reportFormat === 'per_barang' ? '0 2px 5px rgba(124, 58, 237, 0.25)' : 'none'
              }}
            >
              <Package size={13} />
              <span>Per Barang ({perBarang.length})</span>
            </button>
          </div>

          {/* Filter Tanggal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b' }}>Periode:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                fontWeight: '600',
                color: '#334155'
              }}
            />
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                fontWeight: '600',
                color: '#334155'
              }}
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Reset Tgl
              </button>
            )}
          </div>
        </div>

        {/* Baris Bawah: Search, Saluran, Toko, Status Cair, Paging */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Cari No. Pesanan, SKU, Nama Barang, Pembeli, Toko..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none',
                backgroundColor: '#f8fafc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <select
            value={filterSaluran}
            onChange={(e) => { setFilterSaluran(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#334155',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">Semua Saluran</option>
            <option value="shopee">Shopee</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="offline">Penjualan Offline</option>
          </select>

          <select
            value={filterToko}
            onChange={(e) => { setFilterToko(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '600',
              color: '#334155',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="Semua">🏬 Semua Toko</option>
            {tokoOptions.map((st, idx) => (
              <option key={idx} value={`${st.channel}|${st.shopName || st.shopId}`}>
                {st.channel === 'shopee' ? 'Shopee' : 'TikTok'}: {st.shopName}
              </option>
            ))}
            <option value="offline|Penjualan Offline">Penjualan Offline</option>
          </select>

          <select
            value={statusCair}
            onChange={(e) => { setStatusCair(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: '700',
              color: '#059669',
              backgroundColor: '#f0fdf4',
              cursor: 'pointer'
            }}
          >
            <option value="cair">✓ Sudah Cair / Selesai</option>
            <option value="semua">Semua Transaksi Aktif</option>
          </select>

          <select
            value={entriesPerPage}
            onChange={(e) => { setEntriesPerPage(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              color: '#334155',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="25">25 Baris</option>
            <option value="50">50 Baris</option>
            <option value="100">100 Baris</option>
            <option value="Semua">Semua Data</option>
          </select>
        </div>
      </div>

      {/* 4. TABEL LAPORAN SESUAI FORMAT YANG DIPILIH */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        marginBottom: '12px'
      }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          {reportFormat === 'per_tanggal' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '9px 10px', textAlign: 'center', width: '40px' }}>NO</th>
                  <th onClick={() => handleSort('tanggal')} style={{ padding: '9px 12px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>TANGGAL</span>
                      <ArrowUpDown size={11} color="#94a3b8" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('jumlah_transaksi')} style={{ padding: '9px 12px', textAlign: 'center', cursor: 'pointer' }}>
                    JML TRANSAKSI
                  </th>
                  <th onClick={() => handleSort('total_qty')} style={{ padding: '9px 12px', textAlign: 'center', cursor: 'pointer' }}>
                    QTY BARANG
                  </th>
                  <th onClick={() => handleSort('omset_kotor')} style={{ padding: '9px 12px', textAlign: 'right', cursor: 'pointer' }}>
                    OMSET KOTOR
                  </th>
                  <th onClick={() => handleSort('potongan_fee')} style={{ padding: '9px 12px', textAlign: 'right', cursor: 'pointer' }}>
                    POTONGAN ADMIN
                  </th>
                  <th onClick={() => handleSort('dana_cair')} style={{ padding: '9px 12px', textAlign: 'right', backgroundColor: '#064e3b', color: '#a7f3d0', cursor: 'pointer' }}>
                    DANA CAIR BERSIH
                  </th>
                  <th onClick={() => handleSort('total_hpp')} style={{ padding: '9px 12px', textAlign: 'right', cursor: 'pointer' }}>
                    TOTAL HPP
                  </th>
                  <th onClick={() => handleSort('laba_bersih')} style={{ padding: '9px 12px', textAlign: 'right', cursor: 'pointer' }}>
                    LABA BERSIH
                  </th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>MARGIN (%)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      Sedang memuat laporan per tanggal...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Tidak ada data transaksi penjualan cair untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const no = entriesPerPage === 'Semua' ? idx + 1 : (currentPage - 1) * Number(entriesPerPage) + idx + 1;
                    return (
                      <tr key={row.tanggal || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>{no}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace', fontSize: '12px' }}>
                          {row.tanggal}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: '#0284c7' }}>
                          {row.jumlah_transaksi} Trx
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: '#334155' }}>
                          {row.total_qty} Pcs
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                          {formatRupiah(row.omset_kotor)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                          {row.potongan_fee > 0 ? `-${formatRupiah(row.potongan_fee)}` : 'Rp 0'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: '#15803d', backgroundColor: 'rgba(220, 252, 231, 0.35)' }}>
                          {formatRupiah(row.dana_cair)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#475569' }}>
                          {formatRupiah(row.total_hpp)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: row.laba_bersih >= 0 ? '#7c3aed' : '#dc2626' }}>
                          {formatRupiah(row.laba_bersih)}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: '800',
                            backgroundColor: row.margin_persen >= 20 ? '#dcfce7' : '#eff6ff',
                            color: row.margin_persen >= 20 ? '#15803d' : '#1d4ed8'
                          }}>
                            {row.margin_persen}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {reportFormat === 'per_transaksi' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '9px 10px', textAlign: 'center', width: '40px' }}>NO</th>
                  <th onClick={() => handleSort('tanggal')} style={{ padding: '9px 10px', cursor: 'pointer' }}>TANGGAL</th>
                  <th onClick={() => handleSort('no_pesanan')} style={{ padding: '9px 10px', cursor: 'pointer' }}>NO. PESANAN</th>
                  <th style={{ padding: '9px 10px' }}>TOKO &amp; SALURAN</th>
                  <th style={{ padding: '9px 10px' }}>PEMBELI</th>
                  <th style={{ padding: '9px 10px' }}>RINCIAN BARANG</th>
                  <th style={{ padding: '9px 10px', textAlign: 'center' }}>QTY</th>
                  <th onClick={() => handleSort('omset_kotor')} style={{ padding: '9px 10px', textAlign: 'right', cursor: 'pointer' }}>OMSET KOTOR</th>
                  <th onClick={() => handleSort('potongan_fee')} style={{ padding: '9px 10px', textAlign: 'right', cursor: 'pointer' }}>POTONGAN FEE</th>
                  <th onClick={() => handleSort('dana_cair')} style={{ padding: '9px 10px', textAlign: 'right', backgroundColor: '#064e3b', color: '#a7f3d0', cursor: 'pointer' }}>
                    DANA CAIR BERSIH
                  </th>
                  <th onClick={() => handleSort('total_hpp')} style={{ padding: '9px 10px', textAlign: 'right', cursor: 'pointer' }}>TOTAL HPP</th>
                  <th onClick={() => handleSort('laba_bersih')} style={{ padding: '9px 10px', textAlign: 'right', cursor: 'pointer' }}>LABA BERSIH</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      Sedang memuat rincian per transaksi...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Tidak ada data transaksi penjualan cair untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const no = entriesPerPage === 'Semua' ? idx + 1 : (currentPage - 1) * Number(entriesPerPage) + idx + 1;
                    return (
                      <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>{no}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: '700', color: '#334155' }}>{row.tanggal}</td>
                        <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontWeight: '800', color: '#0284c7' }}>{row.no_pesanan}</td>
                        <td style={{ padding: '7px 10px' }}>
                          <div style={{ fontWeight: '800', color: '#0f172a' }}>{row.nama_toko}</div>
                          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>{row.saluran}</div>
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: '600', color: '#334155' }}>{row.nama_pembeli}</td>
                        <td style={{ padding: '7px 10px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.rincian_barang}>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#0f172a', fontWeight: '700' }}>
                            {row.rincian_barang}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '800' }}>{row.total_qty}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700' }}>{formatRupiah(row.omset_kotor)}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>
                          {row.potongan_fee > 0 ? `-${formatRupiah(row.potongan_fee)}` : 'Rp 0'}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '900', color: '#15803d', backgroundColor: 'rgba(220, 252, 231, 0.35)' }}>
                          {formatRupiah(row.dana_cair)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#475569' }}>{formatRupiah(row.total_hpp)}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', color: row.laba_bersih >= 0 ? '#7c3aed' : '#dc2626' }}>
                          {formatRupiah(row.laba_bersih)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {reportFormat === 'per_barang' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '9px 10px', textAlign: 'center', width: '40px' }}>NO</th>
                  <th onClick={() => handleSort('kode_sku')} style={{ padding: '9px 10px', cursor: 'pointer' }}>SKU BARANG</th>
                  <th onClick={() => handleSort('nama_produk')} style={{ padding: '9px 10px', cursor: 'pointer' }}>NAMA BARANG</th>
                  <th style={{ padding: '9px 10px' }}>KATEGORI</th>
                  <th onClick={() => handleSort('jumlah_transaksi')} style={{ padding: '9px 10px', textAlign: 'center', cursor: 'pointer' }}>JML TRX</th>
                  <th onClick={() => handleSort('total_qty')} style={{ padding: '9px 10px', textAlign: 'center', cursor: 'pointer' }}>QTY TERJUAL</th>
                  <th onClick={() => handleSort('omset_kotor')} style={{ padding: '9px 10px', textAlign: 'right', cursor: 'pointer' }}>OMSET KOTOR</th>
                  <th onClick={() => handleSort('dana_cair')} style={{ padding: '9px 10px', textAlign: 'right', backgroundColor: '#064e3b', color: '#a7f3d0', cursor: 'pointer' }}>
                    DANA CAIR BERSIH
                  </th>
                  <th style={{ padding: '9px 10px', textAlign: 'right' }}>HPP SATUAN</th>
                  <th onClick={() => handleSort('total_hpp')} style={{ padding: '9px 10px', textAlign: 'right', cursor: 'pointer' }}>TOTAL HPP</th>
                  <th onClick={() => handleSort('laba_bersih')} style={{ padding: '9px 10px', textAlign: 'right', cursor: 'pointer' }}>LABA BERSIH</th>
                  <th style={{ padding: '9px 10px', textAlign: 'center' }}>MARGIN (%)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      Sedang memuat rekap penjualan per barang...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Tidak ada data barang terjual untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const no = entriesPerPage === 'Semua' ? idx + 1 : (currentPage - 1) * Number(entriesPerPage) + idx + 1;
                    return (
                      <tr key={row.kode_sku || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>{no}</td>
                        <td style={{ padding: '7px 10px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: '800',
                            color: '#0284c7',
                            backgroundColor: '#f0f9ff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #bae6fd'
                          }}>
                            {row.kode_sku}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', fontWeight: '700', color: '#0f172a', maxWidth: '300px', whiteSpace: 'normal' }}>
                          {row.nama_produk}
                        </td>
                        <td style={{ padding: '7px 10px', color: '#475569', fontWeight: '600' }}>{row.kategori}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>{row.jumlah_transaksi} Trx</td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '900', color: '#1d4ed8' }}>{row.total_qty} Pcs</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700' }}>{formatRupiah(row.omset_kotor)}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '900', color: '#15803d', backgroundColor: 'rgba(220, 252, 231, 0.35)' }}>
                          {formatRupiah(row.dana_cair)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>{formatRupiah(row.hpp_satuan)}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '700', color: '#475569' }}>{formatRupiah(row.total_hpp)}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', color: row.laba_bersih >= 0 ? '#7c3aed' : '#dc2626' }}>
                          {formatRupiah(row.laba_bersih)}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: '800',
                            backgroundColor: row.margin_persen >= 20 ? '#dcfce7' : '#eff6ff',
                            color: row.margin_persen >= 20 ? '#15803d' : '#1d4ed8'
                          }}>
                            {row.margin_persen}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* 5. FOOTER PAGINATION */}
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
            Menampilkan <b>{paginatedRows.length}</b> dari total <b>{totalRows}</b> baris ({reportFormat === 'per_tanggal' ? 'Per Tanggal' : reportFormat === 'per_transaksi' ? 'Per Transaksi' : 'Per Barang'}).
          </div>

          {entriesPerPage !== 'Semua' && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '3px 9px',
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
                  padding: '3px 9px',
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

