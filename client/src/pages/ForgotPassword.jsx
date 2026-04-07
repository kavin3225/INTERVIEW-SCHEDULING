import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';
import VideoBackground from '../components/VideoBackground';
import './Auth.css';

export default function ForgotPassword() {
  const [requestForm, setRequestForm] = useState({
    candidateName: '',
    email: '',
    requestedEmail: '',
    requestedPassword: '',
  });
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [thread, setThread] = useState(null);
  const [threadError, setThreadError] = useState('');
  const [threadLoading, setThreadLoading] = useState(false);

  async function loadThread(emailValue) {
    const normalizedEmail = emailValue.trim().toLowerCase();

    if (!normalizedEmail) {
      setThread(null);
      setThreadError('Enter your email to view recruiter replies.');
      return;
    }

    setThreadLoading(true);
    setThreadError('');

    try {
      const response = await authApi.lookupRecoveryThread({
        email: normalizedEmail,
      });
      setThread(response.request || null);
    } catch (err) {
      setThread(null);
      setThreadError(err.message || 'Unable to load recruiter replies.');
    } finally {
      setThreadLoading(false);
    }
  }

  async function handleRequestSubmit(e) {
    e.preventDefault();
    setRequestError('');
    setRequestMessage('');

    setRequestSubmitting(true);

    try {
      const response = await authApi.submitRecoveryRequest({
        ...requestForm,
        candidateName: requestForm.candidateName.trim(),
        email: requestForm.email.trim().toLowerCase(),
        requestedEmail: requestForm.requestedEmail.trim().toLowerCase(),
      });
      setRequestMessage(response.message || 'Recovery request sent to the recruiter.');
      await loadThread(requestForm.email);
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
        <h2>Request recruiter help if you lost access to your email.</h2>

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

        <div className="auth-support-actions">
          <button
            type="button"
            className="auth-support-secondary"
            onClick={() => loadThread(requestForm.email)}
            disabled={threadLoading}
          >
            {threadLoading ? 'Checking replies...' : 'Check recruiter replies'}
          </button>
        </div>

        {threadError && <div className="auth-info">{threadError}</div>}
        {thread && (
          <div className="auth-thread-card">
            <div className="auth-thread-head">
              <div>
                <h3>Support replies</h3>
                <p>
                  Request status: <strong>{thread.status}</strong>
                </p>
              </div>
              <span>{thread.createdAt ? new Date(thread.createdAt).toLocaleString() : ''}</span>
            </div>

            <div className="auth-thread-meta">
              <span>Email: {thread.currentEmail || thread.contactEmail || 'Not provided'}</span>
              <span>Requested email: {thread.requestedEmail || 'No email change requested'}</span>
            </div>

            {thread.messages?.length ? (
              <div className="auth-thread-list">
                {thread.messages.map((message) => (
                  <div key={message.id} className="auth-thread-bubble">
                    <div className="auth-thread-bubble-meta">
                      <strong>{message.Sender?.name || 'Recruiter'}</strong>
                      <span>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <p>{message.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="auth-thread-empty">No recruiter replies yet. Check back here after they respond.</p>
            )}
          </div>
        )}

        <p className="auth-link">
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
