// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         NetGSM SMS Service
// ═══════════════════════════════════════════════════════════════════════════════

const https = require('https');
const config = require('../config/config');
const logger = require('./logger');

class SMSService {
  constructor() {
    this.enabled = config.NETGSM.enabled;
    this.usercode = config.NETGSM.usercode;
    this.password = config.NETGSM.password;
    this.msgheader = config.NETGSM.msgheader;
    this.apiUrl = config.NETGSM.apiUrl;
  }

  /**
   * SMS gönder
   * @param {string} phone - Telefon numarası (5xxxxxxxxx formatında)
   * @param {string} message - SMS içeriği
   * @returns {Promise<{success: boolean, message: string, code?: string}>}
   */
  async send(phone, message) {
    // SMS devre dışıysa
    if (!this.enabled) {
      logger.logSMS(phone, false, 'SMS servisi devre dışı');
      return {
        success: false,
        message: 'SMS servisi devre dışı',
        code: 'DISABLED'
      };
    }

    // Yapılandırma eksikse
    if (!this.usercode || !this.password || !this.msgheader) {
      logger.logSMS(phone, false, 'SMS yapılandırması eksik');
      return {
        success: false,
        message: 'SMS yapılandırması eksik',
        code: 'CONFIG_ERROR'
      };
    }

    // Telefon numarasını formatla
    const formattedPhone = this.formatPhone(phone);
    if (!formattedPhone) {
      logger.logSMS(phone, false, 'Geçersiz telefon numarası');
      return {
        success: false,
        message: 'Geçersiz telefon numarası',
        code: 'INVALID_PHONE'
      };
    }

    try {
      const result = await this.sendRequest(formattedPhone, message);
      logger.logSMS(formattedPhone, result.success, result.message);
      return result;
    } catch (error) {
      logger.logSMS(formattedPhone, false, error.message);
      return {
        success: false,
        message: 'SMS gönderimi başarısız: ' + error.message,
        code: 'SEND_ERROR'
      };
    }
  }

  /**
   * NetGSM API'ye istek gönder
   */
  sendRequest(phone, message) {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        usercode: this.usercode,
        password: this.password,
        gsmno: phone,
        message: message,
        msgheader: this.msgheader,
        dil: 'TR'
      });

      const url = `${this.apiUrl}?${params.toString()}`;

      https.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          const result = this.parseResponse(data.trim());
          resolve(result);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * NetGSM yanıtını parse et
   */
  parseResponse(response) {
    // NetGSM başarılı yanıtlar
    if (response.startsWith('00') || response.startsWith('01') || response.startsWith('02')) {
      return {
        success: true,
        message: 'SMS başarıyla gönderildi',
        code: response.split(' ')[0]
      };
    }

    // Hata kodları
    const errorCodes = {
      '20': 'Mesaj metni boş',
      '30': 'Kullanıcı adı/şifre hatalı',
      '40': 'Mesaj başlığı tanımlı değil',
      '50': 'Abone hesabınız aktif değil',
      '51': 'Abone hesabınız aktif değil',
      '60': 'Gönderilecek numara geçerli değil',
      '70': 'Parametre hatası',
      '80': 'Sorgulama limit aşımı',
      '85': 'Mükerrer gönderim'
    };

    const code = response.split(' ')[0];
    const errorMessage = errorCodes[code] || `Bilinmeyen hata: ${response}`;

    return {
      success: false,
      message: errorMessage,
      code: code
    };
  }

  /**
   * Telefon numarasını formatla
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
      return '90' + cleaned;
    }

    return null;
  }

  /**
   * Ödeme hatırlatma SMS'i gönder
   */
  async sendPaymentReminder(phone, athleteName, amount, dueDate) {
    const message = `Sayın Veli, ${athleteName} için ${amount}₺ tutarındaki ödemenizin vadesi ${dueDate} tarihinde dolmaktadır. Kırıkkale Olimpiyat Spor Kulübü`;
    return this.send(phone, message);
  }

  /**
   * Ödeme onay SMS'i gönder
   */
  async sendPaymentConfirmation(phone, athleteName, amount) {
    const message = `Sayın Veli, ${athleteName} için ${amount}₺ tutarındaki ödemeniz alınmıştır. Teşekkür ederiz. Kırıkkale Olimpiyat Spor Kulübü`;
    return this.send(phone, message);
  }

  /**
   * Paket bitmek üzere SMS'i gönder
   */
  async sendSessionWarning(phone, athleteName, remainingSessions) {
    const message = `Sayın Veli, ${athleteName}'in ${remainingSessions} seans hakkı kalmıştır. Paket yenilemek için kulübümüzle iletişime geçiniz. Kırıkkale Olimpiyat Spor Kulübü`;
    return this.send(phone, message);
  }

  /**
   * Yeni kayıt onay SMS'i gönder
   */
  async sendRegistrationConfirmation(phone, athleteName) {
    const message = `Sayın Veli, ${athleteName}'in kayıt başvurusu alınmıştır. En kısa sürede sizinle iletişime geçilecektir. Kırıkkale Olimpiyat Spor Kulübü`;
    return this.send(phone, message);
  }

  /**
   * Özel mesaj gönder
   */
  async sendCustomMessage(phone, message) {
    return this.send(phone, message);
  }

  /**
   * Toplu SMS gönder
   */
  async sendBulk(phones, message) {
    const results = [];
    
    for (const phone of phones) {
      const result = await this.send(phone, message);
      results.push({ phone, ...result });
      
      // Rate limiting - 100ms bekle
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      total: phones.length,
      successful,
      failed,
      results
    };
  }
}

// Singleton instance
const smsService = new SMSService();

module.exports = smsService;
