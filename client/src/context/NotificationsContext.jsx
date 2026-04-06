import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSocketConnection } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('notifications') || '[]');
    } catch {
      return [];
    }
  });
  const { socket } = useSocketConnection();
  const { user } = useAuth();
  const { addToast } = useToast();

  const add = useCallback((msg, type = 'info', key = '') => {
    const n = { id: Date.now(), msg, type, time: new Date().toISOString(), read: false, key };
    setNotifications((prev) => {
      if (key && prev.some((item) => item.key === key)) return prev;
      const next = [n, ...prev].slice(0, 50);
      localStorage.setItem('notifications', JSON.stringify(next));
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem('notifications', JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onSlots = (data) => {
      if (!data?.message) return;
      add(data.message, 'slot', `slot-${data.message}-${data.bookedSlotId || data.freedSlotId || ''}`);
    };

    const onBookings = (data) => {
      if (!data?.message) return;
      add(data.message, 'booking', `booking-${data.message}-${data.bookingId || ''}`);
    };

    const canSeeBookingMessage = (data) => {
      if (!user || data?.senderId === user.id) return false;
      if (data?.visibility === 'participant') return user.role === 'candidate' || user.role === 'recruiter';
      if (data?.visibility === 'admin') return user.role === 'recruiter' || user.role === 'admin';
      return false;
    };

    const onMessages = (data) => {
      if (!data?.message || !canSeeBookingMessage(data)) return;
      add(data.message, 'message', `message-${data.bookingId}-${data.visibility}-${data.senderId}`);
      addToast(data.message, 'message');
    };

    const onSlotMessages = (data) => {
      if (!data?.message || !user) return;
      if (!['admin', 'recruiter'].includes(user.role)) return;
      if (data?.senderId === user.id) return;
      add(data.message, 'message', `slot-message-${data.slotId}-${data.senderId}`);
      addToast(data.message, 'message');
    };

    socket.on('slots:updated', onSlots);
    socket.on('bookings:updated', onBookings);
    socket.on('messages:updated', onMessages);
    socket.on('slot-messages:updated', onSlotMessages);

    return () => {
      socket.off('slots:updated', onSlots);
      socket.off('bookings:updated', onBookings);
      socket.off('messages:updated', onMessages);
      socket.off('slot-messages:updated', onSlotMessages);
    };
  }, [socket, add, addToast, user]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unread, add, markAllRead, clear }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
