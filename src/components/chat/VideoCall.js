// frontend/src/components/chat/VideoCall.js
// ✅ PRODUCTION-READY VERSION - All Critical Issues Fixed
// Fixes:
// 1. No stream.id modification (read-only)
// 2. No duplicate peer connections
// 3. Handles missing event.streams gracefully
// 4. Uses replaceTrack for screen share (not add/remove)
// 5. Guards against race conditions

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
  const pendingCandidates = useRef(new Map()); // ✅ FIX #5: Store candidates until PC ready

  // ICE servers configuration with STUN + TURN servers
  // TURN servers relay traffic when direct peer-to-peer fails (DTLS issues)
  const iceServers = {
    iceServers: [
      // STUN servers for NAT traversal
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // ✅ TURN servers for relay (fixes DTLS failures)
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

  // ✅ FIX #2: Check for existing peer connection before creating
  const getOrCreatePeerConnection = useCallback((userId, username) => {
    // Check if peer connection already exists
    let pc = peerConnections.current.get(userId);
    if (pc) {
      console.log(`♻️ [VIDEO] Reusing existing peer connection for ${username}`);
      return pc;
    }

    // ✅ FIX #5: Ensure localStream is available
    if (!localStream) {
      console.error('❌ [VIDEO] Cannot create peer connection - no local stream');
      return null;
    }

    try {
      console.log(`🔗 [VIDEO] Creating new peer connection for ${username} (${userId})`);
      
      pc = new RTCPeerConnection(iceServers);
      
      // ✅ PERFECT NEGOTIATION: Add per-peer state flags
      pc.makingOffer = false;  // Track if we're currently making an offer
      pc.polite = currentUser.id < userId;  // Compute and store politeness once
      pc.lastRemoteSdpId = null;  // Track last applied SDP to avoid duplicates
      
      console.log(`🤝 [VIDEO] Peer ${username} - We are ${pc.polite ? 'polite' : 'impolite'}`);

      // Add local stream tracks
      localStream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, localStream);
        console.log(`✅ [VIDEO] Added ${track.kind} track to ${username}`);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // ✅ Log proper ICE candidate fields (candidate string, sdpMid, sdpMLineIndex)
          console.log(`🧊 [VIDEO] Sending ICE candidate to ${username}:`, {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          });
          
          // ✅ Send complete candidate structure
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
        } else {
          console.log(`✅ [VIDEO] All ICE candidates sent to ${username}`);
        }
      };

      // ✅ FIX #3: Handle missing event.streams gracefully
      pc.ontrack = (event) => {
        console.log(`📹 [VIDEO] Received track from ${username}: ${event.track.kind}`);
        
        // Get stream - handle case where event.streams might be empty
        let stream;
        if (event.streams && event.streams.length > 0) {
          stream = event.streams[0];
        } else {
          // Create a new MediaStream if none provided
          console.warn(`⚠️ [VIDEO] No streams in ontrack event, creating new stream`);
          stream = new MediaStream([event.track]);
        }
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const existingData = newMap.get(userId);
          
          if (existingData?.stream) {
            // Add track to existing stream if not already there
            const trackExists = existingData.stream.getTracks().some(t => t.id === event.track.id);
            if (!trackExists) {
              existingData.stream.addTrack(event.track);
              console.log(`✅ [VIDEO] Added ${event.track.kind} track to existing stream for ${username}`);
            }
          } else {
            // Create new entry
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
        console.log(`🧊 [VIDEO] ICE state with ${username}: ${pc.iceConnectionState}`);
        
        // Handle ICE connection failures
        if (pc.iceConnectionState === 'failed') {
          console.error(`❌ [VIDEO] ICE connection failed with ${username}, attempting restart`);
          // Attempt ICE restart
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`🔌 [VIDEO] Connection state with ${username}: ${pc.connectionState}`);
        
        if (pc.connectionState === 'connected') {
          console.log(`✅ [VIDEO] Successfully connected to ${username}!`);
          console.log(`✅ [VIDEO] ICE state: ${pc.iceConnectionState}`);
          console.log(`✅ [VIDEO] Signaling state: ${pc.signalingState}`);
          
          // Check if we're receiving media
          const receivers = pc.getReceivers();
          console.log(`✅ [VIDEO] Active receivers: ${receivers.length}`);
          receivers.forEach(receiver => {
            if (receiver.track) {
              console.log(`✅ [VIDEO] Receiver track: ${receiver.track.kind}, enabled: ${receiver.track.enabled}, readyState: ${receiver.track.readyState}`);
            }
          });
        } else if (pc.connectionState === 'failed') {
          console.error(`❌ [VIDEO] Connection failed with ${username}`);
          console.error(`❌ [VIDEO] ICE state: ${pc.iceConnectionState}`);
          console.error(`❌ [VIDEO] Signaling state: ${pc.signalingState}`);
          
          // Log what went wrong
          const stats = pc.getStats();
          stats.then(report => {
            report.forEach(stat => {
              if (stat.type === 'transport' && stat.dtlsState) {
                console.error(`❌ [VIDEO] DTLS state: ${stat.dtlsState}`);
              }
              if (stat.type === 'candidate-pair' && stat.state === 'failed') {
                console.error(`❌ [VIDEO] Failed candidate pair:`, stat);
              }
            });
          });
          
          // Don't remove immediately, allow ICE restart to attempt recovery
          setTimeout(() => {
            if (pc.connectionState === 'failed') {
              handleRemoveParticipant(userId);
            }
          }, 5000);
        } else if (pc.connectionState === 'disconnected') {
          console.warn(`⚠️ [VIDEO] Connection disconnected with ${username}`);
          // Wait a bit before removing (might reconnect)
          setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              handleRemoveParticipant(userId);
            }
          }, 5000);
        }
      };

      peerConnections.current.set(userId, pc);
      
      // ✅ FIX #5: Process any pending ICE candidates
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
  }, [localStream, socket, roomId, projectId]);

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
      // ✅ PERFECT NEGOTIATION: Set makingOffer flag
      pc.makingOffer = true;
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Generate unique SDP ID to track duplicates
      const sdpId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      socket.emit('video_offer', {
        roomId,
        projectId,
        targetUserId: userId,
        offer: pc.localDescription,
        sdpId  // ✅ Include sdpId for duplicate detection
      });
      
      console.log(`✅ [VIDEO] Sent offer to ${username} (sdpId: ${sdpId})`);
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to create offer for ${username}:`, error);
    } finally {
      // ✅ Always clear makingOffer flag
      pc.makingOffer = false;
    }
  }, [currentUser.id, getOrCreatePeerConnection, socket, roomId, projectId]);

  const handleVideoOffer = useCallback(async (data) => {
    const { userId, username, offer, sdpId } = data;
    
    console.log(`📨 [VIDEO] Received offer from ${username} (sdpId: ${sdpId || 'none'})`);

    const pc = getOrCreatePeerConnection(userId, username);
    if (!pc) return;

    try {
      // ✅ PERFECT NEGOTIATION: Check for duplicate SDP
      if (sdpId && pc.lastRemoteSdpId === sdpId) {
        console.warn(`⚠️ [VIDEO] Ignoring duplicate offer from ${username} (sdpId: ${sdpId})`);
        return;
      }
      
      // ✅ PERFECT NEGOTIATION: Use stored politeness flag
      const isPolite = pc.polite;
      
      // ✅ PERFECT NEGOTIATION: Check for offer collision using makingOffer
      const offerCollision = (pc.signalingState !== 'stable' || pc.makingOffer);
      
      console.log(`📡 [VIDEO] Signaling state: ${pc.signalingState}, makingOffer: ${pc.makingOffer}`);
      
      if (offerCollision) {
        console.warn(`⚠️ [VIDEO] Offer collision detected!`);
        console.log(`🤝 [VIDEO] We are ${isPolite ? 'polite' : 'impolite'}`);
        
        if (!isPolite) {
          // Impolite: Ignore incoming offer during collision
          console.log(`🤝 [VIDEO] Impolite: Ignoring incoming offer`);
          return;
        }
        
        // Polite: Rollback and accept incoming offer
        console.log(`🤝 [VIDEO] Polite: Rolling back local offer`);
        try {
          await pc.setLocalDescription({type: 'rollback'});
          console.log(`✅ [VIDEO] Successfully rolled back local offer`);
        } catch (rollbackError) {
          console.error(`❌ [VIDEO] Rollback failed:`, rollbackError);
          // Continue anyway
        }
      }
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`✅ [VIDEO] Set remote description from offer`);
      
      // ✅ Track this SDP ID to avoid duplicates
      if (sdpId) {
        pc.lastRemoteSdpId = sdpId;
      }
      
      // ✅ Process any pending ICE candidates now that remote description is set
      const pending = pendingCandidates.current.get(userId);
      if (pending && pending.length > 0) {
        console.log(`🧊 [VIDEO] Processing ${pending.length} pending ICE candidates for ${username}`);
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
      
      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`✅ [VIDEO] Created and set answer`);
      
      // Generate unique SDP ID for answer
      const answerSdpId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      socket.emit('video_answer', {
        roomId,
        projectId,
        targetUserId: userId,
        answer: pc.localDescription,
        sdpId: answerSdpId  // ✅ Include sdpId
      });
      
      console.log(`✅ [VIDEO] Sent answer to ${username} (sdpId: ${answerSdpId})`);

      setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to handle offer from ${username}:`, error);
    }
  }, [getOrCreatePeerConnection, socket, roomId, projectId]);

  const handleVideoAnswer = useCallback(async (data) => {
    const { userId, answer, sdpId } = data;
    
    console.log(`📨 [VIDEO] Received answer from user ${userId} (sdpId: ${sdpId || 'none'})`);

    const pc = peerConnections.current.get(userId);
    if (!pc) {
      console.error(`❌ [VIDEO] No peer connection found for user ${userId}`);
      return;
    }

    try {
      // ✅ PERFECT NEGOTIATION: Check for duplicate SDP
      if (sdpId && pc.lastRemoteSdpId === sdpId) {
        console.warn(`⚠️ [VIDEO] Ignoring duplicate answer (sdpId: ${sdpId})`);
        return;
      }
      
      console.log(`📡 [VIDEO] Current signaling state: ${pc.signalingState}`);
      
      if (pc.signalingState === 'stable') {
        console.warn(`⚠️ [VIDEO] PC already in stable state, ignoring answer`);
        return;
      }
      
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`⚠️ [VIDEO] PC in unexpected state ${pc.signalingState}, attempting anyway`);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`✅ [VIDEO] Set remote description from answer`);
      
      // ✅ Track this SDP ID to avoid duplicates
      if (sdpId) {
        pc.lastRemoteSdpId = sdpId;
      }
      
      // ✅ Process any pending ICE candidates now that remote description is set
      const pending = pendingCandidates.current.get(userId);
      if (pending && pending.length > 0) {
        console.log(`🧊 [VIDEO] Processing ${pending.length} pending ICE candidates`);
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
      console.error(`❌ [VIDEO] Signaling state was: ${pc.signalingState}`);
    }
  }, []);

  const handleIceCandidate = useCallback(async (data) => {
    const { userId, candidate } = data;
    
    const pc = peerConnections.current.get(userId);
    if (!pc) {
      // ✅ Store candidate for later if PC not ready yet
      console.warn(`⚠️ [VIDEO] No PC yet for user ${userId}, storing ICE candidate`);
      if (!pendingCandidates.current.has(userId)) {
        pendingCandidates.current.set(userId, []);
      }
      pendingCandidates.current.get(userId).push(candidate);
      return;
    }

    // ✅ Check if remote description is set
    if (!pc.remoteDescription) {
      console.warn(`⚠️ [VIDEO] No remote description yet for user ${userId}, storing ICE candidate`);
      if (!pendingCandidates.current.has(userId)) {
        pendingCandidates.current.set(userId, []);
      }
      pendingCandidates.current.get(userId).push(candidate);
      return;
    }

    try {
      // ✅ PERFECT NEGOTIATION: Properly construct RTCIceCandidate with explicit fields
      const iceCandidate = new RTCIceCandidate({
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        usernameFragment: candidate.usernameFragment
      });
      
      await pc.addIceCandidate(iceCandidate);
      console.log(`🧊 [VIDEO] Added ICE candidate from user ${userId}:`, {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex
      });
    } catch (error) {
      console.error(`❌ [VIDEO] Failed to add ICE candidate from ${userId}:`, error);
      console.error(`❌ [VIDEO] PC state: signaling=${pc.signalingState}, ice=${pc.iceConnectionState}`);
      console.error(`❌ [VIDEO] Candidate:`, candidate);
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

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        
        console.log('📹 [VIDEO] Camera:', videoTrack.enabled ? 'ON' : 'OFF');
        
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

  // ✅ FIX #4: Use replaceTrack instead of add/remove
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        console.log('🖥️ [VIDEO] Starting screen share...');
        
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        screenStream.current = stream;
        const screenVideoTrack = stream.getVideoTracks()[0];

        // ✅ FIX #4: Use replaceTrack on each peer's video sender
        peerConnections.current.forEach((pc, userId) => {
          try {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(screenVideoTrack);
              console.log(`✅ [VIDEO] Replaced camera with screen for user ${userId}`);
            }
          } catch (error) {
            console.error(`❌ [VIDEO] Failed to replace track for ${userId}:`, error);
          }
        });

        // Handle when user stops sharing via browser button
        screenVideoTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        setScreenSharingUser('local');

        socket.emit('screen_share_started', {
          roomId,
          projectId,
          userId: currentUser.id
        });

      } else {
        console.log('🛑 [VIDEO] Stopping screen share...');
        
        if (screenStream.current) {
          screenStream.current.getTracks().forEach(track => track.stop());
          screenStream.current = null;
        }

        // ✅ FIX #4: Use replaceTrack to restore camera
        if (localStream) {
          const cameraVideoTrack = localStream.getVideoTracks()[0];
          cameraVideoTrack.enabled = !isVideoOff;

          peerConnections.current.forEach((pc, userId) => {
            try {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender) {
                sender.replaceTrack(cameraVideoTrack);
                console.log(`✅ [VIDEO] Restored camera for user ${userId}`);
              }
            } catch (error) {
              console.error(`❌ [VIDEO] Failed to restore camera for ${userId}:`, error);
            }
          });

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        }

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
      
      if (isScreenSharing) {
        setIsScreenSharing(false);
        setScreenSharingUser(null);
        
        if (screenStream.current) {
          screenStream.current.getTracks().forEach(track => track.stop());
          screenStream.current = null;
        }
        
        if (localStream && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
      }
    }
  }, [isScreenSharing, localStream, isVideoOff, socket, roomId, projectId, currentUser.id]);

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
        const { userId, username } = participant;
        
        if (userId === currentUser.id) continue;
        
        console.log('👤 [VIDEO] Creating connection to existing participant:', username);
        
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
          
          console.log('✅ [VIDEO] Sent offer to existing participant:', username);
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
    if (localStream && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  // Update remote video elements
  useEffect(() => {
    remoteStreams.forEach((data, userId) => {
      const videoElement = remoteVideosRef.current[userId];
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
                  {screenSharingUser === 'local' && <Monitor size={10} color="#10b981" />}
                </div>
              </div>

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