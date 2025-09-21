interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
  className?: string
}

const LoadingSpinner = ({ 
  size = 'medium', 
  message, 
  className = '' 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin`}>
        <div className="w-full h-full border-2 border-gray-600 border-t-red-500 rounded-full"></div>
      </div>
      {message && (
        <p className="text-gray-400 text-sm text-center">{message}</p>
      )}
    </div>
  )
}

export default LoadingSpinner