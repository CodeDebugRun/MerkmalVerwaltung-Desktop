/**
 * Database connection resilience manager
 * Handles connection failures and automatic reconnection
 */

const { sql } = require('../db');
const { formatError } = require('./responseFormatter');

// Connection health check interval (30 seconds)
const HEALTH_CHECK_INTERVAL = 30000;
// Max retry attempts for failed connections
const MAX_RETRY_ATTEMPTS = 3;
// Retry delay in milliseconds (exponential backoff)
const RETRY_BASE_DELAY = 1000;

class ConnectionManager {
  constructor() {
    this.isHealthy = true;
    this.retryAttempts = 0;
    this.healthCheckTimer = null;
  }

  /**
   * Start health monitoring for database connection
   */
  startHealthMonitoring(pool) {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.checkConnectionHealth(pool);
    }, HEALTH_CHECK_INTERVAL);

    console.log('🔄 Datenbank-Gesundheitsüberwachung gestartet');
  }

  /**
   * Check if database connection is healthy
   */
  async checkConnectionHealth(pool) {
    try {
      const request = new sql.Request(pool);
      await request.query('SELECT 1 as health_check');
      
      if (!this.isHealthy) {
        console.log('✅ Datenbankverbindung wiederhergestellt');
        this.isHealthy = true;
        this.retryAttempts = 0;
      }
    } catch (err) {
      console.error(`❌ Datenbank-Gesundheitsprüfung fehlgeschlagen: ${err.message}`);
      this.isHealthy = false;
      await this.handleConnectionFailure(pool);
    }
  }

  /**
   * Handle connection failures with exponential backoff retry
   */
  async handleConnectionFailure(pool) {
    if (this.retryAttempts >= MAX_RETRY_ATTEMPTS) {
      console.error(`💀 Datenbankverbindung nach ${MAX_RETRY_ATTEMPTS} Versuchen fehlgeschlagen`);
      return;
    }

    this.retryAttempts++;
    const delay = RETRY_BASE_DELAY * Math.pow(2, this.retryAttempts - 1);
    
    console.log(`🔄 Datenbankwiederverbindung versucht (${this.retryAttempts}/${MAX_RETRY_ATTEMPTS}) in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await pool.close();
        await pool.connect();
        console.log('✅ Datenbankwiederverbindung erfolgreich');
        this.isHealthy = true;
        this.retryAttempts = 0;
      } catch (err) {
        console.error(`❌ Wiederverbindungsversuch ${this.retryAttempts} fehlgeschlagen:`, err.message);
        await this.handleConnectionFailure(pool);
      }
    }, delay);
  }

  /**
   * Middleware to check connection health before processing requests
   */
  healthCheckMiddleware() {
    return (req, res, next) => {
      if (!this.isHealthy) {
        return res.status(503).json(
          formatError('Datenbankverbindung nicht verfügbar. Bitte versuchen Sie es später erneut.')
        );
      }
      next();
    };
  }

  /**
   * Execute database operation with retry logic
   */
  async executeWithRetry(operation, pool, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        console.error(`Datenbankoperation fehlgeschlagen (Versuch ${attempt}/${maxRetries}):`, err.message);
        
        if (attempt === maxRetries) {
          throw err;
        }
        
        // Check if it's a connection-related error
        if (this.isConnectionError(err)) {
          this.isHealthy = false;
          await this.handleConnectionFailure(pool);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, RETRY_BASE_DELAY * attempt));
        } else {
          throw err; // Non-connection errors should not be retried
        }
      }
    }
  }

  /**
   * Check if error is connection-related
   */
  isConnectionError(err) {
    const connectionErrorCodes = [
      'ECONNCLOSED',
      'ECONNRESET', 
      'ETIMEOUT',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];
    
    return connectionErrorCodes.some(code => 
      err.code === code || err.message.includes(code)
    );
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('🛑 Datenbank-Gesundheitsüberwachung gestoppt');
    }
  }
}

// Singleton instance
const connectionManager = new ConnectionManager();

module.exports = connectionManager;