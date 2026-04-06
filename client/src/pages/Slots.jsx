import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocketConnection } from '../context/SocketContext';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import Layout from '../components/Layout';
import SlotCard from '../components/SlotCard';
import { slotsApi, usersApi } from '../api/client';
import './Slots.css';

function SearchFilterBar({ search, onSearch, dateFilter, onDate, onClear }) {
  return (
    <div className="search-filter-bar">
      <input
        className="search-input"
        placeholder="Search by title, purpose, recruiter..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <input
        type="date"
        className="filter-date"
        value={dateFilter}
        onChange={(e) => onDate(e.target.value)}
      />
      {(search || dateFilter) && (
        <button className="btn btn-secondary filter-clear" onClick={onClear}>Clear</button>
      )}
    </div>
  );
}

const TODAY = () => new Date().toISOString().slice(0, 10);

function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function validateForm(form) {
  const errs = {};
  if (!form.title.trim()) errs.title = 'Title is required.';
  if (!form.slotDate) {
    errs.slotDate = 'Date is required.';
  } else if (form.slotDate < TODAY()) {
    errs.slotDate = 'Date cannot be in the past.';
  }
  if (!form.startTime) errs.startTime = 'Start time is required.';
  if (!form.endTime) errs.endTime = 'End time is required.';
  if (form.startTime && form.endTime) {
    const start = toMinutes(form.startTime);
    const end   = toMinutes(form.endTime);
    if (end <= start) {
      errs.endTime = 'End time must be after start time.';
    } else {
      const diff = end - start;
      if (diff < 15) errs.endTime = 'Duration must be at least 15 minutes.';
      if (diff > 480) errs.endTime = 'Duration cannot exceed 8 hours.';
    }
    if (toMinutes(form.startTime) < 7 * 60) errs.startTime = 'Start time must be 07:00 or later.';
    if (toMinutes(form.endTime) > 22 * 60) errs.endTime = 'End time must be 22:00 or earlier.';
  }
  if (!form.durationMinutes || form.durationMinutes < 15) errs.durationMinutes = 'Min 15 minutes.';
  if (form.durationMinutes > 480) errs.durationMinutes = 'Max 480 minutes.';
  if (!form.maxCandidates || Number(form.maxCandidates) < 1) errs.maxCandidates = 'At least 1 candidate.';
  if (Number(form.maxCandidates) > 20) errs.maxCandidates = 'Maximum is 20 candidates.';
  return errs;
}

