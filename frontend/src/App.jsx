// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Main App Component
// ═══════════════════════════════════════════════════════════════════════════════

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Layouts
import AdminLayout from './layouts/AdminLayout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Athletes from './pages/Athletes'
import AthleteDetail from './pages/AthleteDetail'
import Sessions from './pages/Sessions'
import Payments from './pages/Payments'
import MonthlyPayments from './pages/MonthlyPayments'
import Notifications from './pages/Notifications'
import Registrations from './pages/Registrations'
import Settings from './pages/Settings'
import PublicRegistration from './pages/PublicRegistration'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="text-center">
          <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4 animate-pulse" />
          <div className="spinner mx-auto"></div>
        </div>
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/giris" replace />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/giris" element={<Login />} />
      <Route path="/kayit" element={<PublicRegistration />} />
      
      {/* Protected Admin Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="sporcular" element={<Athletes />} />
        <Route path="sporcular/:id" element={<AthleteDetail />} />
        <Route path="seanslar" element={<Sessions />} />
        <Route path="odemeler" element={<Payments />} />
        <Route path="aylik-odemeler" element={<MonthlyPayments />} />
        <Route path="bildirimler" element={<Notifications />} />
        <Route path="kayitlar" element={<Registrations />} />
        <Route path="ayarlar" element={<Settings />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

