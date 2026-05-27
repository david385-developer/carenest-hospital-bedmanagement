import React from 'react';
import './index.css';

const AccessDenied = () => {
  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        <div className="warning-icon">⛔</div>
        <h2>Access Denied</h2>
        <p>You do not have the required permissions to view this page. Please contact your system administrator if you believe this is an error.</p>
      </div>
    </div>
  );
};

export default AccessDenied;
