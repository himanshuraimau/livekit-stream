import { useParams, useNavigate } from 'react-router-dom'
import React, { useState, useEffect } from 'react'
import { 
  LiveKitRoom, 
  VideoConference, 
  RoomAudioRenderer,
  useRemoteParticipants
} from '@livekit/components-react'
import { ConnectionState } from 'livekit-client'
import ChatComponent from './ChatComponent'
import LoadingSpinner from './LoadingSpinner'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

// Stream view component that only shows the host's video (like Instagram/YouTube Live)
const StreamView = () => {
  const remoteParticipants = useRemoteParticipants()

  if (remoteParticipants.length === 0) {
    return (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔴</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Waiting for stream to start...</h3>
          <p className="text-gray-400">The host hasn't started streaming yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-black relative">
      <VideoConference />
      {/* Live indicator for viewers */}
      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center space-x-2 text-sm font-semibold z-10">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>LIVE</span>
      </div>
    </div>
  )
}

// Viewer controls component that works inside LiveKit room context
const ViewerControls = ({ onLeaveStream }: { onLeaveStream: () => void }) => {
  const remoteParticipants = useRemoteParticipants()
  
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 opacity-0 hover:opacity-100 transition-opacity duration-300">
      <div className="flex justify-between items-center">
        <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm">
          👥 {remoteParticipants.length} streamer{remoteParticipants.length !== 1 ? 's' : ''} live
        </div>
        <button 
          onClick={onLeaveStream}
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-semibold transition-colors flex items-center space-x-2"
        >
          <span>🚪</span>
          <span>Leave Stream</span>
        </button>
      </div>
    </div>
  )
}

