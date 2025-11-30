// frontend/src/components/chat/VideoCall.js
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
  Minimize2
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
  const [screenStream, setScreenStream] = useState(null); // Now state, not ref
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callStatus, setCallStatus] = useState('connecting');
  const [screenSharingUser, setScreenSharingUser] = useState(null);

  // Refs
  const localCameraRef = useRef(null);  // Always shows camera
  const localScreenRef = useRef(null);  // Shows screen when sharing
  const remoteVideosRef = useRef({});
  const peerConnections = useRef(new Map());
  const containerRef = useRef(null);
  const pendingCandidates = useRef(new Map());

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10
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

      console.log('✅ [VIDEO] Got media stream:', stream.id);
      setLocalStream(stream);
      
      if (localCameraRef.current) {
        localCameraRef.current.srcObject = stream;
      }

      socket.emit('video_call_join', {
        roomId,
        projectId,
        userId: currentUser.id,
        username: currentUser.username,
        avatarUrl: currentUser.avatar_url
      });

      setCallStatus('connected');
    } catch (error) {
      console.error('❌ [VIDEO] Failed to get media:', error);
      handleMediaError(error);
      setCallStatus('ended');
    }
  }, [socket, roomId, projectId, currentUser]);

  const handleMediaError = (error) => {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      alert('Camera/microphone permission denied. Please allow access and try again.');
    } else if (error.name === 'NotFoundError') {
      alert('No camera or microphone found. Please connect a device and try again.');
    } else {
      alert('Failed to access camera/microphone: ' + error.message);
    }
  };

  // Get the current video track to send (screen if sharing, camera otherwise)
  const getCurrentVideoTrack = useCallback(() => {
    if (isScreenSharing && screenStream) {
      return screenStream.getVideoTracks()[0];
    }
    return localStream?.getVideoTracks()[0] || null;
  }, [isScreenSharing, screenStream, localStream]);

  // Replace video track in all peer connections
  const replaceVideoTrackInPeers = useCallback(async (newTrack) => {
    const promises = [];
    
    peerConnections.current.forEach((pc, peerId) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        const promise = sender.replaceTrack(newTrack)
          .then(() => console.log(`✅ [VIDEO] Replaced video track for peer ${peerId}`))
          .catch(err => console.error(`❌ [VIDEO] Failed to replace track for ${peerId}:`, err));
        promises.push(promise);
      }
    });
    
    await Promise.allSettled(promises);
  }, []);

  const createPeerConnection = useCallback((userId, username) => {
    if (!localStream) {
      console.error('❌ [VIDEO] Cannot create peer connection - no local stream');
      return null;
    }

    let pc = peerConnections.current.get(userId);
    if (pc) {
      console.log(`♻️ [VIDEO] Reusing existing peer connection for ${username}`);
      return pc;
    }

    try {
      console.log(`🔗 [VIDEO] Creating new peer connection for ${username}`);
      pc = new RTCPeerConnection(iceServers);
      
      pc.makingOffer = false;
      pc.polite = currentUser.id < userId;

      // Add tracks - use screen track if sharing, otherwise camera
      const videoTrack = getCurrentVideoTrack();
      const audioTrack = localStream.getAudioTracks()[0];
      
      if (videoTrack) {
        pc.addTrack(videoTrack, localStream);
        console.log(`✅ [VIDEO] Added video track (${isScreenSharing ? 'screen' : 'camera'}) to ${username}`);
      }
      if (audioTrack) {
        pc.addTrack(audioTrack, localStream);
        console.log(`✅ [VIDEO] Added audio track to ${username}`);
      }

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('video_ice_candidate', {
            roomId,
            projectId,
            targetUserId: userId,
            candidate: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment
            }
          });
        }
      };

      // Track received
      pc.ontrack = (event) => {
        console.log(`📹 [VIDEO] Received ${event.track.kind} track from ${username}`);
        
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(userId);
          
          if (existing?.stream) {
            if (!existing.stream.getTracks().some(t => t.id === event.track.id)) {
              existing.stream.addTrack(event.track);
            }
          } else {
            newMap.set(userId, { stream, username });
          }
          
          return newMap;
        });
      };

      // Connection state handling
      pc.onconnectionstatechange = () => {
        console.log(`🔌 [VIDEO] Connection state with ${username}: ${pc.connectionState}`);
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setTimeout(() => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              handleParticipantLeft(userId);
            }
          }, 5000);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          pc.restartIce();
        }
      };

      peerConnections.current.set(userId, pc);
      
      // Process pending candidates
      const pending = pendingCandidates.current.get(userId);
      if (pending?.length > 0) {
        pending.forEach(candidate => {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        });
        pendingCandidates.current.delete(userId);
      }
      
      return pc;
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to create peer connection for ${username}:`, error);
      return null;
    }
  }, [localStream, socket, roomId, projectId, currentUser.id, getCurrentVideoTrack, isScreenSharing]);

  // Participant handling
  const handleNewParticipant = useCallback(async (data) => {
    const { userId, username } = data;
    if (userId === currentUser.id) return;

    console.log(`👤 [VIDEO] New participant: ${username}`);
    setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, { stream: null, username });
      return newMap;
    });

    const pc = createPeerConnection(userId, username);
    if (!pc) return;

    try {
      pc.makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('video_offer', {
        roomId,
        projectId,
        targetUserId: userId,
        offer: pc.localDescription,
        sdpId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
      
      console.log(`✅ [VIDEO] Sent offer to ${username}`);
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to create offer for ${username}:`, error);
    } finally {
      pc.makingOffer = false;
    }
  }, [currentUser.id, createPeerConnection, socket, roomId, projectId]);

  const handleVideoOffer = useCallback(async (data) => {
    const { userId, username, offer, sdpId } = data;
    console.log(`📨 [VIDEO] Received offer from ${username}`);

    const pc = createPeerConnection(userId, username);
    if (!pc) return;

    try {
      if (sdpId && pc.lastRemoteSdpId === sdpId) return;
      
      const offerCollision = pc.signalingState !== 'stable' || pc.makingOffer;
      
      if (offerCollision) {
        if (!pc.polite) {
          console.log(`🤝 [VIDEO] Impolite: Ignoring offer`);
          return;
        }
        await pc.setLocalDescription({ type: 'rollback' });
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      pc.lastRemoteSdpId = sdpId;
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('video_answer', {
        roomId,
        projectId,
        targetUserId: userId,
        answer: pc.localDescription,
        sdpId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to handle offer from ${username}:`, error);
    }
  }, [createPeerConnection, socket, roomId, projectId]);

  const handleVideoAnswer = useCallback(async (data) => {
    const { userId, answer, sdpId } = data;
    const pc = peerConnections.current.get(userId);
    
    if (!pc) return;
    if (sdpId && pc.lastRemoteSdpId === sdpId) return;
    if (pc.signalingState === 'stable') return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      pc.lastRemoteSdpId = sdpId;
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to handle answer:`, error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (data) => {
    const { userId, candidate } = data;
    const pc = peerConnections.current.get(userId);
    
    if (!pc?.remoteDescription) {
      if (!pendingCandidates.current.has(userId)) {
        pendingCandidates.current.set(userId, []);
      }
      pendingCandidates.current.get(userId).push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to add ICE candidate:`, error);
    }
  }, []);

  const handleParticipantLeft = useCallback((userId) => {
    console.log(`👋 [VIDEO] Participant left: ${userId}`);
    
    const pc = peerConnections.current.get(userId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(userId);
    }
    pendingCandidates.current.delete(userId);
    
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
    setParticipants(prev => prev.filter(p => p.userId !== userId));
    
    if (screenSharingUser === userId) {
      setScreenSharingUser(null);
    }
  }, [screenSharingUser]);

  // Media controls
  const toggleMute = useCallback(() => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'audio',
        enabled: audioTrack.enabled
      });
    }
  }, [localStream, socket, roomId, projectId, currentUser.id]);

  // Toggle camera - independent of screen sharing
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
      
      console.log('📹 [VIDEO] Camera:', videoTrack.enabled ? 'ON' : 'OFF');
      
      // Only notify peers about camera state if not screen sharing
      // (peers see screen, not camera, during screen share)
      if (!isScreenSharing) {
        socket.emit('video_track_toggle', {
          roomId,
          projectId,
          userId: currentUser.id,
          trackKind: 'video',
          enabled: videoTrack.enabled
        });
      }
    }
  }, [localStream, isScreenSharing, socket, roomId, projectId, currentUser.id]);

  // Screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ [VIDEO] Starting screen share...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      const screenTrack = stream.getVideoTracks()[0];
      
      // Handle browser stop button
      screenTrack.onended = () => {
        console.log('🖥️ [VIDEO] Screen share ended by browser');
        stopScreenShare();
      };

      setScreenStream(stream);
      
      // Update local screen preview
      if (localScreenRef.current) {
        localScreenRef.current.srcObject = stream;
      }

      // Replace camera with screen in peer connections
      await replaceVideoTrackInPeers(screenTrack);

      setIsScreenSharing(true);
      setScreenSharingUser('local');

      socket.emit('screen_share_started', {
        roomId,
        projectId,
        userId: currentUser.id
      });

      console.log('✅ [VIDEO] Screen sharing started');
    } catch (error) {
      console.error('❌ [VIDEO] Failed to start screen share:', error);
    }
  }, [replaceVideoTrackInPeers, socket, roomId, projectId, currentUser.id]);

  const stopScreenShare = useCallback(async () => {
    console.log('🛑 [VIDEO] Stopping screen share...');
    
    // Stop screen tracks
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    setScreenStream(null);

    // Restore camera track to peers
    const cameraTrack = localStream?.getVideoTracks()[0];
    if (cameraTrack) {
      await replaceVideoTrackInPeers(cameraTrack);
      
      // Notify peers about current camera state
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'video',
        enabled: cameraTrack.enabled
      });
    }

    setIsScreenSharing(false);
    setScreenSharingUser(null);

    socket.emit('screen_share_stopped', {
      roomId,
      projectId,
      userId: currentUser.id
    });

    console.log('✅ [VIDEO] Screen sharing stopped, camera restored');
  }, [screenStream, localStream, replaceVideoTrackInPeers, socket, roomId, projectId, currentUser.id]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  const handleEndCall = useCallback(() => {
    console.log('🔴 [VIDEO] Ending call...');
    
    localStream?.getTracks().forEach(track => track.stop());
    screenStream?.getTracks().forEach(track => track.stop());

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    pendingCandidates.current.clear();

    socket.emit('video_call_leave', {
      roomId,
      projectId,
      userId: currentUser.id
    });

    setCallStatus('ended');
    onEndCall();
  }, [localStream, screenStream, socket, roomId, projectId, currentUser.id, onEndCall]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('video_participant_joined', handleNewParticipant);
    socket.on('video_offer', handleVideoOffer);
    socket.on('video_answer', handleVideoAnswer);
    socket.on('video_ice_candidate', handleIceCandidate);
    socket.on('video_participant_left', (data) => handleParticipantLeft(data.userId));
    
    socket.on('screen_share_started', (data) => {
      if (data.userId !== currentUser.id) {
        setScreenSharingUser(data.userId);
      }
    });
  
    socket.on('screen_share_stopped', (data) => {
      if (screenSharingUser === data.userId) {
        setScreenSharingUser(null);
      }
    });

    socket.on('video_track_toggle', (data) => {
      const { userId, trackKind, enabled } = data;
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const remoteData = newMap.get(userId);
        
        if (remoteData?.stream) {
          const tracks = trackKind === 'video' 
            ? remoteData.stream.getVideoTracks() 
            : remoteData.stream.getAudioTracks();
          tracks.forEach(track => track.enabled = enabled);
        }
        
        return newMap;
      });
    });

    socket.on('video_current_participants', async (data) => {
      for (const { userId, username } of data.participants) {
        if (userId === currentUser.id) continue;
        
        setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, { stream: null, username });
          return newMap;
        });
        
        const pc = createPeerConnection(userId, username);
        if (!pc) continue;
        
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('video_offer', {
            roomId,
            projectId,
            targetUserId: userId,
            offer: pc.localDescription
          });
        } catch (error) {
          console.error('❌ [VIDEO] Failed to create offer for existing participant:', error);
        }
      }
    });
  
    return () => {
      socket.off('video_participant_joined');
      socket.off('video_offer');
      socket.off('video_answer');
      socket.off('video_ice_candidate');
      socket.off('video_participant_left');
      socket.off('screen_share_started');
      socket.off('screen_share_stopped');
      socket.off('video_track_toggle');
      socket.off('video_current_participants');
    };
  }, [socket, handleNewParticipant, handleVideoOffer, handleVideoAnswer, handleIceCandidate, handleParticipantLeft, screenSharingUser, createPeerConnection, roomId, projectId, currentUser.id]);

  // Initialize on mount
  useEffect(() => {
    initializeMedia();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      screenStream?.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      
      socket?.emit('video_call_leave', {
        roomId,
        projectId,
        userId: currentUser.id
      });
    };
  }, []);

  // Keep camera video updated
  useEffect(() => {
    if (localStream && localCameraRef.current) {
      localCameraRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Keep screen video updated
  useEffect(() => {
    if (screenStream && localScreenRef.current) {
      localScreenRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Update remote videos
  useEffect(() => {
    remoteStreams.forEach((data, userId) => {
      const videoElement = remoteVideosRef.current[userId];
      if (videoElement && data.stream && videoElement.srcObject !== data.stream) {
        videoElement.srcObject = data.stream;
      }
    });
  }, [remoteStreams]);

  // Render local video section - shows BOTH camera and screen when sharing
  const renderLocalVideo = () => {
    if (isScreenSharing) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Screen share preview */}
          <div style={{
            position: 'relative',
            backgroundColor: 'rgba(26, 28, 32, 0.95)',
            borderRadius: '12px',
            overflow: 'hidden',
            aspectRatio: '16/9',
            border: '2px solid rgba(16, 185, 129, 0.5)'
          }}>
            <video
              ref={localScreenRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#000'
              }}
            />
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              padding: '4px 8px',
              backgroundColor: 'rgba(16, 185, 129, 0.9)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Monitor size={12} />
              Screen
            </div>
          </div>
          
          {/* Camera preview (small, in corner) */}
          <div style={{
            position: 'relative',
            backgroundColor: 'rgba(26, 28, 32, 0.95)',
            borderRadius: '8px',
            overflow: 'hidden',
            width: '150px',
            aspectRatio: '16/9',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <video
              ref={localCameraRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                display: isCameraOff ? 'none' : 'block'
              }}
            />
            {isCameraOff && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(26, 28, 32, 0.95)'
              }}>
                <VideoOff size={20} color="#ef4444" />
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              padding: '2px 6px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '3px',
              fontSize: '10px',
              color: 'white'
            }}>
              {currentUser.username}
            </div>
          </div>
        </div>
      );
    }

    // Normal camera view (not screen sharing)
    return (
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
          ref={localCameraRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: isCameraOff ? 'none' : 'block'
          }}
        />
        {isCameraOff && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(26, 28, 32, 0.95)'
          }}>
            <VideoOff size={48} color="#ef4444" />
          </div>
        )}
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
          {isCameraOff && <VideoOff size={14} color="#ef4444" />}
        </div>
      </div>
    );
  };

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

      {/* Video Grid */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Remote screen share takes priority */}
        {screenSharingUser && screenSharingUser !== 'local' && (
          <div style={{
            position: 'relative',
            backgroundColor: 'rgba(26, 28, 32, 0.95)',
            borderRadius: '12px',
            overflow: 'hidden',
            flex: 1,
            minHeight: '400px',
            border: '2px solid rgba(16, 185, 129, 0.5)'
          }}>
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
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '8px 16px',
              backgroundColor: 'rgba(16, 185, 129, 0.9)',
              borderRadius: '6px',
              fontSize: '14px',
              color: 'white',
              fontWeight: '600'
            }}>
              <Monitor size={16} style={{ marginRight: '8px' }} />
              {remoteStreams.get(screenSharingUser)?.username} is sharing
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${screenSharingUser ? '150px' : '300px'}, 1fr))`,
          gap: '12px'
        }}>
          {renderLocalVideo()}

          {Array.from(remoteStreams.entries())
            .filter(([userId]) => userId !== screenSharingUser)
            .map(([userId, data]) => (
              <div
                key={userId}
                style={{
                  position: 'relative',
                  backgroundColor: 'rgba(26, 28, 32, 0.95)',
                  borderRadius: '12px',
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
            padding: '12px', 
            border: 'none', 
            borderRadius: '50%',
            cursor: 'pointer', 
            backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
            color: isMuted ? '#ef4444' : '#3b82f6'
          }} 
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button 
          onClick={toggleCamera} 
          style={{ 
            padding: '12px', 
            border: 'none', 
            borderRadius: '50%',
            cursor: 'pointer', 
            backgroundColor: isCameraOff ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
            color: isCameraOff ? '#ef4444' : '#3b82f6'
          }} 
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        <button 
          onClick={toggleScreenShare} 
          style={{ 
            padding: '12px', 
            border: 'none', 
            borderRadius: '50%',
            cursor: 'pointer', 
            backgroundColor: isScreenSharing ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
            color: isScreenSharing ? '#10b981' : '#3b82f6'
          }} 
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
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
            padding: '12px', 
            border: 'none', 
            borderRadius: '50%',
            cursor: 'pointer', 
            backgroundColor: 'rgba(59, 130, 246, 0.2)', 
            color: '#3b82f6'
          }} 
          title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullScreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>

        <div style={{ 
          width: '1px', 
          height: '30px', 
          backgroundColor: 'rgba(255, 255, 255, 0.2)', 
          margin: '0 8px' 
        }} />

        <button 
          onClick={handleEndCall} 
          style={{ 
            padding: '12px 24px', 
            borderRadius: '24px', 
            border: 'none', 
            cursor: 'pointer', 
            backgroundColor: '#ef4444', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontWeight: '600'
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