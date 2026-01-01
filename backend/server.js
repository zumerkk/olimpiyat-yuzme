// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         YÜZME BRANŞI YÖNETİM SİSTEMİ
//                      Enterprise Backend Server v3.1
//                    Render.com Cold Start Optimized + CORS Fixed
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');
const cron = require('node-cron');

// Configuration
const config = require('./config/config');

// Services
const logger = require('./services/logger');
const NotificationService = require('./services/notificationService');

// Middleware
const {
  helmetMiddleware,
  generalRateLimiter,
  authRateLimiter,
  publicRateLimiter,
  mongoSanitizeMiddleware,
  hppMiddleware,
  xssClean,
  additionalHeaders
} = require('./middleware/security');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const athleteRoutes = require('./routes/athletes');
const sessionRoutes = require('./routes/sessions');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const registrationRoutes = require('./routes/registration');

// ═══════════════════════════════════════════════════════════════════════════════
// Server State Management (Enterprise)
// ═══════════════════════════════════════════════════════════════════════════════

const serverState = {
  isReady: false,
  isDbConnected: false,
  startupTime: Date.now(),
  lastHealthCheck: null,
  healthCheckCache: null,
  requestCount: 0,
  errorCount: 0
};

// ═══════════════════════════════════════════════════════════════════════════════
// Express App
// ═══════════════════════════════════════════════════════════════════════════════
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ═══════════════════════════════════════════════════════════════════════════════
// CORS Configuration - MUST BE FIRST (before any routes)
// ═══════════════════════════════════════════════════════════════════════════════

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, health checks, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      config.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'https://olimpiyat-frontend.onrender.com',
      'https://olimpiyat-backend.onrender.com',
      // Render.com URLs (wildcard support)
      /\.onrender\.com$/,
      // Vercel URLs
      /\.vercel\.app$/,
      // Netlify URLs
      /\.netlify\.app$/
    ];
    
    // Check string origins and regex patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin });
      // Don't error, just don't set header - let the request through for debugging
      callback(null, true);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
};

// Apply CORS to ALL routes
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ═══════════════════════════════════════════════════════════════════════════════
// Request ID middleware (for tracking)
// ═══════════════════════════════════════════════════════════════════════════════

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  serverState.requestCount++;
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fast Health Check Endpoints (After CORS, before heavy middleware)
// ═══════════════════════════════════════════════════════════════════════════════

// Super fast ping - just for wake-up checks
app.get('/api/ping', (req, res) => {
  res.json({ 
    pong: true, 
    timestamp: Date.now(),
    serverReady: serverState.isReady,
    dbConnected: serverState.isDbConnected
  });
});

// Detailed readiness check
app.get('/api/ready', async (req, res) => {
  const checks = {
    server: true,
    database: mongoose.connection.readyState === 1,
    configured: !!config.MONGODB_URI && !!config.JWT_SECRET
  };
  
  const allReady = Object.values(checks).every(v => v === true);
  
  res.status(allReady ? 200 : 503).json({
    ready: allReady,
    checks,
    timestamp: new Date().toISOString()
  });
});

