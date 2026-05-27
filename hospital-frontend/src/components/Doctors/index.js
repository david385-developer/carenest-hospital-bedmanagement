import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { API_BASE } from '../../utils/api';
import './index.css';

const Doctors = () => {
  const { token, logout } = useContext(AuthContext);
  const [doctors, setDoctors] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'doctor'
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE}/users?role=doctor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) {
        logout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setDoctors(data);
      } else {
        setErrorMsg('Failed to load doctors list.');
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
      setErrorMsg('Network error. Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(`Doctor "${formData.name}" successfully registered!`);
        setShowAddForm(false);
        setFormData({ name: '', username: '', password: '', role: 'doctor' });
        setFormErrors({});
        fetchDoctors();
      } else {
        setErrorMsg(data.error || 'Failed to register doctor.');
      }
    } catch (error) {
      console.error('Failed to add doctor:', error);
      setErrorMsg('Network error. Failed to submit registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading doctors database...</p>
      </div>
    );
  }

  return (
    <div className="doctors-page">
      <div className="page-header">
        <h2>👨‍⚕️ Doctor Management</h2>
        <button className="btn-primary" onClick={() => { setShowAddForm(true); setSuccessMsg(''); setErrorMsg(''); }}>
          + Add Doctor
        </button>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '10px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', opacity: 0.6 }}>×</button>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '10px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', opacity: 0.6 }}>×</button>
        </div>
      )}

      {doctors.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <span>👨‍⚕️</span>
          <p>No doctors registered in the system yet.</p>
        </div>
      ) : (
        <div className="doctors-grid">
          {doctors.map(doctor => (
            <div key={doctor.userId} className="doctor-card">
              <div className="doctor-avatar">
                {doctor.name.charAt(0).toUpperCase()}
              </div>
              <div className="doctor-info">
                <h4>{doctor.name}</h4>
                <span className="doctor-role">{doctor.role}</span>
                <span className="doctor-username">@{doctor.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Doctor</h3>
            <p className="modal-subtitle">Register a new medical professional account</p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={formErrors.name ? 'input-error' : ''}
                  placeholder="e.g. Dr. Arthur Miller"
                />
                {formErrors.name && <span className="error-text" style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>{formErrors.name}</span>}
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={formErrors.username ? 'input-error' : ''}
                  placeholder="e.g. arthur.miller"
                />
                {formErrors.username && <span className="error-text" style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>{formErrors.username}</span>}
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={formErrors.password ? 'input-error' : ''}
                  placeholder="Minimum 4 characters"
                />
                {formErrors.password && <span className="error-text" style={{ color: '#ef4444', fontSize: '11px', display: 'block', marginTop: '4px' }}>{formErrors.password}</span>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;