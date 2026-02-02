// ═══════════════════════════════════════════════════════════════════════════════
//        Bugün yanlışlıkla mesaj gönderilen 11 veliye özür SMS'i gönder
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');

const SMSLog = require('../models/SMSLog');
const smsService = require('../services/smsService');

async function sendApologySMS() {
  try {
    console.log('🔄 MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(config.MONGODB_URI, config.MONGODB_OPTIONS);
    console.log('✅ MongoDB bağlantısı başarılı\n');

    // Bugün mesaj giden telefon numaraları
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySMS = await SMSLog.find({
      createdAt: { $gte: today },
      success: true,
      type: { $in: ['monthly_reminder', 'monthly_expired', 'session_warning', 'session_expired'] }
    });

    // Benzersiz telefon numaralarını al
    const phoneNumbers = [...new Set(todaySMS.map(sms => sms.phone))];

    console.log(`📱 Özür mesajı gönderilecek numara sayısı: ${phoneNumbers.length}`);
    phoneNumbers.forEach((p, i) => console.log(`   ${i+1}. ${p}`));

    const apologyMessage = "Sevgili velimiz, Olimpiyat Yuzme Kulubu olarak dijitallestirme calismalari kapsaminda bazi testler yapiyoruz. Tarafiniza gonderilen sms'i lutfen ciddiye almayiniz. Tesekkur eder iyi gunler dileriz.";

    console.log('\n📤 Özür mesajları gönderiliyor...\n');
    
    let sentCount = 0;
    let failedCount = 0;

    for (const phone of phoneNumbers) {
      try {
        console.log(`   Gönderiliyor: ${phone}...`);
        
        const result = await smsService.send(phone, apologyMessage, 'custom');
        
        if (result.success) {
          console.log(`   ✅ Başarılı`);
          sentCount++;
        } else {
          console.log(`   ❌ Başarısız: ${result.message}`);
          failedCount++;
        }
        
        // API rate limit için bekle
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.log(`   ❌ Hata: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    ÖZÜR SMS SONUCU                           ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Toplam numara:                     ${phoneNumbers.length.toString().padEnd(26)}║`);
    console.log(`║  Başarılı:                          ${sentCount.toString().padEnd(26)}║`);
    console.log(`║  Başarısız:                         ${failedCount.toString().padEnd(26)}║`);
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

sendApologySMS();
