// ═══════════════════════════════════════════════════════════════════════════════
//                    KIRIKKALE OLİMPİYAT SPOR KULÜBÜ
//                         Connection Status Component v2.0
//                    Real-time Backend Availability & Wake-up Indicator
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, ServerOff, RefreshCw, CheckCircle, AlertTriangle, Loader2, Clock, Zap } from 'lucide-react'
import { connectionManager } from '../utils/api'

export default function ConnectionStatus({ floating = true }) {
  const [status, setStatus] = useState(connectionManager.getStatus())
  const [isRetrying, setIsRetrying] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  useEffect(() => {
    const unsubscribe = connectionManager.subscribe((newStatus) => {
      setStatus(newStatus)
    })
    
    return () => unsubscribe()
  }, [])
  
  const handleRetry = async () => {
    setIsRetrying(true)
    await connectionManager.wakeUpBackend()
    setIsRetrying(false)
  }
  
  // Her şey yolundaysa gösterme
  if (status.isOnline && status.isBackendReady && status.retryCount === 0 && !status.wakeUpInProgress) {
    return null
  }
  
  // Durum belirleme
  const getStatusInfo = () => {
    if (!status.isOnline) {
      return {
        icon: WifiOff,
        title: 'İnternet Bağlantısı Yok',
        message: 'Lütfen internet bağlantınızı kontrol edin.',
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-500',
        animate: false
      }
    }
    
    if (status.wakeUpInProgress) {
      return {
        icon: Loader2,
        title: 'Sunucu Başlatılıyor',
        message: 'Render.com free tier sunucusu uyanıyor. Bu 30-60 saniye sürebilir.',
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-500',
        animate: true
      }
    }
    
    if (!status.isBackendAvailable) {
      return {
        icon: ServerOff,
        title: 'Sunucuya Ulaşılamıyor',
        message: 'Sunucu bakımda veya başlatılıyor olabilir. Tekrar deneyin.',
        color: 'amber',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        iconColor: 'text-amber-500',
        animate: false
      }
    }
    
    if (!status.isBackendReady) {
      return {
        icon: Clock,
        title: 'Veritabanı Bağlanıyor',
        message: 'Sunucu başladı, veritabanı bağlantısı kuruluyor...',
        color: 'amber',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        iconColor: 'text-amber-500',
        animate: true
      }
    }
    
    if (status.retryCount > 0) {
      return {
        icon: RefreshCw,
        title: 'Bağlantı Yeniden Deneniyor',
        message: `Deneme ${status.retryCount}/4`,
        color: 'blue',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-500',
        animate: true
      }
    }
    
    return null
  }
  
  const info = getStatusInfo()
  if (!info) return null
  
  const Icon = info.icon
  
  const content = (
    <motion.div
      initial={{ opacity: 0, y: floating ? -20 : 0, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: floating ? -20 : 0, scale: 0.95 }}
      className={`
        ${info.bgColor} ${info.borderColor} border rounded-xl p-4
        ${floating ? 'shadow-lg' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${info.bgColor}`}>
          <Icon className={`w-5 h-5 ${info.iconColor} ${info.animate ? 'animate-spin' : ''}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${info.textColor}`}>{info.title}</h4>
          <p className={`text-sm ${info.textColor} opacity-80 mt-0.5`}>{info.message}</p>
          
          {/* Detay gösterme */}
          {showDetails && status.lastHealthCheck && (
            <p className={`text-xs ${info.textColor} opacity-60 mt-2`}>
              Son kontrol: {new Date(status.lastHealthCheck).toLocaleTimeString('tr-TR')}
            </p>
          )}
          
          {/* Queue info */}
          {status.queueLength > 0 && (
            <p className={`text-xs ${info.textColor} opacity-70 mt-1`}>
              📋 {status.queueLength} işlem kuyrukta bekliyor
            </p>
          )}
        </div>
        
        {/* Tekrar dene butonu */}
        {status.isOnline && !status.isBackendReady && !status.wakeUpInProgress && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${isRetrying 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : `bg-white ${info.textColor} hover:shadow-md border ${info.borderColor}`
              }
            `}
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Deneniyor...' : 'Tekrar Dene'}
          </button>
        )}
      </div>
    </motion.div>
  )
  
  if (floating) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4">
        <AnimatePresence mode="wait">
          {content}
        </AnimatePresence>
      </div>
    )
  }
  
  return content
}

// ═══════════════════════════════════════════════════════════════════════════════
// Inline Connection Status (for forms)
// ═══════════════════════════════════════════════════════════════════════════════

export function InlineConnectionStatus({ className = '' }) {
  const [status, setStatus] = useState(connectionManager.getStatus())
  
  useEffect(() => {
    const unsubscribe = connectionManager.subscribe(setStatus)
    return () => unsubscribe()
  }, [])
  
  // Backend fully ready
  if (status.isOnline && status.isBackendReady) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 text-emerald-600 ${className}`}
      >
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Bağlantı hazır</span>
      </motion.div>
    )
  }
  
  // Wake-up in progress
  if (status.wakeUpInProgress) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 text-blue-600 ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Sunucu başlatılıyor...</span>
      </motion.div>
    )
  }
  
  // Backend available but not ready (DB connecting)
  if (status.isOnline && status.isBackendAvailable && !status.isBackendReady) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-2 text-amber-600 ${className}`}
      >
        <Clock className="w-4 h-4 animate-pulse" />
        <span className="text-sm">Veritabanı bağlanıyor...</span>
      </motion.div>
    )
  }
  
  // Offline or backend unavailable
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 text-amber-600 ${className}`}
    >
      <AlertTriangle className="w-4 h-4" />
      <span className="text-sm">
        {!status.isOnline ? 'Çevrimdışı' : 'Sunucu bağlanıyor...'}
      </span>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mini Connection Indicator (for header/navbar)
// ═══════════════════════════════════════════════════════════════════════════════

export function MiniConnectionIndicator({ className = '' }) {
  const [status, setStatus] = useState(connectionManager.getStatus())
  
  useEffect(() => {
    const unsubscribe = connectionManager.subscribe(setStatus)
    return () => unsubscribe()
  }, [])
  
  const getColor = () => {
    if (!status.isOnline) return 'bg-red-500'
    if (status.wakeUpInProgress) return 'bg-blue-500 animate-pulse'
    if (!status.isBackendReady) return 'bg-amber-500 animate-pulse'
    return 'bg-emerald-500'
  }
  
  const getTooltip = () => {
    if (!status.isOnline) return 'Çevrimdışı'
    if (status.wakeUpInProgress) return 'Sunucu başlatılıyor...'
    if (!status.isBackendReady) return 'Veritabanı bağlanıyor...'
    return 'Bağlantı hazır'
  }
  
  return (
    <div 
      className={`relative ${className}`}
      title={getTooltip()}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${getColor()}`} />
      {(status.wakeUpInProgress || (!status.isBackendReady && status.isOnline)) && (
        <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${getColor()} animate-ping`} />
      )}
    </div>
  )
}
