import crypto from 'crypto';
import https from 'https';
import './env.js';

export class TiktokService {
  constructor(config = {}) {
    this.appKey = config.appKey || process.env.TIKTOK_APP_KEY || '6k51f66j8f7ki';
    this.appSecret = config.appSecret || process.env.TIKTOK_APP_SECRET || '07ae917200c1af2fdc6fd6d7d39bc38f418bdbd1';
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

  // Tukar Auth Code menjadi Access Token TikTok resmi
  async getAccessTokenFromCode(authCode) {
    const path = '/api/v2/token/get';
    const query = new URLSearchParams({
      app_key: this.appKey,
      app_secret: this.appSecret,
      auth_code: authCode,
      grant_type: 'authorized_code'
    });
    const url = `https://auth.tiktok-shops.com${path}?${query.toString()}`;
    const res = await this.request('GET', url);
    if (res.code !== 0) {
      throw new Error(`TikTok Token Get Error: ${res.message || 'Unknown Error'}`);
    }
    return res.data; // { access_token, refresh_token, expire_in, open_id, seller_name }
  }

  // Refresh Access Token TikTok
  async refreshAccessToken(refreshToken) {
    const path = '/api/v2/token/refresh';
    const query = new URLSearchParams({
      app_key: this.appKey,
      app_secret: this.appSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    const url = `https://auth.tiktok-shops.com${path}?${query.toString()}`;
    const res = await this.request('GET', url);
    if (res.code !== 0) {
      throw new Error(`TikTok Refresh Token Error: ${res.message || 'Unknown Error'}`);
    }
    return res.data; // { access_token, refresh_token, expire_in, open_id, seller_name }
  }

  // Dapatkan daftar toko resmi dan shop_cipher aktif dari token
  async getShopInfo(accessToken) {
    const path = '/authorization/202309/shops';
    const queryParams = {
      app_key: this.appKey,
      timestamp: Math.floor(Date.now() / 1000)
    };
    const sign = this.generateSignature(path, queryParams);
    queryParams.sign = sign;
    queryParams.access_token = accessToken;

    const url = `${this.baseUrl}${path}?${new URLSearchParams(queryParams).toString()}`;
    const res = await this.request('GET', url, {
      'x-tts-access-token': accessToken
    });
    if (res.code !== 0) {
      throw new Error(`TikTok Shop Info Error: ${res.message || 'Unknown Error'}`);
    }
    return res.data?.shops || [];
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

    return {
      products: res.data?.products || [],
      nextPageToken: res.data?.next_page_token || ''
    };
  }

  // 4. Sinkronisasi SEMUA Produk TikTok & Ekstrak Tiap Varian SKU ke Format Staging
  async syncProducts(accessToken, shopCipher) {
    const allProducts = [];
    let pageToken = '';
    let hasMore = true;
    let pageCount = 0;

    // Loop pagination TikTok Shop sampai seluruh halaman habis
    while (hasMore && pageCount < 50) {
      pageCount++;
      const result = await this.getProductSearch(accessToken, shopCipher, pageToken);
      const list = result.products || [];
      allProducts.push(...list);

      if (result.nextPageToken && result.nextPageToken !== pageToken && list.length > 0) {
        pageToken = result.nextPageToken;
      } else {
        hasMore = false;
      }
    }

    const flattenedRows = [];

    // Loop setiap produk dan seluruh SKU variasinya
    for (const p of allProducts) {
      const skus = Array.isArray(p.skus) && p.skus.length > 0 ? p.skus : [null];

      for (const sku of skus) {
        const skuId = sku?.id || p.id;
        const sellerSku = sku?.seller_sku || (sku ? `TT-${p.id}-${sku.id}` : `TT-${p.id}`);
        const varianName = sku?.sales_attributes?.map(a => a.value_name).join(', ') || 'Standard';
        const hargaJual = Number(sku?.price?.tax_exclusive_price || sku?.price?.amount || 0);
        const stokQty = Number(sku?.inventory?.[0]?.quantity || 0);

        flattenedRows.push({
          id: `tiktok_${p.id}_${skuId}`,
          item_id: String(p.id),
          channel: 'tiktok',
          channelName: 'TikTok Shop',
          shopName: 'RUANG SERAGAM',
          nama_produk: p.title || 'Produk TikTok',
          sku_marketplace: sellerSku,
          harga_jual: hargaJual,
          stok_marketplace: stokQty,
          varian_marketplace: varianName,
          status: 'Belum Dimapping',
          syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    return flattenedRows;
  }
}
