import React, { useEffect } from 'react';
import IdentnrMultiSelect from './shared/IdentnrMultiSelect';

const MerkmalForm = ({
  showForm,
  editingItem,
  formData,
  selectedIdentnrs,
  showIdentnrDropdown,
  customIdentnr,
  filteredIdentnrs,
  originalRecord,
  operationLoading,
  copiedGroupData,
  onSubmit,
  onInputChange,
  onDropdownToggle,
  onCustomIdentnrChange,
  onCustomIdentnrKeyDown,
  onAddCustomIdentnr,
  onToggleIdentnrSelection,
  onCancel
}) => {
  // Note: Click outside handling is now done in the main page component

  if (!showForm) {
    return null;
  }

  return (
    <section className="form-section">
      <div className="form-header">
        <h3>{editingItem ? '✏️ Datensatz bearbeiten' : '➕ Neuen Datensatz hinzufügen'}</h3>
      </div>
      <form onSubmit={onSubmit} className="data-form">
        <div className="form-row">
          {/* Multi-Select Ident-Nr Dropdown */}
          <div style={{ position: 'relative' }}>
            <IdentnrMultiSelect
              selectedIdentnrs={selectedIdentnrs}
              allIdentnrs={filteredIdentnrs}
              showDropdown={showIdentnrDropdown}
              customIdentnr={customIdentnr}
              multiSelect={true}
              placeholder="Ident-Nr. auswählen oder eingeben *"
              customInputPlaceholder="Neue Ident-Nr eingeben..."
              showCustomInput={true}
              searchMode={false}
              maxDisplayItems={3}
              triggerClassName="form-input form-identnr-dropdown-trigger"
              dropdownClassName="form-identnr-dropdown-menu"
              originalIdentnr={editingItem ? originalRecord?.identnr : null}
              onDropdownToggle={onDropdownToggle}
              onCustomIdentnrChange={onCustomIdentnrChange}
              onAddCustomIdentnr={onAddCustomIdentnr}
              onToggleSelection={onToggleIdentnrSelection}
              onCustomIdentnrKeyDown={onCustomIdentnrKeyDown}
            />
          </div>

          {/* Merkmal Input */}
          <input
            type="text"
            placeholder="Merkmal *"
            value={formData.merkmal}
            onChange={(e) => onInputChange('merkmal', e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder="Ausprägung *"
            value={formData.auspraegung}
            onChange={(e) => onInputChange('auspraegung', e.target.value)}
            required
            className="form-input"
          />
          <input
            type="text"
            placeholder="Drucktext *"
            value={formData.drucktext}
            onChange={(e) => onInputChange('drucktext', e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder="Sondermerkmal"
            value={formData.sondermerkmal}
            onChange={(e) => onInputChange('sondermerkmal', e.target.value)}
            className="form-input"
          />
          <input
            type="number"
            placeholder="Position"
            value={formData.position}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow positive integers
              if (value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0)) {
                onInputChange('position', value);
              }
            }}
            min="0"
            step="1"
            className="form-input"
          />
        </div>

        <div className="form-row">
          <select
            value={formData.sonderAbt}
            onChange={(e) => onInputChange('sonderAbt', e.target.value)}
            className="form-input"
          >
            <option value="0">Sonder Abt.: Keine Auswahl</option>
            <option value="1">1 - schwarz</option>
            <option value="2">2 - blau</option>
            <option value="3">3 - rot</option>
            <option value="4">4 - orange</option>
            <option value="5">5 - grün</option>
            <option value="6">6 - weiss</option>
            <option value="7">7 - gelb</option>
          </select>
          <select
            value={formData.fertigungsliste}
            onChange={(e) => onInputChange('fertigungsliste', e.target.value)}
            className="form-input"
          >
            <option value="0">Fertigungsliste: Nein</option>
            <option value="1">Fertigungsliste: Ja</option>
          </select>
        </div>

        <div className="form-buttons">
          <button
            type="submit"
            className="btn btn-success"
            disabled={operationLoading.create || operationLoading.update}
          >
            {operationLoading.create || operationLoading.update
              ? '⏳ Verarbeitung...'
              : (editingItem ? '💾 Aktualisieren' : '➕ Hinzufügen')
            }
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={operationLoading.create || operationLoading.update}
          >
            ❌ Abbrechen
          </button>
        </div>
      </form>
    </section>
  );
};

export default MerkmalForm;