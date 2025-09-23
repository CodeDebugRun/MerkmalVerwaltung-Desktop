/**
 * Input validation utilities
 * Provides validation functions for request data
 */

// Helper functions
const isEmpty = (value) => {
  return value === null || value === undefined || value.trim() === '';
};

const isValidNumber = (value) => {
  return !isNaN(parseInt(value)) && parseInt(value) >= 0;
};

const isValidString = (value, minLength = 1, maxLength = 255) => {
  if (isEmpty(value)) return false;
  return value.length >= minLength && value.length <= maxLength;
};

// Main validation function for Merkmalstexte
const validateMerkmalstexte = (data, isUpdate = false) => {
  const errors = [];

  // Required fields validation
  if (!isUpdate || data.identnr !== undefined) {
    if (isEmpty(data.identnr)) {
      errors.push('Identnr ist erforderlich');
    } else if (!isValidString(data.identnr, 1, 50)) {
      errors.push('Identnr muss zwischen 1 und 50 Zeichen lang sein');
    }
  }

  if (!isUpdate || data.merkmal !== undefined) {
    if (isEmpty(data.merkmal)) {
      errors.push('Merkmal ist erforderlich');
    } else if (!isValidString(data.merkmal, 1, 100)) {
      errors.push('Merkmal muss zwischen 1 und 100 Zeichen lang sein');
    }
  }

  if (!isUpdate || data.auspraegung !== undefined) {
    if (isEmpty(data.auspraegung)) {
      errors.push('Ausprägung ist erforderlich');
    } else if (!isValidString(data.auspraegung, 1, 100)) {
      errors.push('Ausprägung muss zwischen 1 und 100 Zeichen lang sein');
    }
  }

  if (!isUpdate || data.drucktext !== undefined) {
    if (isEmpty(data.drucktext)) {
      errors.push('Drucktext ist erforderlich');
    } else if (!isValidString(data.drucktext, 1, 255)) {
      errors.push('Drucktext muss zwischen 1 und 255 Zeichen lang sein');
    }
  }

  // Optional fields validation
  if (data.sondermerkmal !== undefined && data.sondermerkmal !== '') {
    if (!isValidString(data.sondermerkmal, 0, 100)) {
      errors.push('Sondermerkmal darf maximal 100 Zeichen lang sein');
    }
  }

  if (data.position !== undefined && data.position !== '') {
    if (!isValidNumber(data.position)) {
      errors.push('Position muss eine gültige Zahl sein');
    }
  }

  if (data.sonderAbt !== undefined && data.sonderAbt !== '') {
    if (!isValidNumber(data.sonderAbt)) {
      errors.push('Sonder Abt. muss eine gültige Zahl sein');
    }
  }

  if (data.fertigungsliste !== undefined && data.fertigungsliste !== '') {
    if (!isValidNumber(data.fertigungsliste)) {
      errors.push('Fertigungsliste muss eine gültige Zahl sein');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate ID parameter
const validateId = (id) => {
  if (!id || !isValidNumber(id)) {
    return {
      isValid: false,
      errors: ['Ungültige ID']
    };
  }
  
  return {
    isValid: true,
    errors: []
  };
};

module.exports = {
  validateMerkmalstexte,
  validateId,
  isEmpty,
  isValidNumber,
  isValidString
};