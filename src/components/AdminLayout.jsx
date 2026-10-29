import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Menu, 
  ChevronDown, 
  Maximize2, 
  Minimize2, 
  LogOut, 
  User, 
  ShieldCheck, 
  X,
  Sparkles,
  Layers,
  Clock,
  Boxes,
  Tag,
  Factory,
  Users,
  ClipboardList,
  Store,
  ShoppingBag,
  RotateCcw,
  Building,
  Check,
  Megaphone
} from 'lucide-react';
import { getCompanies, getActiveCompany, setActiveCompanyCode } from '../utils/tenant.util';
import { useDeviceType } from '../hooks/useDeviceType';

// Desktop Views
import DashboardDesktopView from '../views/desktop/DashboardDesktopView';
import ProdukDesktopView from '../views/desktop/ProdukDesktopView';
import KategoriDesktopView from '../views/desktop/KategoriDesktopView';
import KaryawanDesktopView from '../views/desktop/KaryawanDesktopView';
import ProduksiDesktopView from '../views/desktop/ProduksiDesktopView';
import SPKDesktopView from '../views/desktop/SPKDesktopView';
import MarketplaceDesktopView from '../views/desktop/MarketplaceDesktopView';
import ProdukMarketplaceDesktopView from '../views/desktop/ProdukMarketplaceDesktopView';
import PesananMasukDesktopView from '../views/desktop/PesananMasukDesktopView';
import ReturBarangDesktopView from '../views/desktop/ReturBarangDesktopView';
import BlankTemplateDesktopView from '../views/desktop/BlankTemplateDesktopView';

// Mobile Views
import MarketplaceMobileView from '../views/mobile/MarketplaceMobileView';
import ProdukMarketplaceMobileView from '../views/mobile/ProdukMarketplaceMobileView';

import { showConfirm, toastSuccess } from '../utils/alert.util';
import { INITIAL_PRODUK_DATA } from '../data/initialProduk';

const TAB_STORAGE_KEY = 'template_active_tab';

