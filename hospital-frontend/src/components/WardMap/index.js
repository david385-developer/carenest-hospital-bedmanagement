import React from 'react';

const STATUS_COLORS = {
  'AVAILABLE': '#22c55e',
  'OCCUPIED': '#ef4444',
  'RESERVED': '#f59e0b',
  'CLEANING': '#3b82f6',
  'MAINTENANCE': '#6b7280'
};

const WardMap = ({ beds, onAssignClick, onStatusChange, userRole }) => {
  const groupedBeds = beds.reduce((acc, bed) => {
    if (!acc[bed.wardName]) acc[bed.wardName] = [];
    acc[bed.wardName].push(bed);
    return acc;
  }, {});

  const handleBedClick = (bed) => {
    // Only Reception and Admin can click to assign
    if (userRole === 'doctor') return;
    if (bed.status !== 'AVAILABLE') return;
    if (onAssignClick) onAssignClick(bed);
  };

  return (
    <div className="ward-map-container">
      {Object.entries(groupedBeds).map(([wardName, wardBeds]) => (
        <div key={wardName} className="ward-section">
          <h3 className="ward-title">{wardName}</h3>
          <div className="bed-grid">
            {wardBeds.map(bed => {
              const isOccupied = bed.status === 'OCCUPIED';
              const canClick = bed.status === 'AVAILABLE' && userRole !== 'doctor';

              return (
                <div 
                  key={bed.bedId} 
                  className={`bed-card ${bed.status.toLowerCase()} ${canClick ? 'clickable' : 'non-clickable'}`}
                  onClick={() => handleBedClick(bed)}
                  title={isOccupied && bed.patientName ? `Patient: ${bed.patientName}` : undefined}
                >
                  <div 
                    className="bed-status-indicator" 
                    style={{ background: STATUS_COLORS[bed.status] }}
                  ></div>
                  <span className="bed-number">{bed.bedNumber}</span>
                  <span className="bed-status">{bed.status}</span>
                  {bed.patientName && (
                    <span className="bed-patient">{bed.patientName}</span>
                  )}

                  {/* Tooltip on Hover for Occupied Bed */}
                  {isOccupied && bed.patientName && (
                    <div className="bed-tooltip-bubble">
                      <strong>Patient:</strong> {bed.patientName}
                    </div>
                  )}
                  
                  {/* Status Button Cleanups (Reception / Admin only) */}
                  {userRole !== 'doctor' && bed.status === 'CLEANING' && (
                    <button 
                      className="status-btn available"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onStatusChange) onStatusChange(bed.bedId, 'AVAILABLE');
                      }}
                    >
                      Mark Available
                    </button>
                  )}
                  {userRole !== 'doctor' && bed.status === 'MAINTENANCE' && (
                    <button 
                      className="status-btn available"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onStatusChange) onStatusChange(bed.bedId, 'AVAILABLE');
                      }}
                    >
                      Complete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WardMap;
