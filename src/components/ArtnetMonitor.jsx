import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './ArtnetMonitor.css';

function ArtnetMonitor({ onClose, config }) {
  const parseUniverses = (str) => {
    if (!str) return [0];
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
    return result.length > 0 ? result.sort((a, b) => a - b) : [0];
  };

  const availableUniverses = parseUniverses(config.universes);
  const [selectedUniverse, setSelectedUniverse] = useState(availableUniverses[0]);
  const [channelData, setChannelData] = useState(new Array(512).fill(0));
  const [highlightChannel, setHighlightChannel] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const windowRef = useRef(null);
  const [position, setPosition] = useState({ x: 180, y: 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!availableUniverses.includes(selectedUniverse)) {
      setSelectedUniverse(availableUniverses[0]);
    }
  }, [config.universes]);

  // Start Art-Net listener on mount, stop on unmount
  useEffect(() => {
    const startListener = async () => {
      try {
        await invoke('artnet_start_listener', { ip: config.ip });
        setIsListening(true);
        await invoke('artnet_subscribe_universe', { universe: selectedUniverse });
      } catch (err) {
        console.error('Failed to start Art-Net listener:', err);
      }
    };

    startListener();

    return () => {
      invoke('artnet_unsubscribe_universe', { universe: selectedUniverse })
        .catch(err => console.error('Failed to unsubscribe:', err));
      invoke('artnet_stop_listener')
        .catch(err => console.error('Failed to stop Art-Net listener:', err));
    };
  }, []);

  const handleUniverseSelect = async (universe) => {
    if (universe === selectedUniverse) return;

    try {
      await invoke('artnet_unsubscribe_universe', { universe: selectedUniverse });
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }

    setSelectedUniverse(universe);
    setChannelData(new Array(512).fill(0));

    try {
      await invoke('artnet_subscribe_universe', { universe });
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  // Listen for Art-Net data from backend
  useEffect(() => {
    const unlisten = listen('artnet-universe-data', (event) => {
      if (event.payload.universe === selectedUniverse) {
        setChannelData(event.payload.channels);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [selectedUniverse]);

  const getChannelColor = (value) => {
    if (value === 0) return 'transparent';
    const intensity = value / 255;
    return `rgba(16, 185, 129, ${intensity * 0.6})`;
  };

  const getTextColor = (value) => {
    if (value > 180) return 'var(--bg-primary)';
    if (value > 100) return 'var(--text-primary)';
    return 'var(--text-secondary)';
  };

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

  const activeChannels = channelData.filter(v => v > 0).length;

  const channelRows = [];
  for (let i = 0; i < 512; i += 16) {
    channelRows.push({
      startChannel: i + 1,
      values: channelData.slice(i, i + 16)
    });
  }

  return (
    <div 
      className={`floating-window artnet-window ${isMinimized ? 'minimized' : ''}`}
      ref={windowRef}
      style={{ left: position.x, top: position.y }}
    >
      <div className="window-header" onMouseDown={handleMouseDown}>
        <div className="window-title">
          <span className="window-icon artnet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
            </svg>
          </span>
          <span>Art-Net Monitor</span>
          <span className={`status-badge ${isListening ? 'listening' : 'stopped'}`}>
            {isListening ? 'LISTENING' : 'STOPPED'}
          </span>
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

export default ArtnetMonitor;