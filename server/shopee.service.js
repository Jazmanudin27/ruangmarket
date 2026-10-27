import crypto from 'crypto';
import https from 'https';

export class ShopeeService {
  constructor(config = {}) {
    this.partnerId = Number(config.partnerId || 2036279);
    this.partnerKey = config.partnerKey || 'shpk59526e67746975637544656f774b525973634654617446624f6867646677';
    this.baseUrl = config.baseUrl || 'https://partner.shopeemobile.com';
  }

  // 1. Generate Signature Shopee HMAC-SHA256
  generateSignature(path, timestamp, accessToken = '', shopId = 0) {
    let baseString = `${this.partnerId}${path}${timestamp}`;
    if (accessToken && shopId) {
      baseString += `${accessToken}${shopId}`;
    }
    return crypto.createHmac('sha256', this.partnerKey).update(baseString).digest('hex');
  }

  // Helper request HTTP(S) GET
  requestGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`Invalid JSON Response: ${raw}`));
          }
        });
      }).on('error', err => reject(err));
    });
  }

  // 2. Mendapatkan Daftar Item ID Produk
  async getItemList(shopId, accessToken, pageSize = 50, offset = 0) {
    const path = '/api/v2/product/get_item_list';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(path, timestamp, accessToken, shopId);

    const query = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp,
      access_token: accessToken,
      shop_id: shopId,
      sign,
      offset,
      page_size: pageSize,
      item_status: 'NORMAL'
    });

    const url = `${this.baseUrl}${path}?${query.toString()}`;
    const res = await this.requestGet(url);

    if (res.error && res.error !== '') {
      throw new Error(`Shopee API Error: ${res.message || res.error}`);
    }

    return res.response?.item || [];
  }

  // 3. Mendapatkan Detail Lengkap Produk (Nama, SKU, Harga, Stok)
  async getItemBaseInfo(shopId, accessToken, itemIds = []) {
    if (!itemIds || itemIds.length === 0) return [];

    const path = '/api/v2/product/get_item_base_info';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(path, timestamp, accessToken, shopId);

    const query = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp,
      access_token: accessToken,
      shop_id: shopId,
      sign,
      item_id_list: itemIds.join(',')
    });

    const url = `${this.baseUrl}${path}?${query.toString()}`;
    const res = await this.requestGet(url);

    if (res.error && res.error !== '') {
      throw new Error(`Shopee API Error: ${res.message || res.error}`);
    }

    return res.response?.item_list || [];
  }

  // 4. Sinkronisasi Lengkap: Ambil Item List + Detail Base Info
  async syncProducts(shopId, accessToken, pageSize = 20) {
    const items = await this.getItemList(shopId, accessToken, pageSize);
    if (!items || items.length === 0) return [];

    const itemIds = items.map(i => i.item_id);
    const details = await this.getItemBaseInfo(shopId, accessToken, itemIds.slice(0, 20));

    // Standarisasi field agar langsung cocok dengan tabel produk_marketplace
    return details.map(d => {
      let harga = 0;
      if (d.price_info?.[0]?.current_price) harga = d.price_info[0].current_price;
      else if (d.price_info?.[0]?.original_price) harga = d.price_info[0].original_price;

      let stok = 0;
      if (d.stock_info_v2?.summary_info?.total_available_stock !== undefined) {
        stok = d.stock_info_v2.summary_info.total_available_stock;
      }

      return {
        id: `shopee_${d.item_id}`,
        item_id: String(d.item_id),
        channel: 'shopee',
        channelName: 'Shopee Marketplace',
        shopName: 'RAGANTARA UNIFORM',
        nama_produk: d.item_name || 'Produk Shopee',
        sku_marketplace: d.item_sku || `SHOPEE-${d.item_id}`,
        harga_jual: harga,
        stok_marketplace: stok,
        varian_marketplace: 'Standard',
        status: 'Belum Dimapping',
        syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
    });
  }
}
