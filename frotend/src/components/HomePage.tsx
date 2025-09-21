import StreamCreator from './StreamCreator'

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="home-container">
        <h1>LiveKit Video Platform</h1>
        <p>Create and join live video streams</p>
        
        <div className="create-stream-section">
          <StreamCreator />
        </div>

        <div className="join-stream-section">
          <p>Have a stream link? Just paste it in your browser to join!</p>
        </div>
      </div>
    </div>
  )
}

export default HomePage