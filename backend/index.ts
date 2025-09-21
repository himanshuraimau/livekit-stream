import express from 'express';
import cors from 'cors';
import { AccessToken } from 'livekit-server-sdk';
import { LiveStreamRecorder } from './services/LiveStreamRecorder.js';

// Bun automatically loads .env files, no need for dotenv package
// Environment variables
const PORT = process.env.PORT || 3001;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_SERVER_URL = process.env.LIVEKIT_SERVER_URL;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION || 'us-east-1';

// Log environment variables status
console.log('🔧 Environment Variables Status:');
console.log('PORT:', PORT);
console.log('LIVEKIT_API_KEY:', LIVEKIT_API_KEY ? '✅ Set' : '❌ Missing');
console.log('LIVEKIT_API_SECRET:', LIVEKIT_API_SECRET ? '✅ Set' : '❌ Missing');
console.log('LIVEKIT_SERVER_URL:', LIVEKIT_SERVER_URL ? '✅ Set' : '❌ Missing');
console.log('AWS_ACCESS_KEY_ID:', AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('S3_BUCKET_NAME:', S3_BUCKET_NAME ? '✅ Set' : '❌ Missing');
console.log('---');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('   Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  const response = { status: 'ok', timestamp: new Date().toISOString() };
  console.log('   Response:', response);
  res.json(response);
});

// In-memory storage for active rooms (simple implementation)
interface Room {
  id: string;
  hostName: string;
  createdAt: Date;
  isActive: boolean;
  recordingUrl?: string;
  egressId?: string;
  isRecording: boolean;
}

const activeRooms = new Map<string, Room>();

// Initialize LiveStream Recorder
let liveStreamRecorder: LiveStreamRecorder;
try {
  liveStreamRecorder = new LiveStreamRecorder();
} catch (error) {
  console.warn('LiveStreamRecorder initialization failed:', error instanceof Error ? error.message : 'Unknown error');
}

// Generate unique room ID
const generateRoomId = (): string => {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Input validation helper functions
const validateRoomName = (roomName: string): boolean => {
  return typeof roomName === 'string' &&
    roomName.length >= 1 &&
    roomName.length <= 100 &&
    /^[a-zA-Z0-9_-]+$/.test(roomName);
};

const validateParticipantName = (participantName: string): boolean => {
  return typeof participantName === 'string' &&
    participantName.length >= 1 &&
    participantName.length <= 50 &&
    /^[a-zA-Z0-9_\s-]+$/.test(participantName);
};

// Room creation endpoint
app.post('/api/rooms', async (req, res) => {
  try {
    console.log('🏠 Room creation request received');
    console.log('   Request body:', req.body);
    const { hostName } = req.body;

    // Input validation
    if (!hostName) {
      console.log('❌ Missing hostName in request');
      return res.status(400).json({
        error: 'Missing required field: hostName is required'
      });
    }

    console.log('   Validating hostName:', hostName);
    if (!validateParticipantName(hostName)) {
      console.log('❌ Invalid hostName format');
      return res.status(400).json({
        error: 'Invalid hostName: must be 1-50 characters, alphanumeric, spaces, underscore, or dash only'
      });
    }

    // Generate unique room ID
    const roomId = generateRoomId();
    console.log('   Generated room ID:', roomId);

    // Create room record
    const room: Room = {
      id: roomId,
      hostName,
      createdAt: new Date(),
      isActive: true,
      isRecording: false
    };

    console.log('   Created room object:', room);

    // Store room in memory
    activeRooms.set(roomId, room);
    console.log('   Stored room in memory. Total rooms:', activeRooms.size);

    // Generate host token
    console.log('   Generating host token...');
    const hostToken = await generateLiveKitToken(roomId, hostName, true);
    console.log('   Host token generated successfully');

    // Create shareable URL (assuming frontend runs on port 5173 in dev, adjust as needed)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${frontendUrl}/stream/${roomId}`;
    console.log('   Share URL:', shareUrl);

    const response = {
      roomId,
      hostToken,
      shareUrl,
      serverUrl: LIVEKIT_SERVER_URL,
      hostName,
      createdAt: room.createdAt
    };

    console.log('✅ Room created successfully:', response);
    res.status(201).json(response);

  } catch (error) {
    console.error('❌ Room creation error:', error);

    if (error instanceof Error && error.message.includes('LiveKit API credentials not configured')) {
      console.log('   Error: LiveKit credentials not configured');
      return res.status(500).json({
        error: 'Server configuration error: LiveKit credentials not configured'
      });
    }

    console.log('   Generic room creation error');
    res.status(500).json({
      error: 'Failed to create room'
    });
  }
});

// Token generation endpoint for joining streams
app.post('/api/token', async (req, res) => {
  try {
    console.log('🎫 Token generation request received');
    console.log('   Request body:', req.body);
    const { roomName, participantName, isHost = false } = req.body;

    // Input validation
    console.log('   Validating inputs...');
    console.log('   roomName:', roomName, 'participantName:', participantName, 'isHost:', isHost);
    
    if (!roomName || !participantName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: roomName and participantName are required'
      });
    }

    if (!validateRoomName(roomName)) {
      console.log('❌ Invalid roomName format');
      return res.status(400).json({
        error: 'Invalid roomName: must be 1-100 characters, alphanumeric, underscore, or dash only'
      });
    }

    if (!validateParticipantName(participantName)) {
      console.log('❌ Invalid participantName format');
      return res.status(400).json({
        error: 'Invalid participantName: must be 1-50 characters, alphanumeric, spaces, underscore, or dash only'
      });
    }

    if (typeof isHost !== 'boolean') {
      console.log('❌ Invalid isHost type');
      return res.status(400).json({
        error: 'Invalid isHost: must be a boolean value'
      });
    }

    // For viewers joining existing rooms, check if room exists and is active
    if (!isHost) {
      const room = activeRooms.get(roomName);
      console.log('Checking room for viewer:', roomName, 'Found:', !!room);
      console.log('Active rooms:', Array.from(activeRooms.keys()));
      
      if (!room) {
        // For development, allow joining any room (in production, you'd want proper room validation)
        console.log('Room not found in memory, but allowing join for development');
        // return res.status(404).json({
        //   error: 'Room not found: The stream you are trying to join does not exist'
        // });
      } else if (!room.isActive) {
        return res.status(410).json({
          error: 'Room inactive: This stream has ended'
        });
      }
    }

    // Generate token using the existing function
    console.log('   Generating LiveKit token...');
    const token = await generateLiveKitToken(roomName, participantName, isHost);
    console.log('   Token generated successfully');

    const response = {
      token,
      serverUrl: LIVEKIT_SERVER_URL,
      roomName,
      participantName,
      isHost
    };

    console.log('✅ Token generation successful:', { ...response, token: 'HIDDEN' });
    res.json(response);

  } catch (error) {
    console.error('❌ Token generation error:', error);

    if (error instanceof Error && error.message.includes('LiveKit API credentials not configured')) {
      console.log('   Error: LiveKit credentials not configured');
      return res.status(500).json({
        error: 'Server configuration error: LiveKit credentials not configured'
      });
    }

    console.log('   Generic token generation error');
    res.status(500).json({
      error: 'Failed to generate token'
    });
  }
});

