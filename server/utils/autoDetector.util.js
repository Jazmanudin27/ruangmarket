import { RAW_MAPPING } from '../scripts/seed_master_kain.mjs';

// Pre-index raw mapping untuk pencarian instan O(1)
const rawMap = new Map();
if (RAW_MAPPING) {
  RAW_MAPPING.trim().split('\n').forEach(line => {
    const parts = line.split(/\t+|\s{2,}/);
    if (parts.length >= 2) {
      rawMap.set(parts[0].trim().toUpperCase(), parts[1].trim());
    }
  });
}

/**
 * Deteksi SKU Kain otomatis berdasarkan SKU dan Nama Produk
 */
export function detectSkuKain(sku = '', nama = '', existingSkuKain = null) {
  if (existingSkuKain && String(existingSkuKain).trim() !== '') {
    return String(existingSkuKain).trim();
  }

  const s = String(sku || '').toUpperCase().trim();
  const n = String(nama || '').toUpperCase().trim();
  if (!s && !n) return null;

  // Hapus prefix RSG-
  const cleanSku = s.startsWith('RSG-') ? s.substring(4) : s;

  // 1. Cek mapping kamus presisi langsung
  if (rawMap.has(cleanSku)) return rawMap.get(cleanSku);

  // 2. Cek kamus tanpa akhiran ukuran (-S, -M, -L, -XL, -XXL, -XXXL, -4, -6, dsb)
  const noSize = cleanSku.replace(/-(XXXL|XXL|XL|XS|S|M|L|XXS|[0-9]+)$/, '');
  if (rawMap.has(noSize)) return rawMap.get(noSize);

  // 3a. Deteksi Bundle / Setelan (awalan SET-)
  // Contoh: SET-BB-TH-BIRU-... -> deteksi dari komponen pertamanya
  if (cleanSku.startsWith('SET-')) {
    const afterSet = cleanSku.substring(4);
    const firstPart = afterSet.split(/-(?:CLN|ROK|CELANA)/)[0];
    const subDetect = detectSkuKain(firstPart, n);
    if (subDetect) return subDetect;
  }

  // 3b. Deteksi Pola Cerdas (Batik Tunas Harapan - TH)
  if (cleanSku.includes('TH-MERAH') || (cleanSku.includes('TH') && (cleanSku.includes('MERAH') || cleanSku.includes('SD') || n.includes('SD') || n.includes('MERAH')))) {
    return 'KB-TH-MERAH';
  }
  if (
    cleanSku.includes('TH-BIRU') || 
    cleanSku.includes('TH-SPM') || 
    cleanSku.includes('TH-SMP') || 
    (cleanSku.includes('TH') && (cleanSku.includes('BIRU') || cleanSku.includes('SMP') || cleanSku.includes('SPM') || n.includes('SMP') || n.includes('BIRU')))
  ) {
    return 'KB-TH-BIRU';
  }
  if (cleanSku.includes('TH-ABU') || (cleanSku.includes('TH') && (cleanSku.includes('ABU') || cleanSku.includes('SMA') || n.includes('SMA') || n.includes('ABU')))) {
    return 'KB-TH-ABU';
  }
  if (cleanSku.includes('TH-HIJAU') || (cleanSku.includes('TH') && (cleanSku.includes('HIJAU') || n.includes('HIJAU')))) {
    return 'KB-TH-HIJAU';
  }

  // 4. Deteksi Pola Cerdas (Batik Motif Lainnya)
  if (cleanSku.includes('MI-JBR') || n.includes('MI JABAR')) return 'KB-MI-JBR';
  if (cleanSku.includes('BR-MERAH') || (cleanSku.includes('BR') && (cleanSku.includes('MERAH') || n.includes('MERAH')))) return 'KB-BR-MERAH';
  if (cleanSku.includes('BR-BIRU') || (cleanSku.includes('BR') && (cleanSku.includes('BIRU') || n.includes('BIRU')))) return 'KB-BR-BIRU';
  if (cleanSku.includes('BR-ABU') || (cleanSku.includes('BR') && (cleanSku.includes('ABU') || n.includes('ABU')))) return 'KB-BR-ABU';
  if (cleanSku.includes('BN-HIJAU') || (cleanSku.includes('BN') && (cleanSku.includes('HIJAU') || n.includes('HIJAU')))) return 'KB-BN-HIJAU';
  if (cleanSku.includes('BM-MERAH') || (cleanSku.includes('BM') && (cleanSku.includes('MERAH') || n.includes('MERAH')))) return 'KB-BM-MERAH';
  if (cleanSku.includes('BM-BIRU') || (cleanSku.includes('BM') && (cleanSku.includes('BIRU') || n.includes('BIRU')))) return 'KB-BM-BIRU';
  if (cleanSku.includes('BM-DONGKER') || (cleanSku.includes('BM') && (cleanSku.includes('DONGKER') || n.includes('DONGKER') || n.includes('NAVY')))) return 'KB-BM-DONGKER';
  if (cleanSku.includes('BB-MERAH') || (cleanSku.includes('BB') && (cleanSku.includes('MERAH') || n.includes('MERAH')))) return 'KB-BB-MERAH';
  if (cleanSku.includes('BL-MERAH') || (cleanSku.includes('BL') && (cleanSku.includes('MERAH') || n.includes('MERAH')))) return 'KB-BL-MERAH';
  if (cleanSku.includes('POR') || n.includes('BATIK POR')) return 'KB-POR';

  // 5. Deteksi Baju Putih / Kemeja Putih / Kurung Putih / Koko Putih
  if (
    cleanSku.startsWith('BP-') || 
    cleanSku.includes('PUTIH') || 
    cleanSku.includes('-PUTIH-') || 
    cleanSku.startsWith('SET-BP-') ||
    n.includes('PUTIH') || 
    n.includes('KEMEJA PUTIH') ||
    n.includes('KURUNG PUTIH') ||
    n.includes('KOKO PUTIH')
  ) {
    return 'K-CLF-PUTIH';
  }

  // 6. Deteksi Bahan Custom Khusus
  if (cleanSku.includes('PLY') || cleanSku.includes('POLYMICRO') || n.includes('POLYMICRO')) return 'K-PLY';
  if (cleanSku.includes('TYB') || cleanSku.includes('TOYOBO') || n.includes('TOYOBO')) return 'K-TYB';
  if (cleanSku.includes('BSY') || cleanSku.includes('BESWAY') || n.includes('BESWAY') || n.includes('BSY')) return 'K-BSY';
  if (cleanSku.includes('-PE-') || cleanSku.endsWith('-PE') || (cleanSku.includes('SETOLG') && cleanSku.includes('PE')) || n.includes('BAHAN PE')) return 'K-PE';
  if (cleanSku.includes('-CTN-') || cleanSku.endsWith('-CTN') || (cleanSku.includes('SETOLG') && cleanSku.includes('CTN')) || n.includes('CATOON') || n.includes('COTTON')) return 'K-CTN';
  if (cleanSku.includes('DIADORA') || n.includes('DIADORA')) return 'K-DIADORA';
  if (cleanSku.includes('LOTO') || n.includes('LOTO')) return 'K-LOTO';
  if (cleanSku.includes('KRUDUNG') || n.includes('KERUDUNG') || n.includes('JILBAB')) return 'K-CLF';

  // 7. Deteksi Kain Polos / Seragam Umum
  if (cleanSku.includes('CLF-PUTIH') || (cleanSku.includes('CLF') && (cleanSku.includes('PUTIH') || n.includes('PUTIH')))) return 'K-CLF-PUTIH';
  if (cleanSku.includes('CLF') || cleanSku.includes('CALISTA') || n.includes('CALISTA')) return 'K-CLF';
  if (cleanSku.includes('OXFORD') || cleanSku.includes('OXFRD') || n.includes('OXFORD')) return 'K-OXFRD';
  if (cleanSku.includes('GM') || n.includes('KATUN GM')) return 'K-GM';
  if (cleanSku.includes('DRILL-UON') || cleanSku.includes('DRIL-UON') || n.includes('UNION')) return 'K-DRILL-UON';
  if (cleanSku.includes('DRIL') || cleanSku.includes('DRILL') || n.includes('DRILL')) return 'K-DRIL';
  if (cleanSku.includes('SW') || n.includes('SEMI WOOL')) return 'K-SW';
  if (cleanSku.includes('CR') || n.includes(' KAIN CR')) return 'K-CR';
  if (cleanSku.includes('DN') || n.includes('DENIM') || n.includes('NAVY')) return 'K-DN';

  return null;
}

