// frontend/src/components/chat/VideoGrid.js
// Responsive video grid component

import React, { useMemo, useRef, useEffect } from 'react';
import { VideoOff, MicOff, Monitor, Wifi, WifiOff } from 'lucide-react';

const VideoTile = ({ 
  videoRef, 
  stream, 
  username, 
  isLocal = false, 
  isVideoOff = false, 
  isMuted = false,
  isScreenShare = false,
  connectionState = 'connected',
  isFeatured = false
}) => {
  const tileRef = useRef(null);

  useEffect(() => {
    if (videoRef?.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  const connectionIndicator = useMemo(() => {
    const states = {
      connected: { color: '#10b981', icon: Wifi },
      connecting: { color: '#f59e0b', icon: Wifi },
      disconnected: { color: '#ef4444', icon: WifiOff },
      failed: { color: '#ef4444', icon: WifiOff }
    };
    return states[connectionState] || states.connected;
  }, [connectionState]);

  const ConnectionIcon = connectionIndicator.icon;

  return (
    <div
      ref={tileRef}
      style={{
        position: 'relative',
        backgroundColor: 'rgba(26, 28, 32, 0.95)',
        borderRadius: isFeatured ? '16px' : '12px',
        overflow: 'hidden',
        aspectRatio: isFeatured ? 'auto' : '16/9',
        height: isFeatured ? '100%' : 'auto',
        border: isLocal 
          ? '2px solid rgba(59, 130, 246, 0.5)' 
          : isScreenShare 
            ? '2px solid rgba(16, 185, 129, 0.5)'
            : '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: isFeatured ? 'contain' : 'cover',
          transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none',
          display: isVideoOff && !isScreenShare ? 'none' : 'block',
          backgroundColor: '#000'
        }}
      />

      {/* Video Off Placeholder */}
      {isVideoOff && !isScreenShare && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(26, 28, 32, 0.95)',
          gap: '8px'
        }}>
          <div style={{
            width: isFeatured ? '80px' : '48px',
            height: isFeatured ? '80px' : '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isFeatured ? '32px' : '20px',
            color: '#3b82f6',
            fontWeight: '600'
          }}>
            {username?.charAt(0).toUpperCase() || '?'}
          </div>
          <span style={{ 
            color: '#9ca3af', 
            fontSize: isFeatured ? '16px' : '12px' 
          }}>
            Camera off
          </span>
        </div>
      )}

      {/* Screen Share Badge */}
      {isScreenShare && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          padding: '8px 16px',
          backgroundColor: 'rgba(16, 185, 129, 0.9)',
          borderRadius: '6px',
          fontSize: '14px',
          color: 'white',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Monitor size={16} />
          {isLocal ? 'You are sharing' : `${username} is sharing`}
        </div>
      )}

      {/* User Info Bar */}
      <div style={{
        position: 'absolute',
        bottom: isFeatured ? '16px' : '8px',
        left: isFeatured ? '16px' : '8px',
        right: isFeatured ? '16px' : '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isFeatured ? '8px 12px' : '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '6px'
      }}>
        <span style={{ 
          fontSize: isFeatured ? '14px' : '12px', 
          color: 'white',
          fontWeight: '500'
        }}>
          {username} {isLocal && '(You)'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isLocal && (
            <ConnectionIcon 
              size={isFeatured ? 14 : 12} 
              color={connectionIndicator.color} 
            />
          )}
          {isMuted && (
            <MicOff size={isFeatured ? 14 : 12} color="#ef4444" />
          )}
          {isVideoOff && !isScreenShare && (
            <VideoOff size={isFeatured ? 14 : 12} color="#ef4444" />
          )}
        </div>
      </div>
    </div>
  );
};

const VideoGrid = ({
  localVideoRef,
  localStream,
  screenStream,
  remoteStreams,
  currentUser,
  isScreenSharing,
  screenSharingUserId,
  isVideoOff,
  isMuted,
  peerStates
}) => {
  const remoteVideosRef = useRef({});
  
  // Calculate grid layout
  const totalParticipants = remoteStreams.size + 1;
  const hasScreenShare = isScreenSharing || screenSharingUserId;

  const gridStyle = useMemo(() => {
    if (hasScreenShare) {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%'
      };
    }

    let columns;
    if (totalParticipants === 1) columns = 1;
    else if (totalParticipants === 2) columns = 2;
    else if (totalParticipants <= 4) columns = 2;
    else if (totalParticipants <= 9) columns = 3;
    else columns = 4;

    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '12px',
      alignContent: 'start'
    };
  }, [totalParticipants, hasScreenShare]);

  // Update remote video refs
  useEffect(() => {
    remoteStreams.forEach((data, peerId) => {
      const videoEl = remoteVideosRef.current[peerId];
      if (videoEl && data.stream) {
        if (videoEl.srcObject !== data.stream) {
          videoEl.srcObject = data.stream;
        }
      }
    });
  }, [remoteStreams]);

  // Screen share layout
  if (hasScreenShare) {
    const screenShareStream = isScreenSharing 
      ? screenStream 
      : remoteStreams.get(screenSharingUserId)?.stream;

    const screenShareUsername = isScreenSharing 
      ? currentUser.username 
      : remoteStreams.get(screenSharingUserId)?.username;

    return (
      <div style={gridStyle}>
        {/* Featured Screen Share */}
        <div style={{ flex: 1, minHeight: '400px' }}>
          <VideoTile
            videoRef={isScreenSharing ? { current: null } : undefined}
            stream={screenShareStream}
            username={screenShareUsername}
            isLocal={isScreenSharing}
            isScreenShare={true}
            isFeatured={true}
            connectionState={isScreenSharing ? 'connected' : peerStates.get(screenSharingUserId)}
          />
        </div>

        {/* Thumbnail Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 160px))',
          gap: '8px',
          maxHeight: '130px',
          overflowX: 'auto'
        }}>
          {/* Local Video */}
          <VideoTile
            videoRef={localVideoRef}
            stream={localStream}
            username={currentUser.username}
            isLocal={true}
            isVideoOff={isVideoOff}
            isMuted={isMuted}
          />

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([peerId, data]) => (
            <VideoTile
              key={peerId}
              videoRef={{ current: remoteVideosRef.current[peerId] }}
              stream={data.stream}
              username={data.username}
              connectionState={peerStates.get(peerId)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Regular grid layout
  return (
    <div style={gridStyle}>
      {/* Local Video */}
      <VideoTile
        videoRef={localVideoRef}
        stream={localStream}
        username={currentUser.username}
        isLocal={true}
        isVideoOff={isVideoOff}
        isMuted={isMuted}
      />

      {/* Remote Videos */}
      {Array.from(remoteStreams.entries()).map(([peerId, data]) => (
        <VideoTile
          key={peerId}
          videoRef={(el) => { remoteVideosRef.current[peerId] = el; }}
          stream={data.stream}
          username={data.username}
          connectionState={peerStates.get(peerId)}
        />
      ))}
    </div>
  );
};

export default VideoGrid;