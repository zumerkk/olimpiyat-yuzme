// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Public Registration Page
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { User, Phone, Mail, Calendar, MapPin, Heart, Users, Send, CheckCircle, Waves } from 'lucide-react'

export default function PublicRegistration() {
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') || 'link'
  
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formConfig, setFormConfig] = useState(null)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    tcNo: '',
    birthDate: '',
    gender: 'Erkek',
    phone: '',
    email: '',
    address: '',
    preferredLevel: 'Başlangıç',
    preferredAgeGroup: '',
    preferredDays: [],
    guardian: { name: '', phone: '', relation: '' },
    healthInfo: { bloodType: '', allergies: '', canSwim: false }
  })

  useEffect(() => {
    fetchFormConfig()
  }, [])

  const fetchFormConfig = async () => {
    try {
      const response = await axios.get('/api/registration/form-data')
      setFormConfig(response.data.data)
    } catch (error) {
      console.error('Form config error:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await axios.post(`/api/registration/submit?source=${source}`, formData)
      setSubmitted(true)
      toast.success('Başvurunuz alındı!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (day) => {
    const days = formData.preferredDays
    const newDays = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day]
    setFormData({ ...formData, preferredDays: newDays })
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Başvurunuz Alındı!</h2>
          <p className="text-gray-600 mb-6">
            Kayıt başvurunuz başarıyla iletildi. En kısa sürede sizinle iletişime geçeceğiz.
          </p>
          <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Kırıkkale Olimpiyat Spor Kulübü</p>
        </motion.div>
        <Toaster position="top-center" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 py-8 px-4">
      <Toaster position="top-center" />
      
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Kırıkkale Olimpiyat Spor Kulübü
          </h1>
          <p className="text-primary-100">Yüzme Branşı Online Kayıt Formu</p>
          {source === 'qr' && (
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm text-white">
              QR Kod ile Kayıt
            </span>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            {/* Personal Info */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <User className="w-5 h-5 text-primary-600" />
                Kişisel Bilgiler
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Ad *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Soyad *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">TC Kimlik No *</label>
                  <input
                    type="text"
                    value={formData.tcNo}
                    onChange={(e) => setFormData({ ...formData, tcNo: e.target.value })}
                    className="input"
                    maxLength={11}
                    required
                  />
                </div>
                <div>
                  <label className="label">Doğum Tarihi *</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Cinsiyet *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="select"
                    required
                  >
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Phone className="w-5 h-5 text-primary-600" />
                İletişim Bilgileri
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Telefon *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="05XX XXX XXXX"
                    required
                  />
                </div>
                <div>
                  <label className="label">E-posta *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Adres</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Guardian Info */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Users className="w-5 h-5 text-primary-600" />
                Veli Bilgileri (18 yaş altı için)
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Veli Adı</label>
                  <input
                    type="text"
                    value={formData.guardian.name}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, name: e.target.value } 
                    })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Veli Telefon</label>
                  <input
                    type="tel"
                    value={formData.guardian.phone}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, phone: e.target.value } 
                    })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Yakınlık</label>
                  <select
                    value={formData.guardian.relation}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      guardian: { ...formData.guardian, relation: e.target.value } 
                    })}
                    className="select"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Anne">Anne</option>
                    <option value="Baba">Baba</option>
                    <option value="Vasi">Vasi</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Swimming Preferences */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Waves className="w-5 h-5 text-primary-600" />
                Yüzme Tercihleri
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Tercih Edilen Seviye</label>
                  <select
                    value={formData.preferredLevel}
                    onChange={(e) => setFormData({ ...formData, preferredLevel: e.target.value })}
                    className="select"
                  >
                    {formConfig?.levels?.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Yaş Grubu</label>
                  <select
                    value={formData.preferredAgeGroup}
                    onChange={(e) => setFormData({ ...formData, preferredAgeGroup: e.target.value })}
                    className="select"
                  >
                    <option value="">Seçiniz</option>
                    {formConfig?.ageGroups?.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Uygun Günler</label>
                <div className="flex flex-wrap gap-2">
                  {formConfig?.days?.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.preferredDays.includes(day)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Health Info */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Heart className="w-5 h-5 text-primary-600" />
                Sağlık Bilgileri
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Kan Grubu</label>
                  <select
                    value={formData.healthInfo.bloodType}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      healthInfo: { ...formData.healthInfo, bloodType: e.target.value } 
                    })}
                    className="select"
                  >
                    <option value="">Seçiniz</option>
                    {['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'].map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <input
                    type="checkbox"
                    id="canSwim"
                    checked={formData.healthInfo.canSwim}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      healthInfo: { ...formData.healthInfo, canSwim: e.target.checked } 
                    })}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="canSwim" className="text-gray-700">Yüzme biliyor</label>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Alerji / Sağlık Durumu</label>
                  <textarea
                    value={formData.healthInfo.allergies}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      healthInfo: { ...formData.healthInfo, allergies: e.target.value } 
                    })}
                    className="input"
                    rows={2}
                    placeholder="Varsa alerji veya dikkat edilmesi gereken sağlık durumu..."
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner w-5 h-5 border-white/30 border-t-white"></div>
                    Gönderiliyor...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    Başvuruyu Gönder
                  </span>
                )}
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">
                Başvurunuz incelendikten sonra sizinle iletişime geçilecektir.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-sm mt-8">
          © 2024 Kırıkkale Olimpiyat Spor Kulübü - Yüzme Branşı
        </p>
      </motion.div>
    </div>
  )
}

