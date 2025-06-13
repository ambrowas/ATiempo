const { contextBridge } = require('electron');

console.log('Preload script loading...'); // Diagnostic log

// Provide a simple, hardcoded server URL for now, as 'os' module causes issues.
// If you need dynamic IP, you'll have to get it from the main process.
contextBridge.exposeInMainWorld('network', {
  getServerUrl: () => `http://127.0.0.1:5000` // Hardcoded to localhost for now
});

console.log('Preload script loaded successfully!'); // Diagnostic log