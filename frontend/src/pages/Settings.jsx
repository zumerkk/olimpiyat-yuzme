// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Settings Page
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { User, Lock, Settings as SettingsIcon, Save, Shield } from 'lucide-react'

export default function Settings() {
  const { admin, updateProfile, changePassword } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: admin?.name || '',
    phone: admin?.phone || ''
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    const result = await updateProfile(profileData)
    setLoading(false)
    
    if (result.success) {
      toast.success('Profil güncellendi')
    } else {
      toast.error(result.message)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }
    
    setLoading(true)
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword)
    setLoading(false)
    
    if (result.success) {
      toast.success('Şifre değiştirildi')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      toast.error(result.message)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'password', label: 'Şifre', icon: Lock },
    { id: 'system', label: 'Sistem', icon: SettingsIcon }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Ayarlar</h1>
        <p className="text-gray-500 text-sm mt-1">Hesap ve sistem ayarlarını yönetin</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <div className="card p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Profil Bilgileri</h2>
                <p className="text-sm text-gray-500 mt-1">Kişisel bilgilerinizi güncelleyin</p>
              </div>
              
              <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold">
                    {admin?.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{admin?.name}</p>
                    <p className="text-sm text-gray-500">{admin?.email}</p>
                    <span className="badge badge-primary mt-2">
                      <Shield className="w-3 h-3 mr-1" />
                      {admin?.role === 'super_admin' ? 'Süper Admin' : 'Admin'}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Ad Soyad</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Telefon</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="input"
                      placeholder="05XX XXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">E-posta</label>
                  <input
                    type="email"
                    value={admin?.email || ''}
                    className="input bg-gray-50"
                    disabled
                  />
                  <p className="text-xs text-gray-400 mt-1">E-posta adresi değiştirilemez</p>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={loading} className="btn-primary">
                    <Save className="w-5 h-5" />
                    {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Şifre Değiştir</h2>
                <p className="text-sm text-gray-500 mt-1">Hesap güvenliğiniz için şifrenizi düzenli aralıklarla değiştirin</p>
              </div>
              
              <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
                <div>
                  <label className="label">Mevcut Şifre</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Yeni Şifre</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-400 mt-1">En az 6 karakter</p>
                </div>

                <div>
                  <label className="label">Yeni Şifre (Tekrar)</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={loading} className="btn-primary">
                    <Lock className="w-5 h-5" />
                    {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Sistem Bilgileri</h2>
                <p className="text-sm text-gray-500 mt-1">Sistem hakkında genel bilgiler</p>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
                  <img src="/logo.png" alt="Logo" className="w-16 h-16" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Kırıkkale Olimpiyat Spor Kulübü</h3>
                    <p className="text-sm text-gray-500">Yüzme Branşı Yönetim Sistemi</p>
                    <p className="text-xs text-gray-400 mt-1">Versiyon 1.0.0</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">Veritabanı</span>
                    <span className="font-medium text-gray-900">MongoDB</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">Backend</span>
                    <span className="font-medium text-gray-900">Node.js / Express</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">Frontend</span>
                    <span className="font-medium text-gray-900">React / Tailwind CSS</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-gray-500">Bildirim Kontrolü</span>
                    <span className="font-medium text-gray-900">Her gün 09:00</span>
                  </div>
                </div>

                <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <h4 className="font-medium text-primary-700 mb-2">Destek</h4>
                  <p className="text-sm text-primary-600">
                    Teknik destek için: destek@olimpiyatyuzme.com
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

