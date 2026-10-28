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
  if (/\bpre-?order\b/i.test(combined)) return 'PO';
  if (/\bPO\b/i.test(combined)) return 'PO';
  if (/\bPO[-_/\s]?\d+/i.test(combined)) return 'PO';

  return 'Ready Stok';
}
