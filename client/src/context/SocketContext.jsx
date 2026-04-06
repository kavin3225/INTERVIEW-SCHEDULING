import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      window.location.origin;
    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => setIsConnected(true));
    socketInstance.on('disconnect', () => setIsConnected(false));

    return () => {
      socketInstance.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  const value = socket ? { socket, isConnected } : null;

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  return ctx?.socket ?? null;
}

export function useSocketConnection() {
  const ctx = useContext(SocketContext);
  return { socket: ctx?.socket ?? null, isConnected: ctx?.isConnected ?? false };
}
