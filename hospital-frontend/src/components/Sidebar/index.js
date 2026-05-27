import React from 'react';
import { useAuth } from '../AuthContext';
import './index.css';

const Sidebar = ({
  activePage,
  onPageChange,
  collapsed,
  setCollapsed,
  criticalFollowupsCount = 0,
  pendingRoundsCount = 0
}) => {
  const { user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['reception', 'doctor', 'admin'] },
    { id: 'admission', label: 'Patient Admission', icon: '📝', roles: ['reception', 'admin'] },
    { id: 'beds', label: 'Bed Allocation', icon: '🛏️', roles: ['reception', 'doctor', 'admin'] },
    { id: 'emergency', label: 'Emergency Ward', icon: '🚨', roles: ['reception', 'doctor', 'admin'], badge: { count: 3, type: 'emergency' } },
    { id: 'admissions', label: 'Admissions', icon: '📋', roles: ['reception', 'doctor', 'admin'], badge: { count: 5, type: 'info' } },
    { id: 'patients', label: 'Patients', icon: '👤', roles: ['reception', 'doctor', 'admin'] },
    {
      id: 'followups',
      label: 'Follow-ups',
      icon: '📋',
      roles: ['doctor'],
      badge: criticalFollowupsCount > 0 ? { count: criticalFollowupsCount, type: 'emergency' } : null
    },
    {
      id: 'rounds',
      label: 'Consultation Rounds',
      icon: '🩺',
      roles: ['doctor'],
      badge: pendingRoundsCount > 0 ? { count: pendingRoundsCount, type: 'warning' } : null
    },
    { id: 'transfers', label: 'Transfers', icon: '🔄', roles: ['doctor', 'admin'], badge: { count: 2, type: 'warning' } },
    { id: 'employees', label: 'Employees', icon: '👥', roles: ['admin'] },
    { id: 'doctors', label: 'Doctors', icon: '👨‍⚕️', roles: ['admin'] },
    { id: 'analytics', label: 'Analytics', icon: '📈', roles: ['admin'] }
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        type="button"
      >
        {collapsed ? '→' : '←'}
      </button>

      <div className="sidebar-menu">
        {visibleItems.map(item => (
          <button
            key={item.id}
            className={`menu-item ${activePage === item.id || (activePage === 'patientDetail' && item.id === 'patients') ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
            type="button"
          >
            <span className="menu-icon">{item.icon}</span>
            {!collapsed && <span className="menu-label">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className={`menu-badge ${item.badge.type}`}>
                {item.badge.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="system-status">
            <span className="status-dot online"></span>
            System Online
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;