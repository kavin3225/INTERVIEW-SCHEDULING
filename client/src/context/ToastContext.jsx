import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

const ToastContext = createContext(null);

const ICONS = {
  info: 'i',
  success: 'OK',
  warning: '!',
  error: 'X',
  slot: 'S',
  booking: 'B',
  message: 'M',
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const exitTimerRef = useRef(null);
  const removeTimerRef = useRef(null);
  const lastToastRef = useRef({ message: '', type: '', at: 0 });

  const addToast = useCallback((message, type = 'info') => {
    const now = Date.now();
    const last = lastToastRef.current;

    if (last.message === message && last.type === type && now - last.at < 1800) {
      return;
    }

    lastToastRef.current = { message, type, at: now };

    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);

    const id = now;
    setToast({ id, message, type, exiting: false });

    exitTimerRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? { ...current, exiting: true } : current));
    }, 2600);

    removeTimerRef.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2900);
  }, []);

  const dismissToast = useCallback(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="toast-container">
          {toast && (
            <div
              key={toast.id}
              className={`toast toast-${toast.type}${toast.exiting ? ' toast-exit' : ''}`}
              onClick={dismissToast}
              role="status"
              aria-live="polite"
            >
              <span className="toast-icon">{ICONS[toast.type] || ICONS.info}</span>
              <span className="toast-msg">{toast.message}</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
