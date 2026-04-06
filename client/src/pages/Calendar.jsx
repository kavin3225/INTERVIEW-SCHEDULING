import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import Layout from '../components/Layout';
import { slotsApi, bookingsApi } from '../api/client';
import { getCandidateDisplayLabel } from '../utils/privacy';
import './Calendar.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Calendar() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [today] = useState(new Date());
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([
        slotsApi.list(user?.role === 'candidate' ? { availableOnly: 'true' } : {}),
        bookingsApi.list(),
      ]);
      setSlots(s);
      setBookings(b);
    } catch (e) { console.error(e); }
  }, [user?.role]);

  useRealtimeEvents({ onSlotsUpdate: fetchAll, onBookingsUpdate: fetchAll });
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const eventMap = useMemo(() => {
    const map = {};
    slots.forEach((s) => {
      if (!map[s.slotDate]) map[s.slotDate] = [];
      map[s.slotDate].push({ type: s.isBooked ? 'booked' : 'available', label: s.title || s.startTime?.slice(0,5), id: s.id });
    });
    bookings.forEach((b) => {
      const d = b.InterviewSlot?.slotDate;
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push({ type: `booking-${b.status}`, label: b.InterviewSlot?.startTime?.slice(0,5), id: `b${b.id}` });
    });
    return map;
  }, [slots, bookings]);

  const { year, month } = cursor;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(d) { return `${year}-${pad(month + 1)}-${pad(d)}`; }
  function isToday(d) { return year === today.getFullYear() && month === today.getMonth() && d === today.getDate(); }

  const selectedEvents = selected ? (eventMap[dateKey(selected)] || []) : [];
  const selectedSlots = selected ? slots.filter((s) => s.slotDate === dateKey(selected)) : [];
  const selectedBookings = selected ? bookings.filter((b) => b.InterviewSlot?.slotDate === dateKey(selected)) : [];

  return (
    <Layout>
      <div className="cal-hero">
        <h1 className="page-title">🗓️ Calendar</h1>
        <p className="cal-sub">Visual overview of all interview slots and bookings.</p>
      </div>

      <div className="cal-card">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => setCursor(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 })}>‹</button>
          <span className="cal-month-label">{MONTHS[month]} {year}</span>
          <button className="cal-nav-btn" onClick={() => setCursor(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 })}>›</button>
        </div>

        <div className="cal-grid">
          {DAYS.map((d) => <div key={d} className="cal-day-header">{d}</div>)}
          {cells.map((d, i) => {
            const key = d ? dateKey(d) : `empty-${i}`;
            const events = d ? (eventMap[dateKey(d)] || []) : [];
            return (
              <div
                key={key}
                className={`cal-cell ${!d ? 'cal-cell-empty' : ''} ${d && isToday(d) ? 'cal-today' : ''} ${d && selected === d ? 'cal-selected' : ''} ${events.length > 0 ? 'cal-has-events' : ''}`}
                onClick={() => d && setSelected(selected === d ? null : d)}
              >
                {d && <span className="cal-date-num">{d}</span>}
                {d && events.length > 0 && (
                  <div className="cal-dots">
                    {events.slice(0, 3).map((e) => (
                      <span key={e.id} className={`cal-dot cal-dot-${e.type.split('-')[0]}`} />
                    ))}
                    {events.length > 3 && <span className="cal-more">+{events.length - 3}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="cal-detail">
          <h3 className="cal-detail-title">
            📌 {DAYS[new Date(year, month, selected).getDay()]}, {MONTHS[month]} {selected}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="cal-detail-empty">No events on this day.</p>
          ) : (
            <div className="cal-detail-list">
              {selectedSlots.map((s) => (
                <div key={s.id} className={`cal-event-item ${s.isBooked ? 'booked' : 'available'}`}>
                  <span className="cal-event-time">{s.startTime?.slice(0,5)} – {s.endTime?.slice(0,5)}</span>
                  <span className="cal-event-label">{s.title || 'Interview Slot'}</span>
                  <span className={`cal-event-badge ${s.isBooked ? 'booked' : 'available'}`}>{s.isBooked ? 'Booked' : 'Open'}</span>
                </div>
              ))}
              {selectedBookings.map((b) => (
                <div key={b.id} className={`cal-event-item booking-${b.status}`}>
                  <span className="cal-event-time">{b.InterviewSlot?.startTime?.slice(0,5)} – {b.InterviewSlot?.endTime?.slice(0,5)}</span>
                  <span className="cal-event-label">
                    {user?.role === 'candidate'
                      ? `With ${b.InterviewSlot?.Recruiter?.name || 'Recruiter'}`
                      : getCandidateDisplayLabel(b.Candidate, user?.role, b.candidateId)}
                  </span>
                  <span className={`cal-event-badge ${b.status}`}>{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="cal-legend">
        <span className="cal-legend-item"><span className="cal-dot cal-dot-available" />Available slot</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot-booked" />Booked slot</span>
        <span className="cal-legend-item"><span className="cal-dot cal-dot-booking" />Your booking</span>
      </div>
    </Layout>
  );
}
