import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

export function useRealtimeEvents(callbacks = {}) {
  const socket = useSocket();
  const { addToast } = useToast();
  const callbacksRef = useRef(callbacks);
  const lastToastRef = useRef({ key: '', at: 0 });
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!socket) return;

    const showToast = (key, message, type = 'info') => {
      const now = Date.now();
      const last = lastToastRef.current;
      if (last.key === key && now - last.at < 1500) return;
      lastToastRef.current = { key, at: now };
      addToast(message, type);
    };

    const handleSlotsUpdate = (data) => {
      const cb = callbacksRef.current;
      if (cb.onSlotsUpdate) cb.onSlotsUpdate(data);

      if (data?.message) {
        showToast(`slots-${data.message}`, data.message, 'info');
      }
      if (!data?.message && data?.bookedSlotId) {
        showToast('slot-booked', 'A slot was just booked. Availability changed.', 'info');
      }
      if (!data?.message && data?.freedSlotId) {
        showToast('slot-freed', 'A slot is available again.', 'success');
      }
    };

    const handleBookingsUpdate = (data) => {
      const cb = callbacksRef.current;
      if (cb.onBookingsUpdate) cb.onBookingsUpdate(data);
      if (cb.toastBookings && data?.message) {
        showToast(`bookings-${data.message}`, data.message, 'success');
      }
    };

    const handleMessagesUpdate = (data) => {
      const cb = callbacksRef.current;
      if (cb.onMessagesUpdate) cb.onMessagesUpdate(data);
      const shouldToast = typeof cb.shouldToastMessages === 'function'
        ? cb.shouldToastMessages(data)
        : true;
      if (cb.toastMessages && shouldToast && data?.message) {
        showToast(`messages-${data.bookingId}-${data.visibility}`, data.message, 'info');
      }
    };

    const handleSlotMessagesUpdate = (data) => {
      const cb = callbacksRef.current;
      if (cb.onSlotMessagesUpdate) cb.onSlotMessagesUpdate(data);
      const shouldToast = typeof cb.shouldToastSlotMessages === 'function'
        ? cb.shouldToastSlotMessages(data)
        : true;
      if (cb.toastSlotMessages && shouldToast && data?.message) {
        showToast(`slot-messages-${data.slotId}`, data.message, 'info');
      }
    };

    socket.on('slots:updated', handleSlotsUpdate);
    socket.on('bookings:updated', handleBookingsUpdate);
    socket.on('messages:updated', handleMessagesUpdate);
    socket.on('slot-messages:updated', handleSlotMessagesUpdate);

    return () => {
      socket.off('slots:updated', handleSlotsUpdate);
      socket.off('bookings:updated', handleBookingsUpdate);
      socket.off('messages:updated', handleMessagesUpdate);
      socket.off('slot-messages:updated', handleSlotMessagesUpdate);
    };
  }, [socket, addToast]);
}
