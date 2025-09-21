import { EgressClient, EncodedFileOutput, S3Upload, EncodedFileType, EgressStatus } from 'livekit-server-sdk';

export interface RecordingRequest {
  roomName: string;
}

export interface RecordingResponse {
  egressId: string;
  roomName: string;
  filePath: string;
  status: 'starting' | 'active' | 'stopping' | 'completed' | 'failed';
}

export interface RecordingStopRequest {
  egressId: string;
}

export interface RecordingStopResponse {
  egressId: string;
  s3Url?: string;
  status: 'completed' | 'failed';
  error?: string;
}

export class LiveStreamRecorder {
  private egressClient: EgressClient;
  private s3Config: {
    accessKey: string;
    secret: string;
    region: string;
    bucket: string;
  };

  constructor() {
    // Validate required environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_SERVER_URL;
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
    const s3Bucket = process.env.S3_BUCKET_NAME;
    const s3Region = process.env.S3_REGION || 'us-east-1';

    if (!apiKey || !apiSecret || !serverUrl) {
      throw new Error('LiveKit API credentials not configured');
    }

    if (!awsAccessKey || !awsSecret || !s3Bucket) {
      throw new Error('AWS S3 credentials not configured');
    }

    this.egressClient = new EgressClient(serverUrl, apiKey, apiSecret);
    
    this.s3Config = {
      accessKey: awsAccessKey,
      secret: awsSecret,
      region: s3Region,
      bucket: s3Bucket,
    };
  }

  async startLiveRecording(roomName: string): Promise<RecordingResponse> {
    try {
      // Generate unique file path for this recording
      const timestamp = Date.now();
      const filePath = `live-recordings/${roomName}/${timestamp}.mp4`;

      // Create S3Upload object
      const s3Upload = new S3Upload({
        accessKey: this.s3Config.accessKey,
        secret: this.s3Config.secret,
        region: this.s3Config.region,
        bucket: this.s3Config.bucket,
      });

      // Create EncodedFileOutput object
      const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: filePath,
        output: {
          case: 's3',
          value: s3Upload,
        },
      });

      // Start the egress recording with minimal options
      const egressInfo = await this.egressClient.startRoomCompositeEgress(
        roomName,
        fileOutput,
        {
          layout: 'grid',
          audioOnly: false,
          videoOnly: false,
        }
      );

      return {
        egressId: egressInfo.egressId,
        roomName,
        filePath,
        status: 'starting',
      };

    } catch (error) {
      console.error('Failed to start live recording:', error);
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stopLiveRecording(egressId: string): Promise<RecordingStopResponse> {
    try {
      // Stop the egress recording
      const egressInfo = await this.egressClient.stopEgress(egressId);

      // Check if recording completed successfully
      if (egressInfo.status === EgressStatus.EGRESS_COMPLETE && egressInfo.fileResults && egressInfo.fileResults.length > 0) {
        const fileResult = egressInfo.fileResults[0];
        if (fileResult && fileResult.filename) {
          const s3Url = `https://${this.s3Config.bucket}.s3.${this.s3Config.region}.amazonaws.com/${fileResult.filename}`;
          
          return {
            egressId,
            s3Url,
            status: 'completed',
          };
        }
      }
      
      return {
        egressId,
        status: 'failed',
        error: `Recording failed with status: ${egressInfo.status}`,
      };

    } catch (error) {
      console.error('Failed to stop live recording:', error);
      return {
        egressId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getRecordingStatus(egressId: string) {
    try {
      const egressInfo = await this.egressClient.listEgress({ egressId });
      return egressInfo;
    } catch (error) {
      console.error('Failed to get recording status:', error);
      throw new Error(`Failed to get recording status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}