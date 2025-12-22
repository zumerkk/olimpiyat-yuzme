#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
#                    Production Deployment Script
# ═══════════════════════════════════════════════════════════════════════════════
# Kullanım: ./deploy.sh
# Bu script sunucuda çalıştırılır

set -e

# Renkli çıktı
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🏊 KIRIKKALE OLİMPİYAT SPOR KULÜBÜ                       ║"
echo "║        Production Deployment Script                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

PROJECT_DIR="/var/www/olimpiyat"
BRANCH="main"

# 1. Mevcut dizine git
echo -e "${YELLOW}📁 Proje dizinine gidiliyor...${NC}"
cd $PROJECT_DIR

# 2. Git pull
echo -e "${YELLOW}📥 Son değişiklikler alınıyor...${NC}"
git fetch origin
git reset --hard origin/$BRANCH

# 3. Backend bağımlılıkları
echo -e "${YELLOW}📦 Backend bağımlılıkları yükleniyor...${NC}"
cd $PROJECT_DIR/backend
npm ci --only=production

# 4. Frontend build
echo -e "${YELLOW}🔨 Frontend build ediliyor...${NC}"
cd $PROJECT_DIR/frontend
npm ci
npm run build

# 5. PM2 restart
echo -e "${YELLOW}🔄 Backend yeniden başlatılıyor...${NC}"
cd $PROJECT_DIR
pm2 reload ecosystem.config.js --env production

# 6. Nginx reload (cache temizliği için)
echo -e "${YELLOW}🌐 Nginx yeniden yükleniyor...${NC}"
sudo nginx -t && sudo systemctl reload nginx

# 7. Sağlık kontrolü
echo -e "${YELLOW}🏥 Sağlık kontrolü yapılıyor...${NC}"
sleep 3
HEALTH=$(curl -s http://localhost:5001/api/health)
if echo "$HEALTH" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Backend sağlıklı!${NC}"
else
    echo -e "${RED}❌ Backend sağlık kontrolü başarısız!${NC}"
    echo "$HEALTH"
    exit 1
fi

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     ✅ DEPLOYMENT BAŞARILI!                                  ║"
echo "║     🌐 https://www.olimpiyatyuzme.com                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
