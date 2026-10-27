// Data Awal Perusahaan / Tenants
export const INITIAL_COMPANIES = [
  {
    id: 'cmp_01',
    code: 'RSG',
    name: 'Ruang Seragam',
    legalName: 'PT Ruang Seragam Indonesia',
    email: 'admin@ruangseragam.com',
    phone: '081234567890',
    address: 'Kawasan Industri Tekstil No. 12, Bandung',
    color: '#0284c7',
    status: 'Active',
    joinedAt: '2026-01-15'
  },
  {
    id: 'cmp_02',
    code: 'BRK',
    name: 'Berkah Tekstil',
    legalName: 'CV Berkah Tekstil Mandiri',
    email: 'kontak@berkahtekstil.com',
    phone: '082198765432',
    address: 'Jl. Sentosa Busana No. 45, Solo',
    color: '#059669',
    status: 'Active',
    joinedAt: '2026-02-10'
  },
  {
    id: 'cmp_03',
    code: 'GLM',
    name: 'Gamis Luxury Official',
    legalName: 'PT Gamis Luxury Modest',
    email: 'owner@gamisluxury.id',
    phone: '085711223344',
    address: 'Ruko Pesona Busana Blok C3, Jakarta',
    color: '#7c3aed',
    status: 'Active',
    joinedAt: '2026-03-01'
  }
];

const STORAGE_KEY_COMPANIES = 'ruangmarket_companies_v1';
const STORAGE_KEY_ACTIVE_COMPANY = 'ruangmarket_active_company_code';

export function getCompanies() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COMPANIES);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return INITIAL_COMPANIES;
}

export function saveCompanies(companies) {
  try {
    localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(companies));
  } catch (e) {}
}

export function getActiveCompanyCode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_COMPANY);
    if (saved) return saved;
  } catch (e) {}
  return 'RSG'; // Default ke Ruang Seragam
}

export function setActiveCompanyCode(code) {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_COMPANY, code);
    window.dispatchEvent(new Event('companyChange'));
  } catch (e) {}
}

export function getActiveCompany() {
  const code = getActiveCompanyCode();
  const list = getCompanies();
  return list.find(c => c.code === code) || list[0] || { code: 'RSG', name: 'Ruang Seragam' };
}
