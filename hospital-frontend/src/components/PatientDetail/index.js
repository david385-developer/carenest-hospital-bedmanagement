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

const PatientDetail = ({ patientId, onBack }) => {
  const { user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [diagnoses, setDiagnoses] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showDiagModal, setShowDiagModal] = useState(false);
  const [primaryDiag, setPrimaryDiag] = useState('');
  const [secondaryCond, setSecondaryCond] = useState('');
  const [symptomInput, setSymptomInput] = useState('');
  const [symptomsList, setSymptomsList] = useState([]);
  const [icd10Code, setIcd10Code] = useState('');
  const [diagNotes, setDiagNotes] = useState('');
  const [diagSubmitting, setDiagSubmitting] = useState(false);

  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [followupStatus, setFollowupStatus] = useState('Stable');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupSubmitting, setFollowupSubmitting] = useState(false);
  const [followupDropdownOpen, setFollowupDropdownOpen] = useState(false);

  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeType, setDischargeType] = useState('NORMAL');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [dischargeSubmitting, setDischargeSubmitting] = useState(false);

  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [expandedRoundId, setExpandedRoundId] = useState(null);

  useEffect(() => {
    if (patientId) {
      loadAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {

      const detail = await api.get(`/api/patients/${patientId}/detail`);
      setPatient(detail);

      const diagData = await api.get(`/api/diagnosis/${patientId}`);
      setDiagnoses(diagData || []);

      const roundsData = await api.get(`/api/rounds/patient/${patientId}`);
      setRounds(roundsData || []);

      const followData = await api.get(`/api/followups/${patientId}`);
      setFollowups(followData || []);

    } catch (err) {
      console.error('Failed to load patient detail data:', err);
      setError(err.message || 'Failed to load patient records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomInputChange = (e) => {
    const value = e.target.value;
    if (value.includes(',')) {
      const parts = value.split(',');
      const newSymptoms = parts
        .slice(0, -1)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !symptomsList.includes(s));

      if (symptomsList.length + newSymptoms.length <= 10) {
        setSymptomsList([...symptomsList, ...newSymptoms]);
      }
      setSymptomInput(parts[parts.length - 1]);
    } else {
      setSymptomInput(value);
    }
  };

  const handleSymptomKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = symptomInput.trim();
      if (val && !symptomsList.includes(val) && symptomsList.length < 10) {
        setSymptomsList([...symptomsList, val]);
        setSymptomInput('');
      }
    }
  };

  const removeSymptom = (indexToRemove) => {
    setSymptomsList(symptomsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDiagSubmit = async (e) => {
    e.preventDefault();
    if (!primaryDiag.trim()) return;

    setError('');
    setMessage('');
    setDiagSubmitting(true);

    try {
      await api.post('/api/diagnosis', {
        patient_id: patientId,
        primary_diagnosis: primaryDiag,
        secondary_conditions: secondaryCond,
        symptoms: symptomsList.join(', '),
        icd10_code: icd10Code,
        notes: diagNotes,
        diagnosed_by: user?.name || 'Dr Prachi'
      });
      setMessage('Diagnosis saved successfully!');
      setShowDiagModal(false);

      setPrimaryDiag('');
      setSecondaryCond('');
      setSymptomsList([]);
      setSymptomInput('');
      setIcd10Code('');
      setDiagNotes('');

      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to save diagnosis.');
    } finally {
      setDiagSubmitting(false);
    }
  };

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setFollowupSubmitting(true);

    try {
      await api.post('/api/followups', {
        patient_id: patientId,
        status: followupStatus,
        notes: followupNotes,
        updated_by: user?.name || 'Dr Prachi'
      });
      setMessage('Follow-up status updated successfully!');
      setShowFollowupModal(false);
      setFollowupNotes('');
      loadAllData();

      window.dispatchEvent(new CustomEvent('followup-updated'));
    } catch (err) {
      setError(err.message || 'Failed to update follow-up.');
    } finally {
      setFollowupSubmitting(false);
    }
  };

  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!finalDiagnosis.trim()) return;

    setError('');
    setMessage('');
    setDischargeSubmitting(true);

    try {
      await api.put(`/admissions/${patient.admissionId}/discharge`, {
        dischargeType,
        finalDiagnosis,
        dischargeNotes
      });
      setMessage('Patient successfully discharged! Bed is marked for cleaning.');
      setShowDischargeModal(false);
      loadAllData();
    } catch (err) {
      setError(err.message || 'Failed to discharge patient.');
    } finally {
      setDischargeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading patient records...</p>
      </div>
    );
  }

  const currentDiag = diagnoses[0];
  const historyDiags = diagnoses.slice(1);
  const latestFollowup = followups[0];

  return (
    <div className="patient-detail-page">
      <div style={{ marginBottom: '20px' }}>
        <button onClick={onBack} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} type="button">
          ← Back to Patients Directory
        </button>
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

      {patient && (
        <div className="patient-detail-grid">
          {}
          <div className="card info-card" style={{ borderLeft: '4px solid #1d3557' }}>
            <div className="info-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div className="avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0f766e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                {patient.patientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#1d3557' }}>{patient.patientName}</h3>
                <span style={{ fontSize: '13px', color: '#6c757d' }}>Patient ID: #{patient.patientId}</span>
              </div>
            </div>

            <div className="info-details-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 24px', fontSize: '13px', color: '#475569' }}>
              <div><strong>Age / Gender:</strong> {patient.age} years • {patient.gender}</div>
              <div><strong>Phone Number:</strong> {patient.contact}</div>
              <div><strong>Status:</strong> <span className={`status-pill ${patient.status?.toLowerCase() || 'discharged'}`} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: '700' }}>{patient.status || 'Discharged'}</span></div>
              {patient.bed_number ? (
                <>
                  <div><strong>Bed:</strong> <span className="bed-badge">{patient.bed_number}</span></div>
                  <div><strong>Ward Name:</strong> {patient.ward_type} Ward</div>
                  <div><strong>Admission Date:</strong> {formatDateTimeIST(patient.admission_date)}</div>
                </>
              ) : (
                <div style={{ gridColumn: '1/-1', color: '#dc2626', fontWeight: '500' }}>Patient is currently discharged (no active bed assignment).</div>
              )}
            </div>
          </div>

          {}
          <div className="card diagnosis-card" style={{ borderLeft: '4px solid #457b9d' }}>
            <h3 className="card-title">🩺 Current Diagnosis</h3>
            {currentDiag ? (
              <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Primary Diagnosis:</strong> <span style={{ fontSize: '15px', color: '#1d3557', fontWeight: '600' }}>{currentDiag.primary_diagnosis}</span></div>
                {currentDiag.secondary_conditions && <div><strong>Secondary Conditions:</strong> {currentDiag.secondary_conditions}</div>}
                {currentDiag.icd10_code && <div><strong>ICD-10 Code:</strong> <span className="bed-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{currentDiag.icd10_code}</span></div>}

                {currentDiag.symptoms && (
                  <div style={{ marginTop: '4px' }}>
                    <strong>Symptoms:</strong>
                    <div className="ssymptoms-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {currentDiag.symptoms.split(',').map((sym, idx) => (
                        <span key={idx} className="symptom-pill" style={{ background: '#e2e8f0', color: '#1d3557', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500' }}>
                          {sym.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {currentDiag.notes && <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginTop: '4px', borderLeft: '3px solid #cbd5e1' }}><strong>Notes:</strong> {currentDiag.notes}</div>}
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>Diagnosed by {currentDiag.diagnosed_by} on {formatDateTimeIST(currentDiag.created_at)}</div>
              </div>
            ) : (
              <p className="empty-text" style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0, fontSize: '13px' }}>No diagnosis history recorded.</p>
            )}
          </div>

          {}
          <div className="card followup-card" style={{ borderLeft: '4px solid #2d6a4f' }}>
            <h3 className="card-title">📋 Follow-up Status</h3>
            {latestFollowup ? (
              <div style={{ fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong>Current Status:</strong>
                  <span className="status-badge" style={{ backgroundColor: `${statusColors[latestFollowup.status]}1a`, color: statusColors[latestFollowup.status] }}>
                    {latestFollowup.status}
                  </span>
                </div>
                {latestFollowup.notes && <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #c2e0d3' }}><strong>Progress Notes:</strong> {latestFollowup.notes}</div>}
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Updated by {latestFollowup.updated_by} on {formatDateTimeIST(latestFollowup.updated_at)}</div>
              </div>
            ) : (
              <p className="empty-text" style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0, fontSize: '13px' }}>No follow-up records. Defaulting to Stable.</p>
            )}
          </div>

          {}
          {historyDiags.length > 0 && (
            <div className="card history-card" style={{ paddingBottom: '16px' }}>
              <div
                className="section-collapsible-header"
                onClick={() => setHistoryCollapsed(!historyCollapsed)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <h3 className="card-title" style={{ margin: 0 }}>📜 Diagnosis History ({historyDiags.length})</h3>
                <span style={{ fontSize: '12px', color: '#0f766e', fontWeight: 'bold' }}>{historyCollapsed ? 'Show History ▼' : 'Hide History ▲'}</span>
              </div>

              {!historyCollapsed && (
                <div className="collapsible-content" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {historyDiags.map(diag => (
                    <div key={diag.id} className="history-diag-item" style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', opacity: 0.85 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                        <span>{diag.primary_diagnosis}</span>
                        <span style={{ color: '#94a3b8' }}>{formatDateTimeIST(diag.created_at)}</span>
                      </div>
                      {diag.icd10_code && <div style={{ fontSize: '11px', color: '#64748b' }}>ICD-10: {diag.icd10_code}</div>}
                      {diag.notes && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Notes: {diag.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {}
          <div className="card rounds-card">
            <h3 className="card-title">🩺 Consultation Rounds History ({rounds.length})</h3>
            {rounds.length === 0 ? (
              <p className="empty-text" style={{ fontStyle: 'italic', color: '#94a3b8', margin: 0, fontSize: '13px' }}>No consultation rounds recorded for this patient.</p>
            ) : (
              <div className="rounds-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rounds.map(round => (
                  <div key={round.id} className="timeline-item" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div className="round-header-flex" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`status-badge ${round.status.toLowerCase()}`} style={{ background: round.status === 'Completed' ? '#dcfce7' : round.status === 'Pending' ? '#fffbeb' : '#dbeafe', color: round.status === 'Completed' ? '#166534' : round.status === 'Pending' ? '#78350f' : '#1e40af', padding: '2px 8px', fontSize: '10px', borderRadius: '12px', fontWeight: '700' }}>
                        {round.status}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDateTimeIST(round.created_at)}</span>
                    </div>

                    <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#1d3557' }}><strong>Findings:</strong> {round.findings}</p>
                    {round.treatment_plan && <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#475569' }}><strong>Treatment Plan:</strong> {round.treatment_plan}</p>}

                    {}
                    {(round.vitals_bp || round.vitals_temp || round.vitals_pulse || round.vitals_spo2) && (
                      <div>
                        <button
                          className="expander-trigger"
                          onClick={() => setExpandedRoundId(expandedRoundId === round.id ? null : round.id)}
                          style={{ background: 'none', border: 'none', color: '#457b9d', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                          type="button"
                        >
                          {expandedRoundId === round.id ? 'Hide Vitals ▲' : 'Show Vitals ▼'}
                        </button>

                        {expandedRoundId === round.id && (
                          <div className="vitals-row-expand" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', marginTop: '6px', fontSize: '11px', border: '1px solid #f1f5f9' }}>
                            {round.vitals_bp && <div><strong>BP:</strong> {round.vitals_bp}</div>}
                            {round.vitals_temp && <div><strong>Temp:</strong> {round.vitals_temp} °C</div>}
                            {round.vitals_pulse && <div><strong>Pulse:</strong> {round.vitals_pulse} bpm</div>}
                            {round.vitals_spo2 && <div><strong>SpO2:</strong> {round.vitals_spo2} %</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {}
          <div className="card actions-card" style={{ gridColumn: '1 / -1', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#475569', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clinical Actions Portal</h3>
            <div className="actions-flex" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button
                onClick={() => {
                  setSymptomsList([]);
                  setPrimaryDiag('');
                  setSecondaryCond('');
                  setIcd10Code('');
                  setDiagNotes('');
                  setSymptomInput('');
                  setShowDiagModal(true);
                }}
                className="btn-primary"
                style={{ backgroundColor: '#457b9d' }}
                type="button"
              >
                Add Diagnosis
              </button>

              <button
                onClick={() => {
                  setFollowupStatus(latestFollowup?.status || 'Stable');
                  setFollowupNotes('');
                  setShowFollowupModal(true);
                }}
                className="btn-primary"
                style={{ backgroundColor: '#2d6a4f' }}
                type="button"
              >
                Update Follow-up
              </button>

              {patient.bed_number && (
                <>
                  <button
                    onClick={() => {
                      setFinalDiagnosis(currentDiag?.primary_diagnosis || '');
                      setDischargeNotes('');
                      setDischargeType('NORMAL');
                      setShowDischargeModal(true);
                    }}
                    className="btn-secondary"
                    style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                    type="button"
                  >
                    Discharge Patient
                  </button>

                  <button
                    onClick={() => { window.location.hash = '#/transfers'; }}
                    className="btn-secondary"
                    type="button"
                  >
                    Transfer Bed
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {}
      {showDiagModal && (
        <div className="modal-overlay" onClick={() => setShowDiagModal(false)}>
          <div className="modal diagnosis-form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Diagnosis</h3>
            <p className="modal-subtitle">Record clinical diagnosis, symptoms, and coding details</p>

            <form onSubmit={handleDiagSubmit}>
              <div className="form-group">
                <label>Primary Diagnosis *</label>
                <input
                  type="text"
                  required
                  value={primaryDiag}
                  onChange={(e) => setPrimaryDiag(e.target.value)}
                  placeholder="e.g., Acute Bronchitis"
                />
              </div>

              <div className="form-group">
                <label>Secondary Conditions</label>
                <input
                  type="text"
                  value={secondaryCond}
                  onChange={(e) => setSecondaryCond(e.target.value)}
                  placeholder="e.g., Hypertension, Diabetes"
                />
              </div>

              <div className="form-group">
                <label>Symptoms (Type & press comma or Enter)</label>
                <input
                  type="text"
                  value={symptomInput}
                  onChange={handleSymptomInputChange}
                  onKeyDown={handleSymptomKeyDown}
                  placeholder="fever, cough, chest pain"
                  disabled={symptomsList.length >= 10}
                />

                {}
                {symptomsList.length > 0 && (
                  <div className="symptoms-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {symptomsList.map((sym, idx) => (
                      <span
                        key={idx}
                        className="symptom-pill"
                        onClick={() => removeSymptom(idx)}
                        style={{
                          background: '#e2e8f0',
                          color: '#1d3557',
                          borderRadius: '12px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {sym} <strong style={{ marginLeft: '2px', color: '#ef4444' }}>×</strong>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                  Max 10 symptoms. Click symptom to remove.
                </div>
              </div>

              <div className="form-group">
                <label>ICD-10 Code</label>
                <input
                  type="text"
                  value={icd10Code}
                  onChange={(e) => setIcd10Code(e.target.value)}
                  placeholder="e.g., J20.9"
                />
              </div>

              <div className="form-group">
                <label>Diagnosis Notes</label>
                <textarea
                  value={diagNotes}
                  onChange={(e) => setDiagNotes(e.target.value)}
                  placeholder="Differential diagnosis, initial observations, recommendations..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Diagnosed By</label>
                <input
                  type="text"
                  value={user?.name || 'Dr Prachi'}
                  readOnly
                  style={{ background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDiagModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#457b9d' }} disabled={diagSubmitting}>
                  {diagSubmitting ? 'Saving...' : 'Save Diagnosis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showFollowupModal && (
        <div className="modal-overlay" onClick={() => setShowFollowupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Update Follow-up</h3>
            <p className="modal-subtitle">Record recovery stage progress</p>

            <form onSubmit={handleFollowupSubmit}>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Status *</label>

                <div className="custom-dropdown-container">
                  <div
                    className="dropdown-trigger"
                    onClick={() => setFollowupDropdownOpen(!followupDropdownOpen)}
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
                    <span className="status-dot" style={{ backgroundColor: statusColors[followupStatus] }}></span>
                    {followupStatus}
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#64748b' }}>▼</span>
                  </div>

                  {followupDropdownOpen && (
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
                          onClick={() => { setFollowupStatus(opt); setFollowupDropdownOpen(false); }}
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
                <label>Progress Notes</label>
                <textarea
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="Enter followup observations..."
                  rows={4}
                  maxLength={500}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  {followupNotes.length} / 500 characters
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

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowFollowupModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#2d6a4f' }} disabled={followupSubmitting}>
                  {followupSubmitting ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {showDischargeModal && (
        <div className="modal-overlay" onClick={() => setShowDischargeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Patient Discharge</h3>
            <p className="modal-subtitle">Record discharge options and diagnosis details</p>

            <form onSubmit={handleDischargeSubmit}>
              <div className="form-group">
                <label>Discharge Type *</label>
                <select
                  value={dischargeType}
                  onChange={(e) => setDischargeType(e.target.value)}
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
                  required
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  placeholder="Enter final medical diagnosis"
                />
              </div>

              <div className="form-group">
                <label>Discharge Notes / Summary</label>
                <textarea
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  placeholder="Summaries, recommendations, prescriptions..."
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowDischargeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: '#ef4444' }} disabled={dischargeSubmitting}>
                  {dischargeSubmitting ? 'Discharging...' : 'Discharge Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
