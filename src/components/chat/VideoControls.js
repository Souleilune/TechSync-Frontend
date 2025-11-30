// frontend/src/components/chat/VideoControls.js
// Video call control buttons component

import React from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Monitor, 
  MonitorOff,
  Maximize2,
  Minimize2
} from 'lucide-react';

const ControlButton = ({ 
  onClick, 
  icon: Icon, 
  activeIcon: ActiveIcon,
  isActive = false, 
  isDestructive = false,
  title,
  size = 28
}) => {
  const CurrentIcon = isActive && ActiveIcon ? ActiveIcon : Icon;
  
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: isDestructive ? '12px 24px' : '12px',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: isDestructive 
          ? '#ef4444' 
          : isActive 
            ? 'rgba(239, 68, 68, 0.1)' 
            : 'rgba(59, 130, 246, 0.1)',
        color: isDestructive 
          ? 'white' 
          : isActive 
            ? '#ef4444' 
            : '#3b82f6',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isDestructive ? '8px' : '0'
      }}
      onMouseEnter={(e) => {
        if (!isDestructive) {
          e.currentTarget.style.backgroundColor = isActive 
            ? 'rgba(239, 68, 68, 0.2)' 
            : 'rgba(59, 130, 246, 0.2)';
        } else {
          e.currentTarget.style.backgroundColor = '#dc2626';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDestructive) {
          e.currentTarget.style.backgroundColor = isActive 
            ? 'rgba(239, 68, 68, 0.1)' 
            : 'rgba(59, 130, 246, 0.1)';
        } else {
          e.currentTarget.style.backgroundColor = '#ef4444';
        }
      }}
    >
      <CurrentIcon size={size} />
      {isDestructive && (
        <span style={{ fontWeight: '600', fontSize: '14px' }}>End Call</span>
      )}
    </button>
  );
};

const VideoControls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isFullScreen,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleFullScreen,
  onEndCall
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px' 
    }}>
      {/* Mute Button */}
      <ControlButton
        onClick={onToggleMute}
        icon={Mic}
        activeIcon={MicOff}
        isActive={isMuted}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      />

      {/* Video Button */}
      <ControlButton
        onClick={onToggleVideo}
        icon={Video}
        activeIcon={VideoOff}
        isActive={isVideoOff}
        title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
      />

      {/* Screen Share Button */}
      <ControlButton
        onClick={onToggleScreenShare}
        icon={Monitor}
        activeIcon={MonitorOff}
        isActive={isScreenSharing}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
      />

      {/* Fullscreen Button */}
      <ControlButton
        onClick={onToggleFullScreen}
        icon={Maximize2}
        activeIcon={Minimize2}
        isActive={isFullScreen}
        title={isFullScreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      />

      {/* Divider */}
      <div style={{ 
        width: '2px', 
        height: '30px', 
        backgroundColor: 'rgba(255, 255, 255, 0.15)', 
        margin: '0 8px' 
      }} />

      {/* End Call Button */}
      <ControlButton
        onClick={onEndCall}
        icon={PhoneOff}
        isDestructive={true}
        title="End call"
        size={18}
      />
    </div>
  );
};

export default VideoControls;