import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoBackground from '../components/VideoBackground';
import './Auth.css';

const candidateEmailPattern = /^[a-z0-9]+(?:[._][a-z0-9]+)*\.candidate@gmail\.com$/;

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (role === 'candidate' && !candidateEmailPattern.test(normalizedEmail)) {
      setError('Candidate email must be in the format name.candidate@gmail.com');
      return;
    }

    setSubmitting(true);
    try {
      await register({ email: normalizedEmail, password, name: name.trim(), role });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <VideoBackground />
      <div className="auth-card">
        <h1>SyncRoom</h1>
        <h2>Create your account</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder={role === 'candidate' ? 'name.candidate@gmail.com' : 'recruiter@gmail.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            pattern={role === 'candidate' ? '^[a-z0-9]+(?:[._][a-z0-9]+)*\\.candidate@gmail\\.com$' : undefined}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <label className="auth-role">
            Account type
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
