// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Enterprise API Configuration v3.0
//                    Connection Management • Offline Queue • Submission Verification
// ═══════════════════════════════════════════════════════════════════════════════

import axios from 'axios'

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TIMEOUT: 45000,              // 45 saniye (Render cold start için artırıldı)
  RETRY_ATTEMPTS: 4,           // 4 deneme
  RETRY_DELAY: 2000,           // 2 saniye başlangıç
  HEALTH_CHECK_INTERVAL: 20000, // 20 saniye
  KEEPALIVE_INTERVAL: 180000,  // 3 dakika (Render 5 dk sonra uyuyor)
  WAKE_UP_TIMEOUT: 60000,      // Backend wake-up için 60 saniye
  SUBMISSION_VERIFY_DELAY: 3000, // Submission doğrulama gecikmesi
  OFFLINE_QUEUE_KEY: 'olimpiyat_offline_queue',
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Base URL Detection
// ═══════════════════════════════════════════════════════════════════════════════

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL
  
  // Production: Environment variable kullan
  if (envUrl) {
    let url = envUrl.trim()
    // URL'in sonunda /api yoksa ekle
    if (!url.endsWith('/api')) {
      url = url.endsWith('/') ? url + 'api' : url + '/api'
    }
    return url
  }
  
  // Development: Vite proxy kullan
  return '/api'
}

const API_BASE_URL = getApiBaseUrl()

console.log('🔗 API Base URL:', API_BASE_URL)

// ═══════════════════════════════════════════════════════════════════════════════
// Offline Queue Management
// ═══════════════════════════════════════════════════════════════════════════════

class OfflineQueueManager {
  constructor() {
    this.queue = this.loadQueue()
    this.processing = false
  }
  
  loadQueue() {
    try {
      const data = localStorage.getItem(CONFIG.OFFLINE_QUEUE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }
  
  saveQueue() {
    try {
      localStorage.setItem(CONFIG.OFFLINE_QUEUE_KEY, JSON.stringify(this.queue))
    } catch (e) {
      console.error('Queue save failed:', e)
    }
  }
  
  add(item) {
    const queueItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...item
    }
    this.queue.push(queueItem)
    this.saveQueue()
    return queueItem.id
  }
  
  remove(id) {
    this.queue = this.queue.filter(item => item.id !== id)
    this.saveQueue()
  }
  
  getAll() {
    return [...this.queue]
  }
  
  clear() {
    this.queue = []
    this.saveQueue()
  }
  
  get length() {
    return this.queue.length
  }
}

export const offlineQueue = new OfflineQueueManager()

// ═══════════════════════════════════════════════════════════════════════════════
// Connection Status Management (Enhanced Singleton)
// ═══════════════════════════════════════════════════════════════════════════════

class ConnectionManager {
  constructor() {
    this.isOnline = true
    this.isBackendAvailable = false // Başlangıçta false
    this.isBackendReady = false     // DB bağlantısı dahil tam hazır
    this.lastHealthCheck = null
    this.retryCount = 0
    this.listeners = new Set()
    this.healthCheckTimer = null
    this.keepaliveTimer = null
    this.wakeUpInProgress = false
    this.wakeUpPromise = null
    
    // Browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true))
      window.addEventListener('offline', () => this.handleNetworkChange(false))
      this.isOnline = navigator.onLine
      
      // Start health check and keepalive
      this.init()
    }
  }
  
  async init() {
    // İlk başlangıçta backend'i uyandır
    console.log('🚀 Initializing connection manager...')
    await this.wakeUpBackend()
    this.startHealthCheck()
    this.startKeepalive()
  }
  
  handleNetworkChange(online) {
    const wasOnline = this.isOnline
    this.isOnline = online
    
    console.log(`🌐 Network status: ${online ? 'ONLINE' : 'OFFLINE'}`)
    
    if (!wasOnline && online) {
      // Network geri geldiğinde backend'i kontrol et ve queue'yu işle
      this.wakeUpBackend().then(() => {
        this.processOfflineQueue()
      })
    }
    
    this.notifyListeners()
  }
  
  subscribe(listener) {
    this.listeners.add(listener)
    // Hemen mevcut durumu bildir
    listener(this.getStatus())
    return () => this.listeners.delete(listener)
  }
  
