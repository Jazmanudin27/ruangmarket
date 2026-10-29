import React, { useState } from 'react';
import { 
  Store, 
  RefreshCw, 
  Plus, 
  Download, 
  ShoppingCart, 
  Trash2, 
  CheckCircle2, 
  Clock,
  ShoppingBag
} from 'lucide-react';
import { toastSuccess, toastError, showConfirm } from '../../utils/alert.util';
import { getActiveCompany } from '../../utils/tenant.util';

const STORAGE_KEY_TOKO = 'ruangmarket_connected_stores_v1';

export default function MarketplaceMobileView({ onNavigate }) {
  const [activeCompany] = useState(getActiveCompany);
  const [connectedStores, setConnectedStores] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TOKO);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const handleDisconnect = async (id, name) => {
    const confirmed = await showConfirm(
      'Putuskan Koneksi Toko',
      `Yakin ingin memutuskan koneksi toko "${name}"?`,
      'Ya, Putuskan',
      'Batal'
    );
    if (confirmed) {
      try {
        await fetch(`/api/marketplace/stores/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Error disconnecting store:', err);
      }
      setConnectedStores(prev => {
        const updated = prev.filter(item => item.id !== id && item.shopId !== id);
        localStorage.setItem(STORAGE_KEY_TOKO, JSON.stringify(updated));
        return updated;
      });
      toastSuccess(`Koneksi toko ${name} diputuskan`);
    }
  };

  return (
    <div style={{ padding: '12px', width: '100%', boxSizing: 'border-box', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* HEADER CARD */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '12px',
        padding: '14px 16px',
        color: '#ffffff',
        marginBottom: '12px',
        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={20} />
            <span style={{ fontSize: '14px', fontWeight: '800' }}>Toko Marketplace</span>
          </div>
          <span style={{
            padding: '2px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            fontSize: '10px',
            fontWeight: '800'
          }}>
            {activeCompany.code}
          </span>
        </div>
        <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'rgba(255, 255, 255, 0.9)' }}>
          Koneksi toko aktif ({connectedStores.length} toko).
        </p>

        <button
          onClick={() => onNavigate && onNavigate('produk_marketplace')}
          style={{
            width: '100%',
            height: '34px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#ffffff',
            color: '#0284c7',
            fontSize: '11.5px',
            fontWeight: '800',
            cursor: 'pointer'
          }}
        >
          Lihat Katalog Produk Staging →
        </button>
      </div>

      {/* STORE CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {connectedStores.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '10px', color: '#94a3b8' }}>
            <Store size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div style={{ fontWeight: '700', color: '#64748b', fontSize: '13px' }}>Belum ada toko terhubung</div>
          </div>
        ) : (
          connectedStores.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              {/* Channel badge + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10.5px',
                  fontWeight: '800',
                  backgroundColor: item.channel === 'shopee' ? '#fee2e2' : '#f1f5f9',
                  color: item.channel === 'shopee' ? '#dc2626' : '#0f172a'
                }}>
                  <ShoppingBag size={11} />
                  <span>{item.channelName}</span>
                </span>

                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  backgroundColor: '#dcfce7',
                  color: '#15803d'
                }}>
                  ● {item.status || 'Active'}
                </span>
              </div>

              {/* Store Name & ID */}
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>
                {item.shopName}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                Shop ID: <code>{item.shopId}</code>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button
                  onClick={() => onNavigate && onNavigate('produk_marketplace')}
                  style={{
                    flex: 1,
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={12} />
                  <span>Tarik Produk</span>
                </button>

                <button
                  onClick={() => handleDisconnect(item.id, item.shopName)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fff5f5',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
