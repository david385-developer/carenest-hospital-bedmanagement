import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../../utils/api';
import './index.css';

const Employees = () => {
  const { isAdmin } = useAuth();

  // State
  const [employees, setEmployees] = useState([]);
  const [filteredRole, setFilteredRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    doctors: 0,
    reception: 0,
    admins: 0
  });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'doctor'
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (isAdmin()) {
      fetchEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRole]);

  // Fetch employees list
  const fetchEmployees = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let endpoint = '/users';
      if (filteredRole) {
        endpoint += `?role=${filteredRole}`;
      }

      const data = await api.get(endpoint);
      setEmployees(data);
      
      // Calculate counts based on current database fetch
      if (!filteredRole) {
        const counts = data.reduce(
          (acc, curr) => {
            acc.total++;
            if (curr.role === 'doctor') acc.doctors++;
            else if (curr.role === 'reception') acc.reception++;
            else if (curr.role === 'admin') acc.admins++;
            return acc;
          },
          { total: 0, doctors: 0, reception: 0, admins: 0 }
        );
        setStats(counts);
      } else {
        // If query was filtered, we still want to keep the total counts accurate by doing a silent stats fetch
        fetchStatsSilent();
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setErrorMsg(error.message || 'Failed to load employee records.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch statistics silently when role filter is active
  const fetchStatsSilent = async () => {
    try {
      const data = await api.get('/users');
      const counts = data.reduce(
        (acc, curr) => {
          acc.total++;
          if (curr.role === 'doctor') acc.doctors++;
          else if (curr.role === 'reception') acc.reception++;
          else if (curr.role === 'admin') acc.admins++;
          return acc;
        },
        { total: 0, doctors: 0, reception: 0, admins: 0 }
      );
      setStats(counts);
    } catch (e) {
      console.error('Failed silent stats fetch:', e);
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

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setModalError('');
    setSubmitting(true);

    try {
      await api.post('/auth/register', formData);
      setSuccessMsg(`Employee "${formData.name}" registered successfully!`);
      setShowModal(false);
      setFormData({ name: '', username: '', password: '', role: 'doctor' });
      setFormErrors({});
      fetchEmployees();
    } catch (error) {
      setModalError(error.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Access Denied Render
  if (!isAdmin()) {
    return (
      <div className="employees-page" style={{ padding: '20px' }}>
        <div className="card access-denied-card" style={{
          background: 'white',
          borderRadius: '14px',
          padding: '40px 20px',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '50px auto',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div className="lock-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>Admin Access Required</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>You do not have permission to manage employees.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employees-page">
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

      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>👥 Employee Management</h2>
          <select 
            value={filteredRole}
            onChange={(e) => setFilteredRole(e.target.value)}
            className="filter-select"
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: 'white' }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="doctor">Doctor</option>
            <option value="reception">Reception</option>
          </select>
        </div>
        <button className="btn-primary btn-sm" onClick={() => { setShowModal(true); setModalError(''); }}>
          + Add Employee
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f1f5f9', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Employees</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👨‍⚕️</div>
          <div className="stat-info">
            <h3>{stats.doctors}</h3>
            <p>Doctors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ffedd5', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛎️</div>
          <div className="stat-info">
            <h3>{stats.reception}</h3>
            <p>Reception Staff</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e8ff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚙️</div>
          <div className="stat-info">
            <h3>{stats.admins}</h3>
            <p>Administrators</p>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '30vh', gap: '16px', color: '#64748b' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p>Fetching employees directory...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="empty-state" style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>👥</span>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#475569' }}>No employees registered yet</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#cbd5e1' }}>There are no accounts registered under the selected filter.</p>
        </div>
      ) : (
        <div className="employees-responsive-grid">
          {employees.map(emp => (
            <div key={emp.userId} className="employee-card">
              <div className="employee-card-header" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div className="employee-avatar" style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: emp.role === 'admin' ? '#8b5cf6' : emp.role === 'doctor' ? '#0f766e' : '#f97316',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="employee-meta">
                  <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>{emp.name}</h4>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>@{emp.username}</span>
                </div>
              </div>
              <div className="employee-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`employee-badge badge-${emp.role}`} style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px'
                }}>
                  {emp.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Employee</h3>
            <p className="modal-subtitle">Create a login account for new hospital staff</p>

            {modalError && (
              <div className="alert alert-error" style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚠️ {modalError}</span>
                <button type="button" onClick={() => setModalError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '16px' }}>×</button>
              </div>
            )}

            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label>Full Name *</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Jane Smith"
                  className={`form-input ${formErrors.name ? 'input-error' : ''}`}
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Username *</label>
                <input 
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. janesmith"
                  className={`form-input ${formErrors.username ? 'input-error' : ''}`}
                />
                {formErrors.username && <span className="error-text">{formErrors.username}</span>}
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input 
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 4 characters"
                  className={`form-input ${formErrors.password ? 'input-error' : ''}`}
                />
                {formErrors.password && <span className="error-text">{formErrors.password}</span>}
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="form-input"
                >
                  <option value="doctor">Doctor</option>
                  <option value="reception">Reception</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Creating account...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
