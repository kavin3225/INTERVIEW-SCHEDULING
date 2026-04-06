import { useCallback, useEffect, useRef, useState } from 'react';
import { bookingsApi, slotsApi } from '../api/client';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import './SlotCard.css';

export default function SlotCard({ slot, onBook, userRole, showBadge, currentUserId }) {
  const [booking, setBooking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [showIssueChat, setShowIssueChat] = useState(false);
  const [slotMessages, setSlotMessages] = useState([]);
  const [slotMessagesLoading, setSlotMessagesLoading] = useState(false);
  const [slotIssueMessage, setSlotIssueMessage] = useState('');
  const [sendingSlotIssue, setSendingSlotIssue] = useState(false);
  const [unreadSlotIssues, setUnreadSlotIssues] = useState(0);
  const resumeInputRef = useRef(null);
  const canUseSlotIssueChat = userRole === 'recruiter' || userRole === 'admin';

  const loadSlotMessages = useCallback(async () => {
    if (!canUseSlotIssueChat) return;
    setSlotMessagesLoading(true);
    try {
      const list = await slotsApi.listMessages(slot.id);
      setSlotMessages(list);
    } catch (e) {
      alert(e.message);
    } finally {
      setSlotMessagesLoading(false);
    }
  }, [canUseSlotIssueChat, slot.id]);

  useRealtimeEvents({
    onSlotMessagesUpdate: (data) => {
      if (data?.slotId !== slot.id) return;
      if (data?.senderId === currentUserId) return;
      if (!canUseSlotIssueChat) return;

      if (showIssueChat) {
        loadSlotMessages();
        return;
      }

      setUnreadSlotIssues((count) => count + 1);
    },
    toastSlotMessages: true,
    shouldToastSlotMessages: (data) => {
      if (!canUseSlotIssueChat) return false;
      if (data?.slotId !== slot.id) return false;
      return data?.senderId !== currentUserId;
    },
  });

  useEffect(() => {
    if (!showIssueChat || !canUseSlotIssueChat) return;
    loadSlotMessages();
    setUnreadSlotIssues(0);
  }, [showIssueChat, canUseSlotIssueChat, loadSlotMessages]);

  async function handleBook() {
    if (resumeFile && resumeFile.size > 5 * 1024 * 1024) {
      alert('Resume file must be 5MB or smaller.');
      return;
    }
    if (resumeFile && !/\.(pdf|doc|docx)$/i.test(resumeFile.name)) {
      alert('Only PDF, DOC, and DOCX files are allowed.');
      return;
    }
    setBooking(true);
    try {
      const formData = new FormData();
      formData.append('slotId', String(slot.id));
      if (resumeFile) formData.append('resume', resumeFile);
      await bookingsApi.create(formData);
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
      onBook();
    } catch (e) {
      alert(e.message);
    } finally {
      setBooking(false);
    }
  }

  async function handleDelete() {
    if (!slot.id) return;
    const yes = window.confirm('Delete this slot?');
    if (!yes) return;
    setDeleting(true);
    try {
      await onBook?.(slot.id, { action: 'delete' });
    } catch (e) {
      alert(e.message || 'Failed to delete slot.');
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit() {
    onBook?.(slot.id, { action: 'edit', slot });
  }

  async function handleSendSlotIssue() {
    const message = slotIssueMessage.trim();
    if (!message) return;
    setSendingSlotIssue(true);
    try {
      await slotsApi.sendMessage(slot.id, { message });
      setSlotIssueMessage('');
      await loadSlotMessages();
    } catch (e) {
      alert(e.message);
    } finally {
      setSendingSlotIssue(false);
    }
  }

  async function handleViewResume(bookingId) {
    if (!bookingId) return;
    setResumeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bookings/${bookingId}/resume`, {
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

  const isAvailable = !slot.isBooked;
  const isPast = slot.slotDate < new Date().toISOString().slice(0, 10);
  const date = new Date(`${slot.slotDate}T00:00:00`);
  const bookedBooking = slot.Bookings?.find((b) => b.status === 'scheduled') || slot.Bookings?.[0];
  const bookedBy = bookedBooking?.Candidate;
  const maxCandidates = slot.maxCandidates || 1;
  const activeBookings = slot.Bookings?.filter((b) => b.status !== 'cancelled').length || 0;
  const isGroup = maxCandidates > 1;
  const reservedByCurrentUser = userRole === 'candidate' && slot.Bookings?.some(
    (bookingItem) => bookingItem.status !== 'cancelled' && bookingItem.candidateId === currentUserId
  );

  return (
    <article className={`slot-card ${isAvailable ? 'available' : 'booked'} ${isPast ? 'past' : ''}`}>
      {showBadge && (
        <span className={`slot-card-badge ${isAvailable ? 'available' : 'booked'}`}>
          {isAvailable ? 'Open' : 'Booked'}
        </span>
      )}

      <div className="slot-meta-row">
        <div className="slot-date-block">
          <span className="slot-date-day">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
          <strong className="slot-date-num">{date.getDate()}</strong>
          <span className="slot-date-month">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
        </div>

        <div className="slot-main">
          <div className="slot-time-row">
            <h3 className="slot-time-text">
              {slot.startTime?.slice(0, 5)} to {slot.endTime?.slice(0, 5)}
            </h3>
            {isGroup && (
              <span className="slot-card-badge group inline">
                Count {activeBookings}/{maxCandidates}
              </span>
            )}
          </div>
          <p className="slot-inline-text">{slot.title || 'Interview slot'}</p>
          {slot.purpose && <p className="slot-inline-purpose">{slot.purpose}</p>}
          {slot.Recruiter && <p className="slot-inline-text">Recruiter: {slot.Recruiter.name}</p>}
          {!isAvailable && (userRole === 'recruiter' || userRole === 'admin') && bookedBy && (
            <p className="slot-inline-text">Booked by: {bookedBy.name || bookedBy.email}</p>
          )}
          {!isAvailable && (userRole === 'recruiter' || userRole === 'admin') && bookedBooking?.resumeUrl && (
            <button
              type="button"
              className="slot-resume-view-btn"
              onClick={() => handleViewResume(bookedBooking.id)}
              disabled={resumeLoading}
            >
              {resumeLoading ? 'Opening...' : 'View Resume'}
            </button>
          )}
        </div>
      </div>

      {userRole === 'candidate' && isAvailable && !isPast && (
        <div className="slot-resume-field">
          <label htmlFor={`resume-${slot.id}`} className="slot-resume-label">
            Upload resume (optional)
          </label>
          <input
            id={`resume-${slot.id}`}
            ref={resumeInputRef}
            type="file"
            className="slot-resume-input"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
          />
          <p className="slot-resume-hint">{resumeFile ? resumeFile.name : 'PDF, DOC, DOCX up to 5MB'}</p>
        </div>
      )}

      <div className="slot-footer">
        <span className={`slot-status ${isAvailable ? 'available' : 'booked'}`}>
          <span className="slot-status-dot" />
          {isAvailable ? 'Available now' : 'Reserved'}
        </span>

        {userRole === 'candidate' && isAvailable && !isPast && (
          <button
            className={`book-btn ${reservedByCurrentUser ? 'reserved' : ''}`}
            onClick={handleBook}
            disabled={booking || reservedByCurrentUser}
          >
            {booking ? 'Booking...' : reservedByCurrentUser ? 'Reserved' : 'Reserve slot'}
          </button>
        )}
        {(userRole === 'recruiter' || userRole === 'admin') && (
          <div className="slot-admin-actions">
            <button
              type="button"
              className={`edit-slot-btn slot-chat-toggle ${unreadSlotIssues > 0 && !showIssueChat ? 'has-unread' : ''}`}
              onClick={() => setShowIssueChat((value) => !value)}
            >
              {showIssueChat ? 'Hide slot chat' : `Slot issues${unreadSlotIssues > 0 ? ` (${unreadSlotIssues} new)` : ''}`}
            </button>
            <button type="button" className="edit-slot-btn" onClick={handleEdit}>
              Edit slot
            </button>
            <button className="delete-slot-btn" onClick={handleDelete} disabled={deleting || !isAvailable}>
              {deleting ? 'Deleting...' : 'Delete slot'}
            </button>
          </div>
        )}
      </div>

      {canUseSlotIssueChat && unreadSlotIssues > 0 && !showIssueChat && (
        <div className="slot-chat-alert" role="status" aria-live="polite">
          <span className="slot-chat-alert-dot" />
          New recruiter/admin chat message for this slot
        </div>
      )}

      {canUseSlotIssueChat && showIssueChat && (
        <div className="slot-chat-panel">
          <div className="slot-chat-header">
            <h4>Recruiter and Admin Slot Chat</h4>
            <span>{slotMessages.length} message{slotMessages.length === 1 ? '' : 's'}</span>
          </div>

          {slotMessagesLoading ? (
            <p className="slot-chat-empty">Loading slot discussion...</p>
          ) : slotMessages.length === 0 ? (
            <p className="slot-chat-empty">No slot issues shared yet.</p>
          ) : (
            <div className="slot-chat-list">
              {[...slotMessages].reverse().map((message) => (
                <div key={message.id} className={`slot-chat-bubble ${message.senderId === currentUserId ? 'own' : ''}`}>
                  <div className="slot-chat-meta">
                    <strong>{message.Sender?.name || message.Sender?.email || 'User'}</strong>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{message.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="slot-chat-compose">
            <textarea
              value={slotIssueMessage}
              onChange={(e) => setSlotIssueMessage(e.target.value)}
              placeholder="Discuss slot issues, timing conflicts, or anything else here..."
              rows={3}
            />
            <button type="button" className="book-btn" onClick={handleSendSlotIssue} disabled={sendingSlotIssue}>
              {sendingSlotIssue ? 'Sending...' : 'Send to recruiter/admin'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
