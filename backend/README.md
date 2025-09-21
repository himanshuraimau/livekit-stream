# LiveKit Video Platform Backend

This is the backend API for the LiveKit video streaming platform, built with Bun and Express.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Copy the environment template and configure your variables:
```bash
cp .env.example .env
```

3. Edit `.env` with your actual configuration:
   - LiveKit API credentials from your LiveKit Cloud project
   - AWS S3 credentials (optional, for recording storage)

## Development

Start the development server with hot reload:
```bash
bun run dev
```

## Production

Build and start the production server:
```bash
bun run build
bun run start
```

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /api/token` - Generate LiveKit access tokens (coming in next task)
- `POST /api/rooms` - Create new stream rooms (coming in next task)

## Environment Variables

See `.env.example` for all required and optional environment variables.

## Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **livekit-server-sdk**: LiveKit server SDK for token generation
- **aws-sdk**: AWS SDK for S3 recording storage

This project was created using `bun init` in bun v1.2.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
