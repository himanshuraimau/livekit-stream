import { useLiveRecording } from '../hooks/useLiveRecording'

interface RecordButtonProps {
  roomId: string
  className?: string
}

const RecordButton = ({ roomId, className = '' }: RecordButtonProps) => {
  const {
    isRecording,
    isLoading,
    formattedDuration,
    toggleRecording
  } = useLiveRecording(roomId)

  const handleClick = async () => {
    await toggleRecording()
  }

  const getButtonIcon = () => {
    if (isLoading) {
      return '⏳'
    }
    return isRecording ? '⏹️' : '🔴'
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      title={isRecording ? 'Stop recording' : 'Start recording'}
      className={`p-3 rounded-full transition-colors flex items-center space-x-2 ${
        isRecording 
          ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
          : 'bg-gray-700 hover:bg-gray-600'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <span className="text-white text-lg">{getButtonIcon()}</span>
      {isRecording && (
        <>
          <span className="text-white text-xs font-bold">REC</span>
          <span className="text-white text-xs font-mono">{formattedDuration}</span>
        </>
      )}
    </button>
  )
}

export default RecordButton