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
      <div className="stream-placeholder">
        <div className="stream-waiting">
          <h3>🔴 Waiting for stream to start...</h3>
          <p>The host hasn't started streaming yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stream-view">
      <VideoConference />
    </div>
  )
}

// Viewer controls component that works inside LiveKit room context
const ViewerControls = ({ onLeaveStream }: { onLeaveStream: () => void }) => {
  const remoteParticipants = useRemoteParticipants()
  
  return (
    <div className="viewer-controls">
      <div className="viewer-info">
        <span className="participant-count">
          👥 {remoteParticipants.length} streamer{remoteParticipants.length !== 1 ? 's' : ''} live
        </span>
      </div>
      <button className="control-btn leave-stream" onClick={onLeaveStream}>
        🚪 Leave Stream
      </button>
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
      <div className="error-page">
        <h2>Stream Not Found</h2>
        <p>Invalid stream link</p>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    )
  }

  if (showNameInput) {
    return (
      <div className="viewer-page">
        <div className="join-form-container">
          <h2>Join Stream</h2>
          <p>Enter your name to join the stream</p>
          <form onSubmit={handleJoinStream} className="join-form">
            <input
              type="text"
              placeholder="Your name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              maxLength={50}
              required
              className="name-input"
            />
            <button 
              type="submit" 
              disabled={!participantName.trim() || isLoading || !isOnline}
              className="join-btn"
              onClick={() => console.log('🔘 Join button clicked, state:', { isLoading, isOnline, participantName: participantName.trim() })}
            >
              {isLoading ? (
                <span className="loading-text">
                  <LoadingSpinner size="small" />
                  Joining...
                </span>
              ) : !isOnline ? (
                'Waiting for connection...'
              ) : (
                'Join Stream'
              )}
            </button>
          </form>
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <div className="error-actions">
                {retryCount < 3 && participantName.trim() && (
                  <button 
                    onClick={() => fetchViewerToken(participantName.trim(), true)}
                    disabled={!isOnline || isLoading}
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
          )}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="loading-page">
        <LoadingSpinner size="large" message={`Connecting to ${roomId}...`} />
        {retryCount > 0 && (
          <p className="retry-info">Retry attempt {retryCount}/3</p>
        )}
      </div>
    )
  }

  if (error || !viewerToken || !serverUrl) {
    return (
      <div className="error-page">
        <h2>Stream Error</h2>
        <p>{error || 'Failed to join stream'}</p>
        <div className="error-actions">
          {retryCount < 3 && participantName.trim() && (
            <button 
              onClick={() => fetchViewerToken(participantName.trim(), true)}
              disabled={!isOnline}
            >
              {isOnline ? 'Retry Connection' : 'Waiting for connection...'}
            </button>
          )}
          <button onClick={() => setShowNameInput(true)}>Try Again</button>
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

  return (
    <div className="viewer-page">
      <div className="stream-layout">
        {/* Header */}
        <div className="stream-header">
          <div className="stream-title">
            <h1>👁️ WATCHING</h1>
            <div className="stream-badge">Viewer</div>
          </div>
          <div className="stream-info-header">
            <span>Viewer: {participantName}</span>
            <span>Room: {roomId}</span>
            <div className={`status-indicator ${
              connectionState === ConnectionState.Connected ? 'connected' :
              connectionState === ConnectionState.Connecting ? 'connecting' : 'disconnected'
            }`}>
              {connectionState === ConnectionState.Connected ? '🟢 Connected' :
               connectionState === ConnectionState.Connecting ? '🟡 Connecting...' :
               '🔴 Disconnected'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <LiveKitRoom
            video={false}  // Viewers don't publish video
            audio={false}  // Viewers don't publish audio
            token={viewerToken}
            serverUrl={serverUrl}
            data-lk-theme="default"
            onConnected={() => handleConnectionStateChange(ConnectionState.Connected)}
            onDisconnected={() => handleConnectionStateChange(ConnectionState.Disconnected)}
            onError={handleError}
          >
            <div className="video-section">
              <div className="video-container">
                <StreamView />
                <RoomAudioRenderer />
              </div>
              <div className="stream-controls">
                <ViewerControls onLeaveStream={handleLeaveStream} />
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

export default ViewerPage