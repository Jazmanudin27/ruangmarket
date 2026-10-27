#!/bin/bash
echo "=========================================="
echo "🚀 MEMULAI DEPLOYMENT OTOMATIS RUANGMARKET"
echo "=========================================="

echo "1. Mengambil kode terbaru dari GitHub..."
git pull origin main

echo -e "\n2. Menjalankan vite build production..."
npm run build

echo -e "\n3. Me-restart service PM2..."
pm2 restart all || pm2 reload all || echo "PM2 belum terdaftar, jalankan: pm2 start server/index.js --name ruangmarket-api"

echo -e "\n✅ DEPLOYMENT SELESAI & SISTEM AKTIF DENGAN KODE TERBARU!"
