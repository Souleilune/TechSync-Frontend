// frontend/src/components/chat/VideoGrid.js
// ✅ FIXED: Sidebar layout for participants during screen share

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { VideoOff, MicOff, Monitor, Wifi, WifiOff, User, ChevronLeft, ChevronRight } from 'lucide-react';

const VideoTile = ({ 
  stream, 
  username, 
  isLocal = false, 
  isVideoOff = false, 
  isMuted = false,
  isScreenShare = false,
  showAsScreenShare = false,
  connectionState = 'connected',
  isFeatured = false,
  mirrored = false,
  compact = false
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

  const sizes = compact ? {
    borderRadius: '8px',
    avatarSize: '32px',
    avatarFontSize: '14px',
    fontSize: '10px',
    padding: '3px 6px',
    iconSize: 10
  } : {
    borderRadius: isFeatured ? '16px' : '10px',
    avatarSize: isFeatured ? '80px' : '40px',
    avatarFontSize: isFeatured ? '32px' : '18px',
    fontSize: isFeatured ? '14px' : '11px',
    padding: isFeatured ? '8px 12px' : '4px 6px',
    iconSize: isFeatured ? 14 : 11
  };

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'rgba(26, 28, 32, 0.95)',
        borderRadius: sizes.borderRadius,
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        border: isScreenShare || showAsScreenShare
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
          display: (isVideoOff && !isScreenShare && !showAsScreenShare) ? 'none' : 'block',
          backgroundColor: '#000'
        }}
      />

      {/* Video Off Placeholder */}
      {isVideoOff && !isScreenShare && !showAsScreenShare && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(26, 28, 32, 0.95)',
          gap: compact ? '4px' : '6px'
        }}>
          <div style={{
            width: sizes.avatarSize,
            height: sizes.avatarSize,
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: sizes.avatarFontSize,
            color: '#3b82f6',
            fontWeight: '600'
          }}>
            {username?.charAt(0).toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Screen Share Badge - Featured */}
      {isScreenShare && isFeatured && (
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

      {/* Screen Share Indicator - Sidebar tile */}
      {showAsScreenShare && !isFeatured && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          padding: '2px 4px',
          backgroundColor: 'rgba(16, 185, 129, 0.9)',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Monitor size={8} color="white" />
        </div>
      )}

      {/* User Info Bar */}
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '4px',
        right: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: sizes.padding,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderRadius: '4px'
      }}>
        <span style={{ 
          fontSize: sizes.fontSize, 
          color: 'white',
          fontWeight: '500',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1
        }}>
          {username} {isLocal && '(You)'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
          {!isLocal && (
            <ConnectionIcon size={sizes.iconSize} color={connectionIndicator.color} />
          )}
          {isMuted && <MicOff size={sizes.iconSize} color="#ef4444" />}
          {isVideoOff && !isScreenShare && !showAsScreenShare && (
            <VideoOff size={sizes.iconSize} color="#ef4444" />
          )}
        </div>
      </div>
    </div>
  );
};

// Placeholder tile for users who are screen sharing
const ScreenSharePlaceholderTile = ({ username, connectionState = 'connected' }) => {
  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'rgba(26, 28, 32, 0.95)',
        borderRadius: '10px',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        border: '2px solid rgba(16, 185, 129, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <User size={20} color="#10b981" />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#10b981',
          fontSize: '10px'
        }}>
          <Monitor size={10} />
          <span>Presenting</span>
        </div>
      </div>

      {/* User Info Bar */}
      <div style={{
        position: 'absolute',
        bottom: '4px',
        left: '4px',
        right: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 6px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderRadius: '4px'
      }}>
        <span style={{ 
          fontSize: '11px', 
          color: 'white', 
          fontWeight: '500',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {username}
        </span>
      </div>
    </div>
  );
};

