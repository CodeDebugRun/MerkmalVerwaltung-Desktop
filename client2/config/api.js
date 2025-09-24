// API Configuration - Centralized API base URL management

export const API_CONFIG = {
  // Base URL for backend API
  // For desktop app, always use localhost:3001 regardless of NODE_ENV
  BASE_URL: (typeof window !== 'undefined' && window.location.protocol === 'file:')
    ? 'http://localhost:3001/api'  // Desktop app (file:// protocol)
    : process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_API_URL || 'https://your-production-api.com/api'
      : 'http://localhost:3001/api',

  // API endpoints
  ENDPOINTS: {
    MERKMALSTEXTE: '/merkmalstexte',
    IDENTNRS: '/identnrs',
    FILTER: '/merkmalstexte/filter'
  }
};

// Helper function to build full API URLs
export const getApiUrl = (endpoint = '') => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build API URLs with cache busting for refresh operations
export const getApiUrlWithCacheBust = (endpoint = '') => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

// Default fetch configuration
export const DEFAULT_FETCH_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  }
};