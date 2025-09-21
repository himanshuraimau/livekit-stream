import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants
} from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import ChatComponent from './ChatComponent'
import RecordButton from './RecordButton'
import LoadingSpinner from './LoadingSpinner'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

interface RoomData {
  roomId: string
  hostToken: string
  shareUrl: string
  serverUrl: string
  hostName: string
  createdAt: string
}

// Host stream view component that shows the host's video prominently
const HostStreamView = () => {
  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()

  return (
    <div className="host-stream-view">
      {/* Main host video */}
      <div className="host-video-main">
        <VideoConference />
        
        {/* Stream info overlay */}
        <div className="stream-info-overlay">
          <div className="live-indicator">
            <span className="live-dot">🔴</span>
            <span>LIVE</span>
          </div>
          <div className="viewer-count">
            👥 {remoteParticipants.length} viewer{remoteParticipants.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}

// Host controls component that works inside LiveKit room context
const HostControls = ({ onEndStream, roomId }: { onEndStream: () => void; roomId: string }) => {
  const { localParticipant } = useLocalParticipant()
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)

  const toggleMicrophone = async () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled
      await localParticipant.setMicrophoneEnabled(!enabled)
      setIsMicMuted(enabled)
    }
  }

  const toggleCamera = async () => {
    if (localParticipant) {
      const enabled = localParticipant.isCameraEnabled
      await localParticipant.setCameraEnabled(!enabled)
      setIsCameraOff(enabled)
    }
  }

  return (
    <div className="host-controls">
      <div className="basic-controls">
        <button
          className={`control-btn ${isMicMuted ? 'muted' : ''}`}
          onClick={toggleMicrophone}
          title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMicMuted ? '🎤' : '🎤'}
        </button>
        <button
          className={`control-btn ${isCameraOff ? 'off' : ''}`}
          onClick={toggleCamera}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? '📹' : '📹'}
        </button>
        <RecordButton roomId={roomId} />
      </div>

      <div className="end-controls">
        <button className="control-btn end-stream" onClick={onEndStream}>
          🛑 End Stream
        </button>
      </div>
    </div>
  )
}

