// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Yoklama/Seans Model - MongoDB Schema
// ═══════════════════════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  // Seans/Yoklama Tarihi
  date: {
    type: Date,
    required: [true, 'Seans tarihi zorunludur'],
    default: Date.now
  },
  
  // Seans Saati
  time: {
    type: String,
    default: '10:00'
  },
  
  // Katılan Sporcular
  attendees: [{
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Athlete',
      required: true
    },
    // Yoklamaya katılım durumu
    attended: {
      type: Boolean,
      default: true
    },
    // Seans hakkı düşürüldü mü? (8 seanslık paket için)
    sessionDeducted: {
      type: Boolean,
      default: false
    }
  }],
  
  // Seans Notu
  notes: {
    type: String,
    trim: true
  },
  
  // Oluşturan Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Durum
  status: {
    type: String,
    enum: ['Aktif', 'Tamamlandı', 'İptal'],
    default: 'Aktif'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Katılımcı sayısı virtual
sessionSchema.virtual('attendeeCount').get(function() {
  return this.attendees ? this.attendees.filter(a => a.attended).length : 0;
});

// Tarih formatı virtual
sessionSchema.virtual('formattedDate').get(function() {
  if (!this.date) return '';
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date(this.date).toLocaleDateString('tr-TR', options);
});

// Sporcu yoklama işlemi - seans hakkını düşür
// NOT: 8 Seanslık pakette hak 0'ın altına da düşebilir (borçlu giriş)
sessionSchema.methods.processAttendance = async function() {
  const Athlete = mongoose.model('Athlete');
  
  for (let attendee of this.attendees) {
    if (attendee.attended && !attendee.sessionDeducted) {
      const athlete = await Athlete.findById(attendee.athlete);
      if (athlete) {
        // 8 Seanslık paket için hak düşür (eksiye de düşebilir)
        if (athlete.membershipType === '8 Seanslık') {
          await athlete.decrementSession();
          attendee.sessionDeducted = true;
        } else {
          // Aylık için sadece sayacı artır
          athlete.totalSessionsUsed += 1;
          await athlete.save();
          attendee.sessionDeducted = true;
        }
      }
    }
  }
  
  await this.save();
};

// Indexler
sessionSchema.index({ date: -1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ 'attendees.athlete': 1 });

module.exports = mongoose.model('Session', sessionSchema);
