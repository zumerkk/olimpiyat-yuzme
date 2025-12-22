// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         API Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import axios from 'axios'

// Production'da farklı backend URL kullan
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is set in auth store
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      localStorage.removeItem('olimpiyat-auth')
      if (window.location.pathname !== '/giris') {
        window.location.href = '/giris'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// API Helper Functions
export const formatError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.response?.data?.errors) {
    return error.response.data.errors.map(e => e.msg).join(', ')
  }
  return 'Bir hata oluştu'
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

