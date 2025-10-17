const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Function to load config from config.json if available, otherwise use .env
function loadDatabaseConfig() {
  console.log('[DB] Current directory:', __dirname);
  console.log('[DB] Process CWD:', process.cwd());

  // Try multiple possible locations for config.json
  const possiblePaths = [
    // HIGHEST PRIORITY: Use CONFIG_PATH from environment if provided
    process.env.CONFIG_PATH,
    // For Electron production - go up from resources/app/server/src
    path.join(__dirname, '..', '..', '..', '..', 'config.json'),
    path.join(__dirname, '..', '..', '..', '..', '..', 'config.json'),
    // Try process working directory
    path.join(process.cwd(), 'config.json'), // Root of running process
    path.join(process.cwd(), '..', 'config.json'), // One level up
    path.join(__dirname, '..', '..', 'config.json'), // Two levels up from src
    path.join(__dirname, '..', '..', '..', 'config.json'), // Three levels up (for production)
    // Note: process.resourcesPath is not available in Node.js context
    // These paths will be handled by other checks
    // For packaged Electron apps - look next to the executable
    process.platform === 'win32' && process.env.PORTABLE_EXECUTABLE_DIR
      ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'config.json')
      : null,
    // Check app data directory
    process.env.APPDATA ? path.join(process.env.APPDATA, 'merkmal-verwaltung', 'config.json') : null,
    // For production builds
    path.join(path.dirname(process.execPath || process.argv[0]), 'config.json')
  ].filter(p => p !== null); // Remove null paths

  // Try each path until we find config.json
  for (const configPath of possiblePaths) {
    if (!configPath) continue; // Skip null/undefined paths

    try {
      console.log('[DB] Trying config.json at:', configPath);

      // Try to read the file directly without existsSync check
      let configData;
      try {
        configData = fs.readFileSync(configPath, 'utf8');
      } catch (readError) {
        // File doesn't exist or can't be read, continue to next path
        continue;
      }

      const configJson = JSON.parse(configData);

      if (configJson.database) {
        console.log('[DB] ✓ Found config.json at:', configPath);
        console.log('[DB] ✓ Using database configuration from config.json');
        console.log('[DB] Database config:', {
          server: configJson.database.host,
          database: configJson.database.database,
          port: configJson.database.port,
          useWindowsAuth: configJson.database.useWindowsAuth,
          user: configJson.database.user ? '***' : undefined
        });

        return {
          server: configJson.database.host,
          database: configJson.database.database,
          port: parseInt(configJson.database.port),
          user: configJson.database.useWindowsAuth ? undefined : configJson.database.user,
          password: configJson.database.useWindowsAuth ? undefined : configJson.database.password,
          connectionTimeout: 30000,
          requestTimeout: 30000,
          pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
          },
          options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            trustedConnection: configJson.database.useWindowsAuth
          }
        };
      }
    } catch (error) {
      console.log('[DB] Error reading config at', configPath, ':', error.message);
      continue;
    }
  }

  console.log('[DB] Config.json not found in any location, using .env file');

  // Fallback to .env configuration
  console.log('[DB] Using database configuration from .env file');

  // Grundlegende Konfiguration erstellen
  const config = {
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };

  // Authentifizierungstyp basierend auf .env-Datei festlegen
  if (process.env.DB_USER) {
    // Falls DB_USER gefüllt ist, wird SQL Server Authentication verwendet
    config.user = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
    config.options.trustedConnection = false;
  } else {
    // Falls DB_USER leer ist, wird Windows Authentication verwendet
    config.options.trustedConnection = true;
  }

  return config;
}

const config = loadDatabaseConfig();

// Connection Pool erstellen und Verbindung versuchen
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('[DB] SQL Server\'a başarıyla bağlanıldı.');
    return pool;
  })
  .catch(err => {
    console.error('[DB] Veritabanı bağlantı hatası: ', err);
    throw err; // Re-throw error to properly handle it
  });

module.exports = {
  sql, poolPromise
};