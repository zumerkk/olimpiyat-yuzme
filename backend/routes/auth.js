// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Auth Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const { protect } = require('../middleware/auth');
const logger = require('../services/logger');

// @route   POST /api/auth/login
// @desc    Admin girişi
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Geçerli bir e-posta adresi giriniz'),
  body('password').notEmpty().withMessage('Şifre zorunludur')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Admin'i bul (şifre dahil)
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'E-posta veya şifre hatalı'
      });
    }

    // Şifre kontrolü
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'E-posta veya şifre hatalı'
      });
    }

    // Aktiflik kontrolü
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Hesabınız devre dışı bırakılmış'
      });
    }

    // Son giriş güncelle
    admin.lastLogin = new Date();
    await admin.save();

    // Token oluştur
    const token = admin.getSignedJwtToken();

    res.json({
      success: true,
      message: 'Giriş başarılı',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Mevcut admin bilgisi
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/auth/password
// @desc    Şifre değiştir
// @access  Private
router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('Mevcut şifre zorunludur'),
  body('newPassword').isLength({ min: 6 }).withMessage('Yeni şifre en az 6 karakter olmalıdır')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id).select('+password');

    // Mevcut şifre kontrolü
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre hatalı'
      });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Profil güncelle
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { name, phone },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profil güncellendi',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

module.exports = router;

