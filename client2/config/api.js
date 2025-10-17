// API Configuration - Centralized API base URL management

// Cache for API config
let cachedApiConfig = null;

// Get API configuration from Electron main process
const getApiConfig = async () => {
  // Use cached config if available
  if (cachedApiConfig) {
    return cachedApiConfig;
  }

  // Check if we're in Electron environment
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getApiConfig) {
    try {
      cachedApiConfig = await window.electronAPI.getApiConfig();
      console.log('API Config loaded from Electron:', cachedApiConfig);
      return cachedApiConfig;
    } catch (error) {
      console.error('Failed to get API config from Electron:', error);
    }
  }

  // Fallback to defaults
  return {
    host: 'localhost',
    port: '3001',
    useSSL: false
  };
};

// Get the API base URL based on environment
const getBaseUrl = async () => {
  // For desktop app (file:// protocol or Electron)
  if (typeof window !== 'undefined' &&
      (window.location.protocol === 'file:' || window.electronAPI)) {

    const config = await getApiConfig();
    const protocol = config.useSSL ? 'https' : 'http';
    return `${protocol}://${config.host}:${config.port}/api`;
  }

  // For web deployment (not Electron)
  return process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL || 'https://your-production-api.com/api'
    : 'http://localhost:3001/api';
};

// Initialize base URL on first load
let baseUrlPromise = null;

export const API_CONFIG = {
  // Base URL for backend API - dynamically determined
  get BASE_URL() {
    // Return the promise to handle async nature
    if (!baseUrlPromise) {
      baseUrlPromise = getBaseUrl();
    }
    return baseUrlPromise;
  },

  // API endpoints
  ENDPOINTS: {
    MERKMALSTEXTE: '/merkmalstexte',
    IDENTNRS: '/identnrs',
    FILTER: '/merkmalstexte/filter'
  }
};

// Helper function to build full API URLs
export const getApiUrl = async (endpoint = '') => {
  const baseUrl = await API_CONFIG.BASE_URL;
  return `${baseUrl}${endpoint}`;
};

// Helper function to build API URLs with cache busting for refresh operations
export const getApiUrlWithCacheBust = async (endpoint = '') => {
  const baseUrl = await API_CONFIG.BASE_URL;
  const url = `${baseUrl}${endpoint}`;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

// Synchronous helper for immediate use (uses cached value)
export const getApiUrlSync = (endpoint = '') => {
  // If baseUrlPromise is resolved, we can get the value synchronously
  // Otherwise, return localhost as fallback
  if (typeof window !== 'undefined' && window._cachedApiBaseUrl) {
    return `${window._cachedApiBaseUrl}${endpoint}`;
  }
  return `http://localhost:3001/api${endpoint}`;
};

// Initialize API config on load
if (typeof window !== 'undefined') {
  API_CONFIG.BASE_URL.then(url => {
    window._cachedApiBaseUrl = url;
  });
}

// Default fetch configuration
export const DEFAULT_FETCH_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  }
};