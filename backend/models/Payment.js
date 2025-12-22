// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Ödeme Model - MongoDB Schema
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Sporcu
  athlete: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Athlete',
    required: [true, 'Sporcu bilgisi zorunludur']
  },
  
  // Ödeme Tipi (Aylık veya Paket)
  paymentType: {
    type: String,
    enum: ['Aylık', '8 Seanslık'],
    required: [true, 'Ödeme tipi zorunludur']
  },
  
  // Ödeme Tutarı
  amount: {
    type: Number,
    required: [true, 'Ödeme tutarı zorunludur'],
    min: [0, 'Tutar negatif olamaz']
  },
  
  // Ödeme Dönemi (Aylık için)
  period: {
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number }
  },
  
  // Paket numarası (8 Seanslık için - kaçıncı paket)
  packageNumber: {
    type: Number,
    default: null
  },
  
  // Vade Tarihi
  // Aylık: Her ayın 15'i
  // 8 Seanslık: 8 seans tamamlandığında
  dueDate: {
    type: Date,
    required: [true, 'Vade tarihi zorunludur']
  },
  
  // Ödeme Tarihi
  paymentDate: {
    type: Date,
    default: null
  },
  
  // Ödeme Durumu
  status: {
    type: String,
    enum: ['Beklemede', 'Ödendi', 'Gecikmiş', 'İptal'],
    default: 'Beklemede'
  },
  
  // Ödeme Yöntemi
  paymentMethod: {
    type: String,
    enum: ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Diğer'],
    default: null
  },
  
  // Makbuz/Dekont No
  receiptNumber: {
    type: String,
    trim: true
  },
  
  // İşlemi Yapan Admin
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Notlar
  notes: {
    type: String,
    trim: true
  },
  
  // Hatırlatma gönderildi mi?
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Dönem adı virtual (Aylık için)
paymentSchema.virtual('periodName').get(function() {
  if (this.paymentType === '8 Seanslık') {
    return `${this.packageNumber}. Paket`;
  }
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${months[this.period.month - 1]} ${this.period.year}`;
});

// Gecikme gün sayısı virtual
paymentSchema.virtual('overdueDays').get(function() {
  if (this.status === 'Ödendi') return 0;
  const now = new Date();
  const due = new Date(this.dueDate);
  if (now <= due) return 0;
  return Math.ceil((now - due) / (1000 * 60 * 60 * 24));
});

// Vadeye kalan gün virtual
paymentSchema.virtual('daysUntilDue').get(function() {
  if (this.status === 'Ödendi') return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
});

// Ödeme öncesi - durum güncelleme
paymentSchema.pre('save', function(next) {
  if (this.paymentDate && this.status === 'Beklemede') {
    this.status = 'Ödendi';
  }
  
  // Gecikme kontrolü
  if (this.status !== 'Ödendi' && this.status !== 'İptal') {
    const now = new Date();
    const due = new Date(this.dueDate);
    if (now > due) {
      this.status = 'Gecikmiş';
    }
  }
  
  next();
});

// Indexler
paymentSchema.index({ athlete: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ dueDate: 1 });
paymentSchema.index({ paymentType: 1 });

// Aylık ödeme oluştur
paymentSchema.statics.createMonthlyPayment = async function(athlete) {
  const now = new Date();
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);
  
  // Eğer 15'i geçtiyse gelecek ayın 15'i
  if (now.getDate() > 15) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  return await this.create({
    athlete: athlete._id,
    paymentType: 'Aylık',
    amount: athlete.monthlyFee || 1500,
    period: {
      month: dueDate.getMonth() + 1,
      year: dueDate.getFullYear()
    },
    dueDate: dueDate
  });
};

// 8 Seanslık paket ödemesi oluştur
paymentSchema.statics.createPackagePayment = async function(athlete) {
  const packageNumber = (athlete.packageRenewCount || 0) + 1;
  
  return await this.create({
    athlete: athlete._id,
    paymentType: '8 Seanslık',
    amount: athlete.packageFee || 1200,
    packageNumber: packageNumber,
    dueDate: new Date() // Hemen ödenmeli
  });
};

module.exports = mongoose.model('Payment', paymentSchema);
