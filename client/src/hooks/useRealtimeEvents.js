import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export function useRealtimeEvents(callbacks = {}) {
  const socket = useSocket();
  const { addToast } = useToast();
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!socket) return;

    const handleSlotsUpdate = (data) => {
      const cb = callbacksRef.current;
      if (cb.onSlotsUpdate) cb.onSlotsUpdate(data);
      if (data?.message) addToast(data.message, 'info');
      if (!data?.message && data?.bookedSlotId) {
        addToast('Slots updated – availability may have changed', 'info');
      }
      if (!data?.message && data?.freedSlotId) {
        addToast('A slot just became available', 'success');
      }
    };

    const handleBookingsUpdate = (data) => {
      const cb = callbacksRef.current;
      if (cb.onBookingsUpdate) cb.onBookingsUpdate(data);
      if (data?.message) addToast(data.message, 'success');
    };

    socket.on('slots:updated', handleSlotsUpdate);
    socket.on('bookings:updated', handleBookingsUpdate);

    return () => {
      socket.off('slots:updated', handleSlotsUpdate);
      socket.off('bookings:updated', handleBookingsUpdate);
    };
  }, [socket, addToast]);
}
