import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { bookingsApi } from '../api/client';
import { useCountdown } from '../hooks/useCountdown';
import './Profile.css';

const STATUS_COLORS = {
  completed: '#10b981',
  cancelled: '#ef4444',
};

function NextInterviewCountdown({ booking }) {
  const label = useCountdown(booking?.InterviewSlot?.slotDate, booking?.InterviewSlot?.startTime);
  if (!booking) return null;
  return (
    <div className="profile-countdown">
      <span className="profile-countdown-label">Next interview in</span>
      <span className="profile-countdown-value">{label}</span>
      <span className="profile-countdown-sub">
        {booking.InterviewSlot?.slotDate} at {booking.InterviewSlot?.startTime?.slice(0, 5)}
      </span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="profile-chart-tooltip">
      {label ? <p className="profile-chart-tooltip-label">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi.list().then(setBookings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    .filter((b) => b.status === 'scheduled' && b.InterviewSlot?.slotDate >= now)
    .sort((a, b) => a.InterviewSlot?.slotDate?.localeCompare(b.InterviewSlot?.slotDate));
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
  const nextInterview = upcoming[0] || null;
  const attendedRate = bookings.length ? Math.round((completed / bookings.length) * 100) : 0;

  const initials = user?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const statusPieData = [
    { name: 'Attended', value: completed, fill: STATUS_COLORS.completed },
    { name: 'Cancelled', value: cancelled, fill: STATUS_COLORS.cancelled },
  ].filter((entry) => entry.value > 0);

  const historyChartData = useMemo(() => {
    const monthMap = new Map();
    bookings.forEach((booking) => {
      const slotDate = booking.InterviewSlot?.slotDate;
      if (!slotDate) return;
      const monthKey = slotDate.slice(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthKey, Attended: 0, Cancelled: 0 });
      }
      if (booking.status === 'completed') monthMap.get(monthKey).Attended += 1;
      if (booking.status === 'cancelled') monthMap.get(monthKey).Cancelled += 1;
    });

    return [...monthMap.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map((entry) => ({
        ...entry,
        label: new Date(`${entry.month}-01T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
      }));
  }, [bookings]);

  return (
    <Layout>
      <div className="profile-hero">
        <div className="profile-avatar">{initials}</div>
        <div>
          <h1 className="page-title">{user?.name}</h1>
          <p className="profile-email">{user?.email}</p>
          <span className="profile-role-badge">{user?.role}</span>
        </div>
      </div>

      {nextInterview && <NextInterviewCountdown booking={nextInterview} />}

      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-value">{bookings.length}</span>
          <span className="profile-stat-label">Total</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value upcoming">{upcoming.length}</span>
          <span className="profile-stat-label">Upcoming</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value completed">{completed}</span>
          <span className="profile-stat-label">Attended</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-value cancelled">{cancelled}</span>
          <span className="profile-stat-label">Cancelled</span>
        </div>
      </div>

      {bookings.length > 0 && (
        <>
          <div className="profile-insight-strip">
            <div className="profile-insight-card">
              <span className="profile-insight-label">Attendance Rate</span>
              <strong className="profile-insight-value">{attendedRate}%</strong>
              <span className="profile-insight-sub">Based on your completed interview history</span>
            </div>
            <div className="profile-insight-card">
              <span className="profile-insight-label">Interview Summary</span>
              <strong className="profile-insight-value">{completed} attended / {cancelled} cancelled</strong>
              <span className="profile-insight-sub">A quick view of your interview outcomes</span>
            </div>
          </div>

          <div className="profile-charts-row">
            {statusPieData.length > 0 && (
              <div className="profile-chart-card">
                <h2 className="profile-section-title">Attendance vs Cancelled</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={56} outerRadius={84} paddingAngle={4}>
                      {statusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {historyChartData.length > 0 && (
              <div className="profile-chart-card">
                <h2 className="profile-section-title">Monthly History</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={historyChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Attended" fill={STATUS_COLORS.completed} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Cancelled" fill={STATUS_COLORS.cancelled} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      <h2 className="profile-section-title">Interview History</h2>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : bookings.length === 0 ? (
        <div className="empty-state-modern"><h3>No interviews yet</h3><p>Book a slot to get started.</p></div>
      ) : (
        <div className="profile-history">
          {bookings.map((b) => {
            const slotDate = b.InterviewSlot?.slotDate;
            const date = slotDate ? new Date(`${slotDate}T00:00:00`) : null;
            return (
              <div key={b.id} className={`profile-history-item status-${b.status}`}>
                <div className="phi-date">
                  <span>{date?.toLocaleDateString('en-US', { month: 'short' })}</span>
                  <strong>{date?.getDate()}</strong>
                </div>
                <div className="phi-info">
                  <span className="phi-time">
                    {b.InterviewSlot?.startTime?.slice(0, 5)} - {b.InterviewSlot?.endTime?.slice(0, 5)}
                  </span>
                  <span className="phi-title">{b.InterviewSlot?.title || 'Interview'}</span>
                  {b.InterviewSlot?.Recruiter && <span className="phi-recruiter">with {b.InterviewSlot.Recruiter.name}</span>}
                </div>
                <span className={`phi-badge ${b.status}`}>{b.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
