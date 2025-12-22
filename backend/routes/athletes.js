// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Sporcu Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Athlete = require('../models/Athlete');
const Payment = require('../models/Payment');
const Session = require('../models/Session');
const { protect } = require('../middleware/auth');
const logger = require('../services/logger');

// Tüm rotalar için auth gerekli
router.use(protect);

// @route   GET /api/athletes
// @desc    Tüm sporcuları listele (filtreleme ve sayfalama ile)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      membershipType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Filtre oluştur
    const filter = {};
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { tcNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) filter.status = status;
    if (membershipType) filter.membershipType = membershipType;

    // Sıralama
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Toplam sayı
    const total = await Athlete.countDocuments(filter);

    // Sporcuları getir
    const athletes = await Athlete.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: athletes,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Athletes list error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/athletes/stats
// @desc    Sporcu istatistikleri
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const [
      total,
      active,
      byMembershipType,
      byGender,
      packageExpiring,
      thisMonth
    ] = await Promise.all([
      Athlete.countDocuments(),
      Athlete.countDocuments({ status: 'Aktif' }),
      Athlete.aggregate([
        { $match: { status: 'Aktif' } },
        { $group: { _id: '$membershipType', count: { $sum: 1 } } }
      ]),
      Athlete.aggregate([
        { $match: { status: 'Aktif' } },
        { $group: { _id: '$gender', count: { $sum: 1 } } }
      ]),
      // 8 Seanslık pakette 2 veya daha az hakkı kalanlar
      Athlete.countDocuments({
        status: 'Aktif',
        membershipType: '8 Seanslık',
        remainingSessions: { $lte: 2 }
      }),
      Athlete.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive: total - active,
        thisMonth,
        packageExpiring,
        byMembershipType: byMembershipType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byGender: byGender.reduce((acc, item) => {
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

// @route   GET /api/athletes/active
// @desc    Aktif sporcuları getir (dropdown/select için)
// @access  Private
router.get('/active', async (req, res) => {
  try {
    const athletes = await Athlete.find({ status: 'Aktif' })
      .select('firstName lastName tcNo membershipType remainingSessions')
      .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: athletes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/athletes/:id
// @desc    Tek sporcu detayı
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const athlete = await Athlete.findById(req.params.id);

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: 'Sporcu bulunamadı'
      });
    }

    // Ödemeleri de getir
    const payments = await Payment.find({ athlete: athlete._id })
      .sort({ createdAt: -1 })
      .limit(20);

    // Katıldığı seansları getir
    const sessions = await Session.find({ 'attendees.athlete': athlete._id })
      .select('date time')
      .sort({ date: -1 })
      .limit(20);

    res.json({
      success: true,
      data: {
        ...athlete.toObject(),
        payments,
        recentSessions: sessions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/athletes
// @desc    Yeni sporcu ekle
// @access  Private
router.post('/', [
  body('firstName').trim().notEmpty().withMessage('Ad zorunludur'),
  body('lastName').trim().notEmpty().withMessage('Soyad zorunludur'),
  body('tcNo').isLength({ min: 11, max: 11 }).withMessage('TC Kimlik No 11 haneli olmalıdır'),
  body('birthDate').notEmpty().withMessage('Doğum tarihi zorunludur'),
  body('gender').isIn(['Erkek', 'Kadın']).withMessage('Geçerli cinsiyet seçiniz'),
  body('membershipType').isIn(['Aylık', '8 Seanslık']).withMessage('Geçerli üyelik tipi seçiniz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // TC No kontrolü
    const existing = await Athlete.findOne({ tcNo: req.body.tcNo });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bu TC Kimlik No ile kayıtlı sporcu zaten mevcut'
      });
    }

    const athleteData = {
      ...req.body,
      registrationSource: 'Manuel'
    };

    // 8 Seanslık paket için başlangıç değerleri
    if (req.body.membershipType === '8 Seanslık') {
      athleteData.remainingSessions = 8;
    }

    const athlete = await Athlete.create(athleteData);

    // İlk ödeme kaydını oluştur
    if (athlete.membershipType === 'Aylık') {
      await Payment.createMonthlyPayment(athlete);
    } else {
      await Payment.createPackagePayment(athlete);
    }

    res.status(201).json({
      success: true,
      message: 'Sporcu başarıyla eklendi',
      data: athlete
    });
  } catch (error) {
    logger.error('Athlete create error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/athletes/:id
// @desc    Sporcu güncelle
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const athlete = await Athlete.findById(req.params.id);

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: 'Sporcu bulunamadı'
      });
    }

    // TC No değişiyorsa kontrol et
    if (req.body.tcNo && req.body.tcNo !== athlete.tcNo) {
      const existing = await Athlete.findOne({ tcNo: req.body.tcNo });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Bu TC Kimlik No ile kayıtlı başka sporcu mevcut'
        });
      }
    }

    // Üyelik tipi değişiyorsa
    const membershipChanged = req.body.membershipType && req.body.membershipType !== athlete.membershipType;
    
    if (membershipChanged) {
      if (req.body.membershipType === '8 Seanslık') {
        req.body.remainingSessions = 8;
      } else {
        req.body.remainingSessions = null;
      }
    }

    const updated = await Athlete.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Sporcu güncellendi',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/athletes/:id/renew-package
// @desc    8 Seanslık paketi yenile
// @access  Private
router.post('/:id/renew-package', async (req, res) => {
  try {
    const athlete = await Athlete.findById(req.params.id);

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: 'Sporcu bulunamadı'
      });
    }

    if (athlete.membershipType !== '8 Seanslık') {
      return res.status(400).json({
        success: false,
        message: 'Bu sporcu aylık üyelik tipinde'
      });
    }

    // Paketi yenile
    await athlete.renewPackage();

    res.json({
      success: true,
      message: 'Paket yenilendi, 8 seans hakkı eklendi',
      data: athlete
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/athletes/:id
// @desc    Sporcu sil
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const athlete = await Athlete.findById(req.params.id);

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: 'Sporcu bulunamadı'
      });
    }

    // İlişkili yoklamalardan çıkar
    await Session.updateMany(
      { 'attendees.athlete': athlete._id },
      { $pull: { attendees: { athlete: athlete._id } } }
    );

    await athlete.deleteOne();

    res.json({
      success: true,
      message: 'Sporcu silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

module.exports = router;
