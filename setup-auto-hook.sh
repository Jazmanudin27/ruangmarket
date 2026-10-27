#!/bin/bash

HOOK_FILE=".git/hooks/post-merge"

echo "Memasang Git Hook post-merge..."

cat << 'EOF' > "$HOOK_FILE"
#!/bin/bash
echo ""
echo "============================================================"
echo "⚡ [AUTO-TRIGGER] Git Pull selesai dideteksi!"
echo "🔨 Menjalankan 'npm run build'..."
npm run build

echo ""
echo "🔄 Me-restart service 'pm2 restart all'..."
pm2 restart all || pm2 reload all || echo "PM2 belum terdaftar"

echo "✅ [AUTO-TRIGGER] Build & Restart PM2 selesai sempurna!"
echo "============================================================"
echo ""
EOF

chmod +x "$HOOK_FILE"

echo "✅ Git Hook post-merge berhasil dipasang di $HOOK_FILE!"
echo "Sekarang, setiap kali Anda mengetik 'git pull', sistem akan OTOMATIS build dan restart PM2 sendiri."
