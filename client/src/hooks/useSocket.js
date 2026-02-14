import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV ? window.location.origin : (import.meta.env.VITE_API_URL || window.location.origin);

export function useSocket(events = {}) {
  const socketRef = useRef(null);
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    const onSlots = () => { if (eventsRef.current.slotsUpdated) eventsRef.current.slotsUpdated(); };
    const onBookings = () => { if (eventsRef.current.bookingsUpdated) eventsRef.current.bookingsUpdated(); };
    socket.on('slots:updated', onSlots);
    socket.on('bookings:updated', onBookings);

    return () => {
      socket.off('slots:updated', onSlots);
      socket.off('bookings:updated', onBookings);
      socket.close();
      socketRef.current = null;
    };
  }, []);

  return socketRef.current;
}
