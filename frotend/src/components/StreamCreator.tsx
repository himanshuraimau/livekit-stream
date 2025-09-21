import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

interface CreateRoomResponse {
  roomId: string
  hostToken: string
  shareUrl: string
  serverUrl: string
  hostName: string
  createdAt: string
}

interface StreamCreatorProps {
  onStreamCreated?: (roomData: CreateRoomResponse) => void
}

const StreamCreator = ({ onStreamCreated }: StreamCreatorProps) => {
  const [hostName, setHostName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const navigate = useNavigate()
  const { isOnline } = useNetworkStatus()

  const handleCreateStream = async (isRetry = false) => {
    if (!hostName.trim()) {
      setError('Please enter your name')
      return
    }

    if (!isOnline) {
      setError('No internet connection. Please check your network and try again.')
      return
    }

    setIsCreating(true)
    setError('')

    if (isRetry) {
      setRetryCount(prev => prev + 1)
    }

    try {
      console.log('Creating stream for host:', hostName.trim());
      const response = await fetch('http://localhost:3001/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostName: hostName.trim()
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      console.log('Stream creation response:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create stream')
      }

      const roomData: CreateRoomResponse = await response.json()
      console.log('Room data received:', roomData);
      
      // Call the callback if provided
      if (onStreamCreated) {
        onStreamCreated(roomData)
      }

      // Navigate to host page with room data
      navigate(`/host/${roomData.roomId}`, { 
        state: { 
          roomData,
          hostToken: roomData.hostToken,
          shareUrl: roomData.shareUrl,
          serverUrl: roomData.serverUrl
        } 
      })

      setRetryCount(0) // Reset retry count on success

    } catch (error) {
      console.error('Error creating stream:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.')
      } else {
        setError(error instanceof Error ? error.message : 'Failed to create stream')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleCreateStream()
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="hostName" className="block text-sm font-medium text-gray-300 mb-2">
            Your Name
          </label>
          <input
            id="hostName"
            type="text"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="Enter your name"
            maxLength={50}
            disabled={isCreating}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
            <p className="text-red-200 text-sm mb-2">{error}</p>
            {retryCount < 3 && hostName.trim() && (
              <button 
                onClick={() => handleCreateStream(true)}
                disabled={isCreating || !isOnline}
                className="text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded text-white transition-colors"
              >
                {isOnline ? 'Retry' : 'Waiting for connection...'}
              </button>
            )}
            {!isOnline && (
              <p className="text-yellow-400 text-xs mt-2">
                ⚠️ No internet connection detected
              </p>
            )}
          </div>
        )}

        <button 
          type="submit"
          disabled={isCreating || !hostName.trim() || !isOnline}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isCreating ? (
            <>
              <LoadingSpinner size="small" />
              <span>Creating Stream...</span>
            </>
          ) : !isOnline ? (
            <span>Waiting for connection...</span>
          ) : (
            <>
              <span className="text-lg">🔴</span>
              <span>Go Live</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default StreamCreator