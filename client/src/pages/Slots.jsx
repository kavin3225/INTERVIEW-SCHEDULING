import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocketConnection } from '../context/SocketContext';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import Layout from '../components/Layout';
import SlotCard from '../components/SlotCard';
import { slotsApi, usersApi } from '../api/client';
import './Slots.css';

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function Slots() {
  const { user } = useAuth();
  const { isConnected } = useSocketConnection();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    purpose: '',
    slotDate: '',
    startTime: '09:00',
    endTime: '09:30',
    durationMinutes: 30,
    recruiterId: '',
  });
  const [recruiters, setRecruiters] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const isAdmin = user?.role === 'admin';

  const fetchSlots = useCallback(async () => {
    try {
      setError('');
      const isCandidate = user?.role === 'candidate';
      const list = await slotsApi.list(
        isCandidate ? { availableOnly: 'true' } : {}
      );
      setSlots(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  const { availableSlots, bookedSlots, upcomingSlots } = useMemo(() => {
    const t = TODAY();
    const available = slots.filter((s) => !s.isBooked && s.slotDate >= t);
    const booked = slots.filter((s) => s.isBooked);
    const upcoming = slots
      .filter((s) => s.slotDate >= t)
      .sort((a, b) => {
        if (a.slotDate !== b.slotDate) return a.slotDate.localeCompare(b.slotDate);
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
    return {
      availableSlots: available,
      bookedSlots: booked,
      upcomingSlots: upcoming,
    };
  }, [slots]);

  const handleRealtimeSlotsUpdate = useCallback((data) => {
    if (data?.bookedSlotId) {
      setSlots((prev) =>
        user?.role === 'candidate'
          ? prev.filter((s) => s.id !== data.bookedSlotId)
          : prev.map((s) =>
              s.id === data.bookedSlotId ? { ...s, isBooked: true } : s
            )
      );
    }
    if (data?.freedSlotId) {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === data.freedSlotId ? { ...s, isBooked: false } : s
        )
      );
    }
    fetchSlots();
  }, [user?.role, fetchSlots]);

  useRealtimeEvents({
    onSlotsUpdate: handleRealtimeSlotsUpdate,
    onBookingsUpdate: fetchSlots,
  });

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    if (isAdmin) {
      usersApi.list().then((users) => {
        setRecruiters(users.filter((u) => u.role === 'recruiter'));
      }).catch(() => {});
    }
  }, [isAdmin]);

  const isRecruiterOrAdmin = user?.role === 'recruiter' || user?.role === 'admin';

  function generateRandomTime() {
    const hours = [9, 10, 11, 14, 15, 16];
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minute = Math.random() > 0.5 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  function suggestRandomSlot() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startTime = generateRandomTime();
    const [h, m] = startTime.split(':');
    const endHour = parseInt(h) + (m === '30' ? 1 : 0);
    const endMinute = m === '30' ? '00' : '30';
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute}`;
    
    setForm((f) => ({
      ...f,
      title: '',
      purpose: '',
      slotDate: tomorrow.toISOString().slice(0, 10),
      startTime,
      endTime,
      durationMinutes: 30,
    }));
    setShowForm(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        title: form.title,
        purpose: form.purpose || undefined,
        slotDate: form.slotDate,
        startTime: form.startTime,
        endTime: form.endTime,
        durationMinutes: form.durationMinutes,
      };
      if (isAdmin && form.recruiterId) payload.recruiterId = Number(form.recruiterId);
      await slotsApi.create(payload);
      setForm({
        title: '',
        purpose: '',
        slotDate: '',
        startTime: '09:00',
        endTime: '09:30',
        durationMinutes: 30,
        recruiterId: '',
      });
      setShowForm(false);
      fetchSlots();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this slot?')) return;
    try {
      await slotsApi.delete(id);
      fetchSlots();
    } catch (e) {
      setError(e.message);
    }
  }

  function formatTime(t) {
    if (!t) return '–';
    if (typeof t === 'string' && t.length >= 5) return t.slice(0, 5);
    return t;
  }

  return (
    <Layout>
      <div className="page-header-row">
        <h1 className="page-title">
          {user?.role === 'candidate' ? 'Available Slots' : isAdmin ? 'Slots (Admin)' : 'My Slots'}
        </h1>
        {isConnected && (
          <span className="live-badge" title="Real-time updates active">
            <span className="live-dot"></span> Live
          </span>
        )}
      </div>
      {error && <div className="auth-error">{error}</div>}
      {isRecruiterOrAdmin && (
        <div className="card">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : 'Create slot'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={suggestRandomSlot}
              title="Generate random time slot"
            >
              🎲 Random Time
            </button>
          </div>
          {showForm && (
            <form onSubmit={handleCreate} className="slot-form">
              {isAdmin && (
                <div className="form-row form-row--full">
                  <label>
                    Assign to recruiter
                    <select
                      value={form.recruiterId}
                      onChange={(e) => setForm((f) => ({ ...f, recruiterId: e.target.value }))}
                      className="slot-form-select"
                    >
                      <option value="">Select recruiter (optional)</option>
                      {recruiters.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div className="form-row">
                <label>
                  Title (optional)
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Technical round"
                  />
                </label>
                <label>
                  Purpose of slot
                  <input
                    value={form.purpose}
                    onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                    placeholder="e.g. Frontend interview, HR discussion"
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Date
                  <input
                    type="date"
                    value={form.slotDate}
                    onChange={(e) => setForm((f) => ({ ...f, slotDate: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  Start time
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </label>
                <label>
                  End time
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </label>
                <label>
                  Duration (min)
                  <input
                    type="number"
                    min={15}
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: +e.target.value || 30 }))}
                  />
                </label>
              </div>
              <button type="submit" className="btn btn-primary">Create</button>
            </form>
          )}
        </div>
      )}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading slots...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon">📅</div>
          <h3>{user?.role === 'candidate' ? 'No available slots' : 'No slots yet'}</h3>
          <p>{user?.role === 'candidate' ? 'Check back later for new interview slots' : 'Create your first slot above'}</p>
        </div>
      ) : (
        <>
          {isRecruiterOrAdmin && (
            <div className="slots-tabs">
              <button
                type="button"
                className={`slots-tab ${activeTab === 'available' ? 'active' : ''}`}
                onClick={() => setActiveTab('available')}
              >
                <span className="tab-label">Available</span>
                <span className="tab-count">{availableSlots.length}</span>
              </button>
              <button
                type="button"
                className={`slots-tab ${activeTab === 'booked' ? 'active' : ''}`}
                onClick={() => setActiveTab('booked')}
              >
                <span className="tab-label">Booked</span>
                <span className="tab-count">{bookedSlots.length}</span>
              </button>
              <button
                type="button"
                className={`slots-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                <span className="tab-label">Upcoming</span>
                <span className="tab-count">{upcomingSlots.length}</span>
              </button>
            </div>
          )}

          {isRecruiterOrAdmin ? (
            <div className="slots-section">
              {activeTab === 'available' && (
                <>
                  <h2 className="slots-section-title">
                    Available slots <span className="slots-section-count">({availableSlots.length})</span>
                  </h2>
                  {availableSlots.length === 0 ? (
                    <p className="slots-section-empty">No available slots. Create one above.</p>
                  ) : (
                    <div className="slots-grid">
                      {availableSlots.map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          onBook={fetchSlots}
                          userRole={user?.role}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
              {activeTab === 'booked' && (
                <>
                  <h2 className="slots-section-title">
                    Booked slots <span className="slots-section-count">({bookedSlots.length})</span>
                  </h2>
                  {bookedSlots.length === 0 ? (
                    <p className="slots-section-empty">No booked slots yet.</p>
                  ) : (
                    <div className="slots-grid">
                      {bookedSlots.map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          onBook={fetchSlots}
                          userRole={user?.role}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
              {activeTab === 'upcoming' && (
                <>
                  <h2 className="slots-section-title">
                    Upcoming <span className="slots-section-count">({upcomingSlots.length})</span>
                  </h2>
                  {upcomingSlots.length === 0 ? (
                    <p className="slots-section-empty">No upcoming slots.</p>
                  ) : (
                    <div className="slots-grid">
                      {upcomingSlots.map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          onBook={fetchSlots}
                          userRole={user?.role}
                          showBadge
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="slots-section">
              <h2 className="slots-section-title">
                Available & upcoming <span className="slots-section-count">({slots.length})</span>
              </h2>
              <div className="slots-grid">
                {slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onBook={fetchSlots}
                    userRole={user?.role}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