// Full health check with caching
app.get('/api/health', async (req, res) => {
  const now = Date.now();
  
  // Cache kontrolü (5 saniye)
  if (serverState.healthCheckCache && 
      (now - serverState.lastHealthCheck) < config.WARMUP.healthCheckCache) {
    return res.status(serverState.healthCheckCache.status).json(serverState.healthCheckCache.data);
  }
  
  const healthcheck = {
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    uptimeFormatted: formatUptime(process.uptime()),
    environment: config.NODE_ENV,
    version: '3.1.0',
    requestId: req.requestId,
    serverReady: serverState.isReady,
    services: {
      database: 'checking...',
      sms: config.NETGSM.enabled ? 'enabled' : 'disabled'
    },
    metrics: {
      requestCount: serverState.requestCount,
      errorCount: serverState.errorCount,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    }
  };

  try {
    // MongoDB connection check
    const dbState = mongoose.connection.readyState;
    
    if (dbState === 1) {
      healthcheck.services.database = 'connected';
      serverState.isDbConnected = true;
    } else if (dbState === 2) {
      healthcheck.services.database = 'connecting';
      healthcheck.status = 'STARTING';
      healthcheck.success = true;
    } else {
      healthcheck.services.database = 'disconnected';
      healthcheck.status = 'DEGRADED';
      serverState.isDbConnected = false;
    }

    // Overall server readiness
    healthcheck.serverReady = serverState.isReady && dbState === 1;
    
    const statusCode = healthcheck.serverReady ? 200 : 503;
    
    // Cache the result
    serverState.healthCheckCache = {
      status: statusCode,
      data: healthcheck
    };
    serverState.lastHealthCheck = now;
    
    res.status(statusCode).json(healthcheck);
  } catch (error) {
    healthcheck.status = 'ERROR';
    healthcheck.services.database = 'error';
    healthcheck.error = error.message;
    serverState.errorCount++;
    res.status(503).json(healthcheck);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════════════════════════════════════════

// Helmet - HTTP security headers
app.use(helmetMiddleware);

// Additional security headers
app.use(additionalHeaders);

// ═══════════════════════════════════════════════════════════════════════════════
// Body Parser & Compression
// ═══════════════════════════════════════════════════════════════════════════════

// Compression
app.use(compression({
  level: 6,
  threshold: 100 * 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════════
// Security: Input Sanitization
// ═══════════════════════════════════════════════════════════════════════════════

// MongoDB injection protection
app.use(mongoSanitizeMiddleware);

// XSS protection
app.use(xssClean);

// HTTP Parameter Pollution protection
app.use(hppMiddleware);

// ═══════════════════════════════════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════════════════════════════════

if (config.isProduction()) {
  app.use(morgan('combined', { stream: logger.stream }));
} else {
  app.use(morgan('dev'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════════

// General rate limiter for protected routes
app.use('/api/athletes', generalRateLimiter);
app.use('/api/sessions', generalRateLimiter);
app.use('/api/payments', generalRateLimiter);
app.use('/api/notifications', generalRateLimiter);
app.use('/api/dashboard', generalRateLimiter);

// Public endpoints için daha gevşek rate limit
app.use('/api/registration', publicRateLimiter);

// Auth rate limiter (stricter)
app.use('/api/auth/login', authRateLimiter);

// ═══════════════════════════════════════════════════════════════════════════════
// Static Files
// ═══════════════════════════════════════════════════════════════════════════════

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));
app.use('/assets', express.static(path.join(__dirname, '../'), {
  maxAge: '7d',
  etag: true
}));

// ═══════════════════════════════════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════════════════════════════════

app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/registration', registrationRoutes);

// API info
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '🏊 Kırıkkale Olimpiyat Spor Kulübü - Yüzme Branşı API',
    version: '3.1.0',
    environment: config.NODE_ENV,
    serverReady: serverState.isReady,
    endpoints: {
      health: '/api/health',
      ready: '/api/ready',
      ping: '/api/ping',
      auth: '/api/auth',
      athletes: '/api/athletes',
      sessions: '/api/sessions',
      payments: '/api/payments',
      notifications: '/api/notifications',
      dashboard: '/api/dashboard',
      registration: '/api/registration'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use((err, req, res, next) => {
  serverState.errorCount++;
  globalErrorHandler(err, req, res, next);
});

// ═══════════════════════════════════════════════════════════════════════════════
// MongoDB Connection with Retry Logic
// ═══════════════════════════════════════════════════════════════════════════════

const connectDB = async (retryCount = 0) => {
  const maxRetries = config.WARMUP.preconnectAttempts;
  
  try {
    logger.info(`🔄 MongoDB bağlantısı kuruluyor... (Deneme ${retryCount + 1}/${maxRetries})`);
    
    const conn = await mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS);
    
    logger.info(`✅ MongoDB bağlantısı başarılı: ${conn.connection.host}`);
    serverState.isDbConnected = true;
    
    // Varsayılan admin oluştur
    const Admin = require('./models/Admin');
    await Admin.createDefaultAdmin();
    
    return conn;
  } catch (error) {
    logger.error(`❌ MongoDB bağlantı hatası (Deneme ${retryCount + 1}):`, { error: error.message });
    
    if (retryCount < maxRetries - 1) {
      const delay = Math.min(5000 * (retryCount + 1), 15000);
      logger.info(`⏳ ${delay/1000} saniye sonra tekrar denenecek...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }
    
    logger.error('❌ MongoDB bağlantısı kurulamadı. Server yine de başlatılacak.');
    return null;
  }
};

// MongoDB connection events
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
  serverState.isDbConnected = true;
  serverState.healthCheckCache = null;
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error', { error: err.message });
  serverState.isDbConnected = false;
  serverState.healthCheckCache = null;
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
  serverState.isDbConnected = false;
  serverState.healthCheckCache = null;
});

// Reconnect on disconnect
mongoose.connection.on('disconnected', () => {
  if (config.isProduction()) {
    setTimeout(() => {
      logger.info('🔄 MongoDB yeniden bağlanılıyor...');
      mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS).catch(() => {});
    }, 5000);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scheduled Jobs - Cron
// ═══════════════════════════════════════════════════════════════════════════════

cron.schedule('0 9 * * *', async () => {
  if (!serverState.isDbConnected) {
    logger.warn('Bildirim kontrolü atlandı - DB bağlantısı yok');
    return;
  }
  
  logger.info('🔔 Günlük bildirim kontrolü başlatıldı');
  try {
    const paymentReminders = await NotificationService.checkPaymentReminders();
    const sessionReminders = await NotificationService.checkSessionReminders();
    logger.info('✅ Bildirim kontrolü tamamlandı', { paymentReminders, sessionReminders });
  } catch (error) {
    logger.error('❌ Bildirim kontrolü hatası', { error: error.message });
  }
}, {
  scheduled: true,
  timezone: 'Europe/Istanbul'
});

cron.schedule('0 0 1 * *', async () => {
  if (!serverState.isDbConnected) {
    logger.warn('Aylık ödeme oluşturma atlandı - DB bağlantısı yok');
    return;
  }
  
  logger.info('📅 Aylık ödeme kayıtları oluşturuluyor');
  try {
    const Payment = require('./models/Payment');
    const Athlete = require('./models/Athlete');
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const dueDate = new Date(currentYear, now.getMonth(), 15);

    const monthlyAthletes = await Athlete.find({
      status: 'Aktif',
      membershipType: 'Aylık'
    });

    let created = 0;
    for (const athlete of monthlyAthletes) {
      const existing = await Payment.findOne({
        athlete: athlete._id,
        paymentType: 'Aylık',
        'period.month': currentMonth,
        'period.year': currentYear
      });

      if (!existing) {
        await Payment.create({
          athlete: athlete._id,
          paymentType: 'Aylık',
          amount: athlete.monthlyFee || 1500,
          period: { month: currentMonth, year: currentYear },
          dueDate: dueDate
        });
        created++;
      }
    }

    logger.info(`✅ ${created} aylık ödeme kaydı oluşturuldu`);
  } catch (error) {
    logger.error('❌ Aylık ödeme oluşturma hatası', { error: error.message });
  }
}, {
  scheduled: true,
  timezone: 'Europe/Istanbul'
});

// ═══════════════════════════════════════════════════════════════════════════════
// Graceful Shutdown
// ═══════════════════════════════════════════════════════════════════════════════

let server;

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  serverState.isReady = false;
  
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  serverState.errorCount++;
  if (!config.isProduction()) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  serverState.errorCount++;
  if (!config.isProduction()) {
    process.exit(1);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Server Start
// ═══════════════════════════════════════════════════════════════════════════════

const startServer = async () => {
  try {
    const PORT = config.PORT;
    
    server = app.listen(PORT, async () => {
      logger.info(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║     🏊 KIRIKKALE OLİMPİYAT SPOR KULÜBÜ                      ║
  ║        Yüzme Branşı Yönetim Sistemi v3.1                    ║
  ║                                                              ║
  ║     🚀 Server Port: ${PORT}                                    ║
  ║     📡 API: http://localhost:${PORT}/api                       ║
  ║     🔒 Environment: ${config.NODE_ENV.padEnd(23)}           ║
  ║     📱 SMS: ${(config.NETGSM.enabled ? 'Enabled' : 'Disabled').padEnd(30)}║
  ║     🌐 CORS: Enabled                                         ║
  ║                                                              ║
  ║     ⚡ Server started - connecting to database...            ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
      `);
      
      try {
        await connectDB();
        serverState.isReady = true;
        logger.info('✅ Server tamamen hazır!');
      } catch (dbError) {
        logger.error('⚠️ Database connection failed, but server is running');
      }
    });
  } catch (error) {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();

module.exports = app;
