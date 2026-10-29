const testData = {
  items: [
    {
      // 1. Should SKIP if identical (or update if something changed)
      kode_sku: 'BB-TH-MERAH-LPJ-S',
      nama_produk: 'Baju Batik Tunas Harapan Merah Lengan Panjang Size S',
      kategori: 'Baju Batik',
      satuan: 'PCS',
      harga_jual: 85000,
      harga_modal: 55000,
      stok_fisik: 50,
      status: 'Aktif',
      status_order: 'Ready Stok',
      tipe_set: 'Single',
      sku_kain: 'KB-TH-MERAH',
      estimasi_kain: 'Kain Batik TH Merah',
      panjang_kain_cm: 200,
      harga_kain_cm: 150
    },
    {
      // 2. Should INSERT as new product
      kode_sku: 'TEST-SKU-BARU-01',
      nama_produk: 'Test Kemeja Baru Smart Import',
      kategori: 'Kemeja',
      satuan: 'PCS',
      harga_jual: 99000,
      harga_modal: 60000,
      stok_fisik: 10,
      status: 'Aktif',
      status_order: 'Ready Stok',
      tipe_set: 'Single',
      sku_kain: 'KB-TH-MERAH',
      panjang_kain_cm: 200,
      harga_kain_cm: 150
    }
  ]
};

async function run() {
  const res = await fetch('http://localhost:5010/api/marketplace/master/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  const data = await res.json();
  console.log('Result 1 (1 new, 1 maybe skip or update):', JSON.stringify(data, null, 2));

  // Run 2nd time immediately - BOTH should now SKIP because both exist and identical!
  const res2 = await fetch('http://localhost:5010/api/marketplace/master/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  const data2 = await res2.json();
  console.log('Result 2 (Both should be SKIP):', JSON.stringify(data2, null, 2));

  // Run 3rd time with 1 change on TEST-SKU-BARU-01 - should UPDATE!
  testData.items[1].harga_jual = 120000;
  const res3 = await fetch('http://localhost:5010/api/marketplace/master/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });
  const data3 = await res3.json();
  console.log('Result 3 (1 SKIP, 1 UPDATE):', JSON.stringify(data3, null, 2));
  // Cleanup: Delete TEST-SKU-BARU-01
  const masterRes = await fetch('http://localhost:5010/api/marketplace/master?search=TEST-SKU-BARU-01');
  const masterData = await masterRes.json();
  const list = Array.isArray(masterData) ? masterData : (masterData.data || []);
  const testProduct = list.find(p => p.kode_sku === 'TEST-SKU-BARU-01');
  if (testProduct?.id) {
    await fetch(`http://localhost:5010/api/marketplace/master/${testProduct.id}`, { method: 'DELETE' });
    console.log('Test product cleaned up successfully.');
  }
}

run().catch(console.error);
