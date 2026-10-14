import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const socketUrl = configuredApiUrl.replace(/\/$/, '').replace(/\/api$/, '');
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setSocket(newSocket);
      setConnected(true);
      newSocket.emit('subscribe_products');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    socketRef.current = newSocket;

    return () => {
      socketRef.current = null;
      newSocket.close();
    };
  }, []);

  const subscribe = useCallback(
    (event: string, handler: (data: any) => void) => {
      const socket = socketRef.current;
      if (socket) {
        socket.on(event, handler);
        return () => {
          socket.off(event, handler);
        };
      }
    },
    []
  );

  return { socket, connected, subscribe };
}
