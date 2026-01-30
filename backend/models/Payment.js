// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Ödeme Model - MongoDB Schema
//                    Kısmi Ödeme Desteği ile Güncellenmiş v2.0
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const config = require('../config/config');

// Kısmi Ödeme Alt Şeması
const partialPaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: [0, 'Tutar negatif olamaz']
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Diğer'],
    default: 'Nakit'
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, { _id: true, timestamps: true });

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
  
  // Beklenen Tutar (Örn: 5000₺)
  amount: {
    type: Number,
    required: [true, 'Ödeme tutarı zorunludur'],
    min: [0, 'Tutar negatif olamaz']
  },
  
  // Ödenen Toplam Tutar (Kısmi ödemelerin toplamı)
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tutar negatif olamaz']
  },
  
  // Kısmi Ödemeler Listesi
  partialPayments: [partialPaymentSchema],
  
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
  
  // Son Ödeme Tarihi (Tam ödeme yapıldığında)
  paymentDate: {
    type: Date,
    default: null
  },
  
  // Ödeme Durumu
  status: {
    type: String,
    enum: ['Beklemede', 'Kısmi Ödeme', 'Ödendi', 'Gecikmiş', 'İptal'],
    default: 'Beklemede'
  },
  
  // Son Ödeme Yöntemi (geriye uyumluluk için)
  paymentMethod: {
    type: String,
    enum: ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Diğer'],
    default: null
  },
  
  // Makbuz/Dekont No (geriye uyumluluk için)
  receiptNumber: {
    type: String,
    trim: true
  },
  
  // Son İşlemi Yapan Admin
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

// Kalan Borç virtual (Beklenen - Ödenen)
paymentSchema.virtual('remainingBalance').get(function() {
  return Math.max(0, this.amount - (this.paidAmount || 0));
});

// Ödeme yüzdesi virtual
paymentSchema.virtual('paidPercentage').get(function() {
  if (this.amount === 0) return 100;
  return Math.round(((this.paidAmount || 0) / this.amount) * 100);
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
  // Ödenen tutara göre durum belirleme
  const remaining = this.amount - (this.paidAmount || 0);
  
  if (remaining <= 0) {
    // Tam ödendi
    this.status = 'Ödendi';
    if (!this.paymentDate) {
      this.paymentDate = new Date();
    }
  } else if (this.paidAmount > 0) {
    // Kısmi ödeme yapılmış
    this.status = 'Kısmi Ödeme';
  } else {
    // Hiç ödeme yok - gecikme kontrolü
    const now = new Date();
    const due = new Date(this.dueDate);
    if (now > due && this.status !== 'İptal') {
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
    amount: athlete.monthlyFee || config.PRICING.DEFAULT_MONTHLY_FEE,
    paidAmount: 0,
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
    amount: athlete.packageFee || config.PRICING.DEFAULT_PACKAGE_FEE,
    paidAmount: 0,
    packageNumber: packageNumber,
    dueDate: new Date() // Hemen ödenmeli
  });
};

// Kısmi ödeme ekle
paymentSchema.methods.addPartialPayment = async function(paymentData) {
  const { amount, paymentMethod, receiptNumber, notes, processedBy } = paymentData;
  
  // Kalan borçtan fazla ödeme yapılamaz
  const remaining = this.amount - (this.paidAmount || 0);
  if (amount > remaining) {
    throw new Error(`Kalan borç ${remaining}₺, bu tutardan fazla ödeme yapılamaz`);
  }
  
  // Kısmi ödeme kaydı ekle
  this.partialPayments.push({
    amount,
    paymentDate: new Date(),
    paymentMethod: paymentMethod || 'Nakit',
    receiptNumber,
    notes,
    processedBy
  });
  
  // Toplam ödenen tutarı güncelle
  this.paidAmount = (this.paidAmount || 0) + amount;
  
  // Son ödeme bilgilerini de güncelle (geriye uyumluluk)
  this.paymentMethod = paymentMethod;
  this.receiptNumber = receiptNumber;
  this.notes = notes;
  this.processedBy = processedBy;
  
  await this.save();
  return this;
};

module.exports = mongoose.model('Payment', paymentSchema);
