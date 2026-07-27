import { io, Socket } from "socket.io-client";
import { getApiUrl } from "./client";

let socket: Socket | null = null;

// Connect the realtime gateway (rooms, chat, gifts, matchmaking).
export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io(getApiUrl(), { auth: { token }, transports: ["websocket"] });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
