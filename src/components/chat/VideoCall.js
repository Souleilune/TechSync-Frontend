// frontend/src/components/chat/VideoCall.js
// ✅ FIXED VERSION - Screen Share Track Replacement Issue

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
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callStatus, setCallStatus] = useState('connecting');
  const [screenSharingUser, setScreenSharingUser] = useState(null);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peerConnections = useRef(new Map());
  const screenStream = useRef(null);
  const containerRef = useRef(null);
  const pendingCandidates = useRef(new Map());
  
  // ✅ Track management refs
  const originalCameraTrack = useRef(null);
  const cameraEnabledBeforeScreenShare = useRef(true); // ✅ NEW: Store camera state

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
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
      
      // ✅ Store reference to original camera track
      originalCameraTrack.current = stream.getVideoTracks()[0];
      cameraEnabledBeforeScreenShare.current = true;
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

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
      
      setCallStatus('ended');
    }
  }, [socket, roomId, projectId, currentUser]);

  const getOrCreatePeerConnection = useCallback((userId, username) => {
    let pc = peerConnections.current.get(userId);
    if (pc) {
      console.log(`♻️ [VIDEO] Reusing existing peer connection for ${username}`);
      return pc;
    }

    if (!localStream) {
      console.error('❌ [VIDEO] Cannot create peer connection - no local stream');
      return null;
    }

    try {
      console.log(`🔗 [VIDEO] Creating new peer connection for ${username} (${userId})`);
      
      pc = new RTCPeerConnection(iceServers);
      
      pc.makingOffer = false;
      pc.polite = currentUser.id < userId;
      pc.lastRemoteSdpId = null;
      
      console.log(`🤝 [VIDEO] Peer ${username} - We are ${pc.polite ? 'polite' : 'impolite'}`);

      // Add local stream tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        console.log(`✅ [VIDEO] Added ${track.kind} track to ${username}`);
      });

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

      // ✅ FIXED: Better ontrack handler that handles track replacement
      pc.ontrack = (event) => {
        console.log(`📹 [VIDEO] Received ${event.track.kind} track from ${username}:`, event.track.id);
        
        const track = event.track;
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          let existingData = newMap.get(userId);
          
          if (!existingData || !existingData.stream) {
            // Create new entry with a new MediaStream
            const newStream = new MediaStream([track]);
            existingData = {
              stream: newStream,
              username: username
            };
            newMap.set(userId, existingData);
            console.log(`✅ [VIDEO] Created new stream for ${username} with ${track.kind} track`);
          } else {
            // ✅ CRITICAL FIX: Replace track of same kind instead of adding
            const existingStream = existingData.stream;
            
            if (track.kind === 'video') {
              // Remove ALL existing video tracks before adding new one
              const oldVideoTracks = existingStream.getVideoTracks();
              oldVideoTracks.forEach(oldTrack => {
                console.log(`🔄 [VIDEO] Removing old video track from ${username}:`, oldTrack.id);
                existingStream.removeTrack(oldTrack);
              });
              existingStream.addTrack(track);
              console.log(`✅ [VIDEO] Replaced video track for ${username}`);
            } else if (track.kind === 'audio') {
              // Check if audio track already exists
              const existingAudio = existingStream.getAudioTracks();
              const trackExists = existingAudio.some(t => t.id === track.id);
              if (!trackExists) {
                // Remove old audio tracks
                existingAudio.forEach(oldTrack => {
                  existingStream.removeTrack(oldTrack);
                });
                existingStream.addTrack(track);
                console.log(`✅ [VIDEO] Replaced audio track for ${username}`);
              }
            }
            
            // Force update by creating new object reference
            newMap.set(userId, { ...existingData });
          }
          
          return newMap;
        });
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.error(`❌ [VIDEO] ICE connection failed with ${username}`);
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`🔌 [VIDEO] Connection state with ${username}: ${pc.connectionState}`);
        
        if (pc.connectionState === 'failed') {
          setTimeout(() => {
            if (pc.connectionState === 'failed') {
              handleRemoveParticipant(userId);
            }
          }, 5000);
        } else if (pc.connectionState === 'disconnected') {
          setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              handleRemoveParticipant(userId);
            }
          }, 5000);
        }
      };

      peerConnections.current.set(userId, pc);
      
      const pending = pendingCandidates.current.get(userId);
      if (pending && pending.length > 0) {
        console.log(`🧊 [VIDEO] Processing ${pending.length} pending ICE candidates for ${username}`);
        pending.forEach(candidate => {
          const iceCandidate = new RTCIceCandidate({
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex,
            usernameFragment: candidate.usernameFragment
          });
          pc.addIceCandidate(iceCandidate).catch(err => {
            console.error(`❌ [VIDEO] Failed to add pending ICE candidate:`, err);
          });
        });
        pendingCandidates.current.delete(userId);
      }
      
      return pc;
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to create peer connection for ${username}:`, error);
      return null;
    }
  }, [localStream, socket, roomId, projectId, currentUser.id]);

  const handleNewParticipant = useCallback(async (data) => {
    const { userId, username } = data;
    
    if (userId === currentUser.id) return;

    console.log(`👤 [VIDEO] New participant: ${username}`);
    setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);

    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, { 
        stream: null,
        username: username 
      });
      return newMap;
    });

    const pc = getOrCreatePeerConnection(userId, username);
    if (!pc) return;

    try {
      pc.makingOffer = true;
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const sdpId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      socket.emit('video_offer', {
        roomId,
        projectId,
        targetUserId: userId,
        offer: pc.localDescription,
        sdpId
      });
      
      console.log(`✅ [VIDEO] Sent offer to ${username}`);
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to create offer for ${username}:`, error);
    } finally {
      pc.makingOffer = false;
    }
  }, [currentUser.id, getOrCreatePeerConnection, socket, roomId, projectId]);

  const handleVideoOffer = useCallback(async (data) => {
    const { userId, username, offer, sdpId } = data;
    
    console.log(`📨 [VIDEO] Received offer from ${username}`);

    const pc = getOrCreatePeerConnection(userId, username);
    if (!pc) return;

    try {
      if (sdpId && pc.lastRemoteSdpId === sdpId) {
        console.warn(`⚠️ [VIDEO] Ignoring duplicate offer from ${username}`);
        return;
      }
      
      const isPolite = pc.polite;
      const offerCollision = (pc.signalingState !== 'stable' || pc.makingOffer);
      
      if (offerCollision) {
        if (!isPolite) {
          console.log(`🤝 [VIDEO] Impolite: Ignoring incoming offer`);
          return;
        }
        
        console.log(`🤝 [VIDEO] Polite: Rolling back local offer`);
        try {
          await pc.setLocalDescription({type: 'rollback'});
        } catch (rollbackError) {
          console.error(`❌ [VIDEO] Rollback failed:`, rollbackError);
        }
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      if (sdpId) {
        pc.lastRemoteSdpId = sdpId;
      }
      
      const pending = pendingCandidates.current.get(userId);
      if (pending && pending.length > 0) {
        for (const candidate of pending) {
          try {
            const iceCandidate = new RTCIceCandidate({
              candidate: candidate.candidate,
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex,
              usernameFragment: candidate.usernameFragment
            });
            await pc.addIceCandidate(iceCandidate);
          } catch (err) {
            console.error(`❌ [VIDEO] Failed to add pending candidate:`, err);
          }
        }
        pendingCandidates.current.delete(userId);
      }
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      const answerSdpId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      socket.emit('video_answer', {
        roomId,
        projectId,
        targetUserId: userId,
        answer: pc.localDescription,
        sdpId: answerSdpId
      });

      setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to handle offer from ${username}:`, error);
    }
  }, [getOrCreatePeerConnection, socket, roomId, projectId]);

  const handleVideoAnswer = useCallback(async (data) => {
    const { userId, answer, sdpId } = data;
    
    const pc = peerConnections.current.get(userId);
    if (!pc) {
      console.error(`❌ [VIDEO] No peer connection found for user ${userId}`);
      return;
    }

    try {
      if (sdpId && pc.lastRemoteSdpId === sdpId) {
        console.warn(`⚠️ [VIDEO] Ignoring duplicate answer`);
        return;
      }
      
      if (pc.signalingState === 'stable') {
        console.warn(`⚠️ [VIDEO] PC already in stable state, ignoring answer`);
        return;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      
      if (sdpId) {
        pc.lastRemoteSdpId = sdpId;
      }
      
      const pending = pendingCandidates.current.get(userId);
      if (pending && pending.length > 0) {
        for (const candidate of pending) {
          try {
            const iceCandidate = new RTCIceCandidate({
              candidate: candidate.candidate,
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex,
              usernameFragment: candidate.usernameFragment
            });
            await pc.addIceCandidate(iceCandidate);
          } catch (err) {
            console.error(`❌ [VIDEO] Failed to add pending candidate:`, err);
          }
        }
        pendingCandidates.current.delete(userId);
      }
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to handle answer:`, error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (data) => {
    const { userId, candidate } = data;
    
    const pc = peerConnections.current.get(userId);
    if (!pc || !pc.remoteDescription) {
      if (!pendingCandidates.current.has(userId)) {
        pendingCandidates.current.set(userId, []);
      }
      pendingCandidates.current.get(userId).push(candidate);
      return;
    }

    try {
      const iceCandidate = new RTCIceCandidate({
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        usernameFragment: candidate.usernameFragment
      });
      
      await pc.addIceCandidate(iceCandidate);
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to add ICE candidate:`, error);
    }
  }, []);

  const handleRemoveParticipant = useCallback((userId) => {
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

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        console.log('🎤 [VIDEO] Microphone:', audioTrack.enabled ? 'ON' : 'OFF');
        
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

  // ✅ FIXED: Toggle video with proper state tracking
  const toggleVideo = useCallback(() => {
    if (!originalCameraTrack.current) {
      console.error('❌ [VIDEO] No camera track available');
      return;
    }

    const newEnabledState = !originalCameraTrack.current.enabled;
    originalCameraTrack.current.enabled = newEnabledState;
    setIsVideoOff(!newEnabledState);
    
    // ✅ Always update stored state
    cameraEnabledBeforeScreenShare.current = newEnabledState;
    
    console.log('📹 [VIDEO] Camera:', newEnabledState ? 'ON' : 'OFF');
    console.log('📹 [VIDEO] Screen sharing active:', isScreenSharing);

    // Only notify peers if NOT screen sharing
    if (!isScreenSharing) {
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'video',
        enabled: newEnabledState
      });
    } else {
      console.log('📹 [VIDEO] Camera toggle stored (will apply when screen share stops)');
    }
  }, [socket, roomId, projectId, currentUser.id, isScreenSharing]);

  // ✅ FIXED: Screen share with proper cleanup and restoration
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        // =============== START SCREEN SHARE ===============
        console.log('🖥️ [VIDEO] Starting screen share...');
        
        // ✅ Store current camera state BEFORE starting screen share
        cameraEnabledBeforeScreenShare.current = originalCameraTrack.current?.enabled ?? true;
        console.log('📹 [VIDEO] Camera state before screen share:', cameraEnabledBeforeScreenShare.current);
        
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        screenStream.current = stream;
        const screenVideoTrack = stream.getVideoTracks()[0];
        
        console.log('🖥️ [VIDEO] Got screen track:', screenVideoTrack.id);

        // ✅ Replace camera with screen in all peer connections
        const replacePromises = [];
        peerConnections.current.forEach((pc, odspUserId) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            console.log(`🔄 [VIDEO] Replacing camera with screen for peer ${odspUserId}`);
            const promise = sender.replaceTrack(screenVideoTrack)
              .then(() => console.log(`✅ [VIDEO] Screen track sent to peer ${odspUserId}`))
              .catch(err => console.error(`❌ [VIDEO] Failed to send screen to ${odspUserId}:`, err));
            replacePromises.push(promise);
          }
        });

        await Promise.allSettled(replacePromises);

        // ✅ Update local video to show screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Handle browser's stop sharing button
        screenVideoTrack.onended = () => {
          console.log('🖥️ [VIDEO] Screen share ended via browser button');
          stopScreenShare();
        };

        setIsScreenSharing(true);
        setScreenSharingUser('local');

        socket.emit('screen_share_started', {
          roomId,
          projectId,
          userId: currentUser.id
        });

        console.log('✅ [VIDEO] Screen share started successfully');

      } else {
        // =============== STOP SCREEN SHARE ===============
        await stopScreenShare();
      }
    } catch (error) {
      console.error('❌ [VIDEO] Screen share error:', error);
      
      if (error.name === 'NotAllowedError') {
        console.log('📹 [VIDEO] User cancelled screen share picker');
        return;
      }
      
      // Cleanup on error
      await cleanupScreenShare();
    }
  }, [isScreenSharing, localStream, socket, roomId, projectId, currentUser.id]);

  // ✅ NEW: Separate function to stop screen share
  const stopScreenShare = useCallback(async () => {
    console.log('🛑 [VIDEO] Stopping screen share...');
    
    // Stop screen tracks
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => {
        track.onended = null; // Prevent double-trigger
        track.stop();
      });
      screenStream.current = null;
    }

    // ✅ Restore camera track
    if (originalCameraTrack.current) {
      console.log('📹 [VIDEO] Restoring camera track:', originalCameraTrack.current.id);
      console.log('📹 [VIDEO] Camera should be enabled:', cameraEnabledBeforeScreenShare.current);
      
      // Ensure camera track has correct enabled state
      originalCameraTrack.current.enabled = cameraEnabledBeforeScreenShare.current;
      
      // Restore to all peer connections
      const replacePromises = [];
      peerConnections.current.forEach((pc, odspUserId) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          console.log(`🔄 [VIDEO] Restoring camera for peer ${odspUserId}`);
          const promise = sender.replaceTrack(originalCameraTrack.current)
            .then(() => console.log(`✅ [VIDEO] Camera restored for peer ${odspUserId}`))
            .catch(err => console.error(`❌ [VIDEO] Failed to restore camera for ${odspUserId}:`, err));
          replacePromises.push(promise);
        }
      });

      await Promise.allSettled(replacePromises);

      // Restore local video display
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }

      // Update video off state to match camera state
      setIsVideoOff(!originalCameraTrack.current.enabled);

      // Notify peers about camera state
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'video',
        enabled: originalCameraTrack.current.enabled
      });
    }

    setIsScreenSharing(false);
    setScreenSharingUser(null);

    socket.emit('screen_share_stopped', {
      roomId,
      projectId,
      userId: currentUser.id
    });

    console.log('✅ [VIDEO] Screen share stopped, camera restored');
  }, [localStream, socket, roomId, projectId, currentUser.id]);

  // ✅ NEW: Cleanup helper for error cases
  const cleanupScreenShare = useCallback(async () => {
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => {
        track.onended = null;
        track.stop();
      });
      screenStream.current = null;
    }
    
    if (originalCameraTrack.current && localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && originalCameraTrack.current) {
          sender.replaceTrack(originalCameraTrack.current).catch(console.error);
        }
      });
    }
    
    setIsScreenSharing(false);
    setScreenSharingUser(null);
  }, [localStream]);

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
    
    // Stop screen share first
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

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
  }, [localStream, socket, roomId, projectId, currentUser.id, onEndCall]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('video_participant_joined', handleNewParticipant);
    socket.on('video_offer', handleVideoOffer);
    socket.on('video_answer', handleVideoAnswer);
    socket.on('video_ice_candidate', handleIceCandidate);
    socket.on('video_participant_left', (data) => handleRemoveParticipant(data.userId));
    
    socket.on('screen_share_started', (data) => {
      console.log('🖥️ [VIDEO] Remote user started sharing:', data.userId);
      if (data.userId !== currentUser.id) {
        setScreenSharingUser(data.userId);
      }
    });
  
    socket.on('screen_share_stopped', (data) => {
      console.log('🖥️ [VIDEO] Remote user stopped sharing:', data.userId);
      if (screenSharingUser === data.userId) {
        setScreenSharingUser(null);
      }
    });

    // ✅ FIXED: Handle remote track toggle - ignore own events
    socket.on('video_track_toggle', (data) => {
      const { userId, trackKind, enabled } = data;
      
      // Ignore our own toggle events
      if (userId === currentUser.id) return;
      
      console.log(`🎥 [VIDEO] Remote ${trackKind} from ${userId}: ${enabled ? 'ON' : 'OFF'}`);
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const remoteData = newMap.get(userId);
        
        if (remoteData?.stream) {
          const tracks = trackKind === 'video' 
            ? remoteData.stream.getVideoTracks() 
            : remoteData.stream.getAudioTracks();
          
          tracks.forEach(track => {
            track.enabled = enabled;
            console.log(`✅ [VIDEO] Set remote ${trackKind} enabled=${enabled}`);
          });
          
          // Force update
          newMap.set(userId, { ...remoteData });
        }
        
        return newMap;
      });
    });

    socket.on('video_current_participants', async (data) => {
      console.log('👥 [VIDEO] Received current participants:', data.participants);
      
      const { participants: currentParticipants } = data;
      
      for (const participant of currentParticipants) {
        const { userId, username } = participant;
        
        if (userId === currentUser.id) continue;
        
        setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, { 
            stream: null,
            username: username 
          });
          return newMap;
        });
        
        const pc = getOrCreatePeerConnection(userId, username);
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
  }, [socket, handleNewParticipant, handleVideoOffer, handleVideoAnswer, handleIceCandidate, handleRemoveParticipant, screenSharingUser, getOrCreatePeerConnection, roomId, projectId, currentUser.id]);

  useEffect(() => {
    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop());
      }

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();

      if (socket) {
        socket.emit('video_call_leave', {
          roomId,
          projectId,
          userId: currentUser.id
        });
      }
    };
  }, []);

  useEffect(() => {
    if (localStream && localVideoRef.current && !isScreenSharing) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream, isScreenSharing]);

  // ✅ FIXED: Better remote video element update with force refresh
  useEffect(() => {
    remoteStreams.forEach((data, odspUserId) => {
      const videoElement = remoteVideosRef.current[odspUserId];
      if (videoElement && data.stream) {
        // Always update srcObject to ensure new tracks are displayed
        if (videoElement.srcObject !== data.stream) {
          console.log(`🔄 [VIDEO] Updating video element for ${odspUserId}`);
          videoElement.srcObject = data.stream;
        }
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

      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {screenSharingUser && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            minHeight: '400px'
          }}>
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
                {screenSharingUser === 'local' ? 'You are sharing your screen' : 
                 `${remoteStreams.get(screenSharingUser)?.username || 'User'} is sharing`}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 150px))',
              gap: '8px',
              maxHeight: '120px',
              padding: '8px 0'
            }}>
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
                </div>
              </div>

              {Array.from(remoteStreams.entries()).map(([odspUserId, data]) => (
                <div
                  key={odspUserId}
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
                    ref={el => remoteVideosRef.current[odspUserId] = el}
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
                  transform: 'scaleX(-1)',
                  display: isVideoOff ? 'none' : 'block'
                }}
              />
              {isVideoOff && (
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
                {isVideoOff && <VideoOff size={14} color="#ef4444" />}
              </div>
            </div>

            {Array.from(remoteStreams.entries()).map(([odspUserId, data]) => (
              <div
                key={odspUserId}
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
                  ref={el => remoteVideosRef.current[odspUserId] = el}
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

      <div style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <button onClick={toggleMute} style={{ padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: isMuted ? '#ef4444' : '#3b82f6', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        <button onClick={toggleVideo} style={{ padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: isVideoOff ? '#ef4444' : '#3b82f6', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
          {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
        </button>

        <button onClick={toggleScreenShare} style={{ padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: isScreenSharing ? '#10b981' : '#3b82f6', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
          {isScreenSharing ? <MonitorOff size={28} /> : <Monitor size={28} />}
        </button>

        <VideoCallChat socket={socket} roomId={roomId} projectId={projectId} currentUser={currentUser} participants={participants} />

        <button onClick={toggleFullScreen} style={{ padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent', color: '#3b82f6', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullScreen ? <Minimize2 size={28} /> : <Maximize2 size={28} />}
        </button>

        <div style={{ width: '2px', height: '30px', backgroundColor: 'rgba(255, 255, 255, 0.15)', margin: '0 8px' }} />

        <button onClick={handleEndCall} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s ease' }} title="End call">
          <PhoneOff size={18} />
          End Call
        </button>
      </div>
    </div>
  );
};

export default VideoCall;