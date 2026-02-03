// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Ödeme Takip Sistemi v3.0
//                    Aylık & Seanslık Ayrımı + Eksiksiz Liste
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api, { formatDate, formatCurrency, getMonthName } from '../utils/api'
import toast from 'react-hot-toast'
import {
  Plus, CreditCard, CheckCircle, Clock, AlertTriangle, X,
  Calendar, Package, RefreshCw, ChevronLeft, ChevronRight, Zap,
  DollarSign, PieChart, TrendingDown, History, Percent, Undo2,
  Users, Layers, Search, Edit2, FilePlus, ChevronDown
} from 'lucide-react'

// Tab Seçenekleri
const TABS = [
  { id: 'monthly', label: 'Aylık Ödemeler', icon: Calendar },
  { id: 'session', label: 'Seans Ödemeleri', icon: Package }
]

const PAYMENT_METHODS = ['Nakit', 'Kredi Kartı', 'Havale/EFT', 'Diğer']

export default function Payments() {
  // Global State
  const [activeTab, setActiveTab] = useState('monthly')
  const [loading, setLoading] = useState(true)

  // Data State
  const [athletes, setAthletes] = useState([])
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState(null)

  // Filters for Monthly View
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [searchTerm, setSearchTerm] = useState('')

  // Modals
  const [showPayModal, setShowPayModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false) // Manuel ekleme için

  // Selected Item for Actions
  const [selectedItem, setSelectedItem] = useState(null) // Can be an athlete or a payment
  const [payData, setPayData] = useState({
    paymentMethod: 'Nakit',
    receiptNumber: '',
    notes: '',
    amount: 0,
    isPartial: false
  })

  // Edit Payment State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState({ amount: 0, dueDate: '' })

  // Manual Create Payment State
  const [createData, setCreateData] = useState({
    athleteId: '',
    paymentType: 'Aylık',
    amount: 5000,
    dueDate: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })

  useEffect(() => {
    fetchData()
  }, [activeTab, selectedMonth, selectedYear])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 1. Tüm aktif sporcuları çek
      const athletesRes = await api.get('/athletes/active')
      setAthletes(athletesRes.data.data)

      // 2. İstatistikleri çek
      try {
        const statsRes = await api.get('/payments/stats')
        setStats(statsRes.data.stats)
      } catch (err) {
        console.error("Stats failed", err)
      }

      // 3. Tab'a göre ödemeleri çek
      const params = new URLSearchParams()
      if (activeTab === 'monthly') {
        // Seçilen AY ve YIL'a ait ödemeleri getir
        // Backend'de filter logic: period.month = X, period.year = Y
        // Ancak backend şu an tam olarak bu filtreyi desteklemeyebilir, 
        // manuel filtreleme veya backend güncellemesi gerekebilir.
        // Şimdilik client-side filtering yapacağız, tüm ödemeleri çekip.
        // İdeal olan backend'e bu filtreyi eklemektir.
        // HACK: Şimdilik "dueDate" aralığı göndererek veya tümünü çekerek yapalım.
        const response = await api.get('/payments?limit=1000') // Hepsini çekelim şimdilik
        setPayments(response.data.data)
      } else {
        // Seanslık ödemeler (genelde son ödemeler lazım)
        const response = await api.get('/payments?paymentType=8 Seanslık&limit=100')
        setPayments(response.data.data)
      }

    } catch (error) {
      console.error('Data fetch error:', error)
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Helper: Find payment for athlete in selected period
  const findMonthlyPayment = (athleteId) => {
    return payments.find(p =>
      p.athlete?._id === athleteId &&
      p.paymentType === 'Aylık' &&
      p.period?.month === selectedMonth &&
      p.period?.year === selectedYear
    )
  }

  // Helper: Find last package payment for athlete
  const findLastPackagePayment = (athleteId) => {
    // Payments are supposed to be sorted by date desc from backend default or we sort here
    return payments
      .filter(p => p.athlete?._id === athleteId && p.paymentType === '8 Seanslık')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
  }

  // Filtered Athletes based on Tab and Search
  const getFilteredAthletes = () => {
    let filtered = athletes

    // Tab Filter
    if (activeTab === 'monthly') {
      filtered = filtered.filter(a => a.membershipType === 'Aylık')
    } else {
      filtered = filtered.filter(a => a.membershipType === '8 Seanslık')
    }

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      filtered = filtered.filter(a =>
        a.firstName.toLowerCase().includes(lower) ||
        a.lastName.toLowerCase().includes(lower)
      )
    }

    return filtered
  }

  // Action: Create Monthly Payment Record
  const createMonthlyRecord = async (athlete) => {
    if (!confirm(`${athlete.firstName} ${athlete.lastName} için ${getMonthName(selectedMonth)} ayı ödeme kaydı oluşturulsun mu?`)) return

    try {
      const dueDate = new Date(selectedYear, selectedMonth - 1, 15) // Ayın 15'i
      await api.post('/payments', {
        athlete: athlete._id,
        paymentType: 'Aylık',
        amount: athlete.monthlyFee || 5000,
        period: { month: selectedMonth, year: selectedYear },
        dueDate: dueDate,
        notes: `${getMonthName(selectedMonth)} ${selectedYear} Aidatı`
      })
      toast.success('Ödeme kaydı oluşturuldu')
      fetchData()
    } catch (error) {
      toast.error('Kayıt oluşturulamadı')
    }
  }

  // Action: Renew Package (Create Package Payment Record)
  const renewPackage = async (athlete) => {
    // Show confirmation/modal is better, but simple confirm for now
    if (!confirm(`${athlete.firstName} ${athlete.lastName} için yeni paket ödemesi tanımlansın mı?`)) return

    try {
      await api.post('/payments', {
        athlete: athlete._id,
        paymentType: '8 Seanslık',
        amount: athlete.packageFee || 5000,
        packageNumber: (athlete.packageRenewCount || 0) + 1,
        dueDate: new Date(), // Hemen ödenmesi beklenir genelde
        notes: `${(athlete.packageRenewCount || 0) + 1}. Paket Ödemesi`
      })
      toast.success('Yeni paket ödemesi tanımlandı')
      fetchData()
    } catch (error) {
      toast.error('Paket tanımlanamadı')
    }
  }

  // Modal Actions
  const openPayModal = (payment) => {
    const remaining = payment.amount - (payment.paidAmount || 0)
    setSelectedItem(payment)
    setPayData({
      paymentMethod: 'Nakit',
      receiptNumber: '',
      notes: '',
      amount: remaining,
      isPartial: false
    })
    setShowPayModal(true)
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    if (!selectedItem) return

    try {
      if (payData.isPartial) {
        await api.post(`/payments/${selectedItem._id}/partial-pay`, {
          amount: parseFloat(payData.amount),
          paymentMethod: payData.paymentMethod,
          receiptNumber: payData.receiptNumber,
          notes: payData.notes
        })
      } else {
        await api.post(`/payments/${selectedItem._id}/pay`, {
          paymentMethod: payData.paymentMethod,
          receiptNumber: payData.receiptNumber,
          notes: payData.notes
        })
      }
      toast.success('Ödeme alındı')
      setShowPayModal(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ödeme alınamadı')
    }
  }

  // Yanlışlıkla işaretlenen ödemeyi geri al
  const handleRevertPayment = async (payment) => {
    if (!confirm('Ödeme kaydı geri alınacak. Devam edilsin mi?')) return
    try {
      await api.patch(`/payments/${payment._id}/revert`)
      toast.success('Ödeme geri alındı')
      fetchData()
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  // Action: Edit Payment Handler
  const handleEditClick = (payment) => {
    setSelectedItem(payment)
    setEditData({
      amount: payment.amount,
      dueDate: payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : ''
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put(`/payments/${selectedItem._id}`, {
        amount: parseFloat(editData.amount),
        dueDate: new Date(editData.dueDate)
      })
      toast.success('Ödeme güncellendi')
      setShowEditModal(false)
      fetchData()
    } catch (error) {
      toast.error('Güncelleme başarısız')
    }
  }

  // Action: Create Manual Payment Handler
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        athlete: createData.athleteId,
        paymentType: createData.paymentType,
        amount: parseFloat(createData.amount),
        dueDate: new Date(createData.dueDate),
        notes: 'Manuel Ödeme'
      }

      if (createData.paymentType === 'Aylık') {
        payload.period = { month: createData.month, year: createData.year }
        payload.notes = `${getMonthName(createData.month)} ${createData.year} Aidatı (Manuel)`
      }

      await api.post('/payments', payload)
      toast.success('Ödeme oluşturuldu')
      setShowCreateModal(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Oluşturma başarısız')
    }
  }

  // --- RENDER HELPERS ---

  const renderStatusBadge = (payment) => {
    if (!payment) return <span className="badge badge-danger">Kayıt Yok</span>

    switch (payment.status) {
      case 'Ödendi': return <span className="badge badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Ödendi</span>
      case 'Beklemede': return <span className="badge badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> Beklemede</span>
      case 'Gecikmiş': return <span className="badge badge-danger flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Gecikmiş</span>
      case 'Kısmi Ödeme': return <span className="badge badge-info flex items-center gap-1"><PieChart className="w-3 h-3" /> Kısmi</span>
      default: return <span className="badge bg-gray-100 text-gray-600">{payment.status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER & STATS */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Ödemeler</h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeTab === 'monthly' ? 'Aylık aidat takibi ve ödeme durumu' : 'Paket ve seans bazlı ödeme takibi'}
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <FilePlus className="w-4 h-4" />
            <span>Manuel Ekle</span>
          </button>


          {/* Quick Stats Mini Cards */}
          {stats && (
            <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
              <div className="px-4 py-2 bg-green-50 border border-green-100 rounded-lg whitespace-nowrap">
                <p className="text-xs text-green-600 font-medium">Bu Ay Tahsilat</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(stats.totalPaid)}</p>
              </div>
              <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-lg whitespace-nowrap">
                <p className="text-xs text-red-600 font-medium">Toplam Alacak</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(stats.totalRemainingBalance)}</p>
              </div>
            </div>
          )}
        </div>

        {/* TABS & FILTERS */}
        <div className="flex flex-col sm:flex-row justify-between items-end gap-4 border-b border-gray-100 pb-1">
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-medium transition-all relative ${activeTab === tab.id
                  ? 'text-primary-600 bg-white border-b-2 border-primary-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Month Selector for Monthly Tab */}
            {activeTab === 'monthly' && (
              <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                <button
                  onClick={() => setSelectedMonth(m => m === 1 ? 12 : m - 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-700 min-w-[100px] text-center">
                  {getMonthName(selectedMonth)} {selectedYear}
                </span>
                <button
                  onClick={() => setSelectedMonth(m => m === 12 ? 1 : m + 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="İsim ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-9 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="card overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Sporcu</th>
                  {activeTab === 'session' && <th>Kalan Seans</th>}
                  <th>{activeTab === 'monthly' ? 'Dönem' : 'Son Paket'}</th>
                  <th>Beklenen</th>
                  <th>Ödenen</th>
                  <th>Kalan Borç</th>
                  <th>Durum</th>
                  <th className="text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAthletes().map((athlete) => {
                  // Determine associated payment based on view
                  const payment = activeTab === 'monthly'
                    ? findMonthlyPayment(athlete._id)
                    : findLastPackagePayment(athlete._id)

                  const remainingBalance = payment ? Math.max(0, payment.amount - (payment.paidAmount || 0)) : 0

                  return (
                    <motion.tr
                      key={athlete._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white
                              ${athlete.gender === 'Kadın' ? 'bg-pink-400' : 'bg-blue-400'}`}>
                            {athlete.firstName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{athlete.firstName} {athlete.lastName}</p>
                            <p className="text-xs text-gray-400">{athlete.phone}</p>
                          </div>
                        </div>
                      </td>

                      {activeTab === 'session' && (
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[...Array(8)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-3 rounded-sm ${i < (athlete.remainingSessions || 0) ? 'bg-green-500' : 'bg-gray-200'}`}
                                />
                              ))}
                            </div>
                            <span className={`text-sm font-bold ml-1 ${(athlete.remainingSessions || 0) <= 2 ? 'text-red-500' : 'text-gray-700'
                              }`}>
                              {athlete.remainingSessions || 0}
                            </span>
                          </div>
                        </td>
                      )}

                      <td>
                        {activeTab === 'monthly' ? (
                          <span className="text-gray-600 text-sm">
                            {getMonthName(selectedMonth)}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-sm">
                            {payment ? `${payment.packageNumber || '?'}. Paket` : '-'}
                          </span>
                        )}
                      </td>

                      <td className="font-medium text-gray-900">
                        {payment ? formatCurrency(payment.amount) : formatCurrency(activeTab === 'monthly' ? athlete.monthlyFee : athlete.packageFee)}
                      </td>

                      <td className="text-green-600 font-medium">
                        {payment ? formatCurrency(payment.paidAmount || 0) : '-'}
                      </td>

                      <td>
                        {payment && remainingBalance > 0 ? (
                          <span className="font-bold text-red-600">{formatCurrency(remainingBalance)}</span>
                        ) : payment ? (
                          <span className="text-green-500 text-xs">Tamamlandı</span>
                        ) : '-'}
                      </td>

                      <td>
                        {renderStatusBadge(payment)}
                      </td>

                      <td className="text-right">
                        {!payment ? (
                          <button
                            onClick={() => activeTab === 'monthly' ? createMonthlyRecord(athlete) : renewPackage(athlete)}
                            className="btn-secondary btn-sm text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {activeTab === 'monthly' ? 'Oluştur' : 'Paket Tanımla'}
                          </button>
                        ) : payment.status !== 'Ödendi' ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openPayModal(payment)}
                              className="btn-primary btn-sm text-xs bg-green-600 hover:bg-green-700 border-none"
                            >
                              <DollarSign className="w-3 h-3 mr-1" />
                              Ödeme Al
                            </button>

                            <button
                              onClick={() => handleEditClick(payment)}
                              className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 text-xs border border-blue-100"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRevertPayment(payment)}
                              className="p-1 text-red-300 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Geri Al"
                            >
                              <Undo2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}

                {getFilteredAthletes().length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-400">
                      Sonuç bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAY MODAL */}
      <AnimatePresence>
        {showPayModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowPayModal(false)}
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
                  {selectedItem.athlete?.firstName} {selectedItem.athlete?.lastName} -
                  {activeTab === 'monthly' ? ` ${getMonthName(selectedItem.period?.month)}` : ` ${selectedItem.packageNumber}. Paket`}
                </p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
                {/* Özet Kartları */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Tutar</p>
                    <p className="font-bold text-gray-800">{formatCurrency(selectedItem.amount)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-green-600">Ödenen</p>
                    <p className="font-bold text-green-700">{formatCurrency(selectedItem.paidAmount || 0)}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-red-600">Kalan</p>
                    <p className="font-bold text-red-700">{formatCurrency(selectedItem.amount - (selectedItem.paidAmount || 0))}</p>
                  </div>
                </div>

                {/* Ödeme Metodu */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayData({ ...payData, isPartial: false, amount: selectedItem.amount - (selectedItem.paidAmount || 0) })}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1 transition-all
                        ${!payData.isPartial ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Tam Ödeme</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayData({ ...payData, isPartial: true, amount: '' })}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1 transition-all
                        ${payData.isPartial ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <PieChart className="w-5 h-5" />
                    <span className="text-sm font-medium">Kısmi Ödeme</span>
                  </button>
                </div>

                {payData.isPartial && (
                  <div>
                    <label className="label">Ödenecek Tutar</label>
                    <input
                      type="number"
                      value={payData.amount}
                      onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                      className="input"
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div>
                  <label className="label">Ödeme Yöntemi</label>
                  <select
                    value={payData.paymentMethod}
                    onChange={(e) => setPayData({ ...payData, paymentMethod: e.target.value })}
                    className="select"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <button type="submit" className="btn-primary w-full py-3 mt-2">
                  Ödemeyi Onayla
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {showEditModal && selectedItem && (
          <motion.div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <motion.div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Ödeme Düzenle</h3>
                <p className="text-sm text-gray-500">{selectedItem.athlete?.firstName} {selectedItem.athlete?.lastName}</p>
              </div>
              <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                <div>
                  <label className="label">Tutar (₺)</label>
                  <input
                    type="number"
                    className="input"
                    value={editData.amount}
                    onChange={e => setEditData({ ...editData, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Vade Tarihi</label>
                  <input
                    type="date"
                    className="input"
                    value={editData.dueDate}
                    onChange={e => setEditData({ ...editData, dueDate: e.target.value })}
                  />
                </div>
                <button className="btn-primary w-full">Güncelle</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE MANUAL MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <motion.div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Manuel Ödeme Oluştur</h3>
              </div>
              <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                <div>
                  <label className="label">Sporcu Seç</label>
                  <select
                    className="select"
                    value={createData.athleteId}
                    onChange={e => setCreateData({ ...createData, athleteId: e.target.value })}
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {athletes.map(a => (
                      <option key={a._id} value={a._id}>{a.firstName} {a.lastName} - {a.membershipType}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Ödeme Tipi</label>
                  <select
                    className="select"
                    value={createData.paymentType}
                    onChange={e => setCreateData({ ...createData, paymentType: e.target.value })}
                  >
                    <option value="Aylık">Aylık</option>
                    <option value="8 Seanslık">8 Seanslık Paket</option>
                  </select>
                </div>

                {createData.paymentType === 'Aylık' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Ay</label>
                      <select
                        className="select"
                        value={createData.month}
                        onChange={e => setCreateData({ ...createData, month: parseInt(e.target.value) })}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{getMonthName(m)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Yıl</label>
                      <input
                        type="number"
                        className="input"
                        value={createData.year}
                        onChange={e => setCreateData({ ...createData, year: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Tutar (₺)</label>
                  <input
                    type="number"
                    className="input"
                    value={createData.amount}
                    onChange={e => setCreateData({ ...createData, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Vade Tarihi</label>
                  <input
                    type="date"
                    className="input"
                    value={createData.dueDate}
                    onChange={e => setCreateData({ ...createData, dueDate: e.target.value })}
                  />
                </div>
                <button className="btn-primary w-full">Oluştur</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
