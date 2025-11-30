// frontend/src/components/chat/VideoCall.js
// ✅ FIXED VERSION - Camera works independently of screen share

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
  const screenVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peerConnections = useRef(new Map());
  const screenStream = useRef(null);
  const containerRef = useRef(null);
  const pendingCandidates = useRef(new Map());
  
  // Store camera stream separately - this NEVER gets modified
  const cameraStream = useRef(null);
  // Track if camera was on before any operations
  const cameraEnabledState = useRef(true);

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
      console.log('✅ [VIDEO] Video tracks:', stream.getVideoTracks().length);
      console.log('✅ [VIDEO] Audio tracks:', stream.getAudioTracks().length);
      
      // Store the camera stream - this reference never changes
      cameraStream.current = stream;
      cameraEnabledState.current = true;
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ [VIDEO] Set local video srcObject');
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

    if (!cameraStream.current) {
      console.error('❌ [VIDEO] Cannot create peer connection - no camera stream');
      return null;
    }

    try {
      console.log(`🔗 [VIDEO] Creating new peer connection for ${username} (${userId})`);
      
      pc = new RTCPeerConnection(iceServers);
      
      pc.makingOffer = false;
      pc.polite = currentUser.id < userId;
      pc.lastRemoteSdpId = null;
      
      console.log(`🤝 [VIDEO] Peer ${username} - We are ${pc.polite ? 'polite' : 'impolite'}`);

      // Always add audio track from camera stream
      const audioTrack = cameraStream.current.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack, cameraStream.current);
        console.log(`✅ [VIDEO] Added audio track to ${username}`);
      }

      // Add video track - screen if sharing, otherwise camera
      let videoTrackToSend;
      if (isScreenSharing && screenStream.current) {
        videoTrackToSend = screenStream.current.getVideoTracks()[0];
        console.log(`✅ [VIDEO] Will send SCREEN track to ${username}`);
      } else {
        videoTrackToSend = cameraStream.current.getVideoTracks()[0];
        console.log(`✅ [VIDEO] Will send CAMERA track to ${username}`);
      }
      
      if (videoTrackToSend) {
        pc.addTrack(videoTrackToSend, cameraStream.current);
        console.log(`✅ [VIDEO] Added video track to ${username}`);
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
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const existingData = newMap.get(userId);
          
          if (existingData?.stream) {
            const trackExists = existingData.stream.getTracks().some(t => t.id === event.track.id);
            if (!trackExists) {
              existingData.stream.addTrack(event.track);
              console.log(`✅ [VIDEO] Added ${event.track.kind} track to existing stream for ${username}`);
            }
          } else {
            newMap.set(userId, {
              stream: stream,
              username: username
            });
            console.log(`✅ [VIDEO] Created new stream entry for ${username}`);
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
  }, [socket, roomId, projectId, currentUser.id, isScreenSharing]);

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

  // Toggle microphone
  const toggleMute = useCallback(() => {
    if (!cameraStream.current) {
      console.error('❌ [VIDEO] No camera stream available');
      return;
    }
    
    const audioTrack = cameraStream.current.getAudioTracks()[0];
    if (audioTrack) {
      const newState = !audioTrack.enabled;
      audioTrack.enabled = newState;
      setIsMuted(!newState);
      
      console.log('🎤 [VIDEO] Microphone:', newState ? 'ON' : 'OFF');
      
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'audio',
        enabled: newState
      });
    }
  }, [socket, roomId, projectId, currentUser.id]);

  // Toggle camera - completely independent of screen share
  const toggleVideo = useCallback(() => {
    if (!cameraStream.current) {
      console.error('❌ [VIDEO] No camera stream available');
      return;
    }

    const videoTrack = cameraStream.current.getVideoTracks()[0];
    if (!videoTrack) {
      console.error('❌ [VIDEO] No video track in camera stream');
      return;
    }

    const newState = !videoTrack.enabled;
    videoTrack.enabled = newState;
    cameraEnabledState.current = newState;
    setIsVideoOff(!newState);
    
    console.log('📹 [VIDEO] Camera toggled:', newState ? 'ON' : 'OFF');
    console.log('📹 [VIDEO] Track enabled:', videoTrack.enabled);
    console.log('📹 [VIDEO] Track readyState:', videoTrack.readyState);
    console.log('📹 [VIDEO] Is screen sharing:', isScreenSharing);

    // Only notify peers if NOT screen sharing
    // During screen share, they see screen, not camera
    if (!isScreenSharing) {
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'video',
        enabled: newState
      });
      console.log('📹 [VIDEO] Notified peers of camera state');
    } else {
      console.log('📹 [VIDEO] Screen sharing active - camera state saved for later');
    }

    // Force re-render of local video
    if (localVideoRef.current) {
      const currentSrc = localVideoRef.current.srcObject;
      localVideoRef.current.srcObject = null;
      localVideoRef.current.srcObject = currentSrc;
    }
  }, [socket, roomId, projectId, currentUser.id, isScreenSharing]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ [VIDEO] Starting screen share...');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      screenStream.current = stream;
      const screenVideoTrack = stream.getVideoTracks()[0];
      
      console.log('✅ [VIDEO] Got screen stream:', stream.id);

      // Set screen stream to dedicated video element
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      // Replace video track in all peer connections with screen track
      const replacePromises = [];
      peerConnections.current.forEach((pc, odtUserId) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          const promise = sender.replaceTrack(screenVideoTrack)
            .then(() => console.log(`✅ [VIDEO] Screen track sent to user ${odtUserId}`))
            .catch(err => console.error(`❌ [VIDEO] Failed to send screen to ${odtUserId}:`, err));
          replacePromises.push(promise);
        }
      });

      await Promise.allSettled(replacePromises);

      // Handle browser stop button
      screenVideoTrack.onended = () => {
        console.log('🖥️ [VIDEO] Screen share ended by browser');
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
    } catch (error) {
      console.error('❌ [VIDEO] Failed to start screen share:', error);
      
      if (screenStream.current) {
        screenStream.current.getTracks().forEach(track => track.stop());
        screenStream.current = null;
      }
    }
  }, [socket, roomId, projectId, currentUser.id]);

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    console.log('🛑 [VIDEO] Stopping screen share...');
    
    // Stop screen tracks
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => {
        track.stop();
        console.log('✅ [VIDEO] Stopped screen track');
      });
      screenStream.current = null;
    }

    // Clear screen video element
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }

    // Restore camera track to all peer connections
    if (cameraStream.current) {
      const cameraVideoTrack = cameraStream.current.getVideoTracks()[0];
      
      if (cameraVideoTrack) {
        console.log('📹 [VIDEO] Restoring camera track to peers...');
        console.log('📹 [VIDEO] Camera track enabled:', cameraVideoTrack.enabled);
        console.log('📹 [VIDEO] Camera track readyState:', cameraVideoTrack.readyState);

        const replacePromises = [];
        peerConnections.current.forEach((pc, odtUserId) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            const promise = sender.replaceTrack(cameraVideoTrack)
              .then(() => console.log(`✅ [VIDEO] Camera restored to user ${odtUserId}`))
              .catch(err => console.error(`❌ [VIDEO] Failed to restore camera to ${odtUserId}:`, err));
            replacePromises.push(promise);
          }
        });

        await Promise.allSettled(replacePromises);

        // Notify peers of current camera enabled state
        socket.emit('video_track_toggle', {
          roomId,
          projectId,
          userId: currentUser.id,
          trackKind: 'video',
          enabled: cameraVideoTrack.enabled
        });

        console.log('✅ [VIDEO] Camera restored, enabled:', cameraVideoTrack.enabled);
      }
    }

    setIsScreenSharing(false);
    setScreenSharingUser(null);

    socket.emit('screen_share_stopped', {
      roomId,
      projectId,
      userId: currentUser.id
    });

    console.log('✅ [VIDEO] Screen share stopped');
  }, [socket, roomId, projectId, currentUser.id]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      await startScreenShare();
    } else {
      await stopScreenShare();
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
    
    // Stop camera stream
    if (cameraStream.current) {
      cameraStream.current.getTracks().forEach(track => track.stop());
      cameraStream.current = null;
    }
    
    // Stop screen stream
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }

    // Close all peer connections
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
  }, [socket, roomId, projectId, currentUser.id, onEndCall]);

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
        
        if (remoteData?.stream) {
          const tracks = trackKind === 'video' 
            ? remoteData.stream.getVideoTracks() 
            : remoteData.stream.getAudioTracks();
          
          tracks.forEach(track => {
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
        const { odtUserId, username } = participant;
        
        if (odtUserId === currentUser.id) continue;
        
        setParticipants(prev => [...prev.filter(p => p.odtUserId !== odtUserId), { odtUserId, username }]);
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(odtUserId, { 
            stream: null,
            username: username 
          });
          return newMap;
        });
        
        const pc = getOrCreatePeerConnection(odtUserId, username);
        if (!pc) continue;
        
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.emit('video_offer', {
            roomId,
            projectId,
            targetUserId: odtUserId,
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

  // Initialize on mount
  useEffect(() => {
    initializeMedia();

    return () => {
      if (cameraStream.current) {
        cameraStream.current.getTracks().forEach(track => track.stop());
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

  // Sync local video element with camera stream
  useEffect(() => {
    if (cameraStream.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== cameraStream.current) {
        localVideoRef.current.srcObject = cameraStream.current;
        console.log('✅ [VIDEO] Synced local video with camera stream');
      }
    }
  }, [localStream]);

  // Update remote video elements
  useEffect(() => {
    remoteStreams.forEach((data, odtUserId) => {
      const videoElement = remoteVideosRef.current[odtUserId];
      if (videoElement && data.stream) {
        if (videoElement.srcObject !== data.stream) {
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
          {isScreenSharing && (
            <div style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Monitor size={14} />
              Sharing Screen
            </div>
          )}
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

      {/* Main content area */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Screen sharing active layout */}
        {screenSharingUser && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            minHeight: '400px'
          }}>
            {/* Main screen share view */}
            <div style={{
              position: 'relative',
              backgroundColor: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              flex: 1,
              border: '2px solid rgba(16, 185, 129, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px'
            }}>
              {screenSharingUser === 'local' ? (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <video
                  autoPlay
                  playsInline
                  ref={el => {
                    if (el) {
                      const remoteData = remoteStreams.get(screenSharingUser);
                      if (remoteData?.stream && el.srcObject !== remoteData.stream) {
                        el.srcObject = remoteData.stream;
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
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
                {screenSharingUser === 'local' 
                  ? 'You are sharing your screen' 
                  : `${remoteStreams.get(screenSharingUser)?.username || 'User'} is sharing`}
              </div>
            </div>

            {/* Camera thumbnails during screen share */}
            <div style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              padding: '8px 0'
            }}>
              {/* Your camera - always visible */}
              <div style={{
                position: 'relative',
                backgroundColor: 'rgba(26, 28, 32, 0.95)',
                borderRadius: '8px',
                overflow: 'hidden',
                width: '180px',
                minWidth: '180px',
                aspectRatio: '16/9',
                border: '2px solid rgba(59, 130, 246, 0.5)',
                flexShrink: 0
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
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <VideoOff size={20} color="#ef4444" />
                    </div>
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  padding: '3px 8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>You</span>
                  {isMuted && <MicOff size={10} color="#ef4444" />}
                </div>
              </div>

              {/* Remote participants */}
              {Array.from(remoteStreams.entries())
                .filter(([odtUserId]) => odtUserId !== screenSharingUser)
                .map(([odtUserId, data]) => (
                  <div
                    key={odtUserId}
                    style={{
                      position: 'relative',
                      backgroundColor: 'rgba(26, 28, 32, 0.95)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      width: '180px',
                      minWidth: '180px',
                      aspectRatio: '16/9',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      flexShrink: 0
                    }}
                  >
                    <video
                      ref={el => { remoteVideosRef.current[odtUserId] = el; }}
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
                      bottom: '6px',
                      left: '6px',
                      padding: '3px 8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: 'white'
                    }}>
                      {data.username}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Normal grid layout - no screen sharing */}
        {!screenSharingUser && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: remoteStreams.size === 0 ? '1fr' : 
                                remoteStreams.size === 1 ? 'repeat(2, 1fr)' :
                                remoteStreams.size <= 3 ? 'repeat(2, 1fr)' :
                                'repeat(3, 1fr)',
            gap: '16px',
            alignContent: 'start'
          }}>
            {/* Local video */}
            <div style={{
              position: 'relative',
              backgroundColor: 'rgba(26, 28, 32, 0.95)',
              borderRadius: '12px',
              overflow: 'hidden',
              aspectRatio: '16/9',
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
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <VideoOff size={36} color="#ef4444" />
                  </div>
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

            {/* Remote participants */}
            {Array.from(remoteStreams.entries()).map(([odtUserId, data]) => (
              <div
                key={odtUserId}
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
                  ref={el => { remoteVideosRef.current[odtUserId] = el; }}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                {!data.stream && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(26, 28, 32, 0.95)'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      color: '#3b82f6',
                      fontWeight: 'bold'
                    }}>
                      {data.username?.charAt(0).toUpperCase() || '?'}
                    </div>
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
        backgroundColor: 'rgba(26, 28, 32, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px'
      }}>
        {/* Mute button */}
        <button 
          onClick={toggleMute} 
          style={{ 
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: 'none', 
            cursor: 'pointer', 
            backgroundColor: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
            color: isMuted ? 'white' : '#fff', 
            transition: 'all 0.2s ease', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }} 
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Camera button */}
        <button 
          onClick={toggleVideo} 
          style={{ 
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: 'none', 
            cursor: 'pointer', 
            backgroundColor: isVideoOff ? '#ef4444' : 'rgba(255, 255, 255, 0.1)',
            color: isVideoOff ? 'white' : '#fff', 
            transition: 'all 0.2s ease', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }} 
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>

        {/* Screen share button */}
        <button 
          onClick={toggleScreenShare} 
          style={{ 
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: 'none', 
            cursor: 'pointer', 
            backgroundColor: isScreenSharing ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
            color: 'white', 
            transition: 'all 0.2s ease', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }} 
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
        </button>

        {/* Chat */}
        <VideoCallChat 
          socket={socket} 
          roomId={roomId} 
          projectId={projectId} 
          currentUser={currentUser} 
          participants={participants} 
        />

        {/* Fullscreen button */}
        <button 
          onClick={toggleFullScreen} 
          style={{ 
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: 'none', 
            cursor: 'pointer', 
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff', 
            transition: 'all 0.2s ease', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }} 
          title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullScreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
        </button>

        {/* Divider */}
        <div style={{ 
          width: '1px', 
          height: '36px', 
          backgroundColor: 'rgba(255, 255, 255, 0.2)', 
          margin: '0 8px' 
        }} />

        {/* End call button */}
        <button 
          onClick={handleEndCall} 
          style={{ 
            height: '52px',
            padding: '0 28px', 
            borderRadius: '26px', 
            border: 'none', 
            cursor: 'pointer', 
            backgroundColor: '#ef4444', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontWeight: '600', 
            fontSize: '15px', 
            transition: 'all 0.2s ease'
          }} 
          title="End call"
        >
          <PhoneOff size={20} />
          End Call
        </button>
      </div>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          padding: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#10b981',
          fontFamily: 'monospace',
          zIndex: 100
        }}>
          <div>Camera: {isVideoOff ? '❌ OFF' : '✅ ON'}</div>
          <div>Mic: {isMuted ? '❌ OFF' : '✅ ON'}</div>
          <div>Screen: {isScreenSharing ? '✅ SHARING' : '❌ OFF'}</div>
          <div>Track enabled: {cameraStream.current?.getVideoTracks()[0]?.enabled ? '✅' : '❌'}</div>
          <div>Track state: {cameraStream.current?.getVideoTracks()[0]?.readyState || 'N/A'}</div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;