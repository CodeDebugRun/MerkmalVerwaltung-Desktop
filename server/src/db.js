const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Function to load config from config.json if available, otherwise use .env
function loadDatabaseConfig() {
  console.log('[DB] Current directory:', __dirname);

  // NODE_ENV kontrolü OLMADAN direkt config.json'ı okumaya çalış
  try {
    const configPath = path.join(__dirname, '..', '..', 'config.json');
    console.log('[DB] Looking for config.json at:', configPath);

    const configData = fs.readFileSync(configPath, 'utf8');
    const configJson = JSON.parse(configData);

    if (configJson.database) {
      console.log('[DB] Using database configuration from config.json');
      console.log('[DB] Database config:', {
        server: configJson.database.host,
        database: configJson.database.database,
        port: configJson.database.port,
        useWindowsAuth: configJson.database.useWindowsAuth
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
    console.log('[DB] Config.json not found or invalid, using .env file');
  }

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