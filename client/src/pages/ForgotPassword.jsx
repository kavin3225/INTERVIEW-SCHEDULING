import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';
import VideoBackground from '../components/VideoBackground';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    candidateName: '',
    email: '',
    requestedEmail: '',
    requestedPassword: '',
  });
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const response = await authApi.forgotPassword(email.trim());
      setMessage(response.message || 'If that email exists, a reset link has been sent.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Unable to send reset link.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestSubmit(e) {
    e.preventDefault();
    setRequestError('');
    setRequestMessage('');
    setRequestSubmitting(true);

    try {
      const response = await authApi.submitRecoveryRequest(requestForm);
      setRequestMessage(response.message || 'Recovery request sent to the recruiter.');
      setRequestForm({
        candidateName: '',
        email: '',
        requestedEmail: '',
        requestedPassword: '',
      });
    } catch (err) {
      setRequestError(err.message || 'Unable to send recovery request.');
    } finally {
      setRequestSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <VideoBackground />
      <div className="auth-card auth-card-wide">
        <h1>Reset your password</h1>
        <h2>Send a reset link or request recruiter help if you lost access to your email.</h2>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>

        <div className="auth-divider">or request recruiter support</div>

        {requestError && <div className="auth-error">{requestError}</div>}
        {requestMessage && <div className="auth-success">{requestMessage}</div>}
        <form onSubmit={handleRequestSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={requestForm.candidateName}
            onChange={(e) => setRequestForm((current) => ({ ...current, candidateName: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="Your email"
            value={requestForm.email}
            onChange={(e) => setRequestForm((current) => ({ ...current, email: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder="New email if needed"
            value={requestForm.requestedEmail}
            onChange={(e) => setRequestForm((current) => ({ ...current, requestedEmail: e.target.value }))}
          />
          <input
            type="password"
            placeholder="New password if needed"
            value={requestForm.requestedPassword}
            onChange={(e) => setRequestForm((current) => ({ ...current, requestedPassword: e.target.value }))}
            minLength={6}
          />
          <button type="submit" disabled={requestSubmitting}>
            {requestSubmitting ? 'Sending request...' : 'Request recruiter help'}
          </button>
        </form>

        <p className="auth-link">
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
