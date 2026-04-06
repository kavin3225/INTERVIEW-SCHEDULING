import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { blockedDatesApi } from '../api/client';
import './AvailabilityBlocker.css';

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function AvailabilityBlocker() {
  const [blocked, setBlocked] = useState([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBlocked = useCallback(async () => {
    try {
      const list = await blockedDatesApi.list();
      setBlocked(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlocked(); }, [fetchBlocked]);

  async function handleBlock(e) {
    e.preventDefault();
    setError('');
    try {
      await blockedDatesApi.block(date, reason);
      setDate('');
      setReason('');
      fetchBlocked();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleUnblock(id) {
    setError('');
    try {
      await blockedDatesApi.unblock(id);
      fetchBlocked();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Layout>
      <h1 className="page-title">🚫 Availability Blocker</h1>
      <p className="blocker-sub">Mark dates when you are unavailable. No interview slots can be created on blocked dates.</p>

      <form className="blocker-form card" onSubmit={handleBlock}>
        <label>
          Date to block
          <input type="date" value={date} min={TODAY()} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Reason (optional)
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Public holiday, Out of office" />
        </label>
        <button type="submit" className="btn btn-primary">Block date</button>
      </form>

      {error && <div className="auth-error">{error}</div>}

      <h2 className="blocker-list-title">Blocked Dates</h2>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : blocked.length === 0 ? (
        <div className="empty-state-modern"><h3>No blocked dates</h3><p>All dates are currently available.</p></div>
      ) : (
        <div className="blocker-list">
          {blocked.map((b) => (
            <div key={b.id} className="blocker-item">
              <div className="blocker-item-info">
                <span className="blocker-date">{b.blockedDate}</span>
                {b.reason && <span className="blocker-reason">{b.reason}</span>}
              </div>
              <button className="btn-unblock" onClick={() => handleUnblock(b.id)}>Unblock</button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
