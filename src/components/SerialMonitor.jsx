import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './SerialMonitor.css';

function SerialMonitor({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const [viewMode, setViewMode] = useState('hex'); // 'hex' or 'ascii'
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(0);
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
          setSelectedPort(ports[0]);
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
      const newMessage = {
        id: messageIdRef.current++,
        timestamp: payload.timestamp,
        hex: payload.hex,
        ascii: payload.ascii,
        bytes: payload.bytes,
      };

      setMessages(prev => {
        const updated = [...prev, newMessage];
        return updated.slice(-500); // Keep last 500 messages
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
  }, [messages, isPaused]);

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

  const handleClear = () => setMessages([]);

  const refreshPorts = async () => {
    try {
      const ports = await invoke('serial_list_ports');
      setAvailablePorts(ports);
    } catch (err) {
      console.error('Failed to refresh ports:', err);
    }
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
          <span className="message-count">{messages.length} packets</span>
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
                      <option key={port} value={port}>{port}</option>
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

              <button 
                className={`start-stop-btn ${isListening ? 'listening' : ''}`}
                onClick={handleStartStop}
              >
                {isListening ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>

          <div className="message-list-header">
            <span className="col-time">Time</span>
            <span className="col-data">Data</span>
          </div>

          <div className="message-list">
            {messages.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">⌁</span>
                <span>{isListening ? 'Waiting for serial data...' : 'Select a port and click Start'}</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="message-row">
                  <span className="col-time">{msg.timestamp}</span>
                  <span className="col-data mono">
                    {viewMode === 'hex' ? msg.hex : msg.ascii}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

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