import React from 'react';

const PatientCard = ({ patient, onViewHistory, userRole }) => {

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=PatientID:${patient.patientId}`;

  return (
    <div className="patient-card">
      <div className="patient-header">
        <div className="patient-avatar">
          {patient.patientName.charAt(0).toUpperCase()}
        </div>
        <div className="patient-info">
          <h4
            style={{ cursor: 'pointer', color: '#457b9d', textDecoration: 'none' }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
            onClick={() => { window.location.hash = `#/patients/${patient.patientId}`; }}
          >
            {patient.patientName}
          </h4>
          <span className="patient-meta">{patient.age} yrs • {patient.gender}</span>
        </div>
      </div>
      <div className="patient-details">
        <p><span>📞</span> {patient.phone}</p>
        {patient.bloodGroup && <p><span>🩸</span> {patient.bloodGroup}</p>}
      </div>

      <div className="patient-qr-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px', padding: '8px', borderTop: '1px solid #f1f5f9' }}>
        <img
          src={qrCodeUrl}
          alt={`Patient ${patient.patientId} QR ID`}
          style={{ width: '80px', height: '80px', borderRadius: '4px', background: '#f8fafc', padding: '4px', border: '1px solid #e2e8f0' }}
        />
        <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', fontWeight: '500' }}>PATIENT QR ID</span>
      </div>

      <button className="history-btn" style={{ marginTop: '12px' }} onClick={() => onViewHistory(patient)}>
        View History
      </button>
    </div>
  );
};

export default PatientCard;
