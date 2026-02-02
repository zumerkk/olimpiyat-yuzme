// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Public Registration Page v3.0
//                    Enterprise-Grade with Offline Queue & Verification
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast, { Toaster } from 'react-hot-toast'
import { 
  User, Phone, Mail, Calendar, MapPin, Heart, Users, Send, 
  CheckCircle, Waves, AlertTriangle, WifiOff, RefreshCw, Loader2,
  Clock, CloudOff, CheckCircle2, XCircle
} from 'lucide-react'
import { publicApi, formatError, connectionManager, offlineQueue, SWIMMING_CONFIG } from '../utils/api'
import ConnectionStatus, { InlineConnectionStatus } from '../components/ConnectionStatus'
import ZmkAgencyBranding from '../components/ZmkAgencyBranding'

// ═══════════════════════════════════════════════════════════════════════════════
// Form Initial State
// ═══════════════════════════════════════════════════════════════════════════════

const initialFormData = {
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// Submission Status Types
// ═══════════════════════════════════════════════════════════════════════════════

const SUBMISSION_STATUS = {
  IDLE: 'idle',
  SENDING: 'sending',
  QUEUED: 'queued',
  SUCCESS: 'success',
  ERROR: 'error'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function PublicRegistration() {
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') || 'link'
  
  // State
  const [loading, setLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [submissionStatus, setSubmissionStatus] = useState(SUBMISSION_STATUS.IDLE)
  const [formConfig, setFormConfig] = useState(null)
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [connectionStatus, setConnectionStatus] = useState(connectionManager.getStatus())
  const [queuedSubmissionId, setQueuedSubmissionId] = useState(null)
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Connection Status Subscription
  // ─────────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const unsubscribe = connectionManager.subscribe(setConnectionStatus)
    return () => unsubscribe()
  }, [])

  // Queued submission'ı kontrol et
  useEffect(() => {
    if (queuedSubmissionId && connectionStatus.isBackendReady && connectionStatus.queueLength === 0) {
      // Queue işlendi, başarılı kabul et
      setSubmissionStatus(SUBMISSION_STATUS.SUCCESS)
      toast.success('Kuyruktaki başvurunuz başarıyla gönderildi!', { duration: 5000 })
    }
  }, [queuedSubmissionId, connectionStatus.isBackendReady, connectionStatus.queueLength])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Form Configuration Fetch
  // ─────────────────────────────────────────────────────────────────────────────
  
  const fetchFormConfig = useCallback(async () => {
    setConfigLoading(true)
    
    try {
      const response = await publicApi.get('/registration/form-data', {
        _skipWakeUp: false // Backend'i uyandır
      })
      
      if (response.data?.success && response.data?.data) {
        setFormConfig(response.data.data)
      } else {
        setFormConfig(null)
      }
    } catch (error) {
      console.error('Form config fetch error:', error)
      setFormConfig(null)
    } finally {
      setConfigLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchFormConfig()
  }, [fetchFormConfig])
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Effective Config (API veya Fallback)
  // ─────────────────────────────────────────────────────────────────────────────
  
  const effectiveConfig = {
    levels: formConfig?.levels || SWIMMING_CONFIG.SESSION_TYPES,
    ageGroups: formConfig?.ageGroups || SWIMMING_CONFIG.AGE_GROUPS,
    days: formConfig?.days || SWIMMING_CONFIG.DAYS
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Form Validation
  // ─────────────────────────────────────────────────────────────────────────────
  
  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad zorunludur'
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad zorunludur'
    }
    
    if (!formData.tcNo || formData.tcNo.length !== 11) {
      newErrors.tcNo = 'TC Kimlik No 11 haneli olmalıdır'
    } else if (!/^\d+$/.test(formData.tcNo)) {
      newErrors.tcNo = 'TC Kimlik No sadece rakam içermelidir'
    }
    
    if (!formData.birthDate) {
      newErrors.birthDate = 'Doğum tarihi zorunludur'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon zorunludur'
    } else if (!/^0?5\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta zorunludur'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Form Submission
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!validateForm()) {
      toast.error('Lütfen tüm zorunlu alanları doldurun')
      return
    }
    
    setLoading(true)
    setSubmissionStatus(SUBMISSION_STATUS.SENDING)
    
    // Loading toast with ID for later update
    const loadingToast = toast.loading(
      connectionStatus.wakeUpInProgress 
        ? 'Sunucu başlatılıyor, lütfen bekleyin...' 
        : 'Başvurunuz gönderiliyor...',
      { duration: 120000 }
    )
    
    try {
      const response = await publicApi.post(`/registration/submit?source=${source}`, formData)
      
      toast.dismiss(loadingToast)
      
      if (response.data?.success) {
        setSubmissionStatus(SUBMISSION_STATUS.SUCCESS)
        toast.success('Başvurunuz başarıyla alındı!', { duration: 5000 })
      } else {
        setSubmissionStatus(SUBMISSION_STATUS.ERROR)
        toast.error(response.data?.message || 'Beklenmeyen bir hata oluştu')
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      
      // Queued submission
      if (error.isQueued) {
        setSubmissionStatus(SUBMISSION_STATUS.QUEUED)
        setQueuedSubmissionId(error.queueId)
        toast.success(
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>{error.message}</span>
          </div>,
          { duration: 8000 }
        )
        return
      }
      
      setSubmissionStatus(SUBMISSION_STATUS.ERROR)
      const errorMessage = formatError(error)
      
      toast.error(errorMessage, { duration: 6000 })
      
      // Bağlantı hatası ise retry butonu göster
      if (!error.response) {
        toast((t) => (
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-red-500" />
            <span className="flex-1">Bağlantı hatası</span>
            <button
              onClick={() => {
                toast.dismiss(t.id)
                handleSubmit(e)
              }}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        ), { duration: 15000 })
      }
    } finally {
      setLoading(false)
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Day Toggle
  // ─────────────────────────────────────────────────────────────────────────────
  
  const toggleDay = (day) => {
    const days = formData.preferredDays
    const newDays = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day]
    setFormData({ ...formData, preferredDays: newDays })
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // Input Change Handler
  // ─────────────────────────────────────────────────────────────────────────────
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Success Screen
  // ═══════════════════════════════════════════════════════════════════════════════
  
  if (submissionStatus === SUBMISSION_STATUS.SUCCESS) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Başvurunuz Alındı!</h2>
          <p className="text-gray-600 mb-6">
            Kayıt başvurunuz başarıyla iletildi. En kısa sürede sizinle iletişime geçeceğiz.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Başvuran</p>
            <p className="font-semibold text-gray-900">{formData.firstName} {formData.lastName}</p>
          </div>
          
          <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Kırıkkale Olimpiyat Spor Kulübü</p>
          <div className="flex justify-center mt-4">
            <ZmkAgencyBranding variant="default" />
          </div>
        </motion.div>
        <Toaster position="top-center" />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Queued Screen
  // ═══════════════════════════════════════════════════════════════════════════════
  
  if (submissionStatus === SUBMISSION_STATUS.QUEUED) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6"
          >
            <Clock className="w-10 h-10 text-amber-600" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Başvurunuz Kuyruğa Alındı</h2>
          <p className="text-gray-600 mb-6">
            Sunucu şu anda ulaşılamıyor. Başvurunuz cihazınızda kayıtlı ve bağlantı sağlandığında otomatik olarak gönderilecek.
          </p>
          
          <div className="bg-amber-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <CloudOff className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-800">Bekleniyor</span>
            </div>
            <p className="text-sm text-amber-700">
              Bu sayfayı açık tutabilir veya kapatabilirsiniz. Bağlantı geldiğinde başvurunuz otomatik gönderilecektir.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Başvuran</p>
            <p className="font-semibold text-gray-900">{formData.firstName} {formData.lastName}</p>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {connectionStatus.isBackendReady ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Bağlantı sağlandı!</span>
              </>
            ) : connectionStatus.wakeUpInProgress ? (
              <>
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                <span className="text-amber-600">Sunucu başlatılıyor...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-500" />
                <span className="text-red-600">Bağlantı bekleniyor...</span>
              </>
            )}
          </div>
          
          <button
            onClick={() => connectionManager.wakeUpBackend()}
            disabled={connectionStatus.wakeUpInProgress}
            className="btn-primary w-full"
          >
            {connectionStatus.wakeUpInProgress ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Bağlanılıyor...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Bağlantıyı Kontrol Et
              </>
            )}
          </button>
          
          <img src="/logo.png" alt="Logo" className="w-20 h-20 mx-auto mt-6" />
          <div className="flex justify-center mt-4">
            <ZmkAgencyBranding variant="default" />
          </div>
        </motion.div>
        <Toaster position="top-center" />
      </div>
    )
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // Loading Screen
  // ═══════════════════════════════════════════════════════════════════════════════
  
  if (configLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="text-center">
          <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4 animate-pulse" />
          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
          <p className="text-white/80 mt-4">
            {connectionStatus.wakeUpInProgress 
              ? 'Sunucu başlatılıyor, lütfen bekleyin...' 
              : 'Form yükleniyor...'}
          </p>
          {connectionStatus.wakeUpInProgress && (
            <p className="text-white/60 text-sm mt-2">Bu işlem 30-60 saniye sürebilir</p>
          )}
        </div>
        <Toaster position="top-center" />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Main Form Render
  // ═══════════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 py-8 px-4">
      <Toaster position="top-center" />
      
      {/* Connection Status Alert */}
      <ConnectionStatus floating={true} />
      
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
          
          {/* Connection Status Banner (Form içinde) */}
          {(!connectionStatus.isOnline || !connectionStatus.isBackendReady) && (
            <div className={`p-4 ${!connectionStatus.isOnline ? 'bg-red-50' : 'bg-amber-50'}`}>
              <div className="flex items-center gap-3">
                {!connectionStatus.isOnline ? (
                  <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : connectionStatus.wakeUpInProgress ? (
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${!connectionStatus.isOnline ? 'text-red-800' : 'text-amber-800'}`}>
                    {!connectionStatus.isOnline 
                      ? 'İnternet bağlantısı yok' 
                      : connectionStatus.wakeUpInProgress
                        ? 'Sunucu başlatılıyor...'
                        : 'Sunucu bağlantısı kuruluyor...'}
                  </p>
                  <p className={`text-sm ${!connectionStatus.isOnline ? 'text-red-600' : 'text-amber-600'}`}>
                    {!connectionStatus.isOnline 
                      ? 'Formu doldurabilirsiniz, bağlantı geldiğinde gönderilecektir.' 
                      : 'Lütfen bekleyin, bu 30-60 saniye sürebilir.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            
            {/* ─────────────────────────────────────────────────────────────────────────────
                Personal Info
            ───────────────────────────────────────────────────────────────────────────── */}
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
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className={`input ${errors.firstName ? 'border-red-500 focus:ring-red-500' : ''}`}
                    required
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="label">Soyad *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className={`input ${errors.lastName ? 'border-red-500 focus:ring-red-500' : ''}`}
                    required
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
                  )}
                </div>
                <div>
                  <label className="label">TC Kimlik No *</label>
                  <input
                    type="text"
                    value={formData.tcNo}
                    onChange={(e) => handleChange('tcNo', e.target.value.replace(/\D/g, ''))}
                    className={`input ${errors.tcNo ? 'border-red-500 focus:ring-red-500' : ''}`}
                    maxLength={11}
                    placeholder="11 haneli TC kimlik numarası"
                    required
                  />
                  {errors.tcNo && (
                    <p className="text-red-500 text-xs mt-1">{errors.tcNo}</p>
                  )}
                </div>
                <div>
                  <label className="label">Doğum Tarihi *</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleChange('birthDate', e.target.value)}
                    className={`input ${errors.birthDate ? 'border-red-500 focus:ring-red-500' : ''}`}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                  {errors.birthDate && (
                    <p className="text-red-500 text-xs mt-1">{errors.birthDate}</p>
                  )}
                </div>
                <div>
                  <label className="label">Cinsiyet *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="select"
                    required
                  >
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────────────────
                Contact Info
            ───────────────────────────────────────────────────────────────────────────── */}
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
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className={`input ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="05XX XXX XXXX"
                    required
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="label">E-posta *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="ornek@email.com"
                    required
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Adres</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="input"
                    placeholder="Mahalle, sokak, bina no, daire no"
                  />
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────────────────
                Guardian Info
            ───────────────────────────────────────────────────────────────────────────── */}
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
                    placeholder="05XX XXX XXXX"
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
                    {SWIMMING_CONFIG.GUARDIAN_RELATIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────────────────
                Swimming Preferences
            ───────────────────────────────────────────────────────────────────────────── */}
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
                    onChange={(e) => handleChange('preferredLevel', e.target.value)}
                    className="select"
                  >
                    {effectiveConfig.levels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Yaş Grubu</label>
                  <select
                    value={formData.preferredAgeGroup}
                    onChange={(e) => handleChange('preferredAgeGroup', e.target.value)}
                    className="select"
                  >
                    <option value="">Seçiniz (Opsiyonel)</option>
                    {effectiveConfig.ageGroups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Uygun Günler</label>
                <div className="flex flex-wrap gap-2">
                  {effectiveConfig.days.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        formData.preferredDays.includes(day)
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────────────────
                Health Info
            ───────────────────────────────────────────────────────────────────────────── */}
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
                    {SWIMMING_CONFIG.BLOOD_TYPES.map(bt => (
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

            {/* ─────────────────────────────────────────────────────────────────────────────
                Submit Button
            ───────────────────────────────────────────────────────────────────────────── */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`
                  btn-primary w-full py-4 text-lg transition-all duration-200
                  ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg'}
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {connectionStatus.wakeUpInProgress ? 'Sunucu Başlatılıyor...' : 'Gönderiliyor...'}
                  </span>
                ) : !connectionStatus.isOnline ? (
                  <span className="flex items-center justify-center gap-2">
                    <CloudOff className="w-5 h-5" />
                    Kuyruğa Al ve Gönder
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    Başvuruyu Gönder
                  </span>
                )}
              </button>
              
              {/* Status indicator */}
              <div className="flex items-center justify-center mt-4">
                <InlineConnectionStatus />
              </div>
              
              {/* Queue info */}
              {connectionStatus.queueLength > 0 && (
                <div className="flex items-center justify-center gap-2 mt-2 text-amber-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{connectionStatus.queueLength} başvuru kuyrukta bekliyor</span>
                </div>
              )}
              
              <p className="text-center text-sm text-gray-500 mt-2">
                {!connectionStatus.isOnline 
                  ? 'Bağlantı geldiğinde otomatik gönderilecektir.'
                  : 'Başvurunuz incelendikten sonra sizinle iletişime geçilecektir.'}
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-3">
          <p className="text-white/60 text-sm">
            © {new Date().getFullYear()} Kırıkkale Olimpiyat Spor Kulübü - Yüzme Branşı
          </p>
          <div className="flex justify-center">
            <ZmkAgencyBranding variant="light" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
