// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Winston Logger Service
// ═══════════════════════════════════════════════════════════════════════════════

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Log dizinini oluştur
const logDir = path.join(__dirname, '..', config.LOGGING.dir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Console format (renkli)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Transports
const transports = [
  // Console
  new winston.transports.Console({
    format: consoleFormat,
    level: config.isDevelopment() ? 'debug' : 'info'
  })
];

// Production'da dosyaya da yaz
if (config.isProduction()) {
  transports.push(
    // Tüm loglar
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: customFormat,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5
    }),
    // Sadece hatalar
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 20 * 1024 * 1024,
      maxFiles: 5
    })
  );
}

// Logger instance
const logger = winston.createLogger({
  level: config.LOGGING.level,
  format: customFormat,
  transports,
  exitOnError: false
});

// HTTP request logger için stream
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Helper methods
logger.logRequest = (req, message = 'Request') => {
  logger.info(message, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

logger.logError = (error, req = null) => {
  const logData = {
    message: error.message,
    stack: error.stack
  };
  
  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl;
    logData.ip = req.ip;
  }
  
  logger.error('Error occurred', logData);
};

logger.logDatabase = (action, collection, data = {}) => {
  logger.debug(`DB ${action}`, { collection, ...data });
};

logger.logAuth = (action, email, success = true) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Auth ${action}`, { email, success });
};

logger.logSMS = (phone, success, message = '', type = 'custom') => {
  const level = success ? 'info' : 'warn';
  const maskedPhone = phone ? phone.slice(-4) : 'N/A';
  logger[level](`SMS ${success ? 'sent' : 'failed'}`, { phone: maskedPhone, success, message, type });
};

module.exports = logger;
