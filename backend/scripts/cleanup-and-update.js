// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                    Veri Temizleme ve Güncelleme Scripti
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');

// Models
const Session = require('../models/Session');
const Payment = require('../models/Payment');
const Athlete = require('../models/Athlete');

// ═══════════════════════════════════════════════════════════════════════════════
// Main Cleanup Function
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanupAndUpdate() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. Tüm Seans Kayıtlarını Sil
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('📋 1. Seans kayıtları siliniyor...');
    const sessionResult = await Session.deleteMany({});
    console.log(`   ✅ ${sessionResult.deletedCount} seans kaydı silindi\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. Tüm Ödeme Kayıtlarını Sil
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('💰 2. Ödeme kayıtları siliniyor...');
    const paymentResult = await Payment.deleteMany({});
    console.log(`   ✅ ${paymentResult.deletedCount} ödeme kaydı silindi\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. Tüm Öğrencileri Güncelle
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('👥 3. Öğrenci kayıtları güncelleniyor...');
    
    const now = new Date();
    const currentDay = now.getDate();
    let nextPaymentDate;
    
    // Ayın 15'ini hesapla
    if (currentDay <= 15) {
      // Bu ayın 15'i henüz geçmediyse bu ayın 15'i
      nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      // Bu ayın 15'i geçtiyse gelecek ayın 15'i
      nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    }

    const athletes = await Athlete.find({});
    let updatedCount = 0;

    for (const athlete of athletes) {
      const updateData = {
        monthlyFee: 5000,
        packageFee: 5000,
        nextPaymentDate: nextPaymentDate,
        totalSessionsUsed: 0
      };

      // 8 Seanslık paket için remainingSessions'ı 8 yap
      if (athlete.membershipType === '8 Seanslık') {
        updateData.remainingSessions = 8;
      } else {
        // Aylık için null yap
        updateData.remainingSessions = null;
      }

      // Ödeme özetini sıfırla
      updateData.paymentSummary = {
        totalPaid: 0,
        totalDue: 0,
        lastPaymentDate: null
      };

      await Athlete.findByIdAndUpdate(athlete._id, updateData);
      updatedCount++;
    }

    console.log(`   ✅ ${updatedCount} öğrenci kaydı güncellendi`);
    console.log(`   📅 Ödeme tarihi: ${nextPaymentDate.toLocaleDateString('tr-TR')}`);
    console.log(`   💵 Aylık ücret: 5000₺`);
    console.log(`   💵 Paket ücreti: 5000₺\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // Özet
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    İŞLEM ÖZETİ                             ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Silinen Seans Kayıtları:     ${sessionResult.deletedCount.toString().padEnd(30)}║`);
    console.log(`║  Silinen Ödeme Kayıtları:     ${paymentResult.deletedCount.toString().padEnd(30)}║`);
    console.log(`║  Güncellenen Öğrenci Sayısı: ${updatedCount.toString().padEnd(30)}║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('✅ Tüm işlemler başarıyla tamamlandı!');
    
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

// Script'i çalıştır
cleanupAndUpdate();
