import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, formatDateTimeIST } from '../../utils/api';
import PatientCard from '../PatientCard';
import './index.css';

const Patients = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const fetchPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/patients?page=${page}&search=${search}`);
      setPatients(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setError(err.message || 'Failed to load patients list.');
    } finally {
      setLoading(false);
    }
  };

  const viewHistory = async (patient) => {
    setSelectedPatient(patient);
    setHistoryLoading(true);
    setError('');
    try {
      const data = await api.get(`/patients/${patient.patientId}/history`);
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch patient history:', err);
      setError(err.message || 'Failed to load patient history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px', color: '#64748b' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading patients...</p>
      </div>
    );
  }

  // Calculate paging stats
  let pagingText = '';
  if (pagination && pagination.total > 0) {
    const startItem = (pagination.page - 1) * pagination.limit + 1;
    const endItem = Math.min(pagination.page * pagination.limit, pagination.total);
    pagingText = `Showing ${startItem} - ${endItem} of ${pagination.total} patients`;
  }

  // Generate numerical pagination buttons
  const renderPaginationButtons = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    const buttons = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
      buttons.push(
        <button
          key={i}
          className={`pagination-num-btn ${page === i ? 'active' : ''}`}
          onClick={() => setPage(i)}
          type="button"
        >
          {i}
        </button>
      );
    }
    return (
      <div className="pagination-numbers" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {buttons}
      </div>
    );
  };

  return (
    <div className="patients-page">
      {error && (
        <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderRadius: '10px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '18px', opacity: 0.6 }} type="button">×</button>
        </div>
      )}

      <div className="page-header">
        <h2>👤 Patients Directory</h2>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search patients by name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {pagingText && (
        <div className="paging-summary" style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', fontWeight: '500' }}>
          {pagingText}
        </div>
      )}

      <div className="patients-grid">
        {patients.map(patient => (
          <PatientCard 
            key={patient.patientId}
            patient={patient}
            onViewHistory={viewHistory}
            userRole={user?.role}
          />
        ))}
      </div>

      {patients.length === 0 && (
        <div className="empty-state" style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>👤</span>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>No patients found</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#cbd5e1' }}>There are no patients registered matching your search criteria.</p>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '30px' }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="pagination-arrow-btn"
            type="button"
          >
            ← Prev
          </button>
          
          {renderPaginationButtons()}
          
          <button 
            disabled={page === pagination.totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="pagination-arrow-btn"
            type="button"
          >
            Next →
          </button>
        </div>
      )}

      {selectedPatient && (
        <div className="modal-overlay" onClick={() => { setSelectedPatient(null); setHistory(null); }}>
          <div className="modal history-modal" onClick={(e) => e.stopPropagation()}>
            <h3>📋 Patient Medical History</h3>
            <div className="patient-summary" style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a' }}>{selectedPatient.patientName}</h4>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#475569' }}>{selectedPatient.age} years • {selectedPatient.gender} • {selectedPatient.phone}</p>
              {selectedPatient.bloodGroup && <p style={{ margin: 0, fontSize: '13px', color: '#0f766e', fontWeight: '600' }}>Blood Group: {selectedPatient.bloodGroup}</p>}
            </div>

            {historyLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '30px 0', gap: '10px' }}>
                <div className="spinner" style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#0f766e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Loading patient history...</p>
              </div>
            ) : (
              <div className="history-scroll-container" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
                <h4 className="section-title" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '6px', marginBottom: '12px', fontSize: '14px', color: '#334155' }}>Admissions</h4>
                {history?.admissions?.length === 0 ? (
                  <p className="empty-text" style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: '0 0 20px 0' }}>No admission history found</p>
                ) : (
                  <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {history?.admissions?.map(ad => (
                      <div key={ad.admissionId} className="history-item" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className={`status-pill ${ad.status.toLowerCase()}`} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', fontWeight: '700' }}>{ad.status}</span>
                          <span className="history-date" style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDateTimeIST(ad.admittedAt)}</span>
                        </div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>Bed:</strong> {ad.bedNumber} ({ad.wardName})</p>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>Doctor:</strong> {ad.doctorName || '—'}</p>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>Type:</strong> {ad.admissionType}</p>
                        {ad.diagnosis && <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>Diagnosis:</strong> {ad.diagnosis}</p>}
                        {ad.notes && <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}><strong>Notes:</strong> {ad.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {history?.transfers?.length > 0 && (
                  <>
                    <h4 className="section-title" style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '6px', marginBottom: '12px', fontSize: '14px', color: '#334155' }}>Transfers</h4>
                    <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {history.transfers.map(tr => (
                        <div key={tr.transferId} className="history-item transfer" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                          <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span className="status-pill transferred" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '10px', padding: '3px 8px', borderRadius: '12px', fontWeight: '700' }}>TRANSFERRED</span>
                            <span className="history-date" style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDateTimeIST(tr.transferDate)}</span>
                          </div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>Route:</strong> {tr.fromWard} → {tr.toWard}</p>
                          <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}><strong>Beds:</strong> Bed {tr.fromBed} → Bed {tr.toBed}</p>
                          {tr.reason && <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}><strong>Reason:</strong> {tr.reason}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button className="btn-secondary" style={{ marginTop: '20px', width: '100%' }} onClick={() => { setSelectedPatient(null); setHistory(null); }} type="button">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;