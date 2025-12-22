#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
#                    Server Initial Setup Script
# ═══════════════════════════════════════════════════════════════════════════════
# Bu script YENİ bir Ubuntu 22.04 sunucuda root olarak çalıştırılır
# Kullanım: curl -sSL https://raw.githubusercontent.com/USER/REPO/main/deployment/server-setup.sh | bash
# veya: ./server-setup.sh

set -e

# Renkli çıktı
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🏊 KIRIKKALE OLİMPİYAT SPOR KULÜBÜ                       ║"
echo "║        Server Setup Script                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Değişkenler
DOMAIN="olimpiyatyuzme.com"
APP_USER="deploy"
PROJECT_DIR="/var/www/olimpiyat"
GITHUB_REPO="https://github.com/KULLANICI/olimpiyat.git"  # Bunu değiştirin!

# 1. Sistem güncellemesi
echo -e "${YELLOW}📦 Sistem güncelleniyor...${NC}"
apt update && apt upgrade -y

# 2. Gerekli paketleri kur
echo -e "${YELLOW}📦 Gerekli paketler kuruluyor...${NC}"
apt install -y \
    curl \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    htop

# 3. Node.js kurulumu
echo -e "${YELLOW}📦 Node.js 20 kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. PM2 kurulumu
echo -e "${YELLOW}📦 PM2 kuruluyor...${NC}"
npm install -g pm2

# 5. Deploy kullanıcısı oluştur
echo -e "${YELLOW}👤 Deploy kullanıcısı oluşturuluyor...${NC}"
if ! id "$APP_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" $APP_USER
    usermod -aG sudo $APP_USER
    # SSH key kopyala
    mkdir -p /home/$APP_USER/.ssh
    cp /root/.ssh/authorized_keys /home/$APP_USER/.ssh/
    chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
    chmod 700 /home/$APP_USER/.ssh
    chmod 600 /home/$APP_USER/.ssh/authorized_keys
fi

# 6. Firewall ayarları
echo -e "${YELLOW}🔥 Firewall ayarlanıyor...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# 7. Fail2ban yapılandırması
echo -e "${YELLOW}🔒 Fail2ban yapılandırılıyor...${NC}"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF
systemctl restart fail2ban

# 8. Proje dizini oluştur
echo -e "${YELLOW}📁 Proje dizini oluşturuluyor...${NC}"
mkdir -p $PROJECT_DIR
chown $APP_USER:$APP_USER $PROJECT_DIR

# 9. Projeyi klonla
echo -e "${YELLOW}📥 Proje klonlanıyor...${NC}"
sudo -u $APP_USER git clone $GITHUB_REPO $PROJECT_DIR || true

# 10. Nginx varsayılan siteyi kaldır
rm -f /etc/nginx/sites-enabled/default

# 11. Nginx yapılandırması (SSL olmadan önce)
echo -e "${YELLOW}🌐 Nginx yapılandırılıyor...${NC}"
cat > /etc/nginx/sites-available/olimpiyat << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name olimpiyatyuzme.com www.olimpiyatyuzme.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://www.olimpiyatyuzme.com$request_uri;
    }
}
EOF
ln -sf /etc/nginx/sites-available/olimpiyat /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     ✅ SUNUCU KURULUMU TAMAMLANDI!                           ║"
echo "║                                                              ║"
echo "║     SONRAKİ ADIMLAR:                                         ║"
echo "║     1. DNS ayarlarını yapın (A kaydı -> sunucu IP)           ║"
echo "║     2. SSL sertifikası alın:                                 ║"
echo "║        certbot --nginx -d olimpiyatyuzme.com -d www...       ║"
echo "║     3. Backend .env dosyasını oluşturun                      ║"
echo "║     4. npm install && npm run build yapın                    ║"
echo "║     5. PM2 ile başlatın                                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
