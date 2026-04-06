import { NavLink, Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import NotificationsBell from './NotificationsBell';
import { getDefaultRouteForRole } from '../utils/roleRoutes';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className={`layout role-${user?.role || 'guest'}`}>
      <header className="layout-header">
        <div className="layout-brand-wrap">
          <Link to={getDefaultRouteForRole(user?.role)} className="layout-brand">
            <span className="layout-brand-dot" />
            SyncRoom
          </Link>
          <span className="layout-subtitle">Real-time interview scheduling</span>
        </div>
        <nav className="layout-nav">
          {user?.role === 'admin' && (
            <>
              <NavLink to="/slots">Slots</NavLink>
              <NavLink to="/calendar">Calendar</NavLink>
              <NavLink to="/users">Users</NavLink>
              <NavLink to="/reports">Reports</NavLink>
            </>
          )}
          {user?.role === 'recruiter' && (
            <>
              <NavLink to="/slots">My Slots</NavLink>
              <NavLink to="/bookings">Bookings</NavLink>
              <NavLink to="/calendar">Calendar</NavLink>
              <NavLink to="/users">Candidates</NavLink>
              <NavLink to="/reports">Reports</NavLink>
            </>
          )}
          {user?.role === 'candidate' && (
            <>
              <NavLink to="/slots">Available Slots</NavLink>
              <NavLink to="/bookings">My Interviews</NavLink>
              <NavLink to="/calendar">Calendar</NavLink>
              <NavLink to="/profile">Profile</NavLink>
            </>
          )}
          <NotificationsBell />
          <span className="layout-user">{user?.name}</span>
          <span className="layout-role">{user?.role}</span>
          <button type="button" className="layout-logout" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </header>
      <main
        key={location.pathname}
        className="layout-main page-transition-enter"
        style={{ viewTransitionName: 'app-content' }}
      >
        {children ?? <Outlet />}
      </main>
      <ThemeToggle />
    </div>
  );
}