const ViewerPage = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const [viewerToken, setViewerToken] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [participantName, setParticipantName] = useState('')
  const [showNameInput, setShowNameInput] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const { isOnline } = useNetworkStatus()

  // Debug: Log the roomId when component loads
  console.log('🏠 ViewerPage loaded with roomId:', roomId);
  console.log('📍 Current URL:', window.location.href);

  // Test backend connectivity
  const testBackendConnection = async () => {
    try {
      console.log('🧪 Testing backend connection...');
      const response = await fetch('http://localhost:3001/health');
      console.log('🏥 Health check response:', response.status, response.ok);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend is reachable:', data);
      }
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
    }
  };

  // Test connection when component mounts
  useEffect(() => {
    testBackendConnection();
  }, []);

  const handleLeaveStream = () => {
    // Navigate back to home page
    navigate('/')
  }

  const fetchViewerToken = async (name: string, isRetry = false) => {
    console.log('🎫 fetchViewerToken called with:', { name, roomId, isRetry });
    
    if (!roomId) {
      console.log('❌ No roomId provided');
      return;
    }

    try {
      if (!isOnline) {
        console.log('❌ Not online');
        throw new Error('No internet connection. Please check your network and try again.')
      }

      console.log('📡 Setting loading state and clearing errors');
      setIsLoading(true)
      setError('')

      if (isRetry) {
        setRetryCount(prev => prev + 1)
      }

      // First check if room exists
      console.log('Checking if room exists:', roomId);
      const roomResponse = await fetch(`http://localhost:3001/api/rooms/${roomId}`, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      console.log('Room check response:', roomResponse.status, roomResponse.ok);
      
      if (!roomResponse.ok) {
        const errorData = await roomResponse.json()
        if (roomResponse.status === 404) {
          throw new Error('Stream not found. The stream may have ended or the link is invalid.')
        } else if (roomResponse.status === 410) {
          throw new Error('This stream has ended.')
        } else {
          throw new Error(errorData.error || 'Failed to find stream')
        }
      }

      // Get viewer token
      console.log('Getting viewer token for:', name, 'in room:', roomId);
      const tokenResponse = await fetch('http://localhost:3001/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomId,
          participantName: name,
          isHost: false // This is a viewer
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      console.log('Token response:', tokenResponse.status, tokenResponse.ok);

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        if (tokenResponse.status === 404) {
          throw new Error('Stream not found. The stream may have ended or the link is invalid.')
        } else if (tokenResponse.status === 410) {
          throw new Error('This stream has ended.')
        } else {
          throw new Error(errorData.error || 'Failed to join stream')
        }
      }

      const tokenData = await tokenResponse.json()
      console.log('✅ Token data received:', { ...tokenData, token: 'HIDDEN' });
      
      setViewerToken(tokenData.token)
      setServerUrl(tokenData.serverUrl)
      setShowNameInput(false)
      setRetryCount(0) // Reset retry count on success
      
    } catch (error) {
      console.error('❌ Error joining stream:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.')
      } else {
        setError(error instanceof Error ? error.message : 'Failed to join stream')
      }
    } finally {
      console.log('🏁 Setting loading to false');
      setIsLoading(false)
    }
  }

  const handleJoinStream = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🎯 Join stream clicked with name:', participantName.trim());
    if (participantName.trim()) {
      fetchViewerToken(participantName.trim())
    } else {
      console.log('❌ No participant name provided');
    }
  }

  const handleConnectionStateChange = (state: ConnectionState) => {
    setConnectionState(state)
    if (state === ConnectionState.Disconnected) {
      if (isOnline) {
        setError('Connection lost. The stream may have ended or attempting to reconnect...')
      } else {
        setError('No internet connection. Please check your network.')
      }
    } else if (state === ConnectionState.Connected) {
      setError('') // Clear any previous errors
      setRetryCount(0) // Reset retry count on successful connection
    } else if (state === ConnectionState.Connecting) {
      if (retryCount > 0) {
        setError(`Reconnecting to stream... (attempt ${retryCount + 1})`)
      }
    }
  }

  const handleError = (error: Error) => {
    console.error('LiveKit connection error:', error)
    if (error.message.includes('room not found') || error.message.includes('not found')) {
      setError('Stream not found. The stream may have ended or the link is invalid.')
    } else if (error.message.includes('token')) {
      setError('Failed to join stream. Please try again.')
    } else {
      setError(`Connection error: ${error.message}`)
    }
  }

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Stream Not Found</h2>
          <p className="text-gray-300 mb-6">Invalid stream link</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (showNameInput) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👁️</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Join Stream</h2>
            <p className="text-gray-400">Enter your name to join the stream</p>
          </div>
          
          <form onSubmit={handleJoinStream} className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="Your name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                maxLength={50}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={!participantName.trim() || isLoading || !isOnline}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Joining...</span>
                </>
              ) : !isOnline ? (
                <span>Waiting for connection...</span>
              ) : (
                <>
                  <span>👁️</span>
                  <span>Join Stream</span>
                </>
              )}
            </button>
          </form>
          
          {error && (
            <div className="mt-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-200 text-sm mb-3">{error}</p>
              <div className="space-y-2">
                {retryCount < 3 && participantName.trim() && (
                  <button 
                    onClick={() => fetchViewerToken(participantName.trim(), true)}
                    disabled={!isOnline || isLoading}
                    className="w-full text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded text-white transition-colors"
                  >
                    {isOnline ? 'Retry' : 'Waiting for connection...'}
                  </button>
                )}
                <button 
                  onClick={() => navigate('/')}
                  className="w-full text-xs bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-white transition-colors"
                >
                  Go Home
                </button>
              </div>
              {!isOnline && (
                <p className="text-yellow-400 text-xs mt-2">
                  ⚠️ No internet connection detected
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="large" message={`Connecting to ${roomId}...`} />
        {retryCount > 0 && (
          <p className="text-gray-400 text-sm mt-4">Retry attempt {retryCount}/3</p>
        )}
      </div>
    )
  }

  if (error || !viewerToken || !serverUrl) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Stream Error</h2>
          <p className="text-gray-300 mb-6">{error || 'Failed to join stream'}</p>
          <div className="space-y-3">
            {retryCount < 3 && participantName.trim() && (
              <button 
                onClick={() => fetchViewerToken(participantName.trim(), true)}
                disabled={!isOnline}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {isOnline ? 'Retry Connection' : 'Waiting for connection...'}
              </button>
            )}
            <button 
              onClick={() => setShowNameInput(true)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Try Again
            </button>
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

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl">👁️</span>
              <span className="text-xl font-bold text-white">WATCHING</span>
            </div>
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Viewer
            </div>
          </div>
          <div className="flex items-center space-x-6 text-sm text-gray-300">
            <span>Viewer: {participantName}</span>
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

      {/* Main Content */}
      <div className="flex-1 flex">
        <LiveKitRoom
          video={false}  // Viewers don't publish video
          audio={false}  // Viewers don't publish audio
          token={viewerToken}
          serverUrl={serverUrl}
          data-lk-theme="default"
          onConnected={() => handleConnectionStateChange(ConnectionState.Connected)}
          onDisconnected={() => handleConnectionStateChange(ConnectionState.Disconnected)}
          onError={handleError}
          className="flex-1 flex"
        >
          {/* Video Section */}
          <div className="flex-1 relative bg-black">
            <StreamView />
            <RoomAudioRenderer />
            <ViewerControls onLeaveStream={handleLeaveStream} />
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

export default ViewerPage