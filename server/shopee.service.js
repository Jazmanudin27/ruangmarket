import crypto from 'crypto';
import https from 'https';
import './env.js';

export class ShopeeService {
  constructor(config = {}) {
    this.partnerId = Number(config.partnerId || process.env.SHOPEE_PARTNER_ID || 2036279);
    this.partnerKey = config.partnerKey || process.env.SHOPEE_PARTNER_KEY || 'shpk59526e67746975637544656f774b525973634654617446624f6867646677';
    this.baseUrl = config.baseUrl || process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com';
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

  // Helper request HTTP(S) GET dengan Auto-Retry 2x & Timeout 10s (Cepat & Responsif)
  async requestGet(url, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          const parsed = new URL(url);
          const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            family: 4,
            headers: {
              'User-Agent': 'GuzzleHttp/7 RuangMarket-Shopee/2.0',
              'Accept': 'application/json'
            },
            timeout: 10000
          }, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
              if (!raw || raw.trim() === '') {
                return reject(new Error(`Empty Response from Shopee (HTTP ${res.statusCode})`));
              }
              try {
                resolve(JSON.parse(raw));
              } catch (e) {
                reject(new Error(`Invalid JSON Response (HTTP ${res.statusCode}): ${raw.slice(0, 150)}`));
              }
            });
          });

          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Koneksi ke Shopee Timeout (10s)'));
          });
          req.end();
        });
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // Helper request HTTP(S) POST JSON dengan Auto-Retry 3x & Timeout 30s
  async requestPost(url, body, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          const parsed = new URL(url);
          const postData = typeof body === 'string' ? body : JSON.stringify(body);

          const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'POST',
            family: 4,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'User-Agent': 'GuzzleHttp/7 RuangMarket-Shopee/2.0',
              'Accept': 'application/json'
            },
            timeout: 30000
          }, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
              if (!raw || raw.trim() === '') {
                return reject(new Error(`Empty Response from Shopee POST (HTTP ${res.statusCode})`));
              }
              try {
                resolve(JSON.parse(raw));
              } catch (e) {
                reject(new Error(`Invalid JSON Response POST (HTTP ${res.statusCode}): ${raw.slice(0, 150)}`));
              }
            });
          });

          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Koneksi POST ke Shopee Timeout (30s)'));
          });

          req.write(postData);
          req.end();
        });
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
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
    const idNum = Number(sId);
    const payload = isMerchant ? {
      merchant_id: idNum,
      refresh_token: refreshToken,
      partner_id: this.partnerId
    } : {
      shop_id: idNum,
      refresh_token: refreshToken,
      partner_id: this.partnerId
    };

    const res = await this.requestPost(url, payload);
    const keyName = isMerchant ? 'merchant_id' : 'shop_id';

    if (res.error && res.error !== '') {
      throw new Error(`Shopee Refresh Token Error (${keyName}): ${res.message || res.error}`);
    }

    return res;
  }

  // 3. Mendapatkan Seluruh Daftar Item ID Produk (Mendukung limit, default 100 produk pertama agar instan dan tidak 504)
  async getAllItemList(shopId, accessToken, limit = 100) {
    const sId = String(shopId);
    let allItems = [];
    let offset = 0;
    let hasNext = true;
    const pageSize = 50;

    while (hasNext && allItems.length < limit) {
      const path = '/api/v2/product/get_item_list';
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = this.generateSignature(path, timestamp, accessToken, sId);

      const query = new URLSearchParams({
        partner_id: this.partnerId,
        timestamp,
        access_token: accessToken,
        shop_id: sId,
        sign,
        offset,
        page_size: Math.min(pageSize, limit - allItems.length),
        item_status: 'NORMAL'
      });

      const url = `${this.baseUrl}${path}?${query.toString()}`;
      const res = await this.requestGet(url);

      if (res.error && res.error !== '') {
        throw new Error(`Shopee API Error: ${res.message || res.error}`);
      }

      const items = res.response?.item || [];
      if (items.length === 0) break;

      allItems = allItems.concat(items);
      hasNext = res.response?.has_next_page === true;
      if (hasNext && res.response?.next_offset !== undefined && res.response?.next_offset !== offset) {
        offset = res.response.next_offset;
      } else {
        offset += items.length;
      }
    }

    return allItems.slice(0, limit);
  }

  // 3b. Helper Satu Halaman Item ID (Fallback)
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

  // 4. Mendapatkan Detail Lengkap Produk (Nama, SKU, Deskripsi)
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

  // Helper request HTTP(S) GET ringan tanpa auto-retry berlebihan
  async requestGetFast(url) {
    try {
      return await new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const req = https.request({
          hostname: parsed.hostname,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          family: 4,
          headers: {
            'User-Agent': 'GuzzleHttp/7 RuangMarket-Shopee/2.0',
            'Accept': 'application/json'
          },
          timeout: 4000
        }, (res) => {
          let raw = '';
          res.on('data', chunk => raw += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(raw));
            } catch (e) {
              resolve(null);
            }
          });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
        req.end();
      });
    } catch (e) {
      return null;
    }
  }

  // 4b. Mendapatkan Data Model / Varian Produk (Fast mode)
  async getModelList(shopId, accessToken, itemId) {
    try {
      const path = '/api/v2/product/get_model_list';
      const timestamp = Math.floor(Date.now() / 1000);
      const sId = String(shopId);
      const sign = this.generateSignature(path, timestamp, accessToken, sId);

      const query = new URLSearchParams({
        partner_id: this.partnerId,
        timestamp,
        access_token: accessToken,
        shop_id: sId,
        sign,
        item_id: String(itemId)
      });

      const url = `${this.baseUrl}${path}?${query.toString()}`;
      const res = await this.requestGetFast(url);
      if (!res || (res.error && res.error !== '')) {
        return null;
      }
      return res.response || null;
    } catch (e) {
      return null;
    }
  }

  // 5. Sinkronisasi Lengkap: Detail Base Info + Model Varian (Limit 100 produk, super cepat <5 detik)
  async syncProducts(shopId, accessToken, limit = 100) {
    const sId = String(shopId);
    // 1. Ambil 100 item ID pertama toko
    const items = await this.getAllItemList(sId, accessToken, limit);
    if (!items || items.length === 0) return [];

    const itemIds = items.map(i => i.item_id);
    
    // 2. Shopee get_item_base_info maksimal 50 item per call (hanya 2x request untuk 100 item)
    let details = [];
    for (let i = 0; i < itemIds.length; i += 50) {
      const batchIds = itemIds.slice(i, i + 50);
      const batchDetails = await this.getItemBaseInfo(sId, accessToken, batchIds);
      details = details.concat(batchDetails);
    }

    // 3. Ambil data model / varian untuk SEMUA produk yang memiliki varian (has_model)
    const itemsNeedModel = details.filter(d => d.has_model);
    const modelMap = new Map();

    const concurrency = 20;
    for (let i = 0; i < itemsNeedModel.length; i += concurrency) {
      const chunk = itemsNeedModel.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async item => {
          const mRes = await this.getModelList(sId, accessToken, item.item_id);
          return { itemId: item.item_id, modelData: mRes };
        })
      );
      for (const res of chunkResults) {
        if (res.modelData) {
          modelMap.set(String(res.itemId), res.modelData);
        }
      }
    }

    const flatProducts = [];

    for (const d of details) {
      const shopTitle = d.shop_name || 'Koperasi Sahabat Anak Bangsa';
      const mData = modelMap.get(String(d.item_id));

      const defaultShopeeImage = d.image?.image_url_list?.[0] 
        || (d.image?.image_id_list?.[0] ? `https://down-id.img.susercontent.com/file/${d.image.image_id_list[0]}` : '')
        || '';

      // Jika produk punya variasi/model di Shopee, simpan setiap varian sebagai 1 baris produk mandiri
      if (mData && Array.isArray(mData.model) && mData.model.length > 0) {
        for (const m of mData.model) {
          const modelSku = (m.model_sku || '').trim() || (d.item_sku ? `${d.item_sku.trim()}-${m.model_id}` : `SHOPEE-${d.item_id}-${m.model_id}`);
          const modelName = m.model_name || 'Standard';

          const mPrice = m.price_info?.[0]?.current_price || m.price_info?.[0]?.original_price || m.price || 0;
          const mStock = m.stock_info_v2?.summary_info?.total_available_stock 
                      ?? m.stock_info?.[0]?.normal_stock 
                      ?? m.stock 
                      ?? 0;

          flatProducts.push({
            id: `shopee_${d.item_id}_${m.model_id}`,
            item_id: String(d.item_id),
            model_id: String(m.model_id),
            channel: 'shopee',
            channelName: 'Shopee Marketplace',
            shopName: shopTitle,
            nama_produk: d.item_name || 'Produk Shopee',
            sku_marketplace: modelSku,
            harga_jual: Number(mPrice) || 0,
            stok_marketplace: Number(mStock) || 0,
            varian_marketplace: modelName,
            foto_produk: m.image_url || defaultShopeeImage,
            status: 'Belum Dimapping',
            syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          });
        }
      } else {
        // Produk tunggal tanpa varian
        let harga = 0;
        let stok = 0;
        let sku = (d.item_sku || '').trim() || `SHOPEE-${d.item_id}`;

        if (d.price_info && Array.isArray(d.price_info) && d.price_info.length > 0) {
          harga = d.price_info[0].current_price || d.price_info[0].original_price || 0;
        } else if (d.price) {
          harga = d.price;
        }

        if (d.stock_info_v2?.summary_info?.total_available_stock !== undefined) {
          stok = d.stock_info_v2.summary_info.total_available_stock;
        } else if (d.stock_info && Array.isArray(d.stock_info) && d.stock_info[0]?.normal_stock !== undefined) {
          stok = d.stock_info[0].normal_stock;
        } else if (d.stock !== undefined) {
          stok = d.stock;
        }

        flatProducts.push({
          id: `shopee_${d.item_id}`,
          item_id: String(d.item_id),
          model_id: '',
          channel: 'shopee',
          channelName: 'Shopee Marketplace',
          shopName: shopTitle,
          nama_produk: d.item_name || 'Produk Shopee',
          sku_marketplace: sku,
          harga_jual: Number(harga) || 0,
          stok_marketplace: Number(stok) || 0,
          varian_marketplace: 'Standard',
          foto_produk: defaultShopeeImage,
          status: 'Belum Dimapping',
          syncedAt: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
      }
    }

    return flatProducts;
  }

  // 6. Mendapatkan Daftar Order SN Shopee
  async getOrderList(shopId, accessToken, pageSize = 50) {
    const path = '/api/v2/order/get_order_list';
    const timestamp = Math.floor(Date.now() / 1000);
    const sId = String(shopId);
    const sign = this.generateSignature(path, timestamp, accessToken, sId);

    const timeTo = timestamp;
    const timeFrom = timestamp - 14 * 86400; // 14 hari terakhir

    const query = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp,
      access_token: accessToken,
      shop_id: sId,
      sign,
      time_range_field: 'create_time',
      time_from: timeFrom,
      time_to: timeTo,
      page_size: pageSize
    });

    const url = `${this.baseUrl}${path}?${query.toString()}`;
    const res = await this.requestGet(url);

    if (res.error && res.error !== '') {
      throw new Error(`Shopee Order List Error: ${res.message || res.error}`);
    }

    return res.response?.order_list || [];
  }

  // 7. Mendapatkan Detail Lengkap Order (Status, Buyer, Total, Items, Escrow, Shipping)
  async getOrderDetail(shopId, accessToken, orderSnList = []) {
    if (!orderSnList || orderSnList.length === 0) return [];

    const path = '/api/v2/order/get_order_detail';
    const timestamp = Math.floor(Date.now() / 1000);
    const sId = String(shopId);
    const sign = this.generateSignature(path, timestamp, accessToken, sId);

    const query = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp,
      access_token: accessToken,
      shop_id: sId,
      sign,
      order_sn_list: orderSnList.join(','),
      response_optional_fields: 'buyer_user_id,buyer_username,item_list,total_amount,order_status,shipping_carrier,actual_shipping_fee,estimated_shipping_fee,recipient_address,payment_method,escrow_amount,shopee_shipping_rebate'
    });

    const url = `${this.baseUrl}${path}?${query.toString()}`;
    const res = await this.requestGet(url);

    if (res.error && res.error !== '') {
      throw new Error(`Shopee Order Detail Error: ${res.message || res.error}`);
    }

    return res.response?.order_list || [];
  }

  // 7b. Ambil Escrow Detail per Order dari Shopee
  async getEscrowDetail(shopId, accessToken, orderSn) {
    try {
      const path = '/api/v2/payment/get_escrow_detail';
      const timestamp = Math.floor(Date.now() / 1000);
      const sId = String(shopId);
      const sign = this.generateSignature(path, timestamp, accessToken, sId);

      const query = new URLSearchParams({
        partner_id: this.partnerId,
        timestamp,
        access_token: accessToken,
        shop_id: sId,
        sign,
        order_sn: orderSn
      });

      const url = `${this.baseUrl}${path}?${query.toString()}`;
      const res = await this.requestGet(url);
      return res.response?.order_income || null;
    } catch (e) {
      return null;
    }
  }

  // 8. Sinkronisasi Pesanan Shopee Lengkap dengan Finansial & HPP
  async syncOrders(shopId, accessToken, fallbackShopName = 'Koperasi Sahabat Anak Bangsa') {
    const sId = String(shopId);
    const orderList = await this.getOrderList(sId, accessToken, 50);
    if (!orderList || orderList.length === 0) return [];

    const orderSns = orderList.map(o => o.order_sn).filter(Boolean);
    let details = [];
    for (let i = 0; i < orderSns.length; i += 50) {
      const batchSns = orderSns.slice(i, i + 50);
      const batchDetails = await this.getOrderDetail(sId, accessToken, batchSns);
      details = details.concat(batchDetails);
    }

    // Ambil escrow detail untuk tiap pesanan
    const orders = [];
    for (const d of details) {
      const escrow = await this.getEscrowDetail(sId, accessToken, d.order_sn);

      const items = (d.item_list || []).map(it => {
        const cleanSku = it.model_sku || it.item_sku || `SKU-${it.item_id}`;
        return {
          id: `item-${it.item_id}`,
          item_id: it.item_id,
          nama_produk: it.item_name || 'Produk Pesanan',
          sku: cleanSku,
          kategori: 'Marketplace Order',
          satuan: 'PCS',
          qty: it.model_quantity_purchased || 1,
          harga: it.model_discounted_price || it.model_original_price || 0,
          subtotal: (it.model_discounted_price || it.model_original_price || 0) * (it.model_quantity_purchased || 1),
          varian: it.model_name || 'Standard',
          foto_produk: it.image_info?.image_url || ''
        };
      });

      const subtotalPesanan = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
      const shippingFee = Number(escrow?.actual_shipping_fee || d.actual_shipping_fee || d.estimated_shipping_fee || 10000);

      // Hitung fee breakdown persis seperti Laravel Order.php & PullOrdersFromShopee.php
      let marketplaceFee = 0;
      let platformFee = 0;
      let freeShipping = 0;
      let serviceFee = 0;
      let netAmount = Number(d.total_amount) || 0;

      if (escrow) {
        platformFee = Math.abs(Number(escrow.commission_fee || 0));
        freeShipping = Math.abs(Number(escrow.service_fee || 0));
        serviceFee = Math.abs(Number(escrow.seller_order_processing_fee || 0));
        
        const sellerFee = Math.abs(Number(escrow.seller_coin_cash_back || 0))
          + platformFee
          + freeShipping
          + serviceFee
          + Math.abs(Number(escrow.seller_transaction_fee || 0))
          + Math.abs(Number(escrow.ams_commission_fee || 0));

        marketplaceFee = sellerFee;
        const rawEscrow = Number(escrow.escrow_amount_after_adjustment || escrow.escrow_amount || 0);
        netAmount = rawEscrow > 0 ? rawEscrow : Math.max(0, subtotalPesanan + shippingFee - marketplaceFee);
      } else {
        marketplaceFee = Math.round(subtotalPesanan * 0.095);
        netAmount = Math.max(0, subtotalPesanan + shippingFee - marketplaceFee);
      }

      orders.push({
        id: `shopee_${d.order_sn}`,
        no_pesanan: d.order_sn,
        saluran: 'shopee',
        nama_saluran: 'Shopee Marketplace',
        nama_toko: fallbackShopName,
        nama_pembeli: d.buyer_username || `Buyer #${d.buyer_user_id || 'Shopee'}`,
        telepon: d.recipient_address?.phone || '',
        alamat: d.recipient_address?.full_address || '',
        kurir: d.shipping_carrier || 'SPX Express',
        total_harga: subtotalPesanan > 0 ? subtotalPesanan : (Number(d.total_amount) || 0),
        ongkir: shippingFee,
        shipping_fee: shippingFee,
        marketplace_fee: marketplaceFee,
        fee_platform: platformFee,
        fee_free_shipping: freeShipping,
        fee_service: serviceFee,
        net_amount: netAmount,
        status_pesanan: d.order_status || 'Perlu Diproses',
        items: items
      });
    }

    return orders;
  }
}

