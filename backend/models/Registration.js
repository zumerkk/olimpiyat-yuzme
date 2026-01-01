// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                     Online Kayıt Model - MongoDB Schema
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const config = require('../config/config');

const registrationSchema = new mongoose.Schema({
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
  
  // İletişim Bilgileri
  phone: {
    type: String,
    required: [true, 'Telefon zorunludur'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'E-posta zorunludur'],
    lowercase: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  
  // Veli Bilgileri
  guardian: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    relation: { type: String, trim: true }
  },
  
  // Tercihler
  preferredLevel: {
    type: String,
    enum: config.SWIMMING.SESSION_TYPES,
    default: 'Başlangıç'
  },
  preferredAgeGroup: {
    type: String,
    enum: [...config.SWIMMING.AGE_GROUPS, '', null], // Boş değere izin ver
    default: ''
  },
  preferredDays: [{
    type: String,
    enum: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
  }],
  
  // Sağlık Bilgileri
  healthInfo: {
    bloodType: { type: String, trim: true },
    allergies: { type: String, trim: true },
    medicalConditions: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    canSwim: { type: Boolean, default: false }
  },
  
  // Kayıt Kaynağı
  source: {
    type: String,
    enum: ['QR Kod', 'Online Link'],
    required: true
  },
  
  // Kayıt Durumu
  status: {
    type: String,
    enum: ['Beklemede', 'Onaylandı', 'Reddedildi', 'Sporcu Oluşturuldu'],
    default: 'Beklemede'
  },
  
  // İşlem Notları
  adminNotes: {
    type: String,
    trim: true
  },
  
  // İşlemi Yapan Admin
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: {
    type: Date
  },
  
  // Oluşturulan Sporcu Referansı
  createdAthlete: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Athlete'
  },
  
  // QR/Link Tracking
  registrationCode: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // IP ve Cihaz Bilgisi
  submissionInfo: {
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Tam ad virtual
registrationSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Yaş hesaplama virtual
registrationSchema.virtual('age').get(function() {
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

// Indexler
registrationSchema.index({ status: 1 });
registrationSchema.index({ createdAt: -1 });
registrationSchema.index({ tcNo: 1 });

module.exports = mongoose.model('Registration', registrationSchema);

