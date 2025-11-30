// frontend/src/components/chat/VideoGrid.js
// ✅ FIXED: Properly handles separate camera and screen streams

import React, { useMemo, useRef, useEffect } from 'react';
import { VideoOff, MicOff, Monitor, Wifi, WifiOff } from 'lucide-react';

const VideoTile = ({ 
  stream, 
  username, 
  isLocal = false, 
  isVideoOff = false, 
  isMuted = false,
  isScreenShare = false,
  connectionState = 'connected',
  isFeatured = false,
  mirrored = false
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

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
      style={{
        position: 'relative',
        backgroundColor: 'rgba(26, 28, 32, 0.95)',
        borderRadius: isFeatured ? '16px' : '12px',
        overflow: 'hidden',
        aspectRatio: isFeatured ? 'auto' : '16/9',
        height: isFeatured ? '100%' : 'auto',
        border: isScreenShare 
          ? '2px solid rgba(16, 185, 129, 0.5)'
          : isLocal 
            ? '2px solid rgba(59, 130, 246, 0.5)' 
            : '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: isFeatured ? 'contain' : 'cover',
          transform: mirrored ? 'scaleX(-1)' : 'none',
          display: (isVideoOff && !isScreenShare) ? 'none' : 'block',
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
          {isLocal ? 'You are sharing your screen' : `${username} is sharing`}
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
          {isMuted && <MicOff size={isFeatured ? 14 : 12} color="#ef4444" />}
          {isVideoOff && !isScreenShare && (
            <VideoOff size={isFeatured ? 14 : 12} color="#ef4444" />
          )}
        </div>
      </div>
    </div>
  );
};

const VideoGrid = ({
  localStream,      // Camera stream (always)
  screenStream,     // Screen share stream (when sharing)
  remoteStreams,
  currentUser,
  isScreenSharing,
  screenSharingUserId,
  isVideoOff,
  isMuted,
  peerStates
}) => {
  const remoteVideosRef = useRef({});
  
  const totalParticipants = remoteStreams.size + 1;
  const hasScreenShare = isScreenSharing || (screenSharingUserId && screenSharingUserId !== 'local');

  // Update remote video refs
  useEffect(() => {
    remoteStreams.forEach((data, visitorId) => {
      const videoEl = remoteVideosRef.current[visitorId];
      if (videoEl && data.stream) {
        if (videoEl.srcObject !== data.stream) {
          videoEl.srcObject = data.stream;
        }
      }
    });
  }, [remoteStreams]);

  // Get the screen share stream based on who's sharing
  const getScreenShareInfo = () => {
    if (isScreenSharing && screenStream) {
      // Local user is sharing
      return {
        stream: screenStream,
        username: currentUser.username,
        isLocal: true
      };
    } else if (screenSharingUserId && screenSharingUserId !== 'local') {
      // Remote user is sharing - their video track IS the screen
      const remoteData = remoteStreams.get(screenSharingUserId);
      if (remoteData) {
        return {
          stream: remoteData.stream,
          username: remoteData.username,
          isLocal: false
        };
      }
    }
    return null;
  };

  const screenShareInfo = getScreenShareInfo();

  // ✅ SCREEN SHARE LAYOUT: Featured screen + thumbnail strip
  if (hasScreenShare && screenShareInfo) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%'
      }}>
        {/* Featured Screen Share */}
        <div style={{ flex: 1, minHeight: '400px' }}>
          <VideoTile
            stream={screenShareInfo.stream}
            username={screenShareInfo.username}
            isLocal={screenShareInfo.isLocal}
            isScreenShare={true}
            isFeatured={true}
            connectionState={screenShareInfo.isLocal ? 'connected' : peerStates.get(screenSharingUserId)}
          />
        </div>

        {/* Thumbnail Strip - All participants including local camera */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 160px))',
          gap: '8px',
          maxHeight: '130px',
          overflowX: 'auto',
          padding: '4px'
        }}>
          {/* ✅ LOCAL CAMERA - Always shows camera, NOT screen */}
          <VideoTile
            stream={localStream}
            username={currentUser.username}
            isLocal={true}
            isVideoOff={isVideoOff}
            isMuted={isMuted}
            mirrored={true}  // Mirror local camera
          />

          {/* Remote Participants */}
          {Array.from(remoteStreams.entries())
            .filter(([visitorId]) => {
              // If remote user is screen sharing, their main stream shows screen
              // We still show them in thumbnails
              return true;
            })
            .map(([visitorId, data]) => (
              <VideoTile
                key={visitorId}
                stream={data.stream}
                username={data.username}
                connectionState={peerStates.get(visitorId)}
                // If this user is screen sharing, we're seeing their screen, not camera
                isScreenShare={screenSharingUserId === visitorId}
              />
            ))}
        </div>
      </div>
    );
  }

  // ✅ NORMAL GRID LAYOUT: No screen share active
  const gridStyle = useMemo(() => {
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
  }, [totalParticipants]);

  return (
    <div style={gridStyle}>
      {/* Local Camera */}
      <VideoTile
        stream={localStream}
        username={currentUser.username}
        isLocal={true}
        isVideoOff={isVideoOff}
        isMuted={isMuted}
        mirrored={true}
      />

      {/* Remote Participants */}
      {Array.from(remoteStreams.entries()).map(([visitorId, data]) => (
        <VideoTile
          key={visitorId}
          stream={data.stream}
          username={data.username}
          connectionState={peerStates.get(visitorId)}
        />
      ))}
    </div>
  );
};

export default VideoGrid;