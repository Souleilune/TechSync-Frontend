// frontend/src/hooks/useWebRTC.js
// Custom hook for WebRTC connection management

import { useCallback, useRef, useReducer, useEffect } from 'react';

// Connection states
const ConnectionState = {
  NEW: 'new',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
  CLOSED: 'closed'
};

// Action types for reducer
const ActionTypes = {
  SET_LOCAL_STREAM: 'SET_LOCAL_STREAM',
  ADD_REMOTE_STREAM: 'ADD_REMOTE_STREAM',
  REMOVE_REMOTE_STREAM: 'REMOVE_REMOTE_STREAM',
  UPDATE_PEER_STATE: 'UPDATE_PEER_STATE',
  SET_SCREEN_SHARE: 'SET_SCREEN_SHARE',
  SET_ERROR: 'SET_ERROR',
  RESET: 'RESET'
};

// Initial state
const initialState = {
  localStream: null,
  screenStream: null,
  remoteStreams: new Map(),
  peerStates: new Map(),
  isScreenSharing: false,
  screenSharingUserId: null,
  error: null
};

// Reducer for state management
function webRTCReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOCAL_STREAM:
      return { ...state, localStream: action.payload };
    
    case ActionTypes.ADD_REMOTE_STREAM: {
      const newRemoteStreams = new Map(state.remoteStreams);
      newRemoteStreams.set(action.payload.peerId, {
        stream: action.payload.stream,
        username: action.payload.username,
        audioEnabled: true,
        videoEnabled: true
      });
      return { ...state, remoteStreams: newRemoteStreams };
    }
    
    case ActionTypes.REMOVE_REMOTE_STREAM: {
      const newRemoteStreams = new Map(state.remoteStreams);
      newRemoteStreams.delete(action.payload);
      return { ...state, remoteStreams: newRemoteStreams };
    }
    
    case ActionTypes.UPDATE_PEER_STATE: {
      const newPeerStates = new Map(state.peerStates);
      newPeerStates.set(action.payload.peerId, action.payload.state);
      return { ...state, peerStates: newPeerStates };
    }
    
    case ActionTypes.SET_SCREEN_SHARE:
      return {
        ...state,
        screenStream: action.payload.stream,
        isScreenSharing: action.payload.isSharing,
        screenSharingUserId: action.payload.userId
      };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ActionTypes.RESET:
      return initialState;
    
    default:
      return state;
  }
}

// ICE Server configuration - Production ready with multiple fallbacks
const getIceServers = () => ({
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    
    // Twilio STUN (free)
    { urls: 'stun:global.stun.twilio.com:3478' },
    
    // Open TURN servers (for NAT traversal)
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
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
});

// Media constraints
const getMediaConstraints = (quality = 'high') => {
  const qualities = {
    low: { width: 640, height: 360, frameRate: 15 },
    medium: { width: 1280, height: 720, frameRate: 24 },
    high: { width: 1920, height: 1080, frameRate: 30 }
  };
  
  const { width, height, frameRate } = qualities[quality] || qualities.medium;
  
  return {
    video: {
      width: { ideal: width, max: width },
      height: { ideal: height, max: height },
      frameRate: { ideal: frameRate, max: frameRate },
      facingMode: 'user'
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000
    }
  };
};

