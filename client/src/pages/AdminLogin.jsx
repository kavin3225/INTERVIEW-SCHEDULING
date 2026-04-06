import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoBackground from '../components/VideoBackground';
import WelcomePopup from '../components/WelcomePopup';
import { getDefaultRouteForRole } from '../utils/roleRoutes';
import './Auth.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState(null);
  const [emailLocked, setEmailLocked] = useState(true);
  const [passwordLocked, setPasswordLocked] = useState(true);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(email.trim().toLowerCase(), password);
      if (loggedInUser?.role !== 'admin') {
        logout();
        setError('This page is for admin accounts only.');
        return;
      }
      setWelcomeUser(loggedInUser);
    } catch (err) {
      setError(err.message || 'Admin login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page login-page admin-login-page">
      <VideoBackground />
      {welcomeUser && (
        <WelcomePopup
          user={welcomeUser}
          onClose={() => navigate(getDefaultRouteForRole(welcomeUser?.role))}
        />
      )}
      <div className="auth-card">
        <h1>Interview Scheduler</h1>
        <h2>Sign in as administrator</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} autoComplete="off">
          <input type="text" name="username" autoComplete="username" className="auth-decoy" tabIndex="-1" aria-hidden="true" />
          <input type="password" name="password" autoComplete="current-password" className="auth-decoy" tabIndex="-1" aria-hidden="true" />
          <input
            type="email"
            name="admin_login_mail"
            placeholder="Enter mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailLocked(false)}
            required
            autoComplete="off"
            readOnly={emailLocked}
          />
          <input
            type="password"
            name="admin_login_password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordLocked(false)}
            required
            autoComplete="off"
            readOnly={passwordLocked}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Admin sign in'}
          </button>
        </form>
        <p className="auth-link auth-link-inline">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="auth-link">
          User login? <Link to="/login">Go to sign in</Link>
        </p>
      </div>
    </div>
  );
}
