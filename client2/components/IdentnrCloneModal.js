import React, { useState, useEffect } from 'react';

const IdentnrCloneModal = ({
  showModal,
  allIdentnrs,
  operationLoading,
  onClose,
  onClone,
  errorMessage,
  clearError
}) => {
  const [sourceIdentnr, setSourceIdentnr] = useState('');
  const [targetIdentnr, setTargetIdentnr] = useState('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (showModal) {
      setSourceIdentnr('');
      setTargetIdentnr('');
      setShowSourceDropdown(false);
      // Only clear errors when modal first opens, not during re-renders
      if (clearError && !errorMessage) {
        clearError();
      }
    }
  }, [showModal, clearError, errorMessage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (sourceIdentnr && targetIdentnr) {
      onClone({ sourceIdentnr, targetIdentnr });
    }
  };

  const handleSourceSelect = (identnr) => {
    setSourceIdentnr(identnr);
    setShowSourceDropdown(false);
  };

  if (!showModal) {
    return null;
  }

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="modal-content"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-md)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            🏷️ Identnr Klonen
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Source Identnr Dropdown */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Quell-Identnr *
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  className="form-input"
                  onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <span>{sourceIdentnr || 'Quell-Identnr auswählen...'}</span>
                  <span>{showSourceDropdown ? '▲' : '▼'}</span>
                </div>

                {showSourceDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderTop: 'none',
                      borderRadius: '0 0 4px 4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1001,
                      boxShadow: 'var(--shadow-md)'
                    }}
                  >
                    {allIdentnrs?.map(identnr => (
                      <div
                        key={identnr}
                        onClick={() => handleSourceSelect(identnr)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-light)',
                          color: 'var(--text-primary)'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--hover-bg)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        {identnr}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Target Identnr Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Ziel-Identnr *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Neue Identnr eingeben (z.B.: T1000)"
                value={targetIdentnr}
                onChange={(e) => setTargetIdentnr(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div style={{
                backgroundColor: '#fee2e2',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #fca5a5'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: '#dc2626', fontSize: '1.1rem' }}>⚠️</span>
                  <p style={{ margin: 0, color: '#dc2626', fontSize: '0.9rem', fontWeight: '500' }}>
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Info Message */}
            {sourceIdentnr && targetIdentnr && !errorMessage && (
              <div style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                border: '1px solid var(--border-color)'
              }}>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                  ℹ️ Alle Merkmale von <strong>{sourceIdentnr}</strong> werden nach <strong>{targetIdentnr}</strong> geklont.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={operationLoading?.clone}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={!sourceIdentnr || !targetIdentnr || operationLoading?.clone}
              >
                {operationLoading?.clone ? '⏳ Klont...' : '🏷️ Klonen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default IdentnrCloneModal;