// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Dashboard Routes
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const Athlete = require('../models/Athlete');
const Session = require('../models/Session');
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const logger = require('../services/logger');

router.use(protect);

// @route   GET /api/dashboard
// @desc    Dashboard verileri
// @access  Private
router.get('/', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Paralel veri çekimi
    const [
      // Sporcu istatistikleri
      totalAthletes,
      activeAthletes,
      newAthletesThisMonth,
      monthlyMemberships,
      packageMemberships,
      lowSessionAthletes,
      
      // Yoklama istatistikleri
      totalSessions,
      todaySessions,
      thisMonthSessions,
      
      // Ödeme istatistikleri
      paidPayments,
      pendingPayments,
      overduePayments,
      
      // Bekleyen kayıtlar
      pendingRegistrations,
      
      // Bildirimler
      unreadNotifications,
      
      // Üyelik tipi dağılımı
      athletesByMembershipType,
      
      // Son aktiviteler
      recentAthletes,
      recentPayments,
      recentSessions
    ] = await Promise.all([
      // Sporcular
      Athlete.countDocuments(),
      Athlete.countDocuments({ status: 'Aktif' }),
      Athlete.countDocuments({
        createdAt: {
          $gte: new Date(currentYear, currentMonth - 1, 1)
        }
      }),
      Athlete.countDocuments({ status: 'Aktif', membershipType: 'Aylık' }),
      Athlete.countDocuments({ status: 'Aktif', membershipType: '8 Seanslık' }),
      Athlete.countDocuments({ 
        status: 'Aktif', 
        membershipType: '8 Seanslık',
        remainingSessions: { $lte: 2 }
      }),
      
      // Yoklamalar
      Session.countDocuments(),
      Session.countDocuments({
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }),
      Session.countDocuments({
        date: { $gte: new Date(currentYear, currentMonth - 1, 1) }
      }),
      
      // Ödemeler
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
      
      // Bekleyen kayıtlar
      Registration.countDocuments({ status: 'Beklemede' }),
      
      // Okunmamış bildirimler
      Notification.countDocuments({ isRead: false }),
      
      // Üyelik tipi dağılımı
      Athlete.aggregate([
        { $match: { status: 'Aktif' } },
        { $group: { _id: '$membershipType', count: { $sum: 1 } } }
      ]),
      
      // Son eklenen sporcular
      Athlete.find()
        .select('firstName lastName membershipType remainingSessions status createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      
      // Son ödemeler
      Payment.find({ status: 'Ödendi' })
        .populate('athlete', 'firstName lastName')
        .select('amount paymentDate paymentType')
        .sort({ paymentDate: -1 })
        .limit(5),
      
      // Son yoklamalar
      Session.find()
        .select('date time attendees')
        .sort({ date: -1 })
        .limit(5)
    ]);

    // Yıllık gelir grafiği için aylık veriler
    const yearlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'Ödendi',
          paymentDate: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$paymentDate' },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          athletes: {
            total: totalAthletes,
            active: activeAthletes,
            newThisMonth: newAthletesThisMonth,
            monthly: monthlyMemberships,
            package: packageMemberships,
            lowSession: lowSessionAthletes
          },
          sessions: {
            total: totalSessions,
            today: todaySessions,
            thisMonth: thisMonthSessions
          },
          payments: {
            paid: {
              total: paidPayments[0]?.total || 0,
              count: paidPayments[0]?.count || 0
            },
            pending: {
              total: pendingPayments[0]?.total || 0,
              count: pendingPayments[0]?.count || 0
            },
            overdue: {
              total: overduePayments[0]?.total || 0,
              count: overduePayments[0]?.count || 0
            }
          },
          pendingRegistrations,
          unreadNotifications
        },
        charts: {
          athletesByMembershipType: athletesByMembershipType.map(item => ({
            name: item._id,
            value: item.count
          })),
          yearlyRevenue: yearlyRevenue.map(item => ({
            month: item._id,
            total: item.total
          }))
        },
        recent: {
          athletes: recentAthletes,
          payments: recentPayments,
          sessions: recentSessions.map(s => ({
            _id: s._id,
            date: s.date,
            time: s.time,
            attendeeCount: s.attendees?.length || 0
          }))
        }
      }
    });
  } catch (error) {
    logger.error('Dashboard error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// @route   GET /api/dashboard/alerts
// @desc    Uyarılar (düşük seans, yakın vade)
// @access  Private
router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      lowSessionAthletes,
      upcomingPayments,
      overduePayments
    ] = await Promise.all([
      // 2 ve altı seans hakkı kalan sporcular
      Athlete.find({
        status: 'Aktif',
        membershipType: '8 Seanslık',
        remainingSessions: { $lte: 2 }
      }).select('firstName lastName remainingSessions phone'),
      
      // Yaklaşan ödemeler (7 gün içinde)
      Payment.find({
        status: 'Beklemede',
        dueDate: { $gte: now, $lte: nextWeek }
      })
        .populate('athlete', 'firstName lastName phone')
        .select('amount dueDate paymentType'),
      
      // Gecikmiş ödemeler
      Payment.find({ status: 'Gecikmiş' })
        .populate('athlete', 'firstName lastName phone')
        .select('amount dueDate paymentType')
        .sort({ dueDate: 1 })
        .limit(10)
    ]);

    res.json({
      success: true,
      data: {
        lowSessionAthletes,
        upcomingPayments,
        overduePayments
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
