const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you need for communication between main and renderer process
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,

  // Example: if you need to communicate with main process
  // sendMessage: (message) => ipcRenderer.invoke('message', message),
  // onMessage: (callback) => ipcRenderer.on('message', callback)
});