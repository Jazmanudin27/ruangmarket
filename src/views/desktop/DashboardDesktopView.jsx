import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  ShoppingCart,
  Wallet,
  AlertOctagon,
  TrendingUp,
  Banknote,
  ShoppingBag,
  Gauge,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import { getActiveCompany } from '../../utils/tenant.util';

// Helper membuat path kurva mulus (monotone / Catmull-Rom ke Cubic Bezier)
function buildSmoothPath(points, yFloor = null) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const tension = 0.2;
    let cp1x = p1.x + (p2.x - p0.x) * tension;
    let cp1y = p1.y + (p2.y - p0.y) * tension;
    let cp2x = p2.x - (p3.x - p1.x) * tension;
    let cp2y = p2.y - (p3.y - p1.y) * tension;

    // Cegah kurva turun melewati garis 0 (yFloor)
    if (yFloor !== null) {
      cp1y = Math.min(yFloor, cp1y);
      cp2y = Math.min(yFloor, cp2y);
      if (p1.y === yFloor && p2.y === yFloor) {
        cp1y = yFloor;
        cp2y = yFloor;
      }
    }

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function DashboardDesktopView({ onNavigate }) {
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedToko, setSelectedToko] = useState('Semua');
  const [appliedFilter, setAppliedFilter] = useState({ year: currentYear, toko: 'Semua' });
  const [tokoOptions, setTokoOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(null);

  const [kpi, setKpi] = useState({
    penjualan_hari_ini: 0,
    pesanan_hari_ini: 0,
    omset_bulan_ini: 0,
    pesanan_bulan_ini: 0,
    rata_rata_order_bulan_ini: 0,
    total_produk: 0,
    item_low: 0
  });

  const [analytics, setAnalytics] = useState({
    year: currentYear,
    toko: 'Semua',
    total_omset_tahun: 0,
    total_order_tahun: 0,
    rata_rata_bulanan: 0,
    monthly: [
      { month: 1, label: 'Jan', omset: 0, trx: 0 },
      { month: 2, label: 'Feb', omset: 0, trx: 0 },
      { month: 3, label: 'Mar', omset: 0, trx: 0 },
      { month: 4, label: 'Apr', omset: 0, trx: 0 },
      { month: 5, label: 'Mei', omset: 0, trx: 0 },
      { month: 6, label: 'Jun', omset: 0, trx: 0 },
      { month: 7, label: 'Jul', omset: 0, trx: 0 },
      { month: 8, label: 'Agu', omset: 0, trx: 0 },
      { month: 9, label: 'Sep', omset: 0, trx: 0 },
      { month: 10, label: 'Okt', omset: 0, trx: 0 },
      { month: 11, label: 'Nov', omset: 0, trx: 0 },
      { month: 12, label: 'Des', omset: 0, trx: 0 }
    ]
  });

  useEffect(() => {
    const handleCompanyChange = () => setActiveCompany(getActiveCompany());
    window.addEventListener('companyChange', handleCompanyChange);
    return () => window.removeEventListener('companyChange', handleCompanyChange);
  }, []);

  // Load daftar toko untuk dropdown filter
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

  const fetchDashboardData = useCallback(async (yearVal, tokoVal) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('company', activeCompany?.code || 'RSG');
      params.append('year', String(yearVal));
      params.append('toko', tokoVal);

      const res = await fetch(`/api/marketplace/dashboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          if (json.data.kpi) setKpi(json.data.kpi);
          if (json.data.analytics) setAnalytics(json.data.analytics);
        }
      }
    } catch (err) {
      console.warn('[Dashboard Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => {
    fetchDashboardData(appliedFilter.year, appliedFilter.toko);
  }, [fetchDashboardData, appliedFilter]);

  const handleApplyFilter = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAppliedFilter({ year: Number(selectedYear) || currentYear, toko: selectedToko });
  };

  const navigateTo = (tab) => {
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    } else {
      window.location.hash = tab;
    }
  };

  const formatRupiah = (val) => {
    return 'Rp ' + Math.round(Number(val || 0)).toLocaleString('id-ID');
  };

  const formatNumber = (val) => {
    return Math.round(Number(val || 0)).toLocaleString('en-US');
  };

  const formatDotNumber = (val) => {
    return Math.round(Number(val || 0)).toLocaleString('id-ID');
  };

  // Perhitungan skala grafik SVG
  const chartWidth = 1120;
  const chartHeight = 300;
  const padLeft = 72;
  const padRight = 64;
  const padTop = 24;
  const padBottom = 34;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;
  const yBottom = padTop + plotH;

  const monthly = analytics.monthly || [];
  const rawMaxOmset = Math.max(...monthly.map(m => Number(m.omset || 0)), 0);
  const rawMaxTrx = Math.max(...monthly.map(m => Number(m.trx || 0)), 0);

  // Bulatkan batas atas sumbu Y kiri (Omset) & kanan (Trx) menjadi 7 step rapi
  const stepsCount = 7;
  const omsetStep = rawMaxOmset > 0
    ? Math.ceil((rawMaxOmset * 1.12) / stepsCount / 50000000) * 50000000 || Math.ceil((rawMaxOmset * 1.15) / stepsCount / 1000000) * 1000000 || 1000000
    : 100000000;
  const maxOmsetAxis = omsetStep * stepsCount;

  const trxStep = rawMaxTrx > 0
    ? Math.ceil((rawMaxTrx * 1.12) / 8 / 100) * 100 || Math.ceil((rawMaxTrx * 1.15) / 8 / 10) * 10 || 10
    : 500;
  const trxStepsCount = 8;
  const maxTrxAxis = trxStep * trxStepsCount;

  const omsetPoints = monthly.map((m, idx) => {
    const x = padLeft + (idx / Math.max(1, monthly.length - 1)) * plotW;
    const ratio = maxOmsetAxis > 0 ? Math.min(1, Number(m.omset || 0) / maxOmsetAxis) : 0;
    const y = yBottom - ratio * plotH;
    return { x, y, ...m };
  });

  const trxPoints = monthly.map((m, idx) => {
    const x = padLeft + (idx / Math.max(1, monthly.length - 1)) * plotW;
    const ratio = maxTrxAxis > 0 ? Math.min(1, Number(m.trx || 0) / maxTrxAxis) : 0;
    const y = yBottom - ratio * plotH;
    return { x, y, ...m };
  });

  const omsetLinePath = buildSmoothPath(omsetPoints, yBottom);
  const omsetAreaPath = omsetPoints.length > 0
    ? `${omsetLinePath} L ${omsetPoints[omsetPoints.length - 1].x.toFixed(1)} ${yBottom} L ${omsetPoints[0].x.toFixed(1)} ${yBottom} Z`
    : '';
  const trxLinePath = buildSmoothPath(trxPoints, yBottom);

  const formatShortMillions = (val) => {
    if (val === 0) return 'Rp 0';
    if (val >= 1000000) {
      return `Rp ${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `Rp ${(val / 1000).toFixed(0)}K`;
    }
    return `Rp ${val}`;
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      padding: '14px 18px 24px',
      boxSizing: 'border-box',
      backgroundColor: '#f1f5f9',
      minHeight: 'calc(100vh - 50px)'
    }}>
      {/* 1. TOP 4 COLORFUL KPI CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '14px',
        marginBottom: '16px'
      }}>
        {/* CARD 1: PENJUALAN HARI INI (BLUE) */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '10px',
          padding: '16px 18px 14px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '142px'
        }}>
          <Wallet
            size={84}
            strokeWidth={1.5}
            style={{
              position: 'absolute',
              right: '10px',
              bottom: '12px',
              opacity: 0.13,
              transform: 'rotate(-12deg)',
              pointerEvents: 'none'
            }}
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.92 }}>
                PENJUALAN HARI INI
              </span>
              <span style={{
                backgroundColor: '#ffffff',
                color: '#0284c7',
                fontSize: '10px',
                fontWeight: '800',
                padding: '3px 12px',
                borderRadius: '999px',
                minWidth: '42px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                Live
              </span>
            </div>

            <div style={{
              fontSize: '23px',
              fontWeight: '900',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              letterSpacing: '-0.02em',
              marginBottom: '4px'
            }}>
              {formatRupiah(kpi.penjualan_hari_ini)}
            </div>

            <div style={{ fontSize: '11.5px', opacity: 0.88, fontWeight: '500' }}>
              Total dari {kpi.pesanan_hari_ini} pesanan masuk
            </div>
          </div>

          <div style={{
            marginTop: '14px',
            paddingTop: '9px',
            borderTop: '1px solid rgba(255, 255, 255, 0.22)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px'
          }}>
            <span style={{ opacity: 0.9 }}>Omset Bulan Ini:</span>
            <span style={{ fontWeight: '800' }}>{formatRupiah(kpi.omset_bulan_ini)}</span>
          </div>
        </div>

        {/* CARD 2: TOTAL PESANAN BULAN INI (GREEN) */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '10px',
          padding: '16px 18px 14px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '142px'
        }}>
          <ShoppingCart
            size={84}
            strokeWidth={1.5}
            style={{
              position: 'absolute',
              right: '10px',
              bottom: '10px',
              opacity: 0.14,
              transform: 'rotate(-10deg)',
              pointerEvents: 'none'
            }}
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.92 }}>
                TOTAL PESANAN BULAN INI
              </span>
              <span style={{
                backgroundColor: '#ffffff',
                color: '#059669',
                fontSize: '10px',
                fontWeight: '800',
                padding: '3px 12px',
                borderRadius: '999px',
                minWidth: '42px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                Order
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '23px',
                fontWeight: '900',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
              }}>
                {formatNumber(kpi.pesanan_bulan_ini)}
              </span>
              <span style={{ fontSize: '14px', fontWeight: '700', opacity: 0.95 }}>Order</span>
            </div>

            <div style={{ fontSize: '11.5px', opacity: 0.88, fontWeight: '500' }}>
              Rata-rata {formatDotNumber(kpi.rata_rata_order_bulan_ini)} / order
            </div>
          </div>

          <div style={{
            marginTop: '14px',
            paddingTop: '9px',
            borderTop: '1px solid rgba(255, 255, 255, 0.22)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px'
          }}>
            <span style={{ opacity: 0.9 }}>Pesanan Hari Ini:</span>
            <span style={{ fontWeight: '800' }}>{kpi.pesanan_hari_ini} Trx</span>
          </div>
        </div>

        {/* CARD 3: KATALOG PRODUK (PURPLE) */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '10px',
          padding: '16px 18px 14px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '142px'
        }}>
          <Package
            size={84}
            strokeWidth={1.5}
            style={{
              position: 'absolute',
              right: '10px',
              bottom: '10px',
              opacity: 0.14,
              transform: 'rotate(-10deg)',
              pointerEvents: 'none'
            }}
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.92 }}>
                KATALOG PRODUK
              </span>
              <span style={{
                backgroundColor: '#ffffff',
                color: '#6d28d9',
                fontSize: '10px',
                fontWeight: '800',
                padding: '3px 12px',
                borderRadius: '999px',
                minWidth: '42px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                SKU
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '23px',
                fontWeight: '900',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
              }}>
                {formatNumber(kpi.total_produk)}
              </span>
              <span style={{ fontSize: '14px', fontWeight: '700', opacity: 0.95 }}>Produk</span>
            </div>

            <div style={{ fontSize: '11.5px', opacity: 0.88, fontWeight: '500' }}>
              Master produk aktif terintegrasi
            </div>
          </div>

          <div style={{
            marginTop: '14px',
            paddingTop: '9px',
            borderTop: '1px solid rgba(255, 255, 255, 0.22)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px'
          }}>
            <span style={{ opacity: 0.9 }}>Kelola Katalog:</span>
            <button
              type="button"
              onClick={() => navigateTo('produk')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '11.5px',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Buka Produk →
            </button>
          </div>
        </div>

        {/* CARD 4: PERINGATAN STOK (ORANGE) */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '10px',
          padding: '16px 18px 14px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '142px'
        }}>
          <AlertOctagon
            size={84}
            strokeWidth={1.5}
            style={{
              position: 'absolute',
              right: '10px',
              bottom: '10px',
              opacity: 0.14,
              transform: 'rotate(-10deg)',
              pointerEvents: 'none'
            }}
          />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: '800', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.92 }}>
                PERINGATAN STOK
              </span>
              <span style={{
                backgroundColor: '#ffffff',
                color: '#d97706',
                fontSize: '10px',
                fontWeight: '800',
                padding: '3px 12px',
                borderRadius: '999px',
                minWidth: '42px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                Alert
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '23px',
                fontWeight: '900',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
              }}>
                {formatNumber(kpi.item_low)}
              </span>
              <span style={{ fontSize: '14px', fontWeight: '700', opacity: 0.95 }}>Item Low</span>
            </div>

            <div style={{ fontSize: '11.5px', opacity: 0.88, fontWeight: '500' }}>
              Stok di bawah ambang batas minimal
            </div>
          </div>

          <div style={{
            marginTop: '14px',
            paddingTop: '9px',
            borderTop: '1px solid rgba(255, 255, 255, 0.22)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px'
          }}>
            <span style={{ opacity: 0.9 }}>Stok Gudang:</span>
            <button
              type="button"
              onClick={() => navigateTo('laporan_stok')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '11.5px',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Cek Gudang →
            </button>
          </div>
        </div>
      </div>

      {/* 2. GRAFIK OMSET PENJUALAN & ANALYTICS CARD */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '18px 22px 22px',
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.05)'
      }}>
        {/* Card Header & Filter Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#2563eb" strokeWidth={2.4} />
              <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                Grafik Omset Penjualan &amp; Analytics
              </h2>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              Tren penjualan bulanan (Jan - Des) berdasarkan filter tahun dan toko marketplace
            </p>
          </div>

          <form onSubmit={handleApplyFilter} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#64748b' }}>Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {[currentYear, currentYear - 1, currentYear - 2].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#64748b' }}>Toko:</span>
              <select
                value={selectedToko}
                onChange={(e) => setSelectedToko(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  minWidth: '185px',
                  cursor: 'pointer'
                }}
              >
                <option value="Semua">-- Semua Toko --</option>
                {tokoOptions.map((st, idx) => (
                  <option key={idx} value={`${st.channel}|${st.shopName || st.shopId}`}>
                    {st.channel === 'shopee' ? 'Shopee' : 'TikTok'}: {st.shopName}
                  </option>
                ))}
                <option value="offline|Penjualan Offline">Penjualan Offline</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6.5px 14px',
                borderRadius: '6px',
                border: '1px solid #2563eb',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 5px rgba(37, 99, 235, 0.25)'
              }}
            >
              {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <SlidersHorizontal size={13} />}
              <span>Filter</span>
            </button>
          </form>
        </div>

        {/* 3 SUMMARY SUB-CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '18px'
        }}>
          {/* Sub-card 1: Total Omset Tahun */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Banknote size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                TOTAL OMSET {analytics.year}
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#0284c7',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                marginTop: '2px'
              }}>
                {formatRupiah(analytics.total_omset_tahun)}
              </div>
            </div>
          </div>

          {/* Sub-card 2: Total Volume Pesanan */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                TOTAL VOLUME PESANAN
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#059669',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                marginTop: '2px'
              }}>
                {formatNumber(analytics.total_order_tahun)} Order
              </div>
            </div>
          </div>

          {/* Sub-card 3: Rata-rata Bulanan */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#fefce8',
              border: '1px solid #fde047',
              color: '#ca8a04',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Gauge size={18} />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                RATA-RATA BULANAN
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#0f172a',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                marginTop: '2px'
              }}>
                {formatRupiah(analytics.rata_rata_bulanan)}
              </div>
            </div>
          </div>
        </div>

        {/* CHART LEGEND */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '18px',
          marginBottom: '6px',
          paddingRight: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#475569', fontWeight: '600' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0284c7', display: 'inline-block' }} />
            <span>Omset Penjualan (Rp)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#475569', fontWeight: '600' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            <span>Jumlah Pesanan (Trx)</span>
          </div>
        </div>

        {/* DUAL-AXIS SMOOTH AREA & LINE CHART */}
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            style={{ width: '100%', height: 'auto', minHeight: '260px', display: 'block', userSelect: 'none' }}
          >
            <defs>
              <linearGradient id="omsetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Left Y-Axis Labels (Omset) */}
            {Array.from({ length: stepsCount + 1 }).map((_, idx) => {
              const val = (stepsCount - idx) * omsetStep;
              const y = padTop + (idx / stepsCount) * plotH;
              return (
                <g key={`grid-l-${idx}`}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#64748b"
                    fontWeight="500"
                  >
                    {formatShortMillions(val)}
                  </text>
                </g>
              );
            })}

            {/* Right Y-Axis Labels (Trx) */}
            {Array.from({ length: trxStepsCount + 1 }).map((_, idx) => {
              const val = (trxStepsCount - idx) * trxStep;
              const y = padTop + (idx / trxStepsCount) * plotH;
              return (
                <text
                  key={`grid-r-${idx}`}
                  x={chartWidth - padRight + 10}
                  y={y + 4}
                  textAnchor="start"
                  fontSize="10"
                  fill="#64748b"
                  fontWeight="500"
                >
                  {val} Trx
                </text>
              );
            })}

            {/* Vertical Grid Lines & X-Axis Month Labels */}
            {omsetPoints.map((pt, idx) => (
              <g key={`x-col-${idx}`}>
                <line
                  x1={pt.x}
                  y1={padTop}
                  x2={pt.x}
                  y2={yBottom}
                  stroke={hoveredMonthIdx === idx ? '#cbd5e1' : '#f8fafc'}
                  strokeDasharray={hoveredMonthIdx === idx ? '3,3' : 'none'}
                  strokeWidth="1"
                />
                <text
                  x={pt.x}
                  y={yBottom + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill={hoveredMonthIdx === idx ? '#0f172a' : '#64748b'}
                  fontWeight={hoveredMonthIdx === idx ? '800' : '600'}
                >
                  {pt.label}
                </text>
              </g>
            ))}

            {/* Area Fill under Omset Curve */}
            {omsetAreaPath && (
              <path d={omsetAreaPath} fill="url(#omsetAreaGrad)" />
            )}

            {/* Solid Blue Line: Omset Penjualan (Rp) */}
            {omsetLinePath && (
              <path
                d={omsetLinePath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Dashed Green Line: Jumlah Pesanan (Trx) */}
            {trxLinePath && (
              <path
                d={trxLinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="5,4"
                strokeLinecap="round"
              />
            )}

            {/* Data Points & Hover Targets */}
            {omsetPoints.map((pt, idx) => {
              const tPt = trxPoints[idx];
              const isHovered = hoveredMonthIdx === idx;
              return (
                <g
                  key={`pts-${idx}`}
                  onMouseEnter={() => setHoveredMonthIdx(idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Invisible wider hover column */}
                  <rect
                    x={pt.x - plotW / 24}
                    y={padTop}
                    width={plotW / 12}
                    height={plotH}
                    fill="transparent"
                  />

                  {/* Green Point (Trx) */}
                  {tPt && (
                    <circle
                      cx={tPt.x}
                      cy={tPt.y}
                      r={isHovered ? 5.5 : 3.8}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Blue Point (Omset) */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.8}
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoveredMonthIdx !== null && omsetPoints[hoveredMonthIdx] && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: `${Math.min(82, Math.max(10, (omsetPoints[hoveredMonthIdx].x / chartWidth) * 100))}%`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.94)',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '11.5px',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 20
            }}>
              <div style={{ fontWeight: '800', marginBottom: '4px', color: '#38bdf8' }}>
                Bulan {omsetPoints[hoveredMonthIdx].label} {analytics.year}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7', display: 'inline-block' }} />
                <span>Omset: <b>{formatRupiah(omsetPoints[hoveredMonthIdx].omset)}</b></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                <span>Pesanan: <b>{formatNumber(omsetPoints[hoveredMonthIdx].trx)} Trx</b></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