const VideoGrid = ({
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const containerRef = useRef(null);
  
  const totalParticipants = remoteStreams.size + 1;
  const hasScreenShare = isScreenSharing || (screenSharingUserId && screenSharingUserId !== 'local');

  // Calculate grid style for normal view
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
      alignContent: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '8px'
    };
  }, [totalParticipants]);

  // Get screen share info
  const screenShareInfo = useMemo(() => {
    if (isScreenSharing && screenStream) {
      return {
        stream: screenStream,
        username: currentUser.username,
        visitorId: 'local',
        isLocal: true
      };
    } else if (screenSharingUserId && screenSharingUserId !== 'local') {
      const remoteData = remoteStreams.get(screenSharingUserId);
      if (remoteData) {
        return {
          stream: remoteData.stream,
          username: remoteData.username,
          visitorId: screenSharingUserId,
          isLocal: false
        };
      }
    }
    return null;
  }, [isScreenSharing, screenStream, screenSharingUserId, remoteStreams, currentUser.username]);

  // Sidebar width based on participant count
  const sidebarWidth = useMemo(() => {
    if (sidebarCollapsed) return 48;
    if (totalParticipants <= 2) return 200;
    if (totalParticipants <= 4) return 220;
    return 240;
  }, [totalParticipants, sidebarCollapsed]);

  // Tile height in sidebar
  const tileHeight = useMemo(() => {
    if (totalParticipants <= 2) return 140;
    if (totalParticipants <= 4) return 120;
    if (totalParticipants <= 6) return 110;
    return 100;
  }, [totalParticipants]);

  // SCREEN SHARE LAYOUT with SIDEBAR
  if (hasScreenShare && screenShareInfo) {
    return (
      <div 
        ref={containerRef}
        style={{
          display: 'flex',
          height: '100%',
          gap: '8px',
          overflow: 'hidden'
        }}
      >
        {/* Participants Sidebar - LEFT */}
        <div style={{
          width: `${sidebarWidth}px`,
          minWidth: `${sidebarWidth}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          position: 'relative'
        }}>
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '-12px',
              zIndex: 10,
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
            title={sidebarCollapsed ? 'Show participants' : 'Hide participants'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Sidebar Header */}
          {!sidebarCollapsed && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#9ca3af' 
              }}>
                Participants ({totalParticipants})
              </span>
            </div>
          )}

          {/* Participants List */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: sidebarCollapsed ? '4px' : '0 4px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent'
          }}>
            {/* Collapsed View - Just avatars */}
            {sidebarCollapsed ? (
              <>
                {/* Local User Avatar */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: isVideoOff ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: '2px solid rgba(59, 130, 246, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                  title={`${currentUser.username} (You)`}
                >
                  {isVideoOff ? (
                    <span style={{ color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                      {currentUser.username?.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <video
                      autoPlay
                      playsInline
                      muted
                      ref={(el) => { if (el && localStream) el.srcObject = localStream; }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)'
                      }}
                    />
                  )}
                  {isScreenSharing && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      backgroundColor: '#10b981',
                      borderRadius: '50%',
                      padding: '2px'
                    }}>
                      <Monitor size={8} color="white" />
                    </div>
                  )}
                </div>

                {/* Remote User Avatars */}
                {Array.from(remoteStreams.entries()).map(([visitorId, data]) => {
                  const isThisUserSharing = screenSharingUserId === visitorId;
                  return (
                    <div
                      key={visitorId}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: isThisUserSharing ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
                        border: isThisUserSharing ? '2px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                      title={data.username}
                    >
                      {isThisUserSharing ? (
                        <User size={16} color="#10b981" />
                      ) : (
                        <video
                          autoPlay
                          playsInline
                          ref={(el) => { if (el && data.stream) el.srcObject = data.stream; }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      {isThisUserSharing && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          backgroundColor: '#10b981',
                          borderRadius: '50%',
                          padding: '2px'
                        }}>
                          <Monitor size={8} color="white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                {/* LOCAL USER TILE */}
                <div style={{ height: `${tileHeight}px`, minHeight: `${tileHeight}px` }}>
                  <VideoTile
                    stream={localStream}
                    username={currentUser.username}
                    isLocal={true}
                    isVideoOff={isVideoOff}
                    isMuted={isMuted}
                    mirrored={true}
                    showAsScreenShare={isScreenSharing}
                  />
                </div>

                {/* REMOTE PARTICIPANTS */}
                {Array.from(remoteStreams.entries()).map(([visitorId, data]) => {
                  const isThisUserSharing = screenSharingUserId === visitorId;
                  
                  return (
                    <div 
                      key={visitorId}
                      style={{ height: `${tileHeight}px`, minHeight: `${tileHeight}px` }}
                    >
                      {isThisUserSharing ? (
                        <ScreenSharePlaceholderTile
                          username={data.username}
                          connectionState={peerStates.get(visitorId)}
                        />
                      ) : (
                        <VideoTile
                          stream={data.stream}
                          username={data.username}
                          connectionState={peerStates.get(visitorId)}
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Featured Screen Share - RIGHT (takes remaining space) */}
        <div style={{ 
          flex: 1,
          minWidth: 0,
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          <VideoTile
            stream={screenShareInfo.stream}
            username={screenShareInfo.username}
            isLocal={screenShareInfo.isLocal}
            isScreenShare={true}
            isFeatured={true}
            connectionState={screenShareInfo.isLocal ? 'connected' : peerStates.get(screenShareInfo.visitorId)}
          />
        </div>
      </div>
    );
  }

  // NORMAL GRID LAYOUT (no screen share)
  return (
    <div ref={containerRef} style={gridStyle}>
      <div style={{ aspectRatio: '16/9', maxHeight: '280px' }}>
        <VideoTile
          stream={localStream}
          username={currentUser.username}
          isLocal={true}
          isVideoOff={isVideoOff}
          isMuted={isMuted}
          mirrored={true}
        />
      </div>

      {Array.from(remoteStreams.entries()).map(([visitorId, data]) => (
        <div key={visitorId} style={{ aspectRatio: '16/9', maxHeight: '280px' }}>
          <VideoTile
            stream={data.stream}
            username={data.username}
            connectionState={peerStates.get(visitorId)}
          />
        </div>
      ))}
    </div>
  );
};

export default VideoGrid;