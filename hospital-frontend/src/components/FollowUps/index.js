import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, formatDateTimeIST } from '../../utils/api';
import './index.css';

const statusColors = {
  'Stable': '#2d6a4f',
  'Improving': '#457b9d',
  'Critical': '#e63946',
  'Under Observation': '#f4a261',
  'Recovered': '#1d7a74',
  'Referred': '#6b5b95'
};

const FollowUps = () => {
  const { user } = useAuth();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [status, setStatus] = useState('Stable');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/followups');
      setFollowups(data || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
      setError(err.message || 'Failed to load follow-up statuses.');
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (patient) => {
    setSelectedPatient(patient);
    setStatus(patient.status || 'Stable');
    setNotes(patient.notes || '');
    setError('');
    setMessage('');
    setDropdownOpen(false);
    setShowModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await api.post('/api/followups', {
        patient_id: selectedPatient.patientId,
        status,
        notes,
        updated_by: user?.name || 'Dr Prachi'
      });

      setMessage(`Follow-up status updated for ${selectedPatient.patientName}!`);
      setShowModal(false);
      fetchFollowups();

      const event = new CustomEvent('followup-updated');
      window.dispatchEvent(event);
    } catch (err) {
      setError(err.message || 'Failed to update follow-up status.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading follow-up statuses...</p>
      </div>
    );
  }

  return (
    <div className="followups-page">
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

      <div className="page-header">
        <h2>📋 Follow-up Status Directory</h2>
      </div>

      <div className="followups-table-wrapper">
        <table className="followups-table">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Current Status</th>
              <th>Last Updated</th>
              <th>Updated By</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {followups.map(patient => (
              <tr key={patient.patientId}>
                <td><strong>{patient.patientName}</strong></td>
                <td>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: `${statusColors[patient.status || 'Stable']}1a`,
                      color: statusColors[patient.status || 'Stable']
                    }}
                  >
                    {patient.status || 'Stable'}
                  </span>
                </td>
                <td>{formatDateTimeIST(patient.updatedAt)}</td>
                <td>{patient.updatedBy || '—'}</td>
                <td className="notes-cell">{patient.notes || '—'}</td>
                <td>
                  <button
                    className="btn-update"
                    onClick={() => openUpdateModal(patient)}
                    type="button"
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {}
        <div className="followups-cards">
          {followups.map(patient => (
            <div key={patient.patientId} className="followup-card">
              <div className="followup-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1d3557' }}>{patient.patientName}</h4>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: `${statusColors[patient.status || 'Stable']}1a`,
                    color: statusColors[patient.status || 'Stable']
                  }}
                >
                  {patient.status || 'Stable'}
                </span>
              </div>
              <p className="followup-notes" style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                {patient.notes || 'No recent notes.'}
              </p>
              <div className="followup-time" style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '12px' }}>
                <span>Last Updated: {formatDateTimeIST(patient.updatedAt)}</span>
                <span>By: {patient.updatedBy || '—'}</span>
              </div>
              <button
                className="btn-update"
                onClick={() => openUpdateModal(patient)}
                style={{ width: '100%', padding: '8px' }}
                type="button"
              >
                Update Status
              </button>
            </div>
          ))}
        </div>

        {followups.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No patients found</p>
          </div>
        )}
      </div>

      {showModal && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal followup-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Update Follow-up</h3>
            <p className="modal-subtitle">Patient: <strong>{selectedPatient.patientName}</strong></p>

            <form onSubmit={handleUpdateSubmit}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Status *</label>

                {}
                <div className="custom-dropdown-container">
                  <div
                    className="dropdown-trigger"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span className="status-dot" style={{ backgroundColor: statusColors[status] }}></span>
                    {status}
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#64748b' }}>▼</span>
                  </div>

                  {dropdownOpen && (
                    <div
                      className="dropdown-options-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        marginTop: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}
                    >
                      {Object.keys(statusColors).map(opt => (
                        <div
                          key={opt}
                          className="dropdown-option-item"
                          onClick={() => { setStatus(opt); setDropdownOpen(false); }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            borderBottom: '1px solid #f1f5f9'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#f8fafc'}
                          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <span className="status-dot" style={{ backgroundColor: statusColors[opt] }}></span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Notes / Recovery Progress</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter patient recovery observations..."
                  rows={4}
                  maxLength={500}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  {notes.length} / 500 characters
                </div>
              </div>

              <div className="form-group">
                <label>Updated By</label>
                <input
                  type="text"
                  value={user?.name || 'Dr Prachi'}
                  readOnly
                  style={{ background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#2d6a4f' }} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUps;
