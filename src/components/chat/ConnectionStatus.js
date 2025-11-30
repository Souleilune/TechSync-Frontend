// frontend/src/components/chat/ConnectionStatus.js
// Connection status indicator component

import React from 'react';
import { Wifi, WifiOff, Loader } from 'lucide-react';

const ConnectionStatus = ({ status }) => {
  const statusConfig = {
    connecting: {
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      text: 'Connecting...',
      icon: Loader
    },
    connected: {
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      text: 'Connected',
      icon: Wifi
    },
    reconnecting: {
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      text: 'Reconnecting...',
      icon: Loader
    },
    failed: {
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      text: 'Connection Failed',
      icon: WifiOff
    },
    ended: {
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      text: 'Call Ended',
      icon: WifiOff
    }
  };

  const config = statusConfig[status] || statusConfig.connecting;
  const Icon = config.icon;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      backgroundColor: config.bgColor,
      borderRadius: '8px',
      fontSize: '14px',
      color: config.color
    }}>
      <Icon 
        size={16} 
        style={{ 
          animation: status === 'connecting' || status === 'reconnecting' 
            ? 'spin 1s linear infinite' 
            : 'none' 
        }} 
      />
      <span style={{ fontWeight: '500' }}>{config.text}</span>
      
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ConnectionStatus;