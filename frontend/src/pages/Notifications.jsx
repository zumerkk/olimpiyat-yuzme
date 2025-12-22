// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Notifications Page
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api, { formatDateTime } from '../utils/api'
import toast from 'react-hot-toast'
import {
  Bell, BellOff, Check, CheckCheck, Trash2, AlertTriangle, CreditCard, Calendar, UserPlus
} from 'lucide-react'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unread, read

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter === 'unread') params.append('isRead', 'false')
      if (filter === 'read') params.append('isRead', 'true')
      
      const response = await api.get(`/notifications?${params}`)
      setNotifications(response.data.data)
    } catch (error) {
      toast.error('Bildirimler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      fetchNotifications()
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read')
      toast.success('Tüm bildirimler okundu olarak işaretlendi')
      fetchNotifications()
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      toast.success('Bildirim silindi')
      fetchNotifications()
    } catch (error) {
      toast.error('Silme işlemi başarısız')
    }
  }

  const checkReminders = async () => {
    try {
      const response = await api.post('/notifications/check-reminders')
      toast.success(`${response.data.data.paymentReminders + response.data.data.sessionReminders} yeni bildirim oluşturuldu`)
      fetchNotifications()
    } catch (error) {
      toast.error('Kontrol başarısız')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'payment_reminder': return <CreditCard className="w-5 h-5" />
      case 'session_ending': return <Calendar className="w-5 h-5" />
      case 'new_registration': return <UserPlus className="w-5 h-5" />
      case 'payment_received': return <Check className="w-5 h-5" />
      default: return <Bell className="w-5 h-5" />
    }
  }

  const getIconBg = (type, priority) => {
    if (priority === 'urgent' || priority === 'high') return 'bg-red-100 text-red-600'
    switch (type) {
      case 'payment_reminder': return 'bg-amber-100 text-amber-600'
      case 'session_ending': return 'bg-blue-100 text-blue-600'
      case 'new_registration': return 'bg-emerald-100 text-emerald-600'
      case 'payment_received': return 'bg-green-100 text-green-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Bildirimler</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkReminders} className="btn-secondary">
            <Bell className="w-5 h-5" />
            Hatırlatmaları Kontrol Et
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-primary">
              <CheckCheck className="w-5 h-5" />
              Tümünü Okundu İşaretle
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'unread', label: 'Okunmamış' },
          { key: 'read', label: 'Okunmuş' }
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

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-16 text-center">
          <BellOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Bildirim bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <motion.div
              key={notification._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`card p-5 ${!notification.isRead ? 'bg-primary-50/50 border-l-4 border-l-primary-500' : ''}`}
            >
              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBg(notification.type, notification.priority)}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                      <p className="text-gray-400 text-xs mt-2">{formatDateTime(notification.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                          title="Okundu işaretle"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {notification.priority === 'urgent' && (
                    <div className="flex items-center gap-1 mt-2 text-red-600 text-xs font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Acil
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

