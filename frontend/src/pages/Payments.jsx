// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Ödeme Takip Sistemi v2.0
//                    Kısmi Ödeme & Eksik Bakiye Desteği
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api, { formatDate, formatCurrency, getMonthName } from '../utils/api'
import toast from 'react-hot-toast'
import {
  Plus, CreditCard, CheckCircle, Clock, AlertTriangle, X,
  Calendar, Package, RefreshCw, ChevronLeft, ChevronRight, Zap,
  DollarSign, PieChart, TrendingDown, History, Percent
} from 'lucide-react'

const PAYMENT_STATUSES = ['Ödendi', 'Beklemede', 'Gecikmiş', 'Kısmi Ödeme']
const PAYMENT_METHODS = ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Diğer']
const PAYMENT_TYPES = ['Aylık', '8 Seanslık']

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [athletes, setAthletes] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ status: '', paymentType: '' })
  const [showModal, setShowModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [formData, setFormData] = useState({})
  const [payData, setPayData] = useState({ 
    paymentMethod: 'Nakit', 
    receiptNumber: '', 
    notes: '',
    amount: 0,
    isPartial: false 
  })
  const [generatingMonthly, setGeneratingMonthly] = useState(false)

  useEffect(() => {
    fetchPayments()
    fetchAthletes()
    fetchStats()
  }, [pagination.current, filters])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      })
      const response = await api.get(`/payments?${params}`)
      setPayments(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Ödemeler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const fetchAthletes = async () => {
    try {
      const response = await api.get('/athletes/active')
      setAthletes(response.data.data)
    } catch (error) {
      console.error('Athletes error:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/payments/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Stats error:', error)
    }
  }

  const handleCreatePayment = async (e) => {
    e.preventDefault()
    try {
      await api.post('/payments', formData)
      toast.success('Ödeme kaydı oluşturuldu')
      setShowModal(false)
      setFormData({})
      fetchPayments()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    }
  }

  // Tam ödeme al
  const handleFullPayment = async (e) => {
    e.preventDefault()
    try {
      await api.post(`/payments/${selectedPayment._id}/pay`, {
        paymentMethod: payData.paymentMethod,
        receiptNumber: payData.receiptNumber,
        notes: payData.notes
      })
      toast.success('Ödeme tamamen alındı!')
      closePayModal()
      fetchPayments()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    }
  }

  // Kısmi ödeme al
  const handlePartialPayment = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post(`/payments/${selectedPayment._id}/partial-pay`, {
        amount: parseFloat(payData.amount),
        paymentMethod: payData.paymentMethod,
        receiptNumber: payData.receiptNumber,
        notes: payData.notes
      })
      toast.success(response.data.message)
      closePayModal()
      fetchPayments()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    }
  }

  const handleGenerateMonthly = async () => {
    if (!confirm('Tüm aylık üyeler için bu ayın ödeme kayıtları oluşturulsun mu?')) return
    
    try {
      setGeneratingMonthly(true)
      const response = await api.post('/payments/generate-monthly')
      toast.success(response.data.message)
      fetchPayments()
      fetchStats()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    } finally {
      setGeneratingMonthly(false)
    }
  }

  const openPayModal = (payment) => {
    const remaining = payment.amount - (payment.paidAmount || 0)
    setSelectedPayment(payment)
    setPayData({ 
      paymentMethod: 'Nakit', 
      receiptNumber: '', 
      notes: '',
      amount: remaining,
      isPartial: false
    })
    setShowPayModal(true)
  }

  const closePayModal = () => {
    setShowPayModal(false)
    setSelectedPayment(null)
    setPayData({ paymentMethod: 'Nakit', receiptNumber: '', notes: '', amount: 0, isPartial: false })
  }

  const openHistoryModal = (payment) => {
    setSelectedPayment(payment)
    setShowHistoryModal(true)
  }

  const openCreateModal = () => {
    const now = new Date()
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15)
    if (now.getDate() > 15) {
      dueDate.setMonth(dueDate.getMonth() + 1)
    }
    
    setFormData({
      athlete: '',
      paymentType: 'Aylık',
      amount: 5000,
      period: { month: dueDate.getMonth() + 1, year: dueDate.getFullYear() },
      dueDate: dueDate.toISOString().split('T')[0]
    })
    setShowModal(true)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ödendi': return <CheckCircle className="w-4 h-4" />
      case 'Beklemede': return <Clock className="w-4 h-4" />
      case 'Gecikmiş': return <AlertTriangle className="w-4 h-4" />
      case 'Kısmi Ödeme': return <PieChart className="w-4 h-4" />
      default: return null
    }
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'Ödendi': return 'badge-success'
      case 'Beklemede': return 'badge-warning'
      case 'Gecikmiş': return 'badge-danger'
      case 'Kısmi Ödeme': return 'badge-info'
      default: return 'badge-info'
    }
  }

  // Kalan borç hesapla
  const getRemainingBalance = (payment) => {
    return Math.max(0, payment.amount - (payment.paidAmount || 0))
  }

  // Ödeme yüzdesi hesapla
  const getPaidPercentage = (payment) => {
    if (payment.amount === 0) return 100
    return Math.round(((payment.paidAmount || 0) / payment.amount) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Ödemeler</h1>
          <p className="text-gray-500 text-sm mt-1">Ödeme takibi, kısmi ödeme ve borç yönetimi</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleGenerateMonthly} 
            className="btn-secondary"
            disabled={generatingMonthly}
          >
            {generatingMonthly ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            Aylık Ödemeleri Oluştur
          </button>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-5 h-5" />
            Manuel Ödeme
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Toplam Tahsilat</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalPaid)}</p>
                <p className="text-xs text-green-600">{stats.paidCount} ödeme</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Bekleyen</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalPending)}</p>
                <p className="text-xs text-amber-600">{stats.pendingCount} ödeme</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Gecikmiş</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalOverdue)}</p>
                <p className="text-xs text-red-600">{stats.overdueCount} ödeme</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Kısmi Ödeme</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.partialPayments?.totalRemaining || 0)}</p>
                <p className="text-xs text-blue-600">{stats.partialPayments?.count || 0} ödeme</p>
              </div>
            </div>
          </div>

          <div className="card p-4 bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-700">Toplam Eksik</p>
                <p className="text-xl font-bold text-red-900">{formatCurrency(stats.totalRemainingBalance)}</p>
                <p className="text-xs text-red-600">Tahsil edilmemiş</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="select"
          >
            <option value="">Tüm Durumlar</option>
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filters.paymentType}
            onChange={(e) => setFilters({ ...filters, paymentType: e.target.value })}
            className="select"
          >
            <option value="">Tüm Ödeme Tipleri</option>
            {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={() => setFilters({ status: '', paymentType: '' })}
            className="btn-secondary"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Ödeme Kuralları</p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="inline-flex items-center gap-1 mr-3">
                <Calendar className="w-4 h-4 text-blue-500" />
                <strong>Aylık:</strong> Her ayın 15'inde ödeme (Varsayılan: 5.000₺)
              </span>
              <span className="inline-flex items-center gap-1 mr-3">
                <Package className="w-4 h-4 text-purple-500" />
                <strong>8 Seanslık:</strong> Paket bitince ödeme (Varsayılan: 4.000₺)
              </span>
              <span className="inline-flex items-center gap-1">
                <PieChart className="w-4 h-4 text-blue-500" />
                <strong>Kısmi Ödeme:</strong> Parça parça ödeme alınabilir
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-16 text-center">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Ödeme kaydı bulunamadı</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sporcu</th>
                    <th>Ödeme Tipi</th>
                    <th>Dönem / Paket</th>
                    <th>Beklenen</th>
                    <th>Ödenen</th>
                    <th>Kalan Borç</th>
                    <th>Durum</th>
                    <th className="text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => {
                    const remaining = getRemainingBalance(payment)
                    const paidPercent = getPaidPercentage(payment)
                    
                    return (
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
                          <div className="flex items-center gap-2">
                            {payment.paymentType === 'Aylık' ? (
                              <Calendar className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Package className="w-4 h-4 text-purple-500" />
                            )}
                            <span className={`badge ${
                              payment.paymentType === 'Aylık' ? 'badge-info' : 'badge-primary'
                            }`}>
                              {payment.paymentType}
                            </span>
                          </div>
                        </td>
                        <td className="font-medium">
                          {payment.paymentType === 'Aylık' ? (
                            <span>{getMonthName(payment.period?.month)} {payment.period?.year}</span>
                          ) : (
                            <span>{payment.packageNumber}. Paket</span>
                          )}
                        </td>
                        <td className="font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${payment.paidAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {formatCurrency(payment.paidAmount || 0)}
                            </span>
                            {payment.partialPayments?.length > 0 && (
                              <button 
                                onClick={() => openHistoryModal(payment)}
                                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                title="Ödeme geçmişi"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          {remaining > 0 ? (
                            <div>
                              <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
                              {payment.paidAmount > 0 && (
                                <div className="mt-1">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 rounded-full transition-all"
                                      style={{ width: `${paidPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500">%{paidPercent}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-green-600 font-medium">Tamam ✓</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getStatusClass(payment.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </span>
                          {payment.daysUntilDue !== null && payment.status !== 'Ödendi' && (
                            <p className={`text-xs mt-1 ${
                              payment.daysUntilDue < 0 ? 'text-red-500' : 
                              payment.daysUntilDue <= 3 ? 'text-amber-500' : 'text-gray-400'
                            }`}>
                              {payment.daysUntilDue < 0 
                                ? `${Math.abs(payment.daysUntilDue)} gün gecikti`
                                : payment.daysUntilDue === 0 
                                ? 'Bugün'
                                : `${payment.daysUntilDue} gün kaldı`
                              }
                            </p>
                          )}
                        </td>
                        <td className="text-right">
                          {payment.status !== 'Ödendi' ? (
                            <button
                              onClick={() => openPayModal(payment)}
                              className="btn-success btn-sm"
                            >
                              <DollarSign className="w-4 h-4" />
                              Ödeme Al
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">
                              {formatDate(payment.paymentDate)}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Sayfa {pagination.current} / {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, current: pagination.current - 1 })}
                    disabled={pagination.current === 1}
                    className="btn-secondary btn-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, current: pagination.current + 1 })}
                    disabled={pagination.current === pagination.pages}
                    className="btn-secondary btn-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Payment Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Manuel Ödeme Kaydı</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePayment} className="p-5 space-y-4">
                <div>
                  <label className="label">Sporcu *</label>
                  <select
                    value={formData.athlete || ''}
                    onChange={(e) => {
                      const athlete = athletes.find(a => a._id === e.target.value)
                      setFormData({ 
                        ...formData, 
                        athlete: e.target.value,
                        paymentType: athlete?.membershipType || 'Aylık',
                        amount: athlete?.membershipType === '8 Seanslık' 
                          ? (athlete?.packageFee || 4000) 
                          : (athlete?.monthlyFee || 5000)
                      })
                    }}
                    className="select"
                    required
                  >
                    <option value="">Sporcu Seçin</option>
                    {athletes.map(a => (
                      <option key={a._id} value={a._id}>
                        {a.firstName} {a.lastName} ({a.membershipType}) - {formatCurrency(a.membershipType === '8 Seanslık' ? a.packageFee : a.monthlyFee)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Ödeme Tipi *</label>
                  <select
                    value={formData.paymentType || 'Aylık'}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    className="select"
                    required
                  >
                    {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {formData.paymentType === 'Aylık' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Ay *</label>
                      <select
                        value={formData.period?.month || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          period: { ...formData.period, month: parseInt(e.target.value) }
                        })}
                        className="select"
                        required
                      >
                        {[...Array(12)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Yıl *</label>
                      <select
                        value={formData.period?.year || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          period: { ...formData.period, year: parseInt(e.target.value) }
                        })}
                        className="select"
                        required
                      >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Tutar (₺) *</label>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                    className="input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tanıdıklara özel fiyat için tutarı değiştirin
                  </p>
                </div>

                <div>
                  <label className="label">Vade Tarihi *</label>
                  <input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                    İptal
                  </button>
                  <button type="submit" className="btn-primary">
                    Oluştur
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pay Modal - Kısmi / Tam Ödeme */}
      <AnimatePresence>
        {showPayModal && selectedPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={closePayModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content max-w-lg"
            >
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Ödeme Al</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedPayment.athlete?.firstName} {selectedPayment.athlete?.lastName}
                  {selectedPayment.paymentType === 'Aylık' 
                    ? ` - ${getMonthName(selectedPayment.period?.month)} ${selectedPayment.period?.year}`
                    : ` - ${selectedPayment.packageNumber}. Paket`
                  }
                </p>
              </div>

              <form onSubmit={payData.isPartial ? handlePartialPayment : handleFullPayment} className="p-5 space-y-4">
                {/* Ödeme Özeti */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl text-center">
                    <p className="text-xs text-gray-500 mb-1">Beklenen</p>
                    <p className="text-lg font-bold text-gray-700">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl text-center">
                    <p className="text-xs text-green-600 mb-1">Ödenen</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(selectedPayment.paidAmount || 0)}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl text-center">
                    <p className="text-xs text-red-600 mb-1">Kalan Borç</p>
                    <p className="text-lg font-bold text-red-700">{formatCurrency(getRemainingBalance(selectedPayment))}</p>
                  </div>
                </div>

                {/* Ödeme Tipi Seçimi */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPayData({ ...payData, isPartial: false, amount: getRemainingBalance(selectedPayment) })}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      !payData.isPartial 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${!payData.isPartial ? 'text-green-500' : 'text-gray-400'}`} />
                    <p className="font-medium text-sm">Tam Ödeme</p>
                    <p className="text-xs opacity-70">{formatCurrency(getRemainingBalance(selectedPayment))}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayData({ ...payData, isPartial: true, amount: '' })}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      payData.isPartial 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <PieChart className={`w-5 h-5 mx-auto mb-1 ${payData.isPartial ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="font-medium text-sm">Kısmi Ödeme</p>
                    <p className="text-xs opacity-70">Belirli tutar</p>
                  </button>
                </div>

                {/* Kısmi Ödeme Tutarı */}
                {payData.isPartial && (
                  <div>
                    <label className="label">Ödeme Tutarı (₺) *</label>
                    <input
                      type="number"
                      value={payData.amount}
                      onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                      className="input"
                      placeholder={`Max: ${getRemainingBalance(selectedPayment)}₺`}
                      max={getRemainingBalance(selectedPayment)}
                      min={1}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Örn: 5000₺ borcun 3000₺'sini şimdi, kalanını sonra alın
                    </p>
                  </div>
                )}

                <div>
                  <label className="label">Ödeme Yöntemi *</label>
                  <select
                    value={payData.paymentMethod}
                    onChange={(e) => setPayData({ ...payData, paymentMethod: e.target.value })}
                    className="select"
                    required
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Makbuz/Dekont No</label>
                  <input
                    type="text"
                    value={payData.receiptNumber}
                    onChange={(e) => setPayData({ ...payData, receiptNumber: e.target.value })}
                    className="input"
                    placeholder="Opsiyonel"
                  />
                </div>

                <div>
                  <label className="label">Not</label>
                  <textarea
                    value={payData.notes}
                    onChange={(e) => setPayData({ ...payData, notes: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Opsiyonel"
                  />
                </div>

                {selectedPayment.paymentType === '8 Seanslık' && !payData.isPartial && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                    <p className="font-medium">📦 Paket Yenileme</p>
                    <p className="text-xs mt-1">
                      Tam ödeme alındığında sporcunun 8 seans hakkı otomatik olarak yenilenecek.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={closePayModal} className="btn-secondary">
                    İptal
                  </button>
                  <button type="submit" className={payData.isPartial ? 'btn-primary' : 'btn-success'}>
                    {payData.isPartial ? (
                      <>
                        <PieChart className="w-5 h-5" />
                        Kısmi Ödeme Al
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Tam Ödeme Al
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment History Modal */}
      <AnimatePresence>
        {showHistoryModal && selectedPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ödeme Geçmişi</h3>
                  <p className="text-sm text-gray-500">
                    {selectedPayment.athlete?.firstName} {selectedPayment.athlete?.lastName} - 
                    {selectedPayment.paymentType === 'Aylık' 
                      ? ` ${getMonthName(selectedPayment.period?.month)} ${selectedPayment.period?.year}`
                      : ` ${selectedPayment.packageNumber}. Paket`
                    }
                  </p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
                {/* Özet */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Beklenen</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-green-600">Ödenen</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedPayment.paidAmount || 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-red-600">Kalan</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(getRemainingBalance(selectedPayment))}</p>
                  </div>
                </div>

                {/* Ödeme Listesi */}
                <div className="space-y-3">
                  {selectedPayment.partialPayments?.length > 0 ? (
                    selectedPayment.partialPayments.map((pp, index) => (
                      <div key={pp._id || index} className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-green-600">{formatCurrency(pp.amount)}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(pp.paymentDate)} • {pp.paymentMethod}
                            {pp.receiptNumber && ` • ${pp.receiptNumber}`}
                          </p>
                          {pp.notes && <p className="text-xs text-gray-400 mt-1">{pp.notes}</p>}
                        </div>
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">Henüz ödeme yapılmamış</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100">
                <button onClick={() => setShowHistoryModal(false)} className="btn-secondary w-full">
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
