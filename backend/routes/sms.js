// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         SMS Routes - Toplu SMS Yönetimi
//                    BozkurtSMS (www.bozkurtsms.com.tr) Entegrasyonu
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const Athlete = require('../models/Athlete');
const SMSLog = require('../models/SMSLog');
const smsService = require('../services/smsService');
const NotificationService = require('../services/notificationService');
const { protect, authorize } = require('../middleware/auth');
const config = require('../config/config');

router.use(protect);

// ═══════════════════════════════════════════════════════════════════════════════
// SMS SERVİS DURUMU
// ═══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/sms/status
// @desc    SMS servis durumunu al
// @access  Private
router.get('/status', async (req, res) => {
  try {
    const todayStats = await SMSLog.getTodayStats();
    
    // Bakiye kontrolü
    let balance = null;
    if (config.SMS.enabled) {
      try {
        const balanceResult = await smsService.checkBalance();
        balance = {
          success: true,
          normalKasa: balanceResult.normalKasa || 0,
          originatorKasa: balanceResult.originatorKasa || 0,
          balance: balanceResult.originatorKasa || balanceResult.normalKasa || 0,
          message: balanceResult.message
        };
      } catch (e) {
        balance = { success: false, message: 'Bakiye alınamadı' };
      }
    }
    
    res.json({
      success: true,
      data: {
        enabled: config.SMS.enabled,
        provider: config.SMS.provider || 'bozkurtsms',
        autoSmsEnabled: config.NOTIFICATIONS.AUTO_SMS_ENABLED,
        sender: config.SMS.sender,
        senderStatus: config.SMS.sender ? 'Başlık onay durumunu kontrol edin' : 'Başlık tanımlı değil',
        todayStats,
        balance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/sms/balance
// @desc    SMS bakiyesini kontrol et
// @access  Private
router.get('/balance', async (req, res) => {
  try {
    if (!config.SMS.enabled) {
      return res.status(400).json({
        success: false,
        message: 'SMS servisi devre dışı'
      });
    }
    
    const result = await smsService.checkBalance();
    res.json({
      success: true,
      data: {
        normalKasa: result.normalKasa || 0,
        originatorKasa: result.originatorKasa || 0,
        totalBalance: (result.normalKasa || 0) + (result.originatorKasa || 0),
        message: result.message,
        note: result.originatorKasa > 0 && result.normalKasa === 0 
          ? 'Orginator kasasında kredi var. SMS göndermek için onaylı başlık gerekiyor.' 
          : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bakiye kontrolü başarısız: ' + error.message
    });
  }
});

// @route   GET /api/sms/check-status/:islemNo
// @desc    SMS gönderim durumunu sorgula
// @access  Private
router.get('/check-status/:islemNo', async (req, res) => {
  try {
    const result = await smsService.checkSMSStatus(req.params.islemNo);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Durum sorgulaması başarısız: ' + error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEKİL SMS GÖNDERİMİ
// ═══════════════════════════════════════════════════════════════════════════════

// @route   POST /api/sms/send
// @desc    Tekil SMS gönder
// @access  Private
router.post('/send', async (req, res) => {
  try {
    const { phone, message, athleteId } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Telefon numarası ve mesaj gereklidir'
      });
    }

    if (!config.SMS.enabled) {
      return res.status(400).json({
        success: false,
        message: 'SMS servisi devre dışı'
      });
    }

    const result = await smsService.sendCustomMessage(phone, message);

    // Log'u güncelle
    if (athleteId) {
      await SMSLog.findOneAndUpdate(
        { phone: smsService.formatPhone(phone), createdAt: { $gte: new Date(Date.now() - 5000) } },
        { athlete: athleteId, sentBy: req.admin.id },
        { sort: { createdAt: -1 } }
      );
    }

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'SMS gönderimi başarısız: ' + error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOPLU SMS GÖNDERİMİ
// ═══════════════════════════════════════════════════════════════════════════════

// @route   POST /api/sms/bulk
// @desc    Toplu SMS gönder (seçili sporcular)
// @access  Private
router.post('/bulk', async (req, res) => {
  try {
    const { athleteIds, message, useTemplate = false } = req.body;

    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sporcu seçimi gereklidir'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj gereklidir'
      });
    }

    if (!config.SMS.enabled) {
      return res.status(400).json({
        success: false,
        message: 'SMS servisi devre dışı'
      });
    }

    // Seçili sporcuları al
    const athletes = await Athlete.find({ _id: { $in: athleteIds } })
      .select('firstName lastName phone guardian tcNo');

    const recipients = athletes
      .map(a => ({
        phone: a.phone || a.guardian?.phone,
        athleteId: a._id,
        athleteName: `${a.firstName} ${a.lastName}`,
        tcNo: a.tcNo
      }))
      .filter(r => r.phone);

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Seçili sporcuların telefon numarası bulunamadı'
      });
    }

    // Toplu SMS gönder
    const bulkId = `bulk_${Date.now()}_${req.admin.id}`;
    const result = await smsService.sendBulk(recipients, message, useTemplate);

    // Log'ları güncelle
    for (const r of result.results) {
      if (r.athleteId) {
        await SMSLog.findOneAndUpdate(
          { phone: r.phone, createdAt: { $gte: new Date(Date.now() - 60000) } },
          { athlete: r.athleteId, sentBy: req.admin.id, bulkId },
          { sort: { createdAt: -1 } }
        );
      }
    }

    res.json({
      success: true,
      message: `${result.successful}/${result.total} SMS başarıyla gönderildi`,
      data: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        bulkId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Toplu SMS gönderimi başarısız: ' + error.message
    });
  }
});

// @route   POST /api/sms/group
// @desc    Gruba toplu SMS gönder
// @access  Private
router.post('/group', async (req, res) => {
  try {
    const { groupType, message, useTemplate = false } = req.body;

    if (!groupType || !message) {
      return res.status(400).json({
        success: false,
        message: 'Grup tipi ve mesaj gereklidir'
      });
    }

    const validGroups = ['all', 'monthly', 'session', 'active', 'passive', 'lowSession'];
    if (!validGroups.includes(groupType)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz grup tipi. Geçerli değerler: ' + validGroups.join(', ')
      });
    }

    if (!config.SMS.enabled) {
      return res.status(400).json({
        success: false,
        message: 'SMS servisi devre dışı'
      });
    }

    const result = await NotificationService.sendGroupSMS(groupType, message, useTemplate);

    res.json({
      success: true,
      message: `${result.successful}/${result.total} SMS başarıyla gönderildi`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Grup SMS gönderimi başarısız: ' + error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SMS ŞABLONLARI
// ═══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/sms/templates
// @desc    SMS şablonlarını al
// @access  Private
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'payment_reminder',
        name: 'Ödeme Hatırlatma',
        message: 'Sayın Veli, {ad} için ödemenizin son günü yaklaşmaktadır. Kırıkkale Olimpiyat Spor Kulübü',
        variables: ['{ad}']
      },
      {
        id: 'payment_expired',
        name: 'Ödeme Süresi Doldu',
        message: 'Sayın Veli, {ad} için ödemeniz dolmuştur. Kaydımızın devamı için 3 gün içinde ödemenizi yapmanızı rica ederiz. Kırıkkale Olimpiyat Spor Kulübü',
        variables: ['{ad}']
      },
      {
        id: 'session_warning',
        name: 'Seans Hakkı Azalıyor',
        message: 'Sayın Veli, {ad}\'in seans hakkı azalmaktadır. Devamı için yeni paket almanızı öneririz. Kırıkkale Olimpiyat Spor Kulübü',
        variables: ['{ad}']
      },
      {
        id: 'session_expired',
        name: 'Seans Hakkı Doldu',
        message: 'Sayın Veli, {tc} TC numaralı {ad} öğrencimizin seans hakkı dolmuştur. Devamı için ödeme yapmanızı rica ederiz. Kırıkkale Olimpiyat Spor Kulübü',
        variables: ['{ad}', '{tc}']
      },
      {
        id: 'announcement',
        name: 'Genel Duyuru',
        message: 'Sayın Veli, {ad} öğrencimiz hakkında bilgilendirme: ... Kırıkkale Olimpiyat Spor Kulübü',
        variables: ['{ad}']
      },
      {
        id: 'welcome',
        name: 'Hoş Geldiniz',
        message: 'Sayın Veli, {ad} öğrencimizi ailemize katıldığı için tebrik ederiz. Kırıkkale Olimpiyat Spor Kulübü',
        variables: ['{ad}']
      }
    ];

    res.json({
      success: true,
      data: templates,
      variableInfo: {
        '{ad}': 'Sporcu adı soyadı',
        '{isim}': 'Sporcu adı soyadı (alternatif)',
        '{tc}': 'Sporcu TC numarası',
        '{sporcu}': 'Sporcu adı soyadı (alternatif)'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SMS LOGLAR VE İSTATİSTİKLER
// ═══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/sms/logs
// @desc    SMS loglarını listele
// @access  Private
router.get('/logs', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      success, 
      startDate, 
      endDate,
      athleteId 
    } = req.query;

    const filter = {};
    
    if (type) filter.type = type;
    if (success !== undefined) filter.success = success === 'true';
    if (athleteId) filter.athlete = athleteId;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const total = await SMSLog.countDocuments(filter);

    const logs = await SMSLog.find(filter)
      .populate('athlete', 'firstName lastName tcNo')
      .populate('sentBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: logs,
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

// @route   GET /api/sms/stats
// @desc    SMS istatistiklerini al
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate, period = 'today' } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      switch (period) {
        case 'today':
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          dateFilter = { $gte: todayStart };
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - 7);
          dateFilter = { $gte: weekStart };
          break;
        case 'month':
          const monthStart = new Date(now);
          monthStart.setMonth(monthStart.getMonth() - 1);
          dateFilter = { $gte: monthStart };
          break;
        case 'year':
          const yearStart = new Date(now);
          yearStart.setFullYear(yearStart.getFullYear() - 1);
          dateFilter = { $gte: yearStart };
          break;
      }
    }

    const filter = dateFilter.$gte ? { createdAt: dateFilter } : {};

    // Genel istatistikler
    const total = await SMSLog.countDocuments(filter);
    const successful = await SMSLog.countDocuments({ ...filter, success: true });
    const failed = await SMSLog.countDocuments({ ...filter, success: false });

    // Tip bazında istatistikler
    const byType = await SMSLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          successful: { $sum: { $cond: ['$success', 1, 0] } },
          failed: { $sum: { $cond: ['$success', 0, 1] } }
        }
      }
    ]);

    // Günlük trend (son 30 gün)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyTrend = await SMSLog.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          total: { $sum: 1 },
          successful: { $sum: { $cond: ['$success', 1, 0] } }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          total,
          successful,
          failed,
          successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%'
        },
        byType: byType.reduce((acc, item) => {
          acc[item._id || 'unknown'] = {
            total: item.total,
            successful: item.successful,
            failed: item.failed
          };
          return acc;
        }, {}),
        dailyTrend: dailyTrend.map(d => ({
          date: d._id.date,
          total: d.total,
          successful: d.successful
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPORCUYA SMS GEÇMİŞİ
// ═══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/sms/athlete/:athleteId
// @desc    Sporcuya gönderilen SMS'leri al
// @access  Private
router.get('/athlete/:athleteId', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const logs = await SMSLog.getByAthlete(req.params.athleteId, parseInt(limit));
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HATIRLATMA KONTROLÜ (MANUEL)
// ═══════════════════════════════════════════════════════════════════════════════

// @route   POST /api/sms/check-reminders
// @desc    Manuel hatırlatma kontrolü başlat
// @access  Private (Admin only)
router.post('/check-reminders', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const paymentReminders = await NotificationService.checkPaymentReminders();
    const sessionReminders = await NotificationService.checkSessionReminders();

    res.json({
      success: true,
      message: 'Hatırlatma kontrolü tamamlandı',
      data: {
        paymentReminders,
        sessionReminders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası: ' + error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALICI LİSTESİ ÖNIZLEME
// ═══════════════════════════════════════════════════════════════════════════════

// @route   GET /api/sms/preview-recipients
// @desc    Grup için alıcı listesini önizle
// @access  Private
router.get('/preview-recipients', async (req, res) => {
  try {
    const { groupType } = req.query;

    if (!groupType) {
      return res.status(400).json({
        success: false,
        message: 'Grup tipi gereklidir'
      });
    }

    let filter = {};
    
    switch (groupType) {
      case 'all':
        filter = {};
        break;
      case 'monthly':
        filter = { membershipType: 'Aylık', status: 'Aktif' };
        break;
      case 'session':
        filter = { membershipType: '8 Seanslık', status: 'Aktif' };
        break;
      case 'active':
        filter = { status: 'Aktif' };
        break;
      case 'passive':
        filter = { status: 'Pasif' };
        break;
      case 'lowSession':
        filter = { membershipType: '8 Seanslık', remainingSessions: { $lte: 2 }, status: 'Aktif' };
        break;
      default:
        filter = { status: 'Aktif' };
    }

    const athletes = await Athlete.find(filter)
      .select('firstName lastName phone guardian membershipType remainingSessions status')
      .limit(100);

    const recipients = athletes.map(a => ({
      id: a._id,
      name: `${a.firstName} ${a.lastName}`,
      phone: a.phone || a.guardian?.phone || 'Telefon yok',
      hasPhone: !!(a.phone || a.guardian?.phone),
      membershipType: a.membershipType,
      remainingSessions: a.remainingSessions,
      status: a.status
    }));

    const totalCount = await Athlete.countDocuments(filter);
    const withPhone = recipients.filter(r => r.hasPhone).length;

    res.json({
      success: true,
      data: {
        recipients,
        summary: {
          totalInGroup: totalCount,
          withPhone,
          withoutPhone: totalCount - withPhone,
          showing: recipients.length
        }
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
