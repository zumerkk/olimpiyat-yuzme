# 🚀 olimpiyatyuzme.com Production Deployment Rehberi

Bu döküman, Kırıkkale Olimpiyat Spor Kulübü Yüzme Branşı Yönetim Sistemini `olimpiyatyuzme.com` domain'ine deploy etmek için adım adım talimatlar içerir.

---

## 📋 İçindekiler

1. [Ön Gereksinimler](#-ön-gereksinimler)
2. [Seçenek A: Render.com + Custom Domain](#-seçenek-a-rendercom--custom-domain)
3. [Seçenek B: VPS Deployment](#-seçenek-b-vps-deployment)
4. [DNS Ayarları](#-dns-ayarları)
5. [SSL Sertifikası](#-ssl-sertifikası)
6. [Test ve Doğrulama](#-test-ve-doğrulama)
7. [Bakım](#-bakım)

---

## 📦 Ön Gereksinimler

### 1. Domain Kontrolü
- `olimpiyatyuzme.com` domain'inin size ait olduğundan emin olun
- DNS yönetim paneline erişiminiz olmalı (Natro, İsimtescil, GoDaddy, vb.)

### 2. MongoDB Atlas (Zaten Mevcut)
- MongoDB Atlas hesabınız aktif olmalı
- Connection string'iniz hazır olmalı

### 3. GitHub Repository
- Proje GitHub'da: `https://github.com/zumerkk/olimpiyat-yuzme`

---

## 🎯 Seçenek A: Render.com + Custom Domain

### Avantajları
- ✅ Kolay kurulum
- ✅ Otomatik SSL sertifikası
- ✅ Otomatik deploy (GitHub push)
- ✅ Ücretsiz başlangıç (Free tier)

### Dezavantajları
- ⚠️ Free tier'da cold start (30-60 sn)
- ⚠️ Custom domain için free tier yeterli (ama performans için Starter önerilir)

---

### Adım 1: Backend Custom Domain Ayarı

1. **Render Dashboard**'a gidin: https://dashboard.render.com

2. **olimpiyat-backend** servisine tıklayın

3. **Settings** > **Custom Domains** bölümüne gidin

4. **Add Custom Domain** butonuna tıklayın

5. Domain olarak girin: `api.olimpiyatyuzme.com`

6. Render size DNS ayarları verecek (CNAME kaydı)

---

### Adım 2: Frontend Custom Domain Ayarı

1. **olimpiyat-frontend** servisine tıklayın

2. **Settings** > **Custom Domains** bölümüne gidin

3. İki domain ekleyin:
   - `www.olimpiyatyuzme.com` (Primary)
   - `olimpiyatyuzme.com` (Redirect to www)

4. Render size DNS ayarları verecek

---

### Adım 3: Environment Variables Güncelleme

**Backend** servisinde şu değişkenleri güncelleyin:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://www.olimpiyatyuzme.com` |
| `ADMIN_EMAIL` | `admin@olimpiyatyuzme.com` |

**Frontend** servisinde:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://api.olimpiyatyuzme.com/api` |

---

### Adım 4: DNS Ayarları (Domain Sağlayıcınızda)

Domain sağlayıcınızın (Natro, İsimtescil, vb.) DNS yönetim panelinde şu kayıtları ekleyin:

```
┌─────────┬──────────┬────────────────────────────────────────┬───────┐
│  Tip    │   İsim   │              Değer                     │  TTL  │
├─────────┼──────────┼────────────────────────────────────────┼───────┤
│ CNAME   │   www    │ olimpiyat-frontend.onrender.com        │ 3600  │
│ CNAME   │   api    │ olimpiyat-backend.onrender.com         │ 3600  │
│ CNAME   │    @     │ olimpiyat-frontend.onrender.com        │ 3600  │
└─────────┴──────────┴────────────────────────────────────────┴───────┘
```

**Not**: Bazı DNS sağlayıcıları root domain (@) için CNAME desteklemez. Bu durumda:
- ALIAS kaydı kullanın (varsa)
- Veya Render'ın verdiği IP adresini A kaydı olarak ekleyin

---

### Adım 5: DNS Yayılımını Bekleyin

DNS değişiklikleri yayılması 5 dakika - 48 saat sürebilir.

Kontrol için:
```bash
# Terminal'de çalıştırın
dig www.olimpiyatyuzme.com +short
dig api.olimpiyatyuzme.com +short

# veya online: https://dnschecker.org
```

---

### Adım 6: SSL Sertifikası

Render, custom domain eklediğinizde **otomatik olarak** Let's Encrypt SSL sertifikası oluşturur.

- SSL durumu: Render Dashboard > Service > Custom Domains
- "Certificate issued" görmelisiniz

---

### Adım 7: Deploy Tetikleme

DNS yayıldıktan sonra, GitHub'a bir commit yapın veya Render'da "Manual Deploy" butonuna tıklayın.

---

## 🖥️ Seçenek B: VPS Deployment

Daha fazla kontrol ve performans istiyorsanız VPS kullanabilirsiniz.

### Önerilen VPS Sağlayıcıları

| Sağlayıcı | Plan | Fiyat | Özellikler |
|-----------|------|-------|------------|
| **Hetzner** | CX11 | €4.5/ay | 2GB RAM, 20GB SSD |
| **DigitalOcean** | Basic | $6/ay | 1GB RAM, 25GB SSD |
| **Contabo** | VPS S | $5/ay | 8GB RAM, 200GB SSD |

### VPS Kurulum Adımları

#### 1. Sunucuya Bağlanın
```bash
ssh root@SUNUCU_IP
```

#### 2. Setup Script'i Çalıştırın
```bash
curl -sSL https://raw.githubusercontent.com/zumerkk/olimpiyat-yuzme/main/deployment/server-setup.sh | bash
```

#### 3. Backend .env Dosyası Oluşturun
```bash
cat > /var/www/olimpiyat/backend/.env << 'EOF'
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://KULLANICI:SIFRE@cluster.mongodb.net/olimpiyat_yuzme
JWT_SECRET=SUPER-GUCLU-RASTGELE-SECRET-KEY-EN-AZ-32-KARAKTER
JWT_EXPIRE=7d
FRONTEND_URL=https://www.olimpiyatyuzme.com
ADMIN_EMAIL=admin@olimpiyatyuzme.com
ADMIN_PASSWORD=GucluBirSifre123!
EOF
```

#### 4. Bağımlılıkları Yükleyin ve Build Alın
```bash
cd /var/www/olimpiyat
npm run install:all
cd frontend && npm run build
```

#### 5. PM2 ile Başlatın
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 6. Nginx Production Config'i Uygulayın
```bash
sudo cp /var/www/olimpiyat/deployment/nginx-production.conf /etc/nginx/sites-available/olimpiyat
sudo ln -sf /etc/nginx/sites-available/olimpiyat /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

#### 7. SSL Sertifikası Alın
```bash
sudo certbot --nginx -d olimpiyatyuzme.com -d www.olimpiyatyuzme.com
```

---

## 🌐 DNS Ayarları (Tüm Seçenekler için)

### Türk Domain Sağlayıcıları için Örnek

#### Natro.com
1. Kontrol Paneli > Domain Yönetimi > DNS Ayarları
2. Mevcut kayıtları silin
3. Yeni kayıtları ekleyin

#### İsimtescil.net
1. Domain Yönetimi > DNS Yönetimi
2. "Kayıt Ekle" butonuna tıklayın
3. Kayıtları tek tek ekleyin

---

## 🔒 SSL Sertifikası

### Render.com (Otomatik)
- Custom domain eklendiğinde otomatik oluşur
- Her 60 günde otomatik yenilenir

### VPS (Let's Encrypt)
```bash
# Sertifika al
sudo certbot --nginx -d olimpiyatyuzme.com -d www.olimpiyatyuzme.com

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

---

## ✅ Test ve Doğrulama

Deploy tamamlandıktan sonra şunları test edin:

### 1. URL'leri Kontrol Edin
- [ ] https://www.olimpiyatyuzme.com - Frontend açılıyor mu?
- [ ] https://olimpiyatyuzme.com - www'ye yönleniyor mu?
- [ ] https://api.olimpiyatyuzme.com/api/health - Backend sağlıklı mı?
- [ ] https://api.olimpiyatyuzme.com/api/ping - Ping çalışıyor mu?

### 2. SSL Kontrolü
- [ ] https://www.ssllabs.com/ssltest/ adresinde domain'i test edin
- [ ] A veya B+ rating almanız gerekir

### 3. Fonksiyon Testleri
- [ ] Login çalışıyor mu?
- [ ] Online kayıt formu çalışıyor mu?
- [ ] Sporcu ekleme çalışıyor mu?
- [ ] Ödeme kaydetme çalışıyor mu?

### 4. Mobil Test
- [ ] Telefondan www.olimpiyatyuzme.com açın
- [ ] Kayıt formunu doldurup gönderin

---

## 🔧 Bakım

### Log İzleme
```bash
# Render.com
# Dashboard > Logs sekmesi

# VPS
pm2 logs olimpiyat-backend
tail -f /var/www/olimpiyat/backend/logs/combined.log
```

### Güncelleme Yapma
```bash
# VPS için
cd /var/www/olimpiyat
./deployment/deploy.sh

# Render.com
# GitHub'a push yapmanız yeterli - otomatik deploy
```

### Yedekleme
MongoDB Atlas otomatik yedekleme yapar. Manuel yedek için:
```bash
mongodump --uri="MONGODB_URI" --out=/backup/$(date +%Y%m%d)
```

---

## 🆘 Sorun Giderme

### CORS Hatası
1. Backend'de `FRONTEND_URL` doğru mu kontrol edin
2. `config.js`'de `ALLOWED_ORIGINS` array'ine domain'i ekleyin
3. Redeploy yapın

### 502 Bad Gateway
```bash
# Backend çalışıyor mu?
pm2 status
curl localhost:5001/api/health
```

### SSL Hatası
```bash
# Sertifika durumu
sudo certbot certificates

# Yenileme
sudo certbot renew
```

### DNS Yayılmadı
- 48 saat bekleyin
- https://dnschecker.org adresinde kontrol edin
- Tarayıcı cache'ini temizleyin

---

## 📞 Destek

Teknik sorunlar için:
- GitHub Issues: https://github.com/zumerkk/olimpiyat-yuzme/issues
- E-posta: destek@olimpiyatyuzme.com

---

**© 2024 Kırıkkale Olimpiyat Spor Kulübü - Yüzme Branşı**

