const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

// Set command line switches before app is ready
// These must be set after app is imported but before any other operations
if (app && app.commandLine) {
  // Disable certificate errors and SSL verification
  app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
  app.commandLine.appendSwitch('ignore-ssl-errors', 'true');
  app.commandLine.appendSwitch('allow-insecure-localhost', 'true');
  app.commandLine.appendSwitch('disable-web-security');
  app.commandLine.appendSwitch('allow-running-insecure-content', 'true');

  // Disable GPU for network drive compatibility
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
}

// Keep a global reference of the window object
let mainWindow;
let serverProcess;

// Backend server configuration
const SERVER_PORT = 3001;
const CLIENT_PORT = 3000;

// Configuration management - moved here to be available in startBackendServer
// In production, save config next to the executable for persistence
const CONFIG_FILE = app.isPackaged
  ? path.join(path.dirname(app.getPath('exe')), 'config.json')
  : path.join(__dirname, 'config.json');

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // Disable security for local development
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add your icon
    title: 'Merkmal Verwaltung'
  });

  // Create application menu
  createApplicationMenu();

  // Load the app - Works for both local and network drives
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${CLIENT_PORT}`);
  } else {
    // Use loadFile for better compatibility (works on both local and network drives)
    const indexPath = path.join(__dirname, 'client2', 'out', 'index.html');
    console.log('Loading index from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
      // Fallback to URL method if loadFile fails
      mainWindow.loadURL(`file://${indexPath}`);
    });
  }

  // Don't open DevTools automatically

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        {
          label: 'Open Console',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            if (mainWindow) {
              if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
              } else {
                mainWindow.webContents.openDevTools();
              }
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom + 1);
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom - 1);
            }
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0);
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Über Merkmal Verwaltung',
              message: 'Merkmal Verwaltung v1.0.0',
              detail: 'Eine Desktop-Anwendung zur Verwaltung von Produktmerkmalen.\n\n' +
                     'Funktionen:\n' +
                     '• Merkmalverwaltung für Produkte\n' +
                     '• Datenbankverbindung zu SQL Server\n' +
                     '• Benutzerfreundliche Oberfläche\n' +
                     '• Sichere Datenverwaltung\n\n' +
                     '© 2025 Lebodoors',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  // On macOS, add application menu
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + app.getName(),
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Cmd+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function startBackendServer() {
  console.log('Starting backend server...');

  // In production, use Electron's Node.js runtime
  // In development, use system Node.js
  if (isDev) {
    // Development mode - use regular node
    serverProcess = spawn('node', ['src/server.js'], {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: SERVER_PORT,
        ENABLE_HTTPS: 'false'
      },
      cwd: path.join(__dirname, 'server'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } else {
    // Production mode - use Electron's built-in Node.js
    console.log('[MAIN] Starting backend server in production mode...');
    const { fork } = require('child_process');
    const serverPath = path.join(__dirname, 'server', 'src', 'server.js');
    console.log('[MAIN] Server path:', serverPath);

    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: SERVER_PORT,
        ENABLE_HTTPS: 'false',
        ELECTRON_RUN_AS_NODE: '1',
        CONFIG_PATH: CONFIG_FILE
      },
      silent: true
    });

    // Handle output in production
    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', (data) => {
        const cleanedData = data.toString()
          .replace(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '')
          .replace(/[^\x00-\x7F]/g, (char) => {
            const replacements = {
              'ü': 'ue', 'ö': 'oe', 'ä': 'ae', 'Ü': 'Ue', 'Ö': 'Oe', 'Ä': 'Ae',
              'ş': 's', 'ı': 'i', 'ğ': 'g', 'Ş': 'S', 'İ': 'I', 'Ğ': 'G',
              'ç': 'c', 'Ç': 'C'
            };
            return replacements[char] || '';
          });
        console.log(`[SERVER] ${cleanedData.trim()}`);
      });
    }

    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER ERROR] ${data}`);
      });
    }

    serverProcess.on('error', (error) => {
      console.error('[MAIN] Failed to start server:', error);
    });

    serverProcess.on('close', (code) => {
      console.log(`[MAIN] Server process exited with code ${code}`);
      if (code !== 0) {
        console.error('[MAIN] Server crashed! Check server logs.');
      }
    });

    return; // Exit early for production
  }

  serverProcess.stdout.on('data', (data) => {
    // Remove emoji characters for better Windows terminal compatibility
    const cleanedData = data.toString()
      .replace(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '') // Remove emojis
      .replace(/[^\x00-\x7F]/g, (char) => {
        // Replace special characters with their ASCII equivalents
        const replacements = {
          'ü': 'ue', 'ö': 'oe', 'ä': 'ae', 'Ü': 'Ue', 'Ö': 'Oe', 'Ä': 'Ae',
          'ş': 's', 'ı': 'i', 'ğ': 'g', 'Ş': 'S', 'İ': 'I', 'Ğ': 'G',
          'ç': 'c', 'Ç': 'C', '─': '-', '│': '|', '├': '+', '└': 'L',
          '≡': '=', '∩': 'n', '╕': '+', '╗': '+', '╝': '+', '╚': 'L',
          '╔': '+', '║': '|', '╣': '+', '╬': '+', '╩': '+', '╦': '+',
          '╠': '+', '═': '=', 'ñ': 'n', 'á': 'a', 'é': 'e', 'í': 'i',
          'ó': 'o', 'ú': 'u', 'ß': 'ss'
        };
        return replacements[char] || '';
      });
    console.log(`[SERVER] ${cleanedData.trim()}`);
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
app.whenReady().then(async () => {
  // Disable SSL certificate verification for all sessions
  session.defaultSession.setCertificateVerifyProc((_request, callback) => {
    // Always allow certificates (development only)
    callback(0);
  });

  // IMPORTANT: Load config BEFORE starting backend
  // This ensures backend can read the config file
  try {
    await loadDatabaseConfig();
    console.log('[MAIN] Initial config loaded/created');
  } catch (error) {
    console.log('[MAIN] Config initialization error:', error);
  }

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


// Default database configuration
const DEFAULT_DB_CONFIG = {
  host: 'localhost',
  port: '1433',
  database: 'LebodoorsDB',
  user: '',
  password: '',
  useWindowsAuth: true
};

// Default API configuration
const DEFAULT_API_CONFIG = {
  host: 'localhost',
  port: '3001',
  useSSL: false
};

// Load configuration from file
async function loadDatabaseConfig() {
  try {
    console.log('[MAIN] Loading config from:', CONFIG_FILE);
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    console.log('[MAIN] Config loaded successfully');
    return { ...DEFAULT_DB_CONFIG, ...config.database };
  } catch (error) {
    // If config file doesn't exist or is invalid, return defaults
    console.log('[MAIN] Config file not found at:', CONFIG_FILE);
    console.log('[MAIN] Using default configuration');
    return DEFAULT_DB_CONFIG;
  }
}

// Load API configuration
async function loadApiConfig() {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    // Backend ALWAYS runs locally in Electron app
    // Never use database host for API
    return {
      ...DEFAULT_API_CONFIG,
      host: 'localhost', // Always localhost for Electron app
      port: '3001'
    };
  } catch (error) {
    return DEFAULT_API_CONFIG;
  }
}

// Save configuration to file
async function saveDatabaseConfig(dbConfig) {
  try {
    console.log('[MAIN] Saving config to:', CONFIG_FILE);

    // Ensure directory exists (important for production)
    const configDir = path.dirname(CONFIG_FILE);
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch (e) {
      // Directory might already exist, that's okay
    }

    let config = {};

    // Try to load existing config first
    try {
      const existingConfigData = await fs.readFile(CONFIG_FILE, 'utf8');
      config = JSON.parse(existingConfigData);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty config
      console.log('[MAIN] No existing config found, creating new one');
      config = {};
    }

    // Update database section
    config.database = dbConfig;

    // Write to file
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('[MAIN] Database configuration saved successfully to:', CONFIG_FILE);

    return { success: true, message: 'Konfiguration erfolgreich gespeichert' };
  } catch (error) {
    console.error('[MAIN] Failed to save configuration:', error);
    throw new Error('Fehler beim Speichern der Konfiguration: ' + error.message);
  }
}

// Test database connection (simplified version - only validates form input)
async function testDatabaseConnection(dbConfig) {
  // Form validasyonu
  if (!dbConfig.host || !dbConfig.database || !dbConfig.port) {
    return {
      success: false,
      message: 'Bitte füllen Sie alle Pflichtfelder aus (Server, Datenbank, Port)'
    };
  }

  if (!dbConfig.useWindowsAuth && (!dbConfig.user || !dbConfig.password)) {
    return {
      success: false,
      message: 'Bitte geben Sie Benutzername und Passwort ein'
    };
  }

  return {
    success: true,
    message: 'Konfiguration gültig. Bitte speichern Sie die Einstellungen und starten Sie die Anwendung neu.'
  };
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

ipcMain.handle('get-api-config', async () => {
  try {
    return await loadApiConfig();
  } catch (error) {
    console.error('Failed to load API config:', error);
    return DEFAULT_API_CONFIG;
  }
});

ipcMain.handle('save-database-config', async (event, config) => {
  try {
    const result = await saveDatabaseConfig(config);

    // IMPORTANT: Restart backend with new config
    console.log('[MAIN] Config saved, restarting backend server...');
    stopBackendServer();

    // Wait a bit for server to fully stop
    setTimeout(() => {
      startBackendServer();
      console.log('[MAIN] Backend server restarted with new config');
    }, 1000);

    return result;
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