// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Security Middleware
// ═══════════════════════════════════════════════════════════════════════════════

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const config = require('../config/config');
const logger = require('../services/logger');

// ─────────────────────────────────────────────────────────────────────────────
// Helmet - HTTP Güvenlik Headerları
// ─────────────────────────────────────────────────────────────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting - Genel
// ─────────────────────────────────────────────────────────────────────────────
const generalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT.windowMs,
  max: config.RATE_LIMIT.max,
  message: config.RATE_LIMIT.message,
  standardHeaders: config.RATE_LIMIT.standardHeaders,
  legacyHeaders: config.RATE_LIMIT.legacyHeaders,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl
    });
    res.status(429).json(options.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting - Auth (daha sıkı)
// ─────────────────────────────────────────────────────────────────────────────
const authRateLimiter = rateLimit({
  windowMs: config.AUTH_RATE_LIMIT.windowMs,
  max: config.AUTH_RATE_LIMIT.max,
  message: config.AUTH_RATE_LIMIT.message,
  standardHeaders: config.AUTH_RATE_LIMIT.standardHeaders,
  legacyHeaders: config.AUTH_RATE_LIMIT.legacyHeaders,
  skipSuccessfulRequests: true, // Başarılı girişleri sayma
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email || 'unknown'
    });
    res.status(429).json(options.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting - Public Endpoints (kayıt formu için)
// ─────────────────────────────────────────────────────────────────────────────
const publicRateLimiter = rateLimit({
  windowMs: config.PUBLIC_RATE_LIMIT.windowMs,
  max: config.PUBLIC_RATE_LIMIT.max,
  message: config.PUBLIC_RATE_LIMIT.message,
  standardHeaders: config.PUBLIC_RATE_LIMIT.standardHeaders,
  legacyHeaders: config.PUBLIC_RATE_LIMIT.legacyHeaders,
  handler: (req, res, next, options) => {
    logger.warn('Public rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl
    });
    res.status(429).json(options.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB Injection Koruması
// ─────────────────────────────────────────────────────────────────────────────
const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('MongoDB injection attempt blocked', {
      ip: req.ip,
      key
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Parameter Pollution Koruması
// ─────────────────────────────────────────────────────────────────────────────
const hppMiddleware = hpp({
  whitelist: [
    'status',
    'membershipType',
    'paymentType',
    'sortBy',
    'sortOrder',
    'page',
    'limit'
  ]
});

// ─────────────────────────────────────────────────────────────────────────────
// XSS Koruması (basit)
// ─────────────────────────────────────────────────────────────────────────────
const xssClean = (req, res, next) => {
  if (req.body) {
    req.body = cleanObject(req.body);
  }
  if (req.query) {
    req.query = cleanObject(req.query);
  }
  if (req.params) {
    req.params = cleanObject(req.params);
  }
  next();
};

const cleanObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? cleanString(obj) : obj;
  }
  
  const cleaned = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    cleaned[key] = cleanObject(obj[key]);
  }
  return cleaned;
};

const cleanString = (str) => {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// Security Headers (ek)
// ─────────────────────────────────────────────────────────────────────────────
const additionalHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
};

module.exports = {
  helmetMiddleware,
  generalRateLimiter,
  authRateLimiter,
  publicRateLimiter,
  mongoSanitizeMiddleware,
  hppMiddleware,
  xssClean,
  additionalHeaders
};
