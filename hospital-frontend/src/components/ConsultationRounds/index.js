import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, formatDateTimeIST } from '../../utils/api';
import './index.css';

const ConsultationRounds = () => {
  const { user } = useAuth();
  const [view, setView] = useState('today'); // 'today' | 'history'
  const [rounds, setRounds] = useState([]);
  const [historyRounds, setHistoryRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Calendar filter default to current YYYY-MM
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });

  // Quick Round Modal State
  const [showQuickRoundModal, setShowQuickRoundModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  
  // Vitals & Findings Form State
  const [vitalsBp, setVitalsBp] = useState('120/80');
  const [vitalsTemp, setVitalsTemp] = useState('');
  const [vitalsPulse, setVitalsPulse] = useState('');
  const [vitalsSpo2, setVitalsSpo2] = useState('');
  const [findings, setFindings] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [nextRound, setNextRound] = useState('');
  const [submittingRound, setSubmittingRound] = useState(false);

  // Expander for vitals in history cards
  const [expandedRoundId, setExpandedRoundId] = useState(null);

  useEffect(() => {
    if (view === 'today') {
      fetchTodayRounds();
    } else {
      fetchHistoryRounds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, monthFilter]);

  const fetchTodayRounds = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/rounds/today');
      setRounds(data || []);
    } catch (err) {
      console.error('Failed to load today rounds:', err);
      setError(err.message || 'Failed to load today\'s scheduled rounds.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryRounds = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/rounds');
      // Filter rounds by month (e.g. date starts with Selected Month)
      const filtered = (data || []).filter(r => {
        if (!r.created_at) return false;
        // r.created_at starts with YYYY-MM
        return r.created_at.startsWith(monthFilter);
      });
      setHistoryRounds(filtered);
    } catch (err) {
      console.error('Failed to load rounds history:', err);
      setError(err.message || 'Failed to load rounds history.');
    } finally {
      setLoading(false);
    }
  };

  const openQuickRoundModal = (patient) => {
    setSelectedPatientId(patient.patient_id);
    setSelectedPatientName(patient.patientName);
    
    // Auto-populate from previous values if available
    setVitalsBp(patient.vitals_bp || '120/80');
    setVitalsTemp(patient.vitals_temp !== null && patient.vitals_temp !== undefined ? String(patient.vitals_temp) : '');
    setVitalsPulse(patient.vitals_pulse !== null && patient.vitals_pulse !== undefined ? String(patient.vitals_pulse) : '');
    setVitalsSpo2(patient.vitals_spo2 !== null && patient.vitals_spo2 !== undefined ? String(patient.vitals_spo2) : '');
    
    setFindings('');
    setTreatmentPlan('');
    
    // Default next_round to tomorrow at current hour
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    setNextRound(`${yyyy}-${mm}-${dd}T${hh}:00`);

    setError('');
    setMessage('');
    setShowQuickRoundModal(true);
  };

  const handleQuickRoundSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !findings.trim()) return;

    setError('');
    setMessage('');
    setSubmittingRound(true);

    try {
      // Re-format next_round local date string 'YYYY-MM-DDTHH:MM' to SQL format 'YYYY-MM-DD HH:MM'
      const formattedNextRound = nextRound ? nextRound.replace('T', ' ') : null;

      await api.post('/api/rounds', {
        patient_id: selectedPatientId,
        vitals_bp: vitalsBp,
        vitals_temp: vitalsTemp ? parseFloat(vitalsTemp) : null,
        vitals_pulse: vitalsPulse ? parseInt(vitalsPulse, 10) : null,
        vitals_spo2: vitalsSpo2 ? parseInt(vitalsSpo2, 10) : null,
        findings,
        treatment_plan: treatmentPlan,
        next_round: formattedNextRound,
        doctor_id: user?.name || 'Dr Prachi'
      });

      setMessage(`Consultation round logged for ${selectedPatientName}!`);
      setShowQuickRoundModal(false);
      
      // Refresh list
      if (view === 'today') {
        fetchTodayRounds();
      } else {
        fetchHistoryRounds();
      }

      // Trigger sidebar badge counts reload
      window.dispatchEvent(new CustomEvent('followup-updated'));
    } catch (err) {
      setError(err.message || 'Failed to save round details.');
    } finally {
      setSubmittingRound(false);
    }
  };

  const handleReschedule = async (roundId) => {
    try {
      await api.put(`/api/rounds/${roundId}/status`, { status: 'Rescheduled' });
      setMessage('Round rescheduled successfully.');
      fetchTodayRounds();
      window.dispatchEvent(new CustomEvent('followup-updated'));
    } catch (err) {
      setError(err.message || 'Failed to reschedule round.');
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      'Completed': 'badge-completed',
      'Pending': 'badge-pending',
      'Rescheduled': 'badge-rescheduled'
    };
    return classes[status] || 'badge-default';
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading consultation rounds...</p>
      </div>
    );
  }

  const pendingRounds = rounds.filter(r => r.status === 'Pending');
  const completedRounds = rounds.filter(r => r.status === 'Completed');

  return (
    <div className="rounds-page">
      {message && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '10px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
          <span>✅ {message}</span>
          <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', opacity: 0.6 }} type="button">×</button>
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '10px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', opacity: 0.6 }} type="button">×</button>
        </div>
      )}

      <div className="page-header-tabs" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="tabs-navigation" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`tab-btn ${view === 'today' ? 'active' : ''}`}
            onClick={() => setView('today')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: '600',
              color: view === 'today' ? '#6b5b95' : '#64748b',
              borderBottom: view === 'today' ? '3px solid #6b5b95' : '3px solid transparent',
              cursor: 'pointer'
            }}
            type="button"
          >
            📋 Today's Rounds
          </button>
          <button 
            className={`tab-btn ${view === 'history' ? 'active' : ''}`}
            onClick={() => setView('history')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: '600',
              color: view === 'history' ? '#6b5b95' : '#64748b',
              borderBottom: view === 'history' ? '3px solid #6b5b95' : '3px solid transparent',
              cursor: 'pointer'
            }}
            type="button"
          >
            📅 Round History
          </button>
        </div>

        {view === 'history' && (
          <div className="filter-area" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Select Month:</span>
            <input 
              type="month" 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#475569',
                background: '#f8fafc'
              }}
            />
          </div>
        )}
      </div>

      {view === 'today' ? (
        <div className="today-rounds-section">
          <div className="today-header" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1d3557', margin: '0 0 4px 0' }}>Today's Scheduled Visits</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              Summary: <span style={{ color: '#f4a261', fontWeight: '700' }}>{pendingRounds.length} pending</span>, <span style={{ color: '#2d6a4f', fontWeight: '700' }}>{completedRounds.length} completed</span>
            </p>
          </div>

          <div className="rounds-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {rounds.map(round => (
              <div key={round.id} className="round-scheduled-card" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1d3557' }}>{round.patientName}</h4>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Bed: <span className="bed-badge">{round.bedNumber || '—'}</span> ({round.wardName || '—'})</div>
                  </div>
                  <span className={`status-badge ${getStatusClass(round.status)}`}>
                    {round.status}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Scheduled Time:</strong> {round.next_round ? formatDateTimeIST(round.next_round) : '—'}</div>
                  {round.findings && <div><strong>Prev Findings:</strong> <span style={{ color: '#64748b', fontStyle: 'italic' }}>{round.findings}</span></div>}
                </div>

                {round.status === 'Pending' && (
                  <div className="card-actions" style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: 'auto' }}>
                    <button 
                      onClick={() => openQuickRoundModal(round)}
                      className="btn-primary" 
                      style={{ flex: 1, backgroundColor: '#2d6a4f', padding: '8px' }}
                      type="button"
                    >
                      Quick Round
                    </button>
                    <button 
                      onClick={() => handleReschedule(round.id)}
                      className="btn-secondary" 
                      style={{ flex: 1, padding: '8px' }}
                      type="button"
                    >
                      Reschedule
                    </button>
                  </div>
                )}
              </div>
            ))}

            {rounds.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1/-1', padding: '60px 20px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🩺</span>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No rounds scheduled for today</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="history-rounds-section">
          <div className="rounds-table-wrapper" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table className="rounds-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: '600' }}>Patient</th>
                  <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: '600' }}>Vitals Summary</th>
                  <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: '600' }}>Findings</th>
                  <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: '600' }}>Next Round</th>
                  <th style={{ padding: '14px 18px', color: '#64748b', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyRounds.map(round => (
                  <tr key={round.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 18px' }}>{formatDateTimeIST(round.created_at)}</td>
                    <td style={{ padding: '14px 18px' }}><strong>{round.patientName}</strong></td>
                    <td style={{ padding: '14px 18px' }}>
                      {round.vitals_bp || round.vitals_temp || round.vitals_pulse || round.vitals_spo2 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', fontSize: '11px', color: '#64748b' }}>
                          {round.vitals_bp && <span>BP: {round.vitals_bp}</span>}
                          {round.vitals_temp && <span>T: {round.vitals_temp}°C</span>}
                          {round.vitals_pulse && <span>P: {round.vitals_pulse}bpm</span>}
                          {round.vitals_spo2 && <span>SpO2: {round.vitals_spo2}%</span>}
                        </div>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>{round.findings}</td>
                    <td style={{ padding: '14px 18px' }}>{round.next_round ? formatDateTimeIST(round.next_round) : '—'}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className={`status-badge ${getStatusClass(round.status)}`}>
                        {round.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards for History */}
            <div className="rounds-cards">
              {historyRounds.map(round => (
                <div key={round.id} className="round-card" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1d3557' }}>{round.patientName}</h4>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDateTimeIST(round.created_at)}</span>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Findings:</strong> {round.findings}</div>
                    {round.next_round && <div><strong>Next Scheduled:</strong> {formatDateTimeIST(round.next_round)}</div>}
                    <div>
                      <strong>Status:</strong>{' '}
                      <span className={`status-badge ${getStatusClass(round.status)}`}>
                        {round.status}
                      </span>
                    </div>
                  </div>

                  {(round.vitals_bp || round.vitals_temp || round.vitals_pulse || round.vitals_spo2) && (
                    <div>
                      <button 
                        onClick={() => setExpandedRoundId(expandedRoundId === round.id ? null : round.id)}
                        style={{ background: 'none', border: 'none', color: '#457b9d', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                        type="button"
                      >
                        {expandedRoundId === round.id ? 'Hide Vitals ▲' : 'Show Vitals ▼'}
                      </button>

                      {expandedRoundId === round.id && (
                        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', marginTop: '6px', fontSize: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px 12px', border: '1px solid #f1f5f9' }}>
                          {round.vitals_bp && <div>BP: {round.vitals_bp}</div>}
                          {round.vitals_temp && <div>Temp: {round.vitals_temp} °C</div>}
                          {round.vitals_pulse && <div>Pulse: {round.vitals_pulse} bpm</div>}
                          {round.vitals_spo2 && <div>SpO2: {round.vitals_spo2} %</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {historyRounds.length === 0 && (
              <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📅</span>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No history records for this month</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Round Form Modal */}
      {showQuickRoundModal && (
        <div className="modal-overlay" onClick={() => setShowQuickRoundModal(false)}>
          <div className="modal quick-round-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Quick Round</h3>
            <p className="modal-subtitle">Logged-in Doctor: <strong>{user?.name || 'Dr Prachi'}</strong> • Patient: <strong>{selectedPatientName}</strong></p>

            <form onSubmit={handleQuickRoundSubmit}>
              {/* Vitals Section - 2 columns on desktop, stacked on mobile */}
              <div className="vitals-grid">
                <div className="form-group">
                  <label>BP (Blood Pressure)</label>
                  <input
                    type="text"
                    value={vitalsBp}
                    onChange={(e) => setVitalsBp(e.target.value)}
                    placeholder="120/80"
                  />
                </div>

                <div className="form-group">
                  <label>Temperature</label>
                  <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', background: '#f8fafc' }}>
                    <input 
                      type="number" 
                      step="0.1"
                      value={vitalsTemp}
                      onChange={(e) => setVitalsTemp(e.target.value)}
                      placeholder="37.0"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', borderLeft: '1px solid #cbd5e1', fontWeight: '500', minWidth: '36px', justifyContent: 'center' }}>°C</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Pulse Rate</label>
                  <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', background: '#f8fafc' }}>
                    <input 
                      type="number" 
                      value={vitalsPulse}
                      onChange={(e) => setVitalsPulse(e.target.value)}
                      placeholder="72"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', borderLeft: '1px solid #cbd5e1', fontWeight: '500', minWidth: '48px', justifyContent: 'center' }}>bpm</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>SpO2 (Oxygen Saturation)</label>
                  <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', background: '#f8fafc' }}>
                    <input 
                      type="number" 
                      value={vitalsSpo2}
                      onChange={(e) => setVitalsSpo2(e.target.value)}
                      placeholder="98"
                      style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', borderLeft: '1px solid #cbd5e1', fontWeight: '500', minWidth: '32px', justifyContent: 'center' }}>%</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Clinical Findings *</label>
                <textarea
                  required
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Physical assessment details, heart/lung sounds, behavior..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Treatment Plan</label>
                <textarea
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="Medication adjustments, labs ordered, physical therapy plan..."
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>Next Round Schedule</label>
                <input
                  type="datetime-local"
                  value={nextRound}
                  onChange={(e) => setNextRound(e.target.value)}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowQuickRoundModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#2d6a4f' }} disabled={submittingRound}>
                  {submittingRound ? 'Saving...' : 'Complete Round'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationRounds;
