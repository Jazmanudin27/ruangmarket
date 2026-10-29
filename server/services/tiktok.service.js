import crypto from 'crypto';
import https from 'https';
import '../config/env.js';

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

        const fotoProduk = sku?.image?.urls?.[0] || sku?.image?.url || p.main_images?.[0]?.urls?.[0] || (typeof p.main_images?.[0] === 'string' ? p.main_images[0] : '') || '';

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
          foto_produk: fotoProduk,
          status: 'Belum Dimapping',
          syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    return flattenedRows;
  }

  // 5. Ambil Daftar Pesanan dari TikTok Shop Open API (v202309)
  async getOrderSearch(accessToken, shopCipher, pageToken = '') {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/order/202309/orders/search';
    const queryObj = {
      app_key: this.appKey,
      timestamp: timestamp,
      shop_cipher: shopCipher,
      page_size: 50
    };
    if (pageToken) {
      queryObj.page_token = pageToken;
    }

    const bodyObj = {};
    const bodyJson = JSON.stringify(bodyObj);
    const sign = this.generateSignature(path, queryObj, bodyJson);
    queryObj.sign = sign;

    const queryStr = new URLSearchParams(queryObj).toString();
    const url = `${this.baseUrl}${path}?${queryStr}`;

    const res = await this.request('POST', url, {
      'x-tts-access-token': accessToken
    }, bodyJson);

    if (res.code !== 0) {
      throw new Error(`TikTok Orders API Error: ${res.message || 'Unknown Error'} (Code ${res.code})`);
    }

    return {
      orders: res.data?.orders || [],
      nextPageToken: res.data?.next_page_token || ''
    };
  }

  // 6. Sinkronisasi Pesanan TikTok Shop Asli & Format Lengkap Pesanan Masuk
  async syncOrders(accessToken, shopCipher, fallbackShopName = 'RUANG SERAGAM') {
    let activeCipher = shopCipher;

    // Jika shopCipher belum ada, otomatis dapatkan dari API shops
    if (!activeCipher) {
      try {
        const shops = await this.getShopInfo(accessToken);
        if (shops && shops.length > 0 && shops[0].cipher) {
          activeCipher = shops[0].cipher;
        }
      } catch (eShop) {
        console.warn('[TikTok] getShopInfo warning:', eShop.message);
      }
    }

    if (!activeCipher) {
      throw new Error('shop_cipher TikTok Shop tidak ditemukan. Pastikan akun TikTok Shop sudah terotorisasi.');
    }

    const result = await this.getOrderSearch(accessToken, activeCipher);
    const rawOrders = result.orders || [];

    if (!rawOrders || rawOrders.length === 0) {
      return [];
    }

    return rawOrders.map(o => {
      const items = (o.line_items || []).map(it => {
        const itemSku = it.seller_sku || `SKU-${it.sku_id || it.product_id}`;
        const itemPrice = Number(it.sale_price) || 0;
        const itemQty = Number(it.quantity) || 1;
        return {
          id: `item-${it.id || it.sku_id || Math.random().toString(36).slice(2, 7)}`,
          nama_produk: it.product_name || 'Produk TikTok',
          sku: itemSku,
          kategori: 'TikTok Shop',
          satuan: 'PCS',
          qty: itemQty,
          harga: itemPrice,
          subtotal: itemPrice * itemQty,
          varian: it.sku_name || it.sku_display_name || 'Standard',
          foto_produk: it.sku_image || it.product_image || ''
        };
      });

      const subtotalPesanan = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
      const totalAmount = Number(o.payment?.total_amount) || subtotalPesanan;
      const shippingFee = Number(o.payment?.shipping_fee) || 0;
      const platformDiscount = Number(o.payment?.platform_discount) || 0;
      const sellerDiscount = Number(o.payment?.seller_discount) || 0;

      // Estimasi fee TikTok
      const marketplaceFee = Math.round(subtotalPesanan * 0.08);
      const netAmount = Math.max(0, totalAmount - marketplaceFee);

      // Normalisasi status pesanan ke format standar sistem
      const rawStatus = String(o.status || '').toUpperCase();
      let statusPesanan = 'Perlu Diproses';
      if (rawStatus === 'AWAITING_SHIPMENT' || rawStatus === 'AWAITING_COLLECTION') {
        statusPesanan = 'READY_TO_SHIP';
      } else if (rawStatus === 'IN_TRANSIT' || rawStatus === 'DELIVERING' || rawStatus === 'SHIPPED') {
        statusPesanan = 'TO_CONFIRM_RECEIVE';
      } else if (rawStatus === 'DELIVERED' || rawStatus === 'COMPLETED') {
        statusPesanan = 'COMPLETED';
      } else if (rawStatus === 'CANCELLED') {
        statusPesanan = 'CANCELLED';
      } else if (rawStatus === 'UNPAID') {
        statusPesanan = 'UNPAID';
      }

      const buyerName = o.recipient_address?.name || o.buyer_email || 'Pelanggan TikTok';
      const buyerPhone = o.recipient_address?.phone_number || '';
      const fullAddr = [
        o.recipient_address?.full_address,
        o.recipient_address?.district_info?.map(d => d.address_name).join(', '),
        o.recipient_address?.postal_code
      ].filter(Boolean).join(', ') || '';

      const courierName = o.shipping_provider_name || o.delivery_option_name || 'Standar';

      // Waktu pesanan & batas kirim
      const orderDate = o.create_time ? new Date(o.create_time * 1000) : new Date();
      const batasKirimDate = o.ship_by_date ? new Date(o.ship_by_date * 1000) : new Date(orderDate.getTime() + 24 * 3600 * 1000);

      return {
        id: `tiktok_${o.id}`,
        no_pesanan: String(o.id),
        saluran: 'tiktok',
        nama_saluran: 'TikTok Shop',
        nama_toko: fallbackShopName,
        nama_pembeli: buyerName,
        telepon: buyerPhone,
        alamat: fullAddr,
        total_harga: totalAmount,
        ongkir: shippingFee,
        shipping_fee: shippingFee,
        marketplace_fee: marketplaceFee,
        fee_platform: platformDiscount,
        fee_free_shipping: 0,
        fee_service: marketplaceFee,
        net_amount: netAmount,
        status_pesanan: statusPesanan,
        kurir: courierName,
        no_resi: o.tracking_number || '',
        waktu_pesanan: orderDate.toISOString(),
        batas_kirim: batasKirimDate.toISOString(),
        items: items
      };
    });
  }

  // 7. Ambil Label Pengiriman / Cetak Resi PDF Langsung dari TikTok Shop API
  async getShippingDocument(orderId, accessToken, shopCipher = '') {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = `/fulfillment/202309/orders/${orderId}/shipping_documents`;
    const queryObj = {
      app_key: this.appKey,
      timestamp: timestamp,
      document_type: 'SL',
      document_size: 'A6'
    };
    if (shopCipher) {
      queryObj.shop_cipher = shopCipher;
    }

    const sign = this.generateSignature(path, queryObj, {});
    queryObj.sign = sign;

    const queryStr = new URLSearchParams(queryObj).toString();
    const url = `${this.baseUrl}${path}?${queryStr}`;

    const res = await this.request('GET', url, {
      'x-tts-access-token': accessToken
    });

    if (res.code !== 0) {
      throw new Error(`TikTok Shipping Label Error: ${res.message || 'Unknown Error'}`);
    }

    const docUrl = res.data?.doc_url;
    if (!docUrl) {
      throw new Error('TikTok Shop belum merilis file dokumen PDF pengiriman untuk pesanan ini.');
    }

    // Download PDF dari URL yang diberikan TikTok
    return new Promise((resolve, reject) => {
      https.get(docUrl, (pdfRes) => {
        const chunks = [];
        pdfRes.on('data', chunk => chunks.push(chunk));
        pdfRes.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }
}
