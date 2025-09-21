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
    <div className={`network-status-indicator ${className}`}>
      <div className="network-status-content">
        {!isOnline ? (
          <>
            <span className="status-icon">🔴</span>
            <span className="status-text">No internet connection</span>
            <button onClick={handleReconnect} className="reconnect-btn">
              Retry
            </button>
          </>
        ) : isReconnecting ? (
          <>
            <span className="status-icon">🟡</span>
            <span className="status-text">
              Reconnecting... (attempt {reconnectAttempts})
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default NetworkStatusIndicator