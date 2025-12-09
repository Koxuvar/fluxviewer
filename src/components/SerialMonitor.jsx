import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './SerialMonitor.css';

function SerialMonitor({ onClose }) {
  const [rawBytes, setRawBytes] = useState([]);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const [viewMode, setViewMode] = useState('hex'); // 'hex' or 'ascii'
  const [delimiter, setDelimiter] = useState('newline');
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const windowRef = useRef(null);
  const [position, setPosition] = useState({ x: 200, y: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const baudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

  // Fetch available ports on mount
  useEffect(() => {
    const fetchPorts = async () => {
      try {
        const ports = await invoke('serial_list_ports');
        setAvailablePorts(ports);
        if (ports.length > 0 && !selectedPort) {
          setSelectedPort(ports[0].name);
        }
      } catch (err) {
        console.error('Failed to list serial ports:', err);
      }
    };
    fetchPorts();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        invoke('serial_stop_listener').catch(console.error);
      }
    };
  }, [isListening]);

  // Listen for serial data
  useEffect(() => {
    const unlisten = listen('serial-data', (event) => {
      if (isPaused) return;

      const payload = event.payload;
      setRawBytes(prev => {
        const updated = [...prev, ...payload.bytes];
        // Keep last 4096 bytes
        return updated.slice(-4096);
      });
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [isPaused]);

  // Auto-scroll
  useEffect(() => {
    if (!isPaused && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [rawBytes, isPaused]);

  const handleStartStop = async () => {
    if (isListening) {
      try {
        await invoke('serial_stop_listener');
        setIsListening(false);
      } catch (err) {
        console.error('Failed to stop serial listener:', err);
      }
    } else {
      if (!selectedPort) return;
      try {
        await invoke('serial_start_listener', { port: selectedPort, baudRate });
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start serial listener:', err);
      }
    }
  };

  const handleClear = () => setRawBytes([]);

  const refreshPorts = async () => {
    try {
      const ports = await invoke('serial_list_ports');
      setAvailablePorts(ports);
    } catch (err) {
      console.error('Failed to refresh ports:', err);
    }
  };

  // Format bytes into hex dump rows (16 bytes per row)
  const formatHexDump = () => {
    const rows = [];
    for (let i = 0; i < rawBytes.length; i += 16) {
      const chunk = rawBytes.slice(i, i + 16);
      const offset = i.toString(16).toUpperCase().padStart(8, '0');
      
      const hexParts = [];
      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          hexParts.push(chunk[j].toString(16).toUpperCase().padStart(2, '0'));
        } else {
          hexParts.push('  ');
        }
      }
      const hex = hexParts.slice(0, 8).join(' ') + '  ' + hexParts.slice(8).join(' ');

      const ascii = chunk.map(b => {
        if (b >= 0x20 && b <= 0x7E) {
          return String.fromCharCode(b);
        }
        return '.';
      }).join('');

      rows.push({ offset, hex, ascii });
    }
    return rows;
  };

  // Format bytes as ASCII lines with delimiter
  const formatAsciiLines = () => {
    let text = rawBytes.map(b => {
      if (b >= 0x20 && b <= 0x7E) {
        return String.fromCharCode(b);
      } else if (b === 0x0A) {
        return '\n';
      } else if (b === 0x0D) {
        return '\r';
      }
      return '';
    }).join('');

    let lines = [];
    switch (delimiter) {
      case 'newline':
        lines = text.split('\n').map(l => l.replace(/\r/g, '')).filter(Boolean);
        break;
      case 'cr':
        lines = text.split('\r').map(l => l.replace(/\n/g, '')).filter(Boolean);
        break;
      case 'both':
        lines = text.split(/\r?\n|\r/).filter(Boolean);
        break;
      case 'none':
        lines = [text.replace(/[\r\n]/g, '')];
        break;
      default:
        lines = text.split('\n').filter(Boolean);
    }
    
    return lines;
  };

  // Dragging handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls') || e.target.closest('.serial-config')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const hexRows = formatHexDump();

  return (
    <div 
      className={`floating-window serial-window ${isMinimized ? 'minimized' : ''}`}
      ref={windowRef}
      style={{ left: position.x, top: position.y }}
    >
      <div className="window-header" onMouseDown={handleMouseDown}>
        <div className="window-title">
          <span className="window-icon serial">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 9h16M4 15h16M9 9v6M15 9v6" />
            </svg>
          </span>
          <span>Serial Monitor</span>
          <span className={`status-badge ${isListening ? 'listening' : 'stopped'}`}>
            {isListening ? 'LISTENING' : 'STOPPED'}
          </span>
          <span className="message-count">{rawBytes.length} bytes</span>
        </div>
        <div className="window-controls">
          <button 
            className={`control-btn ${isPaused ? 'active' : ''}`} 
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </button>
          <button className="control-btn" onClick={handleClear} title="Clear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
          <button 
            className="control-btn" 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMinimized ? (
                <polyline points="15,3 21,3 21,9" />
              ) : (
                <line x1="5" y1="12" x2="19" y2="12" />
              )}
            </svg>
          </button>
          <button className="control-btn close" onClick={onClose} title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="serial-config">
            <div className="config-row">
              <div className="config-group">
                <label>Port</label>
                <div className="port-select-group">
                  <select
                    value={selectedPort}
                    onChange={(e) => setSelectedPort(e.target.value)}
                    disabled={isListening}
                  >
                    {availablePorts.length === 0 && (
                      <option value="">No ports found</option>
                    )}
                    {availablePorts.map(port => (
                      <option key={port.name} value={port.name}>
                        {port.name} - {port.description}
                      </option>
                    ))}
                  </select>
                  <button 
                    className="refresh-btn" 
                    onClick={refreshPorts}
                    disabled={isListening}
                    title="Refresh ports"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="config-group">
                <label>Baud Rate</label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(parseInt(e.target.value))}
                  disabled={isListening}
                >
                  {baudRates.map(rate => (
                    <option key={rate} value={rate}>{rate}</option>
                  ))}
                </select>
              </div>

              <div className="config-group">
                <label>View</label>
                <div className="view-toggle">
                  <button 
                    className={viewMode === 'hex' ? 'active' : ''}
                    onClick={() => setViewMode('hex')}
                  >
                    HEX
                  </button>
                  <button 
                    className={viewMode === 'ascii' ? 'active' : ''}
                    onClick={() => setViewMode('ascii')}
                  >
                    ASCII
                  </button>
                </div>
              </div>

              {viewMode === 'ascii' && (
                <div className="config-group">
                  <label>Delimiter</label>
                  <select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                  >
                    <option value="newline">Newline (\n)</option>
                    <option value="cr">Carriage Return (\r)</option>
                    <option value="both">Both (NL & CR)</option>
                    <option value="none">None</option>
                  </select>
                </div>
              )}

              <button 
                className={`start-stop-btn ${isListening ? 'listening' : ''}`}
                onClick={handleStartStop}
              >
                {isListening ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>

          {viewMode === 'hex' ? (
            <>
            <div className="hex-dump-header">
              <span className="col-offset">Offset</span>
              <span className="col-hex">{'00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F'}</span>
              <span className="col-ascii">ASCII</span>
            </div> 

              <div className="hex-dump-list">
                {hexRows.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">⌁</span>
                    <span>{isListening ? 'Waiting for serial data...' : 'Select a port and click Start'}</span>
                  </div>
                ) : (
                  hexRows.map((row, idx) => (
                    <div key={idx} className="hex-dump-row">
                      <span className="col-offset">{row.offset}</span>
                      <span className="col-hex">{row.hex}</span>
                      <span className="col-ascii-data">|{row.ascii.padEnd(16)}|</span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          ) : (
            <div className="ascii-view">
              {rawBytes.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">⌁</span>
                  <span>{isListening ? 'Waiting for serial data...' : 'Select a port and click Start'}</span>
                </div>
              ) : (
                <div className="ascii-lines">
                  {formatAsciiLines().map((line, idx) => (
                    <div key={idx} className="ascii-line">
                      <span className="line-number">{idx + 1}</span>
                      <span className="line-content">{line}</span>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {isPaused && (
            <div className="paused-indicator">
              <span>PAUSED</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SerialMonitor;