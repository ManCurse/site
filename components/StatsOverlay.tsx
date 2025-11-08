
import React from 'react';
import { StreamStats } from '../types';

interface StatsOverlayProps {
  stats: StreamStats;
}

export const StatsOverlay: React.FC<StatsOverlayProps> = ({ stats }) => {
  return (
    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm p-3 rounded-lg text-sm text-white font-mono pointer-events-none">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-gray-400">Resolution:</span> <span>{stats.resolution}</span>
        <span className="text-gray-400">Bitrate:</span> <span>{stats.bitrate}</span>
        <span className="text-gray-400">FPS:</span> <span>{stats.fps}</span>
        <span className="text-gray-400">Jitter:</span> <span>{stats.jitter.toFixed(4)}s</span>
        <span className="text-gray-400">Packets Lost:</span> <span>{stats.packetsLost}</span>
      </div>
    </div>
  );
};
