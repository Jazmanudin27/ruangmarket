import { pool } from '../config/db.js';
import { RAW_MAPPING } from './seed_master_kain.mjs';

// 1. Build lookup map from RAW_MAPPING
const rawMap = new Map();
RAW_MAPPING.trim().split('\n').forEach(line => {
  const parts = line.split(/\t+|\s{2,}/);
  if (parts.length >= 2) {
    rawMap.set(parts[0].trim().toUpperCase(), parts[1].trim());
  }
});

// 2. Pattern detector for SKU Kain
export function detectSkuKain(sku = '', nama = '', existingSkuKain = null) {
  if (existingSkuKain) return existingSkuKain;
  const s = String(sku).toUpperCase().trim();
  const n = String(nama).toUpperCase().trim();

  // Clean RSG- prefix
  const cleanSku = s.startsWith('RSG-') ? s.substring(4) : s;

  // Direct lookup
  if (rawMap.has(cleanSku)) return rawMap.get(cleanSku);

  // Strip size at the end (-S, -M, -L, -XL, -XXL, -XXXL, -4, -6, etc.)
  const noSize = cleanSku.replace(/-(XXXL|XXL|XL|XS|S|M|L|XXS|[0-9]+)$/, '');
  if (rawMap.has(noSize)) return rawMap.get(noSize);

  // Pattern detection:
  // Batik Tunas Harapan (TH)
  if (cleanSku.includes('TH-MERAH') || (cleanSku.includes('TH') && (cleanSku.includes('MERAH') || cleanSku.includes('SD') || n.includes('SD')))) {
    return 'KB-TH-MERAH';
  }
  if (cleanSku.includes('TH-BIRU') || cleanSku.includes('TH-SPM') || (cleanSku.includes('TH') && (cleanSku.includes('BIRU') || cleanSku.includes('SMP') || cleanSku.includes('SPM') || n.includes('SMP')))) {
    return 'KB-TH-BIRU';
  }
  if (cleanSku.includes('TH-ABU') || (cleanSku.includes('TH') && (cleanSku.includes('ABU') || cleanSku.includes('SMA') || n.includes('SMA')))) {
    return 'KB-TH-ABU';
  }
  if (cleanSku.includes('TH-HIJAU') || (cleanSku.includes('TH') && cleanSku.includes('HIJAU'))) {
    return 'KB-TH-HIJAU';
  }

  // Batik lainnya
  if (cleanSku.includes('MI-JBR') || n.includes('MI JABAR')) return 'KB-MI-JBR';
  if (cleanSku.includes('BR-MERAH') || (cleanSku.includes('BR') && cleanSku.includes('MERAH'))) return 'KB-BR-MERAH';
  if (cleanSku.includes('BR-BIRU') || (cleanSku.includes('BR') && cleanSku.includes('BIRU'))) return 'KB-BR-BIRU';
  if (cleanSku.includes('BR-ABU') || (cleanSku.includes('BR') && cleanSku.includes('ABU'))) return 'KB-BR-ABU';
  if (cleanSku.includes('BN-HIJAU') || (cleanSku.includes('BN') && cleanSku.includes('HIJAU'))) return 'KB-BN-HIJAU';
  if (cleanSku.includes('BM-MERAH') || (cleanSku.includes('BM') && cleanSku.includes('MERAH'))) return 'KB-BM-MERAH';
  if (cleanSku.includes('BM-BIRU') || (cleanSku.includes('BM') && cleanSku.includes('BIRU'))) return 'KB-BM-BIRU';
  if (cleanSku.includes('BM-DONGKER') || (cleanSku.includes('BM') && cleanSku.includes('DONGKER'))) return 'KB-BM-DONGKER';
  if (cleanSku.includes('BB-MERAH')) return 'KB-BB-MERAH';
  if (cleanSku.includes('BL-MERAH')) return 'KB-BL-MERAH';
  if (cleanSku.includes('POR') || n.includes('BATIK POR')) return 'KB-POR';

  // Kain Polos / Seragam
  if (cleanSku.includes('CLF-PUTIH') || (cleanSku.includes('CLF') && cleanSku.includes('PUTIH'))) return 'K-CLF-PUTIH';
  if (cleanSku.includes('CLF') || cleanSku.includes('CALISTA')) return 'K-CLF';
  if (cleanSku.includes('OXFORD') || cleanSku.includes('OXFRD')) return 'K-OXFRD';
  if (cleanSku.includes('GM') || n.includes('KATUN GM')) return 'K-GM';
  if (cleanSku.includes('DRILL-UON') || cleanSku.includes('DRIL-UON')) return 'K-DRILL-UON';
  if (cleanSku.includes('DRIL') || cleanSku.includes('DRILL')) return 'K-DRIL';
  if (cleanSku.includes('SW') || n.includes('SEMI WOOL')) return 'K-SW';
  if (cleanSku.includes('CR')) return 'K-CR';
  if (cleanSku.includes('DN') || n.includes('DENIM') || n.includes('NAVY')) return 'K-DN';

  return null;
}

