// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Dashboard Page
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import api, { formatCurrency, formatDate, getMonthName } from '../utils/api'
import {
  Users, Calendar, CreditCard, AlertTriangle, TrendingUp,
  UserPlus, Bell, ArrowRight, Clock, CheckCircle, XCircle
} from 'lucide-react'

const COLORS = ['#1976D2', '#42A5F5', '#90CAF9', '#BBDEFB', '#E3F2FD']

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard')
      setData(response.data.data)
    } catch (error) {
      console.error('Dashboard data error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  const { overview, charts, recent } = data || {}

  // Prepare revenue chart data
  const revenueChartData = charts?.yearlyRevenue?.map(item => ({
    name: getMonthName(item.month),
    gelir: item.total
  })) || []

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants} className="card overflow-hidden">
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 p-6 lg:p-8">
          <div className="absolute inset-0 bg-water-pattern opacity-20"></div>
          <div className="relative flex items-center justify-between">
            <div className="text-white">
              <h1 className="text-2xl lg:text-3xl font-display font-bold mb-2">
                Hoş Geldiniz! 🏊
              </h1>
              <p className="text-primary-100">
                Kırıkkale Olimpiyat Spor Kulübü Yüzme Branşı Yönetim Paneli
              </p>
            </div>
            <img src="/logo.png" alt="Logo" className="w-20 h-20 hidden lg:block" />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/sporcular" className="stat-card group hover:shadow-lg transition-all">
          <div className="stat-icon bg-primary-100 text-primary-600 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overview?.athletes?.active || 0}</p>
            <p className="text-sm text-gray-500">Aktif Sporcu</p>
          </div>
        </Link>

        <Link to="/seanslar" className="stat-card group hover:shadow-lg transition-all">
          <div className="stat-icon bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overview?.sessions?.thisMonth || 0}</p>
            <p className="text-sm text-gray-500">Bu Ay Seans</p>
          </div>
        </Link>

        <Link to="/odemeler" className="stat-card group hover:shadow-lg transition-all">
          <div className="stat-icon bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview?.payments?.paid?.total || 0)}</p>
            <p className="text-sm text-gray-500">Toplam Tahsilat</p>
          </div>
        </Link>

        <Link to="/odemeler?status=Gecikmiş" className="stat-card group hover:shadow-lg transition-all">
          <div className="stat-icon bg-red-100 text-red-600 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{overview?.payments?.overdue?.count || 0}</p>
            <p className="text-sm text-gray-500">Geciken Ödeme</p>
          </div>
        </Link>
      </motion.div>

      {/* Secondary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{overview?.athletes?.newThisMonth || 0}</p>
            <p className="text-xs text-gray-500">Bu Ay Yeni Sporcu</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{overview?.athletes?.lowSession || 0}</p>
            <p className="text-xs text-gray-500">Az Seans Kaldı</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{overview?.pendingRegistrations || 0}</p>
            <p className="text-xs text-gray-500">Bekleyen Kayıt</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{overview?.unreadNotifications || 0}</p>
            <p className="text-xs text-gray-500">Okunmamış Bildirim</p>
          </div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Aylık Gelir Grafiği</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1976D2" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#1976D2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(value) => `${value/1000}K`} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Gelir']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="gelir" 
                  stroke="#1976D2" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorGelir)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Membership Type Distribution */}
        <motion.div variants={itemVariants} className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Üyelik Tipi Dağılımı</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.athletesByMembershipType || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {charts?.athletesByMembershipType?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [value, props.payload.name]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {charts?.athletesByMembershipType?.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activities */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Athletes */}
        <motion.div variants={itemVariants} className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Son Eklenen Sporcular</h3>
            <Link to="/sporcular" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Tümünü Gör <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recent?.athletes?.map((athlete) => (
              <Link 
                key={athlete._id} 
                to={`/sporcular/${athlete._id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                  {athlete.firstName?.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{athlete.firstName} {athlete.lastName}</p>
                  <p className="text-sm text-gray-500">{athlete.membershipType}</p>
                </div>
                <div className="text-right">
                  <span className={`badge ${athlete.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>
                    {athlete.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(athlete.createdAt)}</p>
                </div>
              </Link>
            ))}
            {(!recent?.athletes || recent.athletes.length === 0) && (
              <div className="p-8 text-center text-gray-500">
                Henüz sporcu kaydı yok
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Payments */}
        <motion.div variants={itemVariants} className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Son Alınan Ödemeler</h3>
            <Link to="/odemeler" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Tümünü Gör <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recent?.payments?.map((payment) => (
              <div key={payment._id} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {payment.athlete?.firstName} {payment.athlete?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {payment.paymentType === 'Aylık' 
                      ? `${getMonthName(payment.period?.month)} ${payment.period?.year}`
                      : `${payment.paymentType}`
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(payment.paymentDate)}</p>
                </div>
              </div>
            ))}
            {(!recent?.payments || recent.payments.length === 0) && (
              <div className="p-8 text-center text-gray-500">
                Henüz ödeme kaydı yok
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/sporcular" className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-center group">
            <UserPlus className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-primary-600" />
            <p className="font-medium text-gray-700 group-hover:text-primary-700">Sporcu Ekle</p>
          </Link>
          <Link to="/seanslar" className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-center group">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-primary-600" />
            <p className="font-medium text-gray-700 group-hover:text-primary-700">Seans Oluştur</p>
          </Link>
          <Link to="/odemeler" className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-center group">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-primary-600" />
            <p className="font-medium text-gray-700 group-hover:text-primary-700">Ödeme Al</p>
          </Link>
          <Link to="/kayitlar" className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-center group">
            <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-primary-600" />
            <p className="font-medium text-gray-700 group-hover:text-primary-700">QR Kod Al</p>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

