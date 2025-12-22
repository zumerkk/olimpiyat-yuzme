// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Bildirim Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');
const { protect } = require('../middleware/auth');

router.use(protect);

// @route   GET /api/notifications
// @desc    Bildirimleri listele
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isRead } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    // Admin'e özel veya genel bildirimler
    filter.$or = [
      { targetAdmin: req.admin.id },
      { targetAdmin: null }
    ];

    const total = await Notification.countDocuments(filter);

    const notifications = await Notification.find(filter)
      .populate('relatedData.athleteId', 'firstName lastName')
      .populate('relatedData.sessionId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: notifications,
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

// @route   GET /api/notifications/unread-count
// @desc    Okunmamış bildirim sayısı
// @access  Private
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.admin.id);
    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/notifications/recent
// @desc    Son bildirimler
// @access  Private
router.get('/recent', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const notifications = await Notification.getRecent(parseInt(limit), req.admin.id);
    const unreadCount = await Notification.getUnreadCount(req.admin.id);

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Bildirimi okundu işaretle
// @access  Private
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Bildirim okundu olarak işaretlendi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Tüm bildirimleri okundu işaretle
// @access  Private
router.put('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany(
      {
        isRead: false,
        $or: [
          { targetAdmin: req.admin.id },
          { targetAdmin: null }
        ]
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Tüm bildirimler okundu olarak işaretlendi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Bildirimi sil
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Bildirim bulunamadı'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Bildirim silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/notifications/check-reminders
// @desc    Manuel bildirim kontrolü (test için)
// @access  Private
router.post('/check-reminders', async (req, res) => {
  try {
    const paymentReminders = await NotificationService.checkPaymentReminders();
    const sessionReminders = await NotificationService.checkSessionReminders();

    res.json({
      success: true,
      message: 'Bildirim kontrolü tamamlandı',
      data: {
        paymentReminders,
        sessionReminders
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

