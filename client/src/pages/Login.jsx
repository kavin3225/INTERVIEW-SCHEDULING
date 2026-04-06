import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoBackground from '../components/VideoBackground';
import WelcomePopup from '../components/WelcomePopup';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [emailLocked, setEmailLocked] = useState(true);
  const [passwordLocked, setPasswordLocked] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      setWelcomeUser(u);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page login-page">
      <VideoBackground />

      {welcomeUser && (
        <WelcomePopup user={welcomeUser} onClose={() => navigate('/')} />
      )}

      <div className="auth-card">
        <div className="login-card-orb" aria-hidden="true">
          <div className="login-avatar">
            <span className="login-avatar-head" />
            <span className="login-avatar-body" />
          </div>
        </div>
        <h1>Welcome Back</h1>
        <h2>Sign in to continue scheduling interviews</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} autoComplete="off" className="login-form-modern">
          <input type="text" name="username" autoComplete="username" className="auth-decoy" tabIndex="-1" aria-hidden="true" />
          <input type="password" name="password" autoComplete="current-password" className="auth-decoy" tabIndex="-1" aria-hidden="true" />
          <label className="login-field">
            <span className="login-field-icon" aria-hidden="true">✉</span>
            <input
              type="email"
              name="login_mail"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailLocked(false)}
              required
              autoComplete="off"
              readOnly={emailLocked}
            />
          </label>
          <label className="login-field">
            <span className="login-field-icon" aria-hidden="true">🔒</span>
            <input
              type="password"
              name="login_password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordLocked(false)}
              required
              autoComplete="off"
              readOnly={passwordLocked}
            />
          </label>
          <div className="login-utility-row">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="login-forgot-link">Forgot Password?</Link>
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">
          New here? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
