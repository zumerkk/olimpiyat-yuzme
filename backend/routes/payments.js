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
const config = require('../config/config');

router.get('/fix-amounts-public', async (req, res) => {
  try {
    // Find them first to see what we are updating
    const toUpdate = await Payment.find({ amount: 4000, status: { $in: ['Beklemede', 'Gecikmiş'] } });

    const result = await Payment.updateMany(
      { amount: 4000, status: { $in: ['Beklemede', 'Gecikmiş'] } },
      { $set: { amount: 5000 } }
    );
    res.json({ success: true, fixed: result, found: toUpdate.length, details: toUpdate.map(p => p._id) });
  } catch (e) { res.status(500).json(e) }
});

router.use(protect);

// @route   GET /api/payments
// @desc    Tüm ödemeleri listele
// @access  Private
router.get('/', async (req, res) => {
  try {
    // TEMP FIX ROUTE CHECK
    if (req.query.fix_amounts === 'true') {
      const result = await Payment.updateMany(
        { amount: 4000, status: { $ne: 'Ödendi' } },
        { $set: { amount: 5000 } }
      );
      return res.json({ success: true, fixed: result });
    }

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
      .populate('athlete', 'firstName lastName tcNo phone membershipType remainingSessions packageRenewCount')
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
      totalPaidStats,
      totalPendingStats,
      totalOverdueStats,
      totalPartialStats,
      byType,
      totalRemainingBalance
    ] = await Promise.all([
      // Tam ödenmiş
      Payment.aggregate([
        { $match: { status: 'Ödendi' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' }, count: { $sum: 1 } } }
      ]),
      // Beklemede (hiç ödeme yapılmamış)
      Payment.aggregate([
        { $match: { status: 'Beklemede' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Gecikmiş
      Payment.aggregate([
        { $match: { status: 'Gecikmiş' } },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ['$amount', { $ifNull: ['$paidAmount', 0] }] } },
            count: { $sum: 1 }
          }
        }
      ]),
      // Kısmi ödeme yapılmış
      Payment.aggregate([
        { $match: { status: 'Kısmi Ödeme' } },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$paidAmount' },
            totalRemaining: { $sum: { $subtract: ['$amount', { $ifNull: ['$paidAmount', 0] }] } },
            count: { $sum: 1 }
          }
        }
      ]),
      // Ödeme tipine göre
      Payment.aggregate([
        { $group: { _id: '$paymentType', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Toplam kalan borç (tüm ödenmemiş ödemeler)
      Payment.aggregate([
        { $match: { status: { $in: ['Beklemede', 'Gecikmiş', 'Kısmi Ödeme'] } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: ['$amount', { $ifNull: ['$paidAmount', 0] }] } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        // Toplam tahsilat (ödenen para)
        totalPaid: totalPaidStats[0]?.total || 0,
        paidCount: totalPaidStats[0]?.count || 0,

        // Bekleyen (hiç ödeme yapılmamış)
        totalPending: totalPendingStats[0]?.total || 0,
        pendingCount: totalPendingStats[0]?.count || 0,

        // Gecikmiş (kalan borç)
        totalOverdue: totalOverdueStats[0]?.total || 0,
        overdueCount: totalOverdueStats[0]?.count || 0,

        // Kısmi ödeme yapılmış
        partialPayments: {
          count: totalPartialStats[0]?.count || 0,
          totalPaid: totalPartialStats[0]?.totalPaid || 0,
          totalRemaining: totalPartialStats[0]?.totalRemaining || 0
        },

        // Toplam eksik/kalan borç
        totalRemainingBalance: totalRemainingBalance[0]?.total || 0,

        // Ödeme tipine göre
        byType: byType.reduce((acc, item) => {
          acc[item._id] = { total: item.total, count: item.count };
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Stats error', { error: error.message });
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

    // Sporcu kontrolü ve uyumluluk
    const athleteData = await Athlete.findById(athlete);
    if (!athleteData) {
      return res.status(404).json({
        success: false,
        message: 'Sporcu bulunamadı'
      });
    }

    // Üyelik tipi kontrolü
    // İsteğe bağlı: Sadece uyarı verilebilir veya engellenebilir. 
    // Kullanıcı "sorunun sebebini bulup çözelim" dediği için katı kontrol ekliyoruz.
    if (athleteData.membershipType !== paymentType) {
      return res.status(400).json({
        success: false,
        message: `Hata: Sporcunun üyelik tipi (${athleteData.membershipType}) ile seçilen ödeme tipi (${paymentType}) uyuşmuyor.`
      });
    }

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
        amount: athlete.monthlyFee || config.PRICING.DEFAULT_MONTHLY_FEE,
        paidAmount: 0,
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
// @desc    Tam ödeme al (Kalan tüm borcu kapat)
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

    // Kalan borcu hesapla ve tam öde
    const remainingAmount = payment.amount - (payment.paidAmount || 0);

    if (remainingAmount > 0) {
      // Kısmi ödeme kaydı olarak ekle
      payment.partialPayments.push({
        amount: remainingAmount,
        paymentDate: new Date(),
        paymentMethod: paymentMethod || 'Nakit',
        receiptNumber,
        notes,
        processedBy: req.admin.id
      });

      payment.paidAmount = payment.amount; // Tam ödendi
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
    athlete.paymentSummary.totalPaid += remainingAmount;
    athlete.paymentSummary.lastPaymentDate = new Date();

    // 8 Seanslık paket ödendiyse paketi yenile
    // NOT: Mevcut seans hakkına EKLEME yapmıyoruz, direkt 8'e SET ediyoruz
    // Örn: 2 hak kalmışsa 10 değil 8 olacak
    if (payment.paymentType === '8 Seanslık' && athlete.membershipType === '8 Seanslık') {
      athlete.remainingSessions = 8; // Mevcut hakları sıfırla, 8 yap (EKLEME DEĞİL!)
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

// @route   POST /api/payments/:id/partial-pay
// @desc    Kısmi ödeme al (Belirtilen tutarı al)
// @access  Private
router.post('/:id/partial-pay', [
  body('amount').isNumeric().withMessage('Tutar zorunludur ve sayı olmalıdır'),
  body('paymentMethod').optional().isIn(['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Diğer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, paymentMethod, receiptNumber, notes } = req.body;

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
        message: 'Bu ödeme zaten tamamen alınmış'
      });
    }

    // Kalan borcu kontrol et
    const remainingBalance = payment.amount - (payment.paidAmount || 0);

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Ödeme tutarı 0\'dan büyük olmalıdır'
      });
    }

    if (amount > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Kalan borç ${remainingBalance}₺, bu tutardan fazla ödeme yapılamaz`
      });
    }

    // Kısmi ödeme kaydı ekle
    payment.partialPayments.push({
      amount: parseFloat(amount),
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'Nakit',
      receiptNumber,
      notes,
      processedBy: req.admin.id
    });

    // Toplam ödenen tutarı güncelle
    payment.paidAmount = (payment.paidAmount || 0) + parseFloat(amount);
    payment.paymentMethod = paymentMethod;
    payment.processedBy = req.admin.id;

    // Durum otomatik güncellenecek (pre-save hook)
    await payment.save();

    // Sporcu ödeme özetini güncelle
    const athlete = await Athlete.findById(payment.athlete._id);
    athlete.paymentSummary.totalPaid += parseFloat(amount);
    athlete.paymentSummary.lastPaymentDate = new Date();

    // Tam ödendiyse ve 8 Seanslık paketse
    // NOT: Mevcut seans hakkına EKLEME yapmıyoruz, direkt 8'e SET ediyoruz
    if (payment.status === 'Ödendi' && payment.paymentType === '8 Seanslık' && athlete.membershipType === '8 Seanslık') {
      athlete.remainingSessions = 8; // Mevcut hakları sıfırla, 8 yap (EKLEME DEĞİL!)
      athlete.packageRenewCount += 1;
    }

    // Tam ödendiyse ve aylık üyelikse
    if (payment.status === 'Ödendi' && payment.paymentType === 'Aylık') {
      const nextMonth = new Date(payment.dueDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      athlete.nextPaymentDate = nextMonth;
    }

    await athlete.save();

    // Tam ödendiyse bildirim gönder
    if (payment.status === 'Ödendi') {
      try {
        await NotificationService.createPaymentReceivedNotification(payment, athlete);
      } catch (notifError) {
        logger.warn('Payment notification failed', { error: notifError.message });
      }
    }

    const newRemainingBalance = payment.amount - payment.paidAmount;

    res.json({
      success: true,
      message: newRemainingBalance > 0
        ? `${amount}₺ ödeme alındı. Kalan borç: ${newRemainingBalance}₺`
        : 'Ödeme tamamen tamamlandı!',
      data: {
        payment,
        remainingBalance: newRemainingBalance,
        paidAmount: payment.paidAmount,
        isFullyPaid: payment.status === 'Ödendi'
      }
    });
  } catch (error) {
    logger.error('Partial payment error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   PATCH /api/payments/:id/revert
// @desc    Yanlışlıkla işaretlenen ödemeyi geri al (Ödendi -> Beklemede)
// @access  Private
router.patch('/:id/revert', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('athlete');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }

    if (payment.status !== 'Ödendi') {
      return res.status(400).json({
        success: false,
        message: 'Sadece ödenmiş kayıtlar geri alınabilir'
      });
    }

    const paidAmount = payment.paidAmount || payment.amount;

    // Ödeme kaydını sıfırla
    payment.paidAmount = 0;
    payment.partialPayments = [];
    payment.status = new Date(payment.dueDate) < new Date() ? 'Gecikmiş' : 'Beklemede';
    payment.paymentDate = null;
    payment.paymentMethod = null;
    payment.receiptNumber = null;
    payment.processedBy = null;
    payment.notes = payment.notes ? `${payment.notes} [Ödeme geri alındı: ${new Date().toLocaleString('tr-TR')}]` : `[Ödeme geri alındı: ${new Date().toLocaleString('tr-TR')}]`;
    await payment.save();

    // Sporcu özetini güncelle
    const athlete = await Athlete.findById(payment.athlete._id);
    if (athlete) {
      if (!athlete.paymentSummary) athlete.paymentSummary = { totalPaid: 0, totalDue: 0, lastPaymentDate: null };
      athlete.paymentSummary.totalPaid = Math.max(0, (athlete.paymentSummary.totalPaid || 0) - paidAmount);
    }

    // 8 Seanslık paket ödemesi geri alındıysa
    if (payment.paymentType === '8 Seanslık' && athlete?.membershipType === '8 Seanslık') {
      athlete.packageRenewCount = Math.max(0, (athlete.packageRenewCount || 1) - 1);
      athlete.remainingSessions = Math.max(0, (athlete.remainingSessions || 8) - 8);
    }

    // Aylık ödeme geri alındıysa - sonraki ödeme tarihini vade tarihine çek
    if (payment.paymentType === 'Aylık' && athlete) {
      athlete.nextPaymentDate = payment.dueDate;
    }

    if (athlete) await athlete.save();

    res.json({
      success: true,
      message: 'Ödeme geri alındı. Kayıt tekrar bekleyen durumuna geçti.',
      data: payment
    });
  } catch (error) {
    logger.error('Payment revert error', { error: error.message });
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
    let payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Ödeme bulunamadı'
      });
    }

    // Update fields
    if (req.body.amount) payment.amount = req.body.amount;
    if (req.body.notes) payment.notes = req.body.notes;

    // If due date is changing
    if (req.body.dueDate) {
      const newDate = new Date(req.body.dueDate);
      const oldDate = new Date(payment.dueDate);

      // If date is different
      if (newDate.getTime() !== oldDate.getTime()) {
        payment.dueDate = newDate;

        // Reset reminder flag if new date is in the future
        if (newDate > new Date()) {
          payment.reminderSent = false;

          // If it was Overdue, set back to Pending
          if (payment.status === 'Gecikmiş') {
            payment.status = 'Beklemede';
          }
        }
      }
    }

    const updated = await payment.save();

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
