// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         SMS Yönetim Paneli
//                    BozkurtSMS (www.bozkurtsms.com.tr) Entegrasyonu
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api, { formatDateTime } from '../utils/api'
import toast from 'react-hot-toast'
import {
  MessageSquare, Send, Users, Search, CheckCircle, XCircle, 
  AlertTriangle, RefreshCw, ChevronDown, Filter, BarChart2,
  Phone, User, Clock, FileText, Zap, UserCheck, Calendar
} from 'lucide-react'

export default function SMS() {
  // State
  const [activeTab, setActiveTab] = useState('send') // send, logs, stats
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Send SMS State
  const [sendMode, setSendMode] = useState('single') // single, bulk, group
  const [selectedAthletes, setSelectedAthletes] = useState([])
  const [athletes, setAthletes] = useState([])
  const [athleteSearch, setAthleteSearch] = useState('')
  const [message, setMessage] = useState('')
  const [singlePhone, setSinglePhone] = useState('')
  const [groupType, setGroupType] = useState('active')
  const [useTemplate, setUseTemplate] = useState(false)
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [previewRecipients, setPreviewRecipients] = useState(null)
  const [sending, setSending] = useState(false)
  
  // Logs State
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logFilter, setLogFilter] = useState({ type: '', success: '' })
  const [logPage, setLogPage] = useState(1)
  const [logPagination, setLogPagination] = useState(null)
  
  // Stats State
  const [stats, setStats] = useState(null)
  const [statsPeriod, setStatsPeriod] = useState('month')

  // Initial load
  useEffect(() => {
    fetchStatus()
    fetchTemplates()
    fetchAthletes()
  }, [])

  // Fetch when tab changes
  useEffect(() => {
    if (activeTab === 'logs') fetchLogs()
    if (activeTab === 'stats') fetchStats()
  }, [activeTab])

  // Fetch SMS service status
  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await api.get('/sms/status')
      setStatus(response.data.data)
    } catch (error) {
      toast.error('SMS durumu alınamadı')
    } finally {
      setLoading(false)
    }
  }

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const response = await api.get('/sms/templates')
      setTemplates(response.data.data)
    } catch (error) {
      console.error('Template fetch error:', error)
    }
  }

  // Fetch athletes
  const fetchAthletes = async () => {
    try {
      const response = await api.get('/athletes?limit=500&status=Aktif')
      setAthletes(response.data.data || [])
    } catch (error) {
      console.error('Athletes fetch error:', error)
    }
  }

  // Fetch logs
  const fetchLogs = async (page = 1) => {
    try {
      setLogsLoading(true)
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', 30)
      if (logFilter.type) params.append('type', logFilter.type)
      if (logFilter.success !== '') params.append('success', logFilter.success)
      
      const response = await api.get(`/sms/logs?${params}`)
      setLogs(response.data.data)
      setLogPagination(response.data.pagination)
      setLogPage(page)
    } catch (error) {
      toast.error('SMS logları alınamadı')
    } finally {
      setLogsLoading(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await api.get(`/sms/stats?period=${statsPeriod}`)
      setStats(response.data.data)
    } catch (error) {
      toast.error('İstatistikler alınamadı')
    }
  }

  // Preview recipients for group
  const fetchPreviewRecipients = async (type) => {
    try {
      const response = await api.get(`/sms/preview-recipients?groupType=${type}`)
      setPreviewRecipients(response.data.data)
    } catch (error) {
      toast.error('Alıcı listesi alınamadı')
    }
  }

  // Send single SMS
  const sendSingleSMS = async () => {
    if (!singlePhone || !message) {
      toast.error('Telefon ve mesaj gereklidir')
      return
    }
    
    setSending(true)
    try {
      const response = await api.post('/sms/send', { phone: singlePhone, message })
      if (response.data.success) {
        toast.success('SMS gönderildi')
        setSinglePhone('')
        setMessage('')
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error('SMS gönderilemedi')
    } finally {
      setSending(false)
    }
  }

  // Send bulk SMS
  const sendBulkSMS = async () => {
    if (selectedAthletes.length === 0 || !message) {
      toast.error('En az bir sporcu seçin ve mesaj yazın')
      return
    }
    
    setSending(true)
    try {
      const response = await api.post('/sms/bulk', {
        athleteIds: selectedAthletes,
        message,
        useTemplate
      })
      
      toast.success(`${response.data.data.successful}/${response.data.data.total} SMS gönderildi`)
      setSelectedAthletes([])
      setMessage('')
    } catch (error) {
      toast.error('Toplu SMS gönderilemedi')
    } finally {
      setSending(false)
    }
  }

  // Send group SMS
  const sendGroupSMS = async () => {
    if (!groupType || !message) {
      toast.error('Grup ve mesaj seçin')
      return
    }
    
    setSending(true)
    try {
      const response = await api.post('/sms/group', {
        groupType,
        message,
        useTemplate
      })
      
      toast.success(`${response.data.data.successful}/${response.data.data.total} SMS gönderildi`)
      setMessage('')
      setPreviewRecipients(null)
    } catch (error) {
      toast.error('Grup SMS gönderilemedi')
    } finally {
      setSending(false)
    }
  }

  // Check reminders manually
  const checkReminders = async () => {
    try {
      const response = await api.post('/sms/check-reminders')
      toast.success(`Hatırlatma kontrolü: ${response.data.data.paymentReminders.sms + response.data.data.sessionReminders.sms} SMS gönderildi`)
    } catch (error) {
      toast.error('Hatırlatma kontrolü başarısız')
    }
  }

  // Apply template
  const applyTemplate = (template) => {
    setMessage(template.message)
    setSelectedTemplate(template)
    setUseTemplate(template.variables.length > 0)
  }

  // Toggle athlete selection
  const toggleAthleteSelection = (athleteId) => {
    setSelectedAthletes(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    )
  }

  // Select all filtered athletes
  const selectAllFiltered = () => {
    const filteredIds = filteredAthletes.map(a => a._id)
    setSelectedAthletes(prev => {
      const allSelected = filteredIds.every(id => prev.includes(id))
      if (allSelected) {
        return prev.filter(id => !filteredIds.includes(id))
      }
      return [...new Set([...prev, ...filteredIds])]
    })
  }

  // Filter athletes
  const filteredAthletes = athletes.filter(a => 
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(athleteSearch.toLowerCase()) ||
    a.phone?.includes(athleteSearch) ||
    a.guardian?.phone?.includes(athleteSearch)
  )

  // Group type labels
  const groupLabels = {
    all: 'Tüm Sporcular',
    active: 'Aktif Sporcular',
    passive: 'Pasif Sporcular',
    monthly: 'Aylık Üyeler',
    session: '8 Seanslık Üyeler',
    lowSession: 'Düşük Seans Hakkı (≤2)'
  }

  // SMS type labels
  const typeLabels = {
    monthly_reminder: 'Aylık Hatırlatma',
    monthly_expired: 'Aylık Süresi Doldu',
    session_warning: 'Seans Uyarısı',
    session_expired: 'Seans Doldu',
    payment_confirmation: 'Ödeme Onayı',
    registration: 'Kayıt Onayı',
    bulk: 'Toplu SMS',
    custom: 'Özel Mesaj'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-primary-600" />
            SMS Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            BozkurtSMS ile toplu ve tekil SMS gönderimi
          </p>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          {status?.enabled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              SMS Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              <XCircle className="w-4 h-4" />
              SMS Devre Dışı
            </span>
          )}
          
          <button onClick={checkReminders} className="btn-secondary">
            <Zap className="w-5 h-5" />
            Hatırlatma Kontrolü
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {status?.todayStats && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Bakiye */}
          <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {status.balance?.success ? status.balance.balance : '?'}
                </p>
                <p className="text-sm text-gray-500">SMS Kredisi</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{status.todayStats.total}</p>
                <p className="text-sm text-gray-500">Bugün Gönderilen</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{status.todayStats.successful}</p>
                <p className="text-sm text-gray-500">Başarılı</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-gradient-to-br from-red-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{status.todayStats.failed}</p>
                <p className="text-sm text-gray-500">Başarısız</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'send', label: 'SMS Gönder', icon: Send },
          { key: 'logs', label: 'Gönderim Geçmişi', icon: FileText },
          { key: 'stats', label: 'İstatistikler', icon: BarChart2 }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* SEND TAB */}
        {activeTab === 'send' && (
          <motion.div
            key="send"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Send Mode Selector */}
            <div className="flex gap-2">
              {[
                { key: 'single', label: 'Tekil SMS', icon: User },
                { key: 'bulk', label: 'Seçili Sporcular', icon: UserCheck },
                { key: 'group', label: 'Gruba Gönder', icon: Users }
              ].map(mode => (
                <button
                  key={mode.key}
                  onClick={() => setSendMode(mode.key)}
                  className={`btn-sm flex items-center gap-2 ${
                    sendMode === mode.key ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  <mode.icon className="w-4 h-4" />
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel - Recipients */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Alıcılar</h3>

                {/* Single Mode */}
                {sendMode === 'single' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon Numarası
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={singlePhone}
                        onChange={(e) => setSinglePhone(e.target.value)}
                        placeholder="05XX XXX XX XX"
                        className="input pl-10"
                      />
                    </div>
                  </div>
                )}

                {/* Bulk Mode */}
                {sendMode === 'bulk' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={athleteSearch}
                        onChange={(e) => setAthleteSearch(e.target.value)}
                        placeholder="Sporcu ara..."
                        className="input pl-10"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {selectedAthletes.length} sporcu seçildi
                      </span>
                      <button
                        onClick={selectAllFiltered}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Tümünü Seç/Kaldır
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      {filteredAthletes.map(athlete => (
                        <label
                          key={athlete._id}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAthletes.includes(athlete._id)}
                            onChange={() => toggleAthleteSelection(athlete._id)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {athlete.firstName} {athlete.lastName}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {athlete.phone || athlete.guardian?.phone || 'Telefon yok'}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            athlete.membershipType === 'Aylık' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {athlete.membershipType === 'Aylık' ? 'Aylık' : `${athlete.remainingSessions} Seans`}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Group Mode */}
                {sendMode === 'group' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grup Seçin
                      </label>
                      <select
                        value={groupType}
                        onChange={(e) => {
                          setGroupType(e.target.value)
                          fetchPreviewRecipients(e.target.value)
                        }}
                        className="input"
                      >
                        {Object.entries(groupLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {previewRecipients && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">Alıcı Özeti</span>
                          <span className="text-sm text-gray-500">
                            {previewRecipients.summary.totalInGroup} sporcu
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>{previewRecipients.summary.withPhone} telefonu var</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span>{previewRecipients.summary.withoutPhone} telefonu yok</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Panel - Message */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Mesaj</h3>

                {/* Templates */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şablon Seç (Opsiyonel)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className={`btn-sm ${
                          selectedTemplate?.id === template.id 
                            ? 'btn-primary' 
                            : 'btn-secondary'
                        }`}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mesaj İçeriği
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="input resize-none"
                    placeholder="SMS mesajınızı yazın..."
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500">
                      {message.length} karakter
                    </span>
                    {useTemplate && (
                      <span className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Şablon değişkenleri kullanılacak
                      </span>
                    )}
                  </div>
                </div>

                {/* Use Template Toggle */}
                {sendMode !== 'single' && (
                  <label className="flex items-center gap-2 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTemplate}
                      onChange={(e) => setUseTemplate(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">
                      Şablon değişkenlerini kullan ({'{ad}'}, {'{tc}'} vb.)
                    </span>
                  </label>
                )}

                {/* Send Button */}
                <button
                  onClick={() => {
                    if (sendMode === 'single') sendSingleSMS()
                    else if (sendMode === 'bulk') sendBulkSMS()
                    else sendGroupSMS()
                  }}
                  disabled={sending || !status?.enabled}
                  className="btn-primary w-full mt-6"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      SMS Gönder
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <select
                  value={logFilter.type}
                  onChange={(e) => {
                    setLogFilter(prev => ({ ...prev, type: e.target.value }))
                    fetchLogs(1)
                  }}
                  className="input"
                >
                  <option value="">Tüm Tipler</option>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <select
                  value={logFilter.success}
                  onChange={(e) => {
                    setLogFilter(prev => ({ ...prev, success: e.target.value }))
                    fetchLogs(1)
                  }}
                  className="input"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="true">Başarılı</option>
                  <option value="false">Başarısız</option>
                </select>
              </div>
              <button onClick={() => fetchLogs(1)} className="btn-secondary">
                <RefreshCw className="w-4 h-4" />
                Yenile
              </button>
            </div>

            {/* Logs Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Durum</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tip</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Telefon</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Sporcu</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Mesaj</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center">
                          <div className="spinner mx-auto"></div>
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          SMS kaydı bulunamadı
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {log.success ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs">Başarılı</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs">Başarısız</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                              {typeLabels[log.type] || log.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{log.phone}</td>
                          <td className="px-4 py-3 text-sm">
                            {log.athlete ? `${log.athlete.firstName} ${log.athlete.lastName}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {log.message?.substring(0, 50)}...
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDateTime(log.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logPagination && logPagination.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
                  <span className="text-sm text-gray-500">
                    Toplam {logPagination.total} kayıt
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchLogs(logPage - 1)}
                      disabled={logPage <= 1}
                      className="btn-sm btn-secondary"
                    >
                      Önceki
                    </button>
                    <span className="px-3 py-1 text-sm">
                      {logPage} / {logPagination.pages}
                    </span>
                    <button
                      onClick={() => fetchLogs(logPage + 1)}
                      disabled={logPage >= logPagination.pages}
                      className="btn-sm btn-secondary"
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Period Selector */}
            <div className="flex gap-2">
              {[
                { key: 'today', label: 'Bugün' },
                { key: 'week', label: 'Bu Hafta' },
                { key: 'month', label: 'Bu Ay' },
                { key: 'year', label: 'Bu Yıl' }
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => {
                    setStatsPeriod(p.key)
                    setTimeout(fetchStats, 100)
                  }}
                  className={`btn-sm ${statsPeriod === p.key ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {stats ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="card p-5">
                    <div className="text-3xl font-bold text-gray-900">{stats.summary.total}</div>
                    <div className="text-sm text-gray-500">Toplam Gönderim</div>
                  </div>
                  <div className="card p-5">
                    <div className="text-3xl font-bold text-emerald-600">{stats.summary.successful}</div>
                    <div className="text-sm text-gray-500">Başarılı</div>
                  </div>
                  <div className="card p-5">
                    <div className="text-3xl font-bold text-red-600">{stats.summary.failed}</div>
                    <div className="text-sm text-gray-500">Başarısız</div>
                  </div>
                  <div className="card p-5">
                    <div className="text-3xl font-bold text-primary-600">{stats.summary.successRate}</div>
                    <div className="text-sm text-gray-500">Başarı Oranı</div>
                  </div>
                </div>

                {/* By Type */}
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Tip Bazında Dağılım</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(stats.byType).map(([type, data]) => (
                      <div key={type} className="p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {typeLabels[type] || type}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-gray-900">{data.total}</span>
                          <span className="text-xs text-emerald-600">({data.successful} ✓)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Trend */}
                {stats.dailyTrend && stats.dailyTrend.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Son 30 Gün Trendi</h3>
                    <div className="h-40 flex items-end gap-1">
                      {stats.dailyTrend.slice(-30).map((day, i) => {
                        const maxTotal = Math.max(...stats.dailyTrend.map(d => d.total))
                        const height = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-primary-500 rounded-t-sm min-h-[2px] transition-all hover:bg-primary-600"
                            style={{ height: `${Math.max(height, 2)}%` }}
                            title={`${day.date}: ${day.total} SMS`}
                          />
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                      <span>30 gün önce</span>
                      <span>Bugün</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
