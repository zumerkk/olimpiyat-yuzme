// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Registrations Page (QR & Online)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api, { formatDate, formatDateTime } from '../utils/api'
import toast from 'react-hot-toast'
import {
  QrCode, Link as LinkIcon, UserPlus, Check, X, Eye, Clock, Download, Copy
} from 'lucide-react'

export default function Registrations() {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [qrData, setQrData] = useState(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  const [filter, setFilter] = useState('')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchRegistrations()
    fetchStats()
  }, [filter])

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      const params = filter ? `?status=${filter}` : ''
      const response = await api.get(`/registration${params}`)
      setRegistrations(response.data.data)
    } catch (error) {
      toast.error('Kayıtlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/registration/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Stats error:', error)
    }
  }

  const fetchQrCode = async () => {
    try {
      const response = await api.get('/registration/qr-code')
      setQrData(response.data.data)
      setShowQrModal(true)
    } catch (error) {
      toast.error('QR kod oluşturulamadı')
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.post(`/registration/${id}/approve`)
      toast.success('Kayıt onaylandı ve sporcu oluşturuldu')
      fetchRegistrations()
      fetchStats()
      setShowDetailModal(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Red sebebi (opsiyonel):')
    try {
      await api.post(`/registration/${id}/reject`, { reason })
      toast.success('Kayıt reddedildi')
      fetchRegistrations()
      fetchStats()
      setShowDetailModal(false)
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  const copyLink = () => {
    if (qrData?.url) {
      navigator.clipboard.writeText(qrData.url)
      toast.success('Link kopyalandı')
    }
  }

  const downloadQr = () => {
    if (qrData?.qrCode) {
      const link = document.createElement('a')
      link.download = 'olimpiyat-kayit-qr.png'
      link.href = qrData.qrCode
      link.click()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Online Kayıtlar</h1>
          <p className="text-gray-500 text-sm mt-1">QR kod ve link ile gelen kayıt başvuruları</p>
        </div>
        <button onClick={fetchQrCode} className="btn-primary">
          <QrCode className="w-5 h-5" />
          QR Kod Oluştur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
              <p className="text-xs text-gray-500">Toplam Başvuru</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats?.pending || 0}</p>
              <p className="text-xs text-gray-500">Bekleyen</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats?.approved || 0}</p>
              <p className="text-xs text-gray-500">Onaylanan</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats?.bySource?.['QR Kod'] || 0}</p>
              <p className="text-xs text-gray-500">QR ile Gelen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: '', label: 'Tümü' },
          { key: 'Beklemede', label: 'Bekleyen' },
          { key: 'Onaylandı', label: 'Onaylanan' },
          { key: 'Reddedildi', label: 'Reddedilen' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Registrations List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : registrations.length === 0 ? (
          <div className="p-16 text-center">
            <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Henüz kayıt başvurusu yok</p>
            <button onClick={fetchQrCode} className="btn-primary mt-4">
              <QrCode className="w-5 h-5" />
              QR Kod ile Paylaş
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Başvuran</th>
                  <th>İletişim</th>
                  <th>Kaynak</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th className="text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                          {reg.firstName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{reg.firstName} {reg.lastName}</p>
                          <p className="text-xs text-gray-500">{reg.age} yaş - {reg.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm">{reg.phone}</p>
                      <p className="text-xs text-gray-500">{reg.email}</p>
                    </td>
                    <td>
                      <span className={`badge ${reg.source === 'QR Kod' ? 'badge-primary' : 'badge-info'}`}>
                        {reg.source === 'QR Kod' ? <QrCode className="w-3 h-3 mr-1" /> : <LinkIcon className="w-3 h-3 mr-1" />}
                        {reg.source}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">{formatDate(reg.createdAt)}</td>
                    <td>
                      <span className={`badge ${
                        reg.status === 'Beklemede' ? 'badge-warning' :
                        reg.status === 'Onaylandı' || reg.status === 'Sporcu Oluşturuldu' ? 'badge-success' :
                        'badge-danger'
                      }`}>
                        {reg.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedRegistration(reg)
                            setShowDetailModal(true)
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {reg.status === 'Beklemede' && (
                          <>
                            <button
                              onClick={() => handleApprove(reg._id)}
                              className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                              title="Onayla"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(reg._id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                              title="Reddet"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal && qrData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content max-w-md text-center"
            >
              <div className="p-8">
                <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Online Kayıt QR Kodu</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Bu QR kodu taratarak veya linki paylaşarak online kayıt başvurusu alabilirsiniz.
                </p>
                
                <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 inline-block mb-6">
                  <img src={qrData.qrCode} alt="QR Code" className="w-64 h-64" />
                </div>

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl mb-6">
                  <input
                    type="text"
                    value={qrData.url}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-600 outline-none"
                  />
                  <button onClick={copyLink} className="btn-secondary btn-sm">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={downloadQr} className="btn-primary flex-1">
                    <Download className="w-5 h-5" />
                    QR Kodu İndir
                  </button>
                  <button onClick={() => setShowQrModal(false)} className="btn-secondary flex-1">
                    Kapat
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedRegistration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content max-w-lg"
            >
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Kayıt Detayı</h3>
              </div>
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Ad Soyad</p>
                    <p className="font-medium text-gray-900">
                      {selectedRegistration.firstName} {selectedRegistration.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">TC Kimlik No</p>
                    <p className="font-medium text-gray-900 font-mono">{selectedRegistration.tcNo}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Doğum Tarihi</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedRegistration.birthDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Cinsiyet</p>
                    <p className="font-medium text-gray-900">{selectedRegistration.gender}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Telefon</p>
                    <p className="font-medium text-gray-900">{selectedRegistration.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">E-posta</p>
                    <p className="font-medium text-gray-900">{selectedRegistration.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tercih Edilen Seviye</p>
                    <p className="font-medium text-gray-900">{selectedRegistration.preferredLevel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Yaş Grubu</p>
                    <p className="font-medium text-gray-900">{selectedRegistration.preferredAgeGroup}</p>
                  </div>
                </div>

                {selectedRegistration.guardian?.name && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-2">Veli Bilgileri</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Ad</p>
                        <p className="font-medium text-gray-900">{selectedRegistration.guardian.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Telefon</p>
                        <p className="font-medium text-gray-900">{selectedRegistration.guardian.phone}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Kaynak</span>
                    <span className="badge badge-primary">{selectedRegistration.source}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Başvuru Tarihi</span>
                    <span className="font-medium">{formatDateTime(selectedRegistration.createdAt)}</span>
                  </div>
                </div>
              </div>

              {selectedRegistration.status === 'Beklemede' && (
                <div className="p-5 border-t border-gray-100 flex gap-3">
                  <button
                    onClick={() => handleReject(selectedRegistration._id)}
                    className="btn-danger flex-1"
                  >
                    <X className="w-5 h-5" />
                    Reddet
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRegistration._id)}
                    className="btn-success flex-1"
                  >
                    <Check className="w-5 h-5" />
                    Onayla & Sporcu Oluştur
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

