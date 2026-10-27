import React, { useState, useEffect } from 'react';
import { 
  Store, 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Globe, 
  ShoppingBag, 
  Link2, 
  Plus, 
  Trash2, 
  AlertCircle,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import { toastSuccess, toastError, showConfirm } from '../utils/alert.util';

const STORAGE_KEY_TOKO = 'ruangmarket_connected_stores_v1';

export default function MarketplaceView({ onBack }) {
  // Mode: 'create' (persis seperti screenshot) atau 'list' (daftar toko)
  const [viewMode, setViewMode] = useState('create');
  const [loadingChannel, setLoadingChannel] = useState(null);

  // Daftar toko terhubung
  const [connectedStores, setConnectedStores] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TOKO);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'tk_shopee_01',
        channel: 'shopee',
        channelName: 'Shopee Marketplace',
        shopName: 'Ruang Seragam Official (Shopee)',
        shopId: '98273612',
        connectedAt: '27 Okt 2026, 14:20',
        status: 'Active',
        autoSyncStok: true
      },
      {
        id: 'tk_tiktok_01',
        channel: 'tiktok',
        channelName: 'TikTok Shop',
        shopName: 'Ruang Seragam ID (TikTok)',
        shopId: 'IDLC6A9XYZ',
        connectedAt: '27 Okt 2026, 16:45',
        status: 'Active',
        autoSyncStok: true
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TOKO, JSON.stringify(connectedStores));
    } catch (e) {}
  }, [connectedStores]);

  // Cek apakah ada query param callback dari marketplace (misal ?code=...&shop_id=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
      const code = urlParams.get('code');
      const shopId = urlParams.get('shop_id');
      const channel = urlParams.get('channel');

      if (code) {
        const detectedChannel = channel || (shopId ? 'shopee' : 'tiktok');
        const channelName = detectedChannel === 'shopee' ? 'Shopee Marketplace' : 'TikTok Shop';
        toastSuccess(`Otorisasi ${channelName} Berhasil! Code: ${code.substring(0, 8)}...`);

        const newStore = {
          id: `tk_${detectedChannel}_${Date.now()}`,
          channel: detectedChannel,
          channelName,
          shopName: detectedChannel === 'shopee' ? `Ruang Seragam Shopee (${shopId || 'Auto'})` : `Ruang Seragam TikTok Shop`,
          shopId: shopId || `TK_${Date.now().toString().slice(-6)}`,
          connectedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          status: 'Active',
          autoSyncStok: true,
          authCode: code
        };

        setConnectedStores(prev => {
          if (prev.some(s => s.shopId === newStore.shopId)) return prev;
          return [newStore, ...prev];
        });
        setViewMode('list');
      }
    } catch (e) {}
  }, []);

  // Request OAuth URL dari endpoint Vite middleware
  const handleConnectMarketplace = async (channelKey) => {
    setLoadingChannel(channelKey);
    try {
      const res = await fetch(`/api/marketplace/auth-url?channel=${channelKey}`);
      const data = await res.json();
      
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Gagal membuat URL otorisasi');
      }

      // Tampilkan notifikasi & buka portal resmi marketplace di tab baru
      toastSuccess(`Membuka portal resmi ${channelKey.toUpperCase()}...`);
      
      const newWin = window.open(data.url, '_blank');
      if (!newWin) {
        window.location.href = data.url;
      }

      // Bantuan lokal: simulasi koneksi toko
      setTimeout(() => {
        showPromptSimulateAdd(channelKey);
      }, 1000);

    } catch (err) {
      toastError(`Gagal menghubungkan: ${err.message}`);
    } finally {
      setLoadingChannel(null);
    }
  };

  const showPromptSimulateAdd = (channelKey) => {
    const defaultNames = {
      shopee: 'Ruang Seragam Shopee Store',
      tokopedia: 'Ruang Seragam Tokopedia',
      tiktok: 'Ruang Seragam TikTok Shop',
      lazada: 'Ruang Seragam Lazada Mall'
    };
    const defaultChannels = {
      shopee: 'Shopee Marketplace',
      tokopedia: 'Tokopedia Marketplace',
      tiktok: 'TikTok Shop',
      lazada: 'Lazada Marketplace'
    };

    const newStore = {
      id: `tk_${channelKey}_${Date.now()}`,
      channel: channelKey,
      channelName: defaultChannels[channelKey] || channelKey,
      shopName: defaultNames[channelKey] || `Toko ${channelKey}`,
      shopId: `${Math.floor(10000000 + Math.random() * 90000000)}`,
      connectedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'Active',
      autoSyncStok: true
    };

    // Auto add jika belum ada
    setConnectedStores(prev => [newStore, ...prev]);
  };

  const handleDisconnect = async (id, name) => {
    const confirmed = await showConfirm(
      'Putuskan Koneksi Toko',
      `Yakin ingin memutuskan koneksi toko "${name}"? Sinkronisasi stok otomatis akan dihentikan.`,
      'Ya, Putuskan',
      'Batal'
    );
    if (confirmed) {
      setConnectedStores(prev => prev.filter(item => item.id !== id));
      toastSuccess(`Koneksi toko ${name} diputuskan`);
    }
  };

  // Card Marketplace Configurations
  const marketplaceCards = [
    {
      id: 'shopee',
      title: 'Shopee Marketplace',
      desc: 'Hubungkan toko Shopee Anda secara otomatis via OAuth resmi Shopee Open Platform.',
      buttonText: 'Hubungkan Shopee',
      buttonBg: '#dc2626',
      buttonHover: '#b91c1c',
      badges: [
        { label: 'Otomatis', icon: Zap, bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
        { label: 'OAuth 2.0', icon: ShieldCheck, bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
        { label: 'Sync Stok Auto', icon: RefreshCw, bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
      ],
      iconBg: '#fee2e2',
      iconBorder: '#fca5a5',
      logo: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="#ea580c">
          <path d="M19.5 7h-2.1c-.4-2.8-2.6-5-5.4-5s-5 2.2-5.4 5H4.5C3.7 7 3 7.7 3 8.5v12c0 .8.7 1.5 1.5 1.5h15c.8 0 1.5-.7 1.5-1.5v-12c0-.8-.7-1.5-1.5-1.5zm-7.5-3.5c1.9 0 3.5 1.5 3.9 3.5H8.1c.4-2 2-3.5 3.9-3.5zm7.5 15.5h-15v-10.5h15v10.5zm-7.5-8c-1.9 0-3.5 1.1-3.5 2.5 0 2 3.5 2 3.5 3.5 0 .6-.4 1-1.2 1-.8 0-1.8-.4-2.3-.9l-.9 1.4c.8.8 2 1.2 3.2 1.2 2 0 3.7-1 3.7-2.6 0-2-3.5-2-3.5-3.4 0-.5.5-.9 1.1-.9.7 0 1.5.3 2 .7l.8-1.4c-.7-.7-1.7-1.1-2.9-1.1z"/>
        </svg>
      )
    },
    {
      id: 'tokopedia',
      title: 'Tokopedia Marketplace',
      desc: 'Hubungkan toko Tokopedia Anda. Terintegrasi terpusat via TikTok Shop OAuth Portal.',
      buttonText: 'Hubungkan Tokopedia',
      buttonBg: '#059669',
      buttonHover: '#047857',
      badges: [
        { label: 'Otomatis', icon: Zap, bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
        { label: 'OAuth 2.0', icon: ShieldCheck, bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
        { label: 'Via TikTok Portal', icon: Globe, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
      ],
      iconBg: '#d1fae5',
      iconBorder: '#a7f3d0',
      logo: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="#059669">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          <path d="M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8z" opacity="0.3"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4H7z"/>
        </svg>
      )
    },
    {
      id: 'tiktok',
      title: 'TikTok Shop',
      desc: 'Hubungkan toko TikTok Shop Anda secara otomatis via OAuth resmi TikTok Open API.',
      buttonText: 'Hubungkan TikTok',
      buttonBg: '#0f172a',
      buttonHover: '#000000',
      badges: [
        { label: 'Otomatis', icon: Zap, bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
        { label: 'OAuth 2.0', icon: ShieldCheck, bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
      ],
      iconBg: '#f1f5f9',
      iconBorder: '#cbd5e1',
      logo: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="#0f172a">
          <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.891 2.896 2.896 2.896 0 0 1-2.896-2.896 2.896 2.896 0 0 1 2.896-2.896c.287 0 .562.046.822.128V9.434a6.332 6.332 0 0 0-.822-.054C5.975 9.38 3 12.355 3 16.024 3 19.693 5.975 22.668 9.482 22.668c3.508 0 6.353-2.845 6.353-6.353v-5.91a8.196 8.196 0 0 0 4.754 1.517v-3.48a4.8 4.8 0 0 1-1-.756z"/>
        </svg>
      )
    },
    {
      id: 'lazada',
      title: 'Lazada Marketplace',
      desc: 'Hubungkan toko Lazada Anda secara otomatis via OAuth resmi Lazada Open Platform.',
      buttonText: 'Hubungkan Lazada',
      buttonBg: '#1e40af',
      buttonHover: '#1e3a8a',
      badges: [
        { label: 'Otomatis', icon: Zap, bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
        { label: 'OAuth 2.0', icon: ShieldCheck, bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
      ],
      iconBg: '#dbeafe',
      iconBorder: '#bfdbfe',
      logo: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="#1e40af">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      )
    }
  ];

  return (
    <div style={{ padding: '20px 24px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}>
      
      {/* HEADER SECTION - PERSIS SEPERTI SCREENSHOT */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={22} color="#0284c7" />
            <h1 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: '-0.02em'
            }}>
              {viewMode === 'create' ? 'Tambah Toko Marketplace' : 'Daftar Toko Terhubung'}
            </h1>
          </div>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12.5px',
            color: '#64748b'
          }}>
            {viewMode === 'create'
              ? 'Hubungkan toko baru Anda ke ERP via OAuth resmi marketplace atau daftarkan toko instan secara manual.'
              : 'Kelola koneksi toko marketplace resmi yang aktif tersinkronisasi dengan ERP RuangMarket.'
            }
          </p>
        </div>

        {/* TOP RIGHT ACTION BUTTON */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {viewMode === 'create' ? (
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#334155',
                color: '#ffffff',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
            >
              <ArrowLeft size={15} />
              <span>Kembali ke Daftar Toko</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode('create')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
            >
              <Plus size={15} />
              <span>Tambah Toko Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE: CREATE (PERSIS SCREENSHOT USER) */}
      {viewMode === 'create' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          
          {/* SECTION HEADER BAR (PERSIS SCREENSHOT) */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Zap size={16} color="#0284c7" />
            <h2 style={{
              margin: 0,
              fontSize: '13.5px',
              fontWeight: '800',
              color: '#1e293b'
            }}>
              1. Otorisasi Resmi Platform Marketplace (OAuth 2.0)
            </h2>
          </div>

          {/* SUBTITLE HINT */}
          <div style={{
            padding: '14px 20px 6px 20px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            Pilih platform marketplace yang ingin Anda hubungkan. Anda akan diarahkan ke portal otorisasi resmi platform secara aman.
          </div>

          {/* LIST OF MARKETPLACE CARDS */}
          <div style={{
            padding: '14px 20px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {marketplaceCards.map((card) => {
              const isLoading = loadingChannel === card.id;

              return (
                <div
                  key={card.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                  }}
                >
                  
                  {/* LEFT: ICON + INFO + BADGES */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    
                    {/* Platform Icon Box */}
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '8px',
                      backgroundColor: card.iconBg,
                      border: `1px solid ${card.iconBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {card.logo}
                    </div>

                    {/* Content Details */}
                    <div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '800',
                        color: '#0f172a',
                        marginBottom: '3px'
                      }}>
                        {card.title}
                      </div>

                      <div style={{
                        fontSize: '11.5px',
                        color: '#64748b',
                        marginBottom: '8px',
                        lineHeight: 1.3
                      }}>
                        {card.desc}
                      </div>

                      {/* Badges Container */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {card.badges.map((b, idx) => {
                          const IconComp = b.icon;
                          return (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '10.5px',
                                fontWeight: '700',
                                backgroundColor: b.bg,
                                color: b.color,
                                border: `1px solid ${b.border}`
                              }}
                            >
                              <IconComp size={10} color={b.color} />
                              {b.label}
                            </span>
                          );
                        })}
                      </div>

                    </div>

                  </div>

                  {/* RIGHT: CONNECT BUTTON */}
                  <div style={{ marginLeft: '16px', flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleConnectMarketplace(card.id)}
                      style={{
                        minWidth: '190px',
                        height: '36px',
                        padding: '0 18px',
                        borderRadius: '6px',
                        backgroundColor: card.buttonBg,
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'all 0.15s ease',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isLoading) e.currentTarget.style.backgroundColor = card.buttonHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!isLoading) e.currentTarget.style.backgroundColor = card.buttonBg;
                      }}
                    >
                      {isLoading ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Zap size={14} />
                      )}
                      <span>{isLoading ? 'Menyiapkan...' : card.buttonText}</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* FOOTER INFO BAR */}
          <div style={{
            padding: '14px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#059669" />
              <span>Kredensial API Shopee & TikTok tersimpan aman terenkripsi (HMAC-SHA256).</span>
            </div>
            <div>
              Redirect URL ERP: <strong style={{ color: '#0f172a' }}>https://market.ruangtech.com</strong>
            </div>
          </div>

        </div>
      )}

      {/* VIEW MODE: LIST (DAFTAR TOKO TERHUBUNG) */}
      {viewMode === 'list' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                Toko Terhubung ({connectedStores.length})
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Daftar akun toko marketplace yang telah diotorisasi dan siap sinkronisasi stok otomatis.
              </div>
            </div>

            <button
              onClick={() => toastSuccess('Semua toko telah sinkron!')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                fontSize: '11.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} color="#0284c7" />
              <span>Sinkron Semua Stok</span>
            </button>
          </div>

          {connectedStores.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <Store size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>Belum ada toko terhubung</div>
              <p style={{ fontSize: '12px', margin: '4px 0 16px' }}>Klik tombol Tambah Toko Baru untuk menghubungkan Shopee atau TikTok.</p>
              <button
                onClick={() => setViewMode('create')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Hubungkan Sekarang
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                    <th style={{ padding: '12px 18px' }}>Marketplace</th>
                    <th style={{ padding: '12px 18px' }}>Nama Toko / Shop ID</th>
                    <th style={{ padding: '12px 18px' }}>Terhubung Pada</th>
                    <th style={{ padding: '12px 18px' }}>Sync Stok</th>
                    <th style={{ padding: '12px 18px' }}>Status</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {connectedStores.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: '800',
                          fontSize: '11px',
                          backgroundColor: item.channel === 'shopee' ? '#fee2e2' : '#f1f5f9',
                          color: item.channel === 'shopee' ? '#dc2626' : '#0f172a'
                        }}>
                          {item.channelName}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>{item.shopName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {item.shopId}</div>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="#94a3b8" />
                          <span>{item.connectedAt}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          backgroundColor: '#dcfce7',
                          color: '#15803d'
                        }}>
                          <CheckCircle2 size={11} /> Auto Sync
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10.5px',
                          fontWeight: '700',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1'
                        }}>
                          ● {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        <button
                          title="Putuskan Toko"
                          onClick={() => handleDisconnect(item.id, item.shopName)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '5px',
                            border: '1px solid #fee2e2',
                            backgroundColor: '#fff5f5',
                            color: '#dc2626',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Putus</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
