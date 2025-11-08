
import { useState, useEffect, useRef, useCallback } from 'react';
import { Role, Quality, StreamStats, SignalingMessage } from '../types';
import { mockSignalingService } from '../services/mockSignalingService';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const INITIAL_STATS: StreamStats = {
  resolution: 'N/A',
  bitrate: '0 kbps',
  fps: 0,
  packetsLost: 0,
  jitter: 0,
};

export const useWebRTC = (role: Role, roomId: string, token: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [stats, setStats] = useState<StreamStats>(INITIAL_STATS);
  const [error, setError] = useState<string | null>(null);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const statsInterval = useRef<number | null>(null);
  const videoSender = useRef<RTCRtpSender | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);


  const handleSignalingMessage = useCallback(async (msg: SignalingMessage) => {
    const { type, payload, senderId } = msg;
    let pc = peerConnections.current.get(senderId);

    if (role === 'host' && type === 'webrtc-answer') {
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
        }
    } else if (role === 'viewer' && type === 'webrtc-offer') {
        if (!pc) {
            pc = createPeerConnection(senderId);
            peerConnections.current.set(senderId, pc);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        mockSignalingService.sendMessage({ type: 'webrtc-answer', payload: answer, senderId: mockSignalingService.id, targetId: senderId });
    } else if (type === 'webrtc-ice-candidate') {
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
        }
    } else if (type === 'stop-broadcast') {
        stopScreenShare();
    }
  }, [role]);

  const handleNewViewer = useCallback((viewerId: string) => {
      if (role === 'host' && localStreamRef.current) {
          const pc = createPeerConnection(viewerId);
          peerConnections.current.set(viewerId, pc);
          localStreamRef.current.getTracks().forEach(track => {
              const sender = pc.addTrack(track, localStreamRef.current!);
              if(track.kind === 'video') {
                  videoSender.current = sender;
              }
          });
      }
  }, [role]);
  
  useEffect(() => {
    mockSignalingService.joinRoom(roomId, token);
    mockSignalingService.on('message', handleSignalingMessage);
    if (role === 'host') {
        mockSignalingService.on('viewer-joined', handleNewViewer);
    }

    return () => {
        mockSignalingService.off('message', handleSignalingMessage);
        if (role === 'host') {
            mockSignalingService.off('viewer-joined', handleNewViewer);
        }
        stopScreenShare();
        mockSignalingService.leaveRoom();
    };
  }, [roomId, token, role, handleSignalingMessage, handleNewViewer]);


  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            mockSignalingService.sendMessage({ type: 'webrtc-ice-candidate', payload: event.candidate, senderId: mockSignalingService.id, targetId: peerId });
        }
    };
    
    pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        if(pc.connectionState === 'connected') {
            if(statsInterval.current) clearInterval(statsInterval.current);
            statsInterval.current = window.setInterval(() => updateStats(pc), 1000);
        } else if (['disconnected', 'closed', 'failed'].includes(pc.connectionState)) {
            if(statsInterval.current) clearInterval(statsInterval.current);
            setStats(INITIAL_STATS);
        }
    };

    if (role === 'viewer') {
        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };
    }
    
    if (role === 'host') {
        pc.onnegotiationneeded = async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            mockSignalingService.sendMessage({ type: 'webrtc-offer', payload: offer, senderId: mockSignalingService.id, targetId: peerId });
        };
    }
    return pc;
  };

  const startScreenShare = async (withAudio: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        // FIX: The 'cursor' property is valid for getDisplayMedia but is not in the default
        // TypeScript MediaTrackConstraints type. Casting to `any` resolves the type error.
        video: { cursor: 'always' } as any,
        audio: withAudio,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      setIsSharing(true);
      setError(null);
    } catch (err: any) {
      console.error("Error starting screen share:", err);
      setError(`Could not start screen share: ${err.message}. Audio capture might not be supported in your browser.`);
      setIsSharing(false);
    }
  };

  const stopScreenShare = useCallback(() => {
    mockSignalingService.sendMessage({ type: 'stop-broadcast', payload: null, senderId: mockSignalingService.id });

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    localStreamRef.current = null;

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    if(statsInterval.current) clearInterval(statsInterval.current);
    
    setIsSharing(false);
    setRemoteStream(null);
    setConnectionState('closed');
    setStats(INITIAL_STATS);
    videoSender.current = null;
  }, []);

  const changeQuality = useCallback(async (quality: Quality) => {
    if (role !== 'host' || !videoSender.current) return;

    const parameters = videoSender.current.getParameters();
    if (!parameters.encodings) {
      parameters.encodings = [{}];
    }
    
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    
    const { width, height } = track.getSettings();
    const nativeHeight = height || 1080;

    const qualityMap: Record<Quality, { scale?: number, bitrate?: number }> = {
        'native': { scale: 1, bitrate: 8_000_000 },
        '1440p': { scale: nativeHeight > 1440 ? 1 : nativeHeight / 1440, bitrate: 6_000_000 },
        '1080p': { scale: nativeHeight > 1080 ? nativeHeight / 1080 : 1, bitrate: 4_000_000 },
        '720p': { scale: nativeHeight > 720 ? nativeHeight / 720 : 1, bitrate: 2_000_000 },
    };
    
    parameters.encodings[0].scaleResolutionDownBy = qualityMap[quality].scale;
    parameters.encodings[0].maxBitrate = qualityMap[quality].bitrate;
    
    await videoSender.current.setParameters(parameters);
  }, [role]);

  const updateStats = async (pc: RTCPeerConnection) => {
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    const receiver = pc.getReceivers().find(r => r.track?.kind === 'video');
    const reports = await (sender || receiver)?.getStats();
    if (!reports) return;

    let newStats: Partial<StreamStats> = {};
    
    reports.forEach(report => {
        if(report.type === 'outbound-rtp' && sender) {
            newStats.bitrate = `${(report.bytesSent / 1024 / 1024 * 8).toFixed(2)} Mbps`;
            newStats.resolution = `${report.frameWidth}x${report.frameHeight}`;
            newStats.fps = report.framesPerSecond;
        }
        if(report.type === 'inbound-rtp' && receiver) {
            newStats.bitrate = `${(report.bytesReceived / 1024 / 1024 * 8).toFixed(2)} Mbps`;
            newStats.resolution = `${report.frameWidth}x${report.frameHeight}`;
            newStats.fps = report.framesPerSecond;
            newStats.packetsLost = report.packetsLost;
            newStats.jitter = report.jitter;
        }
    });

    setStats(prev => ({...prev, ...newStats}));
  };

  return { 
    startScreenShare, 
    stopScreenShare, 
    changeQuality,
    localStream, 
    remoteStream, 
    stats,
    isSharing, 
    connectionState,
    error,
  };
};
