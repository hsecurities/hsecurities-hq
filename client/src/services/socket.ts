import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('hsec_token') : null;
    socketInstance = io(SOCKET_URL, {
      auth: { token: token ? `Bearer ${token}` : '' },
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });
  }
  return socketInstance;
};

export const connectSocket = (): Socket => {
  const socket = getSocket();
  const token = typeof window !== 'undefined' ? localStorage.getItem('hsec_token') : null;
  if (token) {
    socket.auth = { token: `Bearer ${token}` };
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
