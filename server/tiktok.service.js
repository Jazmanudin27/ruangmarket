import crypto from 'crypto';
import https from 'https';
import './env.js';

export class TiktokService {
  constructor(config = {}) {
    this.appKey = config.appKey || process.env.TIKTOK_APP_KEY || '6k51f66j8f7ki';
    this.appSecret = config.appSecret || process.env.TIKTOK_APP_SECRET || '';
    this.baseUrl = config.baseUrl || 'https://open-api.tiktokglobalshop.com';
    this.authBaseUrl = 'https://services.tiktokshop.com/open/authorize';
    this.redirectUri = config.redirectUri || 'https://market.ruangtech.com/tiktok/callback';
  }

  // 1. Generate Auth URL untuk Seller
  getAuthUrl(state = '') {
    const params = new URLSearchParams({
      app_key: this.appKey,
      state: state || `ruangmarket_${Date.now()}`,
      redirect_uri: this.redirectUri
    });
    return `${this.authBaseUrl}?${params.toString()}`;
  }

  // 2. Signature TikTok Shop v202309 HMAC-SHA256
  generateSignature(path, query = {}, bodyJson = '') {
    const params = { ...query };
    delete params.sign;
    delete params.access_token;

    // Urutkan key alfabetis
    const sortedKeys = Object.keys(params).sort();
    let str = '';
    for (const k of sortedKeys) {
      str += `${k}${params[k]}`;
    }

    const baseString = `${this.appSecret}${path}${str}${bodyJson}${this.appSecret}`;
    return crypto.createHmac('sha256', this.appSecret).update(baseString).digest('hex');
  }

  // Helper request HTTP(S) JSON
  request(method, url, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const req = https.request({
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 20000
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`Invalid JSON: ${raw}`));
          }
        });
      });

      req.on('error', err => reject(err));
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  // 3. Search Products TikTok Shop
  async getProductSearch(accessToken, shopCipher, pageToken = '') {
    const path = '/product/202309/products/search';
    const body = { status: 'ACTIVATE' };
    const bodyJson = JSON.stringify(body);

    const queryParams = {
      app_key: this.appKey,
      timestamp: Math.floor(Date.now() / 1000),
      shop_cipher: shopCipher,
      page_size: 50
    };

    if (pageToken) queryParams.page_token = pageToken;

    const sign = this.generateSignature(path, queryParams, bodyJson);
    queryParams.sign = sign;
    queryParams.access_token = accessToken;

    const queryStr = new URLSearchParams(queryParams).toString();
    const url = `${this.baseUrl}${path}?${queryStr}`;

    const res = await this.request('POST', url, {
      'x-tts-access-token': accessToken
    }, bodyJson);

    if (res.code !== 0) {
      throw new Error(`TikTok API Error: ${res.message || 'Unknown Error'}`);
    }

    return res.data?.products || [];
  }

  // 4. Sinkronisasi Produk TikTok ke Format Staging
  async syncProducts(accessToken, shopCipher) {
    const rawProducts = await this.getProductSearch(accessToken, shopCipher);
    return rawProducts.map(p => {
      const firstSku = p.skus?.[0];
      return {
        id: `tiktok_${p.id}`,
        item_id: String(p.id),
        channel: 'tiktok',
        channelName: 'TikTok Shop',
        shopName: 'RUANG SERAGAM',
        nama_produk: p.title || 'Produk TikTok',
        sku_marketplace: firstSku?.seller_sku || `TT-${p.id}`,
        harga_jual: Number(firstSku?.price?.tax_exclusive_price || firstSku?.price?.amount || 0),
        stok_marketplace: firstSku?.inventory?.[0]?.quantity || 0,
        varian_marketplace: firstSku?.sales_attributes?.map(a => a.value_name).join(', ') || 'All Size',
        status: 'Belum Dimapping',
        syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
    });
  }
}
