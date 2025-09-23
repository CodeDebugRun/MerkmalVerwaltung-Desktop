const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

/**
 * SSL Certificate Generator for Development
 * Generates self-signed certificates for HTTPS development server
 */
class SSLGenerator {
  constructor() {
    this.sslDir = path.join(__dirname, '../../ssl');
    this.certPath = path.join(this.sslDir, 'cert.pem');
    this.keyPath = path.join(this.sslDir, 'key.pem');
  }

  /**
   * Ensure SSL directory exists
   */
  ensureSSLDirectory() {
    if (!fs.existsSync(this.sslDir)) {
      fs.mkdirSync(this.sslDir, { recursive: true });
      console.log('📁 SSL Verzeichnis erstellt:', this.sslDir);
    }
  }

  /**
   * Check if certificates already exist
   */
  certificatesExist() {
    return fs.existsSync(this.certPath) && fs.existsSync(this.keyPath);
  }

  /**
   * Generate self-signed SSL certificate
   */
  generateCertificate() {
    console.log('🔐 Generiere SSL-Zertifikat für Development...');

    const attrs = [
      { name: 'countryName', value: 'DE' },
      { name: 'stateOrProvinceName', value: 'NRW' },
      { name: 'localityName', value: 'Development' },
      { name: 'organizationName', value: 'LeboBE Development' },
      { name: 'organizationalUnitName', value: 'IT' },
      { name: 'commonName', value: 'localhost' }
    ];

    const opts = {
      keySize: 2048,
      days: 365,
      algorithm: 'sha256',
      extensions: [
        {
          name: 'basicConstraints',
          cA: true
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true
        },
        {
          name: 'subjectAltName',
          altNames: [
            {
              type: 2, // DNS
              value: 'localhost'
            },
            {
              type: 7, // IP
              ip: '127.0.0.1'
            }
          ]
        }
      ]
    };

    try {
      const pems = selfsigned.generate(attrs, opts);

      this.ensureSSLDirectory();

      fs.writeFileSync(this.keyPath, pems.private);
      fs.writeFileSync(this.certPath, pems.cert);

      console.log('✅ SSL-Zertifikat erfolgreich generiert:');
      console.log('   📄 Zertifikat:', this.certPath);
      console.log('   🔑 Private Key:', this.keyPath);
      console.log('   ⏳ Gültig für: 365 Tage');

      return {
        cert: pems.cert,
        key: pems.private,
        certPath: this.certPath,
        keyPath: this.keyPath
      };
    } catch (error) {
      console.error('❌ Fehler beim Generieren des SSL-Zertifikats:', error.message);
      throw error;
    }
  }

  /**
   * Load existing certificates or generate new ones
   */
  getCertificates() {
    if (this.certificatesExist()) {
      console.log('📄 Verwende vorhandene SSL-Zertifikate');
      try {
        return {
          cert: fs.readFileSync(this.certPath),
          key: fs.readFileSync(this.keyPath),
          certPath: this.certPath,
          keyPath: this.keyPath
        };
      } catch (error) {
        console.warn('⚠️  Fehler beim Laden der Zertifikate, generiere neue...');
        return this.generateCertificate();
      }
    } else {
      return this.generateCertificate();
    }
  }

  /**
   * Get SSL options for HTTPS server
   */
  getSSLOptions() {
    const certs = this.getCertificates();
    return {
      key: certs.key,
      cert: certs.cert
    };
  }
}

module.exports = new SSLGenerator();