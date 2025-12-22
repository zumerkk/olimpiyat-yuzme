// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Error Handler Middleware
// ═══════════════════════════════════════════════════════════════════════════════

const logger = require('../services/logger');
const config = require('../config/config');

// ─────────────────────────────────────────────────────────────────────────────
// Custom Error Class
// ─────────────────────────────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Async Handler - try/catch sarmalayıcı
// ─────────────────────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB Error Handlers
// ─────────────────────────────────────────────────────────────────────────────
const handleCastError = (err) => {
  const message = `Geçersiz ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'CAST_ERROR');
};

const handleDuplicateFieldsError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Bu ${field} değeri zaten kullanımda: ${value}`;
  return new AppError(message, 400, 'DUPLICATE_ERROR');
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Geçersiz veri: ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

// ─────────────────────────────────────────────────────────────────────────────
// JWT Error Handlers
// ─────────────────────────────────────────────────────────────────────────────
const handleJWTError = () => {
  return new AppError('Geçersiz oturum. Lütfen tekrar giriş yapın.', 401, 'JWT_ERROR');
};

const handleJWTExpiredError = () => {
  return new AppError('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.', 401, 'JWT_EXPIRED');
};

// ─────────────────────────────────────────────────────────────────────────────
// Development Error Response
// ─────────────────────────────────────────────────────────────────────────────
const sendErrorDev = (err, req, res) => {
  logger.error('Development Error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl
  });

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    code: err.code,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Production Error Response
// ─────────────────────────────────────────────────────────────────────────────
const sendErrorProd = (err, req, res) => {
  // Operational error - güvenli mesaj gönder
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message
    });
  } else {
    // Programming error - detay verme
    logger.error('Production Error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl
    });

    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Sunucuda bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.isDevelopment()) {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // MongoDB errors
    if (err.name === 'CastError') error = handleCastError(err);
    if (err.code === 11000) error = handleDuplicateFieldsError(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);

    // JWT errors
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────────────────────
const notFoundHandler = (req, res, next) => {
  const err = new AppError(
    `${req.originalUrl} adresi bulunamadı`,
    404,
    'NOT_FOUND'
  );
  next(err);
};

module.exports = {
  AppError,
  asyncHandler,
  globalErrorHandler,
  notFoundHandler
};
