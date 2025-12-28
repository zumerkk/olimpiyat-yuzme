// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Login Page
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Mail, Lock, LogIn, Eye, EyeOff, Waves } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Lütfen tüm alanları doldurun')
      return
    }

    setLoading(true)
    const result = await login(email, password)
    setLoading(false)

    if (result.success) {
      toast.success('Giriş başarılı!')
      navigate('/')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Olympic Rings Pattern */}
        <div className="absolute top-10 left-10 opacity-10">
          <svg width="200" height="100" viewBox="0 0 200 100">
            <circle cx="30" cy="30" r="25" fill="none" stroke="#0081C8" strokeWidth="4"/>
            <circle cx="70" cy="30" r="25" fill="none" stroke="#000" strokeWidth="4"/>
            <circle cx="110" cy="30" r="25" fill="none" stroke="#EE334E" strokeWidth="4"/>
            <circle cx="50" cy="55" r="25" fill="none" stroke="#FCB131" strokeWidth="4"/>
            <circle cx="90" cy="55" r="25" fill="none" stroke="#00A651" strokeWidth="4"/>
          </svg>
        </div>

        {/* Floating bubbles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: Math.random() * 100 + 20,
              height: Math.random() * 100 + 20,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 2,
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

      {/* Login Card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-8 text-center">
              <motion.img
                src="/logo.png"
                alt="Kırıkkale Olimpiyat Spor Kulübü"
                className="w-24 h-24 mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              />
              <h1 className="text-2xl font-display font-bold text-white">
                Kırıkkale Olimpiyat
              </h1>
              <p className="text-primary-100 text-sm mt-1">
                Yüzme Branşı Yönetim Sistemi
              </p>
            </div>

            {/* Form */}
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Admin Girişi</h2>
                <p className="text-sm text-gray-500 mt-1">Yönetim paneline erişmek için giriş yapın</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">E-posta Adresi</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-12"
                      placeholder="admin@olimpiyatyuzme.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Şifre</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-12 pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="spinner w-5 h-5 border-white/30 border-t-white"></div>
                      Giriş yapılıyor...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LogIn className="w-5 h-5" />
                      Giriş Yap
                    </span>
                  )}
                </button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
                <p className="text-xs text-primary-700 font-medium mb-2">Demo Giriş Bilgileri:</p>
                <p className="text-xs text-primary-600">
                  E-posta: <code className="bg-primary-100 px-1.5 py-0.5 rounded">admin@olimpiyatyuzme.com</code>
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  Şifre: <code className="bg-primary-100 px-1.5 py-0.5 rounded">OlimpiyatAdmin2024!</code>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-white/60 text-sm mt-6">
            © 2024 Kırıkkale Olimpiyat Spor Kulübü
          </p>
        </motion.div>
      </div>
    </div>
  )
}

