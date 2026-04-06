import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocketConnection } from '../context/SocketContext';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import Layout from '../components/Layout';
import { slotsApi, bookingsApi } from '../api/client';
import { getCandidateDisplayLabel } from '../utils/privacy';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected } = useSocketConnection();
  const [stats, setStats] = useState({ total: 0, available: 0, booked: 0, upcoming: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('en-GB', { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const [slots, bookings] = await Promise.all([slotsApi.list(), bookingsApi.list()]);
      const today = new Date().toISOString().slice(0, 10);

      setStats({
        total: slots.length,
        available: slots.filter((slot) => !slot.isBooked && slot.slotDate >= today).length,
        booked: slots.filter((slot) => slot.isBooked).length,
        upcoming: bookings.filter((booking) => booking.status === 'scheduled' && booking.InterviewSlot?.slotDate >= today).length,
      });
      setRecentActivity(bookings.slice(0, 5));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useRealtimeEvents({
    onSlotsUpdate: fetchStats,
    onBookingsUpdate: fetchStats,
  });

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <Layout>
      <div className="dashboard-hero">
        <div>
          <h1 className="page-title">Team Dashboard</h1>
          <p className="dashboard-welcome">Welcome back, {user?.name}. Here is your scheduling pulse.</p>
          <p className="dashboard-clock">{clock}</p>
        </div>
        <span className={`live-badge ${isConnected ? '' : 'offline'}`}>
          <span className="live-dot" />
          {isConnected ? 'Live updates on' : 'Offline sync'}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Slots</div>
        </div>
        <div className="stat-card stat-available">
          <div className="stat-value">{stats.available}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card stat-booked">
          <div className="stat-value">{stats.booked}</div>
          <div className="stat-label">Booked</div>
        </div>
        <div className="stat-card stat-upcoming">
          <div className="stat-value">{stats.upcoming}</div>
          <div className="stat-label">Upcoming</div>
        </div>
      </div>

      {stats.total === 0 && (
        <div className="dashboard-empty-state">
          <h3 className="dashboard-empty-title">No slots yet</h3>
          <p className="dashboard-empty-text">
            {user?.role === 'candidate' &&
              'Slots are not published yet. Check again later or ask your recruiter when new slots open.'}
            {(user?.role === 'recruiter' || user?.role === 'admin') &&
              'Start by publishing your first interview slot so candidates can reserve it.'}
          </p>
          {(user?.role === 'recruiter' || user?.role === 'admin') && (
            <Link to="/slots" className="btn btn-primary dashboard-empty-cta">
              Create first slot
            </Link>
          )}
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="activity-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map((booking) => (
              <div key={booking.id} className="activity-item">
                <span className={`activity-badge ${booking.status}`}>{booking.status}</span>
                <span className="activity-text">
                  {getCandidateDisplayLabel(booking.Candidate, user?.role, booking.candidateId)} on {booking.InterviewSlot?.slotDate} at {booking.InterviewSlot?.startTime?.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-cards">
        {user?.role === 'admin' && (
          <>
            <Link to="/slots" className="dashboard-card">
              <span className="dashboard-card-title">Slots</span>
              <span className="dashboard-card-desc">Create and manage interview windows</span>
            </Link>
            <Link to="/users" className="dashboard-card">
              <span className="dashboard-card-title">Users</span>
              <span className="dashboard-card-desc">Control recruiter and candidate access</span>
            </Link>
            <Link to="/users" className="dashboard-card">
              <span className="dashboard-card-title">Candidates</span>
              <span className="dashboard-card-desc">Help candidates recover their account details</span>
            </Link>
            <Link to="/reports" className="dashboard-card">
              <span className="dashboard-card-title">Reports</span>
              <span className="dashboard-card-desc">Review completion and cancellation metrics</span>
            </Link>
          </>
        )}

        {user?.role === 'recruiter' && (
          <>
            <Link to="/slots" className="dashboard-card">
              <span className="dashboard-card-title">My Slots</span>
              <span className="dashboard-card-desc">Publish and tune your interview schedule</span>
            </Link>
            <Link to="/bookings" className="dashboard-card">
              <span className="dashboard-card-title">Bookings</span>
              <span className="dashboard-card-desc">Track upcoming candidate interviews</span>
            </Link>
            <Link to="/reports" className="dashboard-card">
              <span className="dashboard-card-title">Reports</span>
              <span className="dashboard-card-desc">Understand team scheduling trends</span>
            </Link>
          </>
        )}

        {user?.role === 'candidate' && (
          <>
            <Link to="/slots" className="dashboard-card">
              <span className="dashboard-card-title">Available Slots</span>
              <span className="dashboard-card-desc">Reserve your preferred interview time</span>
            </Link>
            <Link to="/bookings" className="dashboard-card">
              <span className="dashboard-card-title">My Bookings</span>
              <span className="dashboard-card-desc">Manage your upcoming interviews</span>
            </Link>
            <Link to="/calendar" className="dashboard-card">
              <span className="dashboard-card-title">Calendar</span>
              <span className="dashboard-card-desc">Visual overview of your schedule</span>
            </Link>
            <Link to="/profile" className="dashboard-card">
              <span className="dashboard-card-title">My Profile</span>
              <span className="dashboard-card-desc">View your interview history and stats</span>
            </Link>
          </>
        )}
      </div>
    </Layout>
  );
}