// Get room information endpoint
app.get('/api/rooms/:roomId', (req, res) => {
  try {
    console.log('Room info request for:', req.params.roomId);
    const { roomId } = req.params;

    if (!roomId || !validateRoomName(roomId)) {
      return res.status(400).json({
        error: 'Invalid roomId parameter'
      });
    }

    const room = activeRooms.get(roomId);
    console.log('Room found:', !!room);
    
    if (!room) {
      // For development, return a default room info if room not found in memory
      console.log('Room not in memory, returning default info for development');
      return res.json({
        roomId: roomId,
        hostName: 'Unknown Host',
        createdAt: new Date(),
        isActive: true,
        isRecording: false,
        recordingUrl: null
      });
    }

    res.json({
      roomId: room.id,
      hostName: room.hostName,
      createdAt: room.createdAt,
      isActive: room.isActive,
      isRecording: room.isRecording,
      recordingUrl: room.recordingUrl
    });

  } catch (error) {
    console.error('Room info error:', error);
    res.status(500).json({
      error: 'Failed to get room information'
    });
  }
});

// End room endpoint
app.delete('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId || !validateRoomName(roomId)) {
      return res.status(400).json({
        error: 'Invalid roomId parameter'
      });
    }

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found: The stream you are trying to end does not exist'
      });
    }

    // Mark room as inactive
    room.isActive = false;
    activeRooms.set(roomId, room);

    res.json({
      message: 'Room ended successfully',
      roomId,
      endedAt: new Date()
    });

  } catch (error) {
    console.error('Room end error:', error);
    res.status(500).json({
      error: 'Failed to end room'
    });
  }
});

