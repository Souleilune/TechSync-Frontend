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
  const screenPreviewRef = useRef(null); // ✅ NEW: Separate ref for screen preview
  const remoteVideosRef = useRef({});
  const peerConnections = useRef(new Map());
  const screenStream = useRef(null);
  const containerRef = useRef(null);
  const pendingCandidates = useRef(new Map());
  
  // ✅ Track management refs
  const originalCameraTrack = useRef(null);
  const cameraEnabledBeforeScreenShare = useRef(true); // Store camera state

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
      const videoTrack = stream.getVideoTracks()[0];
      originalCameraTrack.current = videoTrack;
      cameraEnabledBeforeScreenShare.current = true;
      
      console.log('📹 [VIDEO] Camera track stored:', videoTrack.id);
      
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

  // ✅ FIXED: Better peer connection with proper track handling
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

      // ✅ CRITICAL: Add tracks properly
      // If screen sharing, add screen track; otherwise add camera track
      const videoTrackToSend = isScreenSharing && screenStream.current 
        ? screenStream.current.getVideoTracks()[0]
        : originalCameraTrack.current;
      
      const audioTrack = localStream.getAudioTracks()[0];
      
      if (audioTrack) {
        pc.addTrack(audioTrack, localStream);
        console.log(`✅ [VIDEO] Added audio track to ${username}`);
      }
      
      if (videoTrackToSend) {
        pc.addTrack(videoTrackToSend, localStream);
        console.log(`✅ [VIDEO] Added ${isScreenSharing ? 'screen' : 'camera'} track to ${username}`);
      }

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

      // ✅ FIXED: Better track handling to prevent overwrites
      pc.ontrack = (event) => {
        console.log(`📹 [VIDEO] Received ${event.track.kind} track from ${username}`, event.track.id);
        
        const track = event.track;
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          let existingData = newMap.get(userId);
          
          if (!existingData) {
            // Create new entry with a new MediaStream
            const newStream = new MediaStream();
            newStream.addTrack(track);
            existingData = {
              stream: newStream,
              username: username,
              audioEnabled: true,
              videoEnabled: true
            };
            newMap.set(userId, existingData);
            console.log(`✅ [VIDEO] Created new stream for ${username} with ${track.kind} track`);
          } else {
            // ✅ CRITICAL FIX: Handle track replacement properly
            const existingStream = existingData.stream;
            
            if (track.kind === 'video') {
              // Remove old video tracks before adding new one
              existingStream.getVideoTracks().forEach(oldTrack => {
                console.log(`🔄 [VIDEO] Removing old video track from ${username}:`, oldTrack.id);
                existingStream.removeTrack(oldTrack);
              });
            } else if (track.kind === 'audio') {
              // Remove old audio tracks before adding new one
              existingStream.getAudioTracks().forEach(oldTrack => {
                console.log(`🔄 [VIDEO] Removing old audio track from ${username}:`, oldTrack.id);
                existingStream.removeTrack(oldTrack);
              });
            }
            
            existingStream.addTrack(track);
            console.log(`✅ [VIDEO] Added ${track.kind} track to existing stream for ${username}`);
            
            // Update the data object
            existingData.stream = existingStream;
            newMap.set(userId, { ...existingData });
          }
          
          return newMap;
        });
        
        // ✅ Handle track ended event
        track.onended = () => {
          console.log(`⚠️ [VIDEO] Track ended from ${username}: ${track.kind}`);
        };
        
        // ✅ Handle track mute/unmute
        track.onmute = () => {
          console.log(`🔇 [VIDEO] Track muted from ${username}: ${track.kind}`);
        };
        
        track.onunmute = () => {
          console.log(`🔊 [VIDEO] Track unmuted from ${username}: ${track.kind}`);
        };
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`🧊 [VIDEO] ICE state with ${username}: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed') {
          console.error(`❌ [VIDEO] ICE connection failed with ${username}`);
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`🔌 [VIDEO] Connection state with ${username}: ${pc.connectionState}`);
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setTimeout(() => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              handleRemoveParticipant(userId);
            }
          }, 5000);
        }
      };

      peerConnections.current.set(userId, pc);
      
      // Process pending ICE candidates
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
  }, [localStream, isScreenSharing, socket, roomId, projectId, currentUser.id]);

  const handleNewParticipant = useCallback(async (data) => {
    const { userId, username } = data;
    
    if (userId === currentUser.id) return;

    console.log(`👤 [VIDEO] New participant: ${username}`);
    setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);

    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(userId)) {
        newMap.set(userId, { 
          stream: null,
          username: username 
        });
      }
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

  // ✅ FIXED: Toggle video with proper screen share handling
  const toggleVideo = useCallback(() => {
    if (!originalCameraTrack.current) {
      console.error('❌ [VIDEO] No camera track available');
      return;
    }

    const newEnabledState = !originalCameraTrack.current.enabled;
    originalCameraTrack.current.enabled = newEnabledState;
    setIsVideoOff(!newEnabledState);
    
    console.log('📹 [VIDEO] Camera:', newEnabledState ? 'ON' : 'OFF');
    console.log('📹 [VIDEO] Screen sharing active:', isScreenSharing);

    // ✅ Always update the stored state
    cameraEnabledBeforeScreenShare.current = newEnabledState;

    // ✅ Only send to peers if NOT screen sharing
    if (!isScreenSharing) {
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'video',
        enabled: newEnabledState
      });
    }
  }, [socket, roomId, projectId, currentUser.id, isScreenSharing]);

  // ✅ COMPLETELY REWRITTEN: Screen share with proper track management
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        // =============== START SCREEN SHARE ===============
        console.log('🖥️ [VIDEO] Starting screen share...');
        
        // Store current camera state
        cameraEnabledBeforeScreenShare.current = originalCameraTrack.current?.enabled ?? true;
        console.log('📹 [VIDEO] Storing camera state:', cameraEnabledBeforeScreenShare.current);
        
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });

        screenStream.current = stream;
        const screenVideoTrack = stream.getVideoTracks()[0];
        
        console.log('🖥️ [VIDEO] Got screen track:', screenVideoTrack.id);

        // ✅ CRITICAL: Replace track in ALL peer connections
        const replacePromises = [];
        peerConnections.current.forEach((pc, odspUserId) => {
          const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (videoSender) {
            console.log(`🔄 [VIDEO] Replacing camera with screen for peer ${odspUserId}`);
            const promise = videoSender.replaceTrack(screenVideoTrack)
              .then(() => {
                console.log(`✅ [VIDEO] Screen track sent to peer ${odspUserId}`);
              })
              .catch(err => {
                console.error(`❌ [VIDEO] Failed to replace track for ${odspUserId}:`, err);
              });
            replacePromises.push(promise);
          } else {
            console.warn(`⚠️ [VIDEO] No video sender found for peer ${odspUserId}`);
          }
        });

        await Promise.allSettled(replacePromises);

        // ✅ Update local display - show screen in main view
        // Keep camera in small preview if needed
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Handle browser's stop sharing button
        screenVideoTrack.onended = () => {
          console.log('🖥️ [VIDEO] Screen share ended via browser button');
          stopScreenShareInternal();
        };

        setIsScreenSharing(true);
        setScreenSharingUser('local');

        socket.emit('screen_share_started', {
          roomId,
          projectId,
          userId: currentUser.id,
          username: currentUser.username
        });

        console.log('✅ [VIDEO] Screen share started successfully');

      } else {
        // =============== STOP SCREEN SHARE ===============
        await stopScreenShareInternal();
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
  }, [isScreenSharing, socket, roomId, projectId, currentUser]);

  // ✅ Internal function to stop screen share
  const stopScreenShareInternal = useCallback(async () => {
    console.log('🛑 [VIDEO] Stopping screen share...');
    
    // Stop screen tracks
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => {
        track.onended = null;
        track.stop();
      });
      screenStream.current = null;
    }

    // ✅ Restore camera track to all peer connections
    if (originalCameraTrack.current) {
      console.log('📹 [VIDEO] Restoring camera track:', originalCameraTrack.current.id);
      console.log('📹 [VIDEO] Camera track state:', originalCameraTrack.current.readyState);
      console.log('📹 [VIDEO] Camera should be enabled:', cameraEnabledBeforeScreenShare.current);
      
      // Ensure camera track has correct enabled state
      originalCameraTrack.current.enabled = cameraEnabledBeforeScreenShare.current;
      
      const replacePromises = [];
      peerConnections.current.forEach((pc, odspUserId) => {
        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          console.log(`🔄 [VIDEO] Restoring camera for peer ${odspUserId}`);
          const promise = videoSender.replaceTrack(originalCameraTrack.current)
            .then(() => {
              console.log(`✅ [VIDEO] Camera restored for peer ${odspUserId}`);
            })
            .catch(err => {
              console.error(`❌ [VIDEO] Failed to restore camera for ${odspUserId}:`, err);
            });
          replacePromises.push(promise);
        }
      });

      await Promise.allSettled(replacePromises);

      // Restore local video display
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }

      // ✅ Notify peers about camera state
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

  // ✅ Cleanup helper
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

    // ✅ FIXED: Handle remote track toggle properly
    socket.on('video_track_toggle', (data) => {
      const { userId, trackKind, enabled } = data;
      
      if (userId === currentUser.id) return; // Ignore our own events
      
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
            console.log(`✅ [VIDEO] Set ${trackKind} track enabled=${enabled} for ${userId}`);
          });
          
          // Update state to trigger re-render
          newMap.set(userId, { 
            ...remoteData,
            [`${trackKind}Enabled`]: enabled
          });
        }
        
        return newMap;
      });
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
    };
  }, [
    socket, 
    handleNewParticipant, 
    handleVideoOffer, 
    handleVideoAnswer, 
    handleIceCandidate, 
    handleRemoveParticipant,
    screenSharingUser,
    currentUser.id
  ]);

  // Initialize on mount
  useEffect(() => {
    initializeMedia();

    return () => {
      handleEndCall();
    };
  }, []);

  // ✅ Effect to update remote video elements
  useEffect(() => {
    remoteStreams.forEach((data, odspUserId) => {
      const videoElement = remoteVideosRef.current[odspUserId];
      if (videoElement && data.stream) {
        if (videoElement.srcObject !== data.stream) {
          console.log(`🔄 [VIDEO] Updating video element for ${odspUserId}`);
          videoElement.srcObject = data.stream;
        }
      }
    });
  }, [remoteStreams]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Calculate grid layout
  const getGridClass = () => {
    const totalVideos = remoteStreams.size + 1;
    if (screenSharingUser) {
      return 'video-grid-screen-share';
    }
    if (totalVideos === 1) return 'video-grid-1';
    if (totalVideos === 2) return 'video-grid-2';
    if (totalVideos <= 4) return 'video-grid-4';
    if (totalVideos <= 6) return 'video-grid-6';
    return 'video-grid-many';
  };

  if (callStatus === 'ended') {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className={`video-call-container ${isFullScreen ? 'fullscreen' : ''} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
    >
      {/* Video Grid */}
      <div className={`video-grid ${getGridClass()}`}>
        {/* Screen Share Display */}
        {screenSharingUser && screenSharingUser !== 'local' && (
          <div className="video-wrapper screen-share-main">
            <video
              ref={el => {
                if (el) {
                  const remoteData = remoteStreams.get(screenSharingUser);
                  if (remoteData?.stream) {
                    el.srcObject = remoteData.stream;
                  }
                }
              }}
              autoPlay
              playsInline
              className="screen-share-video"
            />
            <div className="video-label">
              {remoteStreams.get(screenSharingUser)?.username}'s Screen
            </div>
          </div>
        )}

        {/* Local Screen Share (when you're sharing) */}
        {screenSharingUser === 'local' && (
          <div className="video-wrapper screen-share-main">
            <video
              ref={screenPreviewRef}
              autoPlay
              playsInline
              muted
              className="screen-share-video"
              srcObject={screenStream.current}
            />
            <div className="video-label">Your Screen</div>
          </div>
        )}

        {/* Local Video */}
        <div className={`video-wrapper local-video ${screenSharingUser ? 'pip' : ''}`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`video-element ${isVideoOff && !isScreenSharing ? 'video-off' : ''}`}
          />
          {isVideoOff && !isScreenSharing && (
            <div className="video-off-placeholder">
              <div className="avatar-placeholder">
                {currentUser.username?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          <div className="video-label">
            You {isMuted && '🔇'} {isVideoOff && '📵'}
            {isScreenSharing && ' 🖥️'}
          </div>
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([odspUserId, data]) => (
          <div 
            key={odspUserId} 
            className={`video-wrapper ${screenSharingUser === odspUserId ? 'hidden' : ''} ${screenSharingUser ? 'pip' : ''}`}
          >
            <video
              ref={el => {
                remoteVideosRef.current[odspUserId] = el;
                if (el && data.stream) {
                  el.srcObject = data.stream;
                }
              }}
              autoPlay
              playsInline
              className={`video-element ${data.videoEnabled === false ? 'video-off' : ''}`}
            />
            {data.videoEnabled === false && (
              <div className="video-off-placeholder">
                <div className="avatar-placeholder">
                  {data.username?.charAt(0).toUpperCase() || '?'}
                </div>
              </div>
            )}
            <div className="video-label">
              {data.username || 'Participant'}
              {data.audioEnabled === false && ' 🔇'}
              {data.videoEnabled === false && ' 📵'}
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="video-controls">
        <button 
          onClick={toggleMute}
          className={`control-btn ${isMuted ? 'active' : ''}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button 
          onClick={toggleVideo}
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
        
        <button 
          onClick={toggleScreenShare}
          className={`control-btn ${isScreenSharing ? 'active screen-sharing' : ''}`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
        </button>
        
        <button 
          onClick={toggleFullScreen}
          className="control-btn"
          title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullScreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>
        
        <button 
          onClick={handleEndCall}
          className="control-btn end-call"
          title="End call"
        >
          <PhoneOff size={24} />
        </button>
      </div>

      {/* Connection Status */}
      {callStatus === 'connecting' && (
        <div className="connection-status">
          Connecting...
        </div>
      )}

      {/* Participant Count */}
      <div className="participant-count">
        {remoteStreams.size + 1} participant{remoteStreams.size !== 0 ? 's' : ''}
      </div>

      {/* Video Call Chat */}
      <VideoCallChat
        socket={socket}
        roomId={roomId}
        projectId={projectId}
        currentUser={currentUser}
      />
    </div>
  );
};

export default VideoCall;