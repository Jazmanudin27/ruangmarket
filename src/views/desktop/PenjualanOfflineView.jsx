import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Plus, X, Eye, CheckCircle2, Truck, Package,
  Calendar, Phone, MapPin, User, ChevronDown, Edit3, Trash2, Send
} from 'lucide-react';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

const SALURAN_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', color: '#25d366' },
  { value: 'dropship', label: 'Dropship', color: '#8b5cf6' },
  { value: 'reseller', label: 'Reseller', color: '#f59e0b' },
  { value: 'walk_in', label: 'Walk-in / Toko', color: '#06b6d4' },
  { value: 'telepon', label: 'Telepon', color: '#3b82f6' },
  { value: 'instagram', label: 'Instagram DM', color: '#e1306c' },
  { value: 'lainnya', label: 'Lainnya', color: '#64748b' }
];

const STATUS_LIST = [
  { value: 'draft', label: 'Draft', color: '#94a3b8', bg: '#f1f5f9' },
  { value: 'dikonfirmasi', label: 'Dikonfirmasi', color: '#f59e0b', bg: '#fef3c7' },
  { value: 'diproses', label: 'Diproses', color: '#3b82f6', bg: '#dbeafe' },
  { value: 'siap_kirim', label: 'Siap Kirim', color: '#8b5cf6', bg: '#ede9fe' },
  { value: 'dikirim', label: 'Dikirim', color: '#06b6d4', bg: '#cffafe' },
  { value: 'selesai', label: 'Selesai', color: '#10b981', bg: '#d1fae5' },
  { value: 'dibatalkan', label: 'Dibatalkan', color: '#ef4444', bg: '#fee2e2' }
];

const BAYAR_OPTIONS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cod', label: 'COD' },
  { value: 'tunai', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'lainnya', label: 'Lainnya' }
];

