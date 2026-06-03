import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api-client';

let socket: Socket | null = null;

// Socket.IO server runs at the API origin (strip the /api/v1 suffix).
function socketUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '');
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(socketUrl(), { auth: { token: getAccessToken() }, autoConnect: true });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
