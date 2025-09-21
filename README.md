# Live Stream Platform

A real-time live streaming platform built with React, TypeScript, and LiveKit. Stream live video, chat with viewers, and record sessions to AWS S3.

## Features

- **Live Video Streaming** - Host live streams with real-time video and audio
- **Interactive Chat** - Real-time chat between hosts and viewers
- **Recording** - Save streams to AWS S3 for later viewing
- **Room Management** - Create and manage streaming rooms
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite for development
- TailwindCSS for styling
- LiveKit React components
- React Router for navigation

**Backend:**
- Bun runtime
- Express.js API
- LiveKit Server SDK
- AWS S3 for recording storage

## Prerequisites

- [Bun](https://bun.sh) installed
- LiveKit Cloud account or self-hosted LiveKit server
- AWS account with S3 bucket (for recording feature)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd live-stream-platform
```

### 2. Backend Setup

```bash
cd backend
bun install
```

Copy the environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_SERVER_URL=wss://your-livekit-server.com

# AWS S3 Configuration (for recording)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET_NAME=your-s3-bucket
S3_REGION=us-east-1

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
bun run dev
```

### 3. Frontend Setup

```bash
cd frotend
bun install
bun run dev
```

The app will be available at `http://localhost:5173`

## Usage

1. **Create a Stream**: Go to the homepage and click "Start Streaming"
2. **Share the Link**: Copy the generated stream URL to share with viewers
3. **Go Live**: Allow camera/microphone access and start streaming
4. **Record (Optional)**: Click the record button to save your stream to S3
5. **Chat**: Use the chat feature to interact with viewers

## API Endpoints

- `POST /api/rooms` - Create a new streaming room
- `POST /api/token` - Generate access tokens for joining rooms
- `GET /api/rooms/:roomId` - Get room information
- `POST /api/recordings/start` - Start recording a stream
- `POST /api/recordings/stop` - Stop recording a stream

## Environment Variables

### Required for Streaming
- `LIVEKIT_API_KEY` - Your LiveKit API key
- `LIVEKIT_API_SECRET` - Your LiveKit API secret
- `LIVEKIT_SERVER_URL` - Your LiveKit server WebSocket URL

### Required for Recording
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `S3_BUCKET_NAME` - S3 bucket name for recordings
- `S3_REGION` - AWS region (default: us-east-1)

### Optional
- `PORT` - Backend server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for generating share links

## Development

Both frontend and backend support hot reloading:

```bash
# Backend (in /backend directory)
bun run dev

# Frontend (in /frotend directory)  
bun run dev
```

## Production Build

```bash
# Backend
cd backend
bun run build
bun run start

# Frontend
cd frotend
bun run build
bun run preview
```
