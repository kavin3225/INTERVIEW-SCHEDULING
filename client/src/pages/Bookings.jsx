import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocketConnection } from '../context/SocketContext';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import Layout from '../components/Layout';
import { bookingsApi, slotsApi } from '../api/client';
import { useCountdown } from '../hooks/useCountdown';
import './Bookings.css';

function SearchFilterBar({ search, onSearch, statusFilter, onStatus, onClear }) {
  return (
    <div className="search-filter-bar">
      <input
        className="search-input"
        placeholder="Search by candidate, recruiter, title..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <select className="filter-date" value={statusFilter} onChange={(e) => onStatus(e.target.value)}>
        <option value="">All statuses</option>
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {(search || statusFilter) && (
        <button className="btn btn-secondary filter-clear" onClick={onClear}>Clear</button>
      )}
    </div>
  );
}

export default function Bookings() {
  const { user } = useAuth();
  const { isConnected } = useSocketConnection();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

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

  const fetchAvailableSlots = useCallback(async () => {
    if (user?.role !== 'candidate') return;
    try {
      const list = await slotsApi.list({ availableOnly: 'true' });
      setAvailableSlots(list);
    } catch (e) {
      setError(e.message);
    }
  }, [user?.role]);

  useRealtimeEvents({
    onBookingsUpdate: () => {
      fetchBookings();
      fetchAvailableSlots();
    },
    onSlotsUpdate: () => {
      fetchBookings();
      fetchAvailableSlots();
    },
  });

  useEffect(() => {
    fetchBookings();
    fetchAvailableSlots();
  }, [fetchBookings, fetchAvailableSlots]);

  const canUpdateStatus = user?.role === 'recruiter' || user?.role === 'admin' || user?.role === 'candidate';

  const visibleBookings = useMemo(() => {
    let list = bookings;
    if (statusFilter) list = list.filter((b) => b.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        (b.Candidate?.name || '').toLowerCase().includes(q) ||
        (b.Candidate?.email || '').toLowerCase().includes(q) ||
        (b.InterviewSlot?.Recruiter?.name || '').toLowerCase().includes(q) ||
        (b.InterviewSlot?.title || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, search, statusFilter]);

  return (
    <Layout>
      <div className="bookings-hero">
        <div>
          <h1 className="page-title">{user?.role === 'candidate' ? 'My Interviews' : 'Booking Board'}</h1>
          <p className="bookings-hero-sub">Every status change appears instantly for all participants.</p>
        </div>
        <span className={`live-badge ${isConnected ? '' : 'offline'}`}>
          <span className="live-dot" />
          {isConnected ? 'Live sync on' : 'Sync offline'}
        </span>
      </div>

      <SearchFilterBar
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatus={setStatusFilter}
        onClear={() => { setSearch(''); setStatusFilter(''); }}
      />

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading bookings...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="empty-state-modern">
          <h3>No bookings yet</h3>
          <p>Your interview schedule will appear here once a slot is reserved.</p>
        </div>
      ) : (
        <div className="bookings-grid">
          {visibleBookings.length === 0 ? (
            <div className="empty-state-modern" style={{ gridColumn: '1/-1' }}>
              <h3>No results</h3><p>Try adjusting your search or filter.</p>
            </div>
          ) : visibleBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onUpdate={async () => {
                await fetchBookings();
                await fetchAvailableSlots();
              }}
              canUpdate={canUpdateStatus}
              availableSlots={availableSlots}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

function BookingCard({ booking, onUpdate, canUpdate, availableSlots }) {
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [participantMessage, setParticipantMessage] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingParticipant, setSendingParticipant] = useState(false);
  const [sendingAdmin, setSendingAdmin] = useState(false);
  const [unreadParticipantCount, setUnreadParticipantCount] = useState(0);
  const [unreadAdminCount, setUnreadAdminCount] = useState(0);
  const { user } = useAuth();
  const countdown = useCountdown(
    booking.status === 'scheduled' ? booking.InterviewSlot?.slotDate : null,
    booking.InterviewSlot?.startTime
  );

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const list = await bookingsApi.listMessages(booking.id);
      setMessages(list);
    } catch (e) {
      alert(e.message);
    } finally {
      setMessagesLoading(false);
    }
  }, [booking.id]);

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

  const isActive = booking.status === 'scheduled';
  const slotDate = booking.InterviewSlot?.slotDate;
  const date = slotDate ? new Date(`${slotDate}T00:00:00`) : null;
  const canViewCandidateResume = user?.role === 'admin' || user?.role === 'recruiter';
  const recruiter = booking.InterviewSlot?.Recruiter;
  const rescheduleOptions = (availableSlots || []).filter((slot) => slot.id !== booking.slotId);
  const canUseParticipantChat = user?.role === 'candidate' || user?.role === 'recruiter';
  const canViewParticipantMessages = user?.role === 'candidate' || user?.role === 'recruiter';
  const canPushToAdmin = user?.role === 'recruiter';
  const canViewAdminMessages = user?.role === 'recruiter' || user?.role === 'admin';

  useRealtimeEvents({
    onMessagesUpdate: (data) => {
      if (data?.bookingId !== booking.id) return;

      const isOwnMessage = data?.senderId === user?.id;
      const canSeeMessage =
        data?.visibility === 'participant'
          ? canViewParticipantMessages
          : canViewAdminMessages;

      if (!canSeeMessage || isOwnMessage) return;

      if (showChat) {
        loadMessages();
        return;
      }

      if (data?.visibility === 'participant') {
        setUnreadParticipantCount((count) => count + 1);
      } else if (data?.visibility === 'admin') {
        setUnreadAdminCount((count) => count + 1);
      }
    },
    toastMessages: true,
    shouldToastMessages: (data) => {
      if (data?.bookingId !== booking.id) return false;
      if (data?.senderId === user?.id) return false;
      return data?.visibility === 'participant'
        ? canViewParticipantMessages
        : canViewAdminMessages;
    },
  });

  useEffect(() => {
    if (!showChat) return;

    loadMessages();
    setUnreadParticipantCount(0);
    setUnreadAdminCount(0);
  }, [showChat, loadMessages]);

  async function handleViewResume() {
    if (!booking.resumeUrl) return;
    setResumeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bookings/${booking.id}/resume`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to open resume.');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e) {
      alert(e.message);
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleReschedule() {
    if (!selectedSlotId) {
      alert('Select a new slot first.');
      return;
    }
    setRescheduling(true);
    try {
      await bookingsApi.reschedule(booking.id, Number(selectedSlotId));
      setShowReschedule(false);
      setSelectedSlotId('');
      onUpdate();
    } catch (e) {
      alert(e.message);
    } finally {
      setRescheduling(false);
    }
  }

  async function handleSendParticipantMessage() {
    const message = participantMessage.trim();
    if (!message) return;
    setSendingParticipant(true);
    try {
      await bookingsApi.sendMessage(booking.id, { message, visibility: 'participant' });
      setParticipantMessage('');
      await loadMessages();
    } catch (e) {
      alert(e.message);
    } finally {
      setSendingParticipant(false);
    }
  }

  async function handleSendAdminMessage() {
    const message = adminMessage.trim();
    if (!message) return;
    setSendingAdmin(true);
    try {
      await bookingsApi.sendMessage(booking.id, { message, visibility: 'admin' });
      setAdminMessage('');
      await loadMessages();
    } catch (e) {
      alert(e.message);
    } finally {
      setSendingAdmin(false);
    }
  }

  const participantMessages = messages.filter((message) => message.visibility === 'participant');
  const adminMessages = messages.filter((message) => message.visibility === 'admin');
  const recentParticipantMessages = useMemo(
    () => [...participantMessages].reverse(),
    [participantMessages]
  );
  const recentAdminMessages = useMemo(
    () => [...adminMessages].reverse(),
    [adminMessages]
  );
  const totalUnreadCount = unreadParticipantCount + unreadAdminCount;
  const discussionLabel = showChat
    ? 'Hide discussion'
    : canViewAdminMessages && !canViewParticipantMessages
      ? 'View escalation'
      : 'Messages';

  return (
    <article className={`booking-card status-${booking.status}`}>
      <div className="booking-header">
        <div className="booking-date">
          <span className="date-day">{date?.toLocaleDateString('en-US', { weekday: 'short' })}</span>
          <span className="date-num">{date?.getDate()}</span>
          <span className="date-month">{date?.toLocaleDateString('en-US', { month: 'short' })}</span>
        </div>

        <div className="booking-info">
          <div className="booking-time">
            {booking.InterviewSlot?.startTime?.slice(0, 5)} to {booking.InterviewSlot?.endTime?.slice(0, 5)}
          </div>
          {booking.InterviewSlot?.title && (
            <div className="booking-person">Title: {booking.InterviewSlot.title}</div>
          )}
          {booking.InterviewSlot?.purpose && (
            <div className="booking-person">Purpose: {booking.InterviewSlot.purpose}</div>
          )}
          {countdown && booking.status === 'scheduled' && (
            <div className="booking-countdown">Time left: {countdown}</div>
          )}
          {(user?.role === 'recruiter' || user?.role === 'admin') && (
            <>
              <div className="booking-person">Candidate: {booking.Candidate?.name || booking.Candidate?.email}</div>
              <div className="booking-person">Recruiter: {recruiter?.name}</div>
            </>
          )}
          {user?.role === 'candidate' && (
            <div className="booking-person">Recruiter: {recruiter?.name}</div>
          )}
          {canViewCandidateResume && booking.resumeUrl && (
            <button className="booking-resume-link" type="button" onClick={handleViewResume} disabled={resumeLoading}>
              {resumeLoading ? 'Opening resume...' : 'View Resume'}
            </button>
          )}
        </div>
      </div>

      <div className="booking-footer">
        <span className={`booking-status ${booking.status}`}>{booking.status}</span>

        <div className="booking-footer-actions">
          <button
            type="button"
            className={`btn-message ${totalUnreadCount > 0 && !showChat ? 'has-unread' : ''}`}
            onClick={() => setShowChat((value) => !value)}
          >
            {discussionLabel}
            {!showChat && totalUnreadCount > 0 ? ` (${totalUnreadCount} new)` : ''}
          </button>
          {canUpdate && isActive && (
            <div className="booking-actions">
              {user?.role === 'candidate' && (
                <>
                  <button
                    className="btn-reschedule"
                    onClick={() => setShowReschedule((value) => !value)}
                    disabled={loading || rescheduling || rescheduleOptions.length === 0}
                  >
                    {showReschedule ? 'Close' : 'Reschedule'}
                  </button>
                  <button className="btn-cancel" onClick={() => setStatus('cancelled')} disabled={loading || rescheduling}>
                    Cancel
                  </button>
                </>
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

      {totalUnreadCount > 0 && !showChat && (
        <div className="booking-chat-alert" role="status" aria-live="polite">
          <span className="booking-chat-alert-dot" />
          New message in this booking chat
        </div>
      )}

      {showChat && (
        <div className="booking-chat-panel">
          {canViewParticipantMessages && (
          <div className="booking-chat-section">
            <div className="booking-chat-header">
              <h4>Candidate and Recruiter Chat</h4>
              <span>{participantMessages.length} message{participantMessages.length === 1 ? '' : 's'}</span>
            </div>

            {messagesLoading ? (
              <p className="booking-chat-empty">Loading conversation...</p>
            ) : participantMessages.length === 0 ? (
              <p className="booking-chat-empty">No issues shared yet.</p>
            ) : (
              <div className="booking-chat-list">
                {recentParticipantMessages.map((message) => (
                  <div key={message.id} className={`booking-chat-bubble ${message.senderId === user?.id ? 'own' : ''}`}>
                    <div className="booking-chat-meta">
                      <strong>{message.Sender?.name || message.Sender?.email || 'User'}</strong>
                      <span>{new Date(message.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{message.message}</p>
                  </div>
                ))}
              </div>
            )}

            {canUseParticipantChat && (
              <div className="booking-chat-compose">
                <textarea
                  value={participantMessage}
                  onChange={(e) => setParticipantMessage(e.target.value)}
                  placeholder="Tell the recruiter about any issue with this interview..."
                  rows={3}
                />
                <button type="button" className="btn-reschedule-confirm" onClick={handleSendParticipantMessage} disabled={sendingParticipant}>
                  {sendingParticipant ? 'Sending...' : 'Send message'}
                </button>
              </div>
            )}
          </div>
          )}

          {canViewAdminMessages && (
            <div className="booking-chat-section admin-channel">
              <div className="booking-chat-header">
                <h4>Admin Escalation</h4>
                <span>{adminMessages.length} note{adminMessages.length === 1 ? '' : 's'}</span>
              </div>

              {messagesLoading ? (
                <p className="booking-chat-empty">Loading admin notes...</p>
              ) : adminMessages.length === 0 ? (
                <p className="booking-chat-empty">No recruiter issue has been pushed to admin.</p>
              ) : (
                <div className="booking-chat-list">
                  {recentAdminMessages.map((message) => (
                    <div key={message.id} className="booking-chat-bubble admin-note">
                      <div className="booking-chat-meta">
                        <strong>{message.Sender?.name || message.Sender?.email || 'User'}</strong>
                        <span>{new Date(message.createdAt).toLocaleString()}</span>
                      </div>
                      <p>{message.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {canPushToAdmin && (
                <div className="booking-chat-compose">
                  <textarea
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    placeholder="Push a booking issue to admin..."
                    rows={3}
                  />
                  <button type="button" className="btn-complete" onClick={handleSendAdminMessage} disabled={sendingAdmin}>
                    {sendingAdmin ? 'Pushing...' : 'Push to admin'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {user?.role === 'candidate' && isActive && showReschedule && (
        <div className="booking-reschedule-panel">
          {rescheduleOptions.length === 0 ? (
            <p className="booking-reschedule-empty">No alternative open slots are available right now.</p>
          ) : (
            <>
              <label className="booking-reschedule-label" htmlFor={`reschedule-${booking.id}`}>
                Choose a new slot
              </label>
              <select
                id={`reschedule-${booking.id}`}
                className="booking-reschedule-select"
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                disabled={rescheduling}
              >
                <option value="">Select an available slot</option>
                {rescheduleOptions.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.slotDate} | {slot.startTime?.slice(0, 5)} - {slot.endTime?.slice(0, 5)}
                    {slot.Recruiter?.name ? ` | ${slot.Recruiter.name}` : ''}
                  </option>
                ))}
              </select>
              <div className="booking-reschedule-actions">
                <button
                  className="btn-reschedule-confirm"
                  type="button"
                  onClick={handleReschedule}
                  disabled={rescheduling || !selectedSlotId}
                >
                  {rescheduling ? 'Rescheduling...' : 'Confirm new slot'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}
