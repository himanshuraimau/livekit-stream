import { useState, useEffect, useCallback } from 'react'

interface NetworkStatus {
  isOnline: boolean
  isReconnecting: boolean
  lastDisconnected?: Date
  reconnectAttempts: number
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isReconnecting: false,
    reconnectAttempts: 0
  })

  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      isReconnecting: false,
      reconnectAttempts: 0
    }))
  }, [])

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      lastDisconnected: new Date()
    }))
  }, [])

  const startReconnecting = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isReconnecting: true,
      reconnectAttempts: prev.reconnectAttempts + 1
    }))
  }, [])

  const stopReconnecting = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isReconnecting: false
    }))
  }, [])

  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  // Auto-reconnect logic when coming back online
  useEffect(() => {
    if (status.isOnline && status.lastDisconnected && !status.isReconnecting) {
      const timeSinceDisconnect = Date.now() - status.lastDisconnected.getTime()
      
      // If we were offline for more than 5 seconds, trigger reconnection
      if (timeSinceDisconnect > 5000) {
        startReconnecting()
        
        // Stop reconnecting after 3 seconds to allow components to handle it
        setTimeout(() => {
          stopReconnecting()
        }, 3000)
      }
    }
  }, [status.isOnline, status.lastDisconnected, status.isReconnecting, startReconnecting, stopReconnecting])

  return {
    ...status,
    startReconnecting,
    stopReconnecting
  }
}