const { contextBridge } = require('electron');
// const os = require('os'); // REMOVE THIS LINE

console.log('Preload script loading...'); // Diagnostic log

// REMOVE getLocalIPAddress function
// REMOVE contextBridge.exposeInMainWorld('network', ...) related to getServerUrl
// ONLY leave this if you want to expose other APIs later
// contextBridge.exposeInMainWorld('myAPI', {
//   // any other secure APIs you might want to expose
// });

// We are no longer exposing 'network' via contextBridge for getServerUrl directly from preload.js
// The IP will be read from the URL in renderer.js.

console.log('Preload script loaded successfully!'); // Diagnostic log