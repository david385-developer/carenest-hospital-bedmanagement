import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../../utils/api';
import WardMap from '../WardMap';
import './index.css';

const BedAllocation = () => {
  const { user, isDoctor } = useAuth();

  const [beds, setBeds] = useState([]);
  const [wards, setWards] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filterWard, setFilterWard] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [icuStatus, setIcuStatus] = useState(null);

  const [assignForm, setAssignForm] = useState({
    patientId: '',
    doctorId: '',
    admissionType: 'NORMAL',
    diagnosis: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError('');
      try {
        await Promise.all([fetchBeds(), fetchWards(), fetchPatients(), fetchDoctors(), fetchIcuStatus()]);
      } catch (err) {
        setError('Failed to load bed allocation data.');
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterWard, filterStatus]);

  const fetchIcuStatus = async () => {
    try {
      const data = await api.get('/beds?type=icu');
      if (data && data.length > 0) {
        const total = data.length;
        const occupied = data.filter(b => b.status === 'OCCUPIED').length;
        const rate = (occupied / total) * 100;
        setIcuStatus({ rate, occupied, total });
      }
    } catch (error) {
      console.error('Failed to fetch ICU status:', error);
    }
  };

  const fetchBeds = async () => {
    try {
      let url = '/beds';
      const params = new URLSearchParams();
      if (filterWard) params.append('wardId', filterWard);
      if (filterStatus) params.append('status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;

      const data = await api.get(url);
      setBeds(data);
    } catch (error) {
      console.error('Failed to fetch beds:', error);
    }
  };

  const fetchWards = async () => {
    try {
      const data = await api.get('/wards');
      setWards(data);
    } catch (error) {
      console.error('Failed to fetch wards:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const data = await api.get('/patients');
      setPatients(data.data || []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const data = await api.get('/doctors');
      setDoctors(data);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  const handleAssignClick = (bed) => {

    if (isDoctor()) return;
    if (bed.status !== 'AVAILABLE') return;

    setSelectedBed(bed);
    setShowAssignModal(true);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!assignForm.patientId) errors.patientId = 'Patient selection is required';
    if (!assignForm.doctorId) errors.doctorId = 'Doctor assignment is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (isDoctor()) return;
    if (!validateForm()) return;

    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await api.put(`/beds/${selectedBed.bedId}/assign`, assignForm);
      setShowAssignModal(false);
      setAssignForm({ patientId: '', doctorId: '', admissionType: 'NORMAL', diagnosis: '', notes: '' });
      setMessage(`Successfully assigned bed ${selectedBed.bedNumber} to the patient!`);
      fetchBeds();
    } catch (error) {
      setError(error.message || 'Failed to assign bed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (bedId, newStatus) => {

    if (isDoctor()) return;

    setError('');
    setMessage('');
    try {
      await api.patch(`/beds/${bedId}/status`, { status: newStatus });
      setMessage(`Bed status updated to ${newStatus} successfully.`);
      fetchBeds();
    } catch (error) {
      console.error('Failed to update status:', error);
      setError(error.message || 'Failed to update bed status.');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading bed allocations...</p>
      </div>
    );
  }

  return (
    <div className="bed-allocation">
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
        <h2>🛏️ Bed Allocation Dashboard</h2>
        <div className="filters">
          <select
            value={filterWard}
            onChange={(e) => setFilterWard(e.target.value)}
            className="filter-select"
          >
            <option value="">All Wards</option>
            {wards.map(ward => (
              <option key={ward.wardId} value={ward.wardId}>{ward.wardName}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="CLEANING">Cleaning</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>
      </div>

      {icuStatus && icuStatus.rate >= 70 && (
        <div className="alert alert-error" style={{ background: icuStatus.rate >= 90 ? '#fef2f2' : '#fffbeb', borderColor: icuStatus.rate >= 90 ? '#fecaca' : '#fef3c7', color: icuStatus.rate >= 90 ? '#991b1b' : '#92400e', marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <strong style={{ fontSize: '14px' }}>{icuStatus.rate >= 90 ? '🚨 ICU CRITICAL OCCUPANCY ALERT' : '⚠️ HIGH ICU OCCUPANCY WARNING'}</strong>
          <span style={{ fontSize: '13px' }}>ICU Bed occupancy is currently at {icuStatus.rate.toFixed(0)}% ({icuStatus.occupied}/{icuStatus.total} ICU beds occupied). Priority transfers must be coordinated with the charge nurse.</span>
        </div>
      )}

      <div className="bed-legend" style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#22c55e', display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '6px' }}></span>Available</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#ef4444', display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '6px' }}></span>Occupied</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b', display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '6px' }}></span>Reserved</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6', display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '6px' }}></span>Cleaning</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: '#6b7280', display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', marginRight: '6px' }}></span>Maintenance</div>
      </div>

      {beds.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <span>🛏️</span>
          <p>No beds match the selected filters.</p>
        </div>
      ) : (
        <WardMap
          beds={beds}
          onAssignClick={handleAssignClick}
          onStatusChange={handleStatusChange}
          userRole={user?.role}
        />
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Bed {selectedBed?.bedNumber}</h3>
            <p className="modal-subtitle">{selectedBed?.wardName} — {selectedBed?.wardType.toUpperCase()}</p>

            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label>Patient *</label>
                <select
                  value={assignForm.patientId}
                  onChange={(e) => setAssignForm({ ...assignForm, patientId: e.target.value })}
                  className={formErrors.patientId ? 'input-error' : ''}
                >
                  <option value="">Select Patient</option>
                  {patients.map(p => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.patientName} ({p.phone})
                    </option>
                  ))}
                </select>
                {formErrors.patientId && <span className="error-text" style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>{formErrors.patientId}</span>}
              </div>

              <div className="form-group">
                <label>Doctor *</label>
                <select
                  value={assignForm.doctorId}
                  onChange={(e) => setAssignForm({ ...assignForm, doctorId: e.target.value })}
                  className={formErrors.doctorId ? 'input-error' : ''}
                >
                  <option value="">Select Doctor</option>
                  {doctors.map(d => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {formErrors.doctorId && <span className="error-text" style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>{formErrors.doctorId}</span>}
              </div>

              <div className="form-group">
                <label>Admission Type *</label>
                <select
                  value={assignForm.admissionType}
                  onChange={(e) => setAssignForm({ ...assignForm, admissionType: e.target.value })}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              <div className="form-group">
                <label>Diagnosis</label>
                <input
                  type="text"
                  value={assignForm.diagnosis}
                  onChange={(e) => setAssignForm({ ...assignForm, diagnosis: e.target.value })}
                  placeholder="Initial diagnosis"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Assign Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedAllocation;