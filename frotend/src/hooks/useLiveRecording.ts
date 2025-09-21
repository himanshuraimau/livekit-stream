import { useState, useEffect, useCallback } from 'react'

interface RecordingState {
  isRecording: boolean
  isLoading: boolean
  error: string | null
  egressId: string | null
  recordingUrl: string | null
  duration: number
  retryCount: number
  lastError?: Date
}

interface RecordingResponse {
  egressId: string
  roomName: string
  filePath: string
  status: string
  message: string
}

interface RecordingStopResponse {
  egressId: string
  s3Url?: string
  status: string
  error?: string
  message: string
}

export const useLiveRecording = (roomId: string) => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isLoading: false,
    error: null,
    egressId: null,
    recordingUrl: null,
    duration: 0,
    retryCount: 0
  })

  // Timer for recording duration
  useEffect(() => {
    let interval: number | null = null

    if (state.isRecording && !state.isLoading) {
      interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }))
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [state.isRecording, state.isLoading])

  // Check initial recording status when component mounts
  useEffect(() => {
    const checkRecordingStatus = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/recordings/${roomId}`)
        if (response.ok) {
          const data = await response.json()
          setState(prev => ({
            ...prev,
            isRecording: data.isRecording,
            egressId: data.egressId,
            recordingUrl: data.recordingUrl
          }))
        }
      } catch (error) {
        console.error('Failed to check recording status:', error)
      }
    }

    if (roomId) {
      checkRecordingStatus()
    }
  }, [roomId])

  const startRecording = useCallback(async () => {
    if (state.isRecording || state.isLoading) return

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      const response = await fetch('http://localhost:3001/api/recordings/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start recording')
      }

      const data: RecordingResponse = await response.json()

      setState(prev => ({
        ...prev,
        isRecording: true,
        isLoading: false,
        egressId: data.egressId,
        duration: 0,
        error: null
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start recording',
        lastError: new Date()
      }))
    }
  }, [roomId, state.isRecording, state.isLoading])

  const stopRecording = useCallback(async () => {
    if (!state.isRecording || state.isLoading || !state.egressId) return

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    try {
      const response = await fetch('http://localhost:3001/api/recordings/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          egressId: state.egressId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to stop recording')
      }

      const data: RecordingStopResponse = await response.json()

      setState(prev => ({
        ...prev,
        isRecording: false,
        isLoading: false,
        recordingUrl: data.s3Url || null,
        error: data.status === 'completed' ? null : (data.error || 'Recording stopped with errors')
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to stop recording',
        lastError: new Date()
      }))
    }
  }, [state.isRecording, state.isLoading, state.egressId])

  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }, [state.isRecording, startRecording, stopRecording])

  // Retry recording with exponential backoff
  const retryRecording = useCallback(async () => {
    if (state.retryCount >= 3) {
      setState(prev => ({
        ...prev,
        error: 'Maximum retry attempts reached. Please try again later.'
      }))
      return
    }

    const delay = Math.pow(2, state.retryCount) * 1000 // 1s, 2s, 4s
    
    setState(prev => ({
      ...prev,
      error: `Retrying in ${delay / 1000} seconds... (${prev.retryCount + 1}/3)`,
      retryCount: prev.retryCount + 1
    }))

    setTimeout(async () => {
      if (state.isRecording) {
        await stopRecording()
      } else {
        await startRecording()
      }
    }, delay)
  }, [state.retryCount, state.isRecording, startRecording, stopRecording])

  // Clear error after 10 seconds
  useEffect(() => {
    if (state.error && state.lastError) {
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          error: null,
          lastError: undefined
        }))
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [state.error, state.lastError])

  // Format duration as MM:SS
  const formatDuration = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  return {
    isRecording: state.isRecording,
    isLoading: state.isLoading,
    error: state.error,
    recordingUrl: state.recordingUrl,
    duration: state.duration,
    retryCount: state.retryCount,
    formattedDuration: formatDuration(state.duration),
    startRecording,
    stopRecording,
    toggleRecording,
    retryRecording,
    canRetry: state.retryCount < 3 && !!state.error && !state.isLoading
  }
}