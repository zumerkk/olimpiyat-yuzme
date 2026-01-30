# 🚀 Olimpiyat Yüzme - Deployment ve Domain Kılavuzu

## 📋 İçindekiler

1. [Mevcut Durum](#-mevcut-durum)
2. [Domain Satın Alma](#-domain-satın-alma-rehberi)
3. [Domain'i Render'a Bağlama](#-domaini-rendera-bağlama)
4. [Render Dashboard Ayarları](#-render-dashboard-ayarları)
5. [Sorun Giderme](#-sorun-giderme)
6. [Bakım ve Güncelleme](#-bakım-ve-güncelleme)

---

## 📊 Mevcut Durum

### Sistem Yapısı
- **Backend**: Node.js/Express + MongoDB Atlas
- **Frontend**: React + Vite + Tailwind CSS
- **SMS**: BozkurtSMS (www.bozkurtsms.com.tr)
- **Hosting**: Render.com (Free Tier)

### Render URL'leri (Şu An Aktif)
| Servis | URL |
|--------|-----|
| Frontend | https://olimpiyat-frontend.onrender.com |
| Backend API | https://olimpiyat-backend.onrender.com/api |
| Health Check | https://olimpiyat-backend.onrender.com/api/health |

### Giriş Bilgileri
- **Email**: admin@olimpiyatyuzme.com
- **Şifre**: OlimpiyatAdmin2024!

---

## 🌐 Domain Satın Alma Rehberi

### Önerilen Domain Sağlayıcıları (Türkiye)

| Sağlayıcı | Website | Fiyat (.com) | Önerilen Mi? |
|-----------|---------|--------------|--------------|
| **Natro** | natro.com | ~150-200₺/yıl | ✅ En İyi |
| **İsimtescil** | isimtescil.net | ~150-200₺/yıl | ✅ Güvenilir |
| **Turhost** | turhost.com | ~180-220₺/yıl | ✅ İyi |
| GoDaddy | godaddy.com | ~$15/yıl | Yabancı |
| Namecheap | namecheap.com | ~$10/yıl | Yabancı |

### 📝 Adım Adım Domain Satın Alma (Natro Örneği)

#### Adım 1: natro.com'a Git
1. https://natro.com adresine gir
2. Sağ üstten "Giriş Yap" veya "Kayıt Ol"
3. Hesap oluştur (TC kimlik, telefon gerekli)

#### Adım 2: Domain Ara
1. Ana sayfada "olimpiyatyuzme.com" yaz
2. "Ara" butonuna tıkla
3. Domain müsaitse "Sepete Ekle"

#### Adım 3: Satın Al
1. Sepete git
2. Süre seç (1 yıl önerilir)
3. **WHOIS Gizliliği**: AÇIK yap (kişisel bilgiler gizlenir)
4. Ödeme yap (Kredi kartı veya havale)

#### Adım 4: DNS Paneline Eriş
1. Natro Panel > Domain Yönetimi
2. olimpiyatyuzme.com yanında "DNS Yönetimi"
3. Bu paneli aç, bir sonraki adımda kullanacağız

---

## 🔗 Domain'i Render'a Bağlama

### Genel Bakış
```
olimpiyatyuzme.com     →  Frontend (www'ye yönlendir)
www.olimpiyatyuzme.com →  Frontend (React App)
api.olimpiyatyuzme.com →  Backend (Node.js API)
```

### 🔧 ADIM 1: DNS Kayıtları Ekle (Domain Sağlayıcı Panelinde)

Domain sağlayıcının DNS yönetim panelinde şu kayıtları ekle:

| Tip | İsim (Host) | Değer (Value) | TTL |
|-----|-------------|---------------|-----|
| **CNAME** | www | olimpiyat-frontend.onrender.com | 3600 |
| **CNAME** | api | olimpiyat-backend.onrender.com | 3600 |

**Ana Domain (@) için** iki seçenek var:

**Seçenek A - CNAME Flattening (Natro, Cloudflare destekler):**
| Tip | İsim | Değer | TTL |
|-----|------|-------|-----|
| CNAME | @ | olimpiyat-frontend.onrender.com | 3600 |

**Seçenek B - Redirect (Tüm sağlayıcılar):**
Domain sağlayıcının "Yönlendirme" özelliğini kullan:
- olimpiyatyuzme.com → https://www.olimpiyatyuzme.com (301 Redirect)

### 🔧 ADIM 2: Render'da Custom Domain Ekle

#### Frontend için:
1. https://dashboard.render.com aç
2. "olimpiyat-frontend" servisine tıkla
3. Sol menüden **Settings** > **Custom Domains**
4. **Add Custom Domain** tıkla
5. `www.olimpiyatyuzme.com` yaz, **Save** tıkla
6. Tekrar **Add Custom Domain** tıkla
7. `olimpiyatyuzme.com` yaz, **Save** tıkla
8. "Verified" yazısını bekle (5-30 dakika)

#### Backend için:
1. "olimpiyat-backend" servisine tıkla
2. Sol menüden **Settings** > **Custom Domains**
3. **Add Custom Domain** tıkla
4. `api.olimpiyatyuzme.com` yaz, **Save** tıkla
5. "Verified" yazısını bekle

### 🔧 ADIM 3: Environment Variables Güncelle

#### Backend'de (olimpiyat-backend > Environment):
| Key | Eski Değer | Yeni Değer |
|-----|------------|------------|
| FRONTEND_URL | https://olimpiyat-frontend.onrender.com | **https://www.olimpiyatyuzme.com** |

#### Frontend'de (olimpiyat-frontend > Environment):
| Key | Eski Değer | Yeni Değer |
|-----|------------|------------|
| VITE_API_URL | https://olimpiyat-backend.onrender.com/api | **https://api.olimpiyatyuzme.com/api** |

**ÖNEMLİ**: Environment değiştirdikten sonra:
1. **Backend**: Otomatik yeniden başlar
2. **Frontend**: Manual Deploy > **Deploy latest commit** tıkla

### 🔧 ADIM 4: SSL Sertifikası (Otomatik)
- Render otomatik **Let's Encrypt** SSL sertifikası sağlar
- DNS doğrulandıktan sonra 5-15 dakika içinde aktif olur
- `https://` ile erişim otomatik çalışır

---

## ⚙️ Render Dashboard Ayarları

### İlk Kurulum için Gerekli Environment Variables

**Backend (olimpiyat-backend > Environment > Add Environment Variable):**

| Key | Value | Tür |
|-----|-------|-----|
| NODE_ENV | production | Plain |
| PORT | 5001 | Plain |
| MONGODB_URI | mongodb+srv://olimpiyatsporklub:2002.2002@olimpiyatyuzme.tsd5d6y.mongodb.net/olimpiyat_yuzme?retryWrites=true&w=majority&appName=olimpiyatyuzme | **Secret** |
| JWT_SECRET | (Render otomatik oluşturur) | Secret |
| FRONTEND_URL | https://olimpiyat-frontend.onrender.com | Plain |
| ADMIN_EMAIL | admin@olimpiyatyuzme.com | Plain |
| ADMIN_PASSWORD | OlimpiyatAdmin2024! | **Secret** |
| SMS_ENABLED | true | Plain |
| SMS_USERNAME | 05303331182 | **Secret** |
| SMS_PASSWORD | bozkurt | **Secret** |
| SMS_SENDER | MURAT UCAR | Plain |
| SMS_API_URL | https://www.bozkurtsms.com.tr/services/api.php?islem=sms | Plain |
| AUTO_SMS_ENABLED | true | Plain |

**Frontend (olimpiyat-frontend > Environment):**

| Key | Value |
|-----|-------|
| VITE_API_URL | https://olimpiyat-backend.onrender.com/api |

---

## 🆘 Sorun Giderme

### DNS Yayılma Kontrolü
```bash
# Terminal'de çalıştır:
nslookup www.olimpiyatyuzme.com
nslookup api.olimpiyatyuzme.com

# Online araç: https://dnschecker.org
```

### Yaygın Sorunlar

#### 1. "DNS not verified" hatası
- DNS kayıtlarının doğru eklendiğinden emin ol
- 5-30 dakika bekle (DNS yayılması zaman alır)
- TTL değerini 300-3600 arasında tut

#### 2. CORS Hatası
Backend config'de FRONTEND_URL'in doğru olduğundan emin ol:
```javascript
// backend/.env veya Render Environment
FRONTEND_URL=https://www.olimpiyatyuzme.com
```

#### 3. 502 Bad Gateway
- Backend loglarını kontrol et: Render Dashboard > Logs
- Health check: https://api.olimpiyatyuzme.com/api/health
- MongoDB bağlantısını kontrol et

#### 4. Frontend Yüklenmiyor
- Build loglarını kontrol et
- VITE_API_URL'in doğru olduğundan emin ol
- Browser cache'i temizle (Ctrl+Shift+R)

#### 5. SMS Gönderilmiyor
- SMS_ENABLED=true olduğundan emin ol
- BozkurtSMS panelinden bakiye kontrol et
- Gönderici başlığının (MURAT UCAR) onaylı olduğundan emin ol

---

## 🔧 Bakım ve Güncelleme

### Kod Güncelleme
```bash
# Lokal'de değişiklik yap
git add .
git commit -m "Güncelleme açıklaması"
git push origin main
# Render otomatik deploy eder
```

### Veritabanı Yedekleme
MongoDB Atlas otomatik yedekleme yapar. Manuel yedek için:
1. MongoDB Atlas > Clusters > ... > Backup
2. "Take Snapshot Now"

### Log İzleme
- Render Dashboard > olimpiyat-backend > Logs
- Gerçek zamanlı log takibi

### Performans İzleme
- Render Dashboard > Metrics
- CPU, Memory, Response Time

---

## 📞 Önemli Bilgiler

### Render Free Tier Limitleri
- Backend: 750 saat/ay (yeterli)
- 15 dakika inaktivitede uyku moduna geçer
- İlk istekte 30-60 saniye gecikme olabilir
- Static site (frontend) her zaman aktif

### Uyku Modunu Önleme (Opsiyonel)
UptimeRobot gibi bir servis ile her 14 dakikada ping atabilirsiniz:
1. https://uptimerobot.com'a ücretsiz kayıt ol
2. Monitor ekle: https://olimpiyat-backend.onrender.com/api/ping
3. Interval: 14 dakika

### Destek
- Teknik destek: Render Discord/Documentation
- Domain sorunları: Domain sağlayıcı destek

---

## ✅ Kontrol Listesi

### Domain Satın Alma
- [ ] Domain sağlayıcıda hesap oluşturuldu
- [ ] olimpiyatyuzme.com satın alındı
- [ ] WHOIS gizliliği açıldı

### DNS Ayarları
- [ ] www CNAME kaydı eklendi
- [ ] api CNAME kaydı eklendi
- [ ] @ (root) yönlendirmesi yapıldı

### Render Ayarları
- [ ] Frontend custom domain eklendi
- [ ] Backend custom domain eklendi
- [ ] SSL sertifikaları aktif
- [ ] Environment variables güncellendi
- [ ] Frontend yeniden deploy edildi

### Test
- [ ] https://www.olimpiyatyuzme.com açılıyor
- [ ] https://api.olimpiyatyuzme.com/api/health çalışıyor
- [ ] Giriş yapılabiliyor
- [ ] SMS gönderimi çalışıyor

---

**Son Güncelleme**: Ocak 2026  
**© Kırıkkale Olimpiyat Spor Kulübü**
