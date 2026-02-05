// Mehmet Efe Perk seans düzeltme scripti
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const Athlete = require('../models/Athlete');

async function fixAthleteSessions() {
  try {
    console.log('MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS);
    console.log('MongoDB bağlantısı başarılı\n');

    // Mehmet Efe Perk'i bul
    const athlete = await Athlete.findOne({ 
      firstName: { $regex: /mehmet/i },
      lastName: { $regex: /perk/i }
    });

    if (!athlete) {
      console.log('Sporcu bulunamadı!');
      return;
    }

    console.log('Sporcu bulundu:');
    console.log('  Ad:', athlete.firstName, athlete.lastName);
    console.log('  TC:', athlete.tcNo);
    console.log('  Üyelik Tipi:', athlete.membershipType);
    console.log('  Mevcut Seans:', athlete.remainingSessions);
    console.log('  Paket Yenileme:', athlete.packageRenewCount);
    console.log('');

    if (athlete.remainingSessions !== 8 && athlete.membershipType === '8 Seanslık') {
      console.log('Seanslar düzeltiliyor: ' + athlete.remainingSessions + ' -> 8');
      athlete.remainingSessions = 8;
      await athlete.save();
      console.log('✅ Düzeltildi!');
    } else {
      console.log('Düzeltme gerekmiyor.');
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB bağlantısı kapatıldı');
  }
}

fixAthleteSessions();
