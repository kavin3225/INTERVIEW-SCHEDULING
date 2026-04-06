import { useEffect, useMemo, useState } from 'react';
import './WelcomePopup.css';

const ROLE_CONFIG = {
  admin: {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glow: 'rgba(102, 126, 234, 0.6)',
    badge: 'Administrator',
    badgeColor: '#c4b5fd',
    badgeBg: 'rgba(102, 126, 234, 0.18)',
    badgeBorder: 'rgba(102, 126, 234, 0.4)',
    greeting: 'Full system access granted.',
    sub: 'Users, reports, and scheduling controls are ready.',
    icon: 'A',
    metrics: ['Users', 'Reports', 'Control'],
  },
  recruiter: {
    gradient: 'linear-gradient(135deg, #2a9d8f 0%, #0d9488 50%, #0891b2 100%)',
    glow: 'rgba(42, 157, 143, 0.6)',
    badge: 'Recruiter',
    badgeColor: '#6ee7b7',
    badgeBg: 'rgba(42, 157, 143, 0.18)',
    badgeBorder: 'rgba(42, 157, 143, 0.4)',
    greeting: 'Your hiring board is ready.',
    sub: 'Create slots, review bookings, and keep the pipeline moving.',
    icon: 'R',
    metrics: ['Slots', 'Bookings', 'Pipeline'],
  },
  candidate: {
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
    glow: 'rgba(99, 102, 241, 0.6)',
    badge: 'Candidate',
    badgeColor: '#a5b4fc',
    badgeBg: 'rgba(99, 102, 241, 0.18)',
    badgeBorder: 'rgba(99, 102, 241, 0.4)',
    greeting: 'Your interview space is ready.',
    sub: 'Check openings, manage bookings, and stay on track.',
    icon: 'C',
    metrics: ['Open Slots', 'My Bookings', 'Calendar'],
  },
};

function getDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function createParticles(seedText, glow) {
  const seed = Array.from(seedText || 'sync').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: 12 }, (_, index) => {
    const x = (seed * (index + 3) * 17) % 100;
    const y = (seed * (index + 5) * 11) % 100;
    const size = 4 + ((seed + index * 13) % 5);
    const duration = 3 + ((seed + index * 7) % 4);
    const delay = (index % 5) * 0.3;
    return {
      id: index,
      x,
      y,
      size,
      duration,
      delay,
      glow,
    };
  });
}

function Particles({ particles }) {
  return (
    <div className="wp-particles" aria-hidden="true">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="wp-particle"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            background: particle.glow,
          }}
        />
      ))}
    </div>
  );
}

export default function WelcomePopup({ user, onClose }) {
  const [phase, setPhase] = useState('enter');
  const cfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.candidate;
  const initials = user?.name?.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase() || '?';
  const dayGreeting = getDayGreeting();
  const particles = useMemo(() => createParticles(`${user?.name || 'user'}-${user?.role || 'candidate'}`, cfg.glow), [cfg.glow, user?.name, user?.role]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('exit'), 3400);
    const t2 = setTimeout(() => onClose(), 3850);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onClose]);

  return (
    <div className={`wp-overlay wp-${phase}`} onClick={onClose}>
      <div
        className="wp-card"
        style={{ '--wp-glow': cfg.glow, '--wp-gradient': cfg.gradient }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wp-ambient" style={{ background: cfg.gradient }} />
        <Particles particles={particles} />
        <div className="wp-shimmer" />
        <div className="wp-orbit wp-orbit-1" />
        <div className="wp-orbit wp-orbit-2" />
        <div className="wp-accent-line" style={{ background: cfg.gradient }} />

        <div className="wp-header">
          <div className="wp-avatar-wrap">
            <div className="wp-avatar-ring" style={{ background: cfg.gradient }} />
            <div className="wp-avatar" style={{ background: cfg.gradient }}>
              {initials}
            </div>
            <span className="wp-avatar-icon">{cfg.icon}</span>
          </div>
          <div className="wp-title-block">
            <p className="wp-hello">{dayGreeting}</p>
            <h2 className="wp-name">{user?.name}</h2>
            <div
              className="wp-badge"
              style={{
                color: cfg.badgeColor,
                background: cfg.badgeBg,
                borderColor: cfg.badgeBorder,
              }}
            >
              <span className="wp-badge-dot" style={{ background: cfg.badgeColor }} />
              {cfg.badge}
            </div>
          </div>
        </div>

        <div className="wp-body">
          <p className="wp-greeting">{cfg.greeting}</p>
          <p className="wp-sub">{cfg.sub}</p>
          <div className="wp-metrics">
            {cfg.metrics.map((metric) => (
              <span key={metric} className="wp-metric-chip">
                {metric}
              </span>
            ))}
          </div>
        </div>

        <div className="wp-divider" style={{ background: cfg.gradient }} />

        <div className="wp-progress-wrap">
          <div className="wp-progress-track">
            <div className="wp-progress-fill" style={{ background: cfg.gradient }} />
          </div>
          <div className="wp-footer-row">
            <span className="wp-progress-label">Preparing your workspace</span>
            <button type="button" className="wp-enter-btn" onClick={onClose}>
              Enter now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
