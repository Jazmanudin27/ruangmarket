import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Package,
  Truck,
  ArrowDownLeft,
  X,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
  Inbox,
  Clock,
  Layers,
  HelpCircle,
  FileText
} from 'lucide-react';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

export default function ReturBarangDesktopView() {
  const [activeCompany] = useState(getActiveCompany);
  const [returns, setReturns] = useState([]);
  const [summary, setSummary] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('semua');
  const [filterChannel, setFilterChannel] = useState('semua');

  // Modal Detail & Restock
  const [selectedRetur, setSelectedRetur] = useState(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockCondition, setRestockCondition] = useState('Bagus / Layak Jual (Restok)');
  const [restockNotes, setRestockNotes] = useState('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Modal Ajukan Retur Manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    no_pesanan: '',
    nama_pembeli: '',
    nama_toko: 'Shopee / TikTok',
    saluran: 'shopee',
    alasan_retur: '',
    no_resi_retur: '',
    kurir_retur: 'J&T Express',
    total_refund: '',
    catatan: ''
  });

  // Fetch Returns
  const loadReturns = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (activeTab !== 'semua') query.set('status', activeTab);
      if (filterChannel !== 'semua') query.set('channel', filterChannel);
      if (search.trim()) query.set('q', search.trim());

      const res = await fetch(`/api/marketplace/returns?${query.toString()}`);
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        setReturns(json.data || []);
        setSummary(json.summary || {});
      } else {
        setReturns([]);
      }
    } catch (err) {
      console.warn('Gagal memuat data retur:', err.message);
      setReturns([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, [activeTab, filterChannel]);

  // Sync Returns dari Marketplace
  const handleSyncReturns = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/marketplace/returns/sync', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess(json.message || 'Sinkronisasi retur selesai!');
        await loadReturns();
      } else {
        throw new Error(json.message || 'Gagal sinkronisasi data retur');
      }
    } catch (e) {
      toastError(`Gagal sync retur: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Submit Restock Barang ke Master Produk
  const handleConfirmRestock = async () => {
    if (!selectedRetur) return;
    setIsSubmittingRestock(true);
    try {
      const res = await fetch(`/api/marketplace/returns/${encodeURIComponent(selectedRetur.id)}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kondisi_barang: restockCondition,
          catatan: restockNotes,
          do_restock: restockCondition.includes('Layak') || restockCondition.includes('Bagus')
        })
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess(json.message || 'Barang berhasil diterima & status diperbarui!');
        setIsRestockModalOpen(false);
        setSelectedRetur(null);
        await loadReturns();
      } else {
        throw new Error(json.message || 'Gagal proses penerimaan retur');
      }
    } catch (e) {
      toastError(`Gagal restok: ${e.message}`);
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Submit Ajukan Retur Manual
  const handleSubmitManual = async (e) => {
    e.preventDefault();
    if (!manualForm.no_pesanan.trim()) {
      toastError('Nomor pesanan wajib diisi');
      return;
    }
    try {
      const res = await fetch('/api/marketplace/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess('Retur berhasil diajukan!');
        setIsManualModalOpen(false);
        setManualForm({
          no_pesanan: '',
          nama_pembeli: '',
          nama_toko: 'Shopee / TikTok',
          saluran: 'shopee',
          alasan_retur: '',
          no_resi_retur: '',
          kurir_retur: 'J&T Express',
          total_refund: '',
          catatan: ''
        });
        await loadReturns();
      } else {
        throw new Error(json.message || 'Gagal mencatat retur');
      }
    } catch (err) {
      toastError(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#0b1120', minHeight: 'calc(100vh - 46px)', color: '#e2e8f0', fontFamily: 'inherit' }}>
      
      {/* 1. HEADER & ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <RotateCcw size={18} color="#ef4444" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Retur & Pengembalian Barang</span>
              <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                {returns.length} Transaksi
              </span>
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              Manajemen paket retur marketplace Shopee, TikTok Shop & restok fisik ke produk master
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSyncReturns}
            disabled={isSyncing}
            style={{
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid rgba(2, 132, 199, 0.4)',
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              color: '#38bdf8',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={13} className={isSyncing ? 'spin-icon' : ''} />
            <span>{isSyncing ? 'Memeriksa...' : 'Cek Retur Marketplace'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            style={{
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 14px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowDownLeft size={14} />
            <span>Catat Retur Baru</span>
          </button>
        </div>
      </div>

      {/* 2. STATISTIC SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        <div style={{ padding: '10px 14px', backgroundColor: '#131e32', border: '1px solid #1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <RotateCcw size={13} color="#38bdf8" />
            <span>Total Retur</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>
            {summary.total || 0}
          </div>
        </div>

        <div style={{ padding: '10px 14px', backgroundColor: '#131e32', border: '1px solid #1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} color="#f59e0b" />
            <span>Menunggu Diterima</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
            {(summary.diajukan || 0) + (summary.dalam_pengiriman || 0)}
          </div>
        </div>

        <div style={{ padding: '10px 14px', backgroundColor: '#131e32', border: '1px solid #1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle2 size={13} color="#10b981" />
            <span>Sudah Di-Restok</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
            {summary.selesai || 0}
          </div>
        </div>

        <div style={{ padding: '10px 14px', backgroundColor: '#131e32', border: '1px solid #1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <AlertTriangle size={13} color="#f43f5e" />
            <span>Barang Rusak / Afkir</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#f43f5e', marginTop: '4px' }}>
            {summary.barang_rusak || 0}
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS & SEARCH */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'semua', label: 'Semua Status' },
            { id: 'Diajukan', label: 'Diajukan' },
            { id: 'Dalam Pengiriman', label: 'Dalam Pengiriman' },
            { id: 'Barang Diterima', label: 'Perlu Cek Kondisi' },
            { id: 'Selesai (Restok)', label: 'Selesai Restok' },
            { id: 'Ditolak', label: 'Ditolak' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '5px 11px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: activeTab === tab.id ? '700' : '600',
                border: activeTab === tab.id ? '1px solid #38bdf8' : '1px solid #1e293b',
                backgroundColor: activeTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : '#131e32',
                color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Filter Saluran */}
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            style={{
              height: '30px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #1e293b',
              backgroundColor: '#131e32',
              color: '#e2e8f0',
              fontSize: '11px',
              outline: 'none'
            }}
          >
            <option value="semua">Semua Saluran</option>
            <option value="shopee">Shopee</option>
            <option value="tiktok">TikTok Shop</option>
          </select>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={13} color="#64748b" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari no pesanan / resi / pembeli..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadReturns()}
              style={{
                height: '30px',
                paddingLeft: '28px',
                paddingRight: '10px',
                width: '220px',
                borderRadius: '6px',
                border: '1px solid #1e293b',
                backgroundColor: '#131e32',
                color: '#ffffff',
                fontSize: '11px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. TABLE RETUR BARANG */}
      <div style={{ backgroundColor: '#131e32', borderRadius: '8px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
              <th style={{ padding: '10px 12px', fontWeight: '700' }}>No. Pesanan & Saluran</th>
              <th style={{ padding: '10px 12px', fontWeight: '700' }}>Pembeli & Alasan Retur</th>
              <th style={{ padding: '10px 12px', fontWeight: '700' }}>Resi Kembali / Kurir</th>
              <th style={{ padding: '10px 12px', fontWeight: '700' }}>Produk Diretur</th>
              <th style={{ padding: '10px 12px', fontWeight: '700' }}>Kondisi Fisik</th>
              <th style={{ padding: '10px 12px', fontWeight: '700' }}>Status Retur</th>
              <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={20} className="spin-icon" style={{ margin: '0 auto 8px' }} />
                  <div>Memuat data pengembalian barang...</div>
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                  <Inbox size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div style={{ fontWeight: '700', color: '#94a3b8' }}>Belum Ada Data Retur</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>Klik tombol "Cek Retur Marketplace" atau "Catat Retur Baru" di atas.</div>
                </td>
              </tr>
            ) : (
              returns.map((ret, idx) => (
                <tr 
                  key={ret.id || idx}
                  style={{ 
                    borderBottom: '1px solid #1e293b', 
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'}
                >
                  {/* Kolom 1: No Pesanan & Saluran */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{ret.no_pesanan}</span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ 
                        padding: '1px 5px', 
                        borderRadius: '3px', 
                        fontSize: '9.5px', 
                        fontWeight: '700',
                        backgroundColor: ret.saluran === 'tiktok' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                        color: ret.saluran === 'tiktok' ? '#f472b6' : '#fb923c'
                      }}>
                        {String(ret.saluran).toUpperCase()}
                      </span>
                      <span>•</span>
                      <span>{ret.waktuDiajukanFormat || '-'}</span>
                    </div>
                  </td>

                  {/* Kolom 2: Pembeli & Alasan */}
                  <td style={{ padding: '10px 12px', maxWidth: '240px' }}>
                    <div style={{ fontWeight: '700', color: '#e2e8f0' }}>{ret.nama_pembeli || 'Pembeli Marketplace'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ret.alasan_retur}>
                      {ret.alasan_retur || '-'}
                    </div>
                  </td>

                  {/* Kolom 3: Resi Kembali */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: '700', color: ret.no_resi_retur ? '#38bdf8' : '#64748b', fontFamily: 'monospace' }}>
                      {ret.no_resi_retur || 'Belum Ada Resi'}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                      {ret.kurir_retur || 'Ekspedisi Marketplace'}
                    </div>
                  </td>

                  {/* Kolom 4: Produk Diretur */}
                  <td style={{ padding: '10px 12px', maxWidth: '200px' }}>
                    {(ret.items || []).length > 0 ? (
                      <div>
                        <div style={{ fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ret.items[0]?.nama_produk || ret.items[0]?.sku || 'Produk'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          {ret.items[0]?.qty || 1} pcs {ret.items.length > 1 ? `(+${ret.items.length - 1} item lainnya)` : ''}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b' }}>Item pesanan</span>
                    )}
                  </td>

                  {/* Kolom 5: Kondisi Fisik */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: ret.kondisi_barang?.includes('Layak') || ret.kondisi_barang?.includes('Bagus') 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : ret.kondisi_barang?.includes('Rusak') 
                          ? 'rgba(239, 68, 68, 0.15)' 
                          : 'rgba(245, 158, 11, 0.15)',
                      color: ret.kondisi_barang?.includes('Layak') || ret.kondisi_barang?.includes('Bagus')
                        ? '#34d399'
                        : ret.kondisi_barang?.includes('Rusak')
                          ? '#f87171'
                          : '#fbbf24'
                    }}>
                      {ret.kondisi_barang || 'Menunggu'}
                    </span>
                  </td>

                  {/* Kolom 6: Status Retur */}
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '10.5px',
                      fontWeight: '800',
                      backgroundColor: ret.status_retur === 'Selesai (Restok)' 
                        ? 'rgba(16, 185, 129, 0.2)' 
                        : ret.status_retur === 'Ditolak'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(2, 132, 199, 0.2)',
                      color: ret.status_retur === 'Selesai (Restok)' 
                        ? '#34d399' 
                        : ret.status_retur === 'Ditolak'
                          ? '#f87171'
                          : '#38bdf8'
                    }}>
                      {ret.status_retur || 'Diajukan'}
                    </span>
                  </td>

                  {/* Kolom 7: Aksi */}
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {ret.status_retur !== 'Selesai (Restok)' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRetur(ret);
                          setIsRestockModalOpen(true);
                        }}
                        style={{
                          padding: '4px 9px',
                          borderRadius: '5px',
                          border: 'none',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Package size={12} />
                        <span>Terima & Restok</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={13} /> Selesai
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. MODAL TERIMA & RESTOK KE MASTER */}
      {isRestockModalOpen && selectedRetur && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '10px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                  Konfirmasi Penerimaan Retur Barang
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsRestockModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '18px' }}>
              <div style={{ padding: '10px', backgroundColor: '#131e32', borderRadius: '6px', marginBottom: '14px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>No. Pesanan:</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{selectedRetur.no_pesanan}</div>
                <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>Pembeli: {selectedRetur.nama_pembeli} ({String(selectedRetur.saluran).toUpperCase()})</div>
              </div>

              {/* Rincian Produk */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                  Item Yang Dikembalikan:
                </label>
                <div style={{ maxHeight: '100px', overflowY: 'auto', backgroundColor: '#090d16', padding: '8px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  {(selectedRetur.items || []).map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#e2e8f0', marginBottom: '3px' }}>
                      <span>{it.nama_produk || it.sku}</span>
                      <span style={{ fontWeight: '700', color: '#38bdf8' }}>x{it.qty || 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pilih Kondisi Barang */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                  Pemeriksaan Kondisi Barang Fisik:
                </label>
                <select
                  value={restockCondition}
                  onChange={(e) => setRestockCondition(e.target.value)}
                  style={{
                    width: '100%',
                    height: '34px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    padding: '0 10px',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                >
                  <option value="Bagus / Layak Jual (Restok)">Bagus / Utuh (Otomatis Restok Kembali ke Master)</option>
                  <option value="Rusak / Cacat / Afkir">Rusak / Cacat / Afkir (TIDAK Masuk Stok)</option>
                  <option value="Perlu Perbaikan / Jahit Ulang">Perlu Perbaikan / Jahit Ulang (Gudang QC)</option>
                </select>
              </div>

              {/* Catatan / Keterangan */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                  Catatan Gudang (Opsional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Paket diterima lengkap dengan hangtag dan plastik..."
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: 'transparent',
                    color: '#cbd5e1',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestock}
                  disabled={isSubmittingRestock}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: isSubmittingRestock ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {isSubmittingRestock ? 'Menyimpan...' : 'Konfirmasi & Simpan Stok'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL INPUT RETUR MANUAL */}
      {isManualModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '10px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowDownLeft size={16} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                  Catat Transaksi Retur Baru
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsManualModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitManual} style={{ padding: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                    No. Pesanan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 26101805CD8Y75"
                    value={manualForm.no_pesanan}
                    onChange={(e) => setManualForm(p => ({ ...p, no_pesanan: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      padding: '0 10px',
                      fontSize: '11.5px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                    Saluran Marketplace
                  </label>
                  <select
                    value={manualForm.saluran}
                    onChange={(e) => setManualForm(p => ({ ...p, saluran: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      padding: '0 8px',
                      fontSize: '11.5px',
                      outline: 'none'
                    }}
                  >
                    <option value="shopee">Shopee</option>
                    <option value="tiktok">TikTok Shop</option>
                    <option value="offline">Toko Offline / POS</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                    Nama Pembeli
                  </label>
                  <input
                    type="text"
                    placeholder="Nama pelanggan..."
                    value={manualForm.nama_pembeli}
                    onChange={(e) => setManualForm(p => ({ ...p, nama_pembeli: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      padding: '0 10px',
                      fontSize: '11.5px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                    No. Resi Pengembalian
                  </label>
                  <input
                    type="text"
                    placeholder="Resi paket balik (misal: JX...)"
                    value={manualForm.no_resi_retur}
                    onChange={(e) => setManualForm(p => ({ ...p, no_resi_retur: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      padding: '0 10px',
                      fontSize: '11.5px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                  Alasan Pengembalian Barang
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Salah ukuran, cacat jahitan, berubah pikiran..."
                  value={manualForm.alasan_retur}
                  onChange={(e) => setManualForm(p => ({ ...p, alasan_retur: e.target.value }))}
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    backgroundColor: 'transparent',
                    color: '#cbd5e1',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  Simpan Retur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
