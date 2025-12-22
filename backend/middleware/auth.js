// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Auth Middleware
// ═══════════════════════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config/config');

// JWT Token doğrulama
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bu işlem için giriş yapmanız gerekmektedir'
    });
  }

  try {
    // Token doğrula
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Admin bilgisini al
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token, kullanıcı bulunamadı'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Hesabınız devre dışı bırakılmış'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Oturum süresi dolmuş, lütfen tekrar giriş yapın'
    });
  }
};

// Rol kontrolü
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bu işlem için yetkiniz bulunmamaktadır'
      });
    }
    next();
  };
};

