import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, formatDateTimeIST } from '../../utils/api';
import './index.css';

const Analytics = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin()) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/dashboard/hospital');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyStatus = (occupied, total) => {
    if (total === 0) return { label: 'Empty', class: 'empty', color: '#94a3b8' };
    const pct = (occupied / total) * 100;
    if (pct < 50) return { label: 'Low Occupancy', class: 'low', color: '#22c55e' };
    if (pct < 80) return { label: 'Moderate', class: 'moderate', color: '#f59e0b' };
    return { label: 'Critical Alert', class: 'high', color: '#ef4444' };
  };

  if (!isAdmin()) {
    return (
      <div className="access-denied" style={{ padding: '60px 20px', textPIgnore: 'center', textAlign: 'center' }}>
        <div className="card" style={{ background: 'white', borderRadius: '14px', padding: '40px 20px', border: '1px solid #e2e8f0', display: 'inline-block', maxWidth: '400px' }}>
          <h2>🔒 Access Denied</h2>
          <p style={{ color: '#64748b', marginTop: '8px' }}>You do not have permission to view analytics page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="page-header">
          <h2>📈 Hospital Analytics</h2>
        </div>
        <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="page-header">
          <h2>📈 Hospital Analytics</h2>
        </div>
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '10px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', opacity: 0.6 }} type="button">×</button>
        </div>
      </div>
    );
  }

  const occupancyData = stats?.wardBreakdown || [];

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h2>📈 Hospital Analytics & Occupancy Telemetry</h2>
      </div>

      {}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{stats?.occupancyRate}%</h3>
            <p>Occupancy Rate</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats?.totalPatients}</h3>
            <p>Registered Patients</p>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{stats?.todayAdmissions}</h3>
            <p>Today's Admissions</p>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">🏥</div>
          <div className="stat-info">
            <h3>{stats?.activeAdmissions}</h3>
            <p>Active Admissions</p>
          </div>
        </div>
      </div>

      {/* Ward Occupancy Heatmap */}
      <div className="card">
        <h3 className="card-title">🏢 Ward Bed-Occupancy Heatmap</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '-10px', marginBottom: '20px' }}>
          Real-time color-coded density indicator. Green: &lt;50% occupancy | Yellow: 50% - 80% occupancy | Red: &ge;80% critical occupancy.
        </p>

        {occupancyData.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '32px' }}>🏢</span>
            <p style={{ margin: '10px 0 0 0', fontWeight: '500' }}>No wards data available to render heatmap</p>
          </div>
        ) : (
          <div className="heatmap-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '10px' }}>
            {occupancyData.map(ward => {
              const occupiedPct = ward.totalBeds > 0 ? ((ward.occupied / ward.totalBeds) * 100).toFixed(1) : '0.0';
              const status = getOccupancyStatus(ward.occupied, ward.totalBeds);

              return (
                <div key={ward.wardName} className={`heatmap-card heatmap-${status.class}`} style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Glowing header bar based on status */}
                  <div className="heatmap-status-indicator" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    backgroundColor: status.color
                  }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="ward-type-badge" style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      background: '#f1f5f9',
                      color: '#475569'
                    }}>{ward.wardType}</span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: status.color, textTransform: 'uppercase' }}>
                      {status.label}
                    </span>
                  </div>

                  <h4 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{ward.wardName}</h4>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                      {occupiedPct}%
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                      {ward.occupied} / {ward.totalBeds} Beds
                    </span>
                  </div>

                  <div className="heatmap-progress-bar" style={{
                    height: '6px',
                    width: '100%',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginTop: '4px'
                  }}>
                    <div className="heatmap-progress-fill" style={{
                      height: '100%',
                      width: `${occupiedPct}%`,
                      backgroundColor: status.color,
                      borderRadius: '3px',
                      transition: 'width 0.4s'
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ward Occupancy Progress Chart */}
      <div className="card">
        <h3 className="card-title">🏢 Detailed Ward Occupancy Breakdown</h3>
        <div className="ward-bars">
          {occupancyData.map(ward => {
            const occupiedPct = ward.totalBeds > 0 ? (ward.occupied / ward.totalBeds) * 100 : 0;
            const cleaningPct = ward.totalBeds > 0 ? (ward.cleaning / ward.totalBeds) * 100 : 0;
            const availablePct = ward.totalBeds > 0 ? (ward.available / ward.totalBeds) * 100 : 0;

            return (
              <div key={ward.wardName} className="ward-bar-row">
                <div className="ward-bar-label">
                  <span className="ward-name">{ward.wardName}</span>
                  <span className="ward-count">{ward.occupied}/{ward.totalBeds}</span>
                </div>
                <div className="ward-bar-track">
                  <div className="ward-bar-fill">
                    <div
                      className="bar-segment occupied"
                      style={{ width: `${occupiedPct}%` }}
                      title={`Occupied: ${ward.occupied}`}
                    ></div>
                    <div
                      className="bar-segment cleaning"
                      style={{ width: `${cleaningPct}%` }}
                      title={`Cleaning: ${ward.cleaning}`}
                    ></div>
                    <div
                      className="bar-segment available"
                      style={{ width: `${availablePct}%` }}
                      title={`Available: ${ward.available}`}
                    ></div>
                  </div>
                </div>
                <div className="ward-bar-legend">
                  <span className="legend-dot occupied"></span> {ward.occupied}
                  <span className="legend-dot cleaning"></span> {ward.cleaning}
                  <span className="legend-dot available"></span> {ward.available}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bed Status Distribution */}
      <div className="card">
        <h3 className="card-title">🛏️ Bed Status Distribution</h3>
        <div className="status-distribution">
          {[
            { label: 'Occupied', value: stats?.bedStats?.occupied || 0, color: '#ef4444', total: stats?.bedStats?.total || 0 },
            { label: 'Available', value: stats?.bedStats?.available || 0, color: '#22c55e', total: stats?.bedStats?.total || 0 },
            { label: 'Cleaning', value: stats?.bedStats?.cleaning || 0, color: '#3b82f6', total: stats?.bedStats?.total || 0 },
            { label: 'Maintenance', value: stats?.bedStats?.maintenance || 0, color: '#6b7280', total: stats?.bedStats?.total || 0 },
            { label: 'Reserved', value: stats?.bedStats?.reserved || 0, color: '#f59e0b', total: stats?.bedStats?.total || 0 },
          ].map(item => (
            <div key={item.label} className="status-item">
              <div className="status-ring" style={{
                background: `conic-gradient(${item.color} ${item.total > 0 ? (item.value / item.total) * 360 : 0}deg, #e2e8f0 0deg)`
              }}>
                <div className="status-ring-inner">
                  <span className="status-value">{item.value}</span>
                </div>
              </div>
              <span className="status-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Emergencies Table */}
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

export default Analytics;