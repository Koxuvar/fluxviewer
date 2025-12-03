import { useState, useRef, useEffect } from 'react';
import './OSCMonitor.css';

// Sample data for demonstration - replace with actual Tauri events
const sampleMessages = [
  { id: 1, timestamp: '14:32:05.123', address: '/cue/go', args: '[]', sender: '192.168.1.100' },
  { id: 2, timestamp: '14:32:05.456', address: '/eos/fader/1/value', args: '[0.75]', sender: '192.168.1.101' },
  { id: 3, timestamp: '14:32:05.789', address: '/resolume/layer1/clip1/connect', args: '[1]', sender: '192.168.1.102' },
  { id: 4, timestamp: '14:32:06.012', address: '/d3/play', args: '["section_a"]', sender: '192.168.1.103' },
  { id: 5, timestamp: '14:32:06.345', address: '/ma3/exec/1/1/fire', args: '[]', sender: '192.168.1.104' },
];

function OSCMonitor({ onClose }) {
  const [messages, setMessages] = useState(sampleMessages);
  const [filterType, setFilterType] = useState('all'); // 'all', 'address', 'sender'
  const [filterValue, setFilterValue] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const windowRef = useRef(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  const clearMessages = () => {
    setMessages([]);
  };

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
          <button className="control-btn" onClick={clearMessages} title="Clear">
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

