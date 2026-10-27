import crypto from 'crypto';
import https from 'https';
import './env.js';

export class ShopeeService {
  constructor(config = {}) {
    this.partnerId = Number(config.partnerId || process.env.SHOPEE_PARTNER_ID || 2036279);
    this.partnerKey = config.partnerKey || process.env.SHOPEE_PARTNER_KEY || 'shpk59526e67746975637544656f774b525973634654617446624f6867646677';
    this.baseUrl = config.baseUrl || process.env.SHOPEE_BASE_URL || 'https://partner.shopee.co.id';
  }

  // 1. Generate Signature Shopee HMAC-SHA256
  generateSignature(path, timestamp, accessToken = '', shopId = '') {
    const sId = String(shopId || '');
    let baseString = `${this.partnerId}${path}${timestamp}`;
    if (accessToken && sId) {
      baseString += `${accessToken}${sId}`;
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

  // Helper request HTTP(S) POST JSON
  requestPost(url, body) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const postData = typeof body === 'string' ? body : JSON.stringify(body);

      const req = https.request({
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 20000
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`Invalid JSON Response: ${raw}`));
          }
        });
      });

      req.on('error', err => reject(err));
      req.write(postData);
      req.end();
    });
  }

  // Tukar Auth Code menjadi Access Token resmi (setelah seller klik otorisasi)
  async getAccessTokenFromCode(code, shopId) {
    const path = '/api/v2/auth/token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sId = String(shopId);

    const baseString = `${this.partnerId}${path}${timestamp}`;
    const sign = crypto.createHmac('sha256', this.partnerKey).update(baseString).digest('hex');

    const query = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp,
      sign
    });

    const url = `${this.baseUrl}${path}?${query.toString()}`;
    const payload = JSON.stringify({
      shop_id: 0,
      code,
      partner_id: this.partnerId
    }).replace(':0,', `:${sId},`);

    const res = await this.requestPost(url, payload);
    if (res.error && res.error !== '') {
      throw new Error(`Shopee Token Get Error: ${res.message || res.error}`);
    }
    return res;
  }

  // 2. Refresh Token Shopee jika access_token sudah expired (Mendukung shop_id atau merchant_id)
  async refreshAccessToken(refreshToken, id, isMerchant = false) {
    const path = '/api/v2/auth/access_token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sId = String(id);

    // Signature untuk auth/access_token/get: partner_id + path + timestamp
    const baseString = `${this.partnerId}${path}${timestamp}`;
    const sign = crypto.createHmac('sha256', this.partnerKey).update(baseString).digest('hex');

    const query = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp,
      sign
    });

    const url = `${this.baseUrl}${path}?${query.toString()}`;
    const keyName = isMerchant ? 'merchant_id' : 'shop_id';
    const payload = JSON.stringify({
      [keyName]: 0,
      refresh_token: refreshToken,
      partner_id: this.partnerId
    }).replace(':0,', `:${sId},`);

    const res = await this.requestPost(url, payload);

    if (res.error && res.error !== '') {
      throw new Error(`Shopee Refresh Token Error (${keyName}): ${res.message || res.error}`);
    }

    return res;
  }

  // 3. Mendapatkan Daftar Item ID Produk
  async getItemList(shopId, accessToken, pageSize = 50, offset = 0) {
    const path = '/api/v2/product/get_item_list';
    const timestamp = Math.floor(Date.now() / 1000);
    const sId = String(shopId);
    const sign = this.generateSignature(path, timestamp, accessToken, sId);

    const query = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp,
      access_token: accessToken,
      shop_id: sId,
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

  // 4. Mendapatkan Detail Lengkap Produk (Nama, SKU, Harga, Stok)
  async getItemBaseInfo(shopId, accessToken, itemIds = []) {
    if (!itemIds || itemIds.length === 0) return [];

    const path = '/api/v2/product/get_item_base_info';
    const timestamp = Math.floor(Date.now() / 1000);
    const sId = String(shopId);
    const sign = this.generateSignature(path, timestamp, accessToken, sId);

    const query = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp,
      access_token: accessToken,
      shop_id: sId,
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

  // 5. Sinkronisasi Lengkap: Ambil Item List + Detail Base Info
  async syncProducts(shopId, accessToken, pageSize = 100) {
    const sId = String(shopId);
    const items = await this.getItemList(sId, accessToken, pageSize);
    if (!items || items.length === 0) return [];

    const itemIds = items.map(i => i.item_id);
    
    // Shopee get_item_base_info maksimal 50 item per call
    let details = [];
    for (let i = 0; i < itemIds.length; i += 50) {
      const batchIds = itemIds.slice(i, i + 50);
      const batchDetails = await this.getItemBaseInfo(sId, accessToken, batchIds);
      details = details.concat(batchDetails);
    }

    return details.map(d => {
      // 1. Ekstraksi Harga
      let harga = 0;
      if (d.price_info && Array.isArray(d.price_info) && d.price_info.length > 0) {
        harga = d.price_info[0].current_price || d.price_info[0].original_price || 0;
      } else if (d.price) {
        harga = d.price;
      }

      // 2. Ekstraksi Stok
      let stok = 0;
      if (d.stock_info_v2?.summary_info?.total_available_stock !== undefined) {
        stok = d.stock_info_v2.summary_info.total_available_stock;
      } else if (d.stock_info && Array.isArray(d.stock_info) && d.stock_info[0]?.normal_stock !== undefined) {
        stok = d.stock_info[0].normal_stock;
      } else if (d.stock !== undefined) {
        stok = d.stock;
      }

      // 3. Nama Toko
      const shopTitle = d.shop_name || 'Koperasi Sahabat Anak Bangsa';

      return {
        id: `shopee_${d.item_id}`,
        item_id: String(d.item_id),
        channel: 'shopee',
        channelName: 'Shopee Marketplace',
        shopName: shopTitle,
        nama_produk: d.item_name || 'Produk Shopee',
        sku_marketplace: d.item_sku || `SHOPEE-${d.item_id}`,
        harga_jual: Number(harga) || 0,
        stok_marketplace: Number(stok) || 0,
        varian_marketplace: d.has_model ? 'Ada Varian' : 'Standard',
        status: 'Belum Dimapping',
        syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
    });
  }
}
