import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocketConnection } from '../context/SocketContext';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import Layout from '../components/Layout';
import { bookingsApi } from '../api/client';
import './Bookings.css';

export default function Bookings() {
  const { user } = useAuth();
  const { isConnected } = useSocketConnection();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBookings = useCallback(async () => {
    try {
      setError('');
      const list = await bookingsApi.list();
      setBookings(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeEvents({
    onBookingsUpdate: fetchBookings,
    onSlotsUpdate: fetchBookings,
  });

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const canUpdateStatus = user?.role === 'recruiter' || user?.role === 'admin' || user?.role === 'candidate';

  return (
    <Layout>
      <div className="page-header-row">
        <h1 className="page-title">
          {user?.role === 'candidate' ? 'My Bookings' : 'Bookings'}
        </h1>
        {isConnected && (
          <span className="live-badge" title="Real-time updates active">
            <span className="live-dot"></span> Live
          </span>
        )}
      </div>
      {error && <div className="auth-error">{error}</div>}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon">📝</div>
          <h3>No bookings yet</h3>
          <p>Your interview bookings will appear here</p>
        </div>
      ) : (
        <div className="bookings-grid">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} onUpdate={fetchBookings} canUpdate={canUpdateStatus} />
          ))}
        </div>
      )}
    </Layout>
  );
}

function BookingCard({ booking, onUpdate, canUpdate }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  async function setStatus(status) {
    setLoading(true);
    try {
      await bookingsApi.updateStatus(booking.id, status);
      onUpdate();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  const isPast = booking.InterviewSlot?.slotDate < new Date().toISOString().slice(0, 10);
  const isActive = booking.status === 'scheduled';

  return (
    <div className={`booking-card status-${booking.status}`}>
      <div className="booking-header">
        <div className="booking-date">
          <span className="date-day">{new Date(booking.InterviewSlot?.slotDate + 'T00:00').toLocaleDateString('en', { weekday: 'short' })}</span>
          <span className="date-num">{new Date(booking.InterviewSlot?.slotDate + 'T00:00').getDate()}</span>
          <span className="date-month">{new Date(booking.InterviewSlot?.slotDate + 'T00:00').toLocaleDateString('en', { month: 'short' })}</span>
        </div>
        <div className="booking-info">
          <div className="booking-time">
            <span className="time-icon">🕐</span>
            {booking.InterviewSlot?.startTime?.slice(0,5)}
          </div>
          {user?.role !== 'candidate' && (
            <div className="booking-person">👤 {booking.Candidate?.name || booking.Candidate?.email}</div>
          )}
          {user?.role === 'candidate' && (
            <div className="booking-person">👥 {booking.InterviewSlot?.Recruiter?.name}</div>
          )}
        </div>
      </div>
      
      <div className="booking-footer">
        <span className={`booking-status ${booking.status}`}>
          {booking.status === 'scheduled' && '⏳'}
          {booking.status === 'completed' && '✅'}
          {booking.status === 'cancelled' && '❌'}
          {booking.status}
        </span>
        {canUpdate && isActive && (
          <div className="booking-actions">
            {user?.role === 'candidate' && (
              <button className="btn-cancel" onClick={() => setStatus('cancelled')} disabled={loading}>
                Cancel
              </button>
            )}
            {(user?.role === 'recruiter' || user?.role === 'admin') && (
              <>
                <button className="btn-complete" onClick={() => setStatus('completed')} disabled={loading}>
                  Complete
                </button>
                <button className="btn-cancel" onClick={() => setStatus('cancelled')} disabled={loading}>
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
