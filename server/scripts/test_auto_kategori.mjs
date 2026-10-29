
async function main() {
  const host = process.env.API_HOST || 'http://localhost:5010';
  console.log('Testing on:', host);

  // 1. GET kategori
  const getRes = await fetch(`${host}/api/marketplace/kategori`);
  const getJson = await getRes.json();
  console.log('GET Kategori count:', getJson.data?.length);

  // 2. Import produk dengan kategori baru
  const testSku = 'TEST-AUTO-KAT-' + Date.now();
  const testKat = 'Kategori_Otomatis_' + Date.now();
  console.log(`Menguji import dengan SKU: ${testSku}, Kategori: ${testKat}`);

  const importRes = await fetch(`${host}/api/marketplace/master/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kode_perusahaan: 'RSG',
      items: [{
        kode_sku: testSku,
        nama_produk: 'Produk Auto Kat Test',
        kategori: testKat,
        satuan: 'PCS',
        harga_jual: 50000,
        harga_modal: 30000,
        stok_fisik: 10,
        sku_kain: 'KB-TEST',
        estimasi_kain: '150'
      }]
    })
  });

  const importJson = await importRes.json();
  console.log('Import summary:', importJson.summary);
  console.log('New categories returned:', importJson.new_categories);

  // 3. Verifikasi kategori ada di master_kategori
  const verifyRes = await fetch(`${host}/api/marketplace/kategori`);
  const verifyJson = await verifyRes.json();
  const found = verifyJson.data?.some(k => k.nama === testKat);
  console.log('Kategori baru ada di DB master_kategori:', found ? 'BERHASIL (TRUE)' : 'GAGAL (FALSE)');

  // 4. Bersihkan test data
  const delProd = await fetch(`${host}/api/marketplace/master?search=${testSku}`);
  const delJson = await delProd.json();
  if (delJson.data?.[0]?.id) {
    await fetch(`${host}/api/marketplace/master/${delJson.data[0].id}`, { method: 'DELETE' });
    console.log('Produk test dibersihkan');
  }

  const katItem = verifyJson.data?.find(k => k.nama === testKat);
  if (katItem?.id) {
    await fetch(`${host}/api/marketplace/kategori/${katItem.id}`, { method: 'DELETE' });
    console.log('Kategori test dibersihkan');
  }
}

main().catch(console.error);
