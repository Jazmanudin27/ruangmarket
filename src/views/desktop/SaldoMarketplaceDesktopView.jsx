import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Filter,
  Download,
  Calendar,
  Store,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  ShoppingBag,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

export default function SaldoMarketplaceDesktopView() {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('company_changed', handleCompanyChange);
    return () => window.removeEventListener('company_changed', handleCompanyChange);
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_saldo: 0,
    saldo_shopee: 0,
    saldo_tiktok: 0,
    total_masuk: 0,
    total_keluar: 0,
    stores: []
  });
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total_items: 0,
    total_pages: 1
  });

  // Filters
  const [filterStore, setFilterStore] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const loadWalletData = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
        store_id: filterStore,
        channel: filterChannel,
        start_date: startDate,
        end_date: endDate,
        search: search
      });

      const res = await fetch(`/api/marketplace/wallet?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.status === 'success' && json.data) {
        setSummary(json.data.summary || {});
        setTransactions(json.data.transactions || []);
        setPagination(json.data.pagination || { page: 1, limit: 50, total_items: 0, total_pages: 1 });
      } else {
        throw new Error(json.message || 'Gagal memuat data saldo');
      }
    } catch (err) {
      console.error('[Load Wallet Error]:', err);
      toastError('Gagal memuat data Saldo Marketplace: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData(1);
  }, [filterStore, filterChannel, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadWalletData(1);
  };

  const handleExportExcel = () => {
    if (!transactions || transactions.length === 0) {
      toastError('Tidak ada data transaksi untuk diekspor!');
      return;
    }

    const dataToExport = transactions.map((t, idx) => ({
      No: idx + 1,
      Tanggal: t.transaction_date ? new Date(t.transaction_date).toLocaleString('id-ID') : '—',
      'Toko / Channel': `${t.store_name} (${(t.channel || '').toUpperCase()})`,
      'Tipe Mutasi': t.type || '—',
      Deskripsi: t.description || '—',
      Arah: t.direction === 'in' ? 'Masuk (Kredit)' : 'Keluar (Debit)',
      Nominal: t.amount,
      'Saldo Berjalan': t.current_balance !== null ? t.current_balance : '—',
      'ID Transaksi': t.transaction_id || '—'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mutasi Saldo Marketplace');
    XLSX.writeFile(wb, `Saldo_Marketplace_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toastSuccess('Berhasil mengekspor data mutasi dompet!');
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      {/* 1. HEADER HALAMAN */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        padding: '10px 14px',
        borderRadius: '8px',
        backgroundColor: '#0284c7',
        color: '#ffffff',
        boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wallet size={20} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Saldo & Dompet Marketplace
              </span>
              <span style={{
                fontSize: '9.5px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fontWeight: '700'
              }}>
                SHOPEE & TIKTOK SHOP
              </span>
            </div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>
              Pantau mutasi saldo, pencairan dana pesanan (escrow), dan penarikan saldo toko secara real-time.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => loadWalletData(pagination.page)}
            style={{
              height: '30px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              height: '30px',
              padding: '0 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
            }}
          >
            <Download size={13} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. STAT CARD SUMMARY */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '10px',
        marginBottom: '12px'
      }}>
        {/* Total Saldo Semua Toko */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderLeft: '4px solid #0284c7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>TOTAL SALDO SEMUA TOKO</span>
            <Wallet size={15} color="#0284c7" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
            {formatRupiah(summary.total_saldo)}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Dari {summary.stores?.length || 0} Toko Terhubung
          </div>
        </div>

        {/* Saldo Shopee */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderLeft: '4px solid #ea580c',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#ea580c' }}>SALDO SHOPEE</span>
            <ShoppingBag size={15} color="#ea580c" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#ea580c' }}>
            {formatRupiah(summary.saldo_shopee)}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            ShopeePay Merchant
          </div>
        </div>

        {/* Saldo TikTok Shop */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderLeft: '4px solid #000000',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>SALDO TIKTOK SHOP</span>
            <Store size={15} color="#0f172a" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
            {formatRupiah(summary.saldo_tiktok)}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Earnings & Settlement
          </div>
        </div>

        {/* Mutasi Masuk Filter Aktif */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderLeft: '4px solid #16a34a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a' }}>TOTAL MASUK (DIPILIH)</span>
            <ArrowDownLeft size={15} color="#16a34a" />
          </div>
          <div style={{ fontSize: '17px', fontWeight: '900', color: '#16a34a' }}>
            +{formatRupiah(summary.total_masuk)}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Pencairan pesanan pelanggan
          </div>
        </div>

        {/* Mutasi Keluar Filter Aktif */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderLeft: '4px solid #dc2626',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626' }}>TOTAL PENARIKAN (DIPILIH)</span>
            <ArrowUpRight size={15} color="#dc2626" />
          </div>
          <div style={{ fontSize: '17px', fontWeight: '900', color: '#dc2626' }}>
            -{formatRupiah(summary.total_keluar)}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Withdrawal ke rekening bank
          </div>
        </div>
      </div>

      {/* 3. RINCIAN SALDO PER TOKO */}
      {summary.stores && summary.stores.length > 0 && (
        <div style={{
          marginBottom: '12px',
          padding: '10px 12px',
          borderRadius: '7px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '8px', textTransform: 'uppercase' }}>
            Rincian Saldo Dompet per Toko:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {summary.stores.map((st) => {
              const isSelected = String(filterStore) === String(st.store_id);
              const isShopee = st.channel.includes('shopee');
              return (
                <button
                  key={st.store_id}
                  type="button"
                  onClick={() => setFilterStore(isSelected ? 'all' : String(st.store_id))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#e0f2fe' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    backgroundColor: isShopee ? '#ffedd5' : '#f1f5f9',
                    color: isShopee ? '#c2410c' : '#0f172a'
                  }}>
                    {isShopee ? 'SHOPEE' : 'TIKTOK'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>
                    {st.store_name}
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: '900', color: st.balance > 0 ? '#15803d' : '#64748b' }}>
                    {formatRupiah(st.balance)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. FILTER BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px', flex: '1 1 240px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Cari deskripsi, no pesanan, ID transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '28px',
                paddingLeft: '26px',
                paddingRight: '8px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              height: '28px',
              padding: '0 10px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Cari
          </button>
        </form>

        {/* Filter Toko */}
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          style={{
            height: '28px',
            padding: '0 8px',
            borderRadius: '5px',
            border: '1px solid #cbd5e1',
            fontSize: '11px',
            backgroundColor: '#ffffff'
          }}
        >
          <option value="all">Semua Toko</option>
          {summary.stores?.map(s => (
            <option key={s.store_id} value={s.store_id}>
              {s.store_name} ({s.channel.toUpperCase()})
            </option>
          ))}
        </select>

        {/* Filter Channel */}
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          style={{
            height: '28px',
            padding: '0 8px',
            borderRadius: '5px',
            border: '1px solid #cbd5e1',
            fontSize: '11px',
            backgroundColor: '#ffffff'
          }}
        >
          <option value="all">Semua Channel</option>
          <option value="shopee">Shopee</option>
          <option value="tiktok">TikTok Shop</option>
        </select>

        {/* Rentang Tanggal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              height: '28px',
              padding: '0 6px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              fontSize: '11px'
            }}
          />
          <span style={{ fontSize: '11px', color: '#64748b' }}>s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              height: '28px',
              padding: '0 6px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              fontSize: '11px'
            }}
          />
          {(startDate || endDate || filterStore !== 'all' || filterChannel !== 'all' || search) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setFilterStore('all');
                setFilterChannel('all');
                setSearch('');
              }}
              style={{
                height: '28px',
                padding: '0 8px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 5. TABEL MUTASI DOMPET */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '7px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '2px solid #cbd5e1',
                color: '#334155',
                fontSize: '10.5px',
                fontWeight: '800',
                letterSpacing: '0.03em'
              }}>
                <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>NO</th>
                <th style={{ padding: '8px 10px', width: '130px' }}>TANGGAL & WAKTU</th>
                <th style={{ padding: '8px 10px', width: '160px' }}>TOKO & CHANNEL</th>
                <th style={{ padding: '8px 10px', width: '110px' }}>TIPE MUTASI</th>
                <th style={{ padding: '8px 10px' }}>DESKRIPSI / NO PESANAN</th>
                <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>NOMINAL</th>
                <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>SALDO AKHIR</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    <div>Memuat mutasi saldo marketplace...</div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    Tidak ada riwayat mutasi dompet ditemukan untuk filter ini.
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => {
                  const isMasuk = tx.direction === 'in';
                  const isShopee = tx.channel.includes('shopee');
                  const txDate = tx.transaction_date ? new Date(tx.transaction_date) : null;
                  const rowNum = (pagination.page - 1) * pagination.limit + idx + 1;

                  return (
                    <tr
                      key={tx.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>
                        {rowNum}
                      </td>

                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>
                          {txDate ? txDate.toISOString().slice(0, 10) : '—'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {txDate ? txDate.toTimeString().slice(0, 8) : '—'}
                        </div>
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {tx.store_name}
                        </div>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '800',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: isShopee ? '#ffedd5' : '#f1f5f9',
                          color: isShopee ? '#c2410c' : '#0f172a'
                        }}>
                          {isShopee ? 'SHOPEE' : 'TIKTOK'}
                        </span>
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '700',
                          backgroundColor: isMasuk ? '#ecfdf5' : '#fef2f2',
                          color: isMasuk ? '#047857' : '#b91c1c'
                        }}>
                          {tx.type || (isMasuk ? 'Pemasukan' : 'Pengeluaran')}
                        </span>
                      </td>

                      <td style={{ padding: '8px 10px', color: '#334155' }}>
                        <div style={{ fontWeight: '600' }}>{tx.description || '—'}</div>
                        {tx.transaction_id && (
                          <div style={{ fontSize: '9.5px', color: '#94a3b8', fontFamily: 'monospace' }}>
                            ID: {tx.transaction_id}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{
                          fontWeight: '800',
                          fontSize: '12px',
                          color: isMasuk ? '#16a34a' : '#dc2626'
                        }}>
                          {isMasuk ? '+' : '-'}{formatRupiah(tx.amount)}
                        </div>
                      </td>

                      <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>
                          {tx.current_balance !== null ? formatRupiah(tx.current_balance) : '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <b>{transactions.length}</b> dari <b>{pagination.total_items}</b> transaksi mutasi dompet
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadWalletData(pagination.page - 1)}
              style={{
                height: '24px',
                padding: '0 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: pagination.page <= 1 ? '#f1f5f9' : '#ffffff',
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={12} />
            </button>
            <span>
              Hal <b>{pagination.page}</b> / {pagination.total_pages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => loadWalletData(pagination.page + 1)}
              style={{
                height: '24px',
                padding: '0 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: pagination.page >= pagination.total_pages ? '#f1f5f9' : '#ffffff',
                cursor: pagination.page >= pagination.total_pages ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

