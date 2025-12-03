import { useState } from 'react';
import './App.css';
import OSCMonitor from './components/OSCMonitor';
import DMXMonitor from './components/DMXMonitor';

function App() {
  const [oscWindowOpen, setOscWindowOpen] = useState(false);
  const [dmxWindowOpen, setDmxWindowOpen] = useState(false);

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
            <span className="logo-subtitle">OSC • DMX • sACN</span>
          </div>
        </div>
        <div className="status-indicator">
          <span className="status-dot active"></span>
          <span className="status-text">System Ready</span>
        </div>
      </header>

      <main className="app-main">
        <div className="monitor-controls">
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
            className={`monitor-btn ${dmxWindowOpen ? 'active' : ''}`}
            onClick={() => setDmxWindowOpen(!dmxWindowOpen)}
          >
            <div className="btn-icon dmx-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div className="btn-content">
              <span className="btn-title">DMX Monitor</span>
              <span className="btn-desc">sACN universe viewer</span>
            </div>
            <div className="btn-status">
              {dmxWindowOpen ? 'OPEN' : 'CLOSED'}
            </div>
          </button>
        </div>

        <div className="quick-stats">
          <div className="stat-card">
            <span className="stat-value">0</span>
            <span className="stat-label">OSC Messages/s</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">0</span>
            <span className="stat-label">Active Universes</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">--</span>
            <span className="stat-label">Last Activity</span>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <span className="footer-text">Built for live events</span>
        <span className="footer-version">v0.1.0</span>
      </footer>

      {/* Floating Windows */}
      {oscWindowOpen && (
        <OSCMonitor onClose={() => setOscWindowOpen(false)} />
      )}
      {dmxWindowOpen && (
        <DMXMonitor onClose={() => setDmxWindowOpen(false)} />
      )}
    </div>
  );
}

export default App;

