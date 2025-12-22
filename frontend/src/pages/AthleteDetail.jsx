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
  Package, RefreshCw
} from 'lucide-react'

export default function AthleteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [athlete, setAthlete] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAthlete()
  }, [id])

  const fetchAthlete = async () => {
    try {
      const response = await api.get(`/athletes/${id}`)
      setAthlete(response.data.data)
    } catch (error) {
      toast.error('Sporcu bilgileri yüklenemedi')
      navigate('/sporcular')
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
        onClick={() => navigate('/sporcular')}
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
              onClick={() => navigate('/sporcular')}
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
                      athlete.remainingSessions <= 2 ? 'bg-red-100' : 'bg-purple-100'
                    }`}>
                      <Package className={`w-5 h-5 ${
                        athlete.remainingSessions <= 2 ? 'text-red-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Kalan Seans</p>
                      <p className={`font-bold text-lg ${
                        athlete.remainingSessions <= 2 ? 'text-red-600' : 'text-purple-600'
                      }`}>
                        {athlete.remainingSessions || 0} / 8
                      </p>
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
              Toplam: <span className="font-semibold text-gray-900">{formatCurrency(athlete.paymentSummary?.totalPaid || 0)}</span>
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
                  <th>Tutar</th>
                  <th>Vade</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {athlete.payments.map((payment) => (
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
                    <td className="font-semibold">{formatCurrency(payment.amount)}</td>
                    <td className="text-sm text-gray-500">{formatDate(payment.dueDate)}</td>
                    <td>
                      <span className={`badge ${
                        payment.status === 'Ödendi' ? 'badge-success' :
                        payment.status === 'Gecikmiş' ? 'badge-danger' :
                        payment.status === 'Beklemede' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {payment.status === 'Ödendi' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {payment.status === 'Beklemede' && <Clock className="w-3 h-3 mr-1" />}
                        {payment.status === 'Gecikmiş' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            Henüz ödeme kaydı yok
          </div>
        )}
      </motion.div>

      {/* Notes */}
      {athlete.notes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Notlar</h3>
          <p className="text-gray-600">{athlete.notes}</p>
        </motion.div>
      )}
    </div>
  )
}
