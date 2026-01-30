// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         SMS Log Model - MongoDB Schema
//                    Gönderilen SMS kayıtlarını takip eder
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  // Telefon numarası
  phone: {
    type: String,
    required: [true, 'Telefon numarası zorunludur'],
    trim: true
  },
  
  // Mesaj içeriği
  message: {
    type: String,
    required: [true, 'Mesaj içeriği zorunludur']
  },
  
  // SMS Tipi
  type: {
    type: String,
    enum: [
      'monthly_reminder',      // Aylık ödeme hatırlatma
      'monthly_expired',       // Aylık ödeme süresi doldu
      'session_warning',       // Seans hakkı azalıyor
      'session_expired',       // Seans hakkı doldu
      'payment_confirmation',  // Ödeme onayı
      'registration',          // Kayıt onayı
      'bulk',                  // Toplu SMS
      'custom'                 // Özel mesaj
    ],
    default: 'custom'
  },
  
  // Gönderim durumu
  success: {
    type: Boolean,
    default: false
  },
  
  // API yanıt kodu
  responseCode: {
    type: String,
    trim: true
  },
  
  // API yanıt mesajı
  responseMessage: {
    type: String,
    trim: true
  },
  
  // Mesaj ID (API'den dönen)
  messageId: {
    type: String,
    trim: true
  },
  
  // İlişkili sporcu
  athlete: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Athlete',
    default: null
  },
  
  // Gönderen admin
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  
  // Otomatik mi gönderildi?
  isAutomatic: {
    type: Boolean,
    default: false
  },
  
  // Toplu SMS ID (toplu gönderimler için)
  bulkId: {
    type: String,
    default: null
  },
  
  // Maliyet (SMS başına)
  cost: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// SMS tipi açıklaması virtual
smsLogSchema.virtual('typeLabel').get(function() {
  const labels = {
    'monthly_reminder': 'Aylık Ödeme Hatırlatma',
    'monthly_expired': 'Aylık Ödeme Süresi Doldu',
    'session_warning': 'Seans Hakkı Azalıyor',
    'session_expired': 'Seans Hakkı Doldu',
    'payment_confirmation': 'Ödeme Onayı',
    'registration': 'Kayıt Onayı',
    'bulk': 'Toplu SMS',
    'custom': 'Özel Mesaj'
  };
  return labels[this.type] || 'Bilinmeyen';
});

// Durum açıklaması virtual
smsLogSchema.virtual('statusLabel').get(function() {
  return this.success ? 'Başarılı' : 'Başarısız';
});

// Kısa mesaj virtual (ilk 50 karakter)
smsLogSchema.virtual('shortMessage').get(function() {
  if (!this.message) return '';
  return this.message.length > 50 ? this.message.substring(0, 50) + '...' : this.message;
});

// Son gönderilen SMS'leri al
smsLogSchema.statics.getRecent = async function(limit = 50) {
  return await this.find()
    .populate('athlete', 'firstName lastName')
    .populate('sentBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Bugünkü istatistikleri al
smsLogSchema.statics.getTodayStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const total = await this.countDocuments({ createdAt: { $gte: today } });
  const successful = await this.countDocuments({ createdAt: { $gte: today }, success: true });
  const failed = await this.countDocuments({ createdAt: { $gte: today }, success: false });
  
  return { total, successful, failed };
};

// Aylık istatistikleri al
smsLogSchema.statics.getMonthlyStats = async function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: '$createdAt' },
          success: '$success'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.day': 1 }
    }
  ]);
  
  return stats;
};

// Tip bazında istatistikler
smsLogSchema.statics.getStatsByType = async function(startDate, endDate) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  
  return await this.aggregate([
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
};

// Belirli bir sporcuya gönderilen SMS'ler
smsLogSchema.statics.getByAthlete = async function(athleteId, limit = 20) {
  return await this.find({ athlete: athleteId })
    .populate('sentBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Indexler
smsLogSchema.index({ phone: 1 });
smsLogSchema.index({ createdAt: -1 });
smsLogSchema.index({ type: 1 });
smsLogSchema.index({ success: 1 });
smsLogSchema.index({ athlete: 1 });
smsLogSchema.index({ bulkId: 1 });

module.exports = mongoose.model('SMSLog', smsLogSchema);