export default function PenjualanOfflineView({ onNavigate }) {
  const [activeCompany] = useState(getActiveCompany);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [filterSaluran, setFilterSaluran] = useState('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(25);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [editStatusId, setEditStatusId] = useState(null);
  const [editResiId, setEditResiId] = useState(null);
  const [resiInput, setResiInput] = useState('');

  // Stores
  const [stores, setStores] = useState([]);

  // Master produk for autocomplete
  const [masterProduk, setMasterProduk] = useState([]);
  const [produkSearch, setProdukSearch] = useState('');
  const [showProdukDropdown, setShowProdukDropdown] = useState(false);

  // Form state
  const [form, setForm] = useState({
    saluran: 'whatsapp',
    id_toko: '',
    nama_toko: '',
    nama_pembeli: '',
    no_telepon: '',
    alamat_pengiriman: '',
    kota: '',
    provinsi: '',
    kode_pos: '',
    is_dropship: false,
    nama_pengirim_ds: '',
    no_telp_pengirim_ds: '',
    kurir: '',
    jenis_layanan: '',
    batas_kirim: '',
    diskon: 0,
    ongkir: 0,
    metode_pembayaran: 'transfer',
    status_pembayaran: 'belum_bayar',
    nominal_dp: 0,
    catatan: '',
    items: []
  });

  // ── Load data ───────────────────────────────────────────────────────────
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ kode_perusahaan: activeCompany.code });
      if (filterStatus !== 'semua') params.set('status', filterStatus);
      if (filterSaluran !== 'semua') params.set('saluran', filterSaluran);
      if (search) params.set('search', search);
      const res = await fetch(`/api/offline/orders?${params}`);
      const json = await res.json();
      setOrders(json.data || []);
    } catch (e) {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const res = await fetch('/api/marketplace/stores');
      const json = await res.json();
      setStores(json.data || []);
    } catch (e) { setStores([]); }
  };

  const loadMasterProduk = async () => {
    try {
      const res = await fetch(`/api/master/produk?kode_perusahaan=${activeCompany.code}`);
      const json = await res.json();
      setMasterProduk(json.data || []);
    } catch (e) { setMasterProduk([]); }
  };

  useEffect(() => { loadOrders(); loadStores(); loadMasterProduk(); }, [filterStatus, filterSaluran]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({
      saluran: 'whatsapp', id_toko: '', nama_toko: '',
      nama_pembeli: '', no_telepon: '', alamat_pengiriman: '', kota: '', provinsi: '', kode_pos: '',
      is_dropship: false, nama_pengirim_ds: '', no_telp_pengirim_ds: '',
      kurir: '', jenis_layanan: '', batas_kirim: '',
      diskon: 0, ongkir: 0,
      metode_pembayaran: 'transfer', status_pembayaran: 'belum_bayar', nominal_dp: 0,
      catatan: '', items: []
    });
    setProdukSearch('');
  };

  const addItem = (produk) => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        sku: produk.kode_sku || produk.sku || '',
        nama_produk: produk.nama_produk || produk.nama || '',
        varian: produk.varian || '',
        qty: 1,
        harga_satuan: Number(produk.harga_jual) || 0,
        diskon_item: 0,
        catatan_item: ''
      }]
    }));
    setProdukSearch('');
    setShowProdukDropdown(false);
  };

  const removeItem = (idx) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it)
    }));
  };

  const subtotal = form.items.reduce((s, it) => s + (Number(it.harga_satuan) * Number(it.qty) - Number(it.diskon_item || 0)), 0);
  const totalHarga = Math.max(0, subtotal - Number(form.diskon) + Number(form.ongkir));

  const handleSubmit = async (asDraft = true) => {
    if (!form.nama_pembeli.trim()) { toastError('Nama pembeli wajib diisi'); return; }
    if (!form.items.length) { toastError('Tambah minimal 1 item produk'); return; }

    try {
      const res = await fetch('/api/offline/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kode_perusahaan: activeCompany.code,
          status_pesanan: asDraft ? 'draft' : 'dikonfirmasi',
          dibuat_oleh: activeCompany.name || 'Admin'
        })
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess(`Pesanan ${json.no_pesanan} berhasil ${asDraft ? 'disimpan sebagai draft' : 'dikonfirmasi'}!`);
        setShowForm(false);
        resetForm();
        loadOrders();
      } else throw new Error(json.message);
    } catch (err) {
      toastError(`Gagal: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/offline/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_pesanan: newStatus })
      });
      const json = await res.json();
      if (res.ok) {
        toastSuccess(`Status diperbarui ke "${newStatus}"${json.no_spk ? ` — SPK: ${json.no_spk}` : ''}`);
        setEditStatusId(null);
        loadOrders();
      } else throw new Error(json.message);
    } catch (err) { toastError(err.message); }
  };

  const handleUpdateResi = async (id) => {
    try {
      const res = await fetch(`/api/offline/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ no_resi: resiInput, status_pesanan: 'dikirim' })
      });
      if (res.ok) {
        toastSuccess('Resi diperbarui & status → Dikirim');
        setEditResiId(null);
        setResiInput('');
        loadOrders();
      }
    } catch (err) { toastError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin hapus pesanan ini?')) return;
    try {
      await fetch(`/api/offline/orders/${id}`, { method: 'DELETE' });
      toastSuccess('Pesanan dihapus');
      loadOrders();
    } catch (err) { toastError(err.message); }
  };

  // Load detail
  const loadDetail = async (id) => {
    try {
      const res = await fetch(`/api/offline/orders/${id}`);
      const json = await res.json();
      setDetailOrder(json.data || null);
    } catch (e) { toastError('Gagal memuat detail'); }
  };

  // ── Filtered + paginated ────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    if (search) {
      const s = search.toLowerCase();
      const match = [o.no_pesanan, o.nama_pembeli, o.no_telepon, o.no_resi, o.ringkasan_produk]
        .some(v => String(v || '').toLowerCase().includes(s));
      if (!match) return false;
    }
    return true;
  });
  const totalPages = Math.ceil(filtered.length / entriesPerPage);
  const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  // Summary counts
  const countByStatus = (st) => orders.filter(o => o.status_pesanan === st).length;

  const getStatusBadge = (status) => {
    const s = STATUS_LIST.find(x => x.value === status) || STATUS_LIST[0];
    return (
      <span style={{
        padding: '3px 10px', borderRadius: '12px', fontSize: '10.5px', fontWeight: '800',
        backgroundColor: s.bg, color: s.color, border: `1px solid ${s.color}30`, textTransform: 'uppercase'
      }}>
        {s.label}
      </span>
    );
  };

  const getSaluranBadge = (saluran) => {
    const ch = SALURAN_OPTIONS.find(x => x.value === saluran) || SALURAN_OPTIONS[6];
    return (
      <span style={{
        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700',
        backgroundColor: `${ch.color}18`, color: ch.color, border: `1px solid ${ch.color}30`
      }}>
        {ch.label}
      </span>
    );
  };

  // Product search filtered list
  const filteredProduk = produkSearch.trim()
    ? masterProduk.filter(p => {
        const s = produkSearch.toLowerCase();
        return (p.nama_produk || '').toLowerCase().includes(s) ||
               (p.kode_sku || '').toLowerCase().includes(s);
      }).slice(0, 10)
    : [];

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>

      {/* ── 1. MASTER HEADER CARD (RUANGMARKET DARK STYLE) ────────────────── */}
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
            background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.25) 0%, rgba(16, 185, 129, 0.15) 100%)',
            border: '1px solid rgba(37, 211, 102, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#25d366',
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(37, 211, 102, 0.2)'
          }}>
            <Send size={21} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Penjualan Offline
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '1.5px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(37, 211, 102, 0.18)',
                color: '#25d366',
                border: '1px solid rgba(37, 211, 102, 0.35)'
              }}>
                {activeCompany?.code || 'RSG'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
              Catat & kelola transaksi manual WhatsApp, Dropship, Reseller, Walk-in, dan Toko fisik. Otomatis potong stok & buat SPK.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('pesanan_masuk')}
              style={{
                padding: '7px 14px',
                borderRadius: '7px',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'; }}
            >
              <ShoppingBag size={13} />
              <span>Pesanan Marketplace</span>
            </button>
          )}

          <button
            type="button"
            id="btn-tambah-pesanan-offline"
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              padding: '7px 16px',
              borderRadius: '7px',
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.4)',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={14} />
            <span>Buat Pesanan Baru</span>
          </button>
        </div>
      </div>

      {/* ── STATUS TABS ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {[{ value: 'semua', label: `Semua (${orders.length})` }, ...STATUS_LIST.map(s => ({
          value: s.value, label: `${s.label} (${countByStatus(s.value)})`
        }))].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setFilterStatus(tab.value); setCurrentPage(1); }}
            style={{
              height: '28px', padding: '0 12px', borderRadius: '6px',
              border: filterStatus === tab.value ? '1px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: filterStatus === tab.value ? '#2563eb' : '#fff',
              color: filterStatus === tab.value ? '#fff' : '#475569',
              fontSize: '11px', fontWeight: '700', cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SEARCH & FILTER BAR ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center',
        backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px'
      }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text" value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari no pesanan, nama, no HP, resi..."
            style={{
              width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px',
              border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none'
            }}
          />
        </div>
        <select value={filterSaluran} onChange={e => { setFilterSaluran(e.target.value); setCurrentPage(1); }}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', cursor: 'pointer' }}
        >
          <option value="semua">Semua Saluran</option>
          {SALURAN_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button type="button" onClick={() => loadOrders()}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', cursor: 'pointer', fontWeight: '700', backgroundColor: '#f8fafc' }}
        >
          Refresh
        </button>
      </div>

      {/* ── TABLE ────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>
                <th style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>NO PESANAN</th>
                <th style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>PEMBELI & SALURAN</th>
                <th style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>TOKO</th>
                <th style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>PRODUK</th>
                <th style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'right' }}>TOTAL</th>
                <th style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>RESI & KURIR</th>
                <th style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center', width: '130px' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>Memuat...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                  <Package size={32} color="#cbd5e1" style={{ marginBottom: '6px' }} />
                  <div style={{ fontWeight: '700', color: '#475569' }}>Belum ada pesanan offline</div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>Klik "Buat Pesanan Baru" untuk mulai</div>
                </td></tr>
              ) : (
                paginated.map(ord => (
                  <tr key={ord.id}
                    style={{ transition: 'background-color 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    {/* NO PESANAN */}
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', fontWeight: '700', color: '#1e40af', fontSize: '11.5px' }}>
                      {ord.no_pesanan}
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '400' }}>
                        {new Date(ord.dibuat_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    {/* PEMBELI & SALURAN */}
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '12px' }}>{ord.nama_pembeli}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        {getSaluranBadge(ord.saluran)}
                        {ord.no_telepon && <span style={{ fontSize: '10.5px', color: '#64748b' }}>{ord.no_telepon}</span>}
                      </div>
                      {ord.is_dropship === 1 && (
                        <div style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: '600', marginTop: '2px' }}>
                          ↳ DS: {ord.nama_pengirim_ds || '-'}
                        </div>
                      )}
                    </td>

                    {/* TOKO */}
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', fontSize: '11.5px', color: '#475569' }}>
                      {ord.nama_toko || '-'}
                    </td>

                    {/* PRODUK */}
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', maxWidth: '200px' }}>
                      <div style={{ fontSize: '11.5px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {ord.ringkasan_produk || '-'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {ord.jumlah_item || 0} item · {ord.total_qty || 0} pcs
                      </div>
                    </td>

                    {/* TOTAL */}
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', color: '#059669', fontSize: '12px' }}>
                      {formatRupiah(ord.total_harga)}
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '400' }}>
                        {ord.status_pembayaran === 'lunas' ? '✓ Lunas' : ord.status_pembayaran === 'dp' ? `DP ${formatRupiah(ord.nominal_dp)}` : 'Belum bayar'}
                      </div>
                    </td>

                    {/* RESI & KURIR */}
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                      {editResiId === ord.id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input value={resiInput} onChange={e => setResiInput(e.target.value)}
                            placeholder="No resi..." style={{ width: '100px', padding: '3px 6px', fontSize: '11px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                          <button onClick={() => handleUpdateResi(ord.id)}
                            style={{ padding: '3px 6px', fontSize: '10px', border: 'none', borderRadius: '4px', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer' }}
                          >OK</button>
                          <button onClick={() => setEditResiId(null)}
                            style={{ padding: '3px 6px', fontSize: '10px', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff' }}
                          >×</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '11.5px', color: '#334155' }}>{ord.kurir || '-'}</div>
                          <div style={{ fontSize: '10.5px', color: ord.no_resi ? '#2563eb' : '#94a3b8', fontWeight: ord.no_resi ? '600' : '400', cursor: 'pointer' }}
                            onClick={() => { setEditResiId(ord.id); setResiInput(ord.no_resi || ''); }}
                          >
                            {ord.no_resi || 'Klik untuk input resi'}
                          </div>
                        </>
                      )}
                    </td>

                    {/* STATUS */}
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      {editStatusId === ord.id ? (
                        <select value={ord.status_pesanan}
                          onChange={e => handleUpdateStatus(ord.id, e.target.value)}
                          onBlur={() => setEditStatusId(null)}
                          autoFocus
                          style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                          {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      ) : (
                        <div style={{ cursor: 'pointer' }} onClick={() => setEditStatusId(ord.id)}>
                          {getStatusBadge(ord.status_pesanan)}
                        </div>
                      )}
                      {ord.no_spk && (
                        <div style={{ fontSize: '9.5px', color: '#7c3aed', fontWeight: '600', marginTop: '3px' }}>
                          SPK: {ord.no_spk}
                        </div>
                      )}
                    </td>

                    {/* AKSI */}
                    <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => loadDetail(ord.id)} title="Detail"
                          style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}
                        ><Eye size={12} /> Detail</button>
                        {ord.status_pesanan === 'draft' && (
                          <button onClick={() => handleUpdateStatus(ord.id, 'dikonfirmasi')} title="Konfirmasi"
                            style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}
                          ><CheckCircle2 size={12} /> Konfirmasi</button>
                        )}
                        {ord.status_pesanan === 'draft' && (
                          <button onClick={() => handleDelete(ord.id)} title="Hapus"
                            style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}
                          ><Trash2 size={12} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {filtered.length} pesanan · Hal {currentPage}/{totalPages}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>‹</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: BUAT PESANAN BARU                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '14px', width: '720px', maxWidth: '95vw',
            maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', padding: '24px 28px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  Buat Pesanan Offline Baru
                </h2>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>Isi data pembeli dan produk yang dipesan</p>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            {/* ── Saluran & Toko ───────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Saluran</label>
                <select value={form.saluran} onChange={e => setForm({...form, saluran: e.target.value})}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  {SALURAN_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Toko / Instansi</label>
                <select value={form.id_toko} onChange={e => {
                  const st = stores.find(s => String(s.id) === e.target.value);
                  setForm({...form, id_toko: e.target.value, nama_toko: st ? st.shopName : ''});
                }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <option value="">-- Pilih Toko --</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.shopName} ({s.channel})</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#8b5cf6' }}>
                  <input type="checkbox" checked={form.is_dropship} onChange={e => setForm({...form, is_dropship: e.target.checked})} />
                  Dropship
                </label>
              </div>
            </div>

            {/* ── Dropship fields ──────────────────────────────────────── */}
            {form.is_dropship && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px',
                padding: '12px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#6d28d9', marginBottom: '4px', display: 'block' }}>Nama Toko Reseller (di Label)</label>
                  <input value={form.nama_pengirim_ds} onChange={e => setForm({...form, nama_pengirim_ds: e.target.value})}
                    placeholder="Nama toko reseller..." style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #ddd6fe', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#6d28d9', marginBottom: '4px', display: 'block' }}>No Telp Toko Reseller</label>
                  <input value={form.no_telp_pengirim_ds} onChange={e => setForm({...form, no_telp_pengirim_ds: e.target.value})}
                    placeholder="08xx..." style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #ddd6fe', fontSize: '12px' }} />
                </div>
              </div>
            )}

            {/* ── Data Pembeli ─────────────────────────────────────────── */}
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              Data Pembeli
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Nama Pembeli *</label>
                <input value={form.nama_pembeli} onChange={e => setForm({...form, nama_pembeli: e.target.value})}
                  placeholder="Nama lengkap..." style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>No Telepon</label>
                <input value={form.no_telepon} onChange={e => setForm({...form, no_telepon: e.target.value})}
                  placeholder="08xx..." style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Alamat Pengiriman</label>
              <textarea value={form.alamat_pengiriman} onChange={e => setForm({...form, alamat_pengiriman: e.target.value})}
                placeholder="Alamat lengkap..." rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <input value={form.kota} onChange={e => setForm({...form, kota: e.target.value})} placeholder="Kota"
                style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <input value={form.provinsi} onChange={e => setForm({...form, provinsi: e.target.value})} placeholder="Provinsi"
                style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <input value={form.kode_pos} onChange={e => setForm({...form, kode_pos: e.target.value})} placeholder="Kode Pos"
                style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            </div>

            {/* ── Produk ──────────────────────────────────────────────── */}
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
              Produk Pesanan
            </div>
            {/* Autocomplete search */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input value={produkSearch}
                onChange={e => { setProdukSearch(e.target.value); setShowProdukDropdown(true); }}
                onFocus={() => produkSearch && setShowProdukDropdown(true)}
                placeholder="Cari SKU atau nama produk untuk ditambahkan..."
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              {showProdukDropdown && filteredProduk.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '200px', overflowY: 'auto'
                }}>
                  {filteredProduk.map((p, i) => (
                    <div key={i} onClick={() => addItem(p)}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      <span style={{ fontWeight: '700', color: '#1e293b' }}>{p.kode_sku}</span>
                      <span style={{ color: '#64748b' }}> — {p.nama_produk}</span>
                      <span style={{ color: '#059669', fontWeight: '600', float: 'right' }}>{formatRupiah(p.harga_jual)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Item list */}
            {form.items.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>SKU & PRODUK</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', width: '60px', textAlign: 'center' }}>QTY</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', width: '100px', textAlign: 'right' }}>HARGA</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', width: '80px', textAlign: 'right' }}>SUBTOTAL</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: '600' }}>{it.sku || '-'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{it.nama_produk}</div>
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <input type="number" value={it.qty} min={1}
                          onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                          style={{ width: '50px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px', fontSize: '12px' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                        <input type="number" value={it.harga_satuan}
                          onChange={e => updateItem(idx, 'harga_satuan', Number(e.target.value))}
                          style={{ width: '90px', textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px', fontSize: '12px' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600' }}>
                        {formatRupiah(it.harga_satuan * it.qty)}
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <button onClick={() => removeItem(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── Keuangan ────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Diskon</label>
                <input type="number" value={form.diskon} onChange={e => setForm({...form, diskon: Number(e.target.value)})}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Ongkir</label>
                <input type="number" value={form.ongkir} onChange={e => setForm({...form, ongkir: Number(e.target.value)})}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Metode Bayar</label>
                <select value={form.metode_pembayaran} onChange={e => setForm({...form, metode_pembayaran: e.target.value})}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  {BAYAR_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px', display: 'block' }}>Status Bayar</label>
                <select value={form.status_pembayaran} onChange={e => setForm({...form, status_pembayaran: e.target.value})}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <option value="belum_bayar">Belum Bayar</option>
                  <option value="dp">DP</option>
                  <option value="lunas">Lunas</option>
                </select>
              </div>
            </div>

            {/* ── Pengiriman & Catatan ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <input value={form.kurir} onChange={e => setForm({...form, kurir: e.target.value})} placeholder="Kurir (JNE, J&T, dll)"
                style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <input value={form.jenis_layanan} onChange={e => setForm({...form, jenis_layanan: e.target.value})} placeholder="Layanan (REG, YES, dll)"
                style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <input type="date" value={form.batas_kirim} onChange={e => setForm({...form, batas_kirim: e.target.value})} title="Batas Kirim"
                style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <textarea value={form.catatan} onChange={e => setForm({...form, catatan: e.target.value})}
                placeholder="Catatan pesanan..." rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', fontSize: '12px', resize: 'vertical' }} />
            </div>

            {/* ── Total & Submit ───────────────────────────────────────── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px', borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Subtotal: {formatRupiah(subtotal)} | Diskon: {formatRupiah(form.diskon)} | Ongkir: {formatRupiah(form.ongkir)}</div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>{formatRupiah(totalHarga)}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                Batal
              </button>
              <button type="button" onClick={() => handleSubmit(true)}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid #94a3b8', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>
                Simpan Draft
              </button>
              <button type="button" onClick={() => handleSubmit(false)}
                style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                Konfirmasi Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DETAIL PESANAN                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {detailOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '14px', width: '620px', maxWidth: '95vw',
            maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', padding: '24px 28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  Detail Pesanan — {detailOrder.no_pesanan}
                </h2>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {getStatusBadge(detailOrder.status_pesanan)}
                  {getSaluranBadge(detailOrder.saluran)}
                </div>
              </div>
              <button onClick={() => setDetailOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>

            {/* Info sections */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Pembeli</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{detailOrder.nama_pembeli}</div>
                {detailOrder.no_telepon && <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {detailOrder.no_telepon}</div>}
                {detailOrder.alamat_pengiriman && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>📍 {detailOrder.alamat_pengiriman}</div>}
                {(detailOrder.kota || detailOrder.provinsi) && <div style={{ fontSize: '12px', color: '#64748b' }}>{[detailOrder.kota, detailOrder.provinsi, detailOrder.kode_pos].filter(Boolean).join(', ')}</div>}
              </div>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Pengiriman & Bayar</div>
                {detailOrder.nama_toko && <div style={{ fontSize: '12px', color: '#334155' }}>🏪 {detailOrder.nama_toko}</div>}
                <div style={{ fontSize: '12px', color: '#334155' }}>📦 {detailOrder.kurir || '-'} {detailOrder.jenis_layanan || ''}</div>
                <div style={{ fontSize: '12px', color: detailOrder.no_resi ? '#2563eb' : '#94a3b8', fontWeight: detailOrder.no_resi ? '600' : '400' }}>
                  Resi: {detailOrder.no_resi || 'Belum ada'}
                </div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                  💰 {BAYAR_OPTIONS.find(b => b.value === detailOrder.metode_pembayaran)?.label || detailOrder.metode_pembayaran} — {detailOrder.status_pembayaran === 'lunas' ? '✅ Lunas' : detailOrder.status_pembayaran === 'dp' ? `DP ${formatRupiah(detailOrder.nominal_dp)}` : '⏳ Belum bayar'}
                </div>
                {detailOrder.no_spk && <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600', marginTop: '2px' }}>🔧 SPK: {detailOrder.no_spk}</div>}
              </div>
            </div>

            {detailOrder.is_dropship === 1 && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', marginBottom: '16px', fontSize: '12px' }}>
                <span style={{ fontWeight: '700', color: '#7c3aed' }}>Dropship:</span> Nama di label: <strong>{detailOrder.nama_pengirim_ds || '-'}</strong> | Telp: {detailOrder.no_telp_pengirim_ds || '-'}
              </div>
            )}

            {/* Items table */}
            {detailOrder.items && detailOrder.items.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b' }}>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>SKU & PRODUK</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>QTY</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>HARGA</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {detailOrder.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: '600' }}>{it.sku || '-'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{it.nama_produk}{it.varian ? ` (${it.varian})` : ''}</div>
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{it.qty}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{formatRupiah(it.harga_satuan)}</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600' }}>{formatRupiah(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Totals */}
            <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>Subtotal</span><span>{formatRupiah(detailOrder.subtotal)}</span>
              </div>
              {Number(detailOrder.diskon) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ef4444' }}>
                <span>Diskon</span><span>-{formatRupiah(detailOrder.diskon)}</span>
              </div>}
              {Number(detailOrder.ongkir) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>Ongkir</span><span>+{formatRupiah(detailOrder.ongkir)}</span>
              </div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: '#059669', borderTop: '1px solid #bbf7d0', paddingTop: '6px', marginTop: '6px' }}>
                <span>Total</span><span>{formatRupiah(detailOrder.total_harga)}</span>
              </div>
            </div>

            {detailOrder.catatan && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e', marginBottom: '16px' }}>
                <strong>Catatan:</strong> {detailOrder.catatan}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setDetailOrder(null)}
                style={{ padding: '8px 24px', borderRadius: '7px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#475569', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
