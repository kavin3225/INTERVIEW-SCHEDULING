import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VideoBackground from '../components/VideoBackground';
import { getDefaultRouteForRole } from '../utils/roleRoutes';
import './Auth.css';

const candidateEmailPattern = /^[a-z0-9]+(?:[._][a-z0-9]+)*\.candidate@gmail\.com$/;
const mobileNumberPattern = /^\+?[0-9]{10,15}$/;

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  function updateFieldError(field, value) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: value };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobileNumber = mobileNumber.trim();
    const nextFieldErrors = {};

    if (!trimmedName) {
      nextFieldErrors.name = 'Please enter your full name.';
    }

    if (!normalizedEmail) {
      nextFieldErrors.email = 'Please enter your email address.';
    } else if (!candidateEmailPattern.test(normalizedEmail)) {
      nextFieldErrors.email = 'Use the format name.candidate@gmail.com, for example giri.candidate@gmail.com.';
    }

    if (!normalizedMobileNumber) {
      nextFieldErrors.mobileNumber = 'Please enter your mobile number.';
    } else if (!mobileNumberPattern.test(normalizedMobileNumber)) {
      nextFieldErrors.mobileNumber = 'Enter 10 to 15 digits. You can start with + for country code.';
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      const firstError = nextFieldErrors.name || nextFieldErrors.email || nextFieldErrors.mobileNumber;
      setError(firstError || '');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const user = await register({
        email: normalizedEmail,
        password,
        name: trimmedName,
        mobileNumber: normalizedMobileNumber,
        role: 'candidate',
      });
      navigate(getDefaultRouteForRole(user?.role));
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page register-page">
      <VideoBackground />
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-eyebrow">Candidate Access</span>
          <h1>SyncRoom</h1>
          <h2>Create your account</h2>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="register-name">Full name</label>
            <input
              id="register-name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                updateFieldError('name', '');
              }}
              required
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name && <div className="auth-field-error">{fieldErrors.name}</div>}
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              type="email"
              placeholder="name.candidate@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                updateFieldError('email', '');
              }}
              required
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <div className="auth-field-hint">Format: `name.candidate@gmail.com`</div>
            {fieldErrors.email && <div className="auth-field-error">{fieldErrors.email}</div>}
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="register-mobile">Mobile number</label>
            <input
              id="register-mobile"
              type="tel"
              placeholder="Mobile number"
              value={mobileNumber}
              onChange={(e) => {
                setMobileNumber(e.target.value);
                updateFieldError('mobileNumber', '');
              }}
              required
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.mobileNumber)}
            />
            <div className="auth-field-hint">Enter 10 to 15 digits, optionally starting with `+`.</div>
            {fieldErrors.mobileNumber && <div className="auth-field-error">{fieldErrors.mobileNumber}</div>}
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <div className="auth-footer">
          <p className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
