import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  RotateCw, 
  CheckCircle2, 
  Eye, 
  X, 
  Layers, 
  Truck, 
  Calendar, 
  Package, 
  Printer, 
  ChevronRight,
  ChevronDown,
  Info,
  FileText,
  TrendingUp,
  ExternalLink,
  Filter,
  Send,
  QrCode,
  XCircle,
  Save,
  User,
  Clock
} from 'lucide-react';
import { toastSuccess, toastError } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

function formatRupiah(val) {
  return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
}

export default function PesananMasukDesktopView({ onNavigate }) {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Historical Pull Modal
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [historicalDays, setHistoricalDays] = useState(30);
  const [isHistoricalSyncing, setIsHistoricalSyncing] = useState(false);
  const [historicalProgress, setHistoricalProgress] = useState('');

  // Filter & Sort States
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [activeFilterTab, setActiveFilterTab] = useState('semua');
  const [subFilterSiapKirim, setSubFilterSiapKirim] = useState('semua'); // 'semua' | 'belum_diproses' | 'diproses'
  const [sortByDate, setSortByDate] = useState('desc'); // 'desc' (Terbaru) | 'asc' (Terlama)

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(25);

  // Selection & Modal State
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailOrder, setDetailOrder] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // ── Scan Kemasan & Verifikasi Packing Pesanan Online Marketplace ──
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanOrderInput, setScanOrderInput] = useState('');
  const [scanSkuInput, setScanSkuInput] = useState('');
  const [activeScanOrder, setActiveScanOrder] = useState(null);
  const [scanItems, setScanItems] = useState([]);
  const [scanKurir, setScanKurir] = useState('');
  const [scanResi, setScanResi] = useState('');
  const [scanPic, setScanPic] = useState('Staff Packing');
  const [scanCatatan, setScanCatatan] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success'|'warning'|'error', text: string }
  const [isSavingPack, setIsSavingPack] = useState(false);
  const [isLookingUpScan, setIsLookingUpScan] = useState(false);

  const playScanBeep = (type = 'success') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 beep
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.11);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Error buzz
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // ignore audio error
    }
  };

  const applyActiveScanOrderData = (ord) => {
    setActiveScanOrder(ord);
    const itemsList = Array.isArray(ord.items) ? ord.items : [];
    setScanItems(
      itemsList.map((it, idx) => ({
        ...it,
        _idx: idx,
        qty: Number(it.qty || it.quantity || 1),
        qty_dikemas: Math.min(
          Number(it.qty || it.quantity || 1),
          Math.max(0, Number(it.qty_dikemas !== undefined ? it.qty_dikemas : (ord.status_kemas === 'sudah_dikemas' ? (it.qty || 1) : 0)))
        ),
      }))
    );
    setScanKurir(ord.kurir || '');
    setScanResi(ord.no_resi || '');
    setScanPic(ord.dikemas_oleh || 'Staff Packing');
    setScanCatatan(ord.catatan_kemas || '');
    setScanSkuInput('');
  };

  const handleOpenScanKemasan = async (orderOrId = null) => {
    setIsScanModalOpen(true);
    setScanFeedback(null);
    setScanOrderInput('');
    setScanSkuInput('');

    const targetCandidate =
      orderOrId ||
      orders.find(
        (o) =>
          !['CANCELLED', 'BATAL', 'DIBATALKAN'].includes(String(o.status || '').toUpperCase()) &&
          o.status_kemas !== 'sudah_dikemas'
      ) ||
      orders[0] ||
      null;

    if (targetCandidate) {
      const orderSn = typeof targetCandidate === 'object' ? (targetCandidate.no_pesanan || targetCandidate.id) : targetCandidate;
      try {
        setIsLookingUpScan(true);
        const res = await fetch('/api/marketplace/orders/scan-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: orderSn })
        });
        const json = await res.json();
        if (res.ok && json.data) {
          applyActiveScanOrderData(json.data);
          setScanFeedback({
            type: 'success',
            text: `Pesanan ${json.data.no_pesanan} (${json.data.nama_pembeli || json.data.customerName || '-'}) siap diverifikasi & dikemas.`
          });
        } else if (typeof targetCandidate === 'object') {
          applyActiveScanOrderData(targetCandidate);
        }
      } catch (err) {
        if (typeof targetCandidate === 'object') {
          applyActiveScanOrderData(targetCandidate);
        } else {
          toastError(err.message);
        }
      } finally {
        setIsLookingUpScan(false);
      }
    } else {
      setActiveScanOrder(null);
      setScanItems([]);
    }
  };

  const handleScanOrderLookup = async (e, manualKeyword = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const kw = (manualKeyword !== null ? manualKeyword : scanOrderInput).trim();
    if (!kw) {
      toastError('Scan atau ketik No. Pesanan / No. Resi terlebih dahulu.');
      return;
    }

    setIsLookingUpScan(true);
    try {
      const res = await fetch('/api/marketplace/orders/scan-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw })
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error' || !json.data) {
        playScanBeep('error');
        setScanFeedback({
          type: 'error',
          text: json.message || `Barcode "${kw}" tidak ditemukan di database pesanan marketplace.`
        });
        return;
      }

      playScanBeep('success');
      applyActiveScanOrderData(json.data);
      setScanOrderInput('');
      setScanFeedback({
        type: 'success',
        text: `Berhasil memuat pesanan ${json.data.no_pesanan} — ${json.data.nama_pembeli || json.data.customerName || '-'} (${(json.data.items || []).length} item produk). Silakan scan barcode SKU produk!`
      });
    } catch (err) {
      playScanBeep('error');
      toastError(err.message);
    } finally {
      setIsLookingUpScan(false);
    }
  };

  const handleScanSkuSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeScanOrder) {
      playScanBeep('error');
      setScanFeedback({
        type: 'error',
        text: 'Belum ada pesanan aktif. Scan nomor pesanan terlebih dahulu!'
      });
      return;
    }

    const code = scanSkuInput.trim();
    if (!code) return;
    const upper = code.toUpperCase();

    // 1. Cari exact match SKU / Varian / Barcode / Nama Produk yang belum full
    let matchIdx = scanItems.findIndex(
      (it) =>
        (String(it.sku || '').toUpperCase() === upper ||
         String(it.kode_sku || '').toUpperCase() === upper ||
         String(it.sku_marketplace || '').toUpperCase() === upper ||
         String(it.nama_produk || '').toUpperCase() === upper) &&
        Number(it.qty_dikemas || 0) < Number(it.qty || 0)
    );

    // 2. Jika tidak ada, coba partial match SKU
    if (matchIdx === -1) {
      matchIdx = scanItems.findIndex(
        (it) =>
          (String(it.sku || '').toUpperCase().includes(upper) ||
           String(it.kode_sku || '').toUpperCase().includes(upper) ||
           String(it.nama_produk || '').toUpperCase().includes(upper)) &&
          Number(it.qty_dikemas || 0) < Number(it.qty || 0)
      );
    }

    // 3. Cek over-scan
    if (matchIdx === -1) {
      const alreadyFullIdx = scanItems.findIndex(
        (it) =>
          String(it.sku || '').toUpperCase() === upper ||
          String(it.sku || '').toUpperCase().includes(upper) ||
          String(it.nama_produk || '').toUpperCase().includes(upper)
      );
      if (alreadyFullIdx !== -1) {
        const fullItem = scanItems[alreadyFullIdx];
        playScanBeep('error');
        setScanFeedback({
          type: 'warning',
          text: `PERINGATAN OVER-SCAN: Produk "${fullItem.nama_produk}" (${fullItem.sku || '-'}) sudah lengkap ter-scan (${fullItem.qty_dikemas}/${fullItem.qty} pcs)!`
        });
        setScanSkuInput('');
        return;
      }

      playScanBeep('error');
      setScanFeedback({
        type: 'error',
        text: `SKU TIDAK COCOK! Barcode "${code}" tidak ada dalam daftar produk pesanan ${activeScanOrder.no_pesanan}.`
      });
      setScanSkuInput('');
      return;
    }

    // Increment qty_dikemas + 1
    playScanBeep('success');
    const targetItem = scanItems[matchIdx];
    const nextQty = Math.min(
      Number(targetItem.qty || 0),
      Number(targetItem.qty_dikemas || 0) + 1
    );

    setScanItems((prev) =>
      prev.map((it, idx) =>
        idx === matchIdx ? { ...it, qty_dikemas: nextQty } : it
      )
    );
    setScanFeedback({
      type: 'success',
      text: `SCAN SKU OK: ${targetItem.sku || 'TANPA-SKU'} — ${targetItem.nama_produk} (${nextQty}/${targetItem.qty} pcs)`
    });
    setScanSkuInput('');
  };

  const handleAdjustScanItemQty = (idx, nextVal) => {
    setScanItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const clamped = Math.max(
          0,
          Math.min(Number(it.qty || 0), Number(nextVal || 0))
        );
        return { ...it, qty_dikemas: clamped };
      })
    );
  };

  const handleCheckAllScanItems = () => {
    if (!scanItems.length) return;
    playScanBeep('success');
    setScanItems((prev) =>
      prev.map((it) => ({ ...it, qty_dikemas: Number(it.qty || 0) }))
    );
    setScanFeedback({
      type: 'success',
      text: `Semua produk (${scanItems.length} item) ditandai lengkap terverifikasi & siap dikemas.`
    });
  };

  const handleResetScanItems = () => {
    setScanItems((prev) => prev.map((it) => ({ ...it, qty_dikemas: 0 })));
    setScanFeedback({
      type: 'warning',
      text: 'Hitungan scan item di-reset ke 0.'
    });
  };

  const handleSaveScanKemasan = async (targetStatusKemas = 'sudah_dikemas') => {
    if (!activeScanOrder) return;

    const totalOrdered = scanItems.reduce((sum, it) => sum + Number(it.qty || 0), 0);
    const totalPacked = scanItems.reduce((sum, it) => sum + Number(it.qty_dikemas || 0), 0);

    if (targetStatusKemas === 'sudah_dikemas' && totalPacked < totalOrdered) {
      if (!window.confirm(`Baru ter-scan ${totalPacked} dari ${totalOrdered} pcs produk. Apakah Anda yakin tetap menyelesaikan kemasan ini?`)) {
        return;
      }
    }

    setIsSavingPack(true);
    try {
      const payload = {
        id: activeScanOrder.id,
        no_pesanan: activeScanOrder.no_pesanan,
        items: scanItems,
        status_kemas: targetStatusKemas === 'tetap' ? (totalPacked >= totalOrdered ? 'sudah_dikemas' : totalPacked > 0 ? 'sedang_dikemas' : 'belum_dikemas') : targetStatusKemas,
        dikemas_oleh: scanPic || 'Staff Packing',
        catatan_kemas: scanCatatan || '',
        kurir: scanKurir || activeScanOrder.kurir,
        no_resi: scanResi || activeScanOrder.no_resi
      };

      const res = await fetch('/api/marketplace/orders/save-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || 'Gagal menyimpan status kemasan');
      }

      toastSuccess(json.message || 'Kemasan pesanan berhasil disimpan!');
      playScanBeep('success');

      // Update state orders lokal
      setOrders((prev) =>
        prev.map((o) =>
          o.id === activeScanOrder.id || o.no_pesanan === activeScanOrder.no_pesanan
            ? {
                ...o,
                status_kemas: payload.status_kemas,
                dikemas_oleh: payload.dikemas_oleh,
                catatan_kemas: payload.catatan_kemas,
                items: scanItems,
                status: payload.status_kemas === 'sudah_dikemas' && o.status === 'Perlu Diproses' ? 'Siap Kirim' : o.status
              }
            : o
        )
      );

      // Jika sudah selesai dikemas, cari antrean pesanan berikutnya otomatis
      if (targetStatusKemas === 'sudah_dikemas') {
        const remainingQueue = orders.filter(
          (o) =>
            o.id !== activeScanOrder.id &&
            !['CANCELLED', 'BATAL', 'DIBATALKAN'].includes(String(o.status || '').toUpperCase()) &&
            o.status_kemas !== 'sudah_dikemas'
        );
        if (remainingQueue.length > 0) {
          handleOpenScanKemasan(remainingQueue[0]);
        } else {
          setScanFeedback({
            type: 'success',
            text: `Pesanan ${activeScanOrder.no_pesanan} selesai dikemas! Semua pesanan dalam daftar telah selesai dipacking.`
          });
        }
      }
    } catch (err) {
      toastError(err.message);
    } finally {
      setIsSavingPack(false);
    }
  };

  // Helper Cetak Resi / Label Pengiriman Langsung dari Marketplace Resmi (PDF Asli)
  const handlePrintResi = (ord) => {
    if (!ord) return;
    const channel = String(ord.saluran || ord.channel || 'shopee').toLowerCase();
    const orderSn = ord.no_pesanan || ord.id;
    
    // 1. Jika ada ID order Laravel (ERP Aspartech), buka langsung URL PDF resi asli seperti di screenshot
    const targetId = ord.laravel_order_id || (typeof ord.id === 'number' || /^\d+$/.test(String(ord.id)) ? ord.id : null);
    if (targetId) {
      window.open(`https://erp.aspartech.com/orders/${targetId}/print`, '_blank');
      return;
    }

    // 2. Buka endpoint backend yang mengunduh dan menyajikan streaming PDF resmi langsung dari API marketplace
    const printUrl = `/api/marketplace/orders/print-label?order_sn=${encodeURIComponent(orderSn)}&channel=${encodeURIComponent(channel)}`;
    window.open(printUrl, '_blank');
  };

  // Helper Cetak Resi Masal (Batch Print) Langsung dari API Marketplace Resmi (PDF Asli)
  const handlePrintResiMasal = () => {
    if (!selectedIds || selectedIds.length === 0) {
      toastError('Pilih minimal 1 pesanan untuk dicetak resinya');
      return;
    }

    // Ambil order terpilih
    const targetOrders = orders.filter(o => selectedIds.includes(o.id));
    if (targetOrders.length === 0) {
      toastError('Pesanan yang dipilih tidak ditemukan');
      return;
    }

    // Kumpulkan no_pesanan / order_sn
    const orderSns = targetOrders.map(o => o.no_pesanan || o.id).filter(Boolean);
    if (orderSns.length === 0) {
      toastError('Nomor pesanan tidak valid');
      return;
    }

    // Buka endpoint batch print resmi dari API marketplace
    const batchUrl = `/api/marketplace/orders/batch-print-label?order_sns=${encodeURIComponent(orderSns.join(','))}`;
    window.open(batchUrl, '_blank');
  };

  // Helper Cetak Invoice Pesanan
  const handlePrintInvoice = () => {
    if (!detailOrder) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const items = detailOrder.items || [];
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${detailOrder.no_pesanan}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 18px; font-weight: 800; color: #0284c7; }
          .meta { font-size: 11px; color: #64748b; line-height: 1.5; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
          .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
          .card-title { font-weight: 800; font-size: 11px; color: #475569; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f8fafc; text-align: left; padding: 8px; font-size: 11px; border-bottom: 1px solid #cbd5e1; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-box { display: flex; justify-content: flex-end; }
          .total-table { width: 320px; }
          .total-table td { padding: 4px 8px; border: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">INVOICE PESANAN MARKETPLACE</div>
            <div class="meta">No. Pesanan: <b>${detailOrder.no_pesanan}</b></div>
            <div class="meta">Toko: ${detailOrder.shopName || '-'} (${String(detailOrder.channel || 'SHOPEE').toUpperCase()})</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 14px;">${detailOrder.company_code || 'RSG'}</div>
            <div class="meta">Tanggal: ${detailOrder.orderTime || detailOrder.syncedAt || '-'}</div>
            <div class="meta">Resi: ${detailOrder.no_resi || '-'} (${detailOrder.kurir || 'SPX'})</div>
          </div>
        </div>
        <div class="grid">
          <div class="card">
            <div class="card-title">TUJUAN PENGIRIMAN</div>
            <div><b>${detailOrder.customerName || 'Pelanggan'}</b></div>
            <div style="color: #64748b;">${detailOrder.telepon || '*******13'}</div>
            <div style="margin-top: 4px; font-size: 11px;">${detailOrder.alamat || '******m, KAB. BINTAN, BINTAN TIMUR, KEPULAUAN RIAU, ID, 29151'}</div>
          </div>
          <div class="card">
            <div class="card-title">STATUS & PEMBAYARAN</div>
            <div>Metode: <b>${detailOrder.metode_bayar || 'Cash on Delivery'}</b></div>
            <div>Kurir: <b>${detailOrder.kurir || 'SPX Hemat'}</b></div>
            <div>Status: <b>${String(detailOrder.status || 'SHIPPED').toUpperCase()}</b></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;" class="text-center">NO</th>
              <th>PRODUK & SKU</th>
              <th>VARIAN</th>
              <th class="text-center" style="width: 50px;">QTY</th>
              <th class="text-right" style="width: 100px;">HARGA</th>
              <th class="text-right" style="width: 110px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><b>${it.nama_produk}</b><br><span style="font-size: 10px; color: #64748b;">SKU: ${it.sku || '-'}</span></td>
                <td>${it.varian || '-'}</td>
                <td class="text-center">${it.qty || 1}</td>
                <td class="text-right">${formatRupiah(it.harga || 0)}</td>
                <td class="text-right"><b>${formatRupiah((it.qty || 1) * (it.harga || 0))}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-box">
          <table class="total-table">
            <tr>
              <td>Total Pesanan:</td>
              <td class="text-right"><b>${formatRupiah(detailOrder.totalPrice)}</b></td>
            </tr>
          </table>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Listen to company change
  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  // Fetch orders from MySQL
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/marketplace/orders');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          setOrders(json.data);
          setIsLoading(false);
          return;
        }
      }
      setOrders([]);
    } catch (e) {
      console.warn('Gagal memuat pesanan:', e.message);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const handleOrdersUpdated = () => loadOrders();
    window.addEventListener('ordersUpdated', handleOrdersUpdated);
    return () => window.removeEventListener('ordersUpdated', handleOrdersUpdated);
  }, []);

  // Lock body scroll saat modal detail terbuka agar halaman index tidak ikut ter-scroll
  useEffect(() => {
    if (detailOrder) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [detailOrder]);

  // Tarik semua pesanan dari seluruh toko aktif (Shopee & TikTok)
  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncMessage('Menghubungkan ke Shopee & TikTok Shop API...');
    try {
      const res = await fetch('/api/marketplace/orders/sync-all', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toastSuccess(`Berhasil menarik ${json.totalSynced || 0} pesanan baru dari marketplace!`);
        await loadOrders();
      } else {
        throw new Error(json.message || 'Gagal sinkronisasi pesanan');
      }
    } catch (err) {
      toastError(`Gagal tarik pesanan: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  // Tarik Pesanan Historical — rentang hari yang bisa dikonfigurasi
  const handleSyncHistorical = async () => {
    setIsHistoricalSyncing(true);
    setHistoricalProgress(`Menghubungkan ke Shopee & TikTok API untuk menarik pesanan ${historicalDays} hari terakhir...`);
    try {
      const res = await fetch('/api/marketplace/orders/sync-historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: historicalDays })
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        const detail = (json.results || []).map(r => r.error ? `${r.store}: Gagal (${r.error})` : `${r.store}: ${r.count} pesanan`).join(' · ');
        toastSuccess(`Berhasil menarik ${json.totalSynced || 0} pesanan dari ${json.days} hari terakhir! ${detail}`);
        setShowHistoricalModal(false);
        await loadOrders();
      } else {
        throw new Error(json.message || 'Gagal tarik pesanan historical');
      }
    } catch (err) {
      toastError(`Gagal: ${err.message}`);
    } finally {
      setIsHistoricalSyncing(false);
      setHistoricalProgress('');
    }
  };

  // Filter Company List
  const companyOrders = orders.filter(o => 
    !o.company_code || o.company_code === activeCompany.code
  );

  // Helper cek apakah pesanan tergolong fase Siap Dikirim
  const isStatusSiapKirim = (status) => {
    const s = String(status || '').toUpperCase();
    return ['READY_TO_SHIP', 'TO_SHIP', 'PROCESSED', 'SIAP DIKIRIM', 'PERLU DIPROSES', 'AWAITING_SHIPMENT', 'AWAITING_COLLECTION'].includes(s);
  };

  // Helper cek apakah pesanan sudah diproses (sudah terbit resi / status PROCESSED / AWAITING_COLLECTION)
  const isOrderDiproses = (ord) => {
    const hasResi = Boolean(ord.no_resi && String(ord.no_resi).trim() !== '' && String(ord.no_resi).toLowerCase() !== 'belum ada resi');
    const rawStatus = String(ord.status || '').toUpperCase();
    return hasResi || rawStatus === 'PROCESSED' || rawStatus === 'AWAITING_COLLECTION';
  };

  // Summary Counts
  const totalOrders = companyOrders.length;
  const countPerluKirim = companyOrders.filter(o => isStatusSiapKirim(o.status)).length;
  const countDiproses = companyOrders.filter(o => isStatusSiapKirim(o.status) && isOrderDiproses(o)).length;
  const countBelumDiproses = companyOrders.filter(o => isStatusSiapKirim(o.status) && !isOrderDiproses(o)).length;

  const countKirim = companyOrders.filter(o => {
    const s = String(o.status || '').toUpperCase();
    return s === 'TO_CONFIRM_RECEIVE' || s === 'SHIPPED' || s === 'DIKIRIM';
  }).length;
  const countSelesai = companyOrders.filter(o => {
    const s = String(o.status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'SELESAI';
  }).length;
  const countTikTok = companyOrders.filter(o => o.channel === 'tiktok').length;
  const countShopee = companyOrders.filter(o => o.channel === 'shopee').length;

  // Filtered List
  const filteredOrders = companyOrders.filter(ord => {
    const s = String(ord.status || '').toUpperCase();

    // 1. Tab filter
    if (activeFilterTab === 'siap_kirim') {
      if (!isStatusSiapKirim(ord.status)) return false;
      if (subFilterSiapKirim === 'belum_diproses' && isOrderDiproses(ord)) return false;
      if (subFilterSiapKirim === 'diproses' && !isOrderDiproses(ord)) return false;
    }
    if (activeFilterTab === 'dikirim') {
      const isKirim = s === 'TO_CONFIRM_RECEIVE' || s === 'SHIPPED' || s === 'DIKIRIM';
      if (!isKirim) return false;
    }
    if (activeFilterTab === 'selesai') {
      const isSelesai = s === 'COMPLETED' || s === 'SELESAI';
      if (!isSelesai) return false;
    }
    if (activeFilterTab === 'tiktok' && ord.channel !== 'tiktok') return false;
    if (activeFilterTab === 'shopee' && ord.channel !== 'shopee') return false;

    // 2. Dropdown filters
    if (filterChannel !== 'Semua' && ord.channel !== filterChannel) return false;
    if (filterStatus !== 'Semua') {
      const target = filterStatus.toUpperCase();
      if (target === 'SIAP DIKIRIM' && !isStatusSiapKirim(s)) return false;
      if (target === 'DALAM PENGIRIMAN' && s !== 'TO_CONFIRM_RECEIVE' && s !== 'SHIPPED' && s !== 'DIKIRIM') return false;
      if (target === 'SELESAI' && s !== 'COMPLETED' && s !== 'SELESAI') return false;
      if (target === 'DIBATALKAN' && s !== 'CANCELLED' && s !== 'DIBATALKAN') return false;
    }

    // 3. Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNo = (ord.no_pesanan || '').toLowerCase().includes(q);
      const matchBuyer = (ord.customerName || '').toLowerCase().includes(q);
      const matchShop = (ord.shopName || '').toLowerCase().includes(q);
      const matchResi = (ord.no_resi || '').toLowerCase().includes(q);
      const matchItems = (ord.items || []).some(it => 
        (it.nama_produk || '').toLowerCase().includes(q) ||
        (it.sku || '').toLowerCase().includes(q) ||
        (it.varian || '').toLowerCase().includes(q)
      );
      return matchNo || matchBuyer || matchShop || matchResi || matchItems;
    }

    return true;
  });

  // Helper parsing timestamp pesanan untuk pengurutan tanggal yang presisi
  const getOrderTimestamp = (ord) => {
    if (ord.rawOrderTime) {
      const t = new Date(ord.rawOrderTime).getTime();
      if (!isNaN(t)) return t;
    }
    if (ord.orderTime) {
      // Format orderTime: 'DD/MM/YYYY HH:mm'
      const parts = String(ord.orderTime).split(' ');
      if (parts.length >= 2) {
        const dateParts = parts[0].split('/').map(Number);
        const timeParts = parts[1].split(':').map(Number);
        if (dateParts.length === 3) {
          const dt = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0] || 0, timeParts[1] || 0);
          if (!isNaN(dt.getTime())) return dt.getTime();
        }
      }
    }
    return 0;
  };

  // Urutkan pesanan masuk berdasarkan tanggal (default: terbaru -> terlama)
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const timeA = getOrderTimestamp(a);
    const timeB = getOrderTimestamp(b);
    if (sortByDate === 'asc') {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedOrders.length / entriesPerPage) || 1;
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const changeTab = (tab) => {
    setActiveFilterTab(tab);
    if (tab === 'siap_kirim') {
      setSubFilterSiapKirim('semua');
    }
    setCurrentPage(1);
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedOrders.map(o => o.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', padding: '8px 16px', boxSizing: 'border-box' }}>
      
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
        marginBottom: '8px',
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
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(56, 189, 248, 0.2)'
          }}>
            <ShoppingBag size={21} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Pesanan Masuk Marketplace
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '1.5px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(56, 189, 248, 0.18)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)'
              }}>
                {activeCompany.code}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
              Daftar seluruh transaksi pesanan pembeli langsung dari marketplace Shopee dan TikTok Shop.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Tarik Pesanan Historical */}
          <button
            type="button"
            id="btn-tarik-pesanan-historical"
            onClick={() => setShowHistoricalModal(true)}
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              backgroundColor: 'rgba(251, 191, 36, 0.12)',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.12)'; }}
            title="Tarik pesanan dari rentang tanggal yang lebih panjang (hingga 150 hari)"
          >
            <Calendar size={13} />
            <span>Tarik Pesanan Historical</span>
          </button>

          {/* Tombol Scan Kemasan Online */}
          <button
            type="button"
            id="btn-scan-kemasan-online"
            onClick={() => handleOpenScanKemasan()}
            style={{
              padding: '7px 14px',
              borderRadius: '7px',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              backgroundColor: 'rgba(16, 185, 129, 0.18)',
              color: '#34d399',
              fontSize: '12px',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.32)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.18)'; }}
            title="Buka Layar Scan Barcode Kemasan & Verifikasi Packing Pesanan Marketplace"
          >
            <Package size={14} />
            <span>Scan Kemasan</span>
          </button>

          {/* Shortcut: Penjualan Offline */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('penjualan_offline')}
              style={{
                padding: '7px 14px',
                borderRadius: '7px',
                border: '1px solid rgba(37, 211, 102, 0.5)',
                backgroundColor: 'rgba(37, 211, 102, 0.12)',
                color: '#25d366',
                fontSize: '12px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 211, 102, 0.22)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(37, 211, 102, 0.12)'; }}
              title="Buka modul Penjualan Offline (WhatsApp, Dropship, Reseller, Walk-in)"
            >
              <Send size={13} />
              <span>Penjualan Offline</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
        
        {/* Tab Semua */}
        <button
          onClick={() => changeTab('semua')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'semua' ? '1px solid #0284c7' : '1px solid #cbd5e1',
            backgroundColor: activeFilterTab === 'semua' ? '#0284c7' : '#ffffff',
            color: activeFilterTab === 'semua' ? '#ffffff' : '#334155',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeFilterTab === 'semua' ? '0 2px 4px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <Layers size={13} />
          <span>Semua Pesanan ({totalOrders})</span>
        </button>

        {/* Tab Siap Dikirim */}
        <button
          onClick={() => changeTab('siap_kirim')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'siap_kirim' ? '1px solid #2563eb' : '1px solid #bfdbfe',
            backgroundColor: activeFilterTab === 'siap_kirim' ? '#2563eb' : '#eff6ff',
            color: activeFilterTab === 'siap_kirim' ? '#ffffff' : '#1d4ed8',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <span>Siap Dikirim ({countPerluKirim})</span>
        </button>

        {/* Tab Dalam Pengiriman */}
        <button
          onClick={() => changeTab('dikirim')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'dikirim' ? '1px solid #7c3aed' : '1px solid #ddd6fe',
            backgroundColor: activeFilterTab === 'dikirim' ? '#7c3aed' : '#f5f3ff',
            color: activeFilterTab === 'dikirim' ? '#ffffff' : '#6d28d9',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <Truck size={13} />
          <span>Dalam Pengiriman ({countKirim})</span>
        </button>

        {/* Tab Selesai */}
        <button
          onClick={() => changeTab('selesai')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'selesai' ? '1px solid #059669' : '1px solid #bbf7d0',
            backgroundColor: activeFilterTab === 'selesai' ? '#059669' : '#f0fdf4',
            color: activeFilterTab === 'selesai' ? '#ffffff' : '#15803d',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <CheckCircle2 size={13} />
          <span>Selesai ({countSelesai})</span>
        </button>

        {/* Tab TikTok Shop */}
        <button
          onClick={() => changeTab('tiktok')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'tiktok' ? '1px solid #0f172a' : '1px solid #cbd5e1',
            backgroundColor: activeFilterTab === 'tiktok' ? '#0f172a' : '#f8fafc',
            color: activeFilterTab === 'tiktok' ? '#38bdf8' : '#334155',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00f2fe' }} />
          <span>TikTok Shop ({countTikTok})</span>
        </button>

        {/* Tab Shopee */}
        <button
          onClick={() => changeTab('shopee')}
          style={{
            height: '29px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 13px',
            borderRadius: '6px',
            border: activeFilterTab === 'shopee' ? '1px solid #ee4d2d' : '1px solid #ffccb8',
            backgroundColor: activeFilterTab === 'shopee' ? '#ee4d2d' : '#fff3ee',
            color: activeFilterTab === 'shopee' ? '#ffffff' : '#d03b1e',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ee4d2d' }} />
          <span>Shopee ({countShopee})</span>
        </button>
      </div>

      {/* SUB-TABS KHUSUS TAB SIAP DIKIRIM (SEMUA / BELUM DIPROSES / DIPROSES) */}
      {activeFilterTab === 'siap_kirim' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          padding: '6px 12px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe',
          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.08)',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} color="#2563eb" />
            Status Siap Kirim:
          </span>

          {/* Sub-tab: Semua */}
          <button
            type="button"
            onClick={() => { setSubFilterSiapKirim('semua'); setCurrentPage(1); }}
            style={{
              height: '24px',
              padding: '0 10px',
              borderRadius: '5px',
              border: subFilterSiapKirim === 'semua' ? '1px solid #2563eb' : '1px solid #cbd5e1',
              backgroundColor: subFilterSiapKirim === 'semua' ? '#2563eb' : '#f8fafc',
              color: subFilterSiapKirim === 'semua' ? '#ffffff' : '#475569',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Semua ({countPerluKirim})
          </button>

          {/* Sub-tab: Belum Diproses */}
          <button
            type="button"
            onClick={() => { setSubFilterSiapKirim('belum_diproses'); setCurrentPage(1); }}
            style={{
              height: '24px',
              padding: '0 10px',
              borderRadius: '5px',
              border: subFilterSiapKirim === 'belum_diproses' ? '1px solid #d97706' : '1px solid #fed7aa',
              backgroundColor: subFilterSiapKirim === 'belum_diproses' ? '#d97706' : '#fff7ed',
              color: subFilterSiapKirim === 'belum_diproses' ? '#ffffff' : '#c2410c',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Belum Diproses ({countBelumDiproses})
          </button>

          {/* Sub-tab: Diproses */}
          <button
            type="button"
            onClick={() => { setSubFilterSiapKirim('diproses'); setCurrentPage(1); }}
            style={{
              height: '24px',
              padding: '0 10px',
              borderRadius: '5px',
              border: subFilterSiapKirim === 'diproses' ? '1px solid #059669' : '1px solid #a7f3d0',
              backgroundColor: subFilterSiapKirim === 'diproses' ? '#059669' : '#f0fdf4',
              color: subFilterSiapKirim === 'diproses' ? '#ffffff' : '#047857',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Diproses ({countDiproses})
          </button>
        </div>
      )}

      {/* 3. FILTER CONTROLS BAR */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        padding: '8px 14px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Cari No Pesanan, Nama Pembeli, Toko, SKU, No Resi..."
            style={{
              width: '100%',
              padding: '6.5px 10px 6.5px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              outline: 'none',
              backgroundColor: '#f8fafc'
            }}
          />
        </div>

        {/* Select Saluran */}
        <select
          value={filterChannel}
          onChange={(e) => { setFilterChannel(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '6.5px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '130px'
          }}
        >
          <option value="Semua">Semua Saluran</option>
          <option value="shopee">Shopee</option>
          <option value="tiktok">TikTok Shop</option>
        </select>

        {/* Select Status */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          style={{
            padding: '6.5px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            minWidth: '150px'
          }}
        >
          <option value="Semua">Semua Status</option>
          <option value="Siap Dikirim">Siap Dikirim</option>
          <option value="Dalam Pengiriman">Dalam Pengiriman</option>
          <option value="Selesai">Selesai</option>
          <option value="Dibatalkan">Dibatalkan</option>
        </select>

        {/* Rows Per Page */}
        <select
          value={entriesPerPage}
          onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
          style={{
            padding: '6.5px 10px',
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
        </select>

        {/* Sort Tanggal */}
        <select
          value={sortByDate}
          onChange={(e) => { setSortByDate(e.target.value); setCurrentPage(1); }}
          title="Urutkan pesanan berdasarkan tanggal transaksi"
          style={{
            padding: '6.5px 10px',
            borderRadius: '6px',
            border: '1px solid #0284c7',
            fontSize: '12px',
            color: '#0369a1',
            fontWeight: '700',
            backgroundColor: '#f0f9ff',
            cursor: 'pointer',
            minWidth: '175px'
          }}
        >
          <option value="desc">Urutan: Tanggal Terbaru</option>
          <option value="asc">Urutan: Tanggal Terlama</option>
        </select>

        {/* Tombol Cetak Resi Masal dari Marketplace Asli */}
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handlePrintResiMasal}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.35)',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            title="Cetak resi resmi gabungan langsung dari API marketplace untuk pesanan yang dicentang"
          >
            <Printer size={14} />
            <span>Cetak Resi Masal ({selectedIds.length})</span>
          </button>
        )}

      </div>

      {/* 4. DATA TABLE PESANAN (STRUKTUR KOLOM PERSIS DENGAN PERMINTAAN USER) */}
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
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '38px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedIds.includes(o.id))}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>PRODUK & PESANAN</th>
                <th style={{ padding: '8px 12px', width: '180px', border: '1px solid #cbd5e1' }}>TOKO & CHANNEL</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', width: '120px', border: '1px solid #cbd5e1' }}>DIBAYAR</th>
                <th style={{ padding: '8px 12px', width: '180px', border: '1px solid #cbd5e1' }}>TANGGAL & BATAS KIRIM</th>
                <th style={{ padding: '8px 12px', width: '180px', border: '1px solid #cbd5e1' }}>JASA KIRIM & RESI</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '140px', border: '1px solid #cbd5e1' }}>STATUS</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', width: '125px', border: '1px solid #cbd5e1' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '36px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #cbd5e1' }}>
                    <ShoppingBag size={38} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#334155' }}>Belum ada pesanan yang sesuai filter</div>
                    <div style={{ fontSize: '11.5px', marginTop: '3px', color: '#64748b' }}>
                      Klik tombol <b>"Tarik Pesanan Shopee & TikTok"</b> di atas untuk menarik transaksi terbaru dari akun marketplace Anda.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => {
                  const isTikTok = ord.channel === 'tiktok';
                  const isShopee = ord.channel === 'shopee';
                  const items = ord.items || [];
                  const firstItem = items[0] || null;
                  const extraCount = items.length > 1 ? items.length - 1 : 0;
                  const isSelected = selectedIds.includes(ord.id);
                  const hasSPK = Boolean(ord.no_spk);

                  return (
                    <tr
                      key={ord.id}
                      style={{
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      {/* 1. CHECKBOX */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(ord.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* 2. PRODUK & PESANAN */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        {/* No Pesanan Link */}
                        <div style={{ marginBottom: '3px' }}>
                          <span 
                            onClick={() => setDetailOrder(ord)}
                            title="Klik untuk lihat rincian lengkap pesanan"
                            style={{ 
                              color: '#2563eb', 
                              fontWeight: '800', 
                              fontFamily: 'monospace', 
                              fontSize: '12.5px', 
                              cursor: 'pointer',
                              textDecoration: 'none'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {ord.no_pesanan}
                          </span>
                        </div>

                        {/* Badges: Ready & Belum SPK / Sudah SPK */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0'
                          }}>
                            <CheckCircle2 size={10} /> Ready
                          </span>

                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: hasSPK ? '#eff6ff' : '#f8fafc',
                            color: hasSPK ? '#1d4ed8' : '#64748b',
                            border: hasSPK ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', border: '1.5px solid currentColor' }} />
                            {hasSPK ? `SPK: ${ord.no_spk}` : 'Belum SPK'}
                          </span>
                        </div>

                        {/* Product summary preview */}
                        {firstItem ? (
                          <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.3' }}>
                            <div 
                              style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}
                              title={firstItem.nama_produk ? `Nama Produk: ${firstItem.nama_produk}` : ''}
                            >
                              {(firstItem.sku || firstItem.kode_sku || firstItem.sku_marketplace || firstItem.seller_sku || firstItem.model_sku || firstItem.item_sku || firstItem.varian || '-')} <span style={{ color: '#0284c7', fontWeight: '800', fontFamily: 'sans-serif' }}>x{firstItem.qty || 1}</span>
                            </div>
                            {extraCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setDetailOrder(ord)}
                                style={{
                                  marginTop: '2px',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: '#f1f5f9',
                                  border: '1px dashed #cbd5e1',
                                  color: '#0284c7',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <span>+{extraCount} SKU lainnya</span>
                                <ChevronRight size={9} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>1 Item Pesanan Marketplace</div>
                        )}
                      </td>

                      {/* 3. TOKO & CHANNEL */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '12px', marginBottom: '4px' }}>
                          {ord.shopName || '-'}
                        </div>
                        <div>
                          {isShopee ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '800',
                              backgroundColor: '#ee4d2d',
                              color: '#ffffff'
                            }}>
                              <ShoppingBag size={10} /> Shopee
                            </span>
                          ) : isTikTok ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '800',
                              backgroundColor: '#0f172a',
                              color: '#38bdf8',
                              border: '1px solid #334155'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00f2fe' }} /> TikTok Shop
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: '800',
                              backgroundColor: '#0284c7',
                              color: '#ffffff'
                            }}>
                              {ord.channel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. DIBAYAR */}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: '#0f172a', fontSize: '12.5px', fontFamily: 'monospace', border: '1px solid #cbd5e1' }}>
                        {formatRupiah(ord.totalPrice)}
                      </td>

                      {/* 5. TANGGAL & BATAS KIRIM */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#334155', fontWeight: '600' }}>
                          <Calendar size={12} color="#64748b" />
                          <span>{ord.orderTime || ord.syncedAt || '-'}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                          Batas: <b style={{ color: '#0f172a' }}>{ord.batasKirim || '-'}</b>
                        </div>
                      </td>

                      {/* 6. JASA KIRIM & RESI */}
                      <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: '700', color: '#0f172a' }}>
                          <Truck size={12} color="#64748b" />
                          <span>{ord.kurir || 'SPX Hemat'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#0f172a', fontWeight: '700', marginTop: '3px' }}>
                          <Package size={11} color="#0284c7" />
                          <code style={{ color: ord.no_resi ? '#0f172a' : '#94a3b8' }}>{ord.no_resi || 'Belum Ada Resi'}</code>
                        </div>
                      </td>

                      {/* 7. STATUS */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {(() => {
                          const statusRaw = String(ord.status || 'READY_TO_SHIP').toUpperCase();
                          const isSiap = isStatusSiapKirim(statusRaw);
                          const isSudahKirim = ['SHIPPED', 'IN_TRANSIT', 'TO_RECEIVE', 'DIKIRIM', 'TO_CONFIRM_RECEIVE'].includes(statusRaw);
                          const isSelesai = ['COMPLETED', 'FINISHED', 'SELESAI', 'DELIVERED'].includes(statusRaw);
                          const isBatal = ['CANCELLED', 'BATAL', 'IN_CANCEL', 'DIBATALKAN'].includes(statusRaw);

                          // Style badge status utama
                          let statusBg = '#fafafa';
                          let statusColor = '#595959';
                          let statusBorder = '#d9d9d9';
                          let statusLabel = statusRaw.replace(/_/g, ' ');

                          if (isSiap) {
                            statusBg = '#fff2e8';
                            statusColor = '#d4380d';
                            statusBorder = '#ffbb96';
                            statusLabel = 'SIAP DIKIRIM';
                          } else if (isSudahKirim) {
                            statusBg = '#e6f4ff';
                            statusColor = '#096dd9';
                            statusBorder = '#91caff';
                            statusLabel = 'DALAM PENGIRIMAN';
                          } else if (isSelesai) {
                            statusBg = '#f6ffed';
                            statusColor = '#389e0d';
                            statusBorder = '#b7eb8f';
                            statusLabel = 'SELESAI';
                          } else if (isBatal) {
                            statusBg = '#fff1f0';
                            statusColor = '#cf1322';
                            statusBorder = '#ffa39e';
                            statusLabel = 'DIBATALKAN';
                          }

                          // Status Cetak: hanya 'Sudah Print' jika memang sudah dicetak
                          const isPrinted = ord.status_cetak === 'Sudah Print';
                          const isProcessed = isOrderDiproses(ord);

                          return (
                            <>
                              {/* Main Status Badge (Seragam SIAP DIKIRIM untuk Shopee & TikTok) */}
                              <div style={{ marginBottom: '3px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 9px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: '800',
                                  backgroundColor: statusBg,
                                  color: statusColor,
                                  border: `1px solid ${statusBorder}`,
                                  letterSpacing: '0.02em',
                                  textTransform: 'uppercase'
                                }}>
                                  {statusLabel}
                                </span>
                              </div>

                              {/* Sub-tag Status Proses (Khusus jika Siap Dikirim: Diproses vs Belum Diproses) */}
                              {isSiap && (
                                <div style={{ marginBottom: '3px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontSize: '9.5px',
                                    fontWeight: '800',
                                    backgroundColor: isProcessed ? '#ecfdf5' : '#fff7ed',
                                    color: isProcessed ? '#047857' : '#c2410c',
                                    border: isProcessed ? '1px solid #a7f3d0' : '1px solid #fed7aa'
                                  }}>
                                    {isProcessed ? 'Diproses' : 'Belum Diproses'}
                                  </span>
                                </div>
                              )}

                              {/* Print Badge */}
                              <div style={{ marginBottom: '2px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  backgroundColor: isPrinted ? '#f0fdf4' : '#fafafa',
                                  color: isPrinted ? '#15803d' : '#888888',
                                  border: isPrinted ? '1px solid #bbf7d0' : '1px solid #dddddd'
                                }}>
                                  <Printer size={10} /> {isPrinted ? 'Sudah Print' : 'Belum Print'}
                                </span>
                              </div>

                              {/* Status Kemasan Badge */}
                              <div>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '9.5px',
                                  fontWeight: '800',
                                  backgroundColor: ord.status_kemas === 'sudah_dikemas' ? '#ecfdf5' : ord.status_kemas === 'sedang_dikemas' ? '#fef3c7' : '#f8fafc',
                                  color: ord.status_kemas === 'sudah_dikemas' ? '#047857' : ord.status_kemas === 'sedang_dikemas' ? '#b45309' : '#64748b',
                                  border: `1px solid ${ord.status_kemas === 'sudah_dikemas' ? '#a7f3d0' : ord.status_kemas === 'sedang_dikemas' ? '#fde68a' : '#cbd5e1'}`
                                }}>
                                  <Package size={9} /> {ord.status_kemas === 'sudah_dikemas' ? 'Terkemas ✓' : ord.status_kemas === 'sedang_dikemas' ? 'Sedang Dikemas' : 'Belum Dikemas'}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </td>

                      {/* 8. AKSI */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {(() => {
                          const statusRaw = String(ord.status || 'READY_TO_SHIP').toUpperCase();
                          const isSiapKirim = isStatusSiapKirim(statusRaw);
                          const isSudahKirim = ['SHIPPED', 'IN_TRANSIT', 'TO_RECEIVE', 'DIKIRIM', 'TO_CONFIRM_RECEIVE', 'COMPLETED', 'FINISHED', 'SELESAI', 'DELIVERED'].includes(statusRaw);

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                              {/* Tombol Scan Kemasan Satuan */}
                              <button
                                type="button"
                                onClick={() => handleOpenScanKemasan(ord)}
                                title="Buka Layar Scan Barcode Kemasan untuk Pesanan ini"
                                style={{
                                  height: '24px',
                                  padding: '0 8px',
                                  borderRadius: '4px',
                                  border: `1px solid ${ord.status_kemas === 'sudah_dikemas' ? '#10b981' : '#059669'}`,
                                  backgroundColor: ord.status_kemas === 'sudah_dikemas' ? '#f0fdf4' : '#ecfdf5',
                                  color: '#047857',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  fontSize: '10.5px',
                                  fontWeight: '800'
                                }}
                              >
                                <Package size={11} color="#059669" />
                                <span>{ord.status_kemas === 'sudah_dikemas' ? 'Cek Kemasan' : 'Scan Kemas'}</span>
                              </button>

                              {/* Tombol Cetak Resi (Hanya muncul jika Siap Dikirim) */}
                              {isSiapKirim && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintResi(ord)}
                                  title="Cetak Resi / Label Pengiriman"
                                  style={{
                                    height: '24px',
                                    padding: '0 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#0284c7',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    fontSize: '10.5px',
                                    fontWeight: '700'
                                  }}
                                >
                                  <Printer size={11} />
                                  <span>Cetak Resi</span>
                                </button>
                              )}

                              {/* Badge Sudah Kirim (Hanya jika pesanan sudah dikirim / selesai) */}
                              {isSudahKirim && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  backgroundColor: '#f0fdf4',
                                  color: '#166534',
                                  border: '1px solid #86efac'
                                }}>
                                  <CheckCircle2 size={11} color="#16a34a" /> Sudah Kirim
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. FOOTER & PAGINATION (GAYA MASTER PRODUK) */}
        <div style={{
          padding: '8px 14px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #cbd5e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '11.5px',
          color: '#64748b'
        }}>
          <div>
            Menampilkan <b>{sortedOrders.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1}</b> sampai <b>{Math.min(currentPage * entriesPerPage, sortedOrders.length)}</b> dari <b>{sortedOrders.length}</b> total pesanan
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                color: currentPage <= 1 ? '#94a3b8' : '#334155',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                transition: 'all 0.15s ease'
              }}
            >
              Sebelumnya
            </button>

            {/* Tombol Nomor Halaman */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span style={{ padding: '0 3px', color: '#94a3b8' }}>...</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    style={{
                      minWidth: '28px',
                      height: '28px',
                      padding: '0 6px',
                      borderRadius: '5px',
                      border: p === currentPage ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      backgroundColor: p === currentPage ? '#0284c7' : '#ffffff',
                      color: p === currentPage ? '#ffffff' : '#334155',
                      fontWeight: '800',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                height: '28px',
                padding: '0 12px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                color: currentPage >= totalPages ? '#94a3b8' : '#334155',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                transition: 'all 0.15s ease'
              }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* 6. MODAL DETAIL LENGKAP PRODUK & PESANAN (PERSIS DENGAN SCREENSHOT USER & DATA ASLI LARAVEL) */}
      {detailOrder && (() => {
        const subtotalPesanan = detailOrder.items && detailOrder.items.length > 0
          ? detailOrder.items.reduce((acc, it) => acc + ((Number(it.subtotal) || (Number(it.harga) || 0) * (Number(it.qty) || 1))), 0)
          : Number(detailOrder.totalPrice || 0);

        const ongkir = Number(detailOrder.ongkir || detailOrder.shipping_fee || 0);
        const platformFee = Number(detailOrder.fee_platform || 0);
        const freeShipping = Number(detailOrder.fee_free_shipping || 0);
        
        // Persis logika Laravel: $totalMarketplaceFee = abs($order->marketplace_fee); $layananTambahan = max(0, $totalMarketplaceFee - $platform - $freeShipping);
        const totalMarketplaceFee = Math.abs(Number(detailOrder.marketplace_fee || 0));
        const biayaLayanan = totalMarketplaceFee > 0
          ? Math.max(0, totalMarketplaceFee - platformFee - freeShipping)
          : (detailOrder.net_amount && Number(detailOrder.net_amount) > 0 
              ? Math.max(0, (subtotalPesanan + ongkir) - Number(detailOrder.net_amount) - platformFee - freeShipping)
              : Number(detailOrder.fee_service || 0));

        const estimasiPenghasilan = detailOrder.net_amount !== undefined && Number(detailOrder.net_amount) > 0
          ? Number(detailOrder.net_amount)
          : Math.max(0, subtotalPesanan + ongkir - (totalMarketplaceFee || biayaLayanan));

        const hppTotal = detailOrder.hpp_total !== undefined && Number(detailOrder.hpp_total) > 0
          ? Number(detailOrder.hpp_total)
          : (detailOrder.items && detailOrder.items.length > 0
              ? detailOrder.items.reduce((acc, it) => acc + (Number(it.hpp_subtotal) || (Number(it.hpp || 0) * (Number(it.qty) || 1))), 0)
              : 0);

        const netProfit = detailOrder.net_profit !== undefined && detailOrder.net_profit !== null
          ? Number(detailOrder.net_profit)
          : (estimasiPenghasilan - hppTotal);

        const marginPercent = detailOrder.profit_margin !== undefined && detailOrder.profit_margin !== null
          ? detailOrder.profit_margin
          : (estimasiPenghasilan > 0 ? ((netProfit / estimasiPenghasilan) * 100).toFixed(2) : '0');

        return (
          <div 
            onClick={() => setDetailOrder(null)}
            onWheel={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(3px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isFullScreen ? '10px' : '16px',
              overflowY: 'auto'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                width: '100%',
                maxWidth: isFullScreen ? '98vw' : '880px',
                maxHeight: isFullScreen ? '97vh' : '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Top Header Bar */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={17} color="#0284c7" />
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                    {detailOrder.no_pesanan}
                  </span>
                  <span style={{
                    padding: '2px 9px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '800',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    letterSpacing: '0.04em'
                  }}>
                    {String(detailOrder.status || 'SHIPPED').toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={13} />
                    Cetak Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailOrder(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Sub-Header Bar (Informasi Rincian Pesanan + ID Toko) */}
              <div style={{
                padding: '8px 18px',
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '800', color: '#334155' }}>
                  <Info size={14} color="#0284c7" />
                  <span>Informasi Rincian Pesanan</span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  ID Toko: <span style={{ color: '#0f172a', fontWeight: '700', fontFamily: 'monospace' }}>{detailOrder.shop_id || detailOrder.no_pesanan}</span>
                </div>
              </div>

              {/* Modal Body (Scroll Mandiri) */}
              <div 
                style={{ 
                  padding: '16px 18px', 
                  overflowY: 'auto', 
                  overscrollBehavior: 'contain',
                  flex: 1,
                  backgroundColor: '#ffffff'
                }}
              >
                
                {/* 1. INFORMASI PENGIRIMAN & STATUS LOGISTIK (2 KOLOM) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.15fr 1fr',
                  gap: '24px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '14px',
                  backgroundColor: '#ffffff'
                }}>
                  {/* Kolom Kiri: Informasi Pengiriman */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      color: '#475569',
                      marginBottom: '12px',
                      letterSpacing: '0.04em'
                    }}>
                      <Truck size={14} color="#0284c7" />
                      <span>INFORMASI PENGIRIMAN</span>
                    </div>

                    <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '120px', padding: '4px 0', color: '#64748b', verticalAlign: 'top' }}>Nama Pembeli</td>
                          <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: '700' }}>
                            {detailOrder.customerName || detailOrder.nama_pembeli || '3kwg25p8z4'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b', verticalAlign: 'top' }}>No. Telepon</td>
                          <td style={{ padding: '4px 0', color: '#0f172a' }}>
                            {detailOrder.telepon || '*******13'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b', verticalAlign: 'top' }}>Alamat Pengiriman</td>
                          <td style={{ padding: '4px 0', color: '#334155', lineHeight: '1.4' }}>
                            {detailOrder.alamat || '******m, KAB. BINTAN, BINTAN TIMUR, KEPULAUAN RIAU, ID, 29151'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Kolom Kanan: Status & Logistik */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      color: '#475569',
                      marginBottom: '12px',
                      letterSpacing: '0.04em'
                    }}>
                      <Info size={14} color="#0284c7" />
                      <span>STATUS & LOGISTIK</span>
                    </div>

                    <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '110px', padding: '4px 0', color: '#64748b' }}>Toko / Platform</td>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                              {detailOrder.shopName || 'NUSANTARA SERAGAM'}
                            </span>
                            <span style={{
                              marginLeft: '6px',
                              padding: '1.5px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#475569',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: '800'
                            }}>
                              {String(detailOrder.channel || 'SHOPEE').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>Kurir</td>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              {detailOrder.kurir || 'SPX Hemat'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>No. Resi</td>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{
                              backgroundColor: '#fef9c3',
                              border: '1px solid #fef08a',
                              color: '#854d0e',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                              fontFamily: 'monospace'
                            }}>
                              {detailOrder.no_resi || ('SPXID' + String(detailOrder.no_pesanan || detailOrder.id).replace(/\D/g, '').slice(-11))}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>Tgl Pesanan</td>
                          <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: '600' }}>
                            {detailOrder.orderTime || detailOrder.syncedAt || '28 Oct 2026, 12:26'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>Tgl Cair (Net)</td>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>
                            Belum Cair / Selesai
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 0', color: '#64748b' }}>Metode Bayar</td>
                          <td style={{ padding: '4px 0' }}>
                            <span style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              {detailOrder.metode_bayar || 'Cash on Delivery'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. INFORMASI PEMBAYARAN (TABEL PRODUK + BREAKDOWN BIAYA) */}
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  overflow: 'hidden'
                }}>
                  {/* Header Box Pembayaran */}
                  <div style={{
                    padding: '9px 14px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                      <FileText size={14} color="#ef4444" />
                      <span>Informasi Pembayaran</span>
                    </div>
                    <span 
                      style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: '700', cursor: 'pointer' }}
                      onClick={() => alert(`Rincian Pesanan:\nNo: ${detailOrder.no_pesanan}\nTotal: ${formatRupiah(detailOrder.totalPrice)}`)}
                    >
                      Lihat rincian pesanan
                    </span>
                  </div>

                  {/* Table Produk yang Dipesan */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ color: '#64748b', fontSize: '11px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                        <th style={{ padding: '8px 12px', width: '35px', textAlign: 'center' }}>No.</th>
                        <th style={{ padding: '8px 12px' }}>Produk</th>
                        <th style={{ padding: '8px 12px', width: '110px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>Jumlah</th>
                        <th style={{ padding: '8px 12px', width: '110px', textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items && detailOrder.items.length > 0 ? (
                        detailOrder.items.map((it, idx) => {
                          const itemQty = Number(it.qty) || 1;
                          const itemPrice = Number(it.harga) || (subtotalPesanan / (detailOrder.items.length || 1));
                          const itemSubtotal = itemQty * itemPrice;

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', verticalAlign: 'middle' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {/* Thumbnail foto produk */}
                                  <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '6px',
                                    border: '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {it.foto_produk || it.image_url ? (
                                      <img src={it.foto_produk || it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <Package size={20} color="#94a3b8" />
                                    )}
                                  </div>

                                  <div>
                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '11.5px', lineHeight: '1.3' }}>
                                      {it.nama_produk || 'Baju Batik Sekolah (SMP) Motif Bunga Matahari Biru Lengan Panjang / Lengan Pendek (XL,Lengan Pendek)'}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                      Kode Variasi: {it.sku || it.varian || 'BB-BM-BIRU-LPK-XL'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>
                                {itemPrice.toLocaleString('id-ID')}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#0f172a', fontWeight: '600' }}>
                                {itemQty}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: '700' }}>
                                {itemSubtotal.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>1</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '44px', height: '44px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                                <Package size={20} color="#94a3b8" />
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '11.5px' }}>
                                  Baju Batik Sekolah (SMP) Motif Bunga Matahari Biru Lengan Panjang / Lengan Pendek (XL,Lengan Pendek)
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                                  Kode Variasi: BB-BM-BIRU-LPK-XL
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>{subtotalPesanan.toLocaleString('id-ID')}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#0f172a', fontWeight: '600' }}>1</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0f172a', fontWeight: '700' }}>{subtotalPesanan.toLocaleString('id-ID')}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Rincian Finansial Breakdown di Bawah Tabel */}
                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '5px',
                    fontSize: '11.5px',
                    color: '#475569'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Subtotal Pesanan</span>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Rp{subtotalPesanan.toLocaleString('id-ID')} <ChevronDown size={12} color="#94a3b8" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Estimasi Subtotal Ongkos Kirim</span>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Rp{ongkir.toLocaleString('id-ID')} <ChevronDown size={12} color="#94a3b8" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Biaya Platform <Info size={11} color="#94a3b8" />
                      </span>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Rp0 <ChevronDown size={12} color="#94a3b8" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Biaya Gratis Ongkir XTRA <Info size={11} color="#94a3b8" />
                      </span>
                      <span style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Rp0 <ChevronDown size={12} color="#94a3b8" />
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span>Subtotal Biaya Layanan Tambahan</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>
                        -Rp{biayaLayanan.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px' }}>
                      <span>Retur / Refund</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>
                        Rp0
                      </span>
                    </div>

                    {/* Estimasi Total Penghasilan */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '380px',
                      paddingTop: '8px',
                      marginTop: '4px',
                      borderTop: '1px solid #e2e8f0',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>Estimasi Total Penghasilan</span>
                      <span style={{ fontWeight: '800', color: '#dc2626', fontSize: '15.5px' }}>
                        Rp{estimasiPenghasilan.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. ANALISIS PROFIT PESANAN (PERSIS DENGAN SCREENSHOT 2) */}
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '800',
                    color: '#1e293b',
                    marginBottom: '10px'
                  }}>
                    <TrendingUp size={15} color="#0284c7" />
                    <span>Analisis Profit Pesanan</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>Net Escrow (Penerimaan)</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>
                        Rp {estimasiPenghasilan.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>HPP Total Produk</span>
                      <span style={{ fontWeight: '700', color: '#dc2626' }}>
                        - Rp {hppTotal.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      marginTop: '4px',
                      borderTop: '1px solid #e2e8f0',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>Estimasi Net Profit</span>
                      <span style={{ fontWeight: '800', color: '#16a34a', fontSize: '12.5px' }}>
                        Rp {netProfit.toLocaleString('id-ID')} ({marginPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Sticky Footer */}
              <div style={{
                padding: '10px 18px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(prev => !prev)}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <ExternalLink size={13} />
                    {isFullScreen ? 'Perkecil' : 'Buka Halaman Penuh'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    style={{
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0284c7',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={13} />
                    Cetak Invoice
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailOrder(null)}
                  style={{
                    height: '30px',
                    padding: '0 20px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#64748b',
                    color: '#ffffff',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL TARIK PESANAN HISTORICAL */}
      {showHistoricalModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '14px',
            padding: '28px 32px',
            width: '460px',
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(251, 191, 36, 0.08)',
            color: '#ffffff'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(251,191,36,0.1))',
                border: '1px solid rgba(251,191,36,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fbbf24', flexShrink: 0
              }}>
                <Calendar size={20} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                  Tarik Pesanan Historical
                </h2>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8' }}>
                  Sinkronisasi pesanan dari rentang tanggal yang lebih panjang
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isHistoricalSyncing && setShowHistoricalModal(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#cbd5e1' }}>
                  Rentang Waktu
                </label>
                <div style={{
                  padding: '3px 14px', borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(251,191,36,0.1))',
                  border: '1px solid rgba(251,191,36,0.4)',
                  fontSize: '14px', fontWeight: '800', color: '#fbbf24'
                }}>
                  {historicalDays} hari
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={150}
                step={1}
                value={historicalDays}
                disabled={isHistoricalSyncing}
                onChange={(e) => setHistoricalDays(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#fbbf24', cursor: 'pointer', height: '4px' }}
              />

              {/* Quick presets */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                {[7, 14, 30, 60, 90, 150].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setHistoricalDays(d)}
                    disabled={isHistoricalSyncing}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: historicalDays === d ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.15)',
                      backgroundColor: historicalDays === d ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)',
                      color: historicalDays === d ? '#fbbf24' : '#94a3b8',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {d === 150 ? '5 bln' : d === 90 ? '3 bln' : d === 60 ? '2 bln' : d === 30 ? '1 bln' : `${d}h`}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11.5px', color: '#fcd34d', fontWeight: '700', marginBottom: '4px' }}>
                ⚡ Estimasi & Info
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
                • Auto-sync reguler (2 menit) <strong style={{ color: '#cbd5e1' }}>tetap 14 hari</strong> — tidak berubah<br/>
                • Pull ini berjalan <strong style={{ color: '#cbd5e1' }}>sekali saja</strong> dan bisa memakan 1–5 menit<br/>
                • Semua pesanan yang sudah ada di DB akan <strong style={{ color: '#cbd5e1' }}>diupdate, bukan diduplikasi</strong><br/>
                • {historicalDays} hari ≈ estimasi <strong style={{ color: '#fbbf24' }}>{historicalDays <= 30 ? '30–60 detik' : historicalDays <= 90 ? '1–3 menit' : '3–6 menit'}</strong>
              </div>
            </div>

            {/* Progress */}
            {isHistoricalSyncing && historicalProgress && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '7px',
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.2)',
                marginBottom: '16px',
                fontSize: '11.5px',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '14px', height: '14px', border: '2px solid rgba(56,189,248,0.4)',
                  borderTopColor: '#38bdf8', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', flexShrink: 0
                }} />
                {historicalProgress}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowHistoricalModal(false)}
                disabled={isHistoricalSyncing}
                style={{
                  padding: '8px 20px', borderRadius: '7px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'transparent',
                  color: '#94a3b8', fontSize: '12.5px', fontWeight: '700',
                  cursor: isHistoricalSyncing ? 'not-allowed' : 'pointer', opacity: isHistoricalSyncing ? 0.5 : 1
                }}
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-mulai-tarik-historical"
                onClick={handleSyncHistorical}
                disabled={isHistoricalSyncing}
                style={{
                  padding: '8px 24px', borderRadius: '7px',
                  border: '1px solid rgba(251,191,36,0.5)',
                  background: isHistoricalSyncing
                    ? 'rgba(251,191,36,0.1)'
                    : 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(251,191,36,0.15))',
                  color: '#fbbf24', fontSize: '12.5px', fontWeight: '800',
                  cursor: isHistoricalSyncing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '7px',
                  transition: 'all 0.15s'
                }}
              >
                {isHistoricalSyncing ? (
                  <>
                    <div style={{
                      width: '13px', height: '13px', border: '2px solid rgba(251,191,36,0.4)',
                      borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                    }} />
                    Menarik Pesanan...
                  </>
                ) : (
                  <>
                    <Calendar size={13} />
                    Tarik {historicalDays} Hari Terakhir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FULLSCREEN: SCAN KEMASAN & VERIFIKASI PACKING PESANAN MARKETPLACE ── */}
      {isScanModalOpen && (() => {
        const totalOrderedPcs = scanItems.reduce((sum, it) => sum + Number(it.qty || it.quantity || 1), 0);
        const totalScannedPcs = scanItems.reduce((sum, it) => sum + Number(it.qty_dikemas || 0), 0);
        const isAllComplete = scanItems.length > 0 && totalOrderedPcs > 0 && totalScannedPcs >= totalOrderedPcs;
        const progressPct = totalOrderedPcs > 0 ? Math.min(100, Math.round((totalScannedPcs / totalOrderedPcs) * 100)) : 0;

        // Antrean pesanan marketplace yang siap dikemas
        const packingQueue = orders.filter(
          (o) => !['CANCELLED', 'BATAL', 'DIBATALKAN'].includes(String(o.status || '').toUpperCase())
        );

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#f1f5f9',
              zIndex: 10002,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* TOP HEADER BAR */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #047857 100%)',
                padding: '8px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '7px',
                    backgroundColor: 'rgba(16, 185, 129, 0.25)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34d399'
                  }}
                >
                  <Package size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Scan Kemasan & Verifikasi Outbound Pesanan Online</span>
                    <span
                      style={{
                        fontSize: '10px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        padding: '1px 7px',
                        borderRadius: '999px',
                        fontWeight: '800'
                      }}
                    >
                      MARKETPLACE PACKING CHECKER
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.85 }}>
                    Scan Barcode Resi / No. Pesanan ➔ Scan SKU Produk ➔ Verifikasi Qty ➔ Cetak Resi Resmi
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsScanModalOpen(false)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Tutup Layar Scan Kemasan"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* MAIN WORKSPACE BODY */}
            <div
              style={{
                padding: '12px 18px',
                overflowY: 'auto',
                flex: 1
              }}
            >
              {/* BANNER FEEDBACK HASIL SCAN */}
              {scanFeedback && (
                <div
                  style={{
                    marginBottom: '10px',
                    padding: '8px 14px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor:
                      scanFeedback.type === 'success'
                        ? '#dcfce7'
                        : scanFeedback.type === 'warning'
                          ? '#fef3c7'
                          : '#fee2e2',
                    border: `1.5px solid ${
                      scanFeedback.type === 'success'
                        ? '#22c55e'
                        : scanFeedback.type === 'warning'
                          ? '#f59e0b'
                          : '#ef4444'
                    }`,
                    color:
                      scanFeedback.type === 'success'
                        ? '#14532d'
                        : scanFeedback.type === 'warning'
                          ? '#78350f'
                          : '#7f1d1d',
                    fontSize: '12px',
                    fontWeight: '800'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {scanFeedback.type === 'success' ? (
                      <CheckCircle2 size={16} color="#16a34a" />
                    ) : (
                      <XCircle
                        size={16}
                        color={scanFeedback.type === 'warning' ? '#d97706' : '#dc2626'}
                      />
                    )}
                    <span>{scanFeedback.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScanFeedback(null)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'inherit',
                      fontWeight: '800'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* BAR INPUT BARCODE NOMOR PESANAN / NO RESI / NO SPK */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <form
                  onSubmit={handleScanOrderLookup}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1,
                    minWidth: '320px'
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <QrCode size={14} color="#0284c7" />
                    <span>SCAN PESANAN / RESI:</span>
                  </div>
                  <input
                    type="text"
                    value={scanOrderInput}
                    onChange={(e) => setScanOrderInput(e.target.value)}
                    placeholder="Scan No. Pesanan / Resi Marketplace / SPK lalu tekan Enter..."
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '5px',
                      border: '2px solid #0284c7',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLookingUpScan}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: isLookingUpScan ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLookingUpScan ? 'Mencari...' : 'Cari / Scan'}
                  </button>
                </form>

                {/* Dropdown Cepat Pilih dari Daftar Antrean Pesanan */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Pilih Antrean:</span>
                  <select
                    value={activeScanOrder?.no_pesanan || ''}
                    onChange={(e) => {
                      const target = packingQueue.find((o) => (o.no_pesanan || o.id) === e.target.value);
                      if (target) handleOpenScanKemasan(target);
                    }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      maxWidth: '280px'
                    }}
                  >
                    <option value="">-- Pilih Pesanan ({packingQueue.length} Order) --</option>
                    {packingQueue.map((o) => (
                      <option key={o.id} value={o.no_pesanan || o.id}>
                        {o.no_pesanan} — {o.nama_pembeli || o.customerName || '-'} ({o.saluran || o.channel}) {o.status_kemas === 'sudah_dikemas' ? '✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CARD UTAMA VERIFIKASI ITEM PRODUK */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {!activeScanOrder ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                    <Package size={44} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#334155' }}>
                      Belum Ada Pesanan yang Dipilih
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Scan barcode nomor pesanan / nomor resi di atas atau pilih dari daftar antrean.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header Detail Pesanan Aktif + Progress Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        paddingBottom: '10px',
                        borderBottom: '1px solid #e2e8f0',
                        marginBottom: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '16px',
                              fontWeight: '900',
                              color: '#0f172a',
                              fontFamily: 'monospace'
                            }}
                          >
                            {activeScanOrder.no_pesanan}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: String(activeScanOrder.saluran || activeScanOrder.channel).toLowerCase() === 'shopee' ? '#fee2e2' : '#f1f5f9',
                              color: String(activeScanOrder.saluran || activeScanOrder.channel).toLowerCase() === 'shopee' ? '#dc2626' : '#0f172a',
                              border: '1px solid #cbd5e1',
                              textTransform: 'uppercase'
                            }}
                          >
                            {activeScanOrder.saluran || activeScanOrder.channel || 'Marketplace'}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd'
                            }}
                          >
                            {activeScanOrder.shopName || activeScanOrder.nama_toko || '-'}
                          </span>
                          {activeScanOrder.no_spk && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                backgroundColor: '#ede9fe',
                                color: '#6d28d9',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              SPK: {activeScanOrder.no_spk}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                          Pembeli: <b>{activeScanOrder.nama_pembeli || activeScanOrder.customerName || '-'}</b> (
                          {activeScanOrder.telepon || '-'}) • Kurir: <b>{activeScanOrder.kurir || '-'}</b> (Resi: <code style={{ color: '#0284c7', fontWeight: '800' }}>{activeScanOrder.no_resi || 'Belum Ada'}</code>)
                        </div>
                      </div>

                      {/* Indikator Progress Kemasan */}
                      <div
                        style={{
                          minWidth: '240px',
                          backgroundColor: isAllComplete ? '#f0fdf4' : '#f8fafc',
                          border: `1.5px solid ${isAllComplete ? '#22c55e' : '#cbd5e1'}`,
                          borderRadius: '8px',
                          padding: '7px 12px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            fontWeight: '800',
                            color: isAllComplete ? '#15803d' : '#334155',
                            marginBottom: '4px'
                          }}
                        >
                          <span>PROGRES VERIFIKASI ITEM</span>
                          <span>
                            {totalScannedPcs} / {totalOrderedPcs} Pcs ({progressPct}%)
                          </span>
                        </div>
                        <div
                          style={{
                            height: '7px',
                            borderRadius: '999px',
                            backgroundColor: '#e2e8f0',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${progressPct}%`,
                              height: '100%',
                              backgroundColor: isAllComplete ? '#16a34a' : '#0284c7',
                              transition: 'width 0.2s ease'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bar Scan Barcode SKU Produk + Tombol Cepat */}
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1.5px solid #93c5fd',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <form
                        onSubmit={handleScanSkuSubmit}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flex: 1,
                          minWidth: '280px'
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            color: '#1e3a8a',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <QrCode size={14} color="#2563eb" />
                          <span>SCAN SKU PRODUK:</span>
                        </div>
                        <input
                          type="text"
                          autoFocus
                          value={scanSkuInput}
                          onChange={(e) => setScanSkuInput(e.target.value)}
                          placeholder="Scan barcode SKU / ketik kode SKU lalu tekan Enter..."
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '2px solid #2563eb',
                            backgroundColor: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '700',
                            color: '#0f172a',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '11.5px',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          + Scan SKU
                        </button>
                      </form>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleCheckAllScanItems}
                          style={{
                            padding: '6px 11px',
                            borderRadius: '6px',
                            border: '1px solid #16a34a',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Check Semua Lengkap
                        </button>
                        <button
                          type="button"
                          onClick={handleResetScanItems}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Reset (0)
                        </button>
                      </div>
                    </div>

                    {/* Tabel Checker Item Produk */}
                    <div
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '7px',
                        overflow: 'hidden',
                        marginBottom: '12px'
                      }}
                    >
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '11.5px'
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              backgroundColor: '#f8fafc',
                              borderBottom: '1px solid #cbd5e1',
                              color: '#475569',
                              fontSize: '10.5px',
                              fontWeight: '800',
                              textTransform: 'uppercase'
                            }}
                          >
                            <th style={{ padding: '7px 8px', width: '34px', textAlign: 'center' }}>No</th>
                            <th style={{ padding: '7px 10px', textAlign: 'left' }}>SKU & Nama Produk</th>
                            <th style={{ padding: '7px 8px', width: '90px', textAlign: 'center' }}>Qty Pesan</th>
                            <th style={{ padding: '7px 8px', width: '155px', textAlign: 'center' }}>Qty Ter-Scan (Kemas)</th>
                            <th style={{ padding: '7px 10px', width: '130px', textAlign: 'center' }}>Status Cek</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scanItems.map((it, idx) => {
                            const ordered = Number(it.qty || it.quantity || 1);
                            const scanned = Number(it.qty_dikemas || 0);
                            const isDone = scanned >= ordered && ordered > 0;
                            return (
                              <tr
                                key={it.id || idx}
                                style={{
                                  borderBottom: idx < scanItems.length - 1 ? '1px solid #e2e8f0' : 'none',
                                  backgroundColor: isDone ? '#f0fdf4' : scanned > 0 ? '#fffbeb' : '#ffffff'
                                }}
                              >
                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>
                                  {idx + 1}
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                  <div style={{ fontWeight: '700', color: '#1e293b' }}>
                                    {it.nama_produk || it.name || it.item_name || 'Produk Marketplace'}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        color: '#0284c7',
                                        fontFamily: 'monospace',
                                        fontWeight: '800',
                                        backgroundColor: '#e0f2fe',
                                        padding: '1px 6px',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      SKU: {it.sku || it.kode_sku || it.sku_marketplace || it.seller_sku || '-'}
                                    </span>
                                    {it.varian && (
                                      <span style={{ fontSize: '10px', color: '#64748b' }}>
                                        Varian: {it.varian}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                                  {ordered}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustScanItemQty(idx, scanned - 1)}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#fff',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      max={ordered}
                                      value={scanned}
                                      onChange={(e) => handleAdjustScanItemQty(idx, e.target.value)}
                                      style={{
                                        width: '52px',
                                        padding: '3px 4px',
                                        textAlign: 'center',
                                        borderRadius: '5px',
                                        border: `1.5px solid ${isDone ? '#16a34a' : '#cbd5e1'}`,
                                        fontWeight: '800',
                                        fontSize: '12px'
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustScanItemQty(idx, scanned + 1)}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '4px',
                                        border: '1px solid #0284c7',
                                        backgroundColor: '#e0f2fe',
                                        color: '#0369a1',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  {isDone ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '3px 8px',
                                        borderRadius: '999px',
                                        backgroundColor: '#dcfce7',
                                        color: '#15803d',
                                        fontSize: '10.5px',
                                        fontWeight: '800'
                                      }}
                                    >
                                      ✓ Lengkap ({scanned}/{ordered})
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustScanItemQty(idx, ordered)}
                                      style={{
                                        padding: '3px 8px',
                                        borderRadius: '999px',
                                        border: '1px solid #f59e0b',
                                        backgroundColor: '#fef3c7',
                                        color: '#b45309',
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                      }}
                                      title="Klik untuk langsung menandai item ini lengkap"
                                    >
                                      Kurang {ordered - scanned} Pcs (Klik Penuh)
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Form Staff Packing & Catatan */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 2fr',
                        gap: '10px',
                        marginBottom: '12px',
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '7px',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                          Petugas / Staff Packing:
                        </label>
                        <input
                          type="text"
                          value={scanPic}
                          onChange={(e) => setScanPic(e.target.value)}
                          placeholder="Nama operator packing..."
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            backgroundColor: '#ffffff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                          Catatan Kemas / Kendala (Opsional):
                        </label>
                        <input
                          type="text"
                          value={scanCatatan}
                          onChange={(e) => setScanCatatan(e.target.value)}
                          placeholder="Misal: Dus kardus double layer, lakban fragile ekstra..."
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            borderRadius: '5px',
                            border: '1px solid #cbd5e1',
                            fontSize: '11.5px',
                            backgroundColor: '#ffffff',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    {/* Tombol Aksi Selesaikan Kemasan */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        paddingTop: '10px',
                        borderTop: '1px solid #e2e8f0'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handlePrintResi(activeScanOrder)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          border: '1px solid #0f172a',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          fontSize: '11.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Printer size={13} />
                        <span>Cetak Resi Marketplace (PDF Asli)</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={isSavingPack}
                          onClick={() => handleSaveScanKemasan('tetap')}
                          style={{
                            padding: '7px 13px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Simpan Progres Cek
                        </button>

                        <button
                          type="button"
                          disabled={isSavingPack}
                          onClick={() => handleSaveScanKemasan('sudah_dikemas')}
                          style={{
                            padding: '7px 18px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isAllComplete ? '#16a34a' : '#059669',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: isSavingPack ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 5px rgba(22, 163, 74, 0.35)'
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>
                            {isSavingPack ? 'Menyimpan...' : 'Selesai Kemas & Siap Kirim ✓'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>

  );
}
