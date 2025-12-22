// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Admin Layout
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  CalendarClock,
  Bell,
  UserPlus,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  QrCode
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Sporcular', href: '/sporcular', icon: Users },
  { name: 'Seanslar', href: '/seanslar', icon: Calendar },
  { name: 'Ödemeler', href: '/odemeler', icon: CreditCard },
  { name: 'Aylık Takip', href: '/aylik-odemeler', icon: CalendarClock },
  { name: 'Online Kayıtlar', href: '/kayitlar', icon: UserPlus },
  { name: 'Bildirimler', href: '/bildirimler', icon: Bell },
  { name: 'Ayarlar', href: '/ayarlar', icon: Settings },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const { admin, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    fetchNotificationCount()
    const interval = setInterval(fetchNotificationCount, 60000) // Her dakika kontrol
    return () => clearInterval(interval)
  }, [])

  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count')
      setNotificationCount(response.data.count)
    } catch (error) {
      console.error('Notification count error:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/giris')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
            <img src="/logo.png" alt="Logo" className="w-14 h-14" />
            <div>
              <h1 className="font-display font-bold text-primary-700 leading-tight">
                Kırıkkale Olimpiyat
              </h1>
              <p className="text-xs text-gray-500">Yüzme Yönetim Sistemi</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden ml-auto p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  sidebar-link relative
                  ${isActive ? 'active' : ''}
                `}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
                {item.href === '/bildirimler' && notificationCount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-100">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                  {admin?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 text-sm">{admin?.name}</p>
                  <p className="text-xs text-gray-500">{admin?.role === 'super_admin' ? 'Süper Admin' : 'Admin'}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setProfileOpen(false)
                        navigate('/ayarlar')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">Profil Ayarları</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Çıkış Yap</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex-none">
              <h2 className="font-display font-semibold text-gray-900 text-lg">
                {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* QR Code Button */}
              <button
                onClick={() => navigate('/kayitlar')}
                className="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors"
                title="Online Kayıt QR Kodu"
              >
                <QrCode className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button
                onClick={() => navigate('/bildirimler')}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

