import StreamCreator from './StreamCreator'

const HomePage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="text-xl font-bold text-white">LiveStream</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">Online</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="w-full max-w-md mx-auto mt-16">
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Go Live
            </h1>
            <p className="text-gray-400">
              Start streaming or join an existing stream
            </p>
          </div>
          
          <StreamCreator />

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-center text-sm text-gray-500">
              Have a stream link? Just paste it in your browser to join!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage