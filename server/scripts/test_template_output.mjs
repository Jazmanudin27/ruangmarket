import XLSX from 'xlsx';

async function main() {
  const res = await fetch('http://127.0.0.1:5010/api/marketplace/master/template?format=xlsx');
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(Buffer.from(buf), { type: 'buffer' });
  console.log('Sheets di template:', wb.SheetNames);
  
  const ws = wb.Sheets['Referensi_SKU_Kain'];
  if (!ws) {
    console.error('Sheet Referensi_SKU_Kain TIDAK ADA!');
    process.exit(1);
  }
  
  const data = XLSX.utils.sheet_to_json(ws);
  console.log(`Total kain di referensi template: ${data.length}`);
  console.table(data.slice(0, 10));
  process.exit(0);
}

main().catch(err => {
  console.error('Error test:', err);
  process.exit(1);
});
