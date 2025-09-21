import { useLiveRecording } from '../hooks/useLiveRecording'

interface RecordButtonProps {
  roomId: string
  className?: string
}

const RecordButton = ({ roomId, className = '' }: RecordButtonProps) => {
  const {
    isRecording,
    isLoading,
    error,
    recordingUrl,
    formattedDuration,
    toggleRecording,
    retryRecording,
    canRetry
  } = useLiveRecording(roomId)

  const handleClick = async () => {
    await toggleRecording()
  }

  const getButtonText = () => {
    if (isLoading) {
      return isRecording ? 'Stopping...' : 'Starting...'
    }
    return isRecording ? 'Stop Recording' : 'Start Recording'
  }

  const getButtonIcon = () => {
    if (isLoading) {
      return '⏳'
    }
    return isRecording ? '⏹️' : '🔴'
  }

  return (
    <>
      <button
        className={`control-btn record-btn ${isRecording ? 'recording' : ''} ${isLoading ? 'loading' : ''}`}
        onClick={handleClick}
        disabled={isLoading}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {getButtonIcon()}
        {isRecording && <span className="rec-label">REC</span>}
        {isRecording && <span className="duration">{formattedDuration}</span>}
      </button>

      {/* Recording status overlay */}
      {isRecording && (
        <div className="recording-overlay">
          <div className="recording-pulse">🔴</div>
          <span>RECORDING</span>
        </div>
      )}
    </>
  )
}

export default RecordButton