# Requirements Document

## Introduction

This document outlines the requirements for building a simple video streaming platform using LiveKit's WebRTC infrastructure. The platform will enable users to create streams, join streams, and chat during streams. The system will consist of a React frontend with TypeScript, a Node.js backend with Bun, and integration with LiveKit for WebRTC functionality. Recordings will be saved to S3 after streams end.

## Requirements

### Requirement 1

**User Story:** As a streamer, I want to create a stream, so that viewers can join and watch my content.

#### Acceptance Criteria

1. WHEN I click "Create Stream" THEN the system SHALL generate a unique stream room with LiveKit
2. WHEN a stream is created THEN the system SHALL provide me with a shareable stream link
3. WHEN I start streaming THEN the system SHALL enable my camera and microphone by default
4. WHEN I create a stream THEN the system SHALL generate appropriate LiveKit access tokens

### Requirement 2

**User Story:** As a viewer, I want to join a stream using a link, so that I can watch the streamer's content.

#### Acceptance Criteria

1. WHEN I click a valid stream link THEN the system SHALL connect me to the LiveKit room as a viewer
2. WHEN I join a stream THEN the system SHALL display the streamer's video and audio
3. WHEN I join a stream THEN the system SHALL NOT enable my camera or microphone by default
4. IF I try to join a non-existent stream THEN the system SHALL show an error message

### Requirement 3

**User Story:** As a participant (streamer or viewer), I want to chat during the stream, so that I can communicate with others.

#### Acceptance Criteria

1. WHEN I send a chat message THEN the system SHALL deliver it to all participants in real-time using LiveKit data channels
2. WHEN I join a stream THEN the system SHALL display the chat interface
3. WHEN someone sends a message THEN the system SHALL show their name and the message text
4. WHEN I send a message THEN the system SHALL display it immediately in my chat

### Requirement 4

**User Story:** As a streamer, I want to automatically record my stream to S3, so that I can access it later.

#### Acceptance Criteria

1. WHEN I start a stream THEN the system SHALL automatically begin recording using LiveKit egress
2. WHEN I end a stream THEN the system SHALL stop the recording and save it to S3
3. WHEN the recording is complete THEN the system SHALL provide me with the S3 file URL
4. WHEN recording is being processed THEN the system SHALL show a loading indicator
5. WHEN I toggle recording THEN the system SHALL start/stop recording on demand during the stream

### Requirement 5

**User Story:** As a streamer, I want basic stream controls, so that I can manage my stream effectively.

#### Acceptance Criteria

1. WHEN I click the microphone button THEN the system SHALL mute/unmute my audio
2. WHEN I click the camera button THEN the system SHALL enable/disable my video
3. WHEN I click "End Stream" THEN the system SHALL disconnect all participants and end the session
4. WHEN I click the recording button THEN the system SHALL start/stop recording to S3
5. WHEN recording is active THEN the system SHALL show a visual indicator