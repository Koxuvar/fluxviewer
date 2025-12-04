import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './OSCMonitor.css';

function OSCMonitor({ 
  onClose, 
  messages, 
  setMessages, 
  isPaused, 
  setIsPaused, 
  onClear,
  config 
}) {
  const [filterType, setFilterType] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const windowRef = useRef(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const messageIdRef = useRef(0);

  // Start OSC listener on mount, stop on unmount
  useEffect(() => {
    const startListener = async () => {
      try {
        await invoke('osc_start_listener', { ip: config.ip, port: config.port });
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start OSC listener:', err);
      }
    };

    startListener();

    return () => {
      invoke('osc_stop_listener')
        .catch(err => console.error('Failed to stop OSC listener:', err));
    };
  }, [config.ip, config.port]);

  // Listen for OSC messages from backend
  useEffect(() => {
    const unlisten = listen('osc-message', (event) => {
      if (isPaused) return;
      
      const payload = event.payload;
      const newMessage = {
        id: messageIdRef.current++,
        timestamp: payload.timestamp,
        address: payload.message.addr,
        args: formatArgs(payload.message.args),
        sender: payload.sender,
      };

      setMessages(prev => {
        const updated = [...prev, newMessage];
        // Keep only last 100 messages
        return updated.slice(-100);
      });
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [isPaused, setMessages]);

  // Format OSC arguments for display
  const formatArgs = (args) => {
    if (!args || args.length === 0) return '[]';
    return '[' + args.map(arg => {
      if (arg.type === 'String') return `"${arg.value}"`;
      if (arg.type === 'Nil') return 'nil';
      return arg.value;
    }).join(', ') + ']';
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isPaused && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPaused]);

  // Filter messages based on current filter
  const filteredMessages = messages.filter(msg => {
    if (!filterValue) return true;
    const searchValue = filterValue.toLowerCase();
    if (filterType === 'address') {
      return msg.address.toLowerCase().includes(searchValue);
    }
    if (filterType === 'sender') {
      return msg.sender.includes(searchValue);
    }
    return msg.address.toLowerCase().includes(searchValue) || 
           msg.sender.includes(searchValue);
  });

  // Dragging handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls') || e.target.closest('.filter-bar')) return;
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

    const handleMouseUp = () => {
      setIsDragging(false);
    };

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
      className={`floating-window osc-window ${isMinimized ? 'minimized' : ''}`}
      ref={windowRef}
      style={{ left: position.x, top: position.y }}
    >
      <div 
        className="window-header"
        onMouseDown={handleMouseDown}
      >
        <div className="window-title">
          <span className="window-icon osc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12h4l3-9 6 18 3-9h4" />
            </svg>
          </span>
          <span>OSC Monitor</span>
          <span className="port-badge">:{config.port}</span>
          <span className={`status-badge ${isListening ? 'listening' : 'stopped'}`}>
            {isListening ? 'LISTENING' : 'STOPPED'}
          </span>
          <span className="message-count">{filteredMessages.length} messages</span>
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
          <button className="control-btn" onClick={onClear} title="Clear">
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
          <div className="filter-bar">
            <div className="filter-group">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                <option value="address">Address</option>
                <option value="sender">Sender</option>
              </select>
              <input
                type="text"
                placeholder={filterType === 'sender' ? 'Filter by IP...' : 'Filter by address...'}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="filter-input"
              />
              {filterValue && (
                <button 
                  className="filter-clear"
                  onClick={() => setFilterValue('')}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="message-list-header">
            <span className="col-time">Time</span>
            <span className="col-address">Address</span>
            <span className="col-args">Arguments</span>
            <span className="col-sender">Sender</span>
          </div>

          <div className="message-list">
            {filteredMessages.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">◇</span>
                <span>Waiting for OSC messages...</span>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div key={msg.id} className="message-row">
                  <span className="col-time">{msg.timestamp}</span>
                  <span className="col-address">{msg.address}</span>
                  <span className="col-args">{msg.args}</span>
                  <span className="col-sender">{msg.sender}</span>
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

export default OSCMonitor;