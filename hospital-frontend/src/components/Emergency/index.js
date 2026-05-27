import React, { useState, useEffect } from 'react';
import { api, parseDate, formatDateTimeIST } from '../../utils/api';
import './index.css';

const Emergency = () => {
  const [emergencyBeds, setEmergencyBeds] = useState([]);
  const [emergencyAdmissions, setEmergencyAdmissions] = useState([]);
  const [icuStatus, setIcuStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchEmergencyData();

    const dataInterval = setInterval(fetchEmergencyData, 15000);

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, []);

  const fetchEmergencyData = async () => {
    try {
      const [bedsData, admissionsData, icuBedsData] = await Promise.all([
        api.get('/beds?type=emergency'),
        api.get('/admissions'),
        api.get('/beds?type=icu')
      ]);

      setEmergencyBeds(bedsData);

      const activeEmergencies = (admissionsData.data || []).filter(
        a => a.admissionType === 'EMERGENCY' && a.admissionStatus === 'ACTIVE'
      );
      setEmergencyAdmissions(activeEmergencies);

      if (icuBedsData && icuBedsData.length > 0) {
        const total = icuBedsData.length;
        const occupied = icuBedsData.filter(b => b.status === 'OCCUPIED').length;
        const rate = (occupied / total) * 100;
        setIcuStatus({ rate, occupied, total });
      }

      setErrorMsg('');
    } catch (error) {
      console.error('Failed to fetch emergency data:', error);
      setErrorMsg(error.message || 'Failed to load live emergency ward tracking data.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'AVAILABLE': '#22c55e',
      'OCCUPIED': '#ef4444',
      'RESERVED': '#f59e0b',
      'CLEANING': '#3b82f6',
      'MAINTENANCE': '#6b7280'
    };
    return colors[status] || '#9ca3af';
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading live emergency telemetry...</p>
      </div>
    );
  }

  return (
    <div className="emergency-page">
      <div className="page-header">
        <h2>🚨 Emergency Ward Tracking</h2>
        <span className="live-badge">● LIVE</span>
      </div>

      {errorMsg && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '10px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', opacity: 0.6 }}>×</button>
        </div>
      )}

      {}
      {icuStatus && icuStatus.rate >= 70 && (
        <div className="alert alert-error" style={{ background: icuStatus.rate >= 90 ? '#fef2f2' : '#fffbeb', borderColor: icuStatus.rate >= 90 ? '#fecaca' : '#fef3c7', color: icuStatus.rate >= 90 ? '#991b1b' : '#92400e', marginBottom: '20px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <strong style={{ fontSize: '14px' }}>{icuStatus.rate >= 90 ? '🚨 ICU CRITICAL OCCUPANCY ALERT' : '⚠️ HIGH ICU OCCUPANCY WARNING'}</strong>
          <span style={{ fontSize: '13px' }}>ICU Bed occupancy is at {icuStatus.rate.toFixed(0)}% ({icuStatus.occupied}/{icuStatus.total} ICU beds occupied). Priority transfers should be prepared.</span>
        </div>
      )}

      {}
      <div className="stats-grid">
        <div className="stat-card danger">
          <div className="stat-icon">🚨</div>
          <div className="stat-info">
            <h3>{emergencyAdmissions.length}</h3>
            <p>Active Emergency Cases</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">🛏️</div>
          <div className="stat-info">
            <h3>{emergencyBeds.filter(b => b.status === 'AVAILABLE').length}</h3>
            <p>Available Emergency Beds</p>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⏱️</div>
          <div className="stat-info">
            <h3>{emergencyAdmissions.filter(a => {
              const admitted = parseDate(a.admittedAt);
              const hours = (currentTime - admitted) / (1000 * 60 * 60);
              return hours < 1;
            }).length}</h3>
            <p>Last Hour Admissions</p>
          </div>
        </div>
      </div>

      {}
      <div className="card">
        <h3 className="card-title">Emergency Ward Beds</h3>
        {emergencyBeds.length === 0 ? (
          <p className="empty-state">No emergency beds configured in the ward.</p>
        ) : (
          <div className="emergency-bed-grid">
            {emergencyBeds.map(bed => (
              <div
                key={bed.bedId}
                className={`emergency-bed-card ${bed.status.toLowerCase()}`}
              >
                <div
                  className="bed-status-indicator"
                  style={{ background: getStatusColor(bed.status) }}
                ></div>
                <span className="bed-number">{bed.bedNumber}</span>
                <span className="bed-status">{bed.status}</span>
                {bed.patientName && (
                  <span className="bed-patient">{bed.patientName}</span>
                )}
                {bed.status === 'OCCUPIED' && (
                  <span className="urgency-badge">ACTIVE CASE</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {}
      <div className="card">
        <h3 className="card-title">Active Emergency Cases</h3>
        {emergencyAdmissions.length === 0 ? (
          <p className="empty-state">No active emergency cases currently admitted.</p>
        ) : (
          <div className="emergency-cases-table">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age/Gender</th>
                  <th>Bed</th>
                  <th>Doctor</th>
                  <th>Admitted At</th>
                  <th>Elapsed Duration</th>
                  <th>Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {emergencyAdmissions.map(em => {
                  const admitted = parseDate(em.admittedAt);
                  const diff = currentTime - admitted;
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                  return (
                    <tr key={em.admissionId} className={hours >= 6 ? 'overdue' : ''}>
                      <td><strong>{em.patientName}</strong></td>
                      <td>{em.age} / {em.gender}</td>
                      <td><span className="bed-badge">{em.bedNumber}</span></td>
                      <td>{em.doctorName || '—'}</td>
                      <td>{formatDateTimeIST(em.admittedAt)}</td>
                      <td>
                        <span className={`duration ${hours >= 6 ? 'warning' : ''}`}>
                          {hours}h {mins}m
                        </span>
                      </td>
                      <td>{em.diagnosis || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Emergency;