// 3. Pattern detector for ID Kategori HPP
export function detectIdKategoriHpp(sku = '', nama = '', existingHppList = []) {
  const s = String(sku).toUpperCase().trim();
  const n = String(nama).toUpperCase().trim();

  // Helper jenjang
  let jenjang = null;
  if (s.includes('TK') || n.includes('(TK)') || n.includes(' TK')) jenjang = 'TK';
  else if (s.includes('SMP') || s.includes('SPM') || n.includes('(SMP)') || n.includes(' SMP')) jenjang = 'SMP';
  else if (s.includes('SMA') || s.includes('SMK') || n.includes('(SMA)') || n.includes(' SMA')) jenjang = 'SMA';
  else if (s.includes('SD') || n.includes('(SD)') || n.includes(' SD')) jenjang = 'SD';
  else if (s.includes('DEWASA') || n.includes('(DEWASA)') || n.includes(' DEWASA')) jenjang = 'DEWASA';

  // Helper model / pakaian
  let model = null;
  if (s.includes('ROK-RAMPEL') || n.includes('ROK RAMPEL')) model = 'ROK-RAMPEL';
  else if (s.includes('ROK') || n.includes('ROK')) model = 'ROK';
  else if (s.includes('CLN') || s.includes('CELANA') || n.includes('CELANA')) model = 'CELANA';
  else if (s.includes('GAMIS') || n.includes('GAMIS')) model = 'GAMIS';
  else if (s.includes('TUNIK') || n.includes('TUNIK')) model = 'TUNIK';
  else if (s.includes('KURUNG') || n.includes('KURUNG')) model = 'KURUNG';
  else if (s.includes('KOKO') || n.includes('KOKO')) model = 'KOKO';
  else if (s.includes('ROMPI') || n.includes('ROMPI')) model = 'ROMPI';
  else if (s.includes('SETOLG') || s.includes('OLAHRAGA') || n.includes('OLAHRAGA')) model = 'OLAHRAGA';
  else if (s.includes('KEMEJA') || s.includes('KP-') || s.includes('BP-') || s.includes('BB-') || n.includes('KEMEJA') || n.includes('BATIK')) model = 'KEMEJA';

  // Helper panjang / pendek
  let panjang = null;
  if (s.includes('LPJ') || s.includes('PNJ') || s.includes('PANJANG') || n.includes('PANJANG')) panjang = 'PANJANG';
  else if (s.includes('LPK') || s.includes('PNDK') || s.includes('PENDEK') || n.includes('PENDEK')) panjang = 'PENDEK';

  // Cari match di existingHppList
  if (existingHppList && existingHppList.length > 0) {
    // 1. Direct match with ID pattern
    const candidates = existingHppList.filter(h => {
      const hid = h.id_kategori_hpp.toUpperCase();
      if (jenjang && !hid.includes(jenjang)) return false;
      if (panjang && !hid.includes(panjang)) return false;
      if (model && !hid.includes(model)) return false;
      return true;
    });

    if (candidates.length > 0) {
      // Prioritaskan yang paling mendekati / spesifik
      return candidates[0].id_kategori_hpp;
    }

    // Fallback: match by jenjang & model
    const fallback = existingHppList.filter(h => {
      const hid = h.id_kategori_hpp.toUpperCase();
      if (jenjang && !hid.includes(jenjang)) return false;
      if (model && !hid.includes(model)) return false;
      return true;
    });
    if (fallback.length > 0) return fallback[0].id_kategori_hpp;
  }

  // Construct fallback ID
  if (model && jenjang) {
    if (panjang) return `HPP-${model}-LENGAN-${panjang}-${jenjang}`;
    return `HPP-${model}-${jenjang}`;
  }

  return null;
}

async function testDetection() {
  const [hppRows] = await pool.query('SELECT id_kategori_hpp, nama_kategori_hpp FROM master_hpp_produk');
  const [prods] = await pool.query('SELECT kode_sku, nama_produk, sku_kain, id_kategori_hpp FROM produk_master LIMIT 50');

  console.log('Testing auto-detection on 50 products:');
  const results = prods.map(p => {
    const detectedKain = detectSkuKain(p.kode_sku, p.nama_produk, p.sku_kain);
    const detectedHpp = detectIdKategoriHpp(p.kode_sku, p.nama_produk, hppRows);
    return {
      sku: p.kode_sku,
      kain_orig: p.sku_kain || '-',
      kain_auto: detectedKain || '-',
      hpp_auto: detectedHpp || '-'
    };
  });

  console.table(results.slice(0, 30));

  // Test specifically user's example: BB-TH-SPM-L
  console.log('--- USER EXAMPLE TEST ---');
  console.log('BB-TH-SPM-L:');
  console.log('Detected Kain:', detectSkuKain('BB-TH-SPM-L', 'Batik Tunas Harapan SMP Lengan Panjang'));
  console.log('Detected HPP:', detectIdKategoriHpp('BB-TH-SPM-L', 'Batik Tunas Harapan SMP Lengan Panjang', hppRows));

  process.exit(0);
}

if (process.argv[1] && process.argv[1].endsWith('test_detection.mjs')) {
  testDetection().catch(console.error);
}
