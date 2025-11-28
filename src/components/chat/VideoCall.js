// frontend/src/components/chat/VideoCall.js
// ✅ FIXED: Screen share + Camera working simultaneously

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
  
  // ✅ NEW: Separate state for local screen stream display
  const [localScreenStream, setLocalScreenStream] = useState(null);

  // Refs
  const localVideoRef = useRef(null);
  const localScreenRef = useRef(null); // ✅ NEW: Ref for local screen preview
  const remoteVideosRef = useRef({});
  const remoteScreenRef = useRef(null); // ✅ NEW: Ref for remote screen
  const peerConnections = useRef(new Map());
  const screenStream = useRef(null);
  const containerRef = useRef(null);
  const pendingCandidates = useRef(new Map());
  
  // ✅ Track refs
  const originalCameraTrack = useRef(null);
  const screenSenders = useRef(new Map()); // ✅ NEW: Track screen senders separately

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

      // Add local stream tracks (camera + audio)
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        console.log(`✅ [VIDEO] Added ${track.kind} track to ${username}`);
      });

      // ✅ If we're already screen sharing, add screen track too
      if (isScreenSharing && screenStream.current) {
        const screenTrack = screenStream.current.getVideoTracks()[0];
        if (screenTrack) {
          const sender = pc.addTrack(screenTrack, screenStream.current);
          screenSenders.current.set(userId, sender);
          console.log(`✅ [VIDEO] Added screen track to new peer ${username}`);
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

      // ✅ FIXED: Handle multiple video tracks (camera + screen)
      pc.ontrack = (event) => {
        console.log(`📹 [VIDEO] Received ${event.track.kind} track from ${username}:`, event.track.id);
        console.log(`📹 [VIDEO] Track label:`, event.track.label);
        
        const track = event.track;
        const streamId = event.streams[0]?.id;
        
        // Determine if this is a screen share track
        // Screen share tracks usually have "screen" in label or come from getDisplayMedia
        const isScreenTrack = track.label.toLowerCase().includes('screen') || 
                              track.label.toLowerCase().includes('window') ||
                              track.label.toLowerCase().includes('monitor') ||
                              track.label.toLowerCase().includes('display') ||
                              (track.kind === 'video' && event.streams[0]?.id !== streamId);
        
        console.log(`📹 [VIDEO] Is screen track: ${isScreenTrack}`);
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          let existingData = newMap.get(userId) || { username: username };
          
          if (track.kind === 'video') {
            if (isScreenTrack) {
              // ✅ This is a screen share track
              console.log(`🖥️ [VIDEO] Setting screen stream for ${username}`);
              const screenStreamObj = new MediaStream([track]);
              existingData = {
                ...existingData,
                screenStream: screenStreamObj
              };
            } else {
              // ✅ This is a camera track
              console.log(`📹 [VIDEO] Setting camera stream for ${username}`);
              if (existingData.stream) {
                // Replace existing video track
                existingData.stream.getVideoTracks().forEach(t => {
                  existingData.stream.removeTrack(t);
                });
                existingData.stream.addTrack(track);
              } else {
                existingData.stream = new MediaStream([track]);
              }
            }
          } else if (track.kind === 'audio') {
            if (existingData.stream) {
              const existingAudio = existingData.stream.getAudioTracks();
              if (!existingAudio.some(t => t.id === track.id)) {
                existingAudio.forEach(t => existingData.stream.removeTrack(t));
                existingData.stream.addTrack(track);
              }
            } else {
              existingData.stream = new MediaStream([track]);
            }
          }
          
          newMap.set(userId, existingData);
          return newMap;
        });

        // Handle track ended
        track.onended = () => {
          console.log(`⚠️ [VIDEO] Track ended from ${username}: ${track.kind}`);
          if (isScreenTrack) {
            setRemoteStreams(prev => {
              const newMap = new Map(prev);
              const data = newMap.get(userId);
              if (data) {
                newMap.set(userId, { ...data, screenStream: null });
              }
              return newMap;
            });
          }
        };
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

      // ✅ Handle negotiation needed (important for adding tracks mid-call)
      pc.onnegotiationneeded = async () => {
        console.log(`🔄 [VIDEO] Negotiation needed with ${username}`);
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
        } catch (err) {
          console.error(`❌ [VIDEO] Negotiation failed:`, err);
        } finally {
          pc.makingOffer = false;
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
  }, [localStream, isScreenSharing, socket, roomId, projectId, currentUser.id]);

  const handleNewParticipant = useCallback(async (data) => {
    const { userId, username } = data;
    
    if (userId === currentUser.id) return;

    console.log(`👤 [VIDEO] New participant: ${username}`);
    setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);

    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, { 
        stream: null,
        screenStream: null,
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

  // ✅ FIXED: Camera toggle works independently of screen share
  const toggleVideo = useCallback(() => {
    if (!originalCameraTrack.current) {
      console.error('❌ [VIDEO] No camera track available');
      return;
    }

    const newEnabledState = !originalCameraTrack.current.enabled;
    originalCameraTrack.current.enabled = newEnabledState;
    setIsVideoOff(!newEnabledState);
    
    console.log('📹 [VIDEO] Camera:', newEnabledState ? 'ON' : 'OFF');

    // ✅ Always notify peers - camera works independently of screen share
    socket.emit('video_track_toggle', {
      roomId,
      projectId,
      userId: currentUser.id,
      trackKind: 'video',
      enabled: newEnabledState
    });
  }, [socket, roomId, projectId, currentUser.id]);

  // ✅ REWRITTEN: Screen share as ADDITIONAL track (not replacing camera)
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        // =============== START SCREEN SHARE ===============
        console.log('🖥️ [VIDEO] Starting screen share...');
        
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });

        screenStream.current = stream;
        setLocalScreenStream(stream);
        
        const screenVideoTrack = stream.getVideoTracks()[0];
        console.log('🖥️ [VIDEO] Got screen track:', screenVideoTrack.id, screenVideoTrack.label);

        // ✅ ADD screen track to all peer connections (don't replace camera)
        peerConnections.current.forEach((pc, odspUserId) => {
          try {
            const sender = pc.addTrack(screenVideoTrack, stream);
            screenSenders.current.set; visually(odspUserId, sender);
            console.log(`✅ [VIDEO] Added screen track to peer ${odspUserId}`);
          } catch (err) {
            console.error(`❌ [VIDEO] Failed to add screen track to ${odspUserId}:`, err);
          }
        });

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
          userId: currentUser.id,
          username: currentUser.username
        });

        console.log('✅ [VIDEO] Screen share started successfully');

      } else {
        await stopScreenShare();
      }
    } catch (error) {
      console.error('❌ [VIDEO] Screen share error:', error);
      
      if (error.name === 'NotAllowedError') {
        console.log('📹 [VIDEO] User cancelled screen share picker');
        return;
      }
      
      cleanupScreenShare();
    }
  }, [isScreenSharing, socket, roomId, projectId, currentUser]);

  // ✅ Stop screen share - remove the screen track
  const stopScreenShare = useCallback(async () => {
    console.log('🛑 [VIDEO] Stopping screen share...');
    
    // Stop screen tracks
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => {
        track.onended = null;
        track.stop();
      });
    }

    // ✅ Remove screen track from all peer connections
    peerConnections.current.forEach((pc, odspUserId) => {
      const sender = screenSenders.current.get(odspUserId);
      if (sender) {
        try {
          pc.removeTrack(sender);
          console.log(`✅ [VIDEO] Removed screen track from peer ${odspUserId}`);
        } catch (err) {
          console.error(`❌ [VIDEO] Failed to remove screen track from ${odspUserId}:`, err);
        }
      }
    });

    screenSenders.current.clear();
    screenStream.current = null;
    setLocalScreenStream(null);
    setIsScreenSharing(false);
    setScreenSharingUser(null);

    socket.emit('screen_share_stopped', {
      roomId,
      projectId,
      userId: currentUser.id
    });

    console.log('✅ [VIDEO] Screen share stopped');
  }, [socket, roomId, projectId, currentUser.id]);

  // Cleanup helper
  const cleanupScreenShare = useCallback(() => {
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => {
        track.onended = null;
        track.stop();
      });
      screenStream.current = null;
    }
    
    screenSenders.current.forEach((sender, odspUserId) => {
      const pc = peerConnections.current.get(odspUserId);
      if (pc) {
        try {
          pc.removeTrack(sender);
        } catch (e) {}
      }
    });
    screenSenders.current.clear();
    
    setLocalScreenStream(null);
    setIsScreenSharing(false);
    setScreenSharingUser(null);
  }, []);

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
    
    cleanupScreenShare();
    
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
  }, [localStream, cleanupScreenShare, socket, roomId, projectId, currentUser.id, onEndCall]);

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
        // Clear remote screen stream
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const remoteData = newMap.get(data.userId);
          if (remoteData) {
            newMap.set(data.userId, { ...remoteData, screenStream: null });
          }
          return newMap;
        });
      }
    });

    socket.on('video_track_toggle', (data) => {
      const { userId, trackKind, enabled } = data;
      
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
          });
          
          newMap.set(userId, { ...remoteData });
        }
        
        return newMap;
      });
    });

    socket.on('video_current_participants', async (data) => {
      console.log('👥 [VIDEO] Received current participants:', data.participants);
      
      const { participants: currentParticipants } = data;
      
      for (const participant of currentParticipants) {
        const { odspUserId, username } = participant;
        
        if (odspUserId === currentUser.id) continue;
        
        setParticipants(prev => [...prev.filter(p => p.odspUserId !== odspUserId), { odspUserId, username }]);
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(odspUserId, { 
            stream: null,
            screenStream: null,
            username: username 
          });
          return newMap;
        });
        
        const pc = getOrCreatePeerConnection(odspUserId, username);
        if (!pc) continue;
        
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          socket.emit('video_offer', {
            roomId,
            projectId,
            targetUserId: odspUserId,
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
      cleanupScreenShare();
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
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
    if (localStream && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  // Update local screen preview
  useEffect(() => {
    if (localScreenStream && localScreenRef.current) {
      localScreenRef.current.srcObject = localScreenStream;
    }
  }, [localScreenStream]);

  // Update remote video elements
  useEffect(() => {
    remoteStreams.forEach((data, odspUserId) => {
      // Camera video
      const videoElement = remoteVideosRef.current[odspUserId];
      if (videoElement && data.stream) {
        if (videoElement.srcObject !== data.stream) {
          videoElement.srcObject = data.stream;
        }
      }
      
      // Screen video
      if (data.screenStream && remoteScreenRef.current && screenSharingUser === odspUserId) {
        if (remoteScreenRef.current.srcObject !== data.screenStream) {
          remoteScreenRef.current.srcObject = data.screenStream;
        }
      }
    });
  }, [remoteStreams, screenSharingUser]);

  // Get remote screen stream for display
  const getRemoteScreenStream = useCallback(() => {
    if (screenSharingUser && screenSharingUser !== 'local') {
      const remoteData = remoteStreams.get(screenSharingUser);
      return remoteData?.screenStream || remoteData?.stream;
    }
    return null;
  }, [screenSharingUser, remoteStreams]);

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

      {/* Video Content */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* ✅ Screen Share Active Layout */}
        {screenSharingUser && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            minHeight: '400px'
          }}>
            {/* Main Screen Share View */}
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
                  ref={localScreenRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000'
                  }}
                />
              ) : (
                <video
                  ref={remoteScreenRef}
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

            {/* ✅ Camera Thumbnails (visible during screen share) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 180px))',
              gap: '8px',
              maxHeight: '140px',
              padding: '8px 0'
            }}>
              {/* Local Camera - Always visible */}
              <div style={{
                position: 'relative',
                backgroundColor: 'rgba(26, 28, 32, 0.95)',
                borderRadius: '8px',
                overflow: 'hidden',
                aspectRatio: '16/9',
                border: '2px solid rgba(59, 130, 246, 0.5)'
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
                  <span>{currentUser.username} (You)</span>
                  {isMuted && <MicOff size={10} color="#ef4444" />}
                  {isScreenSharing && <Monitor size={10} color="#10b981" />}
                </div>
              </div>

              {/* Remote Cameras */}
              {Array.from(remoteStreams.entries()).map(([odspUserId, data]) => (
                <div
                  key={odspUserId}
                  style={{
                    position: 'relative',
                    backgroundColor: 'rgba(26, 28, 32, 0.95)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    aspectRatio: '16/9',
                    border: screenSharingUser === odspUserId ? 
                           '2px solid rgba(16, 185, 129, 0.5)' :
                           '1px solid rgba(255, 255, 255, 0.1)'
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
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>{data.username}</span>
                    {screenSharingUser === odspUserId && <Monitor size={10} color="#10b981" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ Normal Layout (No Screen Share) */}
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

            {/* Remote Videos */}
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

      {/* Controls */}
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