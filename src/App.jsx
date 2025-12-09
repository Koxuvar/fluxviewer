import { useState } from 'react';
import './App.css';
import OSCMonitor from './components/OSCMonitor';
import DMXMonitor from './components/DMXMonitor';
import SerialMonitor from './components/SerialMonitor';
import ArtnetMonitor from './components/ArtnetMonitor';

function App() {
  const [oscWindowOpen, setOscWindowOpen] = useState(false);
  const [sacnWindowOpen, setSacnWindowOpen] = useState(false);
  const [serialWindowOpen, setSerialWindowOpen] = useState(false);
  const [artnetWindowOpen, setArtnetWindowOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const [networkConfig, setNetworkConfig] = useState({
    useSharedIp: true,
    sharedIp: '0.0.0.0',
    oscIp: '0.0.0.0',
    oscPort: 8000,
    sacnIp: '0.0.0.0',
    sacnUniverses: '1-4',
    artnetIp: '0.0.0.0',
    artnetUniverses: '0-3',
  });

  const [oscMessages, setOscMessages] = useState([]);
  const [oscPaused, setOscPaused] = useState(false);

  const clearOscMessages = () => setOscMessages([]);

  const updateNetworkConfig = (key, value) => {
    setNetworkConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-mark">
            <span className="logo-bracket">[</span>
            <span className="logo-text">PM</span>
            <span className="logo-bracket">]</span>
          </div>
          <div className="logo-title">
            <h1>Protocol Monitor</h1>
            <span className="logo-subtitle">OSC • sACN • Art-Net • Serial</span>
          </div>
        </div>
        <div className="status-indicator">
          <span className="status-dot active"></span>
          <span className="status-text">System Ready</span>
        </div>
        <button 
          className={`settings-btn ${settingsOpen ? 'active' : ''}`}
          onClick={() => setSettingsOpen(!settingsOpen)}
          title="Network Settings"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </button>
      </header>

      {settingsOpen && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>Network Configuration</h3>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={networkConfig.useSharedIp}
                onChange={(e) => updateNetworkConfig('useSharedIp', e.target.checked)}
              />
              <span className="toggle-text">Use shared IP for all protocols</span>
            </label>
          </div>
          
          <div className="settings-grid">
            {networkConfig.useSharedIp ? (
              <div className="setting-group">
                <label>Listen IP</label>
                <input
                  type="text"
                  value={networkConfig.sharedIp}
                  onChange={(e) => updateNetworkConfig('sharedIp', e.target.value)}
                  placeholder="0.0.0.0"
                />
                <span className="setting-hint">0.0.0.0 = all interfaces</span>
              </div>
            ) : (
              <>
                <div className="setting-group">
                  <label>OSC IP</label>
                  <input
                    type="text"
                    value={networkConfig.oscIp}
                    onChange={(e) => updateNetworkConfig('oscIp', e.target.value)}
                    placeholder="0.0.0.0"
                  />
                </div>
                <div className="setting-group">
                  <label>sACN IP</label>
                  <input
                    type="text"
                    value={networkConfig.sacnIp}
                    onChange={(e) => updateNetworkConfig('sacnIp', e.target.value)}
                    placeholder="0.0.0.0"
                  />
                </div>
                <div className="setting-group">
                  <label>Art-Net IP</label>
                  <input
                    type="text"
                    value={networkConfig.artnetIp}
                    onChange={(e) => updateNetworkConfig('artnetIp', e.target.value)}
                    placeholder="0.0.0.0"
                  />
                </div>
              </>
            )}
            
            <div className="setting-group">
              <label>OSC Port</label>
              <input
                type="number"
                value={networkConfig.oscPort}
                onChange={(e) => updateNetworkConfig('oscPort', parseInt(e.target.value) || 8000)}
                placeholder="8000"
              />
            </div>
            
            <div className="setting-group">
              <label>sACN Universes</label>
              <input
                type="text"
                value={networkConfig.sacnUniverses}
                onChange={(e) => updateNetworkConfig('sacnUniverses', e.target.value)}
                placeholder="1-4"
              />
              <span className="setting-hint">Range or comma-separated</span>
            </div>

            <div className="setting-group">
              <label>Art-Net Universes</label>
              <input
                type="text"
                value={networkConfig.artnetUniverses}
                onChange={(e) => updateNetworkConfig('artnetUniverses', e.target.value)}
                placeholder="0-3"
              />
              <span className="setting-hint">Starts at 0</span>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">
        <div className="monitor-grid">
          <button 
            className={`monitor-btn ${oscWindowOpen ? 'active' : ''}`}
            onClick={() => setOscWindowOpen(!oscWindowOpen)}
          >
            <div className="btn-icon osc-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12h4l3-9 6 18 3-9h4" />
              </svg>
            </div>
            <div className="btn-content">
              <span className="btn-title">OSC Monitor</span>
              <span className="btn-desc">Network message capture</span>
            </div>
            <div className="btn-status">
              {oscWindowOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </button>

          <button 
            className={`monitor-btn ${sacnWindowOpen ? 'active' : ''}`}
            onClick={() => setSacnWindowOpen(!sacnWindowOpen)}
          >
            <div className="btn-icon sacn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div className="btn-content">
              <span className="btn-title">sACN Monitor</span>
              <span className="btn-desc">E1.31 universe viewer</span>
            </div>
            <div className="btn-status">
              {sacnWindowOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </button>

          <button 
            className={`monitor-btn ${artnetWindowOpen ? 'active' : ''}`}
            onClick={() => setArtnetWindowOpen(!artnetWindowOpen)}
          >
            <div className="btn-icon artnet-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <div className="btn-content">
              <span className="btn-title">Art-Net Monitor</span>
              <span className="btn-desc">Art-Net universe viewer</span>
            </div>
            <div className="btn-status">
              {artnetWindowOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </button>

          <button 
            className={`monitor-btn ${serialWindowOpen ? 'active' : ''}`}
            onClick={() => setSerialWindowOpen(!serialWindowOpen)}
          >
            <div className="btn-icon serial-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 9h16M4 15h16M9 9v6M15 9v6" />
              </svg>
            </div>
            <div className="btn-content">
              <span className="btn-title">Serial Monitor</span>
              <span className="btn-desc">COM port data capture</span>
            </div>
            <div className="btn-status">
              {serialWindowOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </button>
        </div>
      </main>

      <footer className="app-footer">
        <span className="footer-text">Built for live events</span>
        <span className="footer-version">v0.3.0</span>
      </footer>

      {oscWindowOpen && (
        <OSCMonitor 
          onClose={() => setOscWindowOpen(false)}
          messages={oscMessages}
          setMessages={setOscMessages}
          isPaused={oscPaused}
          setIsPaused={setOscPaused}
          onClear={clearOscMessages}
          config={{
            ip: networkConfig.useSharedIp ? networkConfig.sharedIp : networkConfig.oscIp,
            port: networkConfig.oscPort
          }}
        />
      )}
      {sacnWindowOpen && (
        <DMXMonitor 
          onClose={() => setSacnWindowOpen(false)}
          config={{
            ip: networkConfig.useSharedIp ? networkConfig.sharedIp : networkConfig.sacnIp,
            universes: networkConfig.sacnUniverses
          }}
        />
      )}
      {artnetWindowOpen && (
        <ArtnetMonitor 
          onClose={() => setArtnetWindowOpen(false)}
          config={{
            ip: networkConfig.useSharedIp ? networkConfig.sharedIp : networkConfig.artnetIp,
            universes: networkConfig.artnetUniverses
          }}
        />
      )}
      {serialWindowOpen && (
        <SerialMonitor onClose={() => setSerialWindowOpen(false)} />
      )}
    </div>
  );
}

export default App;