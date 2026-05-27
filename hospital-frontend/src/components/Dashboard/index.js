import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, formatDateTimeIST, formatTimeIST } from '../../utils/api';
import PrivateRoute from '../PrivateRoute';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';
import BedAllocation from '../BedAllocation';
import Admissions from '../Admissions';
import Patients from '../Patients';
import Transfers from '../Transfers';
import Analytics from '../Analytics';
import Emergency from '../Emergency';
import Doctors from '../Doctors';
import AdmissionForm from '../AdmissionForm';
import Employees from '../Employees';
import FollowUps from '../FollowUps';
import PatientDetail from '../PatientDetail';
import ConsultationRounds from '../ConsultationRounds';
import './index.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  const isAllowed = (page, role) => {
    switch (page) {
      case 'dashboard':
        return true;
      case 'admission':
        return ['reception', 'admin', 'doctor'].includes(role);
      case 'beds':
      case 'emergency':
      case 'admissions':
      case 'patients':
      case 'patientDetail':
        return ['doctor', 'reception', 'admin'].includes(role);
      case 'followups':
      case 'rounds':
        return ['doctor'].includes(role);
      case 'transfers':
        return ['doctor', 'admin'].includes(role);
      case 'employees':
      case 'doctors':
      case 'analytics':
        return ['admin'].includes(role);
      default:
        return false;
    }
  };

  const getDefaultPage = (role) => {
    if (role === 'reception') return 'admission';
    if (role === 'doctor') return 'beds';
    return 'dashboard';
  };

  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash;
    const role = user?.role || '';
    let initialPage = getDefaultPage(role);

    if (hash.startsWith('#/patients/')) {
      initialPage = 'patientDetail';
    } else if (hash.startsWith('#/')) {
      const page = hash.replace('#/', '');
      if (isAllowed(page, role)) {
        initialPage = page;
      }
    }
    return initialPage;
  });

  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/patients/')) {
      return parseInt(hash.replace('#/patients/', ''), 10) || null;
    }
    return null;
  });

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [icuAlert, setIcuAlert] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768);

  const [criticalFollowupsCount, setCriticalFollowupsCount] = useState(0);
  const [pendingRoundsCount, setPendingRoundsCount] = useState(0);
  const [todayRoundsCount, setTodayRoundsCount] = useState(0);

  const navigateTo = (page, patientId = null) => {
    if (page === 'patientDetail' && patientId) {
      window.location.hash = `#/patients/${patientId}`;
    } else {
      window.location.hash = `#/${page}`;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const role = user?.role || '';

      let targetPage = 'dashboard';
      let patientId = null;

      if (hash.startsWith('#/patients/')) {
        targetPage = 'patientDetail';
        patientId = parseInt(hash.replace('#/patients/', ''), 10) || null;
      } else if (hash.startsWith('#/')) {
        targetPage = hash.replace('#/', '');
      } else {
        targetPage = getDefaultPage(role);
      }

      if (isAllowed(targetPage, role)) {
        setActivePage(targetPage);
        if (targetPage === 'patientDetail') {
          setSelectedPatientId(patientId);
        } else {
          setSelectedPatientId(null);
        }
      } else {
        const defaultPage = getDefaultPage(role);
        window.location.hash = `#/${defaultPage}`;
        setActivePage(defaultPage);
        setSelectedPatientId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        if (isAdmin()) {
          const dashboardData = await api.get('/dashboard/hospital');
          setStats(dashboardData);
        }
        const notifData = await api.get('/notifications');
        setNotifications(notifData);

        const icuBeds = await api.get('/beds?type=icu');
        if (icuBeds && icuBeds.length > 0) {
          const total = icuBeds.length;
          const occupied = icuBeds.filter(b => b.status === 'OCCUPIED').length;
          const rate = (occupied / total) * 100;
          if (rate >= 90) {
            setIcuAlert({
              level: 'CRITICAL',
              message: `ICU occupancy is critical: ${rate.toFixed(0)}% full (${occupied}/${total} beds occupied)`,
              color: '#e63946',
              bg: '#fef2f2',
              border: '#fecaca',
              text: '#7f1d1d',
              icon: '🚨',
              rate: rate,
              occupied: occupied,
              total: total
            });
          } else if (rate >= 70) {
            setIcuAlert({
              level: 'WARNING',
              message: `ICU occupancy is high: ${rate.toFixed(0)}% full (${occupied}/${total} beds occupied)`,
              color: '#f4a261',
              bg: '#fffbeb',
              border: '#fef3c7',
              text: '#78350f',
              icon: '⚠️',
              rate: rate,
              occupied: occupied,
              total: total
            });
          } else {
            setIcuAlert({
              level: 'NORMAL',
              message: `ICU occupancy is stable: ${rate.toFixed(0)}% full (${occupied}/${total} beds occupied)`,
              color: '#2d6a4f',
              bg: '#ecfdf5',
              border: '#d1fae5',
              text: '#047857',
              icon: '✅',
              rate: rate,
              occupied: occupied,
              total: total
            });
          }
        }

        if (user?.role === 'doctor') {
          const critData = await api.get('/api/followups/critical/count');
          setCriticalFollowupsCount(critData.count || 0);

          const todayRounds = await api.get('/api/rounds/today');
          setTodayRoundsCount(todayRounds.length);
          const pendingCount = todayRounds.filter(r => r.status === 'Pending').length;
          setPendingRoundsCount(pendingCount);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard initialization data:', error);
        if (isAdmin()) {
          setErrorMsg(error.message || 'Failed to fetch dashboard statistics.');
        }
      } finally {
        setLoading(false);
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activePage]);

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const renderDashboardHome = () => {

    if (!isAdmin()) {
      const getProgressBarColor = (percentage) => {
        if (percentage < 70) return '#2d6a4f';
        if (percentage < 90) return '#f4a261';
        return '#e63946';
      };

      return (
        <div className="dashboard-home">
          {}
          <div className="card welcome-card" style={{ background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)', color: 'white', padding: '30px', borderRadius: '14px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: 'white' }}>Welcome back, {user?.name}!</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="role-badge" style={{ display: 'inline-block', background: 'rgba(255, 255, 255, 0.2)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {user?.role} STAFF
              </span>
            </div>
            <p style={{ opacity: 0.9, fontSize: '14px', fontWeight: 'normal', margin: 0, color: '#f8f9fa', lineHeight: '1.5' }}>
              Use the sidebar menu to navigate patients database, check ward emergency beds, or update allocations.
            </p>
          </div>

          {}
          <div className="doctor-stats-grid" style={{ marginBottom: '24px' }}>
            <div className="doctor-stat-card" style={{ borderLeft: '4px solid #457b9d' }}>
              <div className="stat-icon">🛏️</div>
              <div className="stat-info">
                <h3>45</h3>
                <p>Total Beds</p>
              </div>
            </div>
            <div className="doctor-stat-card" style={{ borderLeft: '4px solid #e63946' }}>
              <div className="stat-icon">🔴</div>
              <div className="stat-info">
                <h3>32</h3>
                <p>Occupied</p>
              </div>
            </div>
            <div className="doctor-stat-card" style={{ borderLeft: '4px solid #2d6a4f' }}>
              <div className="stat-icon">🟢</div>
              <div className="stat-info">
                <h3>13</h3>
                <p>Available</p>
              </div>
            </div>
            <div className="doctor-stat-card" style={{ borderLeft: '4px solid #f4a261' }}>
              <div className="stat-icon">🚨</div>
              <div className="stat-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3>2</h3>
                  <span className="pending-badge" style={{ background: '#f4a261', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>PENDING</span>
                </div>
                <p>Emergency Queue</p>
              </div>
            </div>
            <div className="doctor-stat-card" style={{ borderLeft: '4px solid #6b5b95' }}>
              <div className="stat-icon">🩺</div>
              <div className="stat-info">
                <h3>{todayRoundsCount}</h3>
                <p>Today's Rounds</p>
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="quick-actions-row" style={{ marginBottom: '24px' }}>
            <button className="action-btn admit" onClick={() => navigateTo('admission')} type="button">
              <span>📝</span> Admit Patient
            </button>
            <button className="action-btn transfer" onClick={() => navigateTo('transfers')} type="button">
              <span>🔄</span> Transfer Bed
            </button>
            <button className="action-btn round" onClick={() => navigateTo('rounds')} type="button">
              <span>🩺</span> Start Round
            </button>
            <button className="action-btn emergency" onClick={() => navigateTo('emergency')} type="button">
              <span>🚨</span> Emergency Alert
            </button>
          </div>

          {/* ICU Status Card with Progress Bar */}
          {icuAlert && (
            <div className="icu-alert-card" style={{ background: icuAlert.bg, border: `1px solid ${icuAlert.border}`, padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span className="alert-icon" style={{ fontSize: '20px' }}>{icuAlert.icon}</span>
                <div>
                  <strong style={{ color: icuAlert.color, fontSize: '16px', fontWeight: '700' }}>ICU Status: {icuAlert.level}</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: icuAlert.text }}>{icuAlert.message}</p>
                </div>
              </div>

              {/* Progress bar container */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${icuAlert.rate || 0}%`,
                        backgroundColor: getProgressBarColor(icuAlert.rate || 0),
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1d3557', minWidth: '32px', textAlign: 'right' }}>
                    {(icuAlert.rate || 0).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity Feed */}
          <div className="card activity-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
            <h3 className="card-title" style={{ fontSize: '16px', fontWeight: '600', color: '#1d3557', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🕒 Recent Activity
            </h3>
            <div className="activity-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="activity-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="activity-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#457b9d', flexShrink: 0 }}></span>
                  <span style={{ color: '#1d3557', fontWeight: '500' }}>Patient admitted to Ward A - Bed 12</span>
                </div>
                <span style={{ color: '#6c757d', fontSize: '12px', whiteSpace: 'nowrap' }}>2 min ago</span>
              </div>

              <div className="activity-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="activity-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2d6a4f', flexShrink: 0 }}></span>
                  <span style={{ color: '#1d3557', fontWeight: '500' }}>Bed 8 discharged from General Ward</span>
                </div>
                <span style={{ color: '#6c757d', fontSize: '12px', whiteSpace: 'nowrap' }}>15 min ago</span>
              </div>

              <div className="activity-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="activity-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e63946', flexShrink: 0 }}></span>
                  <span style={{ color: '#1d3557', fontWeight: '500' }}>ICU Bed 2 allocated to emergency patient</span>
                </div>
                <span style={{ color: '#6c757d', fontSize: '12px', whiteSpace: 'nowrap' }}>1 hour ago</span>
              </div>

              <div className="activity-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="activity-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f4a261', flexShrink: 0 }}></span>
                  <span style={{ color: '#1d3557', fontWeight: '500' }}>Transfer request: Ward B → ICU pending</span>
                </div>
                <span style={{ color: '#6c757d', fontSize: '12px', whiteSpace: 'nowrap' }}>2 hours ago</span>
              </div>

              <div className="activity-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="activity-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6c757d', flexShrink: 0 }}></span>
                  <span style={{ color: '#1d3557', fontWeight: '500' }}>System backup completed successfully</span>
                </div>
                <span style={{ color: '#6c757d', fontSize: '12px', whiteSpace: 'nowrap' }}>3 hours ago</span>
              </div>
            </div>
            <div className="view-all-wrapper" style={{ textAlign: 'right', marginTop: '16px' }}>
              <a href="#activity" onClick={(e) => { e.preventDefault(); }} style={{ color: '#457b9d', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                View All Activity →
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Admins see full analytics dashboard
    return (
      <div className="dashboard-home">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">🛏️</div>
            <div className="stat-info">
              <h3>{stats?.bedStats?.total || 0}</h3>
              <p>Total Beds</p>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{stats?.bedStats?.available || 0}</h3>
              <p>Available</p>
            </div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon">🔴</div>
            <div className="stat-info">
              <h3>{stats?.bedStats?.occupied || 0}</h3>
              <p>Occupied</p>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">🧹</div>
            <div className="stat-info">
              <h3>{stats?.bedStats?.cleaning || 0}</h3>
              <p>Cleaning</p>
            </div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{stats?.activeAdmissions || 0}</h3>
              <p>Active Patients</p>
            </div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{stats?.todayAdmissions || 0}</h3>
              <p>Today's Admissions</p>
            </div>
          </div>
        </div>

        {}
        <div className="dashboard-row">
          <div className="card occupancy-card">
            <h3 className="card-title">🏥 Overall Occupancy</h3>
            <div className="occupancy-display">
              <div className="occupancy-circle">
                <svg viewBox="0 0 120 120">
                  <circle className="track" cx="60" cy="60" r="50" />
                  <circle
                    className="progress"
                    cx="60"
                    cy="60"
                    r="50"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 50}`,
                      strokeDashoffset: `${2 * Math.PI * 50 * (1 - (stats?.occupancyRate || 0) / 100)}`
                    }}
                  />
                </svg>
                <div className="occupancy-text">
                  <span className="percentage">{stats?.occupancyRate || 0}%</span>
                  <span className="label">Occupied</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card alerts-card">
            <h3 className="card-title">🔔 Live Notifications ({notifications.length})</h3>
            {notifications.length === 0 ? (
              <p className="empty-state">No new notifications</p>
            ) : (
              <div className="notification-list">
                {notifications.slice(0, 5).map(notif => (
                  <div key={notif.notificationId} className={`notification-item ${notif.type.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="notif-dot"></span>
                      <div>
                        <p style={{ margin: 0 }}>{notif.message}</p>
                        <span className="notif-time" style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {formatTimeIST(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkNotificationRead(notif.notificationId)}
                      style={{ background: 'none', border: 'none', color: '#0f766e', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
            {icuAlert && (
              <div className="icu-alert" style={{ background: icuAlert.bg, border: `1px solid ${icuAlert.border}`, display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '8px', marginTop: '16px', gap: '10px' }}>
                <span className="alert-icon">{icuAlert.icon}</span>
                <div>
                  <strong style={{ color: icuAlert.color, fontSize: '13px' }}>ICU {icuAlert.level}</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: icuAlert.text }}>{icuAlert.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {}
        <div className="card">
          <h3 className="card-title">🏢 Ward Breakdown</h3>
          <div className="ward-grid">
            {stats?.wardBreakdown?.map(ward => (
              <div key={ward.wardName} className="ward-item">
                <div className="ward-header">
                  <span className="ward-name">{ward.wardName}</span>
                  <span className="ward-type">{ward.wardType}</span>
                </div>
                <div className="ward-bars">
                  <div className="bar-container">
                    <div
                      className="bar occupied"
                      style={{ width: `${ward.totalBeds > 0 ? (ward.occupied / ward.totalBeds) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="bar-labels">
                    <span>{ward.occupied} occupied</span>
                    <span>{ward.available} free</span>
                  </div>
                </div>
                <div className="ward-numbers">
                  <span className="number occupied">{ward.occupied}</span>
                  <span className="separator">/</span>
                  <span className="number total">{ward.totalBeds}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="card">
          <h3 className="card-title">🚨 Recent Emergency Admissions</h3>
          {stats?.recentEmergencies?.length === 0 ? (
            <p className="empty-state">No recent emergency admissions</p>
          ) : (
            <div className="emergency-table">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Age</th>
                    <th>Bed</th>
                    <th>Ward</th>
                    <th>Time</th>
                    <th>Diagnosis</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentEmergencies?.map(em => (
                    <tr key={em.admissionId}>
                      <td><strong>{em.patientName}</strong></td>
                      <td>{em.age}</td>
                      <td><span className="bed-badge">{em.bedNumber}</span></td>
                      <td>{em.wardName}</td>
                      <td>{formatDateTimeIST(em.admittedAt)}</td>
                      <td>{em.diagnosis || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case 'admission':
        return (
          <PrivateRoute allowedRoles={['admin', 'reception']}>
            <AdmissionForm />
          </PrivateRoute>
        );
      case 'beds':
        return (
          <PrivateRoute allowedRoles={['admin', 'reception', 'doctor']}>
            <BedAllocation />
          </PrivateRoute>
        );
      case 'admissions':
        return (
          <PrivateRoute allowedRoles={['admin', 'reception', 'doctor']}>
            <Admissions />
          </PrivateRoute>
        );
      case 'patients':
        return (
          <PrivateRoute allowedRoles={['admin', 'reception', 'doctor']}>
            <Patients />
          </PrivateRoute>
        );
      case 'patientDetail':
        return (
          <PrivateRoute allowedRoles={['admin', 'reception', 'doctor']}>
            <PatientDetail patientId={selectedPatientId} onBack={() => navigateTo('patients')} />
          </PrivateRoute>
        );
      case 'followups':
        return (
          <PrivateRoute allowedRoles={['doctor']}>
            <FollowUps />
          </PrivateRoute>
        );
      case 'rounds':
        return (
          <PrivateRoute allowedRoles={['doctor']}>
            <ConsultationRounds />
          </PrivateRoute>
        );
      case 'transfers':
        return (
          <PrivateRoute allowedRoles={['admin', 'doctor']}>
            <Transfers />
          </PrivateRoute>
        );
      case 'employees':
        return (
          <PrivateRoute allowedRoles={['admin']}>
            <Employees />
          </PrivateRoute>
        );
      case 'doctors':
        return (
          <PrivateRoute allowedRoles={['admin']}>
            <Doctors />
          </PrivateRoute>
        );
      case 'analytics':
        return (
          <PrivateRoute allowedRoles={['admin']}>
            <Analytics stats={stats} />
          </PrivateRoute>
        );
      case 'emergency':
        return (
          <PrivateRoute allowedRoles={['admin', 'reception', 'doctor']}>
            <Emergency />
          </PrivateRoute>
        );
      default:
        return renderDashboardHome();
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading CareNest telemetry...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Navbar sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
      <div className="dashboard-body">
        <Sidebar
          activePage={activePage}
          onPageChange={navigateTo}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          criticalFollowupsCount={criticalFollowupsCount}
          pendingRoundsCount={pendingRoundsCount}
        />
        <main className="main-content">
          {errorMsg && (
            <div className="alert alert-error" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '10px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '14px', fontWeight: '500' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span>
                <p style={{ margin: 0 }}>{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'inherit', opacity: 0.6 }} type="button">×</button>
            </div>
          )}
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;