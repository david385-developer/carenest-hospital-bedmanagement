import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, formatDateTimeIST } from '../../utils/api';
import './index.css';

const Admissions = () => {
  const { isReception } = useAuth();

  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmissionId, setSelectedAdmissionId] = useState(null);
  const [dischargeForm, setDischargeForm] = useState({
    dischargeType: 'NORMAL',
    finalDiagnosis: '',
    dischargeNotes: ''
  });
  const [dischargeErrors, setDischargeErrors] = useState({});
  const [discharging, setDischarging] = useState(false);

  useEffect(() => {
    fetchAdmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      let url = '/admissions';
      if (filterStatus) url += `?status=${filterStatus}`;
      const data = await api.get(url);
      setAdmissions(data.data || []);
    } catch (error) {
      console.error('Failed to fetch admissions:', error);
      setError(error.message || 'Failed to fetch admissions.');
    } finally {
      setLoading(false);
    }
  };

  const openDischargeModal = (admissionId) => {
    setSelectedAdmissionId(admissionId);
    setDischargeForm({
      dischargeType: 'NORMAL',
      finalDiagnosis: '',
      dischargeNotes: ''
    });
    setDischargeErrors({});
    setShowDischargeModal(true);
  };

  const validateDischarge = () => {
    const errors = {};
    if (!dischargeForm.finalDiagnosis.trim()) {
      errors.finalDiagnosis = 'Final diagnosis is required';
    }
    setDischargeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (isReception()) return;
    if (!validateDischarge()) return;

    setError('');
    setMessage('');
    setDischarging(true);

    try {
      await api.put(`/admissions/${selectedAdmissionId}/discharge`, {
        dischargeType: dischargeForm.dischargeType,
        finalDiagnosis: dischargeForm.finalDiagnosis,
        dischargeNotes: dischargeForm.dischargeNotes
      });
      setMessage('Patient successfully discharged! Bed is marked for cleaning.');
      setShowDischargeModal(false);
      fetchAdmissions();
    } catch (error) {
      setError(error.message || 'Failed to discharge patient.');
    } finally {
      setDischarging(false);
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      'ACTIVE': 'badge-active',
      'DISCHARGED': 'badge-discharged',
      'TRANSFERRED': 'badge-transferred'
    };
    return classes[status] || 'badge-default';
  };

  const canDischarge = !isReception();

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading admissions...</p>
      </div>
    );
  }

  return (
    <div className="admissions-page">
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
        <h2>📝 Admissions</h2>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DISCHARGED">Discharged</option>
          <option value="TRANSFERRED">Transferred</option>
        </select>
      </div>

      <div className="admissions-table-wrapper">
        <table className="admissions-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Age/Gender</th>
              <th>Bed</th>
              <th>Ward</th>
              <th>Doctor</th>
              <th>Type</th>
              <th>Status</th>
              <th>Admitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admissions.map(admission => (
              <tr key={admission.admissionId}>
                <td><span className="id-badge">#{admission.admissionId}</span></td>
                <td><strong>{admission.patientName}</strong></td>
                <td>{admission.age} / {admission.gender}</td>
                <td><span className="bed-badge">{admission.bedNumber}</span></td>
                <td>{admission.wardName}</td>
                <td>{admission.doctorName || '—'}</td>
                <td>
                  <span className={`type-badge ${admission.admissionType.toLowerCase()}`}>
                    {admission.admissionType}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadge(admission.admissionStatus)}`}>
                    {admission.admissionStatus}
                  </span>
                </td>
                <td className="date-cell">
                  <div><strong>In:</strong> {formatDateTimeIST(admission.admittedAt)}</div>
                  {admission.admissionStatus === 'DISCHARGED' && admission.dischargeDate && (
                    <div style={{ marginTop: '4px', color: '#dc2626', fontSize: '11px', fontWeight: '600' }}>
                      <strong>Out:</strong> {formatDateTimeIST(admission.dischargeDate)}
                    </div>
                  )}
                </td>
                <td>
                  {admission.admissionStatus === 'ACTIVE' && canDischarge && (
                    <button
                      className="discharge-btn"
                      onClick={() => openDischargeModal(admission.admissionId)}
                      type="button"
                    >
                      Discharge
                    </button>
                  )}
                  {admission.admissionStatus === 'ACTIVE' && !canDischarge && (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>View Only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="admissions-cards-mobile">
          {admissions.map(admission => (
            <div key={admission.admissionId} className="admission-card">
              <span className="id-badge">#{admission.admissionId}</span>
              <div className="card-header-info">
                <h3>{admission.patientName}</h3>
                <div className="patient-subtitle">{admission.age} / {admission.gender}</div>
              </div>

              <div className="card-details-grid">
                <div><strong>Bed:</strong> <span className="bed-badge">{admission.bedNumber}</span></div>
                <div><strong>Ward:</strong> {admission.wardName}</div>
                <div><strong>Doctor:</strong> {admission.doctorName || '—'}</div>
                <div>
                  <strong>Type:</strong>{' '}
                  <span className={`type-badge ${admission.admissionType.toLowerCase()}`}>
                    {admission.admissionType}
                  </span>
                </div>
                <div className="full-width">
                  <strong>Status:</strong>{' '}
                  <span className={`status-badge ${getStatusBadge(admission.admissionStatus)}`}>
                    {admission.admissionStatus}
                  </span>
                </div>
                <div className="full-width date-cell">
                  <div><strong>In:</strong> {formatDateTimeIST(admission.admittedAt)}</div>
                  {admission.admissionStatus === 'DISCHARGED' && admission.dischargeDate && (
                    <div style={{ marginTop: '2px', color: '#dc2626', fontSize: '11px', fontWeight: '600' }}>
                      <strong>Out:</strong> {formatDateTimeIST(admission.dischargeDate)}
                    </div>
                  )}
                </div>
              </div>

              <div className="card-actions">
                {admission.admissionStatus === 'ACTIVE' && canDischarge && (
                  <button
                    className="discharge-btn"
                    onClick={() => openDischargeModal(admission.admissionId)}
                    type="button"
                  >
                    Discharge
                  </button>
                )}
                {admission.admissionStatus === 'ACTIVE' && !canDischarge && (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', display: 'block', textAlign: 'center' }}>View Only</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {admissions.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📝</span>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No admissions found</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#cbd5e1' }}>There are no active or historical admissions recorded.</p>
          </div>
        )}
      </div>

      {showDischargeModal && (
        <div className="modal-overlay" onClick={() => setShowDischargeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Patient Discharge</h3>
            <p className="modal-subtitle">Record final medical diagnosis and discharge options</p>

            <form onSubmit={handleDischargeSubmit}>
              <div className="form-group">
                <label>Discharge Type *</label>
                <select
                  value={dischargeForm.dischargeType}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeType: e.target.value })}
                >
                  <option value="NORMAL">Normal Discharge</option>
                  <option value="AGAINST_ADVICE">Against Medical Advice</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="TRANSFERRED">Transferred to other facility</option>
                </select>
              </div>

              <div className="form-group">
                <label>Final Diagnosis *</label>
                <input
                  type="text"
                  value={dischargeForm.finalDiagnosis}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, finalDiagnosis: e.target.value })}
                  placeholder="Enter final medical diagnosis"
                  className={dischargeErrors.finalDiagnosis ? 'input-error' : ''}
                />
                {dischargeErrors.finalDiagnosis && (
                  <span className="error-text" style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                    {dischargeErrors.finalDiagnosis}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Discharge Notes / Summary</label>
                <textarea
                  value={dischargeForm.dischargeNotes}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeNotes: e.target.value })}
                  placeholder="Enter summaries, recommendations, prescriptions..."
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDischargeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={discharging}>
                  {discharging ? 'Discharging...' : 'Discharge Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admissions;