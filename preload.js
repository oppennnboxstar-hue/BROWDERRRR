const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getTorStatus: () => ipcRenderer.invoke('get-tor-status'),
  getNewIdentity: () => ipcRenderer.invoke('get-new-identity'),
  onNewTab: (callback) => ipcRenderer.on('new-tab', (event, url) => callback(url))
});
