// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Yoklama/Seans Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Session = require('../models/Session');
const Athlete = require('../models/Athlete');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');
const logger = require('../services/logger');

router.use(protect);

// @route   GET /api/sessions
// @desc    Tüm seansları/yoklamaları listele
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    
    // Tarih filtresi
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Session.countDocuments(filter);

    const sessions = await Session.find(filter)
      .populate('attendees.athlete', 'firstName lastName membershipType remainingSessions')
      .populate('createdBy', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: sessions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Sessions list error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/sessions/stats
// @desc    Yoklama istatistikleri
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalSessions,
      todaySessions,
      thisMonthSessions,
      totalAttendance
    ] = await Promise.all([
      Session.countDocuments(),
      Session.countDocuments({ 
        date: { 
          $gte: today, 
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
        } 
      }),
      Session.countDocuments({ date: { $gte: thisMonth } }),
      Session.aggregate([
        { $unwind: '$attendees' },
        { $match: { 'attendees.attended': true } },
        { $count: 'total' }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalSessions,
        todaySessions,
        thisMonthSessions,
        totalAttendance: totalAttendance[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/sessions/:id
// @desc    Tek seans/yoklama detayı
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('attendees.athlete', 'firstName lastName tcNo phone membershipType remainingSessions totalSessionsUsed')
      .populate('createdBy', 'name');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Seans bulunamadı'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/sessions
// @desc    Yeni yoklama/seans oluştur
// @access  Private
router.post('/', [
  body('date').notEmpty().withMessage('Tarih zorunludur'),
  body('attendees').isArray().withMessage('Katılımcı listesi gerekli')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { date, time, attendees, notes } = req.body;

    // Seans oluştur
    const session = await Session.create({
      date: new Date(date),
      time: time || '10:00',
      attendees: attendees.map(athleteId => ({
        athlete: athleteId,
        attended: true,
        sessionDeducted: false
      })),
      notes,
      createdBy: req.admin.id,
      status: 'Aktif'
    });

    // Yoklama işlemini gerçekleştir - seans haklarını düşür
    await session.processAttendance();

    // Her sporcu için paket kontrolü yap
    for (const attendee of attendees) {
      const athlete = await Athlete.findById(attendee);
      
      // 8 Seanslık paket ve hakkı bittiyse ödeme kaydı oluştur
      if (athlete && athlete.membershipType === '8 Seanslık' && athlete.remainingSessions === 0) {
        // Yeni paket ödemesi oluştur
        await Payment.createPackagePayment(athlete);
      }
    }

    const populatedSession = await Session.findById(session._id)
      .populate('attendees.athlete', 'firstName lastName membershipType remainingSessions');

    res.status(201).json({
      success: true,
      message: 'Yoklama oluşturuldu ve seans hakları güncellendi',
      data: populatedSession
    });
  } catch (error) {
    logger.error('Session create error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Yoklama güncelle
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Seans bulunamadı'
      });
    }

    const { date, time, notes, status } = req.body;

    if (date) session.date = new Date(date);
    if (time) session.time = time;
    if (notes !== undefined) session.notes = notes;
    if (status) session.status = status;

    await session.save();

    const updated = await Session.findById(session._id)
      .populate('attendees.athlete', 'firstName lastName membershipType remainingSessions');

    res.json({
      success: true,
      message: 'Yoklama güncellendi',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   POST /api/sessions/:id/add-attendee
// @desc    Yoklamaya sporcu ekle
// @access  Private
router.post('/:id/add-attendee', async (req, res) => {
  try {
    const { athleteId } = req.body;
    
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Seans bulunamadı'
      });
    }

    const athlete = await Athlete.findById(athleteId);
    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: 'Sporcu bulunamadı'
      });
    }

    // Zaten ekli mi kontrol et
    const alreadyAdded = session.attendees.some(
      a => a.athlete.toString() === athleteId
    );
    
    if (alreadyAdded) {
      return res.status(400).json({
        success: false,
        message: 'Bu sporcu zaten yoklamada'
      });
    }

    // Sporcuyu ekle
    session.attendees.push({
      athlete: athleteId,
      attended: true,
      sessionDeducted: false
    });

    await session.save();

    // Seans hakkını düşür
    if (athlete.membershipType === '8 Seanslık') {
      await athlete.decrementSession();
      
      // Hakkı bittiyse ödeme oluştur
      if (athlete.remainingSessions === 0) {
        await Payment.createPackagePayment(athlete);
      }
    } else {
      athlete.totalSessionsUsed += 1;
      await athlete.save();
    }

    // Yoklamayı güncelle
    const attendeeIndex = session.attendees.findIndex(
      a => a.athlete.toString() === athleteId
    );
    session.attendees[attendeeIndex].sessionDeducted = true;
    await session.save();

    const updated = await Session.findById(session._id)
      .populate('attendees.athlete', 'firstName lastName membershipType remainingSessions');

    res.json({
      success: true,
      message: 'Sporcu yoklamaya eklendi',
      data: updated
    });
  } catch (error) {
    logger.error('Add attendee error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/sessions/:id/remove-attendee/:athleteId
// @desc    Yoklamadan sporcu çıkar
// @access  Private
router.delete('/:id/remove-attendee/:athleteId', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Seans bulunamadı'
      });
    }

    const attendeeIndex = session.attendees.findIndex(
      a => a.athlete.toString() === req.params.athleteId
    );

    if (attendeeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Sporcu bu yoklamada bulunamadı'
      });
    }

    // Eğer seans hakkı düşürüldüyse geri ver
    if (session.attendees[attendeeIndex].sessionDeducted) {
      const athlete = await Athlete.findById(req.params.athleteId);
      if (athlete && athlete.membershipType === '8 Seanslık') {
        athlete.remainingSessions += 1;
        athlete.totalSessionsUsed -= 1;
        await athlete.save();
      } else if (athlete) {
        athlete.totalSessionsUsed -= 1;
        await athlete.save();
      }
    }

    session.attendees.splice(attendeeIndex, 1);
    await session.save();

    const updated = await Session.findById(session._id)
      .populate('attendees.athlete', 'firstName lastName membershipType remainingSessions');

    res.json({
      success: true,
      message: 'Sporcu yoklamadan çıkarıldı',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Yoklama sil
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Seans bulunamadı'
      });
    }

    // Seans haklarını geri ver
    for (const attendee of session.attendees) {
      if (attendee.sessionDeducted) {
        const athlete = await Athlete.findById(attendee.athlete);
        if (athlete) {
          if (athlete.membershipType === '8 Seanslık') {
            athlete.remainingSessions += 1;
          }
          athlete.totalSessionsUsed -= 1;
          await athlete.save();
        }
      }
    }

    await session.deleteOne();

    res.json({
      success: true,
      message: 'Yoklama silindi ve seans hakları iade edildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

module.exports = router;
