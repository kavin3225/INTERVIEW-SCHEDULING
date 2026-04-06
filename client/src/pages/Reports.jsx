import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Layout from '../components/Layout';
import { reportsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Reports.css';

const PIE_COLORS = { scheduled: '#667eea', completed: '#10b981', cancelled: '#ef4444' };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    reportsApi.overview(params)
      .then((res) => { if (!cancelled) { setData(res); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  const pieData = data ? [
    { name: 'Scheduled', value: data.scheduled },
    { name: 'Completed', value: data.completed },
    { name: 'Cancelled', value: data.cancelled },
  ].filter((d) => d.value > 0) : [];

  const barData = data?.bookings
    ? (() => {
        const map = {};
        data.bookings.forEach((b) => {
          const d = b.slotDate || 'Unknown';
          if (!map[d]) map[d] = { date: d, scheduled: 0, completed: 0, cancelled: 0 };
          map[d][b.status] = (map[d][b.status] || 0) + 1;
        });
        return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
      })()
    : [];

  const completionRate = data && data.totalBookings > 0
    ? Math.round((data.completed / data.totalBookings) * 100)
    : 0;

  function formatTime(t) {
    if (!t) return '-';
    return typeof t === 'string' && t.length >= 5 ? t.slice(0, 5) : t;
  }

  async function handleDownload(format) {
    setDownloadingFormat(format);
    setError('');
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const blob = format === 'csv'
        ? await reportsApi.downloadCsv(params)
        : await reportsApi.downloadPdf(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `interview-report-${stamp}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloadingFormat('');
    }
  }

  return (
    <Layout>
      <div className="reports-hero">
        <div>
          <h1 className="page-title">Analytics & Reports</h1>
          <p className="reports-subtitle">Track scheduling performance and booking outcomes.</p>
        </div>
        {user?.role === 'admin' && (
          <div className="reports-download-group">
            <button
              type="button"
              className="btn reports-download-btn"
              onClick={() => setShowDownloadMenu((open) => !open)}
              disabled={Boolean(downloadingFormat)}
              aria-haspopup="true"
              aria-expanded={showDownloadMenu}
            >
              {downloadingFormat
                ? `Preparing ${downloadingFormat.toUpperCase()}...`
                : 'Download'}
            </button>
            {showDownloadMenu && !downloadingFormat && (
              <div className="reports-download-menu">
                <button
                  type="button"
                  className="reports-download-option"
                  onClick={() => {
                    setShowDownloadMenu(false);
                    handleDownload('pdf');
                  }}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  className="reports-download-option"
                  onClick={() => {
                    setShowDownloadMenu(false);
                    handleDownload('csv');
                  }}
                >
                  Download CSV
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card reports-filter-card">
        <div className="form-row">
          <label>From date<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To date<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {(from || to) && (
            <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={() => { setFrom(''); setTo(''); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <div className="loading-state"><div className="spinner" /><p>Loading analytics...</p></div>
      ) : data ? (
        <>
          <div className="reports-kpi-grid">
            <div className="reports-kpi">
              <span className="reports-kpi-value">{data.totalSlots}</span>
              <span className="reports-kpi-label">Total Slots</span>
            </div>
            <div className="reports-kpi">
              <span className="reports-kpi-value">{data.totalBookings}</span>
              <span className="reports-kpi-label">Total Bookings</span>
            </div>
            <div className="reports-kpi kpi-scheduled">
              <span className="reports-kpi-value">{data.scheduled}</span>
              <span className="reports-kpi-label">Scheduled</span>
            </div>
            <div className="reports-kpi kpi-completed">
              <span className="reports-kpi-value">{data.completed}</span>
              <span className="reports-kpi-label">Completed</span>
            </div>
            <div className="reports-kpi kpi-cancelled">
              <span className="reports-kpi-value">{data.cancelled}</span>
              <span className="reports-kpi-label">Cancelled</span>
            </div>
            <div className="reports-kpi kpi-rate">
              <span className="reports-kpi-value">{completionRate}%</span>
              <span className="reports-kpi-label">Completion Rate</span>
            </div>
          </div>

          <div className="reports-charts-row">
            {pieData.length > 0 && (
              <div className="card reports-chart-card">
                <h3 className="reports-chart-title">Booking Status</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase()] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {barData.length > 0 && (
              <div className="card reports-chart-card reports-chart-bar">
                <h3 className="reports-chart-title">Bookings by Date</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="scheduled" fill={PIE_COLORS.scheduled} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill={PIE_COLORS.completed} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cancelled" fill={PIE_COLORS.cancelled} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {data.bookings?.length > 0 && (
            <div className="table-wrap card">
              <h3>Booking Details</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Candidate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.slotDate}</td>
                      <td>{formatTime(b.startTime)}</td>
                      <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                      <td>{b.candidateName || b.candidateEmail || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </Layout>
  );
}
