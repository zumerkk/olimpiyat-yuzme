// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//        1 Şubat 2026 - Yanlışlıkla mesaj gönderilen velilere özür SMS'i gönder
//        + Tüm ödemeleri 15 Şubat'a ayarla
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');

const SMSLog = require('../models/SMSLog');
const Payment = require('../models/Payment');
const Athlete = require('../models/Athlete');
const smsService = require('../services/smsService');

async function fixPaymentsAndSendApology() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. BUGÜN MESAJ GİDEN KİŞİLERİ BUL
    // ═══════════════════════════════════════════════════════════════════════════
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySMS = await SMSLog.find({
      createdAt: { $gte: today },
      success: true,
      type: { $in: ['monthly_reminder', 'monthly_expired', 'session_warning', 'session_expired'] }
    }).populate('athlete', 'firstName lastName phone guardian');

    console.log(`📋 Bugün otomatik mesaj gönderilen kişi sayısı: ${todaySMS.length}`);

    // Telefon numaralarını ve isimleri topla (unique)
    const recipientMap = new Map();
    for (const sms of todaySMS) {
      if (!recipientMap.has(sms.phone)) {
        const athleteName = sms.athlete 
          ? `${sms.athlete.firstName} ${sms.athlete.lastName}` 
          : 'Bilinmeyen';
        recipientMap.set(sms.phone, {
          phone: sms.phone,
          athleteName,
          smsType: sms.type
        });
      }
    }

    console.log(`📱 Özür mesajı gönderilecek benzersiz numara sayısı: ${recipientMap.size}`);

    // Listeyi göster
    console.log('\n📝 Bugün mesaj giden kişiler:');
    let index = 1;
    for (const [phone, data] of recipientMap) {
      console.log(`   ${index}. ${data.athleteName} - ${phone} (${data.smsType})`);
      index++;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. ÖZÜR MESAJI GÖNDER
    // ═══════════════════════════════════════════════════════════════════════════
    const apologyMessage = "Sevgili velimiz, Olimpiyat Yuzme Kulubu olarak dijitallestirme calismalari kapsaminda bazi testler yapiyoruz. Tarafiniza gonderilen sms'i lutfen ciddiye almayiniz. Tesekkur eder iyi gunler dileriz.";

    console.log('\n📤 Özür mesajları gönderiliyor...');
    
    let sentCount = 0;
    let failedCount = 0;

    for (const [phone, data] of recipientMap) {
      try {
        console.log(`   Gönderiliyor: ${phone} (${data.athleteName})...`);
        
        const result = await smsService.send(phone, apologyMessage, 'custom');
        
        if (result.success) {
          console.log(`   ✅ Başarılı`);
          sentCount++;
        } else {
          console.log(`   ❌ Başarısız: ${result.message}`);
          failedCount++;
        }
        
        // API rate limit için bekle
        await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        console.log(`   ❌ Hata: ${error.message}`);
        failedCount++;
      }
    }

    console.log(`\n📊 Özür mesajı sonucu: ${sentCount} başarılı, ${failedCount} başarısız`);

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. TÜM ÖDEMELERİ 15 ŞUBAT'A AYARLA
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n💰 Ödemeler 15 Şubat\'a ayarlanıyor...');

    const february15 = new Date(2026, 1, 15); // 15 Şubat 2026
    february15.setHours(23, 59, 59, 0);

    // Ödenmemiş aylık ödemelerin vadelerini güncelle
    const paymentUpdate = await Payment.updateMany(
      { 
        status: { $in: ['Beklemede', 'Kısmi Ödeme', 'Gecikmiş'] },
        paymentType: 'Aylık'
      },
      { 
        $set: { 
          dueDate: february15,
          'period.month': 2,
          'period.year': 2026,
          reminderSent: false,  // Hatırlatma bayrağını sıfırla
          status: 'Beklemede'   // Gecikmiş olanları da beklemede yap
        }
      }
    );

    console.log(`   ✅ ${paymentUpdate.modifiedCount} ödeme kaydı 15 Şubat'a güncellendi`);

    // Sporcu nextPaymentDate'lerini güncelle
    const athleteUpdate = await Athlete.updateMany(
      { status: 'Aktif', membershipType: 'Aylık' },
      { $set: { nextPaymentDate: february15 } }
    );

    console.log(`   ✅ ${athleteUpdate.modifiedCount} sporcu ödeme tarihi güncellendi`);

    // ═══════════════════════════════════════════════════════════════════════════
    // ÖZET
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    İŞLEM TAMAMLANDI                          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Bugün mesaj giden kişi sayısı:     ${todaySMS.length.toString().padEnd(26)}║`);
    console.log(`║  Özür mesajı gönderilen:            ${sentCount.toString().padEnd(26)}║`);
    console.log(`║  Başarısız:                         ${failedCount.toString().padEnd(26)}║`);
    console.log(`║  Güncellenen ödemeler:              ${paymentUpdate.modifiedCount.toString().padEnd(26)}║`);
    console.log(`║  Güncellenen sporcular:             ${athleteUpdate.modifiedCount.toString().padEnd(26)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  Yeni vade tarihi: 15 Şubat 2026                             ║');
    console.log('║  Hatırlatma: 14 Şubat\'ta gönderilecek                        ║');
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

fixPaymentsAndSendApology();
