// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Yoklama Sistemi
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api, { formatDate } from '../utils/api'
import toast from 'react-hot-toast'
import {
  Plus, Calendar, Clock, Users, X, Trash2, Eye, Check, UserPlus,
  Package, AlertCircle, ChevronLeft, ChevronRight, UserMinus, Pencil
} from 'lucide-react'

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    attendees: [],
    notes: ''
  })
  const [searchAthlete, setSearchAthlete] = useState('')
  const [showAddAttendeeModal, setShowAddAttendeeModal] = useState(false)
  const [addAttendeeSearch, setAddAttendeeSearch] = useState('')

  useEffect(() => {
    fetchSessions()
    fetchAthletes()
  }, [pagination.current])

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 15,
        sortBy: 'date',
        sortOrder: 'desc'
      })
      const response = await api.get(`/sessions?${params}`)
      setSessions(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error('Yoklamalar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const fetchAthletes = async () => {
    try {
      const response = await api.get('/athletes/active')
      setAthletes(response.data.data)
    } catch (error) {
      console.error('Athletes fetch error:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.attendees.length === 0) {
      toast.error('En az bir sporcu seçmelisiniz')
      return
    }

    try {
      await api.post('/sessions', formData)
      toast.success('Yoklama oluşturuldu ve seans hakları güncellendi')
      setShowModal(false)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        attendees: [],
        notes: ''
      })
      fetchSessions()
      fetchAthletes() // Güncel seans haklarını almak için
    } catch (error) {
      toast.error(error.response?.data?.message || 'Yoklama oluşturulamadı')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu yoklamayı silmek istediğinizden emin misiniz? Seans hakları iade edilecek.')) return
    try {
      await api.delete(`/sessions/${id}`)
      toast.success('Yoklama silindi')
      fetchSessions()
      fetchAthletes()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Silme işlemi başarısız')
    }
  }

  const openDetailModal = async (session) => {
    try {
      const response = await api.get(`/sessions/${session._id}`)
      setSelectedSession(response.data.data)
      setShowDetailModal(true)
      setShowAddAttendeeModal(false)
      setAddAttendeeSearch('')
    } catch (error) {
      toast.error('Yoklama detayları yüklenemedi')
    }
  }

  // Geçmiş seansa sporcu ekle (unutulan isim)
  const handleAddAttendee = async (athleteId) => {
    if (!selectedSession) return
    try {
      const response = await api.post(`/sessions/${selectedSession._id}/add-attendee`, { athleteId })
      setSelectedSession(response.data.data)
      setShowAddAttendeeModal(false)
      setAddAttendeeSearch('')
      fetchAthletes()
      toast.success('Sporcu seansa eklendi ve seans hakkı düşürüldü')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ekleme işlemi başarısız')
    }
  }

  // Geçmiş seansdan sporcu kaldır (yanlışlıkla eklenen)
  const handleRemoveAttendee = async (athleteId) => {
    if (!selectedSession) return
    if (!confirm('Bu sporcuyu yoklamadan çıkaracaksınız. Seans hakkı iade edilecek. Devam?')) return
    try {
      const response = await api.delete(`/sessions/${selectedSession._id}/remove-attendee/${athleteId}`)
      setSelectedSession(response.data.data)
      fetchAthletes()
      toast.success('Sporcu yoklamadan çıkarıldı, seans hakkı iade edildi')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Kaldırma işlemi başarısız')
    }
  }

  const toggleAttendee = (athleteId) => {
    const isSelected = formData.attendees.includes(athleteId)
    if (isSelected) {
      setFormData({
        ...formData,
        attendees: formData.attendees.filter(id => id !== athleteId)
      })
    } else {
      setFormData({
        ...formData,
        attendees: [...formData.attendees, athleteId]
      })
    }
  }

  const filteredAthletes = athletes.filter(a => 
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchAthlete.toLowerCase()) ||
    a.tcNo.includes(searchAthlete)
  )

  // Sporcu ekleme için - zaten yoklamada olanları hariç tut
  const currentAttendeeIds = selectedSession?.attendees?.map(a => 
    typeof a.athlete === 'object' ? a.athlete?._id : a.athlete
  ) || []
  const athletesToAdd = athletes.filter(a => 
    !currentAttendeeIds.includes(a._id) &&
    (`${a.firstName} ${a.lastName}`.toLowerCase().includes(addAttendeeSearch.toLowerCase()) ||
    (a.tcNo || '').includes(addAttendeeSearch))
  )

  const openAddModal = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      attendees: [],
      notes: ''
    })
    setSearchAthlete('')
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Yoklama</h1>
          <p className="text-gray-500 text-sm mt-1">Seans yoklaması oluşturun ve takip edin</p>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="w-5 h-5" />
          Seans Oluştur
        </button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-16 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Henüz yoklama kaydı oluşturulmamış</p>
          <button onClick={openAddModal} className="btn-primary mt-4">
            <Plus className="w-5 h-5" />
            İlk Yoklamayı Oluştur
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Saat</th>
                  <th>Katılımcı Sayısı</th>
                  <th>Durum</th>
                  <th>Not</th>
                  <th className="text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, index) => (
                  <motion.tr
                    key={session._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary-500" />
                        <span className="font-medium">{formatDate(session.date)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{session.time}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-500" />
                        <span className="font-semibold text-green-600">
                          {session.attendees?.length || 0} sporcu
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        session.status === 'Aktif' ? 'badge-success' :
                        session.status === 'Tamamlandı' ? 'badge-info' : 'badge-danger'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-sm text-gray-500">
                      {session.notes || '-'}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetailModal(session)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                          title="Detay / Düzenle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(session._id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
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
        </div>
      )}

      {/* Create Session Modal */}
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
              className="modal-content max-w-3xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Seans Oluştur</h3>
                  <p className="text-sm text-gray-500 mt-1">Katılan sporcuları seçin</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-6">
                {/* Date & Time */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tarih *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Saat</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                {/* Athlete Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="label mb-0">Katılan Sporcular *</label>
                    <span className="text-sm text-primary-600 font-medium">
                      {formData.attendees.length} sporcu seçildi
                    </span>
                  </div>

                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Sporcu ara (isim veya TC No)..."
                    value={searchAthlete}
                    onChange={(e) => setSearchAthlete(e.target.value)}
                    className="input mb-3"
                  />

                  {/* Athletes List */}
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {filteredAthletes.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        Sporcu bulunamadı
                      </div>
                    ) : (
                      filteredAthletes.map((athlete) => {
                        const isSelected = formData.attendees.includes(athlete._id)
                        const isPackage = athlete.membershipType === '8 Seanslık'
                        const isLowSessions = isPackage && athlete.remainingSessions <= 2

                        return (
                          <div
                            key={athlete._id}
                            onClick={() => toggleAttendee(athlete._id)}
                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-primary-50 border-l-4 border-primary-500' 
                                : 'hover:bg-gray-50 border-l-4 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                isSelected ? 'bg-primary-500' : 'bg-gray-400'
                              }`}>
                                {isSelected ? <Check className="w-4 h-4" /> : athlete.firstName?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {athlete.firstName} {athlete.lastName}
                                </p>
                                <p className="text-xs text-gray-500">{athlete.tcNo}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPackage ? (
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                                  isLowSessions 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  <Package className="w-3.5 h-3.5" />
                                  <span>{athlete.remainingSessions}/8</span>
                                  {isLowSessions && <AlertCircle className="w-3.5 h-3.5" />}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>Aylık</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Seans Hakkı Bilgisi</p>
                        <p className="text-xs mt-1">
                          • <strong>Aylık üyelik:</strong> Sınırsız seans, her ayın 15'inde ödeme<br />
                          • <strong>8 Seanslık paket:</strong> Her yoklamada 1 hak düşer, 8 seansta ödeme
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="label">Not</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="İsteğe bağlı not..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                    İptal
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={formData.attendees.length === 0}
                  >
                    <UserPlus className="w-4 h-4" />
                    Yoklama Oluştur ({formData.attendees.length} sporcu)
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedSession && (
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
              className="modal-content max-w-2xl"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    Yoklama Detayı
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-lg">
                      <Pencil className="w-3.5 h-3.5" />
                      Düzenlenebilir
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(selectedSession.date)} - {selectedSession.time}
                  </p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-500" />
                    Katılan Sporcular ({selectedSession.attendees?.length || 0})
                  </h4>
                  <button
                    onClick={() => setShowAddAttendeeModal(!showAddAttendeeModal)}
                    className="btn-secondary btn-sm flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    Sporcu Ekle
                  </button>
                </div>

                {/* Sporcu Ekleme Alanı */}
                {showAddAttendeeModal && (
                  <div className="mb-4 p-4 bg-primary-50 border border-primary-100 rounded-xl">
                    <p className="text-sm text-primary-800 font-medium mb-3">Unutulan sporcuyu ekle</p>
                    <input
                      type="text"
                      placeholder="Sporcu ara (isim veya TC No)..."
                      value={addAttendeeSearch}
                      onChange={(e) => setAddAttendeeSearch(e.target.value)}
                      className="input mb-3"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {athletesToAdd.length === 0 ? (
                        <p className="text-sm text-gray-500">Eklenebilecek sporcu yok (hepsi zaten listede)</p>
                      ) : (
                        athletesToAdd.map((athlete) => (
                          <div
                            key={athlete._id}
                            onClick={() => handleAddAttendee(athlete._id)}
                            className="flex items-center justify-between p-2 hover:bg-primary-100 rounded-lg cursor-pointer transition-colors"
                          >
                            <span className="font-medium">{athlete.firstName} {athlete.lastName}</span>
                            <span className="text-primary-600 text-sm">+ Ekle</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {selectedSession.attendees?.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedSession.attendees.map((attendee, idx) => {
                      const athlete = attendee.athlete
                      const athleteId = typeof athlete === 'object' ? athlete?._id : athlete
                      const isPackage = athlete?.membershipType === '8 Seanslık'
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                              {athlete?.firstName?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {athlete?.firstName} {athlete?.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{athlete?.tcNo}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {isPackage ? (
                              <span className={`text-sm font-medium ${
                                athlete?.remainingSessions <= 2 ? 'text-red-600' : 'text-purple-600'
                              }`}>
                                {athlete?.remainingSessions}/8 seans
                              </span>
                            ) : (
                              <span className="text-sm text-blue-600 font-medium">Aylık</span>
                            )}
                            {attendee.sessionDeducted && (
                              <span className="badge badge-success text-xs">✓ Düşüldü</span>
                            )}
                            <button
                              onClick={() => athleteId && handleRemoveAttendee(athleteId)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                              title="Yanlışlıkla eklenen - Kaldır (seans hakkı iade)"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Bu seansa katılan sporcu yok</p>
                )}

                {selectedSession.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Not:</strong> {selectedSession.notes}
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800">
                  <p className="font-medium">Geçmiş seans düzenleme</p>
                  <p className="text-xs mt-1">
                    • <strong>Sporcu Ekle:</strong> Unutulan ismi sonradan ekleyebilirsiniz (seans hakkı düşer)<br />
                    • <strong>Kaldır (⟵):</strong> Yanlışlıkla eklenen kişiyi çıkarabilirsiniz (seans hakkı iade)
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
