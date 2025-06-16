const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
     preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('panelprincipal.html'); // panelprincipal.html will be in the same folder
  // mainWindow.webContents.openDevTools(); // Uncomment for debugging during development
}

app.whenReady().then(() => {
  // Detect platform and choose Python command
  const isWin = process.platform === 'win32';
  const pythonCmd = isWin ? 'python' : 'python3';

  // Start backend process (app.py will be in the same folder)
  backendProcess = spawn(pythonCmd, ['app.py'], {
    cwd: __dirname, // Current working directory is the app's root
    shell: isWin // shell only needed on Windows for some commands
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend exited with code ${code}`);
    // Optional: show a message if backend exits unexpectedly
    if (code !== 0) {
      console.error('Backend exited with error code:', code);
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill(); // Ensure backend process is killed on app close
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
