import React, { useState } from 'react';
import { FileText, Plus, Save, Sparkles, AlertCircle } from 'lucide-react';
import { toastSuccess } from '../../utils/alert.util';

export default function BlankTemplateView() {
  const [sampleInput, setSampleInput] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    toastSuccess('Contoh data berhasil disimpan!');
    setSampleInput('');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText style={{ width: '28px', height: '28px', color: '#0284c7' }} />
            Halaman Starter Baru (Boilerplate)
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Halaman ini adalah template dasar. Duplikasi file ini untuk membuat menu/fitur baru di project Anda.
          </p>
        </div>

        <button 
          onClick={() => toastSuccess('Tombol Aksi diklik')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
          }}
        >
          <Plus size={16} />
          Tombol Aksi Utama
        </button>
      </div>

      {/* SAMPLE CARD CONTAINER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* FORM CONTAINER */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Form Contoh Input</h3>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Nama Entitas / Field Input
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan teks di sini..."
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>

            <div>
              <button
                type="submit"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <Save size={16} />
                Simpan Entitas
              </button>
            </div>
          </form>
        </div>

        {/* INFO CARD */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Tips Menambah Halaman Baru</h3>
          <div style={{ display: 'flex', gap: '12px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <AlertCircle size={20} style={{ color: '#0284c7', flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: '#0369a1', lineHeight: 1.5 }}>
              Untuk menambah menu di top bar navigasi, buka <code>src/components/AdminLayout.jsx</code> dan tambahkan item pada array <code>navItems</code>.
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            Semua styling menggunakan class & tokens CSS yang sama dengan template E-Pesantren, sehingga konsistensi warna, font (Plus Jakarta Sans), radius, dan border tetap terjaga dengan rapi.
          </p>
        </div>

      </div>

    </div>
  );
}
