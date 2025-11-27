// frontend/src/components/chat/VideoCall.js
// ✅ PRODUCTION VERSION WITH CRITICAL FIXES APPLIED
import React, { useState, useEffect, useRef, useCallback } from 'react';
import VideoCallChat from './VideoCallChat';
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
  Users
} from 'lucide-react';

const VideoCall = ({ 
  socket, 
  roomId, 
  projectId, 
  currentUser, 
  onEndCall,
  isInitiator = false 
}) => {
  // State management
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended
  const [screenSharingUser, setScreenSharingUser] = useState(null); // null, 'local', or userId


  // Refs
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peerConnections = useRef(new Map());
  const screenStream = useRef(null);
  const containerRef = useRef(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('projectSidebarCollapsed');
    return saved === 'true';
  });

   useEffect(() => {
    const handleSidebarToggle = (event) => {
      setIsSidebarCollapsed(event.detail.collapsed);
    };

    window.addEventListener('projectSidebarToggle', handleSidebarToggle);
    return () => window.removeEventListener('projectSidebarToggle', handleSidebarToggle);
  }, []);


  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      console.log('🎥 [VIDEO] Requesting camera and microphone permissions...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ [VIDEO] Got media stream');
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Notify others in the room
      socket.emit('video_call_join', {
        roomId,
        projectId,
        userId: currentUser.id,
        username: currentUser.username,
        avatarUrl: currentUser.avatar_url
      });

      console.log('✅ [VIDEO] Joined video room');
      setCallStatus('connected');
    } catch (error) {
      console.error('❌ [VIDEO] Failed to get media:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Camera/microphone permission denied. Please allow access and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No camera or microphone found. Please connect a device and try again.');
      } else {
        alert('Failed to access camera/microphone: ' + error.message);
      }
      
      // Don't call onEndCall here - let user close manually
      setCallStatus('ended');
    }
  }, [socket, roomId, projectId, currentUser]);

  // Create peer connection
  const createPeerConnection = useCallback((userId, username) => {
    try {
      const pc = new RTCPeerConnection(iceServers);

      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('video_ice_candidate', {
            roomId,
            projectId,
            targetUserId: userId,
            candidate: event.candidate
          });
        }
      };

      // ✅ FIX #1: Handle remote stream with username preservation
      pc.ontrack = (event) => {
        console.log('📹 [VIDEO] Received remote track from:', username);
        const stream = event.streams[0];
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const existingData = newMap.get(userId) || {};
          
          // ✅ CRITICAL: Preserve username when updating stream
          newMap.set(userId, { 
            stream, 
            username: existingData.username || username // Keep existing or use new
          });
          return newMap;
        });
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`🔌 [VIDEO] Connection state with ${username}:`, pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          handleRemoveParticipant(userId);
        }
      };

      peerConnections.current.set(userId, pc);
      return pc;
    } catch (error) {
      console.error('❌ [VIDEO] Failed to create peer connection:', error);
      return null;
    }
  }, [localStream, socket, roomId, projectId]);

  // ✅ FIX #2: Handle new participant with username storage
  const handleNewParticipant = useCallback(async (data) => {
    const { userId, username } = data;
    
    if (userId === currentUser.id) return;

    console.log('👤 [VIDEO] New participant:', username);
    setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);

    // ✅ CRITICAL: Store username in remoteStreams immediately
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, { 
        stream: null, // Will be set when tracks arrive
        username: username 
      });
      return newMap;
    });

    const pc = createPeerConnection(userId, username);
    if (!pc) return;

    try {
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('video_offer', {
        roomId,
        projectId,
        targetUserId: userId,
        offer: pc.localDescription
      });
    } catch (error) {
      console.error('❌ [VIDEO] Failed to create offer:', error);
    }
  }, [currentUser.id, createPeerConnection, socket, roomId, projectId]);

  // Handle receiving offer
  const handleVideoOffer = useCallback(async (data) => {
    const { userId, username, offer } = data;
    
    console.log('📨 [VIDEO] Received offer from:', username);

    const pc = createPeerConnection(userId, username);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('video_answer', {
        roomId,
        projectId,
        targetUserId: userId,
        answer: pc.localDescription
      });

      setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
    } catch (error) {
      console.error('❌ [VIDEO] Failed to handle offer:', error);
    }
  }, [createPeerConnection, socket, roomId, projectId]);

  // Handle receiving answer
  const handleVideoAnswer = useCallback(async (data) => {
    const { userId, answer } = data;
    
    console.log('📨 [VIDEO] Received answer from user:', userId);

    const pc = peerConnections.current.get(userId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('❌ [VIDEO] Failed to handle answer:', error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (data) => {
    const { userId, candidate } = data;
    
    const pc = peerConnections.current.get(userId);
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('❌ [VIDEO] Failed to add ICE candidate:', error);
    }
  }, []);

  // Handle participant leaving
  const handleRemoveParticipant = useCallback((userId) => {
    console.log('👋 [VIDEO] Participant left:', userId);
    
    const pc = peerConnections.current.get(userId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(userId);
    }

    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });

    setParticipants(prev => prev.filter(p => p.userId !== userId));
  }, []);

  // ✅ FIX #3: Toggle mute with socket notification
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        console.log('🎤 [VIDEO] Microphone toggled:', audioTrack.enabled ? 'ON' : 'OFF');
        
        // ✅ CRITICAL: Notify other participants
        socket.emit('video_track_toggle', {
          roomId,
          projectId,
          userId: currentUser.id,
          trackKind: 'audio',
          enabled: audioTrack.enabled
        });
      }
    }
  }, [localStream, socket, roomId, projectId, currentUser.id]);

  // ✅ FIX #4: Toggle video with socket notification
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        
        console.log('📹 [VIDEO] Camera toggled:', videoTrack.enabled ? 'ON' : 'OFF');
        
        // ✅ CRITICAL: Notify other participants
        socket.emit('video_track_toggle', {
          roomId,
          projectId,
          userId: currentUser.id,
          trackKind: 'video',
          enabled: videoTrack.enabled
        });
      }
    }
  }, [localStream, socket, roomId, projectId, currentUser.id]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false
        });
  
        screenStream.current = stream;
  
        // Replace video track in all peer connections
        const videoTrack = stream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
  
        // Handle stream end (user clicks "Stop sharing" in browser)
        videoTrack.onended = () => {
          toggleScreenShare();
        };
  
        setIsScreenSharing(true);
        setScreenSharingUser('local');
  
        // Notify other participants
        socket.emit('screen_share_started', {
          roomId,
          projectId,
          userId: currentUser.id
        });
  
      } else {
        // Stop screen sharing
        console.log('🛑 [VIDEO] Stopping screen share, restoring camera...');
        
        // Stop screen stream tracks
        if (screenStream.current) {
          screenStream.current.getTracks().forEach(track => {
            console.log('🛑 [VIDEO] Stopping screen track:', track.kind);
            track.stop();
          });
          screenStream.current = null;
        }
  
        // Restore camera video track to peer connections
        if (localStream && localStream.getVideoTracks().length > 0) {
          const cameraVideoTrack = localStream.getVideoTracks()[0];
          console.log('📹 [VIDEO] Restoring camera track, enabled:', cameraVideoTrack.enabled);
          
          // Ensure camera track is enabled (respect current video on/off state)
          cameraVideoTrack.enabled = !isVideoOff;
          
          // Replace screen share track with camera track in all peer connections
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              console.log('🔄 [VIDEO] Replacing screen track with camera track');
              sender.replaceTrack(cameraVideoTrack)
                .then(() => console.log('✅ [VIDEO] Camera track restored successfully'))
                .catch(err => console.error('❌ [VIDEO] Failed to restore camera:', err));
            }
          });
  
          // Ensure local video element shows the camera stream
          if (localVideoRef.current && localVideoRef.current.srcObject !== localStream) {
            console.log('🎥 [VIDEO] Re-attaching local stream to video element');
            localVideoRef.current.srcObject = localStream;
          }
        } else {
          console.error('❌ [VIDEO] No local camera stream available to restore!');
        }
  
        setIsScreenSharing(false);
        setScreenSharingUser(null);
  
        // Notify other participants
        socket.emit('screen_share_stopped', {
          roomId,
          projectId,
          userId: currentUser.id
        });
  
        console.log('✅ [VIDEO] Screen share stopped, camera restored');
      }
    } catch (error) {
      console.error('❌ [VIDEO] Screen share error:', error);
      
      // Reset states on error
      if (isScreenSharing) {
        setIsScreenSharing(false);
        setScreenSharingUser(null);
        
        // Try to restore camera on error
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
    }
  }, [isScreenSharing, localStream, isVideoOff, socket, roomId, projectId, currentUser.id]);

  // Toggle fullscreen
  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  // End call
  const handleEndCall = useCallback(() => {
    console.log('🔴 [VIDEO] Ending call...');
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Notify server
    socket.emit('video_call_leave', {
      roomId,
      projectId,
      userId: currentUser.id
    });

    setCallStatus('ended');
    
    // Call parent's end handler
    onEndCall();
  }, [localStream, socket, roomId, projectId, currentUser.id, onEndCall]);

  // ✅ FIX #5: Setup socket listeners with screen share and track toggle
  useEffect(() => {
    if (!socket) return;

    socket.on('video_participant_joined', handleNewParticipant);
    socket.on('video_offer', handleVideoOffer);
    socket.on('video_answer', handleVideoAnswer);
    socket.on('video_ice_candidate', handleIceCandidate);
    socket.on('video_participant_left', (data) => handleRemoveParticipant(data.userId));
    
    // Screen share listeners
    socket.on('screen_share_started', (data) => {
      console.log('🖥️ [VIDEO] Remote user started sharing:', data.userId);
      setScreenSharingUser(data.userId);
    });
  
    socket.on('screen_share_stopped', (data) => {
      console.log('🖥️ [VIDEO] Remote user stopped sharing:', data.userId);
      if (screenSharingUser === data.userId) {
        setScreenSharingUser(null);
      }
    });

    // ✅ CRITICAL: Video track toggle listener (camera/mic on/off)
    socket.on('video_track_toggle', (data) => {
      const { userId, trackKind, enabled } = data;
      console.log(`🎥 [VIDEO] Remote ${trackKind} toggle from ${userId}: ${enabled ? 'ON' : 'OFF'}`);
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const remoteData = newMap.get(userId);
        
        if (remoteData?.stream) {
          const tracks = trackKind === 'video' 
            ? remoteData.stream.getVideoTracks() 
            : remoteData.stream.getAudioTracks();
          
          tracks.forEach(track => {
            track.enabled = enabled;
            console.log(`✅ [VIDEO] Updated ${trackKind} track for ${userId}: enabled=${track.enabled}`);
          });
        }
        
        return newMap;
      });
    });

    socket.on('video_current_participants', async (data) => {
      console.log('👥 [VIDEO] Received current participants:', data.participants);
      
      const { participants: currentParticipants } = data;
      
      // For each existing participant, create peer connection and send offer
      for (const participant of currentParticipants) {
        const { userId, username } = participant;
        
        if (userId === currentUser.id) continue;
        
        console.log('👤 [VIDEO] Creating connection to existing participant:', username);
        
        // Add to participants list
        setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
        
        // Store username in remoteStreams
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, { 
            stream: null,
            username: username 
          });
          return newMap;
        });
        
        // Create peer connection
        const pc = createPeerConnection(userId, username);
        if (!pc) continue;
        
        try {
          // Create and send offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.emit('video_offer', {
            roomId,
            projectId,
            targetUserId: userId,
            offer: pc.localDescription
          });
          
          console.log('✅ [VIDEO] Sent offer to existing participant:', username);
        } catch (error) {
          console.error('❌ [VIDEO] Failed to create offer for existing participant:', error);
        }
      }
    });
  
    return () => {
      socket.off('video_participant_joined', handleNewParticipant);
      socket.off('video_offer', handleVideoOffer);
      socket.off('video_answer', handleVideoAnswer);
      socket.off('video_ice_candidate', handleIceCandidate);
      socket.off('video_participant_left');
      socket.off('screen_share_started');
      socket.off('screen_share_stopped');
      socket.off('video_track_toggle');
      socket.off('video_current_participants');
    };
  }, [socket, handleNewParticipant, handleVideoOffer, handleVideoAnswer, handleIceCandidate, handleRemoveParticipant, screenSharingUser]);

  // Initialize media on mount
  useEffect(() => {
    initializeMedia();

    // Cleanup on unmount only
    return () => {
      // Stop all tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop());
      }

      // Close all peer connections
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();

      // Notify server
      if (socket) {
        socket.emit('video_call_leave', {
          roomId,
          projectId,
          userId: currentUser.id
        });
      }
    };
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('🎥 [VIDEO] LocalStream changed, ensuring video element connection');
      if (localVideoRef.current.srcObject !== localStream) {
        console.log('🔄 [VIDEO] Reconnecting local stream to video element');
        localVideoRef.current.srcObject = localStream;
      }
      
      // Log track states
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('📹 [VIDEO] Video track enabled:', videoTrack.enabled, 'readyState:', videoTrack.readyState);
      }
    }
  }, [localStream, isScreenSharing]);

  // Update remote video elements
  useEffect(() => {
    remoteStreams.forEach((data, userId) => {
      const videoElement = remoteVideosRef.current[userId];
      if (videoElement && data.stream) {
        videoElement.srcObject = data.stream;
      }
    });
  }, [remoteStreams]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: isSidebarCollapsed ? '60px' : '250px',
        right: 0,
        bottom: 0,
        backgroundColor: '#0F1116',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        transition: 'left 0.3s ease'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: 'rgba(26, 28, 32, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Video size={24} color="#3b82f6" />
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'white' }}>
              Video Call
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
              {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            padding: '6px 12px',
            backgroundColor: callStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderRadius: '6px',
            fontSize: '14px',
            color: callStatus === 'connected' ? '#10b981' : '#ef4444'
          }}>
            {callStatus === 'connected' ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div style={{
  flex: 1,
  padding: '16px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
}}>
  {/* Screen Share Display - Large Container */}
  {screenSharingUser && (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      flex: 1,
      minHeight: '400px'
    }}>
      {/* Main Screen Share */}
      <div style={{
        position: 'relative',
        backgroundColor: 'rgba(26, 28, 32, 0.95)',
        borderRadius: '12px',
        overflow: 'hidden',
        flex: 1,
        border: '2px solid rgba(16, 185, 129, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {screenSharingUser === 'local' ? (
          // Local screen share
          <video
            ref={el => {
              if (el && screenStream.current) {
                el.srcObject = screenStream.current;
              }
            }}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000'
            }}
          />
        ) : (
          // Remote screen share
          <video
            ref={el => {
              const remoteData = remoteStreams.get(screenSharingUser);
              if (el && remoteData?.stream) {
                el.srcObject = remoteData.stream;
              }
            }}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000'
            }}
          />
        )}
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
          {/* ✅ FIX: This will now show correct username instead of "undefined" */}
          {screenSharingUser === 'local' ? 'You are sharing your screen' : 
           `${remoteStreams.get(screenSharingUser)?.username} is sharing`}
        </div>
      </div>

      {/* Camera Views - Small Row Below Screen Share */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 150px))',
        gap: '8px',
        maxHeight: '120px',
        padding: '8px 0'
      }}>
        {/* Local Camera (small) */}
        <div style={{
          position: 'relative',
          backgroundColor: 'rgba(26, 28, 32, 0.95)',
          borderRadius: '8px',
          overflow: 'hidden',
          aspectRatio: '16/9',
          border: screenSharingUser === 'local' ? 
                 '2px solid rgba(59, 130, 246, 0.5)' : 
                 '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: isVideoOff ? 'none' : 'block'
            }}
          />
          {/* Show placeholder when video is off */}
          {isVideoOff && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(26, 28, 32, 0.95)'
            }}>
              <VideoOff size={24} color="#ef4444" />
            </div>
          )}
          <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '4px',
            padding: '3px 6px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '4px',
            fontSize: '10px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{currentUser.username}</span>
            {isMuted && <MicOff size={10} color="#ef4444" />}
            {screenSharingUser === 'local' && <Monitor size={10} color="#10b981" />}
          </div>
        </div>

        {/* Remote Cameras (small) */}
        {Array.from(remoteStreams.entries())
          .filter(([userId]) => userId !== screenSharingUser)
          .map(([userId, data]) => (
          <div
            key={userId}
            style={{
              position: 'relative',
              backgroundColor: 'rgba(26, 28, 32, 0.95)',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <video
              ref={el => remoteVideosRef.current[userId] = el}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              padding: '3px 6px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '4px',
              fontSize: '10px',
              color: 'white'
            }}>
              {data.username}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* Normal Video Grid - When No Screen Sharing */}
  {!screenSharingUser && (
    <div style={{
      display: 'grid',
      gridTemplateColumns: remoteStreams.size === 0 ? '1fr' : 
                          remoteStreams.size === 1 ? 'repeat(2, 1fr)' :
                          remoteStreams.size === 2 ? 'repeat(2, 1fr)' :
                          'repeat(3, 1fr)',
      gap: '12px',
      alignContent: 'start'
    }}>
      {/* Local Video */}
      <div style={{
        position: 'relative',
        backgroundColor: 'rgba(26, 28, 32, 0.95)',
        borderRadius: '12px',
        overflow: 'hidden',
        aspectRatio: '16/9',
        maxHeight: '280px',
        border: '2px solid rgba(59, 130, 246, 0.3)'
      }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // Mirror for camera
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          padding: '6px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '6px',
          fontSize: '14px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{currentUser.username} (You)</span>
          {isMuted && <MicOff size={14} color="#ef4444" />}
          {isVideoOff && <VideoOff size={14} color="#ef4444" />}
        </div>
      </div>

      {/* Remote Videos */}
      {Array.from(remoteStreams.entries()).map(([userId, data]) => (
        <div
          key={userId}
          style={{
            position: 'relative',
            backgroundColor: 'rgba(26, 28, 32, 0.95)',
            borderRadius: '12px',
            overflow: 'hidden',
            aspectRatio: '16/9',
            maxHeight: '280px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <video
            ref={el => remoteVideosRef.current[userId] = el}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            padding: '6px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '6px',
            fontSize: '14px',
            color: 'white'
          }}>
            {data.username}
          </div>
        </div>
      ))}
    </div>
  )}
</div>
      {/* Controls */}
     <div style={{
  padding: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '20px'
}}>
  <button
    onClick={toggleMute}
    style={{
      padding: '0',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: isMuted ? '#ef4444' : '#3b82f6',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title={isMuted ? 'Unmute' : 'Mute'}
  >
    {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
  </button>

  <button
    onClick={toggleVideo}
    style={{
      padding: '0',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: isVideoOff ? '#ef4444' : '#3b82f6',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
  >
    {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
  </button>

  <button
    onClick={toggleScreenShare}
    style={{
      padding: '0',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: isScreenSharing ? '#10b981' : '#3b82f6',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
  >
    {isScreenSharing ? <MonitorOff size={28} /> : <Monitor size={28} />}
  </button>

  <VideoCallChat
    socket={socket}
    roomId={roomId}
    projectId={projectId}
    currentUser={currentUser}
    participants={participants}
  />

  <button
    onClick={toggleFullScreen}
    style={{
      padding: '0',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: '#3b82f6',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
  >
    {isFullScreen ? <Minimize2 size={28} /> : <Maximize2 size={28} />}
  </button>

  <div style={{ 
    width: '2px', 
    height: '30px', 
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    margin: '0 8px'
  }} />

  <button
    onClick={handleEndCall}
    style={{
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: '#ef4444',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#dc2626';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '#ef4444';
    }}
    title="End call"
  >
    <PhoneOff size={18} />
    End Call
  </button>
</div>


    </div>
  );
};

export default VideoCall;