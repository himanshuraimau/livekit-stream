import { useNetworkStatus } from '../hooks/useNetworkStatus'

interface NetworkStatusIndicatorProps {
  onReconnect?: () => void
  className?: string
}

const NetworkStatusIndicator = ({ 
  onReconnect, 
  className = '' 
}: NetworkStatusIndicatorProps) => {
  const { isOnline, isReconnecting, reconnectAttempts } = useNetworkStatus()

  if (isOnline && !isReconnecting) {
    return null // Don't show anything when online and not reconnecting
  }

  const handleReconnect = () => {
    if (onReconnect) {
      onReconnect()
    }
  }

  return (
    <div className={`fixed top-4 right-4 z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg ${className}`}>
      <div className="flex items-center space-x-3">
        {!isOnline ? (
          <>
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-white text-sm">No internet connection</span>
            <button 
              onClick={handleReconnect}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
            >
              Retry
            </button>
          </>
        ) : isReconnecting ? (
          <>
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm">
              Reconnecting... (attempt {reconnectAttempts})
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default NetworkStatusIndicator