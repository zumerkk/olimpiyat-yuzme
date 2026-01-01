// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Online Kayıt Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const Registration = require('../models/Registration');
const Athlete = require('../models/Athlete');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');
const config = require('../config/config');
const logger = require('../services/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES - Kayıt formu için (auth gerekmez)
// ═══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/registration/form-data
// @desc    Kayıt formu için gerekli veriler
// @access  Public
router.get('/form-data', (req, res) => {
  logger.info('Form data requested', { ip: req.ip });
  
  res.json({
    success: true,
    data: {
      levels: config.SWIMMING.SESSION_TYPES,
      ageGroups: config.SWIMMING.AGE_GROUPS,
      days: config.SWIMMING.DAYS,
      bloodTypes: config.SWIMMING.BLOOD_TYPES,
      guardianRelations: config.SWIMMING.GUARDIAN_RELATIONS
    }
  });
});

// @route   POST /api/registration/submit
// @desc    Online kayıt formu gönder
// @access  Public
router.post('/submit', [
  body('firstName').trim().notEmpty().withMessage('Ad zorunludur'),
  body('lastName').trim().notEmpty().withMessage('Soyad zorunludur'),
  body('tcNo').isLength({ min: 11, max: 11 }).withMessage('TC Kimlik No 11 haneli olmalıdır'),
  body('birthDate').notEmpty().withMessage('Doğum tarihi zorunludur'),
  body('gender').isIn(['Erkek', 'Kadın']).withMessage('Geçerli cinsiyet seçiniz'),
  body('phone').notEmpty().withMessage('Telefon zorunludur'),
  body('email').isEmail().withMessage('Geçerli e-posta adresi giriniz')
], async (req, res) => {
  const requestId = req.headers['x-request-id'] || `submit_${Date.now()}`;
  
  logger.info('📝 Registration submission received', { 
    requestId,
    name: `${req.body.firstName} ${req.body.lastName}`,
    source: req.query.source,
    ip: req.ip
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed', { requestId, errors: errors.array() });
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // TC No kontrolü - hem Registration hem Athlete tablosunda
    const existingRegistration = await Registration.findOne({ 
      tcNo: req.body.tcNo,
      status: { $ne: 'Reddedildi' }
    });
    
    if (existingRegistration) {
      logger.warn('Duplicate TC No in registrations', { requestId, tcNo: req.body.tcNo });
      return res.status(400).json({
        success: false,
        message: 'Bu TC Kimlik No ile zaten bir kayıt mevcut'
      });
    }

    const existingAthlete = await Athlete.findOne({ tcNo: req.body.tcNo });
    if (existingAthlete) {
      logger.warn('Duplicate TC No in athletes', { requestId, tcNo: req.body.tcNo });
      return res.status(400).json({
        success: false,
        message: 'Bu TC Kimlik No ile zaten kayıtlı sporcu bulunmaktadır'
      });
    }

    // Kayıt kaynağını belirle
    const source = req.query.source === 'qr' ? 'QR Kod' : 'Online Link';

    // preferredAgeGroup boş string ise null yap (enum validation için)
    const cleanedData = { ...req.body };
    if (cleanedData.preferredAgeGroup === '') {
      cleanedData.preferredAgeGroup = null;
    }

    // Kayıt oluştur
    const registration = await Registration.create({
      ...cleanedData,
      source,
      submissionInfo: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
        requestId
      }
    });

    logger.info('✅ Registration created successfully', { 
      requestId,
      registrationId: registration._id,
      name: `${registration.firstName} ${registration.lastName}`
    });

    // Admin'lere bildirim gönder (async, hata olursa submission'ı etkilemesin)
    try {
      await NotificationService.createNewRegistrationNotification(registration);
    } catch (notifError) {
      logger.error('Notification creation failed', { 
        requestId, 
        error: notifError.message 
      });
      // Devam et, kayıt zaten yapıldı
    }

    res.status(201).json({
      success: true,
      message: 'Kayıt başvurunuz alınmıştır. En kısa sürede sizinle iletişime geçilecektir.',
      data: {
        id: registration._id,
        name: `${registration.firstName} ${registration.lastName}`,
        status: registration.status,
        requestId
      }
    });
  } catch (error) {
    logger.error('❌ Registration submit error', { 
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    // MongoDB validation error handling
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
      requestId
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROTECTED ROUTES - Admin için
// ═══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/registration/qr-code
// @desc    QR kod oluştur
// @access  Private
router.get('/qr-code', protect, async (req, res) => {
  try {
    const registrationUrl = `${config.FRONTEND_URL}/kayit?source=qr`;
    
    // QR kod oluştur (base64)
    const qrCode = await QRCode.toDataURL(registrationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1565C0',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        url: registrationUrl,
        qrCode
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'QR kod oluşturulamadı'
    });
  }
});

// @route   GET /api/registration
// @desc    Tüm kayıt başvurularını listele
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, source } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;

    const total = await Registration.countDocuments(filter);

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: registrations,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/registration/stats
// @desc    Kayıt istatistikleri
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const [total, pending, approved, bySource] = await Promise.all([
      Registration.countDocuments(),
      Registration.countDocuments({ status: 'Beklemede' }),
      Registration.countDocuments({ status: { $in: ['Onaylandı', 'Sporcu Oluşturuldu'] } }),
      Registration.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        bySource: bySource.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/registration/:id
// @desc    Tek kayıt detayı
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('processedBy', 'name')
      .populate('createdAthlete', 'firstName lastName');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Kayıt bulunamadı'
      });
    }

    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/registration/:id/approve
// @desc    Kayıt onaylayıp sporcu oluştur
// @access  Private
router.post('/:id/approve', protect, async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Kayıt bulunamadı'
      });
    }

    if (registration.status === 'Sporcu Oluşturuldu') {
      return res.status(400).json({
        success: false,
        message: 'Bu kayıt için zaten sporcu oluşturulmuş'
      });
    }

    // Sporcu oluştur
    const athlete = await Athlete.create({
      firstName: registration.firstName,
      lastName: registration.lastName,
      tcNo: registration.tcNo,
      birthDate: registration.birthDate,
      gender: registration.gender,
      phone: registration.phone,
      email: registration.email,
      address: registration.address,
      guardian: registration.guardian,
      level: registration.preferredLevel,
      ageGroup: registration.preferredAgeGroup,
      healthInfo: registration.healthInfo,
      registrationSource: registration.source,
      status: 'Aktif'
    });

    // Kayıt durumunu güncelle
    registration.status = 'Sporcu Oluşturuldu';
    registration.processedBy = req.admin.id;
    registration.processedAt = new Date();
    registration.createdAthlete = athlete._id;
    registration.adminNotes = req.body.notes;
    await registration.save();

    res.json({
      success: true,
      message: 'Kayıt onaylandı ve sporcu oluşturuldu',
      data: {
        registration,
        athlete
      }
    });
  } catch (error) {
    logger.error('Registration approve error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/registration/:id/reject
// @desc    Kayıt reddet
// @access  Private
router.post('/:id/reject', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Kayıt bulunamadı'
      });
    }

    registration.status = 'Reddedildi';
    registration.processedBy = req.admin.id;
    registration.processedAt = new Date();
    registration.adminNotes = reason;
    await registration.save();

    res.json({
      success: true,
      message: 'Kayıt reddedildi',
      data: registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/registration/:id
// @desc    Kayıt sil
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Kayıt bulunamadı'
      });
    }

    await registration.deleteOne();

    res.json({
      success: true,
      message: 'Kayıt silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

module.exports = router;

