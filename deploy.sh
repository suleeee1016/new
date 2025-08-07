#!/bin/bash

# 3D Fashion Design App - Production Deployment Script
# Bu script sunucuda çalıştırılır

echo "🚀 3D Fashion Design App deployment başlatılıyor..."

# Renkleri tanımla
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Port kontrol fonksiyonu
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}Port $1 kullanımda, process sonlandırılıyor...${NC}"
        pkill -f "node.*$1" || true
        sleep 2
    fi
}

# Git repository güncelle
echo -e "${BLUE}📦 Git repository güncelleniyor...${NC}"
git pull origin main || {
    echo -e "${RED}❌ Git pull başarısız!${NC}"
    exit 1
}

# Dependencies yükle
echo -e "${BLUE}📦 Dependencies yükleniyor...${NC}"
npm install || {
    echo -e "${RED}❌ npm install başarısız!${NC}"
    exit 1
}

# Production build oluştur
echo -e "${BLUE}🔨 Production build oluşturuluyor...${NC}"
npm run prod:build || {
    echo -e "${RED}❌ Build başarısız!${NC}"
    exit 1
}

# Port'ları temizle
echo -e "${BLUE}🧹 Port'lar temizleniyor...${NC}"
check_port 3000
check_port 3001

# PM2 ile başlat (eğer yüklüyse)
if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}🔄 PM2 ile başlatılıyor...${NC}"
    
    # API Server
    pm2 delete dress-api 2>/dev/null || true
    pm2 start --name "dress-api" npm -- run prod:api
    
    # Frontend Server  
    pm2 delete dress-app 2>/dev/null || true
    pm2 start --name "dress-app" npx -- serve -s build -l 3000
    
    pm2 save
    pm2 startup
    
    echo -e "${GREEN}✅ PM2 ile başlatıldı!${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 bulunamadı, normal mod başlatılıyor...${NC}"
    # Normal başlatma
    nohup npm run prod:api > api.log 2>&1 &
    nohup npx serve -s build -l 3000 > app.log 2>&1 &
fi

# Durum kontrol
sleep 5
echo -e "${BLUE}🔍 Servis durumu kontrol ediliyor...${NC}"

if curl -s http://localhost:3001/patterns > /dev/null; then
    echo -e "${GREEN}✅ API Server (Port 3001) çalışıyor${NC}"
else
    echo -e "${RED}❌ API Server başlatılamadı${NC}"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ App Server (Port 3000) çalışıyor${NC}"
else
    echo -e "${RED}❌ App Server başlatılamadı${NC}"
fi

echo -e "${GREEN}🎉 Deployment tamamlandı!${NC}"
echo -e "${BLUE}📱 Uygulama: http://your-server-ip:3000${NC}"
echo -e "${BLUE}🔗 API: http://your-server-ip:3001${NC}"

# Log izleme talimatı
echo -e "${YELLOW}📋 Log izlemek için:${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${BLUE}   pm2 logs${NC}"
    echo -e "${BLUE}   pm2 monit${NC}"
else
    echo -e "${BLUE}   tail -f api.log${NC}"
    echo -e "${BLUE}   tail -f app.log${NC}"
fi
