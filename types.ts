
export type Role = 'host' | 'viewer';
export type AppView = 'home' | 'stream';

export type Quality = 'native' | '1440p' | '1080p' | '720p';

export interface QualitySettings {
  quality: Quality;
  resolution?: { width: number; height: number };
  bitrate?: number; // in bps
  framerate?: number;
}

export interface StreamStats {
  resolution: string;
  bitrate: string; // formatted string e.g., "1.2 Mbps"
  fps: number;
  packetsLost: number;
  jitter: number;
}

// Describes a message sent through the signaling channel
export interface SignalingMessage {
  type: 'webrtc-offer' | 'webrtc-answer' | 'webrtc-ice-candidate' | 'stop-broadcast';
  payload: any;
  // Target viewerId for host-to-viewer messages, or undefined to broadcast
  targetId?: string; 
  // Sender's ID
  senderId: string;
}
