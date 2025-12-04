import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import './DMXMonitor.css';

function DMXMonitor({ onClose, config }) {
  // Parse universe string (e.g., "1-4" or "1,2,5,8") into array
  const parseUniverses = (str) => {
    if (!str) return [1];
    const result = [];
    const parts = str.split(',').map(s => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (!result.includes(i)) result.push(i);
          }
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num) && !result.includes(num)) result.push(num);
      }
    }
    return result.length > 0 ? result.sort((a, b) => a - b) : [1];
  };

  const availableUniverses = parseUniverses(config.universes);
  const [selectedUniverse, setSelectedUniverse] = useState(availableUniverses[0]);
  const [channelData, setChannelData] = useState(new Array(512).fill(0));
  const [highlightChannel, setHighlightChannel] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'compact'
  const [isMinimized, setIsMinimized] = useState(false);
  const windowRef = useRef(null);
  const [position, setPosition] = useState({ x: 150, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Reset selection if current universe is no longer available
  useEffect(() => {
    if (!availableUniverses.includes(selectedUniverse)) {
      setSelectedUniverse(availableUniverses[0]);
    }
  }, [config.universes]);

  // Subscribe to universe when selected
  const handleUniverseSelect = async (universe) => {
    if (universe === selectedUniverse) return;

    // Unsubscribe from current
    try {
      await invoke('sacn_unsubscribe_universe', { universe: selectedUniverse });
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }

    setSelectedUniverse(universe);
    setChannelData(new Array(512).fill(0));

    // Subscribe to new
    try {
      await invoke('sacn_subscribe_universe', { universe });
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  }; 

  // Subscribe to initial universe on mount, cleanup on unmount
  useEffect(() => {
    invoke('sacn_subscribe_universe', { universe: selectedUniverse })
      .catch(err => console.error('Failed to subscribe:', err));

    return () => {
      invoke('sacn_unsubscribe_universe', { universe: selectedUniverse })
        .catch(err => console.error('Failed to unsubscribe on close:', err));
    };
  }, []); 

  // Listen for DMX data from backend
  useEffect(() => {
    const unlisten = listen('dmx-universe-data', (event) => {
      // Expecting payload: { universe: number, channels: number[] }
      if (event.payload.universe === selectedUniverse) {
        setChannelData(event.payload.channels);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [selectedUniverse]);

  // Calculate background color based on value (0-255)
  const getChannelColor = (value) => {
    if (value === 0) return 'transparent';
    const intensity = value / 255;
    return `rgba(167, 139, 250, ${intensity * 0.6})`;
  };

  // Get text color based on background intensity
  const getTextColor = (value) => {
    if (value > 180) return 'var(--bg-primary)';
    if (value > 100) return 'var(--text-primary)';
    return 'var(--text-secondary)';
  };

  // Dragging handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls') || e.target.closest('.universe-selector')) return;
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

  // Count active channels
  const activeChannels = channelData.filter(v => v > 0).length;

  // Group channels into rows of 16
  const channelRows = [];
  for (let i = 0; i < 512; i += 16) {
    channelRows.push({
      startChannel: i + 1,
      values: channelData.slice(i, i + 16)
    });
  }

  return (
    <div 
      className={`floating-window dmx-window ${isMinimized ? 'minimized' : ''}`}
      ref={windowRef}
      style={{ left: position.x, top: position.y }}
    >
      <div 
        className="window-header"
        onMouseDown={handleMouseDown}
      >
        <div className="window-title">
          <span className="window-icon dmx">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </span>
          <span>DMX Monitor</span>
          <span className="message-count">Universe {selectedUniverse}</span>
        </div>
        <div className="window-controls">
          <button 
            className={`control-btn ${viewMode === 'compact' ? 'active' : ''}`}
            onClick={() => setViewMode(viewMode === 'grid' ? 'compact' : 'grid')}
            title="Toggle view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
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
          <div className="universe-selector">
            <div className="universe-tabs">
              {availableUniverses.map(uni => (
                <button
                  key={uni}
                  className={`universe-tab ${selectedUniverse === uni ? 'active' : ''}`}
                  onClick={() => handleUniverseSelect(uni)}
                >
                  <span className="universe-num">{uni}</span>
                  <span className="universe-label">Universe</span>
                </button>
              ))}
            </div>
            <div className="universe-stats">
              <span className="stat">
                <span className="stat-num">{activeChannels}</span>
                <span className="stat-label">Active</span>
              </span>
            </div>
          </div>

          {/* Column headers */}
          <div className="channel-header">
            <div className="row-label"></div>
            {[...Array(16)].map((_, i) => (
              <div key={i} className="col-label">{i + 1}</div>
            ))}
          </div>

          <div className={`channel-grid ${viewMode}`}>
            {channelRows.map((row, rowIndex) => (
              <div key={rowIndex} className="channel-row">
                <div className="row-label">{row.startChannel}</div>
                {row.values.map((value, colIndex) => {
                  const channelNum = row.startChannel + colIndex;
                  return (
                    <div
                      key={colIndex}
                      className={`channel-cell ${value > 0 ? 'active' : ''} ${highlightChannel === channelNum ? 'highlight' : ''}`}
                      style={{
                        backgroundColor: getChannelColor(value),
                        color: getTextColor(value)
                      }}
                      onMouseEnter={() => setHighlightChannel(channelNum)}
                      onMouseLeave={() => setHighlightChannel(null)}
                      title={`Ch ${channelNum}: ${value}`}
                    >
                      <span className="channel-value">{value}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Channel info tooltip */}
          {highlightChannel && (
            <div className="channel-tooltip">
              <span className="tooltip-channel">Channel {highlightChannel}</span>
              <span className="tooltip-value">{channelData[highlightChannel - 1]}</span>
              <span className="tooltip-percent">
                {Math.round((channelData[highlightChannel - 1] / 255) * 100)}%
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DMXMonitor;