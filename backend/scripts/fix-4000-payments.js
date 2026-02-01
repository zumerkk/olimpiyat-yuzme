// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//           4000₺ Yanlış Girişleri Sil - Tüm Fiyatlar 5000₺ Olmalı
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');

const Payment = require('../models/Payment');
const Athlete = require('../models/Athlete');

async function fix4000Payments() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. amount=4000 olan ödeme kayıtlarını bul ve sil
    // ═══════════════════════════════════════════════════════════════════════════
    const wrongPayments = await Payment.find({ amount: 4000 }).populate('athlete', 'firstName lastName');
    
    if (wrongPayments.length > 0) {
      console.log(`📋 4000₺ olan ${wrongPayments.length} ödeme kaydı bulundu:`);
      wrongPayments.forEach(p => {
        const name = p.athlete ? `${p.athlete.firstName} ${p.athlete.lastName}` : 'Bilinmeyen';
        console.log(`   - ${name}: ${p.paymentType} - ${p.amount}₺`);
      });
      
      const deleteResult = await Payment.deleteMany({ amount: 4000 });
      console.log(`\n✅ ${deleteResult.deletedCount} yanlış ödeme kaydı silindi\n`);
    } else {
      console.log('📋 amount=4000 olan ödeme kaydı bulunamadı.\n');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. partialPayments içinde 4000 olan kayıtları temizle veya güncelle
    // (4000 kısmi ödeme yapılmışsa - ana amount 5000 olsa bile)
    // ═══════════════════════════════════════════════════════════════════════════
    const paymentsWith4000Partial = await Payment.find({
      'partialPayments.amount': 4000
    });
    
    if (paymentsWith4000Partial.length > 0) {
      console.log(`📋 partialPayments içinde 4000₺ olan ${paymentsWith4000Partial.length} kayıt bulundu`);
      for (const payment of paymentsWith4000Partial) {
        payment.partialPayments = payment.partialPayments.filter(p => p.amount !== 4000);
        payment.paidAmount = payment.partialPayments.reduce((sum, p) => sum + p.amount, 0);
        await payment.save();
      }
      console.log(`   ✅ Temizlendi\n`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. Athlete'larda monthlyFee veya packageFee 4000 olanları 5000 yap
    // ═══════════════════════════════════════════════════════════════════════════
    const athleteUpdateResult = await Athlete.updateMany(
      { $or: [{ monthlyFee: 4000 }, { packageFee: 4000 }] },
      { $set: { monthlyFee: 5000, packageFee: 5000 } }
    );
    
    if (athleteUpdateResult.modifiedCount > 0) {
      console.log(`👥 ${athleteUpdateResult.modifiedCount} sporcu kaydında ücret 5000₺ olarak güncellendi\n`);
    }

    // Özet
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    İŞLEM TAMAMLANDI                          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Silinen 4000₺ ödemeler:     ${(wrongPayments.length || 0).toString().padEnd(30)}║`);
    console.log(`║  Güncellenen sporcular:      ${(athleteUpdateResult.modifiedCount || 0).toString().padEnd(30)}║`);
    console.log('║  Tüm fiyatlar artık 5000₺                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB bağlantısı kapatıldı');
    process.exit(0);
  }
}

fix4000Payments();