export default function AdminLayout() {
  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'kelas') return hash;
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && saved !== 'kelas') return saved;
    return 'produk';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const [isDataMasterOpen, setIsDataMasterOpen] = useState(false);
  const dataMasterRef = useRef(null);
  const [isProduksiOpen, setIsProduksiOpen] = useState(false);
  const produksiRef = useRef(null);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const marketingRef = useRef(null);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const marketplaceRef = useRef(null);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const companyDropdownRef = useRef(null);
  const [companies, setCompanies] = useState(getCompanies);
  const [activeCompany, setActiveCompany] = useState(getActiveCompany);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
        setIsCompanyDropdownOpen(false);
      }
      if (dataMasterRef.current && !dataMasterRef.current.contains(event.target)) {
        setIsDataMasterOpen(false);
      }
      if (produksiRef.current && !produksiRef.current.contains(event.target)) {
        setIsProduksiOpen(false);
      }
      if (marketingRef.current && !marketingRef.current.contains(event.target)) {
        setIsMarketingOpen(false);
      }
      if (marketplaceRef.current && !marketplaceRef.current.contains(event.target)) {
        setIsMarketplaceOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean legacy kelas data & redirect hash
  useEffect(() => {
    try {
      localStorage.removeItem('template_kelas_data');
      if (window.location.hash === '#kelas') {
        window.location.hash = 'produk';
      }
    } catch (e) {}
  }, []);

  // Read total products for badge (filtered by active company)
  const [totalProdukCount, setTotalProdukCount] = useState(() => {
    try {
      const saved = localStorage.getItem('ruangmarket_produk_gamis_v4');
      if (saved) {
        const list = JSON.parse(saved);
        return list.filter(p => !p.company_code || p.company_code === activeCompany.code).length;
      }
    } catch (e) {}
    return INITIAL_PRODUK_DATA.filter(p => p.company_code === activeCompany.code).length;
  });

  // Listen for storage change & companyChange
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const currentComp = getActiveCompany();
        setActiveCompany(currentComp);
        const saved = localStorage.getItem('ruangmarket_produk_gamis_v4');
        if (saved) {
          const list = JSON.parse(saved);
          setTotalProdukCount(list.filter(p => !p.company_code || p.company_code === currentComp.code).length);
        }
      } catch (e) {}
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('companyChange', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('companyChange', handleStorageChange);
    };
  }, [activeCompany.code]);

  // Realtime clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      const dateStr = now.toLocaleDateString('id-ID', options);
      const timeStr = now.toTimeString().split(' ')[0];
      setCurrentTime(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setIsUserDropdownOpen(false);
      }
      if (dataMasterRef.current && !dataMasterRef.current.contains(e.target)) {
        setIsDataMasterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
    localStorage.setItem(TAB_STORAGE_KEY, tab);
    setIsMobileMenuOpen(false);
    setIsDataMasterOpen(false);
    setIsProduksiOpen(false);
    setIsMarketingOpen(false);
    setIsMarketplaceOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleLogout = async () => {
    setIsUserDropdownOpen(false);
    const confirmed = await showConfirm(
      'Konfirmasi Keluar',
      'Keluar dari sesi administrator template?',
      'Ya, Keluar',
      'Batal'
    );
    if (confirmed) {
      toastSuccess('Berhasil keluar');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'produk', label: 'Data Produk', icon: Package, badge: totalProdukCount },
    { id: 'kategori', label: 'Kategori Produk', icon: Tag }
  ];

  const { isMobile } = useDeviceType();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardDesktopView onNavigate={changeTab} />;
      case 'produk':
        return <ProdukDesktopView />;
      case 'kategori':
        return <KategoriDesktopView />;
      case 'karyawan':
        return <KaryawanDesktopView />;
      case 'produksi':
        return <ProduksiDesktopView />;
      case 'spk':
        return <SPKDesktopView />;
      case 'marketplace':
      case 'toko':
        return isMobile ? (
          <MarketplaceMobileView onBack={() => changeTab('dashboard')} onNavigate={changeTab} />
        ) : (
          <MarketplaceDesktopView onBack={() => changeTab('dashboard')} onNavigate={changeTab} />
        );
      case 'produk_marketplace':
        return isMobile ? (
          <ProdukMarketplaceMobileView onNavigate={changeTab} />
        ) : (
          <ProdukMarketplaceDesktopView onNavigate={changeTab} />
        );
      case 'pesanan_masuk':
      case 'pesanan':
        return <PesananMasukDesktopView onNavigate={changeTab} />;
      case 'retur_barang':
      case 'retur':
        return <ReturBarangDesktopView onNavigate={changeTab} />;
      case 'blank':
        return <BlankTemplateDesktopView />;
      default:
        return <ProdukDesktopView />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#edf2f7' }}>
      
      {/* TOP BAR NAVIGATION (FIXED & DARK MODE - SLIM & COMPACT) */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1000,
        background: 'linear-gradient(135deg, #090d16 0%, #0f172a 45%, #1e293b 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(12px)',
        overflow: 'visible'
      }}>
        <div style={{
          width: '100%',
          height: '42px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          overflow: 'visible'
        }}>
          
          {/* BRAND LOGO & TITLE (COMPACT) */}
          <div 
            onClick={() => changeTab('dashboard')} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
            }}>
              <Layers size={16} color="#38bdf8" />
            </div>
            <div>
              <div style={{ fontWeight: '800', color: '#ffffff', fontSize: '13px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                RUANG MARKET
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.01em', lineHeight: 1 }}>
                Sistem Multi-Perusahaan
              </div>
            </div>
          </div>

          {/* COMPANY / TENANT SELECTOR DROPDOWN (DI-HIDDEN SEMENTARA ATAS PERMINTAAN USER) */}
          <div style={{ position: 'relative', display: 'none' }} ref={companyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.15)'}
            >
              <Building size={13} color="#38bdf8" />
              <span>{activeCompany.name}</span>
              <span style={{
                fontSize: '9.5px',
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#38bdf8',
                fontWeight: '800'
              }}>
                {activeCompany.code}
              </span>
              <ChevronDown size={11} color="#94a3b8" style={{ transform: isCompanyDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Dropdown Menu List Perusahaan */}
            {isCompanyDropdownOpen && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: '100%',
                marginTop: '6px',
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: '1px solid #334155',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                padding: '6px',
                minWidth: '220px',
                zIndex: 3000
              }}>
                <div style={{ padding: '4px 8px 6px 8px', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pilih Perusahaan Aktif
                </div>
                {companies.map((c) => {
                  const isCurrent = c.code === activeCompany.code;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveCompanyCode(c.code);
                        setActiveCompany(c);
                        setIsCompanyDropdownOpen(false);
                        toastSuccess(`Beralih ke perusahaan: ${c.name}`);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isCurrent ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                        color: isCurrent ? '#38bdf8' : '#cbd5e1',
                        fontSize: '11.5px',
                        fontWeight: isCurrent ? '800' : '600',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c.color || '#38bdf8' }} />
                        <div>
                          <div>{c.name}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>Kode: {c.code}</div>
                        </div>
                      </div>
                      {isCurrent && <Check size={14} color="#38bdf8" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* DESKTOP NAV TABS (DARK MODE & SLEEK ACCENTS) */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            marginLeft: '10px',
            overflow: 'visible'
          }} className="desktop-nav-links">
            
            {/* 1. Home */}
            <button
              type="button"
              onClick={() => changeTab('dashboard')}
              style={{
                height: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '0 8px',
                borderRadius: '5px',
                border: activeTab === 'dashboard' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: activeTab === 'dashboard' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'dashboard' ? '#ffffff' : '#cbd5e1',
                fontSize: '11px',
                fontWeight: activeTab === 'dashboard' ? '800' : '600',
                lineHeight: 1,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: activeTab === 'dashboard' ? '0 0 10px rgba(2, 132, 199, 0.5)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'dashboard') {
                  e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'dashboard') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              <LayoutDashboard size={13} color={activeTab === 'dashboard' ? '#ffffff' : '#38bdf8'} style={{ flexShrink: 0 }} />
              <span>Home</span>
            </button>

            {/* 2. Data Master (Dropdown with Data Produk) */}
            <div style={{ position: 'relative' }} ref={dataMasterRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDataMasterOpen(prev => !prev);
                }}
                style={{
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '0 8px',
                  borderRadius: '5px',
                  border: (activeTab === 'produk' || activeTab === 'produk_marketplace' || activeTab === 'kategori' || activeTab === 'karyawan' || isDataMasterOpen) ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: (activeTab === 'produk' || activeTab === 'produk_marketplace' || activeTab === 'kategori' || activeTab === 'karyawan' || isDataMasterOpen) ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                  color: (activeTab === 'produk' || activeTab === 'produk_marketplace' || activeTab === 'kategori' || activeTab === 'karyawan' || isDataMasterOpen) ? '#ffffff' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: (activeTab === 'produk' || activeTab === 'produk_marketplace' || activeTab === 'kategori' || activeTab === 'karyawan' || isDataMasterOpen) ? '800' : '600',
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: (activeTab === 'produk' || activeTab === 'kategori' || activeTab === 'karyawan' || isDataMasterOpen) ? '0 0 10px rgba(2, 132, 199, 0.5)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'produk' && activeTab !== 'produk_marketplace' && activeTab !== 'kategori' && activeTab !== 'karyawan' && !isDataMasterOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'produk' && activeTab !== 'produk_marketplace' && activeTab !== 'kategori' && activeTab !== 'karyawan' && !isDataMasterOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                <Boxes size={13} color={(activeTab === 'produk' || activeTab === 'produk_marketplace' || activeTab === 'kategori' || activeTab === 'karyawan' || isDataMasterOpen) ? '#ffffff' : '#38bdf8'} style={{ flexShrink: 0 }} />
                <span>Data Master</span>
                <ChevronDown 
                  size={11} 
                  color={(activeTab === 'produk' || activeTab === 'produk_marketplace' || activeTab === 'kategori' || activeTab === 'karyawan' || isDataMasterOpen) ? '#ffffff' : '#38bdf8'} 
                  style={{ 
                    transform: isDataMasterOpen ? 'rotate(180deg)' : 'none', 
                    transition: 'transform 0.15s ease',
                    marginLeft: '1px'
                  }} 
                />
              </button>

              {/* Data Master Dropdown Popup (Dark Mode) */}
              {isDataMasterOpen && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '100%',
                  marginTop: '6px',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                  padding: '5px',
                  minWidth: '175px',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}>
                  {/* Submenu 1: Master Produk */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('produk');
                      setIsDataMasterOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'produk' ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                      color: activeTab === 'produk' ? '#38bdf8' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: activeTab === 'produk' ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'produk') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'produk') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Package size={14} color={activeTab === 'produk' ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>Master Produk</span>
                  </button>

                  {/* Submenu 2: Produk Marketplace (Tepat di bawah Master Produk) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('produk_marketplace');
                      setIsDataMasterOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'produk_marketplace' ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                      color: activeTab === 'produk_marketplace' ? '#38bdf8' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: activeTab === 'produk_marketplace' ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'produk_marketplace') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'produk_marketplace') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <ShoppingBag size={14} color={activeTab === 'produk_marketplace' ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>Produk Marketplace</span>
                  </button>

                  {/* Submenu 2: Kategori Produk */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('kategori');
                      setIsDataMasterOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'kategori' ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                      color: activeTab === 'kategori' ? '#38bdf8' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: activeTab === 'kategori' ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'kategori') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'kategori') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Tag size={14} color={activeTab === 'kategori' ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>Kategori Produk</span>
                  </button>

                  {/* Submenu 3: Data Karyawan */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('karyawan');
                      setIsDataMasterOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'karyawan' ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                      color: activeTab === 'karyawan' ? '#38bdf8' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: activeTab === 'karyawan' ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'karyawan') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'karyawan') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Users size={14} color={activeTab === 'karyawan' ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>Data Karyawan</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Produksi (Dropdown Menu: SPK Produksi & Ikhtisar) */}
            <div style={{ position: 'relative' }} ref={produksiRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProduksiOpen(prev => !prev);
                }}
                style={{
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '0 8px',
                  borderRadius: '5px',
                  border: (activeTab === 'spk' || activeTab === 'produksi' || isProduksiOpen) ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: (activeTab === 'spk' || activeTab === 'produksi' || isProduksiOpen) ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                  color: (activeTab === 'spk' || activeTab === 'produksi' || isProduksiOpen) ? '#ffffff' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: (activeTab === 'spk' || activeTab === 'produksi' || isProduksiOpen) ? '800' : '600',
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: (activeTab === 'spk' || activeTab === 'produksi' || isProduksiOpen) ? '0 0 10px rgba(2, 132, 199, 0.5)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'spk' && activeTab !== 'produksi' && !isProduksiOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'spk' && activeTab !== 'produksi' && !isProduksiOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                <Factory size={13} color={(activeTab === 'spk' || activeTab === 'produksi' || isProduksiOpen) ? '#ffffff' : '#38bdf8'} style={{ flexShrink: 0 }} />
                <span>Produksi</span>
                <ChevronDown 
                  size={11} 
                  color={(activeTab === 'spk' || activeTab === 'produksi' || isProduksiOpen) ? '#ffffff' : '#38bdf8'} 
                  style={{ 
                    transform: isProduksiOpen ? 'rotate(180deg)' : 'none', 
                    transition: 'transform 0.15s ease',
                    marginLeft: '1px'
                  }} 
                />
              </button>

              {/* Produksi Dropdown Popup */}
              {isProduksiOpen && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '100%',
                  marginTop: '6px',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                  padding: '5px',
                  minWidth: '170px',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}>
                  {/* Submenu 1: SPK Produksi */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('spk');
                      setIsProduksiOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'spk' ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                      color: activeTab === 'spk' ? '#38bdf8' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: activeTab === 'spk' ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'spk') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'spk') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <ClipboardList size={14} color={activeTab === 'spk' ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>SPK</span>
                  </button>

                  {/* Submenu 2: Monitoring */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('produksi');
                      setIsProduksiOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'produksi' ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                      color: activeTab === 'produksi' ? '#38bdf8' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: activeTab === 'produksi' ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'produksi') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'produksi') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Factory size={14} color={activeTab === 'produksi' ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>Monitoring</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3b. Marketing (Dropdown Menu: Pesanan Masuk & Retur Masuk) */}
            <div style={{ position: 'relative' }} ref={marketingRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMarketingOpen(prev => !prev);
                }}
                style={{
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '0 8px',
                  borderRadius: '5px',
                  border: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan' || activeTab === 'retur_barang' || activeTab === 'retur' || isMarketingOpen) ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan' || activeTab === 'retur_barang' || activeTab === 'retur' || isMarketingOpen) ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                  color: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan' || activeTab === 'retur_barang' || activeTab === 'retur' || isMarketingOpen) ? '#ffffff' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan' || activeTab === 'retur_barang' || activeTab === 'retur' || isMarketingOpen) ? '800' : '600',
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan' || activeTab === 'retur_barang' || activeTab === 'retur' || isMarketingOpen) ? '0 0 10px rgba(2, 132, 199, 0.5)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'pesanan_masuk' && activeTab !== 'pesanan' && activeTab !== 'retur_barang' && activeTab !== 'retur' && !isMarketingOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'pesanan_masuk' && activeTab !== 'pesanan' && activeTab !== 'retur_barang' && activeTab !== 'retur' && !isMarketingOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                <Megaphone size={13} color={(activeTab === 'pesanan_masuk' || activeTab === 'pesanan' || activeTab === 'retur_barang' || activeTab === 'retur' || isMarketingOpen) ? '#ffffff' : '#38bdf8'} style={{ flexShrink: 0 }} />
                <span>Marketing</span>
                <ChevronDown 
                  size={11} 
                  color={(activeTab === 'pesanan_masuk' || activeTab === 'pesanan' || activeTab === 'retur_barang' || activeTab === 'retur' || isMarketingOpen) ? '#ffffff' : '#38bdf8'} 
                  style={{ 
                    transform: isMarketingOpen ? 'rotate(180deg)' : 'none', 
                    transition: 'transform 0.15s ease',
                    marginLeft: '1px'
                  }} 
                />
              </button>

              {/* Marketing Dropdown Popup */}
              {isMarketingOpen && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '100%',
                  marginTop: '6px',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                  padding: '5px',
                  minWidth: '170px',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}>
                  {/* Submenu 1: Pesanan Masuk */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('pesanan_masuk');
                      setIsMarketingOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan') ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                      color: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan') ? '#38bdf8' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan') ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'pesanan_masuk' && activeTab !== 'pesanan') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'pesanan_masuk' && activeTab !== 'pesanan') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <ShoppingBag size={14} color={(activeTab === 'pesanan_masuk' || activeTab === 'pesanan') ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>Pesanan Masuk</span>
                  </button>

                  {/* Submenu 2: Retur Masuk */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('retur_barang');
                      setIsMarketingOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: (activeTab === 'retur_barang' || activeTab === 'retur') ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: (activeTab === 'retur_barang' || activeTab === 'retur') ? '#f87171' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: (activeTab === 'retur_barang' || activeTab === 'retur') ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'retur_barang' && activeTab !== 'retur') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'retur_barang' && activeTab !== 'retur') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <RotateCcw size={14} color={(activeTab === 'retur_barang' || activeTab === 'retur') ? '#f87171' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>Retur Masuk</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Marketplace & Toko Online */}
            <div style={{ position: 'relative' }} ref={marketplaceRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMarketplaceOpen(prev => !prev);
                }}
                style={{
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '0 8px',
                  borderRadius: '5px',
                  border: (activeTab === 'marketplace' || activeTab === 'toko' || isMarketplaceOpen) ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: (activeTab === 'marketplace' || activeTab === 'toko' || isMarketplaceOpen) ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                  color: (activeTab === 'marketplace' || activeTab === 'toko' || isMarketplaceOpen) ? '#ffffff' : '#cbd5e1',
                  fontSize: '11px',
                  fontWeight: (activeTab === 'marketplace' || activeTab === 'toko' || isMarketplaceOpen) ? '800' : '600',
                  lineHeight: 1,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: (activeTab === 'marketplace' || activeTab === 'toko' || isMarketplaceOpen) ? '0 0 10px rgba(2, 132, 199, 0.5)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'marketplace' && activeTab !== 'toko' && !isMarketplaceOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'marketplace' && activeTab !== 'toko' && !isMarketplaceOpen) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                <Store size={13} color={(activeTab === 'marketplace' || activeTab === 'toko' || isMarketplaceOpen) ? '#ffffff' : '#38bdf8'} style={{ flexShrink: 0 }} />
                <span>Marketplace & POS</span>
                <ChevronDown 
                  size={11} 
                  color={(activeTab === 'marketplace' || activeTab === 'toko' || isMarketplaceOpen) ? '#ffffff' : '#38bdf8'} 
                  style={{ 
                    transform: isMarketplaceOpen ? 'rotate(180deg)' : 'none', 
                    transition: 'transform 0.15s ease',
                    marginLeft: '1px'
                  }} 
                />
              </button>

              {/* Marketplace Dropdown Popup */}
              {isMarketplaceOpen && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '100%',
                  marginTop: '6px',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                  padding: '5px',
                  minWidth: '190px',
                  zIndex: 2000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}>
                  {/* Submenu: Tambah Toko Marketplace */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeTab('marketplace');
                      setIsMarketplaceOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: '8px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === 'marketplace' ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                      color: activeTab === 'marketplace' ? '#38bdf8' : '#cbd5e1',
                      fontSize: '11.5px',
                      fontWeight: activeTab === 'marketplace' ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'marketplace') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'marketplace') e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Store size={14} color={activeTab === 'marketplace' ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    <span style={{ textAlign: 'left', flex: 1 }}>Tambah Toko Marketplace</span>
                  </button>
                </div>
              )}
            </div>

          </nav>

          {/* RIGHT SIDE ACTIONS (DARK MODE) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            
            {/* Realtime Clock Badge (DI-HIDDEN SEMENTARA ATAS PERMINTAAN USER) */}
            <div style={{
              display: 'none',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#cbd5e1',
              fontWeight: '500'
            }} className="header-clock">
              <Clock size={12} color="#38bdf8" />
              <span>{currentTime}</span>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }} ref={userDropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px 3px 4px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '800',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                }}>
                  AD
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff' }}>Super Admin</div>
                </div>
                <ChevronDown size={12} color="#94a3b8" />
              </button>

              {isUserDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '8px',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                  width: '210px',
                  padding: '6px',
                  zIndex: 2000
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>Administrator</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>admin@template.local</div>
                    <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                      Mode Mandiri Aktif
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#f87171',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginTop: '4px',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={15} />
                    Keluar Sesi
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-hamburger-btn"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

          </div>

        </div>

        {/* MOBILE MENU ACCORDION / DRAWER (DARK MODE) */}
        {isMobileMenuOpen && (
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#090d16',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {/* 1. Dashboard Utama */}
            <button
              onClick={() => changeTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: '6px',
                border: activeTab === 'dashboard' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: activeTab === 'dashboard' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: activeTab === 'dashboard' ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutDashboard size={16} color={activeTab === 'dashboard' ? '#ffffff' : '#38bdf8'} />
                <span>Home</span>
              </div>
            </button>

            {/* 2. Data Master Section Header */}
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#94a3b8',
              padding: '6px 12px 2px 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Data Master
            </div>

            {/* 2a. Data Produk (Submenu) */}
            <button
              onClick={() => changeTab('produk')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px 8px 20px',
                borderRadius: '6px',
                border: activeTab === 'produk' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: activeTab === 'produk' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: activeTab === 'produk' ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Package size={15} color={activeTab === 'produk' ? '#ffffff' : '#38bdf8'} />
              <span>Data Produk</span>
            </button>

            {/* 2b. Kategori Produk (Submenu) */}
            <button
              onClick={() => changeTab('kategori')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px 8px 20px',
                borderRadius: '6px',
                border: activeTab === 'kategori' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: activeTab === 'kategori' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: activeTab === 'kategori' ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Tag size={15} color={activeTab === 'kategori' ? '#ffffff' : '#38bdf8'} />
              <span>Kategori Produk</span>
            </button>

            {/* 2c. Data Karyawan (Submenu) */}
            <button
              onClick={() => changeTab('karyawan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px 8px 20px',
                borderRadius: '6px',
                border: activeTab === 'karyawan' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: activeTab === 'karyawan' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: activeTab === 'karyawan' ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Users size={15} color={activeTab === 'karyawan' ? '#ffffff' : '#38bdf8'} />
              <span>Data Karyawan</span>
            </button>

            {/* 3. Produksi Section Header */}
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#94a3b8',
              padding: '8px 12px 2px 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Produksi
            </div>

            {/* 3a. SPK */}
            <button
              onClick={() => changeTab('spk')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px 8px 20px',
                borderRadius: '6px',
                border: activeTab === 'spk' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: activeTab === 'spk' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: activeTab === 'spk' ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <ClipboardList size={15} color={activeTab === 'spk' ? '#ffffff' : '#38bdf8'} />
              <span>SPK</span>
            </button>

            {/* 3b. Monitoring */}
            <button
              onClick={() => changeTab('produksi')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px 8px 20px',
                borderRadius: '6px',
                border: activeTab === 'produksi' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: activeTab === 'produksi' ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: activeTab === 'produksi' ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Factory size={15} color={activeTab === 'produksi' ? '#ffffff' : '#38bdf8'} />
              <span>Monitoring</span>
            </button>
            {/* 3b. Marketing Section Mobile */}
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#94a3b8',
              padding: '8px 12px 2px 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Marketing
            </div>
            <button
              onClick={() => changeTab('pesanan_masuk')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px 8px 20px',
                borderRadius: '6px',
                border: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan') ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan') ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: (activeTab === 'pesanan_masuk' || activeTab === 'pesanan') ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <ShoppingBag size={15} color={(activeTab === 'pesanan_masuk' || activeTab === 'pesanan') ? '#ffffff' : '#38bdf8'} />
              <span>Pesanan Masuk</span>
            </button>
            <button
              onClick={() => changeTab('retur_barang')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px 8px 20px',
                borderRadius: '6px',
                border: (activeTab === 'retur_barang' || activeTab === 'retur') ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: (activeTab === 'retur_barang' || activeTab === 'retur') ? '#ef4444' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: (activeTab === 'retur_barang' || activeTab === 'retur') ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <RotateCcw size={15} color={(activeTab === 'retur_barang' || activeTab === 'retur') ? '#ffffff' : '#f87171'} />
              <span>Retur Masuk</span>
            </button>

            {/* 4. Marketplace Section Mobile */}
            <div style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#94a3b8',
              padding: '8px 12px 2px 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Marketplace & POS
            </div>
            <button
              onClick={() => changeTab('marketplace')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px 8px 20px',
                borderRadius: '6px',
                border: (activeTab === 'marketplace' || activeTab === 'toko') ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: (activeTab === 'marketplace' || activeTab === 'toko') ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: (activeTab === 'marketplace' || activeTab === 'toko') ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Store size={15} color={(activeTab === 'marketplace' || activeTab === 'toko') ? '#ffffff' : '#38bdf8'} />
              <span>Tambah Toko Marketplace</span>
            </button>
          </div>
        )}
      </header>

      {/* MAIN BODY CONTENT */}
      <main style={{ flex: 1, width: '100%', paddingTop: '42px' }}>
        {renderContent()}
      </main>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        color: '#64748b',
        fontSize: '12px',
        padding: '10px 16px',
        marginTop: 'auto'
      }}>
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            © {new Date().getFullYear()} Ruang Market. Sistem Manajemen Produk & Toko.
          </div>
          <div>
            Dibuat untuk Jazmanudin27
          </div>
        </div>
      </footer>

    </div>
  );
}
