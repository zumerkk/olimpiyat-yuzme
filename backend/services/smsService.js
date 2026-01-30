// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                      BozkurtSMS Service v3.1
//                   www.bozkurtsms.com.tr API Entegrasyonu
//                   XML API - Network Haberleşme Altyapısı
// ═══════════════════════════════════════════════════════════════════════════════

const https = require('https');
const http = require('http');
const config = require('../config/config');
const logger = require('./logger');

class SMSService {
  constructor() {
    this.enabled = config.SMS.enabled;
    this.username = config.SMS.username;
    this.password = config.SMS.password;
    this.sender = config.SMS.sender; // Gönderici başlığı (onaylı olmalı!)
    this.apiUrl = config.SMS.apiUrl;
  }

  /**
   * SMS gönder
   * @param {string} phone - Telefon numarası (5xxxxxxxxx formatında)
   * @param {string} message - SMS içeriği
   * @param {string} type - SMS tipi (reminder, warning, confirmation, custom)
   * @returns {Promise<{success: boolean, message: string, code?: string}>}
   */
  async send(phone, message, type = 'custom') {
    // SMS devre dışıysa
    if (!this.enabled) {
      logger.logSMS(phone, false, 'SMS servisi devre dışı', type);
      return {
        success: false,
        message: 'SMS servisi devre dışı',
        code: 'DISABLED'
      };
    }

    // Yapılandırma eksikse
    if (!this.username || !this.password) {
      logger.logSMS(phone, false, 'SMS yapılandırması eksik', type);
      return {
        success: false,
        message: 'SMS yapılandırması eksik',
        code: 'CONFIG_ERROR'
      };
    }

    // Telefon numarasını formatla
    const formattedPhone = this.formatPhone(phone);
    if (!formattedPhone) {
      logger.logSMS(phone, false, 'Geçersiz telefon numarası', type);
      return {
        success: false,
        message: 'Geçersiz telefon numarası',
        code: 'INVALID_PHONE'
      };
    }

    try {
      const result = await this.sendXMLRequest(formattedPhone, message);
      logger.logSMS(formattedPhone, result.success, result.message, type);
      
      // SMS log kaydet
      await this.logSMSToDatabase({
        phone: formattedPhone,
        message,
        type,
        success: result.success,
        responseCode: result.code,
        responseMessage: result.message,
        messageId: result.islemNo
      });
      
      return result;
    } catch (error) {
      logger.logSMS(formattedPhone, false, error.message, type);
      return {
        success: false,
        message: 'SMS gönderimi başarısız: ' + error.message,
        code: 'SEND_ERROR'
      };
    }
  }

