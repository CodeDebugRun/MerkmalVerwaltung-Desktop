import React, { useState, useEffect } from 'react';

const SettingsModal = ({
  showSettings,
  darkMode,
  onToggleDarkMode,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '1433',
    database: 'LebodoorsDB',
    user: '',
    password: '',
    useWindowsAuth: true
  });
  const [testResult, setTestResult] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    if (showSettings) {
      loadDatabaseConfig();
    }
  }, [showSettings]);

  const loadDatabaseConfig = async () => {
    try {
      const config = await window.electronAPI?.getDatabaseConfig();
      if (config) {
        setDbConfig(config);
      }
    } catch (error) {
      console.error('Failed to load database config:', error);
    }
  };

  const handleDbConfigChange = (field, value) => {
    setDbConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setTestResult(null);
  };

  const testDatabaseConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const result = await window.electronAPI?.testDatabaseConnection(dbConfig);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveDatabaseConfig = async () => {
    try {
      await window.electronAPI?.saveDatabaseConfig(dbConfig);
      setTestResult({ success: true, message: 'Konfiguration gespeichert!' });
    } catch (error) {
      setTestResult({ success: false, message: 'Fehler beim Speichern: ' + error.message });
    }
  };

  if (!showSettings) {
    return null;
  }

  return (
    <section className="settings-section">
      <h3>⚙️ Einstellungen</h3>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          🔧 Allgemein
        </button>
        <button
          className={`tab ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          🗄️ Datenbank
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="settings-grid">
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={onToggleDarkMode}
                className="setting-checkbox"
              />
              <span className="setting-text">
                {darkMode ? '🌙' : '☀️'} Dark Mode
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Database Settings */}
      {activeTab === 'database' && (
        <div className="database-settings">
          <div className="setting-group">
            <h4>🔌 Verbindungseinstellungen</h4>

            <div className="setting-row">
              <label>Server Adresse:</label>
              <input
                type="text"
                value={dbConfig.host}
                onChange={(e) => handleDbConfigChange('host', e.target.value)}
                placeholder="localhost oder IP-Adresse"
                className="setting-input"
              />
            </div>

            <div className="setting-row">
              <label>Port:</label>
              <input
                type="number"
                value={dbConfig.port}
                onChange={(e) => handleDbConfigChange('port', e.target.value)}
                placeholder="1433"
                className="setting-input"
              />
            </div>

            <div className="setting-row">
              <label>Datenbank Name:</label>
              <input
                type="text"
                value={dbConfig.database}
                onChange={(e) => handleDbConfigChange('database', e.target.value)}
                placeholder="Datenbankname"
                className="setting-input"
              />
            </div>
          </div>

          <div className="setting-group">
            <h4>🔐 Authentifizierung</h4>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={dbConfig.useWindowsAuth}
                  onChange={(e) => handleDbConfigChange('useWindowsAuth', e.target.checked)}
                  className="setting-checkbox"
                />
                <span className="setting-text">
                  Windows-Authentifizierung verwenden
                </span>
              </label>
            </div>

            {!dbConfig.useWindowsAuth && (
              <>
                <div className="setting-row">
                  <label>Benutzername:</label>
                  <input
                    type="text"
                    value={dbConfig.user}
                    onChange={(e) => handleDbConfigChange('user', e.target.value)}
                    placeholder="SQL Server Benutzer"
                    className="setting-input"
                  />
                </div>

                <div className="setting-row">
                  <label>Passwort:</label>
                  <input
                    type="password"
                    value={dbConfig.password}
                    onChange={(e) => handleDbConfigChange('password', e.target.value)}
                    placeholder="Passwort"
                    className="setting-input"
                  />
                </div>
              </>
            )}
          </div>

          <div className="setting-group">
            <h4>🧪 Verbindung testen</h4>

            <div className="test-connection">
              <button
                className="btn btn-primary"
                onClick={testDatabaseConnection}
                disabled={isTestingConnection}
              >
                {isTestingConnection ? '⏳ Teste...' : '🔍 Verbindung testen'}
              </button>

              {testResult && (
                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.success ? '✅' : '❌'} {testResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="settings-actions">
        {activeTab === 'database' && (
          <button
            className="btn btn-success"
            onClick={saveDatabaseConfig}
          >
            💾 Konfiguration speichern
          </button>
        )}
        <button
          className="btn btn-secondary"
          onClick={onClose}
        >
          ✅ Schließen
        </button>
      </div>
    </section>
  );
};

export default SettingsModal;