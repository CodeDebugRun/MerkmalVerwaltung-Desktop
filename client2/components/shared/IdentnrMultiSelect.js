import React from 'react';

const IdentnrMultiSelect = ({
  // Core props
  selectedIdentnrs = [],
  allIdentnrs = [],
  showDropdown = false,
  customIdentnr = '',

  // Configuration props
  multiSelect = true,
  placeholder = 'Ident-Nr. auswählen...',
  customInputPlaceholder = 'Neue Ident-Nr eingeben...',
  showCustomInput = true,
  searchMode = false, // For FilterPanel - filters as you type
  maxDisplayItems = 3, // How many to show before showing count

  // Styling props
  triggerClassName = '',
  dropdownClassName = '',

  // Special features
  originalIdentnr = null, // Show badge for this identnr
  showSelectedSummary = false, // For FilterPanel
  singleSelectNote = null, // Note text for single select

  // Event handlers
  onDropdownToggle,
  onCustomIdentnrChange,
  onAddCustomIdentnr,
  onToggleSelection,
  onRemoveSelected, // For single select removal

  // Keyboard handlers
  onCustomIdentnrKeyDown
}) => {
  // Filter identnrs based on custom input (for search mode)
  const filteredIdentnrs = React.useMemo(() => {
    if (!searchMode || !customIdentnr.trim()) {
      return allIdentnrs;
    }
    return allIdentnrs.filter(identnr =>
      identnr.toLowerCase().includes(customIdentnr.toLowerCase())
    );
  }, [allIdentnrs, customIdentnr, searchMode]);

  // Display text for the trigger button
  const getDisplayText = () => {
    if (selectedIdentnrs.length === 0) {
      return placeholder;
    }

    if (!multiSelect && selectedIdentnrs.length > 0) {
      return selectedIdentnrs[0];
    }

    if (selectedIdentnrs.length <= maxDisplayItems) {
      return selectedIdentnrs.join(', ');
    }

    return `${selectedIdentnrs.length} Ident-Nr ausgewählt`;
  };

  // Default keyboard handler
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && customIdentnr.trim()) {
      e.preventDefault();
      if (onAddCustomIdentnr) {
        onAddCustomIdentnr();
      }
    }
    if (onCustomIdentnrKeyDown) {
      onCustomIdentnrKeyDown(e);
    }
  };

  return (
    <div className="multi-select-container">
      {/* Trigger Button */}
      <div
        className={`multi-select-header ${triggerClassName}`.trim()}
        onClick={onDropdownToggle}
        style={{
          padding: '8px 12px',
          border: '1px solid var(--border-color, #ddd)',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-secondary, #fff)',
          color: 'var(--text-primary, #333)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          ...(triggerClassName.includes('form-input') ? {} : {})
        }}
      >
        <span>{getDisplayText()}</span>
        <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
      </div>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div
          className={`multi-select-dropdown ${dropdownClassName}`}
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            backgroundColor: 'var(--bg-secondary, #fff)',
            color: 'var(--text-primary, #333)',
            border: '1px solid var(--border-color, #ddd)',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {/* Custom Input Field */}
          {showCustomInput && (
            <div style={{ padding: '8px', borderBottom: '1px solid var(--border-light, #eee)' }}>
              <input
                type="text"
                placeholder={customInputPlaceholder}
                value={customIdentnr}
                onChange={(e) => onCustomIdentnrChange && onCustomIdentnrChange(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  border: '1px solid var(--border-color, #ddd)',
                  borderRadius: '3px',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-secondary, #fff)',
                  color: 'var(--text-primary, #333)'
                }}
                autoFocus
              />
              {!searchMode && customIdentnr.trim() && onAddCustomIdentnr && (
                <button
                  type="button"
                  onClick={onAddCustomIdentnr}
                  style={{
                    marginLeft: '8px',
                    padding: '4px 8px',
                    border: '1px solid #007bff',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Hinzufügen"
                >
                  ✓
                </button>
              )}
            </div>
          )}

          {/* Selected Summary (for FilterPanel) */}
          {showSelectedSummary && selectedIdentnrs.length > 0 && (
            <div style={{ padding: '8px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
              <strong>Ausgewählt:</strong>
              <div style={{ marginTop: '4px' }}>
                {selectedIdentnrs.map(identnr => (
                  <span
                    key={identnr}
                    style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      margin: '2px',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}
                  >
                    {identnr}
                    {onRemoveSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSelected(identnr);
                        }}
                        style={{
                          marginLeft: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title={`${identnr} entfernen`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {singleSelectNote && (
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  {singleSelectNote}
                </small>
              )}
            </div>
          )}

          {/* Separator for existing options */}
          {!searchMode && filteredIdentnrs.length > 0 && showCustomInput && (
            <div style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-light, #eee)', backgroundColor: 'var(--bg-tertiary, #f8f9fa)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #666)' }}>
                Bestehende Ident-Nr auswählen:
              </span>
            </div>
          )}

          {/* Options List */}
          {filteredIdentnrs.length > 0 ? (
            filteredIdentnrs.map(identnr => (
              <label
                key={identnr}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--hover-bg, #f5f5f5)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                className="multi-select-item"
              >
                <input
                  type={multiSelect ? "checkbox" : "radio"}
                  checked={selectedIdentnrs.includes(identnr)}
                  onChange={(e) => {
                    if (multiSelect) {
                      e.stopPropagation();
                    }
                    onToggleSelection && onToggleSelection(identnr);
                  }}
                  onClick={(e) => multiSelect && e.stopPropagation()}
                  style={{ marginRight: '8px' }}
                  className="multi-select-checkbox"
                />
                <span className="multi-select-text">
                  {identnr}
                  {originalIdentnr === identnr && (
                    <span style={{ marginLeft: '4px', color: '#ffc107' }}>⭐</span>
                  )}
                </span>
                {originalIdentnr === identnr && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 6px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                    className="original-badge"
                  >
                    Original
                  </span>
                )}
              </label>
            ))
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', color: '#666' }} className="no-results">
              <em>
                {searchMode
                  ? 'Keine passenden Ident-Nr gefunden'
                  : 'Keine Ident-Nr verfügbar'
                }
              </em>
              {!searchMode && customIdentnr.trim() && (
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                  <small>Enter drücken um "{customIdentnr}" hinzuzufügen</small>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IdentnrMultiSelect;