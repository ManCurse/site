
import { SignalingMessage } from '../types';

type Room = {
  hostId: string;
  token: string;
  viewers: Set<string>;
  hostHeartbeatTimeout?: number;
};

// This class simulates a signaling server using an EventEmitter pattern.
// In a real application, this would be replaced with a WebSocket client
// that communicates with a real backend server.
class MockSignalingService {
  public id: string = this.generateId();
  private rooms: Map<string, Room> = new Map();
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  private generateId() {
    return Math.random().toString(36).substring(2, 11);
  }

  // Simulates a user connecting to the signaling server.
  constructor() {
    console.log(`Mock signaling client initialized with ID: ${this.id}`);
  }

  // --- Public API (mimics a real service) ---

  createRoom(): { roomId: string; token: string } {
    const roomId = this.generateId();
    const token = this.generateId() + this.generateId();
    this.rooms.set(roomId, { hostId: this.id, token, viewers: new Set() });
    console.log(`Room created: ${roomId} by host ${this.id}`);
    return { roomId, token };
  }

  joinRoom(roomId: string, token: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.error(`Attempted to join non-existent room: ${roomId}`);
      return;
    }

    if (room.hostId === this.id) { // Host is joining their own room
      this.startHostHeartbeat(roomId, token);
    } else { // Viewer is joining
      if (room.token !== token) {
        console.error(`Invalid token for room ${roomId}`);
        return;
      }
      room.viewers.add(this.id);
      this.emitTo(room.hostId, 'viewer-joined', this.id);
    }
    console.log(`Client ${this.id} joined room ${roomId}`);
  }

  validateToken(roomId: string, token: string): boolean {
    const room = this.rooms.get(roomId);
    return !!room && room.token === token;
  }
  
  leaveRoom() {
    // In a real app, the server would handle this on WebSocket disconnect.
    // Here it's more of a client-side cleanup simulation.
    console.log(`Client ${this.id} is leaving all rooms.`);
  }

  closeRoom(roomId: string, token: string) {
    const room = this.rooms.get(roomId);
    if (room && room.hostId === this.id && room.token === token) {
      if(room.hostHeartbeatTimeout) clearTimeout(room.hostHeartbeatTimeout);
      this.rooms.delete(roomId);
      console.log(`Host ${this.id} closed room ${roomId}.`);
    }
  }

  sendMessage(message: Omit<SignalingMessage, 'senderId'> & { senderId?: string }) {
    // Find which room the sender is in
    const senderId = message.senderId || this.id;
    const room = this.findRoomByClientId(senderId);
    if (!room) {
      console.error(`Cannot send message, client ${senderId} not in a room.`);
      return;
    }

    const fullMessage: SignalingMessage = { ...message, senderId };
    
    if (fullMessage.targetId) { // Unicast
      this.emitTo(fullMessage.targetId, 'message', fullMessage);
    } else { // Broadcast
        if (senderId === room.hostId) { // Host sends to all viewers
            room.viewers.forEach(viewerId => this.emitTo(viewerId, 'message', fullMessage));
        } else { // Viewer sends to host
            this.emitTo(room.hostId, 'message', fullMessage);
        }
    }
  }

  on(event: 'message' | 'viewer-joined', callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: 'message' | 'viewer-joined', callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) return;
    const filteredListeners = this.listeners.get(event)!.filter(l => l !== callback);
    this.listeners.set(event, filteredListeners);
  }

  // --- Internal Simulation Logic ---
  
  private startHostHeartbeat(roomId: string, token: string) {
    const room = this.rooms.get(roomId);
    if(!room || room.hostId !== this.id) return;
    
    if(room.hostHeartbeatTimeout) clearTimeout(room.hostHeartbeatTimeout);

    const heartbeat = () => {
      // In a real app, this would be a WebSocket ping/pong.
      // Here, we just reset the timeout.
      room.hostHeartbeatTimeout = window.setTimeout(() => {
        this.handleHostDisconnect(roomId);
      }, 7000); // 7s timeout
    };
    
    // Simulate host closing tab
    window.addEventListener('beforeunload', () => {
      this.handleHostDisconnect(roomId);
      this.closeRoom(roomId, token);
    });

    heartbeat(); // Start the first heartbeat
  }

  private handleHostDisconnect(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      console.log(`Host for room ${roomId} timed out. Notifying viewers.`);
      const disconnectMessage: SignalingMessage = { type: 'stop-broadcast', payload: null, senderId: room.hostId };
      room.viewers.forEach(viewerId => {
        this.emitTo(viewerId, 'message', disconnectMessage);
      });
      this.rooms.delete(roomId);
    }
  }
  
  private findRoomByClientId(clientId: string): Room | undefined {
    for(const room of this.rooms.values()) {
        if (room.hostId === clientId || room.viewers.has(clientId)) {
            return room;
        }
    }
    return undefined;
  }

  private emitTo(targetClientId: string, event: string, ...args: any[]) {
    // This is the core of the mock. In a real app, this is `socket.to(targetSocketId).emit(...)`
    // Since we are in the same browser context, we can't directly target another "client".
    // This implementation relies on the fact that all instances of useWebRTC hook
    // share the same mockSignalingService instance and listen for events.
    // The logic inside the hook will filter messages not intended for it.
    // This is a simplification for the demo.
    this.emit(event, ...args);
  }

  private emit(event: string, ...args: any[]) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(...args));
    }
  }
}

// Singleton instance to be shared across the application
export const mockSignalingService = new MockSignalingService();
