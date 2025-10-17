const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you need for communication between main and renderer process
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,

  // Database configuration APIs
  getDatabaseConfig: () => ipcRenderer.invoke('get-database-config'),
  saveDatabaseConfig: (config) => ipcRenderer.invoke('save-database-config', config),
  testDatabaseConnection: (config) => ipcRenderer.invoke('test-database-connection', config),

  // API configuration
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),

  // Example: if you need to communicate with main process
  // sendMessage: (message) => ipcRenderer.invoke('message', message),
  // onMessage: (callback) => ipcRenderer.on('message', callback)
});