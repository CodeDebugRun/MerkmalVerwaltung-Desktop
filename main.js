const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

// Keep a global reference of the window object
let mainWindow;
let serverProcess;

// Backend server configuration
const SERVER_PORT = 3001;
const CLIENT_PORT = 3000;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add your icon
    title: 'Merkmal Verwaltung'
  });

  // Remove menu bar in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Load the app
  const startUrl = isDev
    ? `http://localhost:${CLIENT_PORT}`
    : `file://${path.join(__dirname, 'client2/.next/server/pages/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackendServer() {
  console.log('Starting backend server...');

  // Start the Express server
  const serverScript = path.join(__dirname, 'server/src/app.js');

  serverProcess = spawn('node', [serverScript], {
    env: {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production',
      PORT: SERVER_PORT
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[SERVER] ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR] ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

function stopBackendServer() {
  if (serverProcess) {
    console.log('Stopping backend server...');
    serverProcess.kill();
    serverProcess = null;
  }
}

// App event listeners
app.whenReady().then(() => {
  // Start backend server first
  startBackendServer();

  // Wait a bit for server to start, then create window
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackendServer();
});

// Handle app termination
process.on('SIGINT', () => {
  stopBackendServer();
  app.quit();
});

process.on('SIGTERM', () => {
  stopBackendServer();
  app.quit();
});