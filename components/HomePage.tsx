
import React, { useState, FormEvent, useEffect } from 'react';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string, token: string) => void;
  error: string | null;
  clearError: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom, error, clearError }) => {
  const [roomId, setRoomId] = useState('');
  const [token, setToken] = useState('');

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (roomId && token) {
      onJoinRoom(roomId, token);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="animate-fade-in">
      <div className="text-center">
        <button
          onClick={onCreateRoom}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
        >
          Create New Session
        </button>
      </div>

      <div className="my-8 flex items-center text-center">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="flex-shrink mx-4 text-gray-400 font-semibold">OR</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>

      <div>
        <h2 className="text-xl text-center font-semibold text-gray-300 mb-4">Join an Existing Session</h2>
        <form onSubmit={handleJoin} className="space-y-4 max-w-md mx-auto">
          <div>
            <label htmlFor="roomId" className="block text-sm font-medium text-gray-400 mb-1">Room ID</label>
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              required
              className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-400 mb-1">Access Key</label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter Access Key"
              required
              className="w-full bg-gray-700 border-2 border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={!roomId || !token}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-teal-500/50"
          >
            Join Session
          </button>
        </form>
      </div>
      {error && (
        <div className="mt-6 p-3 bg-red-800/50 border border-red-700 text-red-200 rounded-lg text-center max-w-md mx-auto">
          {error}
        </div>
      )}
    </div>
  );
};
