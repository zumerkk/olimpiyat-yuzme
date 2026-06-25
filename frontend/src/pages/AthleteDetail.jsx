// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Athlete Detail Page
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api, { formatDate, formatCurrency, getMonthName } from '../utils/api'
import toast from 'react-hot-toast'
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, CreditCard,
  Heart, Users, CheckCircle, Clock, AlertTriangle, Edit2,
  Package, RefreshCw, TrendingDown, PieChart, DollarSign,
  Trash2, MessageSquare, Send, StickyNote
} from 'lucide-react'

const NOTE_CATEGORIES = [
  { value: 'Genel', label: 'Genel', color: 'bg-gray-100 text-gray-700' },
  { value: 'Davranış', label: 'Davranış', color: 'bg-blue-100 text-blue-700' },
  { value: 'Sağlık', label: 'Sağlık', color: 'bg-red-100 text-red-700' },
  { value: 'Ödeme', label: 'Ödeme', color: 'bg-green-100 text-green-700' },
  { value: 'Performans', label: 'Performans', color: 'bg-purple-100 text-purple-700' },
  { value: 'İletişim', label: 'İletişim', color: 'bg-amber-100 text-amber-700' },
]

export default function AthleteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [athlete, setAthlete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState('Genel')
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    fetchAthlete()
  }, [id])

  const fetchAthlete = async () => {
    try {
      const response = await api.get(`/athletes/${id}`)
      setAthlete(response.data.data)
    } catch (error) {
      toast.error('Sporcu bilgileri yüklenemedi')
      navigate('/panel/sporcular')
    } finally {
      setLoading(false)
    }
  }

  const handleRenewPackage = async () => {
    if (!confirm('Paketi yenilemek istediğinizden emin misiniz? 8 seans hakkı eklenecek.')) return
    try {
      await api.post(`/athletes/${id}/renew-package`)
      toast.success('Paket yenilendi, 8 seans hakkı eklendi')
      fetchAthlete()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Paket yenileme başarısız')
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!noteContent.trim()) return
    setAddingNote(true)
    try {
      await api.post(`/athletes/${id}/notes`, { content: noteContent, category: noteCategory })
      toast.success('Not eklendi')
      setNoteContent('')
      setNoteCategory('Genel')
      fetchAthlete()
    } catch (error) {
      toast.error('Not eklenemedi')
    } finally {
      setAddingNote(false)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return
    try {
      await api.delete(`/athletes/${id}/notes/${noteId}`)
      toast.success('Not silindi')
      fetchAthlete()
    } catch (error) {
      toast.error('Not silinemedi')
    }
  }

  const getCategoryStyle = (cat) => NOTE_CATEGORIES.find(c => c.value === cat)?.color || 'bg-gray-100 text-gray-700'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!athlete) return null

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/panel/sporcular')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5" />
        Sporculara Dön
      </button>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center text-white text-4xl font-bold">
              {athlete.firstName?.charAt(0)}{athlete.lastName?.charAt(0)}
            </div>
            <div className="flex-1 text-white">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-display font-bold">
                  {athlete.firstName} {athlete.lastName}
                </h1>
                <span className={`badge ${
                  athlete.status === 'Aktif' ? 'bg-emerald-400 text-emerald-900' :
                  athlete.status === 'Pasif' ? 'bg-amber-400 text-amber-900' : 'bg-gray-400'
                }`}>
                  {athlete.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-primary-100">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" /> {athlete.gender}, {athlete.age} yaş
                </span>
                <span className="flex items-center gap-1">
                  {athlete.membershipType === 'Aylık' ? (
                    <><Calendar className="w-4 h-4" /> Aylık Üyelik</>
                  ) : (
                    <><Package className="w-4 h-4" /> 8 Seanslık Paket</>
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/panel/sporcular')}
              className="btn bg-white/20 text-white hover:bg-white/30"
            >
              <Edit2 className="w-4 h-4" />
              Düzenle
            </button>
          </div>
        </div>

        {/* Membership Info Bar */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              {athlete.membershipType === 'Aylık' ? (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Üyelik Tipi</p>
                    <p className="font-semibold text-blue-600">Aylık - Sınırsız Seans</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      (athlete.remainingSessions ?? 0) < 0 ? 'bg-red-100' :
                      (athlete.remainingSessions ?? 0) <= 2 ? 'bg-red-100' : 'bg-purple-100'
                    }`}>
                      <Package className={`w-5 h-5 ${
                        (athlete.remainingSessions ?? 0) < 0 ? 'text-red-600' :
                        (athlete.remainingSessions ?? 0) <= 2 ? 'text-red-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Kalan Seans</p>
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-lg ${
                          (athlete.remainingSessions ?? 0) < 0 ? 'text-red-600' :
                          (athlete.remainingSessions ?? 0) <= 2 ? 'text-red-600' : 'text-purple-600'
                        }`}>
                          {athlete.remainingSessions ?? 0} / 8
                        </p>
                        {(athlete.remainingSessions ?? 0) < 0 && (
                          <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold animate-pulse">
                            Borçlu Giriş!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Toplam Kullanılan</p>
                      <p className="font-semibold text-gray-700">{athlete.totalSessionsUsed || 0} seans</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            {athlete.membershipType === '8 Seanslık' && athlete.remainingSessions <= 2 && (
              <button onClick={handleRenewPackage} className="btn-success">
                <RefreshCw className="w-4 h-4" />
                Paketi Yenile (+8 Seans)
              </button>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Telefon</p>
              <p className="font-medium text-gray-900">{athlete.phone || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">E-posta</p>
              <p className="font-medium text-gray-900">{athlete.email || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Adres</p>
              <p className="font-medium text-gray-900 truncate">{athlete.address || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Kayıt Tarihi</p>
              <p className="font-medium text-gray-900">{formatDate(athlete.createdAt)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Guardian Info */}
        {athlete.guardian?.name && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              Veli Bilgileri
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Ad Soyad</span>
                <span className="font-medium text-gray-900">{athlete.guardian.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telefon</span>
                <span className="font-medium text-gray-900">{athlete.guardian.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Yakınlık</span>
                <span className="font-medium text-gray-900">{athlete.guardian.relation || '-'}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Health Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Sağlık Bilgileri
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Kan Grubu</span>
              <span className="font-medium text-gray-900">{athlete.healthInfo?.bloodType || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Yüzme Biliyor mu?</span>
              <span className="font-medium text-gray-900">
                {athlete.healthInfo?.canSwim ? 'Evet' : 'Hayır'}
              </span>
            </div>
            {athlete.healthInfo?.allergies && (
              <div>
                <span className="text-gray-500 block mb-1">Alerjiler</span>
                <span className="font-medium text-gray-900">{athlete.healthInfo.allergies}</span>
              </div>
            )}
            {athlete.healthInfo?.medicalConditions && (
              <div>
                <span className="text-gray-500 block mb-1">Sağlık Durumu</span>
                <span className="font-medium text-gray-900">{athlete.healthInfo.medicalConditions}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Sessions (Yoklamalar) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Son Katıldığı Yoklamalar</h3>
        </div>
        
        {athlete.recentSessions?.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {athlete.recentSessions.map((session) => (
              <div key={session._id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(session.date)}</p>
                    <p className="text-sm text-gray-500">Saat: {session.time}</p>
                  </div>
                </div>
                <span className="badge badge-success">Katıldı</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Henüz yoklama kaydı yok
          </div>
        )}
      </motion.div>

      {/* Payment Summary Card - Borç/Ödeme Özeti */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary-600" />
          Ödeme Özeti
        </h3>
        
        <div className="grid sm:grid-cols-4 gap-4">
          {/* Aylık/Paket Ücreti */}
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <DollarSign className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-1">
              {athlete.membershipType === 'Aylık' ? 'Aylık Ücret' : 'Paket Ücreti'}
            </p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(athlete.membershipType === 'Aylık' ? athlete.monthlyFee : athlete.packageFee)}
            </p>
          </div>
          
          {/* Toplam Ödenen */}
          <div className="p-4 bg-green-50 rounded-xl text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-green-600 mb-1">Toplam Ödenen</p>
            <p className="text-xl font-bold text-green-700">
              {formatCurrency(athlete.paymentSummary?.totalPaid || 0)}
            </p>
          </div>
          
          {/* Toplam Borç - Hesaplanacak */}
          <div className="p-4 bg-red-50 rounded-xl text-center">
            <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-1">Toplam Borç</p>
            <p className="text-xl font-bold text-red-700">
              {formatCurrency(
                athlete.payments?.reduce((total, p) => {
                  if (p.status !== 'Ödendi' && p.status !== 'İptal') {
                    return total + (p.amount - (p.paidAmount || 0))
                  }
                  return total
                }, 0) || 0
              )}
            </p>
          </div>
          
          {/* Kısmi Ödemeler */}
          <div className="p-4 bg-blue-50 rounded-xl text-center">
            <PieChart className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-blue-600 mb-1">Kısmi Ödeme</p>
            <p className="text-xl font-bold text-blue-700">
              {athlete.payments?.filter(p => p.status === 'Kısmi Ödeme').length || 0} adet
            </p>
          </div>
        </div>
        
        {/* Son Ödeme Tarihi - Belirgin Gösterim */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {athlete.paymentSummary?.lastPaymentDate ? (
            (() => {
              const lastDate = new Date(athlete.paymentSummary.lastPaymentDate)
              const daysSince = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24))
              const isWarning = daysSince > 30
              return (
                <div className={`flex items-center justify-center gap-3 p-3 rounded-xl ${isWarning ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <CreditCard className={`w-5 h-5 ${isWarning ? 'text-red-500' : 'text-green-500'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${isWarning ? 'text-red-700' : 'text-green-700'}`}>
                      Son Ödeme: {formatDate(athlete.paymentSummary.lastPaymentDate)}
                    </p>
                    <p className={`text-xs ${isWarning ? 'text-red-500' : 'text-green-500'}`}>
                      {daysSince === 0 ? 'Bugün' : `${daysSince} gün önce`}
                      {isWarning && ' ⚠️ Uzun süredir ödeme yok!'}
                    </p>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-sm text-amber-700 font-medium">Henüz hiç ödeme yapılmamış</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Ödeme Geçmişi</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              Toplam Tahsilat: <span className="font-semibold text-green-600">{formatCurrency(athlete.paymentSummary?.totalPaid || 0)}</span>
            </span>
          </div>
        </div>
        
        {athlete.payments?.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Dönem/Paket</th>
                  <th>Tip</th>
                  <th>Beklenen</th>
                  <th>Ödenen</th>
                  <th>Kalan Borç</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {athlete.payments.map((payment) => {
                  const remaining = payment.amount - (payment.paidAmount || 0)
                  const paidPercent = payment.amount > 0 ? Math.round(((payment.paidAmount || 0) / payment.amount) * 100) : 100
                  
                  return (
                    <tr key={payment._id}>
                      <td className="font-medium">
                        {payment.paymentType === 'Aylık' 
                          ? `${getMonthName(payment.period?.month)} ${payment.period?.year}`
                          : `${payment.packageNumber}. Paket`
                        }
                      </td>
                      <td>
                        <span className={`badge ${payment.paymentType === 'Aylık' ? 'badge-info' : 'badge-primary'}`}>
                          {payment.paymentType}
                        </span>
                      </td>
                      <td className="font-semibold text-gray-700">{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className={`font-semibold ${(payment.paidAmount || 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {formatCurrency(payment.paidAmount || 0)}
                        </span>
                        {payment.paidAmount > 0 && payment.paidAmount < payment.amount && (
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td>
                        {remaining > 0 ? (
                          <span className="font-bold text-red-600">{formatCurrency(remaining)}</span>
                        ) : (
                          <span className="text-green-600 font-medium">Tamam ✓</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge flex items-center gap-1 w-fit ${
                          payment.status === 'Ödendi' ? 'badge-success' :
                          payment.status === 'Gecikmiş' ? 'badge-danger' :
                          payment.status === 'Kısmi Ödeme' ? 'badge-info' :
                          payment.status === 'Beklemede' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {payment.status === 'Ödendi' && <CheckCircle className="w-3 h-3" />}
                          {payment.status === 'Beklemede' && <Clock className="w-3 h-3" />}
                          {payment.status === 'Gecikmiş' && <AlertTriangle className="w-3 h-3" />}
                          {payment.status === 'Kısmi Ödeme' && <PieChart className="w-3 h-3" />}
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Henüz ödeme kaydı yok
          </div>
        )}
      </motion.div>

      {/* Profil Notları - Not Defteri */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary-600" />
            Profil Notları
            {athlete.profileNotes?.length > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                {athlete.profileNotes.length}
              </span>
            )}
          </h3>
        </div>

        {/* Not Ekleme Formu */}
        <form onSubmit={handleAddNote} className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Sporcu hakkında not ekleyin..."
                className="input text-sm"
                rows={2}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Kategori:</span>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
              >
                {NOTE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!noteContent.trim() || addingNote}
              className="btn-primary btn-sm text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              {addingNote ? 'Ekleniyor...' : 'Not Ekle'}
            </button>
          </div>
        </form>

        {/* Not Listesi */}
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {athlete.profileNotes?.length > 0 ? (
            [...athlete.profileNotes].reverse().map((note) => (
              <div key={note._id} className="p-4 hover:bg-gray-50 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCategoryStyle(note.category)}`}>
                        {note.category}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note._id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Notu Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Henüz not eklenmemiş</p>
            </div>
          )}
        </div>

        {/* Eski notlar (geriye uyumluluk) */}
        {athlete.notes && (
          <div className="p-4 bg-amber-50/50 border-t border-amber-100">
            <p className="text-xs text-amber-600 font-medium mb-1">Eski Not:</p>
            <p className="text-sm text-gray-600">{athlete.notes}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