// Start recording endpoint
app.post('/api/recordings/start', async (req, res) => {
  try {
    const { roomName } = req.body;

    // Input validation
    if (!roomName) {
      return res.status(400).json({
        error: 'Missing required field: roomName is required'
      });
    }

    if (!validateRoomName(roomName)) {
      return res.status(400).json({
        error: 'Invalid roomName: must be 1-100 characters, alphanumeric, underscore, or dash only'
      });
    }

    // Check if LiveStreamRecorder is available
    if (!liveStreamRecorder) {
      return res.status(500).json({
        error: 'Recording service not available: LiveKit or S3 credentials not configured'
      });
    }

    // Check if room exists and is active
    const room = activeRooms.get(roomName);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found: The stream you are trying to record does not exist'
      });
    }

    if (!room.isActive) {
      return res.status(410).json({
        error: 'Room inactive: Cannot start recording for an inactive stream'
      });
    }

    if (room.isRecording) {
      return res.status(409).json({
        error: 'Recording already active: This stream is already being recorded'
      });
    }

    // Start recording
    const recordingResponse = await liveStreamRecorder.startLiveRecording(roomName);

    // Update room state
    room.isRecording = true;
    room.egressId = recordingResponse.egressId;
    activeRooms.set(roomName, room);

    res.status(201).json({
      egressId: recordingResponse.egressId,
      roomName: recordingResponse.roomName,
      filePath: recordingResponse.filePath,
      status: recordingResponse.status,
      message: 'Recording started successfully'
    });

  } catch (error) {
    console.error('Recording start error:', error);
    res.status(500).json({
      error: `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Stop recording endpoint
app.post('/api/recordings/stop', async (req, res) => {
  try {
    const { egressId } = req.body;

    // Input validation
    if (!egressId) {
      return res.status(400).json({
        error: 'Missing required field: egressId is required'
      });
    }

    if (typeof egressId !== 'string' || egressId.length === 0) {
      return res.status(400).json({
        error: 'Invalid egressId: must be a non-empty string'
      });
    }

    // Check if LiveStreamRecorder is available
    if (!liveStreamRecorder) {
      return res.status(500).json({
        error: 'Recording service not available: LiveKit or S3 credentials not configured'
      });
    }

    // Find room with this egressId
    let targetRoom: Room | undefined;
    let targetRoomId: string | undefined;

    for (const [roomId, room] of activeRooms.entries()) {
      if (room.egressId === egressId) {
        targetRoom = room;
        targetRoomId = roomId;
        break;
      }
    }

    if (!targetRoom || !targetRoomId) {
      return res.status(404).json({
        error: 'Recording not found: No active recording found with the provided egressId'
      });
    }

    if (!targetRoom.isRecording) {
      return res.status(409).json({
        error: 'Recording not active: This recording is not currently active'
      });
    }

    // Stop recording
    const stopResponse = await liveStreamRecorder.stopLiveRecording(egressId);

    // Update room state
    targetRoom.isRecording = false;
    if (stopResponse.status === 'completed' && stopResponse.s3Url) {
      targetRoom.recordingUrl = stopResponse.s3Url;
    }
    activeRooms.set(targetRoomId, targetRoom);

    res.json({
      egressId: stopResponse.egressId,
      s3Url: stopResponse.s3Url,
      status: stopResponse.status,
      error: stopResponse.error,
      message: stopResponse.status === 'completed' ? 'Recording stopped successfully' : 'Recording stopped with errors'
    });

  } catch (error) {
    console.error('Recording stop error:', error);
    res.status(500).json({
      error: `Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Get recording status endpoint
app.get('/api/recordings/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId || !validateRoomName(roomId)) {
      return res.status(400).json({
        error: 'Invalid roomId parameter'
      });
    }

    const room = activeRooms.get(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found: The stream you are looking for does not exist'
      });
    }

    res.json({
      roomId: room.id,
      isRecording: room.isRecording,
      egressId: room.egressId,
      recordingUrl: room.recordingUrl,
      hostName: room.hostName,
      isActive: room.isActive
    });

  } catch (error) {
    console.error('Recording status error:', error);
    res.status(500).json({
      error: 'Failed to get recording status'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err.message);
  console.error('   Stack:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 LiveKit Video Platform Backend Started');
  console.log('==========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('');

  // Validate required environment variables
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_SERVER_URL) {
    console.warn('⚠️  Warning: LiveKit environment variables not configured');
    console.warn('   - Streaming functionality will not work');
  } else {
    console.log('✅ LiveKit configuration: OK');
  }

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
    console.warn('⚠️  Warning: AWS S3 environment variables not configured');
    console.warn('   - Recording functionality will not work');
  } else {
    console.log('✅ AWS S3 configuration: OK');
  }
  
  console.log('');
  console.log('🎯 Ready to accept requests!');
  console.log('==========================================');
});

// Export the generateLiveKitToken function for use in other modules
export const generateLiveKitToken = async (roomName: string, participantName: string, isHost: boolean = false): Promise<string> => {
  console.log('🔑 Generating LiveKit token for:', { roomName, participantName, isHost });
  
  // Validate environment variables
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    console.log('❌ LiveKit API credentials not configured');
    throw new Error('LiveKit API credentials not configured');
  }

  if (!LIVEKIT_SERVER_URL) {
    console.log('❌ LiveKit server URL not configured');
    throw new Error('LiveKit server URL not configured');
  }

  console.log('   Using server URL:', LIVEKIT_SERVER_URL);

  try {
    console.log('   Creating AccessToken...');
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,
    });

    // Set permissions based on role
    const grants = {
      roomJoin: true,
      room: roomName,
      canPublish: isHost,        // Only hosts can publish (stream)
      canSubscribe: true,        // Both hosts and viewers can subscribe (watch)
      canPublishData: true,      // Allow data channel usage for chat
    };
    
    console.log('   Adding grants:', grants);
    at.addGrant(grants);

    console.log('   Converting to JWT...');
    const token = await at.toJwt();
    console.log('✅ Token generated successfully');
    return token;
  } catch (error) {
    console.error('❌ Error generating LiveKit token:', error);
    throw new Error('Failed to generate access token');
  }
};