require('dotenv').config();
const { validateEnvironment } = require('./config/validateEnv');

// Validate environment before starting the application
validateEnvironment();

const app = require('./app');
const { poolPromise } = require('./db');
const connectionManager = require('./utils/connectionManager');
const https = require('https');
const http = require('http');

const PORT = process.env.PORT || 3001;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true' || process.env.NODE_ENV === 'development';

async function startServer() {
  // Start database health monitoring
  try {
    const pool = await poolPromise;
    connectionManager.startHealthMonitoring(pool);
  } catch (err) {
    console.error('❌ Datenbank-Gesundheitsüberwachung konnte nicht gestartet werden:', err.message);
  }

  // Always start HTTP server
  const httpServer = http.createServer(app);
  httpServer.listen(PORT, () => {
    console.log(`🌐 HTTP Server läuft auf http://localhost:${PORT}`);
  });

  // Start HTTPS server if enabled
  if (ENABLE_HTTPS) {
    try {
      let httpsOptions;

      if (process.env.NODE_ENV === 'production') {
        // Production: Use company SSL certificates
        const fs = require('fs');
        const certPath = process.env.HTTPS_CERT_PATH || './ssl/cert.pem';
        const keyPath = process.env.HTTPS_KEY_PATH || './ssl/key.pem';

        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
          httpsOptions = {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath)
          };
          console.log('🔒 Verwende Production SSL-Zertifikate');
        } else {
          console.error('❌ Production SSL-Zertifikate nicht gefunden:', { certPath, keyPath });
          console.log('💡 Setze HTTPS_CERT_PATH und HTTPS_KEY_PATH environment variables');
          return;
        }
      } else {
        // Development: Use auto-generated self-signed certificates
        const sslGenerator = require('./utils/sslGenerator');
        httpsOptions = sslGenerator.getSSLOptions();
        console.log('🔒 Verwende Development SSL-Zertifikate (self-signed)');
      }

      const httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🔐 HTTPS Server läuft auf https://localhost:${HTTPS_PORT}`);
        console.log(`📅 Gestartet um: ${new Date().toLocaleString('de-DE')}`);

        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Development-Modus: Browser wird Sicherheitswarnung anzeigen');
          console.log('💡 Klicke auf "Erweitert" → "Unsicher zu localhost weiterleiten"');
        }
      });

    } catch (err) {
      console.error('❌ HTTPS Server konnte nicht gestartet werden:', err.message);
      console.log('🌐 Verwende nur HTTP Server');
    }
  } else {
    console.log('ℹ️  HTTPS deaktiviert (ENABLE_HTTPS=false)');
  }
}

startServer();