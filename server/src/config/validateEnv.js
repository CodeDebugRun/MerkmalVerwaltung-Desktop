/**
 * Environment configuration validation
 * Ensures all required environment variables are present
 */

const validateEnvironment = () => {
  // Required environment variables
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_PORT'
  ];

  // Optional but recommended environment variables
  const optionalEnvVars = [
    'DB_USER',
    'DB_PASSWORD',
    'PORT',
    'NODE_ENV'
  ];

  // Check required variables
  const missingRequired = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missingRequired.length > 0) {
    console.error('❌ Fehlende erforderliche Umgebungsvariablen:', missingRequired.join(', '));
    console.error('Bitte überprüfen Sie Ihre .env Datei');
    process.exit(1);
  }

  // Check database authentication
  if (!process.env.DB_USER && !process.env.WINDOWS_AUTH) {
    console.warn('⚠️  Warnung: Weder DB_USER noch WINDOWS_AUTH ist gesetzt.');
    console.warn('   Verwende Windows Authentication als Standard.');
  }

  // Validate port number
  const port = process.env.DB_PORT;
  if (port && isNaN(parseInt(port))) {
    console.error('❌ DB_PORT muss eine gültige Zahl sein');
    process.exit(1);
  }

  // Set defaults for optional variables
  if (!process.env.PORT) {
    process.env.PORT = '3001';
    console.log('ℹ️  PORT nicht gesetzt, verwende Standard: 3001');
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
    console.log('ℹ️  NODE_ENV nicht gesetzt, verwende Standard: development');
  }

  // Log successful validation
  console.log('✅ Umgebungsvalidierung erfolgreich');
  console.log(`📊 Umgebung: ${process.env.NODE_ENV}`);
  console.log(`🏠 Server Port: ${process.env.PORT}`);
  console.log(`🗄️  Datenbank: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  
  if (process.env.DB_USER) {
    console.log(`👤 DB Authentifizierung: SQL Server (User: ${process.env.DB_USER})`);
  } else {
    console.log('👤 DB Authentifizierung: Windows Authentication');
  }
};

// Additional helper to get environment info
const getEnvironmentInfo = () => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '3001',
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      authType: process.env.DB_USER ? 'SQL Server' : 'Windows'
    },
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development'
  };
};

module.exports = {
  validateEnvironment,
  getEnvironmentInfo
};