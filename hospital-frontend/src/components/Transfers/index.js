import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../../utils/api';
import './index.css';

const Transfers = () => {
  const { isDoctor, isAdmin } = useAuth();

  const [admissions, setAdmissions] = useState([]);
  const [beds, setBeds] = useState([]);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      setMessage('');
      try {
        await Promise.all([fetchActiveAdmissions(), fetchAvailableBeds()]);
      } catch (err) {
        setError('Failed to load transfers configuration.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchActiveAdmissions = async () => {
    try {
      const data = await api.get('/admissions?status=ACTIVE');
      setAdmissions(data.data || []);
    } catch (error) {
      console.error('Failed to fetch admissions:', error);
    }
  };

  const fetchAvailableBeds = async () => {
    try {
      const data = await api.get('/beds?status=AVAILABLE');
      setBeds(data);
    } catch (error) {
      console.error('Failed to fetch beds:', error);
    }
  };

  const validateTransferForm = () => {
    const errors = {};
    if (!selectedAdmission) errors.selectedAdmission = 'Please select an active admission';
    if (!targetBedId) errors.targetBedId = 'Target bed is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!isDoctor() && !isAdmin()) return;
    if (!validateTransferForm()) return;

    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await api.post('/transfers', {
        admissionId: selectedAdmission.admissionId,
        toBedId: parseInt(targetBedId),
        transferReason
      });

      setMessage('Transfer completed successfully!');
      setSelectedAdmission(null);
      setTargetBedId('');
      setTransferReason('');
      await Promise.all([fetchActiveAdmissions(), fetchAvailableBeds()]);
    } catch (error) {
      setError(error.message || 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isDoctor() && !isAdmin()) {
    return (
      <div className="access-denied" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="card" style={{ background: 'white', borderRadius: '14px', padding: '40px 20px', border: '1px solid #e2e8f0', display: 'inline-block', maxWidth: '400px' }}>
          <h2>🔒 Access Denied</h2>
          <p style={{ color: '#64748b', marginTop: '8px' }}>You do not have permission to view transfers page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading transfer screen...</p>
      </div>
    );
  }

  return (
    <div className="transfers-page">
      <div className="page-header">
        <h2>🔄 Patient Transfers</h2>
      </div>

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

      <div className="transfer-layout">
        {/* Active Admissions List */}
        <div className="card transfer-card">
          <h3 className="card-title">Active Admissions</h3>
          <div className="admission-list" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {admissions.map(admission => (
              <div 
                key={admission.admissionId}
                className={`admission-select ${selectedAdmission?.admissionId === admission.admissionId ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedAdmission(admission);
                  setTargetBedId('');
                  setFormErrors({});
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: selectedAdmission?.admissionId === admission.admissionId ? '#e6f4f2' : 'white',
                  borderColor: selectedAdmission?.admissionId === admission.admissionId ? '#0f766e' : '#e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div className="admission-info" style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{admission.patientName}</strong>
                  <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Bed {admission.bedNumber} • {admission.wardName}</span>
                </div>
                <span className="select-indicator" style={{ color: '#0f766e', fontWeight: 'bold', fontSize: '16px' }}>
                  {selectedAdmission?.admissionId === admission.admissionId ? '✓' : ''}
                </span>
              </div>
            ))}
            {admissions.length === 0 && (
              <div className="empty-state" style={{ padding: '40px 10px', textAlign: 'center', color: '#94a3b8' }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>👥</span>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No active admissions found</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>There are no patients currently admitted in the hospital.</p>
              </div>
            )}
          </div>
        </div>

        {/* Transfer Form */}
        <div className="card transfer-card">
          <h3 className="card-title">Transfer Details</h3>
          
          {selectedAdmission ? (
            <form onSubmit={handleTransfer}>
              <div className="selected-patient" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Selected Patient</label>
                <div className="patient-chip" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '10px' }}>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '15px' }}>{selectedAdmission.patientName}</strong>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '12px', marginTop: '2px' }}>Current: Bed {selectedAdmission.bedNumber} ({selectedAdmission.wardName})</span>
                </div>
              </div>

              <div className="form-group">
                <label>Target Bed *</label>
                <select 
                  value={targetBedId} 
                  onChange={(e) => {
                    setTargetBedId(e.target.value);
                    if (formErrors.targetBedId) setFormErrors({ ...formErrors, targetBedId: '' });
                  }}
                  className={formErrors.targetBedId ? 'input-error' : ''}
                >
                  <option value="">Select available bed</option>
                  {beds.map(bed => (
                    <option key={bed.bedId} value={bed.bedId}>
                      {bed.bedNumber} — {bed.wardName} ({bed.wardType.toUpperCase()})
                    </option>
                  ))}
                </select>
                {formErrors.targetBedId && (
                  <span className="error-text" style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    {formErrors.targetBedId}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Transfer Reason</label>
                <textarea 
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Enter medical reason for transferring the patient..."
                  rows={3}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '10px' }} disabled={submitting}>
                {submitting ? 'Completing Transfer...' : 'Complete Transfer'}
              </button>
            </form>
          ) : (
            <div className="empty-state-box" style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #cbd5e1', borderRadius: '12px', color: '#94a3b8' }}>
              <span className="empty-icon" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>👆</span>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>Select a patient from the list to initiate transfer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transfers;