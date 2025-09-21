# Implementation Plan

- [x] 1. Setup backend API foundation with Bun
  - Install required dependencies (express, cors, livekit-server-sdk)
  - Create basic Express server structure with TypeScript
  - Setup environment variables for LiveKit and S3 configuration
  - Configure EgressClient for LiveKit recording functionality
  - _Requirements: 1.1, 1.4_

- [x] 2. Implement LiveKit token generation service
  - Fix existing token generation code with proper environment variables
  - Create token endpoint that handles host vs viewer permissions
  - Add input validation for room names and participant names
  - _Requirements: 1.1, 1.4, 2.2_

- [x] 3. Create room management API endpoints
  - Implement POST /api/rooms endpoint for stream creation
  - Implement POST /api/token endpoint for joining streams
  - Add error handling for invalid room requests
  - _Requirements: 1.1, 1.2, 2.1, 2.4_

- [x] 4. Setup frontend routing and navigation
  - Install react-router-dom and setup basic routing structure
  - Create home page component with "Create Stream" button
  - Create host and viewer page components with route parameters
  - _Requirements: 1.2, 2.1_

- [x] 5. Implement stream creation functionality
  - Create StreamCreator component that calls backend API
  - Generate unique room IDs and get host tokens
  - Display shareable stream links to hosts
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Build LiveKit room connection for hosts
  - Integrate @livekit/components-react for host video display
  - Setup camera and microphone permissions for streamers
  - Handle connection errors and display appropriate messages
  - _Requirements: 1.3, 1.4_

- [x] 7. Implement stream viewer functionality
  - Create StreamViewer component for joining existing streams
  - Connect viewers to LiveKit rooms with viewer-only permissions
  - Display streamer video/audio without enabling viewer camera/mic
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 8. Build real-time chat system
  - Implement chat component using LiveKit data channels
  - Create message sending and receiving functionality
  - Display participant names with chat messages
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 9. Add basic stream controls for hosts
  - Implement microphone mute/unmute toggle functionality
  - Add camera enable/disable toggle functionality
  - Create "End Stream" button that disconnects all participants
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 10. Implement LiveKit egress recording to S3
  - Install livekit-server-sdk and setup EgressClient
  - Create LiveStreamRecorder service class for managing recordings
  - Implement POST /api/recordings/start and /api/recordings/stop endpoints
  - Add recording state management to room model
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 11. Build recording controls for hosts
  - Create useLiveRecording React hook for recording state management
  - Implement RecordButton component with start/stop functionality
  - Add recording status indicator and duration display
  - Integrate recording controls into StreamControls component
  - _Requirements: 5.4, 5.5_

- [x] 12. Add error handling and loading states
  - Implement frontend error boundaries and error displays
  - Add loading indicators for API calls and connections
  - Handle network disconnections and reconnection attempts
  - Add recording error handling and retry mechanisms
  - _Requirements: 2.4, 4.4_

- [x] 13. Test and polish the complete flow
  - Test stream creation and joining end-to-end
  - Verify chat functionality works between participants
  - Test LiveKit egress recording functionality with S3 integration
  - Verify recording start/stop controls work properly
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_