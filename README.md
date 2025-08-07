# 🎨 3D Fashion Design App

Modern 3D elbise tasarım ve desen uygulama platformu. React + Three.js teknolojileri ile geliştirilmiştir.

## ✨ Özellikler

### 🎭 3D Model Sistemi
- **8 farklı elbise modeli** - Zarif, Klasik, Modern, Şık, Vintage, Casual, Parti, Gece
- **Gerçek zamanlı desen uygulama** - Anlık görselleştirme
- **Desen boyut kontrolü** - 0.2x - 3x arası ölçeklendirme
- **360° görüntüleme** - Orbit controls ile döndürme

### 🎨 Desen Yönetimi
- **Scroll-based grid sistemi** - Tüm desenler aynı anda görünür
- **Gerçek zamanlı arama** - Anlık filtreleme
- **Admin panel** - Desen ekleme/düzenleme/silme
- **PNG format desteği** - Yüksek kalite görseller

### 👥 Kullanıcı Sistemi
- **Kullanıcı kaydı ve girişi** - Güvenli authentication
- **Favoriler sistemi** - Beğenilen desenleri kaydetme
- **Admin ve normal kullanıcı rolleri** - Yetki kontrolü
- **Kullanıcı profil yönetimi** - Kişisel ayarlar

### 📱 Responsive Tasarım
- **Mobile-first yaklaşım** - Tüm cihazlarda uyumlu
- **Minimalist UI/UX** - Temiz ve kullanışlı arayüz
- **Touch-friendly** - Mobil dokunmatik optimizasyonu
- **Performance odaklı** - Hızlı yükleme süreleri

## 🚀 Kurulum

### Gereksinimler
- Node.js 14+ 
- npm 6+
- Git

### Lokal Geliştirme

```bash
# Repository'yi klonla
git clone <repository-url>
cd Dress-main

# Dependencies yükle
npm install

# Development server'ları başlat
npm run dev:full
```

**Uygulama:**
- Frontend: http://localhost:3000
- API: http://localhost:3001

### Production Build

```bash
# Production build oluştur
npm run prod:build

# Production server'ları başlat
npm run prod:start
```

## 🌐 Sunucu Deployment

### SSH ile Sunucuya Yükleme

1. **Sunucuya bağlan:**
```bash
ssh username@your-server-ip
```

2. **Node.js yükle (Ubuntu/Debian):**
```bash
# NodeSource repository ekle
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js yükle
sudo apt-get install -y nodejs

# PM2 yükle (opsiyonel ama önerilen)
sudo npm install -g pm2
```

3. **Repository klonla:**
```bash
git clone <your-github-repo-url>
cd Dress-main
```

4. **Deploy script'ini çalıştır:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manuel Deployment

```bash
# Dependencies yükle
npm install

# Production build
npm run prod:build

# PM2 ile başlat
pm2 start npm --name "dress-api" -- run prod:api
pm2 start npx --name "dress-app" -- serve -s build -l 3000

# PM2 konfigürasyonunu kaydet
pm2 save
pm2 startup
```

### Port Konfigürasyonu

Varsayılan portlar:
- **Frontend:** 3000
- **API:** 3001

Environment variable ile değiştirilebilir:
```bash
export PORT=8080
export API_PORT=8081
```

## 🔧 Konfigürasyon

### API Base URL

Production'da API URL'ini değiştirmek için:

```javascript
// src/ThreeJSExample.js içinde
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://your-server-ip:3001';
```

### Database

Proje JSON Server kullanır. Veri `db.json` dosyasında saklanır:

```json
{
  "users": [],
  "patterns": [],
  "admin": [],
  "settings": []
}
```

## 📊 Monitoring

### PM2 ile İzleme

```bash
# Tüm process'leri görüntüle
pm2 status

# Log'ları izle
pm2 logs

# Monitoring dashboard
pm2 monit

# Process'leri yeniden başlat
pm2 restart all
```

### Log Dosyaları

PM2 kullanmıyorsanız:
```bash
# API logs
tail -f api.log

# App logs  
tail -f app.log
```

## 🛠️ Geliştirme

### Teknoloji Stack
- **Frontend:** React 17, Three.js
- **Backend:** JSON Server
- **Styling:** CSS3 (Custom)
- **3D Engine:** Three.js + WebGL
- **Process Manager:** PM2

### Klasör Yapısı

```
src/
├── components/        # React bileşenleri
│   ├── AdminPanel.js  # Admin paneli
│   ├── Favorites.js   # Favoriler
│   └── Header.js      # Sayfa başlığı
├── contexts/          # React context'ler
│   └── AuthContext.js # Authentication
├── assets/            # 3D modeller ve görseller
├── ThreeJSExample.js  # Ana 3D component
└── styles.css         # Global stiller
```

## 🔐 Güvenlik

### Production Önerileri

1. **Reverse Proxy kullan (Nginx):**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

2. **Firewall konfigürasyonu:**
```bash
# Sadece gerekli portları aç
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

3. **SSL sertifikası (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull request açın

## 📞 İletişim

Sorularınız için:
- Issue açın
- Pull request gönderin

---

**🎨 Happy Designing! ✨**
