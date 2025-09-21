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
  const remoteParticipants = useRemoteParticipants()

  return (
    <div className="relative w-full h-full bg-black">
      <VideoConference />
      
      {/* Stream info overlay */}
      <div className="absolute top-4 left-4 flex space-x-3 z-10">
        <div className="bg-red-600 text-white px-3 py-1 rounded-full flex items-center space-x-2 text-sm font-semibold">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>LIVE</span>
        </div>
        <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          👥 {remoteParticipants.length} viewer{remoteParticipants.length !== 1 ? 's' : ''}
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
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 opacity-0 hover:opacity-100 transition-opacity duration-300">
      <div className="flex justify-between items-center">
        <div className="flex space-x-3">
          <button
            onClick={toggleMicrophone}
            className={`p-3 rounded-full transition-colors ${
              isMicMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <span className="text-white text-lg">
              {isMicMuted ? '🎤' : '🎤'}
            </span>
          </button>
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full transition-colors ${
              isCameraOff 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          >
            <span className="text-white text-lg">
              {isCameraOff ? '📹' : '📹'}
            </span>
          </button>
          <RecordButton roomId={roomId} />
        </div>

        <button 
          onClick={onEndStream}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold transition-colors flex items-center space-x-2"
        >
          <span>🛑</span>
          <span>End Stream</span>
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
  const [copySuccess, setCopySuccess] = useState(false)
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
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="large" message="Setting up your stream room..." />
        {retryCount > 0 && (
          <p className="text-gray-400 text-sm mt-4">Retry attempt {retryCount}/3</p>
        )}
      </div>
    )
  }

  if (error || !roomId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Stream Error</h2>
          <p className="text-gray-300 mb-6">{error || 'No room ID provided'}</p>
          <div className="space-y-3">
            {roomId && retryCount < 3 && (
              <button
                onClick={() => {
                  setError('')
                  setIsLoading(true)
                  fetchRoomInfo(roomId, true)
                }}
                disabled={!isOnline}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {isOnline ? 'Retry' : 'Waiting for connection...'}
              </button>
            )}
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
          {!isOnline && (
            <p className="text-yellow-400 text-sm mt-4">
              ⚠️ No internet connection detected
            </p>
          )}
        </div>
      </div>
    )
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Permissions Required</h2>
          <p className="text-gray-300 mb-6">{permissionError}</p>
          <div className="space-y-3">
            <button 
              onClick={requestPermissions}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Grant Permissions
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!roomData || !roomData.hostToken || !roomData.serverUrl) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="large" message="Getting your host credentials..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xl font-bold text-white">LIVE</span>
            </div>
            <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Host
            </div>
          </div>
          <div className="flex items-center space-x-6 text-sm text-gray-300">
            <span>Host: {roomData.hostName}</span>
            <span>Room: {roomId}</span>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
              connectionState === ConnectionState.Connected ? 'bg-green-900 text-green-300' :
              connectionState === ConnectionState.Connecting ? 'bg-yellow-900 text-yellow-300' : 
              'bg-red-900 text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionState === ConnectionState.Connected ? 'bg-green-400' :
                connectionState === ConnectionState.Connecting ? 'bg-yellow-400' : 
                'bg-red-400'
              }`}></div>
              <span>
                {connectionState === ConnectionState.Connected ? 'Connected' :
                 connectionState === ConnectionState.Connecting ? 'Connecting...' :
                 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Share Controls */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          <span className="text-gray-300 font-medium">Share your stream:</span>
          <div className="flex-1 flex space-x-3">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm font-mono"
              placeholder="Stream URL will appear here..."
            />
            <button 
              onClick={copyShareUrl}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                copySuccess 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <LiveKitRoom
          video={true}
          audio={true}
          token={roomData.hostToken}
          serverUrl={roomData.serverUrl}
          data-lk-theme="default"
          onConnected={() => handleConnectionStateChange(ConnectionState.Connected)}
          onDisconnected={() => handleConnectionStateChange(ConnectionState.Disconnected)}
          onError={handleError}
          className="flex-1 flex"
        >
          {/* Video Section */}
          <div className="flex-1 relative bg-black">
            <HostStreamView />
            <RoomAudioRenderer />
            <HostControls onEndStream={handleEndStream} roomId={roomId} />
          </div>

          {/* Chat Sidebar */}
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            <ChatComponent />
          </div>
        </LiveKitRoom>
      </div>
    </div>
  )
}

export default HostPage