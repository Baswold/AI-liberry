const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Backend communication
  startCatalogBuild: (directoryPath, aiConfig) => 
    ipcRenderer.invoke('start-catalog-build', directoryPath, aiConfig),
  getCatalogProgress: () => 
    ipcRenderer.invoke('get-catalog-progress'),
  searchFiles: (query) => 
    ipcRenderer.invoke('search-files', query),
  openFile: (filePath) => 
    ipcRenderer.invoke('open-file', filePath),
  
  // Configuration
  saveConfig: (config) => 
    ipcRenderer.invoke('save-config', config),
  loadConfig: () => 
    ipcRenderer.invoke('load-config')
});

