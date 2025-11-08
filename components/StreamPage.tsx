
import React, { useState, useCallback, useEffect } from 'react';
import { Role, Quality } from '../types';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoPlayer } from './VideoPlayer';
import { StatsOverlay } from './StatsOverlay';
import { CopyIcon, MicOnIcon, MicOffIcon, SpinnerIcon, ScreenShareIcon } from './icons';

interface StreamPageProps {
  role: Role;
  roomId: string;
  token: string;
  onLeave: () => void;
}

const QUALITY_OPTIONS: Quality[] = ['native', '1440p', '1080p', '720p'];

export const StreamPage: React.FC<StreamPageProps> = ({ role, roomId, token, onLeave }) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showCopiedRoom, setShowCopiedRoom] = useState(false);
  const [showCopiedToken, setShowCopiedToken] = useState(false);
  const {
    startScreenShare,
    stopScreenShare,
    changeQuality,
    localStream,
    remoteStream,
    stats,
    isSharing,
    connectionState,
    error,
  } = useWebRTC(role, roomId, token);

  const handleStart = useCallback(() => {
    startScreenShare(isAudioEnabled);
  }, [startScreenShare, isAudioEnabled]);

  const handleStop = useCallback(() => {
    stopScreenShare();
    onLeave();
  }, [stopScreenShare, onLeave]);

  useEffect(() => {
    // For viewers, the connection starts automatically via the hook's useEffect
    // For hosts, this effect ensures cleanup on component unmount (e.g., browser back)
    return () => {
      if (isSharing) {
        stopScreenShare();
      }
    };
  }, [isSharing, stopScreenShare]);

  const copyToClipboard = (text: string, callback: () => void) => {
    navigator.clipboard.writeText(text).then(() => {
      callback();
      setTimeout(() => {
        setShowCopiedRoom(false);
        setShowCopiedToken(false);
      }, 2000);
    });
  };

  const renderHostView = () => (
    <div>
      {!isSharing ? (
        <div className="bg-gray-700/50 rounded-lg p-8 text-center animate-fade-in">
          <h2 className="text-2xl font-bold mb-4">You are the host</h2>
          <p className="text-gray-400 mb-6">Share your session details with viewers.</p>
          <div className="space-y-4 max-w-lg mx-auto mb-8 text-left">
            <div className="flex items-center bg-gray-900 p-3 rounded-lg">
              <span className="text-gray-400 mr-2">Room ID:</span>
              <code className="text-teal-300 flex-grow">{roomId}</code>
              <button onClick={() => copyToClipboard(roomId, () => setShowCopiedRoom(true))} className="ml-2 p-1 text-gray-400 hover:text-white transition">
                {showCopiedRoom ? 'Copied!' : <CopyIcon />}
              </button>
            </div>
            <div className="flex items-center bg-gray-900 p-3 rounded-lg">
              <span className="text-gray-400 mr-2">Access Key:</span>
              <code className="text-teal-300 flex-grow">{token}</code>
              <button onClick={() => copyToClipboard(token, () => setShowCopiedToken(true))} className="ml-2 p-1 text-gray-400 hover:text-white transition">
                {showCopiedToken ? 'Copied!' : <CopyIcon />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-4 mb-8">
            <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition ${isAudioEnabled ? 'bg-blue-600/30 text-blue-300' : 'bg-gray-600 text-gray-300'}`}>
              {isAudioEnabled ? <MicOnIcon/> : <MicOffIcon/>}
              <span>Share System Audio</span>
            </button>
          </div>

          <button onClick={handleStart} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 flex items-center justify-center mx-auto">
            <ScreenShareIcon className="mr-2"/>
            Start Screen Share
          </button>
          {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
      ) : (
        <div className="relative">
          <VideoPlayer stream={localStream} muted={true} />
          <StatsOverlay stats={stats} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-xl p-2 flex items-center space-x-4">
            <button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition">Stop Sharing</button>
            <select onChange={(e) => changeQuality(e.target.value as Quality)} className="bg-gray-700 text-white border-none rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q === 'native' ? 'Native' : `${q.toUpperCase()}`}</option>)}
            </select>
            <div className="flex items-center space-x-2 text-white px-2">
              {isAudioEnabled ? <MicOnIcon /> : <MicOffIcon />}
              <span>{isAudioEnabled ? 'Audio On' : 'Audio Off'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderViewerView = () => (
    <div className="w-full h-full flex items-center justify-center">
      {remoteStream && connectionState === 'connected' ? (
        <div className="relative w-full">
            <VideoPlayer stream={remoteStream} muted={false} />
            <StatsOverlay stats={stats} />
        </div>
      ) : (
        <div className="text-center p-8">
            <SpinnerIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">{connectionState === 'closed' || connectionState === 'failed' ? 'Stream has ended.' : 'Connecting to host...'}</h2>
            <p className="text-gray-400">Connection state: {connectionState}</p>
            {error && <p className="text-red-400 mt-4">{error}</p>}
            <button onClick={onLeave} className="mt-6 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition">
              Back to Home
            </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {role === 'host' ? renderHostView() : renderViewerView()}
    </div>
  );
};
