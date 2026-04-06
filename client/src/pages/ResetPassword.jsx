import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';
import VideoBackground from '../components/VideoBackground';
import './Auth.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset link is missing or invalid.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.resetPassword(token, password);
      setMessage(response.message || 'Password reset successfully. You can now sign in.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <VideoBackground />
      <div className="auth-card">
        <h1>Create a new password</h1>
        <h2>Choose a strong password to finish recovering your account.</h2>
        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        {!token && <div className="auth-error">This reset link is invalid. Request a new one.</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <button type="submit" disabled={submitting || !token}>
            {submitting ? 'Updating password...' : 'Reset password'}
          </button>
        </form>
        <p className="auth-link">
          Back to <Link to="/login">sign in</Link>
        </p>
      </div>
    </div>
  );
}