  /**
   * BozkurtSMS XML API'ye istek gönder
   * API Endpoint: https://www.bozkurtsms.com.tr/services/api.php?islem=sms
   * ÖNEMLİ: 
   * - XML etiketleri BÜYÜK HARF olmalı!
   * - BASLIK için ISO-8859-1 (API'de kayıtlı isimle eşleşmeli, Ç=0xC7)
   * - MESAJ için ASCII (SMS'te düzgün görünsün)
   */
  sendXMLRequest(phone, message) {
    return new Promise((resolve, reject) => {
      // Gönderim tarihi (şu an) - boş bırakılabilir
      const now = new Date();
      const gonderimTarih = now.toISOString().slice(0, 16).replace('T', ' ');

      // BASLIK için sadece Ç, Ö, Ü karakterlerini ISO-8859-1'e çevir (API tanısın)
      // Diğer Türkçe karakterler (ğ, ş, ı, İ) ASCII'ye
      const senderISO = this.convertSenderToISO88591(this.sender || '');
      // MESAJ için tüm Türkçe karakterleri ASCII'ye çevir (SMS'te düzgün görünsün)
      const messageASCII = this.convertTurkishToASCII(message);

      // XML Body oluştur - BÜYÜK HARF ETİKETLER, ISO-8859-1 encoding
      const xmlBody = `<?xml version="1.0" encoding="ISO-8859-1"?>
<BILGI>
<KULLANICI_ADI>${this.escapeXml(this.username)}</KULLANICI_ADI>
<SIFRE>${this.escapeXml(this.password)}</SIFRE>
<GONDERIM_TARIH>${gonderimTarih}</GONDERIM_TARIH>
<BASLIK>${this.escapeXml(senderISO)}</BASLIK>
</BILGI>
<ISLEM>
<YOLLA>
<MESAJ>${this.escapeXml(messageASCII)}</MESAJ>
<NO>${phone}</NO>
</YOLLA>
</ISLEM>`;

      // XML'i ISO-8859-1 olarak encode et
      const xmlBuffer = Buffer.from(xmlBody, 'latin1');

      // URL parse
      const url = new URL(this.apiUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=iso-8859-1',
          'Content-Length': xmlBuffer.length
        }
      };

      const req = httpModule.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          const result = this.parseXMLResponse(data.trim());
          resolve(result);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(xmlBuffer);
      req.end();
    });
  }

  /**
   * Gönderici adını ISO-8859-1'e çevir (API tanısın diye)
   * Sadece Ç, Ö, Ü için ISO-8859-1 byte kullan, diğerleri ASCII
   */
  convertSenderToISO88591(text) {
    if (!text) return '';
    
    const map = {
      'Ç': String.fromCharCode(0xC7),  // Ç
      'ç': String.fromCharCode(0xE7),  // ç
      'Ö': String.fromCharCode(0xD6),  // Ö
      'ö': String.fromCharCode(0xF6),  // ö
      'Ü': String.fromCharCode(0xDC),  // Ü
      'ü': String.fromCharCode(0xFC),  // ü
      // ISO-8859-1'de olmayan karakterler ASCII'ye
      'Ğ': 'G', 'ğ': 'g',
      'Ş': 'S', 'ş': 's',
      'ı': 'i', 'İ': 'I',
    };
    
    let result = text;
    for (const [from, to] of Object.entries(map)) {
      result = result.split(from).join(to);
    }
    return result;
  }

  /**
   * Türkçe karakterleri ISO-8859-9 (Turkish Latin-5) byte'larına çevir
   * BozkurtSMS API bu encoding'i destekliyor ve TÜM Türkçe karakterler mevcut!
   * 
   * ISO-8859-9 Türkçe karakter kodları:
   * Ç=0xC7, ç=0xE7, Ğ=0xD0, ğ=0xF0, I=0x49, ı=0xFD
   * İ=0xDD, Ö=0xD6, ö=0xF6, Ş=0xDE, ş=0xFE, Ü=0xDC, ü=0xFC
   */
  convertToISO88599(text) {
    if (!text) return '';
    
    // UTF-8 Türkçe karakterleri ISO-8859-9 byte'larına dönüştür
    const turkishMap = {
      'Ç': String.fromCharCode(0xC7),  // Ç
      'ç': String.fromCharCode(0xE7),  // ç
      'Ğ': String.fromCharCode(0xD0),  // Ğ
      'ğ': String.fromCharCode(0xF0),  // ğ
      'I': String.fromCharCode(0x49),  // I (normal)
      'ı': String.fromCharCode(0xFD),  // ı (noktalı i küçük)
      'İ': String.fromCharCode(0xDD),  // İ (noktalı I büyük)
      'Ö': String.fromCharCode(0xD6),  // Ö
      'ö': String.fromCharCode(0xF6),  // ö
      'Ş': String.fromCharCode(0xDE),  // Ş
      'ş': String.fromCharCode(0xFE),  // ş
      'Ü': String.fromCharCode(0xDC),  // Ü
      'ü': String.fromCharCode(0xFC),  // ü
    };

    let result = text;
    for (const [from, to] of Object.entries(turkishMap)) {
      result = result.split(from).join(to);
    }
    
    return result;
  }

  /**
   * Türkçe karakterleri ASCII karşılıklarına çevir (yedek metod)
   */
  convertTurkishToASCII(text) {
    if (!text) return '';
    
    const turkishMap = {
      'Ç': 'C', 'ç': 'c', 'Ğ': 'G', 'ğ': 'g',
      'I': 'I', 'ı': 'i', 'İ': 'I',
      'Ö': 'O', 'ö': 'o', 'Ş': 'S', 'ş': 's',
      'Ü': 'U', 'ü': 'u',
    };

    let result = text;
    for (const [from, to] of Object.entries(turkishMap)) {
      result = result.split(from).join(to);
    }
    
    return result;
  }

  /**
   * Eski fonksiyonlar (geriye uyumluluk için)
   */
  convertToLatin1(text) {
    return this.convertToISO88599(text);
  }
  
  convertToISO88591(text) {
    return this.convertToISO88599(text);
  }

  /**
   * Toplu SMS için XML request (birden fazla numara)
   * BASLIK için ISO-8859-1, MESAJ için ASCII
   */
  sendBulkXMLRequest(recipients, message) {
    return new Promise((resolve, reject) => {
      const now = new Date();
      const gonderimTarih = now.toISOString().slice(0, 16).replace('T', ' ');

      // BASLIK için ISO-8859-1, MESAJ için ASCII
      const senderISO = this.convertSenderToISO88591(this.sender || '');
      const messageASCII = this.convertTurkishToASCII(message);

      // YOLLA etiketlerini oluştur - BÜYÜK HARF
      let yollaXml = '';
      recipients.forEach((recipient, index) => {
        const phone = this.formatPhone(recipient.phone);
        if (phone) {
          // İlk mesajda mesaj yaz, sonrakilerde boş bırak (aynı mesaj)
          if (index === 0) {
            yollaXml += `<YOLLA>
<MESAJ>${this.escapeXml(messageASCII)}</MESAJ>
<NO>${phone}</NO>
</YOLLA>
`;
          } else {
            yollaXml += `<YOLLA>
<MESAJ></MESAJ>
<NO>${phone}</NO>
</YOLLA>
`;
          }
        }
      });

      const xmlBody = `<?xml version="1.0" encoding="ISO-8859-1"?>
<BILGI>
<KULLANICI_ADI>${this.escapeXml(this.username)}</KULLANICI_ADI>
<SIFRE>${this.escapeXml(this.password)}</SIFRE>
<GONDERIM_TARIH>${gonderimTarih}</GONDERIM_TARIH>
<BASLIK>${this.escapeXml(senderISO)}</BASLIK>
</BILGI>
<ISLEM>
${yollaXml}
</ISLEM>`;

      // XML'i ISO-8859-1 olarak encode et
      const xmlBuffer = Buffer.from(xmlBody, 'latin1');

      const url = new URL(this.apiUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=iso-8859-1',
          'Content-Length': xmlBuffer.length
        }
      };

      const req = httpModule.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          const result = this.parseXMLResponse(data.trim());
          resolve(result);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(xmlBuffer);
      req.end();
    });
  }

  /**
   * XML karakterlerini escape et
   */
  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * BozkurtSMS API yanıtını parse et
   * Dönüş Kodları:
   * - OK 1 Islem No: 1231231 = Başarılı
   * - OK 2 = Bakiye yetersiz
   * - OK 3 = Başlık onay bekliyor
   * - ERR 02 = Hatalı kullanıcı adı/şifre
   * - ERR 15 = Geçersiz site isteği
   * - ERR 10 = Tekrar eden sipariş
   */
  parseXMLResponse(response) {
    // Başarılı: "OK 1 Islem No: 1231231"
    if (response.startsWith('OK 1')) {
      const match = response.match(/Islem No:\s*(\d+)/i);
      return {
        success: true,
        message: 'SMS başarıyla gönderildi',
        code: 'OK',
        islemNo: match ? match[1] : null
      };
    }

    // Bakiye yetersiz
    if (response.startsWith('OK 2') || response.includes('Bakiye yetersiz')) {
      return {
        success: false,
        message: 'Bakiye yetersiz. Normal SMS kasasında kredi yok, onaylı başlık gerekiyor.',
        code: 'INSUFFICIENT_BALANCE'
      };
    }

    // Başlık onay bekliyor
    if (response.startsWith('OK 3') || response.includes('onay bekliyor')) {
      return {
        success: false,
        message: 'Gönderici başlığı onay bekliyor. BozkurtSMS panelinden başlığı onaylatın.',
        code: 'TITLE_PENDING'
      };
    }

    // Hatalı kullanıcı adı/şifre
    if (response.includes('ERR 02') || response.includes('Hatali')) {
      return {
        success: false,
        message: 'Hatalı kullanıcı adı veya şifre',
        code: 'AUTH_ERROR'
      };
    }

    // Geçersiz site isteği
    if (response.includes('ERR 15')) {
      return {
        success: false,
        message: 'Geçersiz site isteği',
        code: 'INVALID_REQUEST'
      };
    }

    // Tekrar eden sipariş
    if (response.includes('ERR 10')) {
      return {
        success: false,
        message: 'Tekrar eden sipariş',
        code: 'DUPLICATE'
      };
    }

    // Bakım çalışması
    if (response.includes('bakım') || response.includes('bakim')) {
      return {
        success: false,
        message: 'Sistem bakımda, lütfen daha sonra deneyin',
        code: 'MAINTENANCE'
      };
    }

    // Bilinmeyen hata
    return {
      success: false,
      message: `API Yanıtı: ${response}`,
      code: 'UNKNOWN'
    };
  }

  /**
   * Telefon numarasını formatla
   * Çıktı: 5XXXXXXXXX (başında 90 olmadan, 0 olmadan)
   */
  formatPhone(phone) {
    if (!phone) return null;

    // Sadece rakamları al
    let cleaned = phone.replace(/\D/g, '');

    // Türkiye kodu varsa kaldır
    if (cleaned.startsWith('90') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }

    // 10 haneli olmalı (5xxxxxxxxx)
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
      return cleaned; // API 5XXXXXXXXX formatını istiyor
    }

    return null;
  }

  /**
   * SMS'i veritabanına kaydet
   */
  async logSMSToDatabase(data) {
    try {
      const SMSLog = require('../models/SMSLog');
      await SMSLog.create(data);
    } catch (error) {
      logger.error('SMS log kayıt hatası', { error: error.message });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SMS SORGULAMA VE BAKİYE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * SMS durumunu sorgula
   * API: https://www.bozkurtsms.com.tr/services/api.php?islem=sms&islemno=XXXXX
   */
  async checkSMSStatus(islemNo) {
    return new Promise((resolve, reject) => {
      const url = `https://www.bozkurtsms.com.tr/services/api.php?islem=sms&islemno=${islemNo}`;
      
      https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          // Parse XML response
          const durumMatch = data.match(/<durum>(\d)<\/durum>/i);
          const basariliMatch = data.match(/<basarili_sayisi>(\d+)<\/basarili_sayisi>/i);
          const basarisizMatch = data.match(/<basarisizlar>(.*?)<\/basarisizlar>/i);
          
          const durumLabels = { '1': 'Tamamlandı', '2': 'Beklemede', '3': 'İptal' };
          
          resolve({
            success: true,
            data: {
              durum: durumMatch ? durumLabels[durumMatch[1]] || durumMatch[1] : 'Bilinmiyor',
              basariliSayisi: basariliMatch ? parseInt(basariliMatch[1]) : 0,
              basarisizlar: basarisizMatch ? basarisizMatch[1].split(',').filter(n => n) : []
            }
          });
        });
      }).on('error', reject);
    });
  }

  /**
   * Kalan bakiyeyi kontrol et
   * API: https://www.bozkurtsms.com.tr/services/api.php?islem=smskalan&bayikodu=xxx&sifre=xxx
   */
  async checkBalance() {
    return new Promise((resolve, reject) => {
      const url = `https://www.bozkurtsms.com.tr/services/api.php?islem=smskalan&bayikodu=${encodeURIComponent(this.username)}&sifre=${encodeURIComponent(this.password)}`;
      
      https.get(url, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          // Yanıt: "Sms Normal Kasa:  - Orginator Kasa: 9990"
          const normalMatch = data.match(/Normal Kasa:\s*(\d*)/i);
          const originatorMatch = data.match(/Orginator Kasa:\s*(\d+)/i);
          
          resolve({
            success: true,
            normalKasa: normalMatch ? (parseInt(normalMatch[1]) || 0) : 0,
            originatorKasa: originatorMatch ? parseInt(originatorMatch[1]) : 0,
            balance: originatorMatch ? parseInt(originatorMatch[1]) : 0,
            message: data.trim()
          });
        });
      }).on('error', reject);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ÖZEL SMS MESAJLARI
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Aylık ödeme hatırlatma SMS'i (1 gün önce)
   */
  async sendMonthlyPaymentReminder(phone, athleteName, amount, dueDate) {
    const message = `Sayin Veli, ${athleteName} icin ${amount}TL tutarindaki aylik odemenizin son gunu ${dueDate} tarihidir. Kirikkale Olimpiyat Spor Kulubu`;
    return this.send(phone, message, 'monthly_reminder');
  }

  /**
   * Aylık ödeme süresi doldu SMS'i
   */
  async sendMonthlyPaymentExpired(phone, athleteName, amount) {
    const message = `Sayin Veli, ${athleteName} icin ${amount}TL tutarindaki aylik odemeniz dolmustur. Kaydimizin devami icin 3 gun icinde odemenizi yapmanizi rica ederiz. Kirikkale Olimpiyat Spor Kulubu`;
    return this.send(phone, message, 'monthly_expired');
  }

  /**
   * Seans hakkı azalıyor SMS'i (1 seans kala)
   */
  async sendSessionWarning(phone, athleteName, remainingSessions) {
    const message = `Sayin Veli, ${athleteName}'in ${remainingSessions} seans hakki kalmistir. Devami icin yeni paket almanizi oneririz. Kirikkale Olimpiyat Spor Kulubu`;
    return this.send(phone, message, 'session_warning');
  }

  /**
   * Seans hakkı doldu SMS'i
   */
  async sendSessionExpired(phone, athleteName, tcNo) {
    const message = `Sayin Veli, ${tcNo} TC numarali ${athleteName} ogrencimizin seans hakki dolmustur. Devami icin odeme yapmanizi rica ederiz. Kirikkale Olimpiyat Spor Kulubu`;
    return this.send(phone, message, 'session_expired');
  }

  /**
   * Ödeme onay SMS'i
   */
  async sendPaymentConfirmation(phone, athleteName, amount) {
    const message = `Sayin Veli, ${athleteName} icin ${amount}TL tutarindaki odemeniz alinmistir. Tesekkur ederiz. Kirikkale Olimpiyat Spor Kulubu`;
    return this.send(phone, message, 'payment_confirmation');
  }

  /**
   * Yeni kayıt onay SMS'i
   */
  async sendRegistrationConfirmation(phone, athleteName) {
    const message = `Sayin Veli, ${athleteName}'in kayit basvurusu alinmistir. En kisa surede sizinle iletisime gecilecektir. Kirikkale Olimpiyat Spor Kulubu`;
    return this.send(phone, message, 'registration');
  }

  /**
   * Özel mesaj gönder
   */
  async sendCustomMessage(phone, message) {
    return this.send(phone, message, 'custom');
  }

  /**
   * Toplu SMS gönder
   */
  async sendBulk(recipients, message, useTemplate = false) {
    const results = [];
    
    // Şablon kullanılıyorsa her birine ayrı mesaj gönder
    if (useTemplate) {
      for (const recipient of recipients) {
        let finalMessage = message
          .replace(/{ad}/g, recipient.athleteName || '')
          .replace(/{isim}/g, recipient.athleteName || '')
          .replace(/{tc}/g, recipient.tcNo || '')
          .replace(/{sporcu}/g, recipient.athleteName || '');
        
        const result = await this.send(recipient.phone, finalMessage, 'bulk');
        results.push({ 
          phone: recipient.phone, 
          athleteId: recipient.athleteId,
          athleteName: recipient.athleteName,
          ...result 
        });
      
      // Rate limiting - 100ms bekle
      await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      // Aynı mesaj - toplu XML request kullan
      try {
        const validRecipients = recipients.filter(r => this.formatPhone(r.phone));
        
        if (validRecipients.length === 0) {
          return { total: 0, successful: 0, failed: 0, results: [] };
        }

        const apiResult = await this.sendBulkXMLRequest(validRecipients, message);
        
        for (const recipient of validRecipients) {
          const logResult = {
            phone: recipient.phone,
            athleteId: recipient.athleteId,
            athleteName: recipient.athleteName,
            success: apiResult.success,
            message: apiResult.message,
            code: apiResult.code
          };
          results.push(logResult);
          
          await this.logSMSToDatabase({
            phone: this.formatPhone(recipient.phone),
            message,
            type: 'bulk',
            success: apiResult.success,
            responseCode: apiResult.code,
            responseMessage: apiResult.message,
            messageId: apiResult.islemNo,
            athlete: recipient.athleteId
          });
        }
      } catch (error) {
        for (const recipient of recipients) {
          results.push({
            phone: recipient.phone,
            athleteId: recipient.athleteId,
            success: false,
            message: error.message,
            code: 'ERROR'
          });
        }
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      total: recipients.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Belirli bir gruba toplu SMS gönder
   */
  async sendToGroup(groupType, message, useTemplate = false) {
    const Athlete = require('../models/Athlete');
    
    let filter = {};
    
    switch (groupType) {
      case 'all':
        filter = {};
        break;
      case 'monthly':
        filter = { membershipType: 'Aylık', status: 'Aktif' };
        break;
      case 'session':
        filter = { membershipType: '8 Seanslık', status: 'Aktif' };
        break;
      case 'active':
        filter = { status: 'Aktif' };
        break;
      case 'passive':
        filter = { status: 'Pasif' };
        break;
      case 'lowSession':
        filter = { membershipType: '8 Seanslık', remainingSessions: { $lte: 2 }, status: 'Aktif' };
        break;
      default:
        filter = { status: 'Aktif' };
    }

    const athletes = await Athlete.find(filter).select('firstName lastName phone guardian tcNo');
    
    const recipients = athletes
      .map(a => ({
        phone: a.phone || a.guardian?.phone,
        athleteId: a._id,
        athleteName: `${a.firstName} ${a.lastName}`,
        tcNo: a.tcNo
      }))
      .filter(r => r.phone);

    return this.sendBulk(recipients, message, useTemplate);
  }

  /**
   * SMS istatistiklerini al
   */
  async getStats(startDate, endDate) {
    try {
      const SMSLog = require('../models/SMSLog');
      
      const filter = {};
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const total = await SMSLog.countDocuments(filter);
      const successful = await SMSLog.countDocuments({ ...filter, success: true });
      const failed = await SMSLog.countDocuments({ ...filter, success: false });

      const byType = await SMSLog.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      return {
        success: true,
        data: {
          total,
          successful,
          failed,
          successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
          byType: byType.reduce((acc, item) => {
            acc[item._id || 'unknown'] = item.count;
            return acc;
          }, {})
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// Singleton instance
const smsService = new SMSService();

module.exports = smsService;
