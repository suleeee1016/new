#!/bin/bash

# Network IP adresini tespit edip .env dosyasını güncelle

echo "🌐 Local IP adresi tespit ediliyor..."

# macOS için IP adresini al
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

# Linux alternatifi
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

# Windows alternatifi (Git Bash)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ipconfig | grep "IPv4" | head -1 | awk '{print $14}')
fi

if [ -z "$LOCAL_IP" ]; then
    echo "❌ IP adresi tespit edilemedi, varsayılan kullanılacak"
    LOCAL_IP="192.168.1.111"
fi

echo "✅ Tespit edilen IP: $LOCAL_IP"

# .env dosyasını güncelle
if [ -f ".env" ]; then
    # Mevcut .env'de REACT_APP_API_URL'yi güncelle
    sed -i.bak "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=http://$LOCAL_IP:3001|g" .env
    
    # LOCAL_IP değişkeni yoksa ekle
    if ! grep -q "REACT_APP_LOCAL_IP" .env; then
        echo "" >> .env
        echo "# Auto-detected Local IP" >> .env
        echo "REACT_APP_LOCAL_IP=$LOCAL_IP" >> .env
    else
        sed -i.bak "s|REACT_APP_LOCAL_IP=.*|REACT_APP_LOCAL_IP=$LOCAL_IP|g" .env
    fi
    
    echo "✅ .env dosyası güncellendi"
    echo "📱 Diğer cihazlardan erişim için: http://$LOCAL_IP:3000"
    echo "🔗 API endpoint: http://$LOCAL_IP:3001"
else
    echo "❌ .env dosyası bulunamadı"
    exit 1
fi

# package.json'da network script'lerini güncelle
if [ -f "package.json" ]; then
    # Network başlatma script'i ekle
    npm_script="\"dev:network\": \"npm run setup-network && npm run dev:full\""
    
    # Eğer script yoksa ekle
    if ! grep -q "dev:network" package.json; then
        # scripts bölümünü bul ve ekle
        sed -i.bak '/"scripts": {/a\
    "setup-network": "bash setup-network.sh",\
    "dev:network": "npm run setup-network && npm run dev:full",
' package.json
        echo "✅ package.json'a network script'leri eklendi"
    fi
fi

echo ""
echo "🚀 Network kurulumu tamamlandı!"
echo "📝 Diğer cihazlardan erişim için:"
echo "   1. Bu bilgisayarda: npm run dev:network"
echo "   2. Diğer cihazlarda: http://$LOCAL_IP:3000"
echo "   3. Aynı WiFi ağında olduğunuzdan emin olun"
echo ""
