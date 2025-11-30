// frontend/src/components/chat/VideoCall.js
// Production-ready VideoCall component

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';
import VideoCallChat from './VideoCallChat';
import VideoGrid from './VideoGrid';
import VideoControls from './VideoControls';
import ConnectionStatus from './ConnectionStatus';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Monitor, 
  MonitorOff,
  Maximize2,
  Minimize2,
  Settings,
  Users
} from 'lucide-react';

// Styles
const styles = {
  container: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F1116',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    transition: 'left 0.3s ease'
  },
  header: {
    padding: '16px 24px',
    backgroundColor: 'rgba(26, 28, 32, 0.95)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: 'white'
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#9ca3af'
  },
  mainContent: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  controlBar: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    backgroundColor: 'rgba(26, 28, 32, 0.95)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  }
};

const VideoCall = ({ 
  socket, 
  roomId, 
  projectId, 
  currentUser, 
  onEndCall,
  isInitiator = false 
}) => {
  // Local UI state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callStatus, setCallStatus] = useState('connecting');
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const localVideoRef = useRef(null);
  const containerRef = useRef(null);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('projectSidebarCollapsed');
    return saved === 'true';
  });

  // WebRTC hook
  const {
    localStream,
    screenStream,
    remoteStreams,
    peerStates,
    isScreenSharing,
    screenSharingUserId,
    error,
    initializeMedia,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanupPeerConnection,
    cleanup
  } = useWebRTC({ socket, roomId, projectId, currentUser });

  // Sidebar toggle listener
  useEffect(() => {
    const handleSidebarToggle = (event) => {
      setIsSidebarCollapsed(event.detail.collapsed);
    };

    window.addEventListener('projectSidebarToggle', handleSidebarToggle);
    return () => window.removeEventListener('projectSidebarToggle', handleSidebarToggle);
  }, []);

  // Initialize call
  useEffect(() => {
    const startCall = async () => {
      try {
        await initializeMedia('medium');
        
        socket.emit('video_call_join', {
          roomId,
          projectId,
          userId: currentUser.id,
          username: currentUser.username,
          avatarUrl: currentUser.avatar_url
        });

        setCallStatus('connected');
      } catch (err) {
        console.error('❌ [VideoCall] Failed to start call:', err);
        setCallStatus('failed');
      }
    };

    startCall();

    return () => {
      cleanup();
      socket.emit('video_call_leave', {
        roomId,
        projectId,
        userId: currentUser.id
      });
    };
  }, []);

  // Update local video element
  useEffect(() => {
    if (localVideoRef.current) {
      if (isScreenSharing && screenStream) {
        localVideoRef.current.srcObject = screenStream;
      } else if (localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, screenStream, isScreenSharing]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleParticipantJoined = async (data) => {
      const { userId, username } = data;
      if (userId === currentUser.id) return;

      console.log(`👤 [VideoCall] Participant joined: ${username}`);
      
      setParticipants(prev => [
        ...prev.filter(p => p.userId !== userId),
        { userId, username }
      ]);

      // Send offer to new participant
      await createOffer(userId, username);
    };

    const handleParticipantLeft = (data) => {
      console.log(`👋 [VideoCall] Participant left: ${data.userId}`);
      cleanupPeerConnection(data.userId);
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    };

    const handleCurrentParticipants = async (data) => {
      console.log('👥 [VideoCall] Current participants:', data.participants);
      
      for (const participant of data.participants) {
        if (participant.userId === currentUser.id) continue;
        
        setParticipants(prev => [
          ...prev.filter(p => p.userId !== participant.userId),
          { userId: participant.userId, username: participant.username }
        ]);
        
        await createOffer(participant.userId, participant.username);
      }
    };

    const handleScreenShareStarted = (data) => {
      console.log('🖥️ [VideoCall] Remote screen share started:', data.userId);
      // State is managed in useWebRTC
    };

    const handleScreenShareStopped = (data) => {
      console.log('🖥️ [VideoCall] Remote screen share stopped:', data.userId);
    };

    const handleTrackToggle = (data) => {
      console.log(`🎥 [VideoCall] Remote track toggle: ${data.trackKind} = ${data.enabled}`);
      // Track state is managed in useWebRTC
    };

    // Register handlers
    socket.on('video_participant_joined', handleParticipantJoined);
    socket.on('video_participant_left', handleParticipantLeft);
    socket.on('video_current_participants', handleCurrentParticipants);
    socket.on('video_offer', handleOffer);
    socket.on('video_answer', handleAnswer);
    socket.on('video_ice_candidate', handleIceCandidate);
    socket.on('screen_share_started', handleScreenShareStarted);
    socket.on('screen_share_stopped', handleScreenShareStopped);
    socket.on('video_track_toggle', handleTrackToggle);

    return () => {
      socket.off('video_participant_joined', handleParticipantJoined);
      socket.off('video_participant_left', handleParticipantLeft);
      socket.off('video_current_participants', handleCurrentParticipants);
      socket.off('video_offer', handleOffer);
      socket.off('video_answer', handleAnswer);
      socket.off('video_ice_candidate', handleIceCandidate);
      socket.off('screen_share_started', handleScreenShareStarted);
      socket.off('screen_share_stopped', handleScreenShareStopped);
      socket.off('video_track_toggle', handleTrackToggle);
    };
  }, [socket, currentUser.id, createOffer, handleOffer, handleAnswer, 
      handleIceCandidate, cleanupPeerConnection]);

  // Control handlers
  const handleToggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleAudio(!newMuted);
  }, [isMuted, toggleAudio]);

  const handleToggleVideo = useCallback(() => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);
    toggleVideo(!newVideoOff);
  }, [isVideoOff, toggleVideo]);

  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const handleToggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  const handleEndCall = useCallback(() => {
    cleanup();
    socket.emit('video_call_leave', {
      roomId,
      projectId,
      userId: currentUser.id
    });
    onEndCall();
  }, [cleanup, socket, roomId, projectId, currentUser.id, onEndCall]);

  // Memoized participant count
  const participantCount = useMemo(() => {
    return remoteStreams.size + 1;
  }, [remoteStreams.size]);

  // Error display
  if (error) {
    return (
      <div style={{
        ...styles.container,
        left: isSidebarCollapsed ? '60px' : '250px',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
          <VideoOff size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
          <h2>Unable to Start Video Call</h2>
          <p style={{ color: '#9ca3af', marginBottom: '20px' }}>{error}</p>
          <button
            onClick={onEndCall}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        ...styles.container,
        left: isSidebarCollapsed ? '60px' : '250px'
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Video size={24} color="#3b82f6" />
          <div>
            <h2 style={styles.title}>Video Call</h2>
            <p style={styles.subtitle}>
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ConnectionStatus status={callStatus} />
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content - Video Grid */}
      <div style={styles.mainContent}>
        <VideoGrid
          localVideoRef={localVideoRef}
          localStream={localStream}
          screenStream={screenStream}
          remoteStreams={remoteStreams}
          currentUser={currentUser}
          isScreenSharing={isScreenSharing}
          screenSharingUserId={screenSharingUserId}
          isVideoOff={isVideoOff}
          isMuted={isMuted}
          peerStates={peerStates}
        />
      </div>

      {/* Control Bar */}
      <div style={styles.controlBar}>
        <VideoControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          isFullScreen={isFullScreen}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleFullScreen={handleToggleFullScreen}
          onEndCall={handleEndCall}
        />
        
        <VideoCallChat 
          socket={socket} 
          roomId={roomId} 
          projectId={projectId} 
          currentUser={currentUser} 
          participants={participants} 
        />
      </div>
    </div>
  );
};

export default VideoCall;