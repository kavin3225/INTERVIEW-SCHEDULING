import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocketConnection } from '../context/SocketContext';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import Layout from '../components/Layout';
import { slotsApi, bookingsApi } from '../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected } = useSocketConnection();
  const [stats, setStats] = useState({ total: 0, available: 0, booked: 0, upcoming: 0 });
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchStats = useCallback(async () => {
    try {
      const [slots, bookings] = await Promise.all([slotsApi.list(), bookingsApi.list()]);
      const now = new Date().toISOString().slice(0, 10);
      setStats({
        total: slots.length,
        available: slots.filter(s => !s.isBooked && s.slotDate >= now).length,
        booked: slots.filter(s => s.isBooked).length,
        upcoming: bookings.filter(b => b.status === 'scheduled' && b.InterviewSlot?.slotDate >= now).length
      });
      setRecentActivity(bookings.slice(0, 5));
    } catch (e) {
      console.error(e);
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
      <div className="page-header-row">
        <h1 className="page-title">Dashboard</h1>
        {isConnected && (
          <span className="live-badge" title="Stats update in real time">
            <span className="live-dot"></span> Live
          </span>
        )}
      </div>
      <p className="dashboard-welcome">Welcome, {user?.name}.</p>

      <p className="dashboard-stats-desc">Slots and bookings update in real time.</p>

      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Slots</div>
        </div>
        <div className="stat-card stat-available">
          <div className="stat-value">{stats.available}</div>
          <div className="stat-label">Available</div>
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
          <div className="dashboard-empty-icon">📅</div>
          <h3 className="dashboard-empty-title">No slots yet</h3>
          <p className="dashboard-empty-text">
            {user?.role === 'candidate' &&
              'No interview slots have been opened yet. Recruiters will add slots here—check back later or ask your recruiter.'}
            {(user?.role === 'recruiter' || user?.role === 'admin') &&
              'Create your first slot so candidates can book interviews. Go to My Slots to add availability.'}
          </p>
          {(user?.role === 'recruiter' || user?.role === 'admin') && (
            <Link to="/slots" className="btn btn-primary dashboard-empty-cta">
              Create a slot
            </Link>
          )}
        </div>
      )}

      {recentActivity.length > 0 && (
        <div className="activity-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map(b => (
              <div key={b.id} className="activity-item">
                <span className={`activity-badge ${b.status}`}>{b.status}</span>
                <span className="activity-text">
                  {b.Candidate?.name} - {b.InterviewSlot?.slotDate} at {b.InterviewSlot?.startTime?.slice(0,5)}
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
              <span className="dashboard-card-desc">Create and manage interview slots</span>
            </Link>
            <Link to="/users" className="dashboard-card">
              <span className="dashboard-card-title">Users</span>
              <span className="dashboard-card-desc">Manage all users</span>
            </Link>
            <Link to="/reports" className="dashboard-card">
              <span className="dashboard-card-title">Reports</span>
              <span className="dashboard-card-desc">View interview reports</span>
            </Link>
          </>
        )}
        {user?.role === 'recruiter' && (
          <>
            <Link to="/slots" className="dashboard-card">
              <span className="dashboard-card-title">My Slots</span>
              <span className="dashboard-card-desc">Create and manage interview slots</span>
            </Link>
            <Link to="/bookings" className="dashboard-card">
              <span className="dashboard-card-title">Bookings</span>
              <span className="dashboard-card-desc">View and update interview bookings</span>
            </Link>
            <Link to="/reports" className="dashboard-card">
              <span className="dashboard-card-title">Reports</span>
              <span className="dashboard-card-desc">Overview and history</span>
            </Link>
          </>
        )}
        {user?.role === 'candidate' && (
          <>
            <Link to="/slots" className="dashboard-card">
              <span className="dashboard-card-title">Available Slots</span>
              <span className="dashboard-card-desc">Book an interview slot</span>
            </Link>
            <Link to="/bookings" className="dashboard-card">
              <span className="dashboard-card-title">My Bookings</span>
              <span className="dashboard-card-desc">View and manage your interviews</span>
            </Link>
          </>
        )}
      </div>
    </Layout>
  );
}
