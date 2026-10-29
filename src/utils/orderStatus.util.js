/**
 * Deteksi otomatis apakah suatu produk berstatus PO (Pre-Order) atau Ready Stok.
 * Aturan:
 * - Mengandung kata "Custom" (misal: "Batik Custom", "Gamis Custom") -> PO
 * - Mengandung kata "PO" (berdiri sendiri / boundary, misal: "PO", "PO BATIK", "[PO]", "PO-01") -> PO
 * - Kata "POLOS", "PORSI", "POTONG", dsb TIDAK dianggap PO.
 * - Mengandung "Pre-Order" atau "Preorder" -> PO
 * Default jika tidak memenuhi kriteria: 'Ready Stok'
 */
export function detectStatusOrder(namaProduk = '', sku = '') {
  const combined = `${namaProduk || ''} ${sku || ''}`;

  if (/\bcustom\b/i.test(combined)) return 'PO';
  if (/\bpre[\s-_]?order\b/i.test(combined)) return 'PO';
  if (/\bpreorder\b/i.test(combined)) return 'PO';
  if (/\bPO\b/i.test(combined)) return 'PO';
  if (/\bPO[-_/\s]?\d+/i.test(combined)) return 'PO';

  return 'Ready Stok';
}

/**
 * Deteksi otomatis apakah suatu produk merupakan tipe Bundle / Satu Setel atau Single.
 * Aturan:
 * - SKU mengandung awalan 'SET-' atau pola bundle setelan (misal 'SET-BP-...', 'SETELAN')
 * - Nama mengandung 'Satu Setel', '1 Set', 'Setelan', 'Setel', 'Bundle', 'Paket'
 * - Default: 'Single'
 */
export function detectBundleSet(namaProduk = '', sku = '') {
  const combined = `${namaProduk || ''} ${sku || ''}`;

  if (/^SET-/i.test(sku?.trim() || '')) return 'Satu Setel';
  if (/\b(satu\s*setel|1\s*setel|1\s*set|setelan|bundle|paket)\b/i.test(combined)) return 'Satu Setel';

  return 'Single';
}

