const sql = require('mssql');
require('dotenv').config();

// Grundlegende Konfiguration erstellen
const config = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  connectionTimeout: 30000, // 30 seconds
  requestTimeout: 30000, // 30 seconds
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: false,
    trustServerCertificate: true, // Verhindert Zertifikatsfehler für localhost-Entwicklungsumgebung
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


// Connection Pool erstellen und Verbindung versuchen
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('SQL Server\'a başarıyla bağlanıldı.');
    return pool;
  })
  .catch(err => {
    console.error('Veritabanı bağlantı hatası: ', err);
    throw err; // Re-throw error to properly handle it
  });


module.exports = {
  sql, poolPromise
};