export default function Slots() {
  const { user } = useAuth();
  const { isConnected } = useSocketConnection();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    purpose: '',
    slotDate: '',
    startTime: '09:00',
    endTime: '09:30',
    durationMinutes: 30,
    maxCandidates: 1,
    recruiterId: '',
  });
  const [recruiters, setRecruiters] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const isAdmin = user?.role === 'admin';

  const fetchSlots = useCallback(async () => {
    try {
      setError('');
      const isCandidate = user?.role === 'candidate';
      const list = await slotsApi.list(isCandidate ? { availableOnly: 'true' } : {});
      setSlots(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  const { availableSlots, bookedSlots, upcomingSlots, todayCount } = useMemo(() => {
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
      todayCount: slots.filter((s) => s.slotDate === t).length,
    };
  }, [slots]);

  const handleRealtimeSlotsUpdate = useCallback(
    (data) => {
      if (data?.bookedSlotId) {
        setSlots((prev) =>
          user?.role === 'candidate'
            ? prev.filter((s) => s.id !== data.bookedSlotId)
            : prev.map((s) => (s.id === data.bookedSlotId ? { ...s, isBooked: true } : s))
        );
      }
      if (data?.freedSlotId) {
        setSlots((prev) =>
          prev.map((s) => (s.id === data.freedSlotId ? { ...s, isBooked: false } : s))
        );
      }
      fetchSlots();
    },
    [user?.role, fetchSlots]
  );

  useRealtimeEvents({
    onSlotsUpdate: handleRealtimeSlotsUpdate,
    onBookingsUpdate: fetchSlots,
  });

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    if (!isAdmin) return;
    usersApi
      .list()
      .then((users) => {
        setRecruiters(users.filter((u) => u.role === 'recruiter'));
      })
      .catch(() => {});
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
    const endHour = parseInt(h, 10) + (m === '30' ? 1 : 0);
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

  function setField(key, value) {
    const next = { ...form, [key]: value };
    // auto-calc duration when start/end change
    if ((key === 'startTime' || key === 'endTime') && next.startTime && next.endTime) {
      const diff = toMinutes(next.endTime) - toMinutes(next.startTime);
      if (diff > 0) next.durationMinutes = diff;
    }
    setForm(next);
    // live validate only touched fields
    if (touched[key]) {
      const errs = validateForm(next);
      setFieldErrors((prev) => ({ ...prev, [key]: errs[key] || '' }));
    }
  }

  function touchField(key) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const errs = validateForm(form);
    setFieldErrors((prev) => ({ ...prev, [key]: errs[key] || '' }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    // mark all fields touched and validate
    const allTouched = { title: true, slotDate: true, startTime: true, endTime: true, durationMinutes: true };
    allTouched.maxCandidates = true;
    setTouched(allTouched);
    const errs = validateForm(form);
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        purpose: form.purpose.trim() || undefined,
        slotDate: form.slotDate,
        startTime: form.startTime,
        endTime: form.endTime,
        durationMinutes: form.durationMinutes,
      };
      if (isAdmin && form.recruiterId) payload.recruiterId = Number(form.recruiterId);
      payload.maxCandidates = Number(form.maxCandidates) || 1;
      if (editingSlotId) await slotsApi.update(editingSlotId, payload);
      else await slotsApi.create(payload);
      setForm({ title: '', purpose: '', slotDate: '', startTime: '09:00', endTime: '09:30', durationMinutes: 30, maxCandidates: 1, recruiterId: '' });
      setFieldErrors({});
      setTouched({});
      setEditingSlotId(null);
      setShowForm(false);
      fetchSlots();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSlotAction(slotId, meta) {
    if (meta?.action === 'edit' && meta.slot) {
      const editSlot = meta.slot;
      setEditingSlotId(slotId);
      setForm({
        title: editSlot.title || '',
        purpose: editSlot.purpose || '',
        slotDate: editSlot.slotDate || '',
        startTime: editSlot.startTime?.slice(0, 5) || '09:00',
        endTime: editSlot.endTime?.slice(0, 5) || '09:30',
        durationMinutes: editSlot.durationMinutes || 30,
        maxCandidates: String(editSlot.maxCandidates || 1),
        recruiterId: String(editSlot.recruiterId || editSlot.Recruiter?.id || ''),
      });
      setFieldErrors({});
      setTouched({});
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (meta?.action === 'delete') {
      try {
        setError('');
        await slotsApi.delete(slotId);
        await fetchSlots();
      } catch (e) {
        setError(e.message);
        throw e;
      }
      return;
    }
    await fetchSlots();
  }

  const summaryCards = [
    { label: 'Total Slots', value: slots.length },
    { label: 'Today', value: todayCount },
    { label: 'Open', value: availableSlots.length },
    { label: 'Booked', value: bookedSlots.length },
  ];

  const baseSlots = !isRecruiterOrAdmin
    ? slots
    : activeTab === 'available'
    ? availableSlots
    : activeTab === 'booked'
    ? bookedSlots
    : upcomingSlots;

  const visibleSlots = useMemo(() => {
    let list = baseSlots;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.purpose || '').toLowerCase().includes(q) ||
        (s.Recruiter?.name || '').toLowerCase().includes(q)
      );
    }
    if (dateFilter) list = list.filter((s) => s.slotDate === dateFilter);
    return list;
  }, [baseSlots, search, dateFilter]);

  return (
    <Layout>
      <div className="slots-hero">
        <div>
          <h1 className="page-title">
            {user?.role === 'candidate' ? '🎯 Pick Your Interview Slot' : isAdmin ? '⚡ Slot Control Center' : '📅 My Interview Slots'}
          </h1>
          <p className="slots-hero-sub">Live availability synced for everyone in real time.</p>
        </div>
        <span className={`live-badge ${isConnected ? '' : 'offline'}`}>
          <span className="live-dot" />
          {isConnected ? 'Live sync on' : 'Reconnecting...'}
        </span>
      </div>

      <div className="slots-summary-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="slots-summary-card">
            <span className="slots-summary-label">{card.label}</span>
            <strong className="slots-summary-value">{card.value}</strong>
          </div>
        ))}
      </div>

      <SearchFilterBar
        search={search}
        onSearch={setSearch}
        dateFilter={dateFilter}
        onDate={setDateFilter}
        onClear={() => { setSearch(''); setDateFilter(''); }}
      />

      {error && <div className="auth-error">{error}</div>}

      {isRecruiterOrAdmin && (
        <div className="card slots-create-panel">
          <div className="slots-create-actions">
            <button type="button" className="btn btn-primary" onClick={() => {
              setShowForm((s) => {
                const next = !s;
                if (!next) {
                  setEditingSlotId(null);
                  setForm({ title: '', purpose: '', slotDate: '', startTime: '09:00', endTime: '09:30', durationMinutes: 30, maxCandidates: 1, recruiterId: '' });
                }
                return next;
              });
              setFieldErrors({});
              setTouched({});
            }}>
              {showForm ? 'Close form' : 'Create slot'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={suggestRandomSlot}>
              Suggest random time
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="slot-form">
              <div className="slots-form-heading">
                <h3>{editingSlotId ? 'Edit slot' : 'Create slot'}</h3>
                {editingSlotId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingSlotId(null);
                      setForm({ title: '', purpose: '', slotDate: '', startTime: '09:00', endTime: '09:30', durationMinutes: 30, maxCandidates: 1, recruiterId: '' });
                      setFieldErrors({});
                      setTouched({});
                    }}
                  >
                    New slot
                  </button>
                )}
              </div>
              {isAdmin && (
                <div className="form-row form-row--full">
                  <label>
                    Assign to recruiter
                    <select
                      value={form.recruiterId}
                      onChange={(e) => setField('recruiterId', e.target.value)}
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
                  Title <span className="field-required">*</span>
                  <input
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    onBlur={() => touchField('title')}
                    placeholder="Technical round"
                    className={fieldErrors.title ? 'input-error' : ''}
                  />
                  {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
                </label>
                <label>
                  Purpose
                  <input
                    value={form.purpose}
                    onChange={(e) => setField('purpose', e.target.value)}
                    placeholder="Backend interview"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Date <span className="field-required">*</span>
                  <input
                    type="date"
                    value={form.slotDate}
                    min={TODAY()}
                    onChange={(e) => setField('slotDate', e.target.value)}
                    onBlur={() => touchField('slotDate')}
                    className={fieldErrors.slotDate ? 'input-error' : ''}
                    required
                  />
                  {fieldErrors.slotDate && <span className="field-error">{fieldErrors.slotDate}</span>}
                </label>
                <label>
                  Start time <span className="field-required">*</span>
                  <input
                    type="time"
                    value={form.startTime}
                    min="07:00"
                    max="21:45"
                    onChange={(e) => setField('startTime', e.target.value)}
                    onBlur={() => touchField('startTime')}
                    className={fieldErrors.startTime ? 'input-error' : ''}
                  />
                  {fieldErrors.startTime && <span className="field-error">{fieldErrors.startTime}</span>}
                </label>
                <label>
                  End time <span className="field-required">*</span>
                  <input
                    type="time"
                    value={form.endTime}
                    min="07:15"
                    max="22:00"
                    onChange={(e) => setField('endTime', e.target.value)}
                    onBlur={() => touchField('endTime')}
                    className={fieldErrors.endTime ? 'input-error' : ''}
                  />
                  {fieldErrors.endTime && <span className="field-error">{fieldErrors.endTime}</span>}
                </label>
                <label>
                  Duration (min)
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={form.durationMinutes}
                    onChange={(e) => setField('durationMinutes', Number(e.target.value) || 30)}
                    onBlur={() => touchField('durationMinutes')}
                    className={fieldErrors.durationMinutes ? 'input-error' : ''}
                  />
                  {fieldErrors.durationMinutes && <span className="field-error">{fieldErrors.durationMinutes}</span>}
                </label>
                <label>
                  Max Candidates
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.maxCandidates}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                      setField('maxCandidates', digits);
                    }}
                    onBlur={() => {
                      const normalized = Math.min(20, Math.max(1, Number(form.maxCandidates) || 1));
                      setField('maxCandidates', String(normalized));
                      touchField('maxCandidates');
                    }}
                    className={fieldErrors.maxCandidates ? 'input-error' : ''}
                    title="Allow multiple candidates to book this slot (group interview)"
                  />
                  {fieldErrors.maxCandidates && <span className="field-error">{fieldErrors.maxCandidates}</span>}
                </label>
              </div>

              {form.startTime && form.endTime && toMinutes(form.endTime) > toMinutes(form.startTime) && (
                <div className="slot-timing-preview">
                  ⏱ {form.startTime} – {form.endTime} &nbsp;·&nbsp;
                  {toMinutes(form.endTime) - toMinutes(form.startTime)} min
                </div>
              )}

              <button type="submit" className="btn btn-primary">
                {editingSlotId ? 'Update slot' : 'Save slot'}
              </button>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading slots...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="empty-state-modern">
          <h3>{user?.role === 'candidate' ? 'No available slots right now' : 'No slots created yet'}</h3>
          <p>
            {user?.role === 'candidate'
              ? 'Recruiters will publish interview times soon.'
              : 'Create your first slot to start receiving bookings.'}
          </p>
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
                <span className="tab-label">Open</span>
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

          <div className="slots-section">
            <h2 className="slots-section-title">
              {isRecruiterOrAdmin
                ? activeTab === 'available'
                  ? '🟢 Open slots'
                  : activeTab === 'booked'
                  ? '🔴 Booked slots'
                  : '📅 Upcoming slots'
                : '🗓️ Available and upcoming'}
              <span className="slots-section-count"> ({visibleSlots.length})</span>
            </h2>

            {visibleSlots.length === 0 ? (
              <p className="slots-section-empty">No slots in this view.</p>
            ) : (
              <div className="slots-grid">
                {visibleSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onBook={handleSlotAction}
                    userRole={user?.role}
                    showBadge={isRecruiterOrAdmin}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
