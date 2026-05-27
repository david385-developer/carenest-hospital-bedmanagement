import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../../utils/api';
import './index.css';

const AdmissionForm = () => {
  const { isReception, isAdmin } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [icuStatus, setIcuStatus] = useState(null);

  const [patientForm, setPatientForm] = useState({
    patientName: '',
    age: '',
    gender: 'male',
    phone: '',
    emergencyContact: '',
    bloodGroup: '',
    medicalHistory: ''
  });

  const [admissionForm, setAdmissionForm] = useState({
    bedId: '',
    doctorId: '',
    admissionType: 'NORMAL',
    diagnosis: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [, doctorsData, bedsData, icuBedsData] = await Promise.all([
        api.get('/wards'),
        api.get('/doctors'),
        api.get('/beds?status=AVAILABLE'),
        api.get('/beds?type=icu')
      ]);
      setDoctors(doctorsData);
      setAvailableBeds(bedsData);

      if (icuBedsData && icuBedsData.length > 0) {
        const total = icuBedsData.length;
        const occupied = icuBedsData.filter(b => b.status === 'OCCUPIED').length;
        const rate = (occupied / total) * 100;
        setIcuStatus({ rate, occupied, total });
      }
    } catch (err) {
      setError(err.message || 'Failed to load wards or doctors data');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientChange = (e) => {
    setPatientForm({ ...patientForm, [e.target.name]: e.target.value });
  };

  const handleAdmissionChange = (e) => {
    setAdmissionForm({ ...admissionForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {

      const patientResponse = await api.post('/patients', patientForm);
      const patientId = patientResponse.id || patientResponse.patientId;

      if (!patientId) {
        throw new Error('Failed to retrieve registered patient ID.');
      }

      const admissionData = {
        patientId,
        bedId: parseInt(admissionForm.bedId),
        doctorId: admissionForm.doctorId ? parseInt(admissionForm.doctorId) : null,
        admissionType: admissionForm.admissionType,
        diagnosis: admissionForm.diagnosis,
        notes: admissionForm.notes
      };

      await api.post('/admissions', admissionData);

      setSuccess('Patient admitted successfully!');

      setPatientForm({
        patientName: '', age: '', gender: 'male', phone: '',
        emergencyContact: '', bloodGroup: '', medicalHistory: ''
      });
      setAdmissionForm({
        bedId: '', doctorId: '', admissionType: 'NORMAL',
        diagnosis: '', notes: ''
      });

      const bedsData = await api.get('/beds?status=AVAILABLE');
      setAvailableBeds(bedsData);

    } catch (err) {
      setError(err.message || 'Failed to admit patient');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReception() && !isAdmin()) {
    return (
      <div className="access-denied">
        <div className="card">
          <h2>🔒 Access Denied</h2>
          <p>You do not have permission to admit patients.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admission-form">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading admission data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admission-form">
      <div className="page-header">
        <h2>📝 Patient Admission</h2>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button type="button" onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button type="button" onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {icuStatus && icuStatus.rate >= 70 && (
        <div className="alert alert-error" style={{ background: icuStatus.rate >= 90 ? '#fef2f2' : '#fffbeb', borderColor: icuStatus.rate >= 90 ? '#fecaca' : '#fef3c7', color: icuStatus.rate >= 90 ? '#991b1b' : '#92400e', marginBottom: '20px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
          <strong style={{ fontSize: '14px' }}>{icuStatus.rate >= 90 ? '🚨 ICU CRITICAL OCCUPANCY ALERT' : '⚠️ HIGH ICU OCCUPANCY WARNING'}</strong>
          <span style={{ fontSize: '13px' }}>ICU Bed occupancy is at {icuStatus.rate.toFixed(0)}% ({icuStatus.occupied}/{icuStatus.total} ICU beds occupied). Please prioritize emergency allocations.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {}
        <div className="card">
          <h3 className="card-title">👤 Patient Details</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Patient Name *</label>
              <input
                type="text"
                name="patientName"
                value={patientForm.patientName}
                onChange={handlePatientChange}
                placeholder="Enter patient name"
                required
              />
            </div>

            <div className="form-group">
              <label>Age *</label>
              <input
                type="number"
                name="age"
                value={patientForm.age}
                onChange={handlePatientChange}
                placeholder="Enter age"
                min="1"
                max="150"
                required
              />
            </div>

            <div className="form-group">
              <label>Gender *</label>
              <select name="gender" value={patientForm.gender} onChange={handlePatientChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                name="phone"
                value={patientForm.phone}
                onChange={handlePatientChange}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="form-group">
              <label>Emergency Contact</label>
              <input
                type="tel"
                name="emergencyContact"
                value={patientForm.emergencyContact}
                onChange={handlePatientChange}
                placeholder="Emergency contact number"
              />
            </div>

            <div className="form-group">
              <label>Blood Group</label>
              <input
                type="text"
                name="bloodGroup"
                value={patientForm.bloodGroup}
                onChange={handlePatientChange}
                placeholder="e.g., O+, A-, B+"
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Medical History</label>
            <textarea
              name="medicalHistory"
              value={patientForm.medicalHistory}
              onChange={handlePatientChange}
              placeholder="Any existing conditions, allergies, etc."
              rows={3}
            />
          </div>
        </div>

        {}
        <div className="card">
          <h3 className="card-title">🏥 Admission Details</h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Bed *</label>
              <select
                name="bedId"
                value={admissionForm.bedId}
                onChange={handleAdmissionChange}
                required
              >
                <option value="">Select Available Bed</option>
                {availableBeds.map(bed => (
                  <option key={bed.bedId} value={bed.bedId}>
                    {bed.bedNumber} — {bed.wardName} ({bed.wardType})
                  </option>
                ))}
              </select>
              {availableBeds.length === 0 && (
                <span className="field-error">No available beds</span>
              )}
            </div>

            <div className="form-group">
              <label>Doctor</label>
              <select
                name="doctorId"
                value={admissionForm.doctorId}
                onChange={handleAdmissionChange}
              >
                <option value="">Select Doctor</option>
                {doctors.map(doc => (
                  <option key={doc.doctorId} value={doc.doctorId}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Admission Type *</label>
              <select
                name="admissionType"
                value={admissionForm.admissionType}
                onChange={handleAdmissionChange}
                required
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
                name="diagnosis"
                value={admissionForm.diagnosis}
                onChange={handleAdmissionChange}
                placeholder="Initial diagnosis"
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Notes</label>
            <textarea
              name="notes"
              value={admissionForm.notes}
              onChange={handleAdmissionChange}
              placeholder="Additional notes"
              rows={3}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary btn-full"
          disabled={submitting || availableBeds.length === 0}
        >
          {submitting ? 'Admitting Patient...' : 'Admit Patient'}
        </button>
      </form>
    </div>
  );
};

export default AdmissionForm;