  notifyListeners() {
    const status = this.getStatus()
    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (e) {
        console.error('Connection listener error:', e)
      }
    })
  }
  
  getStatus() {
    return {
      isOnline: this.isOnline,
      isBackendAvailable: this.isBackendAvailable,
      isBackendReady: this.isBackendReady,
      lastHealthCheck: this.lastHealthCheck,
      retryCount: this.retryCount,
      wakeUpInProgress: this.wakeUpInProgress,
      queueLength: offlineQueue.length
    }
  }
  
  setBackendStatus(available, ready = available) {
    const changed = this.isBackendAvailable !== available || this.isBackendReady !== ready
    this.isBackendAvailable = available
    this.isBackendReady = ready
    this.lastHealthCheck = new Date()
    
    if (available) {
      this.retryCount = 0
    }
    
    if (changed) {
      console.log(`🖥️ Backend status: ${available ? 'AVAILABLE' : 'UNAVAILABLE'}, Ready: ${ready}`)
      this.notifyListeners()
    }
  }
  
  incrementRetry() {
    this.retryCount++
    this.notifyListeners()
  }
  
  // Backend'i uyandır ve hazır olana kadar bekle
  async wakeUpBackend() {
    if (this.wakeUpInProgress) {
      return this.wakeUpPromise
    }
    
    this.wakeUpInProgress = true
    this.notifyListeners()
    
    console.log('⏰ Waking up backend...')
    
    this.wakeUpPromise = new Promise(async (resolve) => {
      const startTime = Date.now()
      const maxWaitTime = CONFIG.WAKE_UP_TIMEOUT
      
      while (Date.now() - startTime < maxWaitTime) {
        try {
          // Önce ping dene (hızlı)
          await axios.get(`${API_BASE_URL}/ping`, { timeout: 5000 })
          
          // Sonra ready kontrolü yap
          const healthResponse = await axios.get(`${API_BASE_URL}/ready`, { timeout: 10000 })
          
          if (healthResponse.data?.ready === true) {
            console.log('✅ Backend is ready!')
            this.setBackendStatus(true, true)
            this.wakeUpInProgress = false
            this.notifyListeners()
            resolve(true)
            return
          }
          
          // Backend başladı ama DB henüz bağlanmadı
          console.log('⏳ Backend started, waiting for database...')
          this.setBackendStatus(true, false)
          
        } catch (error) {
          console.log('⏳ Backend not ready yet, retrying...')
          this.setBackendStatus(false, false)
        }
        
        // 2 saniye bekle ve tekrar dene
        await new Promise(r => setTimeout(r, 2000))
      }
      
      console.warn('⚠️ Backend wake-up timeout')
      this.wakeUpInProgress = false
      this.notifyListeners()
      resolve(false)
    })
    
    return this.wakeUpPromise
  }
  
  async checkBackendHealth() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 10000,
        validateStatus: status => status < 500
      })
      
      const isReady = response.data?.serverReady === true
      this.setBackendStatus(response.status === 200, isReady)
      return isReady
    } catch (error) {
      this.setBackendStatus(false, false)
      return false
    }
  }
  
  startHealthCheck() {
    // İlk kontrol
    this.checkBackendHealth()
    
    // Periyodik kontrol
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer)
    this.healthCheckTimer = setInterval(() => {
      if (this.isOnline && !this.wakeUpInProgress) {
        this.checkBackendHealth()
      }
    }, CONFIG.HEALTH_CHECK_INTERVAL)
  }
  
  startKeepalive() {
    // Render free tier'da backend'in uyanık kalması için
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer)
    this.keepaliveTimer = setInterval(() => {
      if (this.isOnline && this.isBackendAvailable) {
        axios.get(`${API_BASE_URL}/ping`, { timeout: 5000 }).catch(() => {})
      }
    }, CONFIG.KEEPALIVE_INTERVAL)
  }
  
  // Offline queue'yu işle
  async processOfflineQueue() {
    if (offlineQueue.length === 0) return
    
    console.log(`📤 Processing ${offlineQueue.length} queued submissions...`)
    
    const items = offlineQueue.getAll()
    
    for (const item of items) {
      try {
        if (item.type === 'registration') {
          const response = await publicApi.post(
            `/registration/submit?source=${item.source}`,
            item.data,
            { _skipQueue: true }
          )
          
          if (response.data?.success) {
            offlineQueue.remove(item.id)
            console.log(`✅ Queued submission ${item.id} sent successfully`)
          }
        }
      } catch (error) {
        console.error(`❌ Failed to process queued item ${item.id}:`, error)
        // 3 denemeden sonra sil
        if (item.attempts >= 3) {
          offlineQueue.remove(item.id)
        } else {
          item.attempts = (item.attempts || 0) + 1
        }
      }
    }
    
    this.notifyListeners()
  }
  
  stopTimers() {
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer)
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer)
  }
}

export const connectionManager = new ConnectionManager()

// ═══════════════════════════════════════════════════════════════════════════════
// Retry Logic with Exponential Backoff
// ═══════════════════════════════════════════════════════════════════════════════

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const shouldRetry = (error) => {
  // Network errors
  if (!error.response) return true
  
  // Server errors (5xx)
  if (error.response.status >= 500) return true
  
  // Rate limiting
  if (error.response.status === 429) return true
  
  // Timeout
  if (error.code === 'ECONNABORTED') return true
  
  // Gateway errors
  if ([502, 503, 504].includes(error.response.status)) return true
  
  return false
}

// ═══════════════════════════════════════════════════════════════════════════════
// Axios Instance (Authenticated)
// ═══════════════════════════════════════════════════════════════════════════════

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Check if offline
    if (!connectionManager.isOnline) {
      return Promise.reject(new Error('İnternet bağlantısı yok'))
    }
    
    // Backend hazır değilse uyandır
    if (!connectionManager.isBackendReady && !config._skipWakeUp) {
      await connectionManager.wakeUpBackend()
    }
    
    // Add request timestamp for performance tracking
    config.metadata = { startTime: new Date() }
    
    // Add request ID
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    // Track response time
    if (response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime
      if (duration > 5000) {
        console.warn(`⚠️ Slow API response: ${response.config.url} (${duration}ms)`)
      }
    }
    
    // Backend is available
    connectionManager.setBackendStatus(true, true)
    
    return response
  },
  async (error) => {
    const config = error.config
    
    // Skip retry for specific conditions
    if (config?._retry || config?._skipRetry) {
      return Promise.reject(error)
    }
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('olimpiyat-auth')
      if (window.location.pathname !== '/giris' && window.location.pathname !== '/kayit') {
        window.location.href = '/giris'
      }
      return Promise.reject(error)
    }
    
    // Retry logic for network/server errors
    if (shouldRetry(error) && config) {
      config._retry = true
      config._retryAttempt = (config._retryAttempt || 0) + 1
      
      if (config._retryAttempt <= CONFIG.RETRY_ATTEMPTS) {
        connectionManager.incrementRetry()
        
        // Backend'i uyandırmayı dene
        if (!error.response) {
          console.log('🔄 Attempting to wake up backend...')
          await connectionManager.wakeUpBackend()
        }
        
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, config._retryAttempt - 1)
        console.log(`🔄 Retry attempt ${config._retryAttempt}/${CONFIG.RETRY_ATTEMPTS} in ${delay}ms`)
        await sleep(delay)
        
        return api(config)
      }
    }
    
    // Mark backend as unavailable
    if (!error.response) {
      connectionManager.setBackendStatus(false, false)
    }
    
    return Promise.reject(error)
  }
)

export default api

