// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         YÜZME BRANŞI YÖNETİM SİSTEMİ
//                      Enterprise Backend Server v2.0
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
// Express App
// ═══════════════════════════════════════════════════════════════════════════════
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ═══════════════════════════════════════════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════════════════════════════════════════

// Helmet - HTTP security headers
app.use(helmetMiddleware);

// Additional security headers
app.use(additionalHeaders);

// CORS
const corsOptions = {
  ...config.CORS_OPTIONS,
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      config.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
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
      callback(new Error('CORS policy violation'));
    }
  }
};
app.use(cors(corsOptions));

// ═══════════════════════════════════════════════════════════════════════════════
// Body Parser & Compression
// ═══════════════════════════════════════════════════════════════════════════════

// Compression
app.use(compression({
  level: 6,
  threshold: 100 * 1024, // 100KB
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

// Morgan HTTP request logger
if (config.isProduction()) {
  app.use(morgan('combined', { stream: logger.stream }));
} else {
  app.use(morgan('dev'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════════

// General rate limiter
app.use('/api', generalRateLimiter);

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
// Health Check Endpoint
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/health', async (req, res) => {
  const healthcheck = {
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: '2.0.0',
    services: {
      database: 'checking...',
      sms: config.NETGSM.enabled ? 'enabled' : 'disabled'
    }
  };

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      healthcheck.services.database = 'connected';
    } else {
      healthcheck.services.database = 'disconnected';
      healthcheck.status = 'DEGRADED';
    }

    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.status = 'ERROR';
    healthcheck.services.database = 'error';
    res.status(503).json(healthcheck);
  }
});

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
    version: '2.0.0',
    environment: config.NODE_ENV,
    endpoints: {
      health: '/api/health',
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
app.use(globalErrorHandler);

// ═══════════════════════════════════════════════════════════════════════════════
// MongoDB Connection
// ═══════════════════════════════════════════════════════════════════════════════

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS);
    
    logger.info(`✅ MongoDB bağlantısı başarılı: ${conn.connection.host}`);
    
    // Varsayılan admin oluştur
    const Admin = require('./models/Admin');
    await Admin.createDefaultAdmin();
    
    return conn;
  } catch (error) {
    logger.error('❌ MongoDB bağlantı hatası:', { error: error.message });
    process.exit(1);
  }
};

// MongoDB connection events
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Scheduled Jobs - Cron
// ═══════════════════════════════════════════════════════════════════════════════

// Her gün saat 09:00'da bildirim kontrolü
cron.schedule('0 9 * * *', async () => {
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

// Her ayın 1'inde aylık ödemeleri oluştur
cron.schedule('0 0 1 * *', async () => {
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

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════════════════════════
// Server Start
// ═══════════════════════════════════════════════════════════════════════════════

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    const PORT = config.PORT;
    server = app.listen(PORT, () => {
      logger.info(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║     🏊 KIRIKKALE OLİMPİYAT SPOR KULÜBÜ                      ║
  ║        Yüzme Branşı Yönetim Sistemi v2.0                    ║
  ║                                                              ║
  ║     🚀 Server Port: ${PORT}                                    ║
  ║     📡 API: http://localhost:${PORT}/api                       ║
  ║     🔒 Environment: ${config.NODE_ENV.padEnd(23)}           ║
  ║     💾 Database: Connected                                  ║
  ║     📱 SMS: ${(config.NETGSM.enabled ? 'Enabled' : 'Disabled').padEnd(30)}║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();

module.exports = app;
