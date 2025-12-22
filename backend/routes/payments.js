// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Ödeme Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Athlete = require('../models/Athlete');
const { protect } = require('../middleware/auth');
const NotificationService = require('../services/notificationService');
const logger = require('../services/logger');

router.use(protect);

// @route   GET /api/payments
// @desc    Tüm ödemeleri listele
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentType,
      athleteId,
      sortBy = 'dueDate',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;
    if (athleteId) filter.athlete = athleteId;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Payment.countDocuments(filter);

    const payments = await Payment.find(filter)
      .populate('athlete', 'firstName lastName tcNo phone membershipType')
      .populate('processedBy', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: payments,
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

// @route   GET /api/payments/stats
// @desc    Ödeme istatistikleri
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [
      totalPaid,
      totalPending,
      totalOverdue,
      byType
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'Ödendi' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'Beklemede' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { status: 'Gecikmiş' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $group: { _id: '$paymentType', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalPaid: totalPaid[0]?.total || 0,
        paidCount: totalPaid[0]?.count || 0,
        totalPending: totalPending[0]?.total || 0,
        pendingCount: totalPending[0]?.count || 0,
        totalOverdue: totalOverdue[0]?.total || 0,
        overdueCount: totalOverdue[0]?.count || 0,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = { total: item.total, count: item.count };
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

// @route   GET /api/payments/due-soon
// @desc    Yaklaşan ödemeler
// @access  Private
router.get('/due-soon', async (req, res) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const payments = await Payment.find({
      status: { $in: ['Beklemede', 'Gecikmiş'] },
      dueDate: { $lte: nextWeek }
    })
      .populate('athlete', 'firstName lastName phone membershipType')
      .sort({ dueDate: 1 })
      .limit(50);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/payments/monthly-due
// @desc    Her ayın 15'inde ödenmesi gereken aylık ödemeler
// @access  Private
router.get('/monthly-due', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Bu ayın 15'i
    const dueDate = new Date(currentYear, now.getMonth(), 15);

    const payments = await Payment.find({
      paymentType: 'Aylık',
      'period.month': currentMonth,
      'period.year': currentYear,
      status: { $ne: 'Ödendi' }
    })
      .populate('athlete', 'firstName lastName phone')
      .sort({ 'athlete.lastName': 1 });

    res.json({
      success: true,
      data: payments,
      dueDate: dueDate,
      summary: {
        total: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Tek ödeme detayı
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('athlete')
      .populate('processedBy', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/payments
// @desc    Manuel ödeme kaydı oluştur
// @access  Private
router.post('/', [
  body('athlete').notEmpty().withMessage('Sporcu seçimi zorunludur'),
  body('paymentType').isIn(['Aylık', '8 Seanslık']).withMessage('Geçerli ödeme tipi seçiniz'),
  body('amount').isNumeric().withMessage('Tutar zorunludur'),
  body('dueDate').notEmpty().withMessage('Vade tarihi zorunludur')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { athlete, paymentType, amount, dueDate, period, packageNumber, notes } = req.body;

    const payment = await Payment.create({
      athlete,
      paymentType,
      amount,
      dueDate: new Date(dueDate),
      period: period || null,
      packageNumber: packageNumber || null,
      notes
    });

    const populated = await Payment.findById(payment._id)
      .populate('athlete', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Ödeme kaydı oluşturuldu',
      data: populated
    });
  } catch (error) {
    logger.error('Payment create error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/payments/generate-monthly
// @desc    Tüm aylık üyeler için bu ayın ödemelerini oluştur
// @access  Private
router.post('/generate-monthly', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const dueDate = new Date(currentYear, now.getMonth(), 15);

    // Aylık üyelikteki aktif sporcular
    const monthlyAthletes = await Athlete.find({
      status: 'Aktif',
      membershipType: 'Aylık'
    });

    let created = 0;
    let skipped = 0;

    for (const athlete of monthlyAthletes) {
      // Bu ay için zaten ödeme var mı?
      const existing = await Payment.findOne({
        athlete: athlete._id,
        paymentType: 'Aylık',
        'period.month': currentMonth,
        'period.year': currentYear
      });

      if (existing) {
        skipped++;
        continue;
      }

      await Payment.create({
        athlete: athlete._id,
        paymentType: 'Aylık',
        amount: athlete.monthlyFee || 1500,
        period: { month: currentMonth, year: currentYear },
        dueDate: dueDate
      });

      created++;
    }

    res.json({
      success: true,
      message: `${created} ödeme kaydı oluşturuldu, ${skipped} sporcu için zaten kayıt mevcuttu`,
      data: { created, skipped }
    });
  } catch (error) {
    logger.error('Generate monthly error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/payments/:id/pay
// @desc    Ödeme al
// @access  Private
router.post('/:id/pay', async (req, res) => {
  try {
    const { paymentMethod, receiptNumber, notes } = req.body;
    
    const payment = await Payment.findById(req.params.id)
      .populate('athlete');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }

    if (payment.status === 'Ödendi') {
      return res.status(400).json({
        success: false,
        message: 'Bu ödeme zaten alınmış'
      });
    }

    payment.status = 'Ödendi';
    payment.paymentDate = new Date();
    payment.paymentMethod = paymentMethod;
    payment.receiptNumber = receiptNumber;
    payment.notes = notes;
    payment.processedBy = req.admin.id;
    await payment.save();

    // Sporcu ödeme özetini güncelle
    const athlete = await Athlete.findById(payment.athlete._id);
    athlete.paymentSummary.totalPaid += payment.amount;
    athlete.paymentSummary.lastPaymentDate = new Date();
    
    // 8 Seanslık paket ödendiyse paketi yenile
    if (payment.paymentType === '8 Seanslık' && athlete.membershipType === '8 Seanslık') {
      athlete.remainingSessions = 8;
      athlete.packageRenewCount += 1;
    }
    
    // Aylık üyelik için sonraki ödeme tarihini güncelle
    if (payment.paymentType === 'Aylık') {
      const nextMonth = new Date(payment.dueDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      athlete.nextPaymentDate = nextMonth;
    }
    
    await athlete.save();

    // Ödeme bildirimi ve SMS gönder
    try {
      await NotificationService.createPaymentReceivedNotification(payment, athlete);
    } catch (notifError) {
      logger.warn('Payment notification failed', { error: notifError.message });
    }

    res.json({
      success: true,
      message: 'Ödeme başarıyla alındı',
      data: payment
    });
  } catch (error) {
    logger.error('Payment process error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/payments/:id
// @desc    Ödeme güncelle
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }

    const updated = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('athlete', 'firstName lastName');

    res.json({
      success: true,
      message: 'Ödeme güncellendi',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/payments/:id
// @desc    Ödeme sil
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }

    await payment.deleteOne();

    res.json({
      success: true,
      message: 'Ödeme silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

module.exports = router;
