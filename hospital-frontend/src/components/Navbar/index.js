import React, { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import './index.css';

const Navbar = ({ sidebarCollapsed, setSidebarCollapsed }) => {
  const { user, logout } = useContext(AuthContext);
  const displayName = user ? user.name : 'System User';
  const displayRole = user ? user.role : 'Guest';

  return (
    <nav className="navbar">
      <div className="nav-brand navbar-logo">
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title="Toggle Sidebar"
          type="button"
        >
          ☰
        </button>
        <span className="nav-icon">🌿</span>
        <h1 className="navbar-brand-text">CareNest</h1>
      </div>
      <div className="nav-user">
        <div className="user-details navbar-profile">
          <span className="user-name navbar-profile-name">{displayName}</span>
          <span className="user-role-badge navbar-profile-role" style={{ fontSize: '10px', background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', textTransform: 'uppercase', marginTop: '2px' }}>
            {displayRole}
          </span>
        </div>
        <div className="user-avatar navbar-avatar" style={{ background: '#0f766e', color: 'white', fontWeight: 'bold' }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <button className="logout-btn" onClick={logout} title="Logout">
          <span className="logout-icon">⏻</span> <span className="logout-text">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;