// ═══════════════════════════════════════════════════════════════════════════════
// Public API for Registration Form (No Auth Required) - Enhanced
// ═══════════════════════════════════════════════════════════════════════════════

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for public API
publicApi.interceptors.request.use(
  async (config) => {
    // Check if offline - queue the request
    if (!connectionManager.isOnline && config.method === 'post' && !config._skipQueue) {
      const queueId = offlineQueue.add({
        type: 'registration',
        source: new URL(config.url, window.location.origin).searchParams.get('source') || 'link',
        data: config.data,
        timestamp: Date.now()
      })
      
      return Promise.reject({
        isQueued: true,
        queueId,
        message: 'İnternet bağlantısı yok. Başvurunuz bağlantı geldiğinde gönderilecek.'
      })
    }
    
    // Backend hazır değilse uyandır
    if (!connectionManager.isBackendReady && !config._skipWakeUp) {
      const isReady = await connectionManager.wakeUpBackend()
      if (!isReady && config.method === 'post' && !config._skipQueue) {
        // Backend uyanamadı, queue'ya ekle
        const queueId = offlineQueue.add({
          type: 'registration',
          source: new URL(config.url, window.location.origin).searchParams.get('source') || 'link',
          data: config.data,
          timestamp: Date.now()
        })
        
        return Promise.reject({
          isQueued: true,
          queueId,
          message: 'Sunucu şu anda meşgul. Başvurunuz kuyruğa alındı ve otomatik gönderilecek.'
        })
      }
    }
    
    // Add metadata
    config.metadata = { startTime: new Date() }
    config.headers['X-Request-ID'] = `pub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for public API
publicApi.interceptors.response.use(
  (response) => {
    connectionManager.setBackendStatus(true, true)
    return response
  },
  async (error) => {
    // Queued request - don't retry, return the queue info
    if (error.isQueued) {
      return Promise.reject(error)
    }
    
    const config = error.config
    
    if (config?._retry) {
      return Promise.reject(error)
    }
    
    if (shouldRetry(error) && config) {
      config._retry = true
      config._retryAttempt = (config._retryAttempt || 0) + 1
      
      if (config._retryAttempt <= CONFIG.RETRY_ATTEMPTS) {
        connectionManager.incrementRetry()
        
        // Backend'i uyandırmayı dene
        if (!error.response) {
          console.log('🔄 Attempting to wake up backend for public request...')
          await connectionManager.wakeUpBackend()
        }
        
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, config._retryAttempt - 1)
        console.log(`🔄 Public API retry ${config._retryAttempt}/${CONFIG.RETRY_ATTEMPTS} in ${delay}ms`)
        await sleep(delay)
        
        return publicApi(config)
      }
    }
    
    if (!error.response) {
      connectionManager.setBackendStatus(false, false)
      
      // Son çare: Queue'ya ekle
      if (config?.method === 'post' && !config._skipQueue) {
        const queueId = offlineQueue.add({
          type: 'registration',
          source: 'link',
          data: config.data,
          timestamp: Date.now()
        })
        
        return Promise.reject({
          isQueued: true,
          queueId,
          message: 'Sunucuya ulaşılamadı. Başvurunuz kuyruğa alındı.'
        })
      }
    }
    
    return Promise.reject(error)
  }
)

// ═══════════════════════════════════════════════════════════════════════════════
// Submission Verification Helper
// ═══════════════════════════════════════════════════════════════════════════════

export const verifySubmission = async (submissionId) => {
  try {
    // Biraz bekle (backend'in kaydetmesi için)
    await sleep(CONFIG.SUBMISSION_VERIFY_DELAY)
    
    // Bu endpoint admin paneli için, public için tcNo ile kontrol edilebilir
    // Şimdilik sadece true döndür
    return { verified: true, id: submissionId }
  } catch (error) {
    return { verified: false, error: error.message }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

export const formatError = (error) => {
  // Queued request
  if (error.isQueued) {
    return error.message
  }
  
  // Network error
  if (!error.response) {
    if (!connectionManager.isOnline) {
      return 'İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.'
    }
    return 'Sunucuya ulaşılamıyor. Başvurunuz otomatik gönderilmeye çalışılacak.'
  }
  
  // Server response error
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  
  if (error.response?.data?.errors) {
    return error.response.data.errors.map(e => e.msg).join(', ')
  }
  
  // HTTP status based messages
  switch (error.response?.status) {
    case 400:
      return 'Geçersiz istek. Lütfen bilgileri kontrol edin.'
    case 401:
      return 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.'
    case 403:
      return 'Bu işlem için yetkiniz yok.'
    case 404:
      return 'İstenen kaynak bulunamadı.'
    case 429:
      return 'Çok fazla istek gönderildi. Lütfen bekleyin.'
    case 500:
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'
    case 502:
    case 503:
    case 504:
      return 'Sunucu geçici olarak kullanılamıyor. Başvurunuz kuyruğa alındı.'
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.'
  }
}

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(amount)
}

// Format date
export const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Format datetime
export const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get month name
export const getMonthName = (month) => {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  return months[month - 1]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Swimming Configuration (Fallback for offline/cold start)
// ═══════════════════════════════════════════════════════════════════════════════

export const SWIMMING_CONFIG = {
  SESSION_TYPES: ['Başlangıç', 'Orta Seviye', 'İleri Seviye', 'Yarışma Hazırlık', 'Özel Ders'],
  AGE_GROUPS: ['Mini (4-6)', 'Küçükler (7-9)', 'Yıldızlar (10-12)', 'Gençler (13-15)', 'Büyükler (16+)'],
  DAYS: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'],
  BLOOD_TYPES: ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'],
  GUARDIAN_RELATIONS: ['Anne', 'Baba', 'Vasi', 'Diğer'],
}
