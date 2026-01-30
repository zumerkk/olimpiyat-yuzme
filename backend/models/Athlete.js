// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Sporcu Model - MongoDB Schema
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const config = require('../config/config');

const athleteSchema = new mongoose.Schema({
  // Sporcu Bilgileri
  firstName: {
    type: String,
    required: [true, 'Ad zorunludur'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Soyad zorunludur'],
    trim: true
  },
  tcNo: {
    type: String,
    required: [true, 'TC Kimlik No zorunludur'],
    unique: true,
    trim: true,
    minlength: [11, 'TC Kimlik No 11 haneli olmalıdır'],
    maxlength: [11, 'TC Kimlik No 11 haneli olmalıdır']
  },
  birthDate: {
    type: Date,
    required: [true, 'Doğum tarihi zorunludur']
  },
  gender: {
    type: String,
    enum: ['Erkek', 'Kadın'],
    required: [true, 'Cinsiyet zorunludur']
  },
  photo: {
    type: String,
    default: null
  },
  
  // İletişim Bilgileri
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // Veli Bilgileri (18 yaş altı için)
  guardian: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    relation: { type: String, trim: true }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ÜYELİK TİPİ - AYLIK VEYA 8 SEANSLIK PAKET
  // ═══════════════════════════════════════════════════════════════════════════
  membershipType: {
    type: String,
    enum: ['Aylık', '8 Seanslık'],
    required: [true, 'Üyelik tipi zorunludur'],
    default: 'Aylık'
  },
  
  // 8 Seanslık paket için kalan hak (Aylık için null = sınırsız)
  remainingSessions: {
    type: Number,
    default: null // Aylık için null, paket için 8
  },
  
  // Toplam kullanılan seans sayısı
  totalSessionsUsed: {
    type: Number,
    default: 0
  },
  
  // Paket/Üyelik başlangıç tarihi
  membershipStartDate: {
    type: Date,
    default: Date.now
  },
  
  // Sonraki ödeme tarihi
  // Aylık: Her ayın 15'i
  // 8 Seanslık: 8 seans dolduğunda
  nextPaymentDate: {
    type: Date,
    default: null
  },
  
  // Paket yenileme sayısı
  packageRenewCount: {
    type: Number,
    default: 0
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Ücret bilgisi (Kişiye özel ayarlanabilir)
  monthlyFee: {
    type: Number,
    default: function() {
      return config.PRICING?.DEFAULT_MONTHLY_FEE || 5000;
    }
  },
  packageFee: {
    type: Number,
    default: function() {
      return config.PRICING?.DEFAULT_PACKAGE_FEE || 4000;
    }
  },
  
  // Sağlık Bilgileri
  healthInfo: {
    bloodType: { type: String, trim: true },
    allergies: { type: String, trim: true },
    medicalConditions: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    canSwim: { type: Boolean, default: false }
  },
  
  // Kayıt Kaynağı
  registrationSource: {
    type: String,
    enum: ['Manuel', 'QR Kod', 'Online Link'],
    default: 'Manuel'
  },
  
  // Durum
  status: {
    type: String,
    enum: ['Aktif', 'Pasif', 'Beklemede', 'Ayrıldı'],
    default: 'Aktif'
  },
  
  // Notlar
  notes: {
    type: String,
    trim: true
  },
  
  // Ödeme özeti
  paymentSummary: {
    totalPaid: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    lastPaymentDate: { type: Date, default: null }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Tam ad virtual
athleteSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Yaş hesaplama virtual
athleteSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birth = new Date(this.birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
});

// Üyelik durumu virtual
athleteSchema.virtual('membershipStatus').get(function() {
  if (this.membershipType === 'Aylık') {
    return 'Sınırsız Seans';
  } else {
    return `${this.remainingSessions || 0} Seans Kaldı`;
  }
});

// Kayıt öncesi - varsayılan değerleri ayarla
athleteSchema.pre('save', function(next) {
  // Yeni kayıt için
  if (this.isNew) {
    if (this.membershipType === '8 Seanslık') {
      this.remainingSessions = 8;
    } else {
      this.remainingSessions = null; // Aylık = sınırsız
    }
    
    // İlk ödeme tarihini ayarla
    const now = new Date();
    if (this.membershipType === 'Aylık') {
      // Aylık için bu ayın veya gelecek ayın 15'i
      if (now.getDate() <= 15) {
        this.nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), 15);
      } else {
        this.nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      }
    }
    // 8 Seanslık için nextPaymentDate = 8 seans sonra (yoklamada güncellenir)
  }
  
  next();
});

// Seans düşürme metodu (8 Seanslık paket için)
athleteSchema.methods.decrementSession = async function() {
  if (this.membershipType === '8 Seanslık' && this.remainingSessions > 0) {
    this.remainingSessions -= 1;
    this.totalSessionsUsed += 1;
    
    // 8 seans dolduğunda ödeme gerekli
    if (this.remainingSessions === 0) {
      this.nextPaymentDate = new Date(); // Hemen ödeme gerekli
    }
    
    await this.save();
    return true;
  } else if (this.membershipType === 'Aylık') {
    this.totalSessionsUsed += 1;
    await this.save();
    return true;
  }
  return false;
};

// Paket yenileme metodu
athleteSchema.methods.renewPackage = async function() {
  if (this.membershipType === '8 Seanslık') {
    this.remainingSessions = 8;
    this.packageRenewCount += 1;
    this.nextPaymentDate = null; // Ödeme yapıldıktan sonra
    await this.save();
    return true;
  }
  return false;
};

// Indexler
athleteSchema.index({ firstName: 'text', lastName: 'text', tcNo: 'text' });
athleteSchema.index({ status: 1 });
athleteSchema.index({ membershipType: 1 });

module.exports = mongoose.model('Athlete', athleteSchema);
