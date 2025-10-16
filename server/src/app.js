const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
// const rateLimit = require('express-rate-limit'); // DEAKTIVIERT für Entwicklung
const { poolPromise } = require('./db');
const errorHandler = require('./middleware/errorHandler');
const { formatSuccess, formatError } = require('./utils/responseFormatter');
const connectionManager = require('./utils/connectionManager');
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting (KOMPLETT DEAKTIVIERT für Entwicklung)
console.log('⚠️  Rate limiting komplett deaktiviert für Entwicklung');
// const limiter = rateLimit({
//   windowMs: 1 * 60 * 1000,
//   max: 100,
//   message: formatError('Zu viele Anfragen, bitte warten Sie.'),
//   standardHeaders: true,
//   legacyHeaders: false
// });
// app.use(limiter);

// Database health check middleware
app.use('/api', connectionManager.healthCheckMiddleware());

app.use(express.json());

// Routen importieren
const merkmalstexteRoutes = require('./routes/merkmalstexteRoutes');
const groupedRoutes = require('./routes/groupedRoutes');
const identnrRoutes = require('./routes/identnrRoutes');

// Test endpoint
app.get('/', (req, res) => {
  res.json(formatSuccess(null, 'API läuft erfolgreich!'));
});

// Database test endpoint
app.get('/db-test', async (req, res) => {
  try {
    const pool = await poolPromise;
    res.json(formatSuccess(null, 'Datenbankverbindung erfolgreich!'));
  } catch (err) {
    res.status(500).json(formatError('Datenbankverbindung fehlgeschlagen'));
  }
});

// Test database connection with custom config
app.post('/api/test-db-connection', async (req, res) => {
  const sql = require('mssql');
  const dbConfig = req.body;

  console.log('[TEST-DB] Testing connection with config:', {
    ...dbConfig,
    password: dbConfig.password ? '***' : undefined
  });

  // Validate required fields
  if (!dbConfig.host || !dbConfig.database || !dbConfig.port) {
    return res.status(400).json({
      success: false,
      message: 'Bitte füllen Sie alle Pflichtfelder aus (Server, Datenbank, Port)'
    });
  }

  if (!dbConfig.useWindowsAuth && (!dbConfig.user || !dbConfig.password)) {
    return res.status(400).json({
      success: false,
      message: 'Bitte geben Sie Benutzername und Passwort ein'
    });
  }

  // Create connection configuration
  const config = {
    server: dbConfig.host,
    database: dbConfig.database,
    port: parseInt(dbConfig.port),
    connectionTimeout: 15000, // 15 seconds
    requestTimeout: 15000,
    pool: {
      max: 1,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };

  // Set authentication type
  if (dbConfig.useWindowsAuth) {
    config.options.trustedConnection = true;
  } else {
    config.user = dbConfig.user;
    config.password = dbConfig.password;
    config.options.trustedConnection = false;
  }

  let testPool = null;

  try {
    // Try to connect
    console.log('[TEST-DB] Attempting connection...');
    testPool = new sql.ConnectionPool(config);
    await testPool.connect();

    console.log('[TEST-DB] Connection successful!');

    // Test with a simple query
    const result = await testPool.request().query('SELECT 1 as test');

    // Close the test connection
    await testPool.close();

    res.json({
      success: true,
      message: 'Datenbankverbindung erfolgreich!'
    });
  } catch (err) {
    console.error('[TEST-DB] Connection failed:', err.message);

    // Make sure to close connection on error
    if (testPool) {
      try {
        await testPool.close();
      } catch (closeErr) {
        console.error('[TEST-DB] Error closing connection:', closeErr.message);
      }
    }

    res.status(400).json({
      success: false,
      message: 'Verbindung fehlgeschlagen: ' + err.message
    });
  }
});

// API-Routen mit /api Präfix verwenden
app.use('/api', merkmalstexteRoutes);
app.use('/api/grouped', groupedRoutes);
app.use('/api', identnrRoutes);

// Global error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;