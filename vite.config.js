import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function marketplacePlugin() {
  return {
    name: 'marketplace-plugin',
    configureServer(server) {
      // 1. Endpoint Generate Auth URL
      server.middlewares.use('/api/marketplace/auth-url', (req, res, next) => {
        const urlObj = new URL(req.url, 'http://localhost:3000');
        const channel = urlObj.searchParams.get('channel');
        const customRedirect = urlObj.searchParams.get('redirect');

        if (channel === 'shopee') {
          const partnerId = 2036279;
          const partnerKey = 'shpk59526e67746975637544656f774b525973634654617446624f6867646677';
          const baseUrl = 'https://partner.shopeemobile.com';
          const redirectUrl = customRedirect || 'https://market.ruangtech.com/shopee/callback';
          const apiPath = '/api/v2/shop/auth_partner';
          const timestamp = Math.floor(Date.now() / 1000);

          const baseString = `${partnerId}${apiPath}${timestamp}`;
          const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
          const authUrl = `${baseUrl}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ url: authUrl, partnerId, timestamp, sign, redirectUrl }));
        }

        if (channel === 'tiktok' || channel === 'tokopedia') {
          const appKey = '6k51f66j8f7ki';
          const redirectUri = customRedirect || 'https://market.ruangtech.com/tiktok/callback';
          const state = 'ruangmarket_' + Date.now();
          const authUrl = `https://auth.tiktok-shops.com/oauth/authorize?app_key=${appKey}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ url: authUrl, appKey, state, redirectUri }));
        }

        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'Marketplace tidak didukung' }));
      });

      // 2. Callback Route Shopee di Localhost
      server.middlewares.use('/shopee/callback', (req, res) => {
        const urlObj = new URL(req.url, 'http://localhost:3000');
        const code = urlObj.searchParams.get('code');
        const shopId = urlObj.searchParams.get('shop_id');
        res.writeHead(302, { Location: `/#marketplace?channel=shopee&code=${code || ''}&shop_id=${shopId || ''}` });
        res.end();
      });

      // 3. Callback Route TikTok di Localhost
      server.middlewares.use('/tiktok/callback', (req, res) => {
        const urlObj = new URL(req.url, 'http://localhost:3000');
        const code = urlObj.searchParams.get('code');
        res.writeHead(302, { Location: `/#marketplace?channel=tiktok&code=${code || ''}` });
        res.end();
      });

      // 4. Proxy Fetch Produk Shopee Open API
      server.middlewares.use('/api/marketplace/sync-shopee', async (req, res) => {
        const partnerId = 2036279;
        const partnerKey = 'shpk59526e67746975637544656f774b525973634654617446624f6867646677';
        const urlObj = new URL(req.url, 'http://localhost:3000');
        const shopId = urlObj.searchParams.get('shop_id') || '7494247208764540234';
        const accessToken = urlObj.searchParams.get('access_token') || 'ROW_vxeWOQAAAADXzfcAbFNM2vF4sGvyrLklGCfVKYb9V5U-xAv3eYbj0WBp9k2DaBWQbhCs-Nbbf4CSvM0IRczhb3W_CpJb8PFK9NI72ydb0H8KkODzV-mB_tm_ZKGrQzybH1Btsfmr9OrmweBcvcbahhhqu7HsWUmifb_YB8gx-vonfi12uUm364iWKOTekkTQD2SUc4xrQKH2a1pKTA4mG4_5ftCNdi9B';

        try {
          const timestamp = Math.floor(Date.now() / 1000);
          const path = '/api/v2/product/get_item_list';
          const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
          const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');

          const shopeeUrl = `https://partner.shopeemobile.com${path}?partner_id=${partnerId}&timestamp=${timestamp}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}&offset=0&page_size=20&item_status=NORMAL`;
          
          const https = await import('https');
          const fetchPromise = new Promise((resolve, reject) => {
            https.get(shopeeUrl, (shopeeRes) => {
              let data = '';
              shopeeRes.on('data', chunk => data += chunk);
              shopeeRes.on('end', () => resolve(JSON.parse(data)));
            }).on('error', err => reject(err));
          });

          const json = await fetchPromise;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(json));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}


function uploadDesignPlugin() {
  return {
    name: 'upload-design-plugin',
    configureServer(server) {
      server.middlewares.use('/api/upload-design', (req, res, next) => {
        if (req.method === 'POST') {
          const chunks = [];
          req.on('data', chunk => chunks.push(chunk));
          req.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString();
              const { filename, kode_produksi, no_spk, base64 } = JSON.parse(body);
              const matches = base64 ? base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/) : null;
              if (!matches || matches.length !== 3) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Format data gambar tidak valid' }));
              }
              const buffer = Buffer.from(matches[2], 'base64');
              const dir = path.resolve(process.cwd(), 'public', 'designs');
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              const ext = path.extname(filename || '') || '.png';
              const cleanKode = (kode_produksi || 'PRODUKSI').replace(/[^a-zA-Z0-9_-]/g, '_');
              const cleanSpk = (no_spk || 'SPK').replace(/[^a-zA-Z0-9_-]/g, '_');
              const cleanName = `${cleanKode}_${cleanSpk}${ext}`;
              const filePath = path.join(dir, cleanName);
              fs.writeFileSync(filePath, buffer);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ url: `/designs/${cleanName}?t=${Date.now()}`, filename: cleanName }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), uploadDesignPlugin(), marketplacePlugin()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5010',
        changeOrigin: true
      }
    }
  }
});

