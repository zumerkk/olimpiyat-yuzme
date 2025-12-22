// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Monthly Payments Page
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api, { formatCurrency, getMonthName, formatDate } from '../utils/api'
import toast from 'react-hot-toast'
import {
  Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock, Zap, RefreshCw, Package
} from 'lucide-react'

export default function MonthlyPayments() {
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generatingMonthly, setGeneratingMonthly] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [paymentsRes, statsRes] = await Promise.all([
        api.get('/payments/due-soon'),
        api.get('/payments/stats')
      ])
      setPayments(paymentsRes.data.data)
      setStats(statsRes.data.stats)
    } catch (error) {
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateMonthly = async () => {
    if (!confirm('Tüm aylık üyeler için bu ayın ödeme kayıtları oluşturulsun mu?')) return
    
    try {
      setGeneratingMonthly(true)
      const response = await api.post('/payments/generate-monthly')
      toast.success(response.data.message)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    } finally {
      setGeneratingMonthly(false)
    }
  }

  const handlePayment = async (paymentId) => {
    try {
      await api.post(`/payments/${paymentId}/pay`, { paymentMethod: 'Nakit' })
      toast.success('Ödeme alındı')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    }
  }

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Aylık Ödeme Takibi</h1>
          <p className="text-gray-500 text-sm mt-1">
            {getMonthName(currentMonth)} {currentYear} - Yaklaşan ve gecikmiş ödemeler
          </p>
        </div>
        <button 
          onClick={handleGenerateMonthly} 
          className="btn-primary"
          disabled={generatingMonthly}
        >
          {generatingMonthly ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          Bu Ay Ödemelerini Oluştur
        </button>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-gray-500 text-sm">Toplam Tahsilat</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalPaid)}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.paidCount} ödeme</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-gray-500 text-sm">Bekleyen</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalPending)}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.pendingCount} ödeme</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-gray-500 text-sm">Gecikmiş</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOverdue)}</p>
            <p className="text-sm text-gray-500 mt-1">{stats.overdueCount} ödeme</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-gray-500 text-sm">Tahsilat Oranı</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              %{stats.totalPaid + stats.totalPending + stats.totalOverdue > 0 
                ? Math.round((stats.totalPaid / (stats.totalPaid + stats.totalPending + stats.totalOverdue)) * 100) 
                : 0}
            </p>
          </motion.div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Ödeme Kuralları</p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="inline-flex items-center gap-1 mr-3">
                <Calendar className="w-4 h-4 text-blue-500" />
                <strong>Aylık:</strong> Her ayın 15'inde ödeme vadesi
              </span>
              <span className="inline-flex items-center gap-1">
                <Package className="w-4 h-4 text-purple-500" />
                <strong>8 Seanslık:</strong> 8 seans tamamlandığında ödeme
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Due Soon Payments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            Yaklaşan ve Gecikmiş Ödemeler
          </h3>
          <p className="text-sm text-gray-500 mt-1">7 gün içinde vadesi dolacak veya gecikmiş ödemeler</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="spinner"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-gray-500">Yaklaşan veya gecikmiş ödeme bulunmuyor 🎉</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Sporcu</th>
                  <th>Tip</th>
                  <th>Tutar</th>
                  <th>Vade</th>
                  <th>Durum</th>
                  <th className="text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <motion.tr
                    key={payment._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                          {payment.athlete?.firstName?.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">
                            {payment.athlete?.firstName} {payment.athlete?.lastName}
                          </span>
                          <p className="text-xs text-gray-500">{payment.athlete?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${payment.paymentType === 'Aylık' ? 'badge-info' : 'badge-primary'}`}>
                        {payment.paymentType === 'Aylık' ? (
                          <><Calendar className="w-3 h-3 mr-1" />Aylık</>
                        ) : (
                          <><Package className="w-3 h-3 mr-1" />8 Seanslık</>
                        )}
                      </span>
                    </td>
                    <td className="font-semibold">{formatCurrency(payment.amount)}</td>
                    <td>
                      <div className="text-sm">
                        <span className="text-gray-900">{formatDate(payment.dueDate)}</span>
                        {payment.daysUntilDue !== null && (
                          <p className={`text-xs ${
                            payment.daysUntilDue < 0 ? 'text-red-500 font-medium' : 
                            payment.daysUntilDue <= 3 ? 'text-amber-500' : 'text-gray-400'
                          }`}>
                            {payment.daysUntilDue < 0 
                              ? `${Math.abs(payment.daysUntilDue)} gün gecikti!`
                              : payment.daysUntilDue === 0 
                              ? 'Bugün!'
                              : `${payment.daysUntilDue} gün kaldı`
                            }
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        payment.status === 'Gecikmiş' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {payment.status === 'Gecikmiş' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {payment.status === 'Beklemede' && <Clock className="w-3 h-3 mr-1" />}
                        {payment.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handlePayment(payment._id)}
                        className="btn-success btn-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Ödeme Al
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