export function useWebRTC({ socket, roomId, projectId, currentUser }) {
  const [state, dispatch] = useReducer(webRTCReducer, initialState);
  
  // Refs for mutable state that shouldn't trigger re-renders
  const peerConnections = useRef(new Map());
  const pendingCandidates = useRef(new Map());
  const originalVideoTrack = useRef(null);
  const reconnectAttempts = useRef(new Map());
  const connectionMonitors = useRef(new Map());
  
  // Max reconnection attempts per peer
  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_DELAY_BASE = 1000;

  // Cleanup function for peer connections
  const cleanupPeerConnection = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    
    pendingCandidates.current.delete(peerId);
    reconnectAttempts.current.delete(peerId);
    
    const monitor = connectionMonitors.current.get(peerId);
    if (monitor) {
      clearInterval(monitor);
      connectionMonitors.current.delete(peerId);
    }
    
    dispatch({ type: ActionTypes.REMOVE_REMOTE_STREAM, payload: peerId });
  }, []);

  // Create peer connection with all event handlers
  const createPeerConnection = useCallback((peerId, peerUsername) => {
    // Cleanup existing connection if any
    if (peerConnections.current.has(peerId)) {
      cleanupPeerConnection(peerId);
    }

    console.log(`🔗 [WebRTC] Creating peer connection for ${peerUsername} (${peerId})`);
    
    const pc = new RTCPeerConnection(getIceServers());
    
    // Custom properties for perfect negotiation
    pc.peerId = peerId;
    pc.peerUsername = peerUsername;
    pc.makingOffer = false;
    pc.ignoreOffer = false;
    pc.isSettingRemoteAnswerPending = false;
    
    // Determine politeness (lower ID is polite)
    pc.polite = currentUser.id.toString() < peerId.toString();
    
    // Add local tracks
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => {
        pc.addTrack(track, state.localStream);
        console.log(`✅ [WebRTC] Added ${track.kind} track to ${peerUsername}`);
      });
    }

    // ICE candidate handling
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('video_ice_candidate', {
          roomId,
          projectId,
          targetUserId: peerId,
          candidate: candidate.toJSON()
        });
      }
    };

    // ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log(`🧊 [WebRTC] ICE gathering state (${peerUsername}): ${pc.iceGatheringState}`);
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 [WebRTC] ICE connection state (${peerUsername}): ${pc.iceConnectionState}`);
      
      dispatch({
        type: ActionTypes.UPDATE_PEER_STATE,
        payload: { peerId, state: pc.iceConnectionState }
      });

      if (pc.iceConnectionState === 'failed') {
        handleConnectionFailure(peerId, peerUsername);
      } else if (pc.iceConnectionState === 'connected') {
        reconnectAttempts.current.set(peerId, 0);
        startConnectionMonitor(peerId);
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      console.log(`🔌 [WebRTC] Connection state (${peerUsername}): ${pc.connectionState}`);
      
      if (pc.connectionState === 'failed') {
        handleConnectionFailure(peerId, peerUsername);
      } else if (pc.connectionState === 'disconnected') {
        // Wait before cleanup - might reconnect
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            handleConnectionFailure(peerId, peerUsername);
          }
        }, 5000);
      }
    };

    // Negotiation needed (for renegotiation)
    pc.onnegotiationneeded = async () => {
      try {
        pc.makingOffer = true;
        await pc.setLocalDescription();
        
        socket.emit('video_offer', {
          roomId,
          projectId,
          targetUserId: peerId,
          offer: pc.localDescription.toJSON()
        });
      } catch (error) {
        console.error(`❌ [WebRTC] Negotiation error:`, error);
      } finally {
        pc.makingOffer = false;
      }
    };

    // Track received
    pc.ontrack = ({ track, streams }) => {
      console.log(`📹 [WebRTC] Received ${track.kind} track from ${peerUsername}`);
      
      const stream = streams[0] || new MediaStream([track]);
      
      track.onunmute = () => {
        dispatch({
          type: ActionTypes.ADD_REMOTE_STREAM,
          payload: {
            peerId,
            stream,
            username: peerUsername
          }
        });
      };
      
      track.onmute = () => {
        console.log(`🔇 [WebRTC] Track muted from ${peerUsername}`);
      };

      track.onended = () => {
        console.log(`🔚 [WebRTC] Track ended from ${peerUsername}`);
      };
    };

    peerConnections.current.set(peerId, pc);
    
    // Process any pending ICE candidates
    const pending = pendingCandidates.current.get(peerId);
    if (pending?.length > 0) {
      console.log(`🧊 [WebRTC] Processing ${pending.length} pending ICE candidates for ${peerUsername}`);
      pending.forEach(candidate => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          console.error(`❌ [WebRTC] Failed to add pending ICE candidate:`, err);
        });
      });
      pendingCandidates.current.delete(peerId);
    }

    return pc;
  }, [socket, roomId, projectId, currentUser.id, state.localStream, cleanupPeerConnection]);

  // Handle connection failure with reconnection logic
  const handleConnectionFailure = useCallback((peerId, peerUsername) => {
    const attempts = reconnectAttempts.current.get(peerId) || 0;
    
    if (attempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(`🔄 [WebRTC] Reconnecting to ${peerUsername} (attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      
      reconnectAttempts.current.set(peerId, attempts + 1);
      
      const delay = RECONNECT_DELAY_BASE * Math.pow(2, attempts);
      
      setTimeout(() => {
        const pc = peerConnections.current.get(peerId);
        if (pc) {
          pc.restartIce();
        }
      }, delay);
    } else {
      console.log(`❌ [WebRTC] Max reconnection attempts reached for ${peerUsername}`);
      cleanupPeerConnection(peerId);
    }
  }, [cleanupPeerConnection]);

  // Start connection quality monitor
  const startConnectionMonitor = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (!pc) return;

    // Clear existing monitor
    const existingMonitor = connectionMonitors.current.get(peerId);
    if (existingMonitor) {
      clearInterval(existingMonitor);
    }

    const monitor = setInterval(async () => {
      if (pc.connectionState !== 'connected') {
        clearInterval(monitor);
        connectionMonitors.current.delete(peerId);
        return;
      }

      try {
        const stats = await pc.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let bytesReceived = 0;
        let jitter = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
            bytesReceived = report.bytesReceived || 0;
            jitter = report.jitter || 0;
          }
        });

        const packetLossRate = packetsReceived > 0 
          ? (packetsLost / (packetsLost + packetsReceived)) * 100 
          : 0;

        // Log only if there are issues
        if (packetLossRate > 5) {
          console.warn(`⚠️ [WebRTC] High packet loss (${peerId}): ${packetLossRate.toFixed(2)}%`);
        }
      } catch (error) {
        console.error(`❌ [WebRTC] Failed to get stats:`, error);
      }
    }, 5000);

    connectionMonitors.current.set(peerId, monitor);
  }, []);

  // Initialize local media
  const initializeMedia = useCallback(async (quality = 'medium') => {
    try {
      console.log('🎥 [WebRTC] Requesting media permissions...');
      
      const stream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(quality)
      );
      
      console.log('✅ [WebRTC] Got local media stream');
      
      // Store original video track reference
      originalVideoTrack.current = stream.getVideoTracks()[0];
      
      dispatch({ type: ActionTypes.SET_LOCAL_STREAM, payload: stream });
      
      return stream;
    } catch (error) {
      console.error('❌ [WebRTC] Failed to get media:', error);
      
      let errorMessage = 'Failed to access camera/microphone';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission denied. Please allow camera/microphone access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use by another application.';
      }
      
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      throw new Error(errorMessage);
    }
  }, []);

  // Handle incoming offer (Perfect Negotiation Pattern)
  const handleOffer = useCallback(async ({ userId, username, offer }) => {
    console.log(`📨 [WebRTC] Received offer from ${username}`);
    
    let pc = peerConnections.current.get(userId);
    if (!pc) {
      pc = createPeerConnection(userId, username);
    }

    const readyForOffer = !pc.makingOffer && 
                          (pc.signalingState === 'stable' || pc.isSettingRemoteAnswerPending);
    const offerCollision = !readyForOffer;

    pc.ignoreOffer = !pc.polite && offerCollision;
    
    if (pc.ignoreOffer) {
      console.log(`⚠️ [WebRTC] Ignoring colliding offer (impolite)`);
      return;
    }

    try {
      pc.isSettingRemoteAnswerPending = false;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('video_answer', {
        roomId,
        projectId,
        targetUserId: userId,
        answer: pc.localDescription.toJSON()
      });
      
      console.log(`✅ [WebRTC] Sent answer to ${username}`);
    } catch (error) {
      console.error(`❌ [WebRTC] Failed to handle offer:`, error);
    }
  }, [socket, roomId, projectId, createPeerConnection]);

  // Handle incoming answer
  const handleAnswer = useCallback(async ({ userId, answer }) => {
    const pc = peerConnections.current.get(userId);
    if (!pc) {
      console.error(`❌ [WebRTC] No peer connection for answer from ${userId}`);
      return;
    }

    try {
      pc.isSettingRemoteAnswerPending = true;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      pc.isSettingRemoteAnswerPending = false;
      console.log(`✅ [WebRTC] Set remote answer from ${userId}`);
    } catch (error) {
      console.error(`❌ [WebRTC] Failed to handle answer:`, error);
      pc.isSettingRemoteAnswerPending = false;
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async ({ userId, candidate }) => {
    const pc = peerConnections.current.get(userId);
    
    if (!pc || !pc.remoteDescription) {
      // Queue candidate for later
      if (!pendingCandidates.current.has(userId)) {
        pendingCandidates.current.set(userId, []);
      }
      pendingCandidates.current.get(userId).push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      if (!pc.ignoreOffer) {
        console.error(`❌ [WebRTC] Failed to add ICE candidate:`, error);
      }
    }
  }, []);

  // Create offer for new participant
  const createOffer = useCallback(async (peerId, peerUsername) => {
    const pc = createPeerConnection(peerId, peerUsername);
    
    try {
      pc.makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('video_offer', {
        roomId,
        projectId,
        targetUserId: peerId,
        offer: pc.localDescription.toJSON()
      });
      
      console.log(`✅ [WebRTC] Sent offer to ${peerUsername}`);
    } catch (error) {
      console.error(`❌ [WebRTC] Failed to create offer:`, error);
    } finally {
      pc.makingOffer = false;
    }
  }, [socket, roomId, projectId, createPeerConnection]);

  // Toggle audio
  const toggleAudio = useCallback((enabled) => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'audio',
        enabled
      });
    }
  }, [state.localStream, socket, roomId, projectId, currentUser.id]);

  // Toggle video
  const toggleVideo = useCallback((enabled) => {
    if (originalVideoTrack.current) {
      originalVideoTrack.current.enabled = enabled;
      
      // Only emit if not screen sharing
      if (!state.isScreenSharing) {
        socket.emit('video_track_toggle', {
          roomId,
          projectId,
          userId: currentUser.id,
          trackKind: 'video',
          enabled
        });
      }
    }
  }, [state.isScreenSharing, socket, roomId, projectId, currentUser.id]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      const screenTrack = stream.getVideoTracks()[0];
      
      // Replace track in all peer connections
      const replacePromises = Array.from(peerConnections.current.values()).map(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        return sender?.replaceTrack(screenTrack);
      });
      
      await Promise.all(replacePromises);
      
      // Handle screen share ended by browser
      screenTrack.onended = () => stopScreenShare();
      
      dispatch({
        type: ActionTypes.SET_SCREEN_SHARE,
        payload: { stream, isSharing: true, userId: 'local' }
      });
      
      socket.emit('screen_share_started', {
        roomId,
        projectId,
        userId: currentUser.id
      });
      
      return stream;
    } catch (error) {
      console.error('❌ [WebRTC] Screen share failed:', error);
      throw error;
    }
  }, [socket, roomId, projectId, currentUser.id]);

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => track.stop());
    }

    // Restore camera track
    if (originalVideoTrack.current) {
      const replacePromises = Array.from(peerConnections.current.values()).map(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        return sender?.replaceTrack(originalVideoTrack.current);
      });
      
      await Promise.all(replacePromises);
      
      // Notify about camera state
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'video',
        enabled: originalVideoTrack.current.enabled
      });
    }

    dispatch({
      type: ActionTypes.SET_SCREEN_SHARE,
      payload: { stream: null, isSharing: false, userId: null }
    });

    socket.emit('screen_share_stopped', {
      roomId,
      projectId,
      userId: currentUser.id
    });
  }, [state.screenStream, socket, roomId, projectId, currentUser.id]);

  // Cleanup all connections
  const cleanup = useCallback(() => {
    console.log('🧹 [WebRTC] Cleaning up all connections');
    
    peerConnections.current.forEach((_, peerId) => {
      cleanupPeerConnection(peerId);
    });
    
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => track.stop());
    }
    
    dispatch({ type: ActionTypes.RESET });
  }, [state.localStream, state.screenStream, cleanupPeerConnection]);

  return {
    // State
    localStream: state.localStream,
    screenStream: state.screenStream,
    remoteStreams: state.remoteStreams,
    peerStates: state.peerStates,
    isScreenSharing: state.isScreenSharing,
    screenSharingUserId: state.screenSharingUserId,
    error: state.error,
    
    // Actions
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
  };
}

export default useWebRTC;