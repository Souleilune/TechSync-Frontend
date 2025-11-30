// frontend/src/components/chat/VideoCall.js
// ✅ PRODUCTION-READY VERSION - Camera + Screen Share (Google Meet–style)
// Key behavior:
// - Camera track is always kept (unless user explicitly turns it off)
// - Screen share is sent as an ADDITIONAL video track (not replacing camera)
// - Local preview always shows camera
// - When sharing, a big “presenting” view shows the screen, and camera stays in tiles

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
  // Map<userId, { cameraStream: MediaStream | null, screenStream: MediaStream | null, username: string }>
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callStatus, setCallStatus] = useState('connecting');
  const [screenSharingUser, setScreenSharingUser] = useState(null); // userId of the sharer

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peerConnections = useRef(new Map());
  const screenStream = useRef(null);
  const containerRef = useRef(null);
  const pendingCandidates = useRef(new Map());
  
  // Track the original camera track separately
  const originalCameraTrack = useRef(null);

  // Track RTCRtpSenders for screen tracks per peer so we can remove them
  const screenSenders = useRef(new Map()); // Map<userId, RTCRtpSender>

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
      
      // Store reference to original camera track
      originalCameraTrack.current = stream.getVideoTracks()[0];
      
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

      // Add local camera+audio tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        console.log(`✅ [VIDEO] Added ${track.kind} track to ${username}`);
      });

      // If we're already screen sharing, add the current screen track too
      if (isScreenSharing && screenStream.current) {
        const screenTrack = screenStream.current.getVideoTracks()[0];
        if (screenTrack) {
          const sender = pc.addTrack(screenTrack, screenStream.current);
          screenSenders.current.set(userId, sender);
          console.log(`✅ [VIDEO] Added existing screen track for ${username}`);
        }
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

      pc.ontrack = (event) => {
        console.log(`📹 [VIDEO] Received track from ${username}: ${event.track.kind}`);

        let stream;
        if (event.streams && event.streams.length > 0) {
          stream = event.streams[0];
        } else {
          stream = new MediaStream([event.track]);
        }

        const isVideo = event.track.kind === 'video';
        const hasAudio = stream.getAudioTracks().length > 0;

        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(userId) || {
            cameraStream: null,
            screenStream: null,
            username
          };

          if (isVideo) {
            if (hasAudio) {
              // treat as camera stream
              if (!existing.cameraStream) {
                existing.cameraStream = stream;
              } else if (!existing.cameraStream.getTracks().some(t => t.id === event.track.id)) {
                existing.cameraStream.addTrack(event.track);
              }
            } else {
              // treat as screen stream (no audio)
              if (!existing.screenStream) {
                existing.screenStream = stream;
              } else if (!existing.screenStream.getTracks().some(t => t.id === event.track.id)) {
                existing.screenStream.addTrack(event.track);
              }
            }
          } else if (event.track.kind === 'audio') {
            // audio goes with the camera stream
            if (!existing.cameraStream) {
              existing.cameraStream = stream;
            } else if (!existing.cameraStream.getAudioTracks().some(t => t.id === event.track.id)) {
              existing.cameraStream.addTrack(event.track);
            }
          }

          existing.username = username;
          newMap.set(userId, existing);
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
  }, [localStream, socket, roomId, projectId, currentUser.id, isScreenSharing, handleRemoveParticipant]);

  const handleNewParticipant = useCallback(async (data) => {
    const { userId, username } = data;
    
    if (userId === currentUser.id) return;

    console.log(`👤 [VIDEO] New participant: ${username}`);
    setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);

    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, { 
        cameraStream: null,
        screenStream: null,
        username 
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
    screenSenders.current.delete(userId);

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

  // Toggle camera (does NOT affect screen share)
  const toggleVideo = useCallback(() => {
    if (!originalCameraTrack.current) {
      console.error('❌ [VIDEO] No camera track available');
      return;
    }

    const newEnabledState = !originalCameraTrack.current.enabled;
    originalCameraTrack.current.enabled = newEnabledState;
    setIsVideoOff(!newEnabledState);
    
    console.log('📹 [VIDEO] Camera:', newEnabledState ? 'ON' : 'OFF');

    // Always notify peers about camera state
    socket.emit('video_track_toggle', {
      roomId,
      projectId,
      userId: currentUser.id,
      trackKind: 'video',
      enabled: newEnabledState
    });
  }, [socket, roomId, projectId, currentUser.id]);

  // Screen share as an additional track (Google Meet style)
  const toggleScreenShare = useCallback(async () => {
    if (!localStream) {
      console.error('❌ [VIDEO] No local stream for screen share');
      return;
    }

    try {
      if (!isScreenSharing) {
        console.log('🖥️ [VIDEO] Starting screen share...');

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        const screenVideoTrack = stream.getVideoTracks()[0];
        if (!screenVideoTrack) {
          console.error('❌ [VIDEO] No screen video track found');
          return;
        }

        screenStream.current = stream;

        // DO NOT change localVideoRef here; keep showing camera (localStream)

        // Add screen track to all existing peer connections
        peerConnections.current.forEach((pc, userId) => {
          const sender = pc.addTrack(screenVideoTrack, stream);
          screenSenders.current.set(userId, sender);
          console.log(`✅ [VIDEO] Sending screen to user ${userId}`);
        });

        // If user stops sharing from browser UI
        screenVideoTrack.onended = () => {
          console.log('🖥️ [VIDEO] Screen share ended by browser');
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        setScreenSharingUser(currentUser.id);

        socket.emit('screen_share_started', {
          roomId,
          projectId,
          userId: currentUser.id
        });

      } else {
        console.log('🛑 [VIDEO] Stopping screen share...');

        // Stop local screen tracks
        if (screenStream.current) {
          screenStream.current.getTracks().forEach(track => track.stop());
          screenStream.current = null;
        }

        // Remove screen track from all peer connections
        peerConnections.current.forEach((pc, userId) => {
          const sender = screenSenders.current.get(userId);
          if (sender) {
            try {
              pc.removeTrack(sender);
            } catch (err) {
              console.error(`❌ [VIDEO] Failed to remove screen sender for ${userId}:`, err);
            }
            screenSenders.current.delete(userId);
          }
        });

        setIsScreenSharing(false);
        setScreenSharingUser(null);

        socket.emit('screen_share_stopped', {
          roomId,
          projectId,
          userId: currentUser.id
        });
      }
    } catch (error) {
      console.error('❌ [VIDEO] Screen share error:', error);

      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop());
        screenStream.current = null;
      }

      // Cleanup any screen senders
      peerConnections.current.forEach((pc, userId) => {
        const sender = screenSenders.current.get(userId);
        if (sender) {
          try {
            pc.removeTrack(sender);
          } catch (err) {
            console.error(`❌ [VIDEO] Error removing screen sender for ${userId}:`, err);
          }
          screenSenders.current.delete(userId);
        }
      });

      setIsScreenSharing(false);
      setScreenSharingUser(null);
    }
  }, [isScreenSharing, localStream, socket, roomId, projectId, currentUser.id]);

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
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }

    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    pendingCandidates.current.clear();
    screenSenders.current.clear();

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
      setScreenSharingUser(data.userId);
    });
  
    socket.on('screen_share_stopped', (data) => {
      console.log('🖥️ [VIDEO] Remote user stopped sharing:', data.userId);
      if (screenSharingUser === data.userId) {
        setScreenSharingUser(null);
      }
    });

    socket.on('video_track_toggle', (data) => {
      const { userId, trackKind, enabled } = data;
      console.log(`🎥 [VIDEO] Remote ${trackKind} from ${userId}: ${enabled ? 'ON' : 'OFF'}`);
      
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const remoteData = newMap.get(userId);
        if (!remoteData) return prev;

        if (trackKind === 'video' && remoteData.cameraStream) {
          remoteData.cameraStream.getVideoTracks().forEach(track => {
            track.enabled = enabled;
          });
        } else if (trackKind === 'audio' && remoteData.cameraStream) {
          remoteData.cameraStream.getAudioTracks().forEach(track => {
            track.enabled = enabled;
          });
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
            cameraStream: null,
            screenStream: null,
            username 
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
  }, [
    socket, 
    handleNewParticipant, 
    handleVideoOffer, 
    handleVideoAnswer, 
    handleIceCandidate, 
    handleRemoveParticipant, 
    screenSharingUser, 
    getOrCreatePeerConnection, 
    roomId, 
    projectId, 
    currentUser.id
  ]);

  useEffect(() => {
    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop());
        screenStream.current = null;
      }

      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();
      screenSenders.current.clear();

      if (socket) {
        socket.emit('video_call_leave', {
          roomId,
          projectId,
          userId: currentUser.id
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Always bind local camera stream to local video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  // Update remote video elements (tiles use camera if available, otherwise screen)
  useEffect(() => {
    remoteStreams.forEach((data, userId) => {
      const videoElement = remoteVideosRef.current[userId];
      if (!videoElement) return;

      const streamForTile = data.cameraStream || data.screenStream;
      if (streamForTile && videoElement.srcObject !== streamForTile) {
        videoElement.srcObject = streamForTile;
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
              {screenSharingUser === currentUser.id ? (
                <video
                  ref={el => {
                    if (el && screenStream.current && el.srcObject !== screenStream.current) {
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
                    const stream = remoteData?.screenStream || remoteData?.cameraStream;
                    if (el && stream && el.srcObject !== stream) {
                      el.srcObject = stream;
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
                {screenSharingUser === currentUser.id
                  ? 'You are sharing your screen'
                  : `${remoteStreams.get(screenSharingUser)?.username || 'User'} is sharing`}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 150px))',
              gap: '8px',
              maxHeight: '120px',
              padding: '8px 0'
            }}>
              {/* Local camera tile */}
              <div style={{
                position: 'relative',
                backgroundColor: 'rgba(26, 28, 32, 0.95)',
                borderRadius: '8px',
                overflow: 'hidden',
                aspectRatio: '16/9',
                border: screenSharingUser === currentUser.id ? 
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

              {/* Remote camera tiles */}
              {Array.from(remoteStreams.entries()).map(([userId, data]) => (
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
            {/* Local camera main tile */}
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
                  transform: 'scaleX(-1)'
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

            {/* Remote tiles */}
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