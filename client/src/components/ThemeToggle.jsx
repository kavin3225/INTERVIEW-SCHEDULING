import { useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [animating, setAnimating] = useState(false);
  const [rippleStyle, setRippleStyle] = useState({});
  // capture direction at click time — never changes mid-animation
  const rippleClass = useRef('');

  function handleClick(e) {
    if (animating) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxDist = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy)
    );

    // lock direction NOW before any state changes
    rippleClass.current = isDark ? 'ripple-to-light' : 'ripple-to-dark';

    setRippleStyle({
      left: cx + 'px',
      top: cy + 'px',
      '--ripple-size': maxDist * 2.4 + 'px',
    });
    setAnimating(true);

    // switch theme exactly when ripple fully covers screen
    setTimeout(() => toggleTheme(), 420);
    // remove ripple after fade-out completes
    setTimeout(() => setAnimating(false), 660);
  }

  return (
    <>
      {animating && (
        <div
          className={`theme-ripple ${rippleClass.current}`}
          style={rippleStyle}
        />
      )}

      <button
        className={`tt-pill ${isDark ? 'tt-dark' : 'tt-light'}`}
        onClick={handleClick}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light' : 'Switch to dark'}
      >
        <span className="tt-glow" />

        <span className="tt-track">
          <span className="tt-side tt-side-dark">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`tt-star tt-star-${i}`} />
            ))}
          </span>
          <span className="tt-side tt-side-light">
            <span className="tt-cloud tt-cloud-1" />
            <span className="tt-cloud tt-cloud-2" />
          </span>
        </span>

        <span className={`tt-thumb ${isDark ? 'tt-thumb-dark' : 'tt-thumb-light'}`}>
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="tt-icon">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="tt-icon">
              <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
              <line x1="12" y1="2" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
              <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
              <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
            </svg>
          )}
        </span>

        <span className="tt-label">{isDark ? 'Dark' : 'Light'}</span>
      </button>
    </>
  );
}
