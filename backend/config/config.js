// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Enterprise Configuration
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();

const config = {
  // ─────────────────────────────────────────────────────────────────────────────
  // Server
  // ─────────────────────────────────────────────────────────────────────────────
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5001,
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MongoDB
  // ─────────────────────────────────────────────────────────────────────────────
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/olimpiyat_yuzme',
  MONGODB_OPTIONS: {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    w: 'majority'
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // JWT
  // ─────────────────────────────────────────────────────────────────────────────
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Admin Default
  // ─────────────────────────────────────────────────────────────────────────────
  ADMIN_DEFAULT: {
    email: process.env.ADMIN_EMAIL || 'admin@olimpiyatyuzme.com',
    password: process.env.ADMIN_PASSWORD || 'OlimpiyatAdmin2024!',
    name: process.env.ADMIN_NAME || 'Sistem Yöneticisi',
    role: 'super_admin'
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CORS
  // ─────────────────────────────────────────────────────────────────────────────
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CORS_OPTIONS: {
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ─────────────────────────────────────────────────────────────────────────────
  RATE_LIMIT: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 dakika
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // 100 istek
    message: {
      success: false,
      message: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Auth Rate Limiting (daha sıkı)
  // ─────────────────────────────────────────────────────────────────────────────
  AUTH_RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 5, // 5 deneme
    message: {
      success: false,
      message: 'Çok fazla başarısız giriş denemesi. 15 dakika sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // NetGSM SMS
  // ─────────────────────────────────────────────────────────────────────────────
  NETGSM: {
    enabled: process.env.NETGSM_ENABLED === 'true',
    usercode: process.env.NETGSM_USERCODE || '',
    password: process.env.NETGSM_PASSWORD || '',
    msgheader: process.env.NETGSM_MSGHEADER || '',
    apiUrl: 'https://api.netgsm.com.tr/sms/send/get'
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Logging
  // ─────────────────────────────────────────────────────────────────────────────
  LOGGING: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
    maxSize: '20m',
    maxFiles: '14d'
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────────────
  NOTIFICATIONS: {
    PAYMENT_REMINDER_DAYS: parseInt(process.env.PAYMENT_REMINDER_DAYS, 10) || 7,
    SESSION_REMINDER_DAYS: parseInt(process.env.SESSION_REMINDER_DAYS, 10) || 3,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Yüzme branşı ayarları
  // ─────────────────────────────────────────────────────────────────────────────
  SWIMMING: {
    SESSION_TYPES: ['Başlangıç', 'Orta Seviye', 'İleri Seviye', 'Yarışma Hazırlık', 'Özel Ders'],
    AGE_GROUPS: ['Mini (4-6)', 'Küçükler (7-9)', 'Yıldızlar (10-12)', 'Gençler (13-15)', 'Büyükler (16+)'],
    PAYMENT_STATUS: ['Ödendi', 'Beklemede', 'Gecikmiş', 'Kısmi Ödeme'],
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────
  isDevelopment() {
    return this.NODE_ENV === 'development';
  },
  
  isProduction() {
    return this.NODE_ENV === 'production';
  },
  
  isTest() {
    return this.NODE_ENV === 'test';
  }
};

// Validate critical config
const validateConfig = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required configuration:', missing.join(', '));
    process.exit(1);
  }
  
  if (config.isProduction() && config.JWT_SECRET === 'fallback_secret_change_in_production') {
    console.error('❌ JWT_SECRET must be changed in production!');
    process.exit(1);
  }
};

validateConfig();

module.exports = config;
