// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Admin Model - MongoDB Schema
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'İsim zorunludur'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'E-posta zorunludur'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir e-posta adresi giriniz']
  },
  password: {
    type: String,
    required: [true, 'Şifre zorunludur'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Şifre hashleme
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Şifre karşılaştırma
adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT Token oluşturma
adminSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
};

// Varsayılan admin oluştur
adminSchema.statics.createDefaultAdmin = async function() {
  const logger = require('../services/logger');
  
  try {
    const adminExists = await this.findOne({ email: config.ADMIN_DEFAULT.email });
    if (!adminExists) {
      await this.create({
        name: config.ADMIN_DEFAULT.name,
        email: config.ADMIN_DEFAULT.email,
        password: config.ADMIN_DEFAULT.password,
        role: config.ADMIN_DEFAULT.role
      });
      logger.info('✅ Varsayılan admin hesabı oluşturuldu', {
        email: config.ADMIN_DEFAULT.email
      });
    }
  } catch (error) {
    logger.error('Admin oluşturma hatası', { error: error.message });
  }
};

module.exports = mongoose.model('Admin', adminSchema);

