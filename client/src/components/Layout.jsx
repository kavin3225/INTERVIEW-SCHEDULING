import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="layout-brand">
          Interview Scheduler
        </Link>
        <nav className="layout-nav">
          {user?.role === 'admin' && (
            <>
              <Link to="/slots">Slots</Link>
              <Link to="/users">Users</Link>
              <Link to="/reports">Reports</Link>
            </>
          )}
          {user?.role === 'recruiter' && (
            <>
              <Link to="/slots">My Slots</Link>
              <Link to="/bookings">Bookings</Link>
              <Link to="/reports">Reports</Link>
            </>
          )}
          {user?.role === 'candidate' && (
            <>
              <Link to="/slots">Available Slots</Link>
              <Link to="/bookings">My Bookings</Link>
            </>
          )}
          <span className="layout-user">
            {user?.name} ({user?.role})
          </span>
          <button type="button" className="layout-logout" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </header>
      <main className="layout-main">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
