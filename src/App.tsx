import React, { useState, useCallback } from 'react';
import { HomePage } from './components/HomePage';
import { StreamPage } from './components/StreamPage';
import { AppView, Role } from './types';
import { mockSignalingService } from './services/mockSignalingService';

/*
  For detailed architecture, setup, testing instructions, and the backend
  API contract, please refer to the README.md file.
*/

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [role, setRole] = useState<Role | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = useCallback(() => {
    try {
      const { roomId, token } = mockSignalingService.createRoom();
      setRoomId(roomId);
      setToken(token);
      setRole('host');
      setView('stream');
      setError(null);
    } catch (e) {
      setError('Failed to create room.');
      console.error(e);
    }
  }, []);

  const handleJoinRoom = useCallback((joinRoomId: string, joinToken: string) => {
    try {
      if (mockSignalingService.validateToken(joinRoomId, joinToken)) {
        setRoomId(joinRoomId);
        setToken(joinToken);
        setRole('viewer');
        setView('stream');
        setError(null);
      } else {
        setError('Invalid Room ID or Access Key.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to join room.');
      console.error(e);
    }
  }, []);
  
  const handleLeave = useCallback(() => {
    if (roomId && token && role === 'host') {
      mockSignalingService.closeRoom(roomId, token);
    }
    setView('home');
    setRole(null);
    setRoomId(null);
    setToken(null);
    setError(null);
  }, [roomId, token, role]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
            Secure Screen Share
          </h1>
          <p className="text-gray-400 mt-2">Ultra-low latency streaming powered by WebRTC.</p>
        </header>
        <main className="bg-gray-800 rounded-xl shadow-2xl p-4 md:p-8 w-full">
          {view === 'home' && (
            <HomePage 
              onCreateRoom={handleCreateRoom} 
              onJoinRoom={handleJoinRoom} 
              error={error} 
              clearError={() => setError(null)} 
            />
          )}
          {view === 'stream' && role && roomId && token && (
            <StreamPage 
              role={role}
              roomId={roomId}
              token={token}
              onLeave={handleLeave}
            />
          )}
        </main>
      </div>
    </div>
  );
}