// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Seans & Yoklama Takvimi
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api, { formatDate } from '../utils/api'
import toast from 'react-hot-toast'
import {
  Plus, Calendar as CalendarIcon, Clock, Users, X, Trash2, Eye, Check, UserPlus,
  Package, AlertCircle, ChevronLeft, ChevronRight, UserMinus, Pencil, List, LayoutGrid,
  MoreVertical, Filter
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  isToday, parseISO, startOfDay
} from 'date-fns'
import { tr } from 'date-fns/locale'

export default function Sessions() {
  // View State
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'list'
  const [currentDate, setCurrentDate] = useState(new Date()) // For calendar navigation
  const [selectedDate, setSelectedDate] = useState(new Date()) // Selected day for detail view

  // Data State
  const [sessions, setSessions] = useState([])
  const [monthlySessions, setMonthlySessions] = useState([]) // All sessions for current month
  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)

  // List View Pagination
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 })

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    attendees: [],
    notes: ''
  })
  const [searchAthlete, setSearchAthlete] = useState('')
  const [showAddAttendeeModal, setShowAddAttendeeModal] = useState(false)
  const [addAttendeeSearch, setAddAttendeeSearch] = useState('')

  useEffect(() => {
    fetchAthletes()
  }, [])

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchMonthlySessions()
    } else {
      fetchSessionsList()
    }
  }, [viewMode, currentDate, pagination.current])

  // Fetch sessions for the specific month (Calendar View)
  const fetchMonthlySessions = async () => {
    try {
      setLoading(true)
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 100 // Fetch enough for the month
      })

      const response = await api.get(`/sessions?${params}`)
      setMonthlySessions(response.data.data)
    } catch (error) {
      toast.error('Aylık veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Fetch paginated sessions (List View)
  const fetchSessionsList = async () => {
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
      toast.error('Liste yüklenemedi')
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

  // --- Calendar Logic ---
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const onDateClick = (day) => {
    setSelectedDate(day)
  }

  // --- Handlers ---
  const handleCreateSession = (date = null) => {
    setFormData({
      date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      time: '10:00',
      attendees: [],
      notes: ''
    })
    setSearchAthlete('')
    setShowCreateModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu yoklamayı silmek istediğinizden emin misiniz? Seans hakları iade edilecek.')) return
    try {
      await api.delete(`/sessions/${id}`)
      toast.success('Yoklama silindi')
      if (viewMode === 'calendar') fetchMonthlySessions()
      else fetchSessionsList()
      // If we deleted the selected session in detail view, close it
      if (selectedSession?._id === id) setShowDetailModal(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Silme işlemi başarısız')
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (formData.attendees.length === 0) {
      toast.error('En az bir sporcu seçmelisiniz')
      return
    }

    try {
      await api.post('/sessions', formData)
      toast.success('Yoklama oluşturuldu')
      setShowCreateModal(false)
      if (viewMode === 'calendar') fetchMonthlySessions()
      else fetchSessionsList()
      fetchAthletes()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Oluşturulamadı')
    }
  }

  const handleAddAttendee = async (athleteId) => {
    if (!selectedSession) return
    try {
      const response = await api.post(`/sessions/${selectedSession._id}/add-attendee`, { athleteId })
      setSelectedSession(response.data.data)
      setShowAddAttendeeModal(false)
      setAddAttendeeSearch('')
      fetchAthletes()
      toast.success('Sporcu eklendi')
      // Refresh list to update counts
      if (viewMode === 'calendar') fetchMonthlySessions()
      else fetchSessionsList()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ekleme başarısız')
    }
  }

  const handleRemoveAttendee = async (athleteId) => {
    if (!selectedSession) return
    if (!confirm('Bu sporcuyu yoklamadan çıkarmak istediğinize emin misiniz?')) return
    try {
      const response = await api.delete(`/sessions/${selectedSession._id}/remove-attendee/${athleteId}`)
      setSelectedSession(response.data.data)
      fetchAthletes()
      toast.success('Sporcu çıkarıldı')
      if (viewMode === 'calendar') fetchMonthlySessions()
      else fetchSessionsList()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Çıkarma başarısız')
    }
  }

  const openDetailModal = async (session) => {
    try {
      // Fetch full details including populated fields if necessary, 
      // though monthly list might preserve some. Safer to fetch fresh.
      const response = await api.get(`/sessions/${session._id}`)
      setSelectedSession(response.data.data)
      setShowDetailModal(true)
      setShowAddAttendeeModal(false)
    } catch (error) {
      toast.error('Detaylar alınamadı')
    }
  }

  // --- Filtering Helpers ---
  const filteredAthletes = athletes.filter(a =>
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchAthlete.toLowerCase()) ||
    a.tcNo.includes(searchAthlete)
  )

  const toggleAttendee = (id) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(id)
        ? prev.attendees.filter(a => a !== id)
        : [...prev.attendees, id]
    }))
  }

  // Get sessions for selected date
  const sessionsForSelectedDate = monthlySessions.filter(s =>
    isSameDay(parseISO(s.date), selectedDate)
  )

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Seans Takvimi</h1>
          <p className="text-gray-500 text-sm mt-1">Yoklamaları yönetin ve planlayın</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'calendar'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <button onClick={() => handleCreateSession(new Date())} className="btn-primary whitespace-nowrap">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Yeni Seans</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <>
            {/* Calendar Grid */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              {/* Calendar Controls */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 capitalize w-48">
                    {format(currentDate, 'MMMM yyyy', { locale: tr })}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={handleToday} className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-lg text-gray-600">
                      Bugün
                    </button>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                  <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-gray-50/30">
                {(() => {
                  const monthStart = startOfMonth(currentDate)
                  const monthEnd = endOfMonth(monthStart)
                  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
                  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
                  const dateFormat = "d"
                  const rows = []
                  let days = []
                  let day = startDate
                  let formattedDate = ""

                  while (day <= endDate) {
                    for (let i = 0; i < 7; i++) {
                      formattedDate = format(day, dateFormat)
                      const cloneDay = day

                      // Find sessions for this day
                      const daySessions = monthlySessions.filter(s => isSameDay(parseISO(s.date), cloneDay))

                      days.push(
                        <div
                          key={day}
                          className={`min-h-[100px] border-b border-r border-gray-100 p-2 transition-colors relative group
                            ${!isSameMonth(day, monthStart) ? "bg-gray-50/50 text-gray-400" : "bg-white"}
                            ${isSameDay(day, selectedDate) ? "ring-2 ring-inset ring-primary-500 bg-primary-50/30" : "hover:bg-gray-50"}
                            ${isToday(day) ? "bg-blue-50/30" : ""}
                          `}
                          onClick={() => onDateClick(cloneDay)}
                        >
                          <div className={`flex justify-between items-start mb-1`}>
                            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                              ${isToday(day) ? "bg-primary-600 text-white" : "text-gray-700"}
                            `}>
                              {formattedDate}
                            </span>
                          </div>

                          {/* Session Indicators */}
                          <div className="space-y-1">
                            {daySessions.map((session, idx) => (
                              <div
                                key={session._id}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-primary-100 bg-primary-50 text-primary-700 truncate font-medium flex items-center gap-1"
                              >
                                <span className="opacity-75">{session.time}</span>
                                <span>• {session.attendees?.length || 0} Kişi</span>
                              </div>
                            ))}
                            {daySessions.length > 3 && (
                              <div className="text-[10px] text-gray-400 pl-1">
                                +{daySessions.length - 3} daha
                              </div>
                            )}
                          </div>

                          {/* Add button on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCreateSession(cloneDay)
                            }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-primary-50 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-100"
                            title="Bu güne seans ekle"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )
                      day = new Date(day.getTime() + 24 * 60 * 60 * 1000)
                    }
                    rows.push(<div className="contents" key={day}>{days}</div>)
                    days = []
                  }
                  return rows
                })()}
              </div>
            </div>

            {/* Side Panel: Daily Agenda */}
            <div className="w-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                  {format(selectedDate, 'd MMMM EEEE', { locale: tr })}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {sessionsForSelectedDate.length} seans planlandı
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sessionsForSelectedDate.length > 0 ? (
                  sessionsForSelectedDate.map(session => (
                    <div
                      key={session._id}
                      onClick={() => openDetailModal(session)}
                      className="group p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 text-primary-700 font-semibold">
                          <Clock className="w-4 h-4" />
                          {session.time}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${session.status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {session.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                        <Users className="w-4 h-4" />
                        <span>{session.attendees?.length || 0} Sporcu</span>
                      </div>

                      {session.notes && (
                        <p className="text-xs text-gray-400 line-clamp-1 italic">
                          {session.notes}
                        </p>
                      )}

                      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-primary-600 font-medium">Detayları Gör →</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CalendarIcon className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">Bugün için planlanmış<br />seans bulunmuyor</p>
                    <button
                      onClick={() => handleCreateSession(selectedDate)}
                      className="mt-4 text-sm text-primary-600 font-medium hover:text-primary-700"
                    >
                      + Seans Oluştur
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* List View (Table Backup) */}
        {viewMode === 'list' && (
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col p-6 overflow-y-auto">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Saat</th>
                    <th>Katılımcı</th>
                    <th>Durum</th>
                    <th>Not</th>
                    <th className="text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session._id} className="hover:bg-gray-50">
                      <td className="font-medium text-gray-900">{formatDate(session.date)}</td>
                      <td>{session.time}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                          <Users className="w-3 h-3" />
                          {session.attendees?.length || 0}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${session.status === 'Aktif' ? 'badge-success' : 'badge-secondary'}`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="text-gray-500 text-sm max-w-xs truncate">{session.notes || '-'}</td>
                      <td className="text-right space-x-2">
                        <button onClick={() => openDetailModal(session)} className="text-gray-400 hover:text-primary-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(session._id)} className="text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button className="btn-secondary btn-sm" disabled={pagination.current === 1} onClick={() => setPagination(p => ({ ...p, current: p.current - 1 }))}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">Sayfa {pagination.current} / {pagination.pages}</span>
                <button className="btn-secondary btn-sm" disabled={pagination.current === pagination.pages} onClick={() => setPagination(p => ({ ...p, current: p.current + 1 }))}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Create Session Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="modal-content max-w-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Seans Oluştur - {format(parseISO(formData.date), 'd MMMM', { locale: tr })}</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tarih</label>
                    <input type="date" className="input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Saat</label>
                    <input type="time" className="input" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} required />
                  </div>
                </div>

                <div>
                  <label className="label">Sporcular ({formData.attendees.length} Seçili)</label>
                  <input
                    type="text"
                    placeholder="İsim veya TC No ile ara..."
                    className="input mb-2"
                    value={searchAthlete}
                    onChange={e => setSearchAthlete(e.target.value)}
                  />
                  <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {filteredAthletes.map(athlete => {
                      const isSelected = formData.attendees.includes(athlete._id)
                      return (
                        <div
                          key={athlete._id}
                          onClick={() => toggleAttendee(athlete._id)}
                          className={`p-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-primary-50' : ''}`}
                        >
                          <span className="text-sm font-medium">{athlete.firstName} {athlete.lastName}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                        </div>
                      )
                    })}
                    {filteredAthletes.length === 0 && <p className="p-4 text-center text-gray-500 text-sm">Sporcu bulunamadı</p>}
                  </div>
                </div>

                <div>
                  <label className="label">Notlar</label>
                  <textarea className="input" rows="2" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Opsiyonel not..." />
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">İptal</button>
                  <button type="submit" className="btn-primary">Oluştur</button>
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
              <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {formatDate(selectedSession.date)}
                    <span className="text-gray-400 font-normal">| {selectedSession.time}</span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedSession.status}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary-500" />
                    Katılımcılar ({selectedSession.attendees?.length || 0})
                  </h4>
                  <button onClick={() => setShowAddAttendeeModal(!showAddAttendeeModal)} className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
                    <UserPlus className="w-4 h-4" /> Ekle
                  </button>
                </div>

                {showAddAttendeeModal && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <input
                      autoFocus
                      type="text"
                      className="input bg-white"
                      placeholder="Hızlı ekle (İsim/TC)..."
                      value={addAttendeeSearch}
                      onChange={e => setAddAttendeeSearch(e.target.value)}
                    />
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                      {athletes.filter(a =>
                        !selectedSession.attendees.some(att => (typeof att.athlete === 'object' ? att.athlete._id : att.athlete) === a._id) &&
                        (`${a.firstName} ${a.lastName}`.toLowerCase().includes(addAttendeeSearch.toLowerCase()))
                      ).map(athlete => (
                        <div key={athlete._id} onClick={() => handleAddAttendee(athlete._id)} className="flex justify-between items-center p-2 hover:bg-white rounded-lg cursor-pointer text-sm">
                          <span>{athlete.firstName} {athlete.lastName}</span>
                          <span className="text-primary-600 font-bold">+</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {selectedSession.attendees?.map((att, idx) => {
                    const athlete = att.athlete
                    const isObject = typeof athlete === 'object'
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                            {isObject ? athlete.firstName?.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{isObject ? `${athlete.firstName} ${athlete.lastName}` : 'Yükleniyor...'}</p>
                            <p className="text-[10px] text-gray-500">{isObject && athlete.membershipType}</p>
                          </div>
                        </div>
                        {isObject && (
                          <button
                            onClick={() => handleRemoveAttendee(athlete._id)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Çıkar"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {selectedSession.attendees?.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Katılımcı yok</p>}
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div className="text-xs text-gray-400">
                    ID: {selectedSession._id.slice(-6)}
                  </div>
                  <button
                    onClick={() => handleDelete(selectedSession._id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Yoklamayı Sil
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
