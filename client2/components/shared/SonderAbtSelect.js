import React from 'react';
import { SONDER_ABT_OPTIONS } from '../../utils/sonderAbtUtils';

const SonderAbtSelect = ({
  value,
  onChange,
  className = '',
  placeholder = 'Sonder Abt.: Keine Auswahl',
  includeAll = false, // For filter dropdowns
  ...props
}) => {
  return (
    <select
      value={value}
      onChange={onChange}
      className={className}
      {...props}
    >
      {includeAll && <option value="">Alle</option>}
      {!includeAll && <option value="0">{placeholder}</option>}
      {Object.entries(SONDER_ABT_OPTIONS).map(([optionValue, label]) => {
        // Skip "Keine" if we already have it as placeholder
        if (!includeAll && optionValue === '0') return null;

        return (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        );
      })}
    </select>
  );
};

export default SonderAbtSelect;