import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationsContext';
import './NotificationsBell.css';

export default function NotificationsBell() {
  const { notifications, unread, markAllRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function toggle() {
    setOpen((v) => !v);
    if (!open) markAllRead();
  }

  function fmt(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="nb-wrap" ref={ref}>
      <button className="nb-btn" onClick={toggle} aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="nb-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="nb-dropdown">
          <div className="nb-header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button className="nb-clear" onClick={clear}>Clear all</button>
            )}
          </div>
          <div className="nb-list">
            {notifications.length === 0 ? (
              <p className="nb-empty">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`nb-item nb-type-${n.type}`}>
                  <span className="nb-dot" />
                  <div className="nb-content">
                    <p className="nb-msg">{n.msg}</p>
                    <span className="nb-time">{fmt(n.time)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
