import React, { useEffect } from 'react';
import IdentnrMultiSelect from './shared/IdentnrMultiSelect';

const FilterPanel = ({
  showFilters,
  filterData,
  selectedFilterIdentnrs,
  showFilterIdentnrDropdown,
  customFilterIdentnr,
  filteredFilterIdentnrs,
  loading,
  onFilterChange,
  onDropdownToggle,
  onCustomFilterIdentnrChange,
  onToggleFilterIdentnrSelection,
  onRemoveFilterIdentnr,
  onSearch,
  onClearFilters
}) => {
  // Note: Click outside handling is now done in the main page component

  if (!showFilters) {
    return null;
  }

  return (
    <section className="form-section">
      <h3>🔍 Datensätze Filter</h3>
      <div className="data-form">
        <div className="form-row">
          {/* Multi-Select Ident-Nr Filter */}
          <div className="filter-group">
            <label>Ident-Nr</label>
            <div style={{ position: 'relative' }}>
              <IdentnrMultiSelect
                selectedIdentnrs={selectedFilterIdentnrs}
                allIdentnrs={filteredFilterIdentnrs}
                showDropdown={showFilterIdentnrDropdown}
                customIdentnr={customFilterIdentnr}
                multiSelect={false}
                placeholder="Ident-Nr. auswählen"
                customInputPlaceholder="Ident-Nr suchen..."
                showCustomInput={true}
                searchMode={true}
                maxDisplayItems={1}
                triggerClassName="filter-input filter-identnr-dropdown-trigger"
                dropdownClassName="filter-identnr-dropdown-menu"
                showSelectedSummary={true}
                singleSelectNote="Hinweis: Nur eine Ident-Nr kann gleichzeitig gefiltert werden."
                onDropdownToggle={onDropdownToggle}
                onCustomIdentnrChange={onCustomFilterIdentnrChange}
                onToggleSelection={onToggleFilterIdentnrSelection}
                onRemoveSelected={onRemoveFilterIdentnr}
              />
            </div>
          </div>

          {/* Other filter inputs */}
          <div className="filter-group">
            <label>Merkmal</label>
            <input
              type="text"
              placeholder="Merkmal eingeben..."
              value={filterData.merkmal}
              onChange={(e) => onFilterChange('merkmal', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label>Ausprägung</label>
            <input
              type="text"
              placeholder="Ausprägung eingeben..."
              value={filterData.auspraegung}
              onChange={(e) => onFilterChange('auspraegung', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Drucktext</label>
            <input
              type="text"
              placeholder="Drucktext eingeben..."
              value={filterData.drucktext}
              onChange={(e) => onFilterChange('drucktext', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label>Sondermerkmal</label>
            <input
              type="text"
              placeholder="Sondermerkmal eingeben..."
              value={filterData.sondermerkmal}
              onChange={(e) => onFilterChange('sondermerkmal', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Position</label>
            <input
              type="number"
              placeholder="Position eingeben..."
              value={filterData.position}
              onChange={(e) => onFilterChange('position', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label>Sonder Abt</label>
            <select
              value={filterData.sonderAbt}
              onChange={(e) => onFilterChange('sonderAbt', e.target.value)}
              className="filter-input"
            >
              <option value="">Alle</option>
              <option value="0">Keine</option>
              <option value="1">1 - schwarz</option>
              <option value="2">2 - blau</option>
              <option value="3">3 - rot</option>
              <option value="4">4 - orange</option>
              <option value="5">5 - grün</option>
              <option value="6">6 - weiss</option>
              <option value="7">7 - gelb</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Fertigungsliste</label>
            <select
              value={filterData.fertigungsliste}
              onChange={(e) => onFilterChange('fertigungsliste', e.target.value)}
              className="filter-input"
            >
              <option value="">Alle</option>
              <option value="1">Ja</option>
              <option value="0">Nein</option>
            </select>
          </div>
        </div>

        <div className="form-buttons">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSearch}
            disabled={loading}
          >
            {loading ? '⏳ Suche läuft...' : '🔍 Suchen'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClearFilters}
          >
            🗑️ Löschen
          </button>
        </div>
      </div>

    </section>
  );
};

export default FilterPanel;