/**
 * Deteksi ID Kategori HPP otomatis berdasarkan SKU, Nama Produk, dan daftar Master HPP
 */
export function detectIdKategoriHpp(sku = '', nama = '', existingHppList = []) {
  const s = String(sku || '').toUpperCase().trim();
  const n = String(nama || '').toUpperCase().trim();
  if (!s && !n) return null;

  // 1. Deteksi Jenjang (TK, SD, SMP, SMA, DEWASA)
  let jenjang = null;
  if (s.includes('TK') || n.includes('(TK)') || n.includes(' TK ') || n.endsWith(' TK')) jenjang = 'TK';
  else if (s.includes('SMP') || s.includes('SPM') || n.includes('(SMP)') || n.includes(' SMP ') || n.endsWith(' SMP')) jenjang = 'SMP';
  else if (s.includes('SMA') || s.includes('SMK') || n.includes('(SMA)') || n.includes(' SMA ') || n.endsWith(' SMA')) jenjang = 'SMA';
  else if (s.includes('SD') || n.includes('(SD)') || n.includes(' SD ') || n.endsWith(' SD')) jenjang = 'SD';
  else if (s.includes('DEWASA') || n.includes('(DEWASA)') || n.includes(' DEWASA')) jenjang = 'DEWASA';

  // 2. Deteksi Model Pakaian
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

  // 3. Deteksi Panjang / Pendek
  let panjang = null;
  if (s.includes('LPJ') || s.includes('PNJ') || s.includes('PANJANG') || n.includes('PANJANG')) panjang = 'PANJANG';
  else if (s.includes('LPK') || s.includes('PNDK') || s.includes('PENDEK') || n.includes('PENDEK')) panjang = 'PENDEK';

  // 4. Cari kecocokan di database existingHppList
  if (existingHppList && existingHppList.length > 0) {
    // Cari yang match jenjang, panjang, dan model
    const exactMatches = existingHppList.filter(h => {
      const hid = (h.id_kategori_hpp || '').toUpperCase();
      if (jenjang && !hid.includes(jenjang)) return false;
      if (panjang && !hid.includes(panjang)) return false;
      if (model && !hid.includes(model)) return false;
      return true;
    });

    if (exactMatches.length > 0) {
      return exactMatches[0].id_kategori_hpp;
    }

    // Fallback: match jenjang dan model
    const jenjangModelMatches = existingHppList.filter(h => {
      const hid = (h.id_kategori_hpp || '').toUpperCase();
      if (jenjang && !hid.includes(jenjang)) return false;
      if (model && !hid.includes(model)) return false;
      return true;
    });

    if (jenjangModelMatches.length > 0) {
      return jenjangModelMatches[0].id_kategori_hpp;
    }
  }

  // 5. Fallback pembentukan ID standar jika daftar HPP belum lengkap
  if (model && jenjang) {
    if (panjang) return `HPP-${model}-LENGAN-${panjang}-${jenjang}`;
    return `HPP-${model}-${jenjang}`;
  }

  return null;
}
