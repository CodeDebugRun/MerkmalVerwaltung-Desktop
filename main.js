const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const fs = require('fs').promises;

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
    : `file://${path.join(__dirname, 'client2/out/index.html')}`;

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

// Configuration management
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Default database configuration
const DEFAULT_DB_CONFIG = {
  host: 'localhost',
  port: '1433',
  database: 'LebodoorsDB',
  user: '',
  password: '',
  useWindowsAuth: true
};

// Load configuration from file
async function loadDatabaseConfig() {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    return { ...DEFAULT_DB_CONFIG, ...config.database };
  } catch (error) {
    // If config file doesn't exist or is invalid, return defaults
    console.log('Config file not found, using defaults:', error.message);
    return DEFAULT_DB_CONFIG;
  }
}

// Save configuration to file
async function saveDatabaseConfig(dbConfig) {
  try {
    let config = {};

    // Try to load existing config first
    try {
      const existingConfigData = await fs.readFile(CONFIG_FILE, 'utf8');
      config = JSON.parse(existingConfigData);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty config
      config = {};
    }

    // Update database section
    config.database = dbConfig;

    // Write to file
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('Database configuration saved to:', CONFIG_FILE);

    return { success: true, message: 'Konfiguration erfolgreich gespeichert' };
  } catch (error) {
    console.error('Failed to save configuration:', error);
    throw new Error('Fehler beim Speichern der Konfiguration: ' + error.message);
  }
}

// Test database connection
async function testDatabaseConnection(dbConfig) {
  return new Promise((resolve) => {
    // Create a test script that tries to connect to the database
    const testScript = `
      const sql = require('mssql');

      const config = {
        server: '${dbConfig.host}',
        database: '${dbConfig.database}',
        port: parseInt('${dbConfig.port}'),
        connectionTimeout: 5000,
        requestTimeout: 5000,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true
        }
      };

      if (${dbConfig.useWindowsAuth}) {
        config.options.trustedConnection = true;
      } else {
        config.user = '${dbConfig.user}';
        config.password = '${dbConfig.password}';
        config.options.trustedConnection = false;
      }

      sql.connect(config)
        .then(pool => {
          console.log('SUCCESS: Database connection successful');
          pool.close();
          process.exit(0);
        })
        .catch(err => {
          console.log('ERROR: ' + err.message);
          process.exit(1);
        });
    `;

    // Write test script to temporary file
    const testScriptPath = path.join(__dirname, 'temp-db-test.js');
    require('fs').writeFileSync(testScriptPath, testScript);

    // Execute test script
    const testProcess = spawn('node', [testScriptPath], {
      cwd: path.join(__dirname, 'server'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    testProcess.on('close', (code) => {
      // Clean up test script
      try {
        require('fs').unlinkSync(testScriptPath);
      } catch (cleanupError) {
        console.log('Failed to cleanup test script:', cleanupError.message);
      }

      if (code === 0 && output.includes('SUCCESS')) {
        resolve({
          success: true,
          message: 'Datenbankverbindung erfolgreich!'
        });
      } else {
        const errorMessage = errorOutput || output || 'Unbekannter Verbindungsfehler';
        resolve({
          success: false,
          message: 'Verbindung fehlgeschlagen: ' + errorMessage.replace('ERROR: ', '').trim()
        });
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      testProcess.kill();
      resolve({
        success: false,
        message: 'Verbindungstest-Timeout (10 Sekunden)'
      });
    }, 10000);
  });
}

// IPC Handlers
ipcMain.handle('get-database-config', async () => {
  try {
    return await loadDatabaseConfig();
  } catch (error) {
    console.error('Failed to load database config:', error);
    return DEFAULT_DB_CONFIG;
  }
});

ipcMain.handle('save-database-config', async (event, config) => {
  try {
    return await saveDatabaseConfig(config);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('test-database-connection', async (event, config) => {
  try {
    return await testDatabaseConnection(config);
  } catch (error) {
    return {
      success: false,
      message: 'Test fehlgeschlagen: ' + error.message
    };
  }
});