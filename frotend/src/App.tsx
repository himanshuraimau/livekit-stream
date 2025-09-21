import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './components/HomePage'
import HostPage from './components/HostPage'
import ViewerPage from './components/ViewerPage'
import ErrorBoundary from './components/ErrorBoundary'
import NetworkStatusIndicator from './components/NetworkStatusIndicator'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-900 text-white">
          <NetworkStatusIndicator />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/host/:roomId" element={<HostPage />} />
            <Route path="/stream/:roomId" element={<ViewerPage />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
