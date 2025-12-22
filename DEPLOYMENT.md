# 🚀 Olimpiyat Yüzme - Deployment Kılavuzu

## 📋 İçindekiler

1. [Hızlı Test (Render.com)](#-hızlı-test-rendercom)
2. [Production Deployment (VPS)](#-production-deployment-vps)
3. [Domain Ayarları](#-domain-ayarları)
4. [SSL Sertifikası](#-ssl-sertifikası)
5. [Bakım ve Güncelleme](#-bakım-ve-güncelleme)

---

## 🧪 Hızlı Test (Render.com)

### Gereksinimler
- GitHub hesabı
- MongoDB Atlas hesabı (ücretsiz)

### Adım 1: MongoDB Atlas

1. https://www.mongodb.com/atlas adresine gidin
2. Ücretsiz hesap oluşturun
3. "Build a Cluster" → Free Tier (M0)
4. **Database Access**: Kullanıcı oluşturun
5. **Network Access**: `0.0.0.0/0` ekleyin (her yerden erişim)
6. **Connect** → **Connect your application** → Connection string'i kopyalayın:
   ```
   mongodb+srv://kullanici:sifre@cluster.xxxxx.mongodb.net/olimpiyat_yuzme
   ```

### Adım 2: GitHub'a Push

```bash
cd /path/to/Olimpiyat
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI/olimpiyat.git
git push -u origin main
```

### Adım 3: Render.com'da Deploy

#### Backend:
1. https://render.com → New Web Service
2. GitHub reposunu bağlayın
3. Ayarlar:
   - **Name**: olimpiyat-backend
   - **Root Directory**: backend
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Environment Variables:
   - `NODE_ENV`: production
   - `PORT`: 5001
   - `MONGODB_URI`: (Atlas'tan aldığınız URI)
   - `JWT_SECRET`: (güçlü bir secret key)

#### Frontend:
1. New Static Site
2. Ayarlar:
   - **Name**: olimpiyat-frontend
   - **Root Directory**: frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: dist
3. Environment Variables:
   - `VITE_API_URL`: https://olimpiyat-backend.onrender.com/api
4. Redirects/Rewrites ekleyin:
   - Source: `/*`
   - Destination: `/index.html`
   - Type: Rewrite

### Test URL'leri
- Frontend: https://olimpiyat-frontend.onrender.com
- Backend API: https://olimpiyat-backend.onrender.com/api
- Health Check: https://olimpiyat-backend.onrender.com/api/health

---

## 🖥️ Production Deployment (VPS)

### Önerilen VPS Sağlayıcıları

| Sağlayıcı | Minimum Plan | Fiyat |
|-----------|--------------|-------|
| DigitalOcean | Basic Droplet | $6/ay |
| Hetzner | CX11 | €4.5/ay |
| Contabo | VPS S | $5/ay |
| AWS Lightsail | 1GB | $5/ay |

### Sunucu Gereksinimleri
- Ubuntu 22.04 LTS
- 1 GB RAM (minimum)
- 25 GB SSD
- 1 vCPU

### Adım 1: Sunucu Kurulumu

```bash
# SSH ile bağlanın
ssh root@SUNUCU_IP

# Setup scriptini indirip çalıştırın
curl -sSL https://raw.githubusercontent.com/KULLANICI/olimpiyat/main/deployment/server-setup.sh | bash
```

Veya manuel:

```bash
# Sistem güncellemesi
apt update && apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Diğer paketler
apt install -y nginx certbot python3-certbot-nginx git

# PM2
npm install -g pm2

# Deploy kullanıcısı
adduser deploy
usermod -aG sudo deploy
```

### Adım 2: Projeyi Klonla

```bash
su - deploy
git clone https://github.com/KULLANICI/olimpiyat.git /var/www/olimpiyat
cd /var/www/olimpiyat
```

### Adım 3: Backend .env Oluştur

```bash
cat > /var/www/olimpiyat/backend/.env << 'EOF'
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/olimpiyat_yuzme
JWT_SECRET=super-guclu-secret-key-degistirin-123!
JWT_EXPIRE=7d
FRONTEND_URL=https://www.olimpiyatyuzme.com
EOF
```

### Adım 4: Bağımlılıkları Yükle ve Build

```bash
cd /var/www/olimpiyat/backend
npm install

cd /var/www/olimpiyat/frontend
npm install
npm run build
```

### Adım 5: PM2 ile Başlat

```bash
cd /var/www/olimpiyat
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Adım 6: Nginx Yapılandırması

```bash
# Production nginx config'i kopyala
sudo cp /var/www/olimpiyat/deployment/nginx-production.conf /etc/nginx/sites-available/olimpiyat
sudo ln -sf /etc/nginx/sites-available/olimpiyat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🌐 Domain Ayarları

### DNS Ayarları (Domain sağlayıcınızda)

| Tip | İsim | Değer | TTL |
|-----|------|-------|-----|
| A | @ | SUNUCU_IP | 3600 |
| A | www | SUNUCU_IP | 3600 |
| CNAME | api | @ | 3600 |

### Türk Domain Sağlayıcıları
- natro.com
- isimtescil.net
- turhost.com
- güzel.net

### DNS Propagation Kontrolü
```bash
# DNS'in yayılıp yayılmadığını kontrol edin
dig olimpiyatyuzme.com +short
nslookup olimpiyatyuzme.com
```

---

## 🔒 SSL Sertifikası

### Let's Encrypt (Ücretsiz)

```bash
# DNS yayıldıktan sonra çalıştırın
sudo certbot --nginx -d olimpiyatyuzme.com -d www.olimpiyatyuzme.com

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

### Otomatik Yenileme (Cron)
```bash
# Certbot otomatik cron ekler, kontrol edin:
sudo systemctl status certbot.timer
```

---

## 🔧 Bakım ve Güncelleme

### Güncelleme Yapma

```bash
cd /var/www/olimpiyat
./deployment/deploy.sh
```

Veya manuel:

```bash
git pull origin main
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 reload ecosystem.config.js --env production
```

### Logları İzleme

```bash
# PM2 logları
pm2 logs olimpiyat-backend

# Nginx logları
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Uygulama logları
tail -f /var/www/olimpiyat/backend/logs/*.log
```

### Sağlık Kontrolü

```bash
# API Health
curl https://www.olimpiyatyuzme.com/api/health

# PM2 status
pm2 status

# Sistem durumu
htop
df -h
free -m
```

### Yedekleme

```bash
# MongoDB Atlas otomatik yedekleme yapar
# Manuel yedek için:
mongodump --uri="MONGODB_URI" --out=/backup/$(date +%Y%m%d)
```

---

## 🆘 Sorun Giderme

### Backend başlamıyor
```bash
cd /var/www/olimpiyat/backend
pm2 logs olimpiyat-backend --lines 100
```

### MongoDB bağlantı hatası
1. Atlas'ta Network Access kontrol edin
2. IP whitelist'e sunucu IP'sini ekleyin
3. Connection string'i kontrol edin

### 502 Bad Gateway
```bash
# Backend çalışıyor mu?
pm2 status
curl localhost:5001/api/health

# Nginx config doğru mu?
sudo nginx -t
```

### CORS Hatası
1. Backend'de `FRONTEND_URL` doğru mu kontrol edin
2. Tarayıcı cache'ini temizleyin
3. `server.js`'de CORS ayarlarını kontrol edin

---

## 📞 Destek

Teknik destek için: destek@olimpiyatyuzme.com

---

**© 2024 Kırıkkale Olimpiyat Spor Kulübü**
