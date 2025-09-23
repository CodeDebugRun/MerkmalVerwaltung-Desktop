// Shared utilities for Sonder Abteilung (Special Department) functionality

export const SONDER_ABT_OPTIONS = {
  0: 'Keine',
  1: '1 - schwarz',
  2: '2 - blau',
  3: '3 - rot',
  4: '4 - orange',
  5: '5 - grün',
  6: '6 - weiss',
  7: '7 - gelb'
};

/**
 * Get display text for Sonder Abteilung value
 * @param {number|string} value - The sonder abt value (0-7)
 * @returns {string} Display text for the value
 */
export const getSonderAbtDisplay = (value) => {
  return SONDER_ABT_OPTIONS[value] || 'Unbekannt';
};

/**
 * Get all sonder abt options as array for select components
 * @returns {Array} Array of {value, label} objects
 */
export const getSonderAbtOptionsArray = () => {
  return Object.entries(SONDER_ABT_OPTIONS).map(([value, label]) => ({
    value,
    label
  }));
};