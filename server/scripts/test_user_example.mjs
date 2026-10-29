async function testUserImport() {
  const host = process.env.API_HOST || 'http://localhost:5010';

  console.log('Testing import with user example: BB-TH-SPM-L (empty kain & empty HPP)...');
  const payload = {
    kode_perusahaan: 'RSG',
    items: [{
      kode_sku: 'BB-TH-SPM-L',
      nama_produk: 'Baju Batik Tunas Harapan SMP Lengan Panjang Size L',
      kategori: 'Baju Batik',
      satuan: 'PCS',
      harga_jual: 85000,
      harga_modal: 55000,
      stok_fisik: 50,
      sku_kain: '', // sengaja dikosongkan
      id_kategori_hpp: '' // sengaja dikosongkan
    }]
  };

  const res = await fetch(`${host}/api/marketplace/master/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  console.log('Import Response Summary:', json.summary);

  // Periksa apakah produk tersimpan dengan SKU Kain dan Kategori HPP terdeteksi
  const getRes = await fetch(`${host}/api/marketplace/master?search=BB-TH-SPM-L`);
  const getJson = await getRes.json();
  const prod = getJson.data?.[0];
  console.log('Saved Product in DB:', {
    sku: prod?.kode_sku,
    nama: prod?.nama_produk,
    sku_kain: prod?.sku_kain,
    id_kategori_hpp: prod?.id_kategori_hpp
  });

  // Test Auto Detect All endpoint
  console.log('\nTesting POST /api/marketplace/master/auto-detect-all...');
  const autoRes = await fetch(`${host}/api/marketplace/master/auto-detect-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const autoJson = await autoRes.json();
  console.log('Auto Detect All result:', autoJson);
}

testUserImport().catch(console.error);