const HostPage = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [shareUrl, setShareUrl] = useState('')
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [permissionError, setPermissionError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    // Check if room data was passed via navigation state
    const stateRoomData = location.state?.roomData
    if (stateRoomData) {
      setRoomData(stateRoomData)
      setShareUrl(stateRoomData.shareUrl)
      setIsLoading(false)
    } else if (roomId) {
      // If no state data, fetch room info from backend
      fetchRoomInfo(roomId)
    } else {
      setError('No room ID provided')
      setIsLoading(false)
    }
  }, [roomId, location.state])

  const fetchRoomInfo = async (roomId: string, isRetry = false) => {
    try {
      if (!isOnline) {
        throw new Error('No internet connection. Please check your network and try again.')
      }

      if (isRetry) {
        setRetryCount(prev => prev + 1)
      }

      // First get room info
      const roomResponse = await fetch(`http://localhost:3001/api/rooms/${roomId}`, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!roomResponse.ok) {
        const errorData = await roomResponse.json()
        throw new Error(errorData.error || 'Failed to fetch room info')
      }

      const roomInfo = await roomResponse.json()

      // Then get host token
      const tokenResponse = await fetch('http://localhost:3001/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomId,
          participantName: roomInfo.hostName,
          isHost: true
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        throw new Error(errorData.error || 'Failed to get host token')
      }

      const tokenData = await tokenResponse.json()

      // Generate share URL
      const currentUrl = window.location.origin
      const viewerUrl = `${currentUrl}/stream/${roomId}`

      setRoomData({
        roomId: roomInfo.roomId,
        hostToken: tokenData.token,
        shareUrl: viewerUrl,
        serverUrl: tokenData.serverUrl,
        hostName: roomInfo.hostName,
        createdAt: roomInfo.createdAt
      })
      setShareUrl(viewerUrl)
      setRetryCount(0) // Reset retry count on success

    } catch (error) {
      console.error('Error fetching room info:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.')
      } else {
        setError(error instanceof Error ? error.message : 'Failed to load room info')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndStream = async () => {
    if (roomId) {
      try {
        await fetch(`http://localhost:3001/api/rooms/${roomId}`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('Error ending stream:', error)
      }
    }
    // Navigate back to home page
    navigate('/')
  }

  const handleConnectionStateChange = (state: ConnectionState) => {
    setConnectionState(state)
    if (state === ConnectionState.Disconnected) {
      if (isOnline) {
        setError('Connection lost. Attempting to reconnect...')
      } else {
        setError('No internet connection. Please check your network.')
      }
    } else if (state === ConnectionState.Connected) {
      setError('') // Clear any previous errors
      setRetryCount(0) // Reset retry count on successful connection
    } else if (state === ConnectionState.Connecting) {
      if (retryCount > 0) {
        setError(`Reconnecting... (attempt ${retryCount + 1})`)
      }
    }
  }

  const handleError = (error: Error) => {
    console.error('LiveKit connection error:', error)
    if (error.message.includes('permission')) {
      setPermissionError('Camera and microphone permissions are required to start streaming. Please allow access and refresh the page.')
    } else {
      setError(`Connection error: ${error.message}`)
    }
  }

  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setPermissionError('')
    } catch (error) {
      console.error('Permission request failed:', error)
      setPermissionError('Camera and microphone permissions are required to start streaming.')
    }
  }

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('Stream link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Stream link copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="loading-page">
        <LoadingSpinner size="large" message="Setting up your stream room..." />
        {retryCount > 0 && (
          <p className="retry-info">Retry attempt {retryCount}/3</p>
        )}
      </div>
    )
  }

  if (error || !roomId) {
    return (
      <div className="error-page">
        <h2>Stream Error</h2>
        <p>{error || 'No room ID provided'}</p>
        <div className="error-actions">
          {roomId && retryCount < 3 && (
            <button
              onClick={() => {
                setError('')
                setIsLoading(true)
                fetchRoomInfo(roomId, true)
              }}
              disabled={!isOnline}
            >
              {isOnline ? 'Retry' : 'Waiting for connection...'}
            </button>
          )}
          <button onClick={() => navigate('/')}>Go Home</button>
        </div>
        {!isOnline && (
          <p className="network-warning">
            ⚠️ No internet connection detected
          </p>
        )}
      </div>
    )
  }

  if (permissionError) {
    return (
      <div className="error-page">
        <h2>Permissions Required</h2>
        <p>{permissionError}</p>
        <button onClick={requestPermissions}>Grant Permissions</button>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    )
  }

  if (!roomData || !roomData.hostToken || !roomData.serverUrl) {
    return (
      <div className="loading-page">
        <LoadingSpinner size="large" message="Getting your host credentials..." />
      </div>
    )
  }

  return (
    <div className="host-page">
      <div className="stream-layout">
        {/* Header */}
        <div className="stream-header">
          <div className="stream-title">
            <h1>🔴 LIVE</h1>
            <div className="stream-badge">Host</div>
          </div>
          <div className="stream-info-header">
            <span>Host: {roomData.hostName}</span>
            <span>Room: {roomId}</span>
            <div className={`status-indicator ${connectionState === ConnectionState.Connected ? 'connected' :
              connectionState === ConnectionState.Connecting ? 'connecting' : 'disconnected'
              }`}>
              {connectionState === ConnectionState.Connected ? '🟢 Connected' :
                connectionState === ConnectionState.Connecting ? '🟡 Connecting...' :
                  '🔴 Disconnected'}
            </div>
          </div>
        </div>

        {/* Share Controls */}
        <div className="share-controls">
          <h3>📤 Share Your Stream</h3>
          <div className="share-url-container">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="share-url-input"
              placeholder="Stream URL will appear here..."
            />
            <button onClick={copyShareUrl} className="copy-btn">
              📋 Copy Link
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <LiveKitRoom
            video={true}
            audio={true}
            token={roomData.hostToken}
            serverUrl={roomData.serverUrl}
            data-lk-theme="default"
            onConnected={() => handleConnectionStateChange(ConnectionState.Connected)}
            onDisconnected={() => handleConnectionStateChange(ConnectionState.Disconnected)}
            onError={handleError}
          >
            <div className="video-section">
              <div className="video-container">
                <HostStreamView />
                <RoomAudioRenderer />
              </div>
              <div className="stream-controls">
                <HostControls onEndStream={handleEndStream} roomId={roomId} />
              </div>
            </div>

            <div className="chat-sidebar">
              <ChatComponent />
            </div>
          </LiveKitRoom>
        </div>
      </div>
    </div>
  )
}

export default HostPage