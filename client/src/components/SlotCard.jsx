import { useState } from 'react';
import { bookingsApi } from '../api/client';
import './SlotCard.css';

export default function SlotCard({ slot, onBook, userRole, showBadge }) {
  const [booking, setBooking] = useState(false);
  const [pulse, setPulse] = useState(false);

  async function handleBook() {
    setBooking(true);
    setPulse(true);
    try {
      await bookingsApi.create({ slotId: slot.id });
      onBook();
    } catch (e) {
      alert(e.message);
    } finally {
      setBooking(false);
      setTimeout(() => setPulse(false), 600);
    }
  }

  const isAvailable = !slot.isBooked;
  const isPast = slot.slotDate < new Date().toISOString().slice(0, 10);

  return (
    <div className={`slot-card ${pulse ? 'pulse' : ''} ${!isAvailable ? 'booked' : ''} ${isPast ? 'past' : ''}`}>
      {showBadge && (
        <span className={`slot-card-badge ${isAvailable ? 'available' : 'booked'}`}>
          {isAvailable ? 'Available' : 'Booked'}
        </span>
      )}
      <div className="slot-header">
        <div className="slot-date">
          <span className="date-day">{new Date(slot.slotDate + 'T00:00').toLocaleDateString('en', { weekday: 'short' })}</span>
          <span className="date-num">{new Date(slot.slotDate + 'T00:00').getDate()}</span>
          <span className="date-month">{new Date(slot.slotDate + 'T00:00').toLocaleDateString('en', { month: 'short' })}</span>
        </div>
        <div className="slot-info">
          <div className="slot-time">
            <span className="time-icon">🕐</span>
            {slot.startTime?.slice(0,5)} - {slot.endTime?.slice(0,5)}
          </div>
          {slot.title && <div className="slot-title">{slot.title}</div>}
          {slot.purpose && (
            <div className="slot-purpose" title="Purpose of this slot">
              📌 {slot.purpose}
            </div>
          )}
          {slot.Recruiter && <div className="slot-recruiter">👤 {slot.Recruiter.name}</div>}
        </div>
      </div>
      
      <div className="slot-footer">
        <div className={`status-indicator ${isAvailable ? 'available' : 'booked'}`}>
          <span className="status-dot"></span>
          {isAvailable ? 'Available' : 'Booked'}
        </div>
        {userRole === 'candidate' && isAvailable && !isPast && (
          <button 
            className="book-btn" 
            onClick={handleBook}
            disabled={booking}
          >
            {booking ? '⏳ Booking...' : '✓ Book Now'}
          </button>
        )}
      </div>
    </div>
  );
}
