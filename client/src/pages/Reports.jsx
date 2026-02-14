import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { reportsApi } from '../api/client';

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    reportsApi.overview(params)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  function formatTime(t) {
    if (!t) return '–';
    if (typeof t === 'string' && t.length >= 5) return t.slice(0, 5);
    return t;
  }

  return (
    <Layout>
      <h1 className="page-title">Interview Reports</h1>
      <div className="card">
        <div className="form-row">
          <label>
            From date
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To date
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </div>
      {error && <div className="auth-error">{error}</div>}
      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : data ? (
        <>
          <div className="card">
            <h3>Overview</h3>
            <p>Total slots: <strong>{data.totalSlots}</strong></p>
            <p>Total bookings: <strong>{data.totalBookings}</strong></p>
            <p>Scheduled: <strong>{data.scheduled}</strong> · Completed: <strong>{data.completed}</strong> · Cancelled: <strong>{data.cancelled}</strong></p>
          </div>
          {data.bookings?.length > 0 && (
            <div className="table-wrap card">
              <h3>Bookings</h3>
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
                      <td>{b.candidateName || b.candidateEmail || '–'}</td>
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
