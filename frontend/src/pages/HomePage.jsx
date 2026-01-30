// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Ana Sayfa - Public Homepage
// ═══════════════════════════════════════════════════════════════════════════════

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Waves, Users, Award, Clock, MapPin, Phone, Mail, ChevronRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: Math.random() * 150 + 50,
              height: Math.random() * 150 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 3,
            }}
          />
        ))}
        
        {/* Water waves at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 200" className="w-full">
            <motion.path
              fill="rgba(255,255,255,0.1)"
              animate={{
                d: [
                  "M0,100 C360,150 720,50 1080,100 C1260,125 1380,75 1440,100 L1440,200 L0,200 Z",
                  "M0,100 C360,50 720,150 1080,100 C1260,75 1380,125 1440,100 L1440,200 L0,200 Z",
                  "M0,100 C360,150 720,50 1080,100 C1260,125 1380,75 1440,100 L1440,200 L0,200 Z"
                ]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <header className="container mx-auto px-4 py-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-12 h-12" />
              <span className="text-white font-bold text-lg hidden sm:block">Olimpiyat Yüzme</span>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                to="/kayit" 
                className="px-4 py-2 text-white/90 hover:text-white transition-colors"
              >
                Online Kayıt
              </Link>
              <Link 
                to="/giris" 
                className="px-5 py-2.5 bg-white text-primary-700 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg"
              >
                Yönetim Paneli
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Content */}
        <main className="container mx-auto px-4 py-12 lg:py-20">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <img 
                src="/logo.png" 
                alt="Kırıkkale Olimpiyat Spor Kulübü" 
                className="w-32 h-32 mx-auto mb-6"
              />
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
                Kırıkkale Olimpiyat
                <span className="block text-primary-200">Spor Kulübü</span>
              </h1>
              
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Profesyonel eğitmenler eşliğinde, her yaş grubuna uygun yüzme eğitimi. 
                Çocuğunuzun suda güvenle yüzmesini sağlıyoruz.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  to="/kayit" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <Waves className="w-6 h-6" />
                  Hemen Kayıt Ol
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <a 
                  href="tel:+905303331182" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur text-white rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all border border-white/20"
                >
                  <Phone className="w-5 h-5" />
                  Bizi Arayın
                </a>
              </div>
            </motion.div>
          </div>

          {/* Features */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Uzman Eğitmenler</h3>
              <p className="text-white/70">
                Deneyimli ve sertifikalı yüzme eğitmenleri ile güvenli öğrenme ortamı.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Award className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Her Seviyeye Uygun</h3>
              <p className="text-white/70">
                Başlangıç seviyesinden ileri seviyeye kadar tüm yaş gruplarına eğitim.
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Esnek Program</h3>
              <p className="text-white/70">
                Aylık üyelik veya 8 seanslık paket seçenekleri ile size uygun program.
              </p>
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-12 mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
            <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
              <div>
                <h4 className="text-white font-bold mb-3">İletişim</h4>
                <div className="space-y-2 text-white/70">
                  <a href="tel:+905303331182" className="flex items-center justify-center md:justify-start gap-2 hover:text-white transition-colors">
                    <Phone className="w-4 h-4" />
                    0530 333 11 82
                  </a>
                  <a href="mailto:info@olimpiyatyuzme.com" className="flex items-center justify-center md:justify-start gap-2 hover:text-white transition-colors">
                    <Mail className="w-4 h-4" />
                    info@olimpiyatyuzme.com
                  </a>
                </div>
              </div>
              
              <div>
                <h4 className="text-white font-bold mb-3">Adres</h4>
                <p className="text-white/70 flex items-start justify-center md:justify-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                  Kırıkkale, Türkiye
                </p>
              </div>
              
              <div>
                <h4 className="text-white font-bold mb-3">Hızlı Linkler</h4>
                <div className="space-y-2">
                  <Link to="/kayit" className="block text-white/70 hover:text-white transition-colors">
                    Online Kayıt
                  </Link>
                  <Link to="/giris" className="block text-white/70 hover:text-white transition-colors">
                    Yönetim Paneli
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/10 mt-8 pt-6 text-center">
              <p className="text-white/50 text-sm">
                © {new Date().getFullYear()} Kırıkkale Olimpiyat Spor Kulübü. Tüm hakları saklıdır.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
