// frontend/src/hooks/useWebRTC.js
// ✅ FIXED: Proper renegotiation handling

import { useCallback, useRef, useReducer } from 'react';

const ActionTypes = {
  SET_LOCAL_STREAM: 'SET_LOCAL_STREAM',
  SET_SCREEN_STREAM: 'SET_SCREEN_STREAM',
  ADD_REMOTE_STREAM: 'ADD_REMOTE_STREAM',
  REMOVE_REMOTE_STREAM: 'REMOVE_REMOTE_STREAM',
  UPDATE_REMOTE_STREAM: 'UPDATE_REMOTE_STREAM',
  UPDATE_PEER_STATE: 'UPDATE_PEER_STATE',
  SET_SCREEN_SHARING_USER: 'SET_SCREEN_SHARING_USER',
  SET_ERROR: 'SET_ERROR',
  RESET: 'RESET'
};

const initialState = {
  localStream: null,
  screenStream: null,
  remoteStreams: new Map(),
  peerStates: new Map(),
  isScreenSharing: false,
  screenSharingUserId: null,
  error: null
};

function webRTCReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOCAL_STREAM:
      return { ...state, localStream: action.payload };
    
    case ActionTypes.SET_SCREEN_STREAM:
      return { 
        ...state, 
        screenStream: action.payload.stream,
        isScreenSharing: action.payload.isSharing,
        screenSharingUserId: action.payload.isSharing ? 'local' : state.screenSharingUserId
      };
    
    case ActionTypes.ADD_REMOTE_STREAM: {
      const newRemoteStreams = new Map(state.remoteStreams);
      const existing = newRemoteStreams.get(action.payload.peerId);
      newRemoteStreams.set(action.payload.peerId, {
        stream: action.payload.stream,
        username: action.payload.username,
        isScreenSharing: existing?.isScreenSharing || false
      });
      return { ...state, remoteStreams: newRemoteStreams };
    }
    
    case ActionTypes.UPDATE_REMOTE_STREAM: {
      const newRemoteStreams = new Map(state.remoteStreams);
      const existing = newRemoteStreams.get(action.payload.peerId);
      if (existing) {
        newRemoteStreams.set(action.payload.peerId, {
          ...existing,
          ...action.payload.updates
        });
      }
      return { ...state, remoteStreams: newRemoteStreams };
    }
    
    case ActionTypes.REMOVE_REMOTE_STREAM: {
      const newRemoteStreams = new Map(state.remoteStreams);
      newRemoteStreams.delete(action.payload);
      
      const newScreenSharingUserId = state.screenSharingUserId === action.payload 
        ? null 
        : state.screenSharingUserId;
      
      return { 
        ...state, 
        remoteStreams: newRemoteStreams,
        screenSharingUserId: newScreenSharingUserId
      };
    }
    
    case ActionTypes.UPDATE_PEER_STATE: {
      const newPeerStates = new Map(state.peerStates);
      newPeerStates.set(action.payload.peerId, action.payload.state);
      return { ...state, peerStates: newPeerStates };
    }
    
    case ActionTypes.SET_SCREEN_SHARING_USER: {
      const newRemoteStreams = new Map(state.remoteStreams);
      
      if (action.payload.peerId && action.payload.peerId !== 'local') {
        const existing = newRemoteStreams.get(action.payload.peerId);
        if (existing) {
          newRemoteStreams.set(action.payload.peerId, {
            ...existing,
            isScreenSharing: action.payload.isSharing
          });
        }
      }
      
      return { 
        ...state,
        remoteStreams: newRemoteStreams,
        screenSharingUserId: action.payload.isSharing ? action.payload.peerId : null,
        isScreenSharing: action.payload.peerId === 'local' ? action.payload.isSharing : state.isScreenSharing
      };
    }
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ActionTypes.RESET:
      return initialState;
    
    default:
      return state;
  }
}

// ✅ Enhanced ICE servers with more TURN options for restrictive networks
const getIceServers = () => ({
  iceServers: [
    // STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    
    // TURN servers (critical for restrictive networks like school WiFi)
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
    },
    // Additional TURN on port 80 (often not blocked)
    {
      urls: 'turn:openrelay.metered.ca:80?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  // ✅ Use all available candidates
  iceTransportPolicy: 'all'
});

const getMediaConstraints = (quality = 'medium') => {
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
  
  const peerConnections = useRef(new Map());
  const pendingCandidates = useRef(new Map());
  const originalVideoTrack = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  
  // ✅ NEW: Track negotiation state per peer to prevent concurrent negotiations
  const negotiationState = useRef(new Map());
  
  // ✅ NEW: Queue for pending operations during negotiation
  const operationQueue = useRef(new Map());

  const cleanupPeerConnection = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      // Remove all event handlers
      pc.onicecandidate = null;
      pc.oniceconnectionstatechange = null;
      pc.onconnectionstatechange = null;
      pc.onnegotiationneeded = null;
      pc.ontrack = null;
      pc.close();
      peerConnections.current.delete(peerId);
    }
    
    pendingCandidates.current.delete(peerId);
    negotiationState.current.delete(peerId);
    operationQueue.current.delete(peerId);
    
    dispatch({ type: ActionTypes.REMOVE_REMOTE_STREAM, payload: peerId });
  }, []);

  // ✅ NEW: Safe negotiation wrapper
  const safeNegotiate = useCallback(async (pc, peerId) => {
    const state = negotiationState.current.get(peerId) || { isNegotiating: false };
    
    // If already negotiating, queue this request
    if (state.isNegotiating) {
      console.log(`⏳ [WebRTC] Negotiation already in progress for ${peerId}, queuing...`);
      state.needsRenegotiation = true;
      negotiationState.current.set(peerId, state);
      return;
    }
    
    // Check if connection is in a valid state for negotiation
    if (pc.signalingState !== 'stable') {
      console.log(`⏳ [WebRTC] Signaling state is ${pc.signalingState}, waiting...`);
      state.needsRenegotiation = true;
      negotiationState.current.set(peerId, state);
      return;
    }
    
    try {
      state.isNegotiating = true;
      state.needsRenegotiation = false;
      negotiationState.current.set(peerId, state);
      
      console.log(`🔄 [WebRTC] Starting negotiation with ${peerId}`);
      
      const offer = await pc.createOffer();
      
      // Double-check state hasn't changed
      if (pc.signalingState !== 'stable') {
        console.log(`⚠️ [WebRTC] State changed during offer creation, aborting`);
        return;
      }
      
      await pc.setLocalDescription(offer);
      
      socket.emit('video_offer', {
        roomId,
        projectId,
        targetUserId: peerId,
        offer: pc.localDescription.toJSON()
      });
      
      console.log(`✅ [WebRTC] Sent offer to ${peerId}`);
      
    } catch (error) {
      console.error(`❌ [WebRTC] Negotiation failed:`, error);
      
      // ✅ Handle the specific m-line order error
      if (error.message?.includes('m-lines') || error.message?.includes('order')) {
        console.log(`🔧 [WebRTC] M-line order error, will recreate connection on next attempt`);
        // Mark for recreation on next attempt
        state.needsRecreation = true;
      }
    } finally {
      state.isNegotiating = false;
      negotiationState.current.set(peerId, state);
      
      // Check if renegotiation was requested while we were negotiating
      if (state.needsRenegotiation) {
        console.log(`🔄 [WebRTC] Processing queued renegotiation for ${peerId}`);
        setTimeout(() => safeNegotiate(pc, peerId), 100);
      }
    }
  }, [socket, roomId, projectId]);

  const createPeerConnection = useCallback((peerId, peerUsername, forceNew = false) => {
    // Check if we need to recreate due to m-line error
  const existingState = negotiationState.current.get(peerId) || {};
    
    if (peerConnections.current.has(peerId) && !forceNew && !existingState.needsRecreation) {
      console.log(`♻️ [WebRTC] Reusing existing connection for ${peerUsername}`);
      return peerConnections.current.get(peerId);
    }
    
    // Clean up existing connection if any
    if (peerConnections.current.has(peerId)) {
      console.log(`🔄 [WebRTC] Recreating connection for ${peerUsername}`);
      cleanupPeerConnection(peerId);
    }

    console.log(`🔗 [WebRTC] Creating peer connection for ${peerUsername} (${peerId})`);
    
    const pc = new RTCPeerConnection(getIceServers());
    
    // Initialize negotiation state
    negotiationState.current.set(peerId, { 
      isNegotiating: false, 
      needsRenegotiation: false,
      needsRecreation: false
    });
    
    pc.peerId = peerId;
    pc.peerUsername = peerUsername;
    pc.polite = currentUser.id.toString() < peerId.toString();
    
    console.log(`🤝 [WebRTC] We are ${pc.polite ? 'polite' : 'impolite'} peer`);
    
    // Add tracks from local stream
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        // If screen sharing, use screen track for video
        if (track.kind === 'video' && screenStreamRef.current) {
          const screenTrack = screenStreamRef.current.getVideoTracks()[0];
          if (screenTrack) {
            pc.addTrack(screenTrack, screenStreamRef.current);
            console.log(`✅ [WebRTC] Added screen track to ${peerUsername}`);
            return;
          }
        }
        pc.addTrack(track, stream);
        console.log(`✅ [WebRTC] Added ${track.kind} track to ${peerUsername}`);
      });
    }

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

    // ✅ Better ICE connection state handling
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 [WebRTC] ICE state (${peerUsername}): ${pc.iceConnectionState}`);
      
      dispatch({
        type: ActionTypes.UPDATE_PEER_STATE,
        payload: { peerId, state: pc.iceConnectionState }
      });

      switch (pc.iceConnectionState) {
        case 'failed':
          console.log(`🔄 [WebRTC] ICE failed, restarting ICE...`);
          pc.restartIce();
          break;
        case 'disconnected':
          // Wait a bit before taking action - might recover
          setTimeout(() => {
            if (pc.iceConnectionState === 'disconnected') {
              console.log(`🔄 [WebRTC] Still disconnected, restarting ICE...`);
              pc.restartIce();
            }
          }, 3000);
          break;
        case 'connected':
        case 'completed':
          console.log(`✅ [WebRTC] Connected to ${peerUsername}`);
          break;
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`🔌 [WebRTC] Connection state (${peerUsername}): ${pc.connectionState}`);
      
      if (pc.connectionState === 'failed') {
        console.log(`❌ [WebRTC] Connection failed, cleaning up...`);
        // Don't immediately cleanup - give it a chance to recover
        setTimeout(() => {
          if (pc.connectionState === 'failed') {
            cleanupPeerConnection(peerId);
          }
        }, 5000);
      }
    };

    // ✅ FIXED: Proper negotiationneeded handling
    pc.onnegotiationneeded = async () => {
      console.log(`📢 [WebRTC] Negotiation needed for ${peerUsername}`);
      await safeNegotiate(pc, peerId);
    };

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
    };

    peerConnections.current.set(peerId, pc);
    
    // Process pending ICE candidates
    const pending = pendingCandidates.current.get(peerId);
    if (pending?.length > 0) {
      console.log(`🧊 [WebRTC] Processing ${pending.length} pending ICE candidates`);
      pending.forEach(candidate => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
          console.warn(`⚠️ [WebRTC] Failed to add pending candidate:`, err.message);
        });
      });
      pendingCandidates.current.delete(peerId);
    }

    return pc;
  }, [socket, roomId, projectId, currentUser.id, cleanupPeerConnection, safeNegotiate]);

  const initializeMedia = useCallback(async (quality = 'medium') => {
    try {
      console.log('🎥 [WebRTC] Requesting media permissions...');
      
      const stream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(quality)
      );
      
      console.log('✅ [WebRTC] Got local media stream');
      
      originalVideoTrack.current = stream.getVideoTracks()[0];
      localStreamRef.current = stream;
      
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
        errorMessage = 'Camera/microphone is already in use.';
      }
      
      dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      throw new Error(errorMessage);
    }
  }, []);

  // ✅ FIXED: Proper offer handling with Perfect Negotiation
  const handleOffer = useCallback(async ({ userId, username, offer }) => {
    console.log(`📨 [WebRTC] Received offer from ${username}`);
    
    let pc = peerConnections.current.get(userId);
    if (!pc) {
      pc = createPeerConnection(userId, username);
    }

    const negState = negotiationState.current.get(userId) || {};
    
    // Perfect Negotiation: Check for collision
    const offerCollision = negState.isNegotiating || pc.signalingState !== 'stable';
    
    if (offerCollision) {
      if (!pc.polite) {
        // We're impolite, ignore incoming offer
        console.log(`⚠️ [WebRTC] Ignoring colliding offer (we're impolite)`);
        return;
      }
      
      // We're polite, rollback our offer
      console.log(`🔄 [WebRTC] Rolling back our offer (we're polite)`);
      try {
        await pc.setLocalDescription({ type: 'rollback' });
      } catch (e) {
        console.warn(`⚠️ [WebRTC] Rollback failed:`, e.message);
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process any pending candidates now that we have remote description
      const pending = pendingCandidates.current.get(userId);
      if (pending?.length > 0) {
        for (const candidate of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn(`⚠️ [WebRTC] Failed to add pending candidate:`, e.message);
          }
        }
        pendingCandidates.current.delete(userId);
      }
      
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
      
      // If we get m-line error, mark for recreation
      if (error.message?.includes('m-lines') || error.message?.includes('order')) {
        console.log(`🔧 [WebRTC] M-line error in answer, recreating connection...`);
        cleanupPeerConnection(userId);
        
        // Recreate and wait for new offer
        createPeerConnection(userId, username, true);
      }
    }
  }, [socket, roomId, projectId, createPeerConnection, cleanupPeerConnection]);

  const handleAnswer = useCallback(async ({ userId, answer }) => {
    const pc = peerConnections.current.get(userId);
    if (!pc) {
      console.error(`❌ [WebRTC] No peer connection for answer`);
      return;
    }

    const negState = negotiationState.current.get(userId) || {};

    try {
      // Only accept answer if we're expecting one
      if (pc.signalingState !== 'have-local-offer') {
        console.warn(`⚠️ [WebRTC] Unexpected answer, signaling state: ${pc.signalingState}`);
        return;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`✅ [WebRTC] Set remote answer from ${userId}`);
      
      // Process pending candidates
      const pending = pendingCandidates.current.get(userId);
      if (pending?.length > 0) {
        for (const candidate of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn(`⚠️ [WebRTC] Failed to add pending candidate:`, e.message);
          }
        }
        pendingCandidates.current.delete(userId);
      }
      
    } catch (error) {
      console.error(`❌ [WebRTC] Failed to handle answer:`, error);
      
      // If we get m-line error, mark for recreation
      if (error.message?.includes('m-lines') || error.message?.includes('order')) {
        negState.needsRecreation = true;
        negotiationState.current.set(userId, negState);
      }
    }
  }, []);

  const handleIceCandidate = useCallback(async ({ userId, candidate }) => {
    const pc = peerConnections.current.get(userId);
    
    if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
      // Queue candidate for later
      if (!pendingCandidates.current.has(userId)) {
        pendingCandidates.current.set(userId, []);
      }
      pendingCandidates.current.get(userId).push(candidate);
      console.log(`📦 [WebRTC] Queued ICE candidate for ${userId}`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      // Ignore errors for candidates that arrive at wrong time
      if (!error.message?.includes('location invalid')) {
        console.warn(`⚠️ [WebRTC] Failed to add ICE candidate:`, error.message);
      }
    }
  }, []);

  // ✅ FIXED: createOffer now uses safeNegotiate
  const createOffer = useCallback(async (peerId, peerUsername) => {
    const pc = createPeerConnection(peerId, peerUsername);
    await safeNegotiate(pc, peerId);
  }, [createPeerConnection, safeNegotiate]);

  const toggleAudio = useCallback((enabled) => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(track => {
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
  }, [socket, roomId, projectId, currentUser.id]);

  const toggleVideo = useCallback((enabled) => {
    if (originalVideoTrack.current) {
      originalVideoTrack.current.enabled = enabled;
      
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

  // ✅ FIXED: Screen share with proper track replacement (no renegotiation needed)
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ [WebRTC] Starting screen share...');
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      screenStreamRef.current = screenStream;
      
      // ✅ Use replaceTrack - doesn't require renegotiation
      const replacePromises = [];
      peerConnections.current.forEach((pc, visitorId) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          replacePromises.push(
            sender.replaceTrack(screenTrack)
              .then(() => console.log(`✅ [WebRTC] Replaced track for ${visitorId}`))
              .catch(err => console.error(`❌ [WebRTC] Failed to replace track:`, err))
          );
        }
      });
      
      await Promise.all(replacePromises);
      
      screenTrack.onended = () => {
        console.log('🖥️ [WebRTC] Screen share ended by user');
        stopScreenShare();
      };
      
      dispatch({
        type: ActionTypes.SET_SCREEN_STREAM,
        payload: { stream: screenStream, isSharing: true }
      });
      
      socket.emit('screen_share_started', {
        roomId,
        projectId,
        userId: currentUser.id
      });
      
      console.log('✅ [WebRTC] Screen share started');
      return screenStream;
    } catch (error) {
      console.error('❌ [WebRTC] Screen share failed:', error);
      throw error;
    }
  }, [socket, roomId, projectId, currentUser.id]);

  const stopScreenShare = useCallback(async () => {
    console.log('🛑 [WebRTC] Stopping screen share...');
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    if (originalVideoTrack.current) {
      // ✅ Use replaceTrack - doesn't require renegotiation
      const replacePromises = [];
      peerConnections.current.forEach((pc, visitorId) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          replacePromises.push(
            sender.replaceTrack(originalVideoTrack.current)
              .then(() => console.log(`✅ [WebRTC] Restored camera for ${ visitorId}`))
              .catch(err => console.error(`❌ [WebRTC] Failed to restore camera:`, err))
          );
        }
      });
      
      await Promise.all(replacePromises);
      
      socket.emit('video_track_toggle', {
        roomId,
        projectId,
        userId: currentUser.id,
        trackKind: 'video',
        enabled: originalVideoTrack.current.enabled
      });
    }

    dispatch({
      type: ActionTypes.SET_SCREEN_STREAM,
      payload: { stream: null, isSharing: false }
    });

    socket.emit('screen_share_stopped', {
      roomId,
      projectId,
      userId: currentUser.id
    });
    
    console.log('✅ [WebRTC] Screen share stopped');
  }, [socket, roomId, projectId, currentUser.id]);

  const handleRemoteScreenShareStarted = useCallback((userId) => {
    console.log('🖥️ [WebRTC] Remote user started screen share:', userId);
    dispatch({ 
      type: ActionTypes.SET_SCREEN_SHARING_USER, 
      payload: { peerId: userId, isSharing: true }
    });
  }, []);

  const handleRemoteScreenShareStopped = useCallback((userId) => {
    console.log('🖥️ [WebRTC] Remote user stopped screen share:', userId);
    dispatch({ 
      type: ActionTypes.SET_SCREEN_SHARING_USER, 
      payload: { peerId: userId, isSharing: false }
    });
  }, []);

  const cleanup = useCallback(() => {
    console.log('🧹 [WebRTC] Cleaning up...');
    
    peerConnections.current.forEach((_,  visitorId) => {
      cleanupPeerConnection(visitorId);
    });
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    negotiationState.current.clear();
    operationQueue.current.clear();
    
    dispatch({ type: ActionTypes.RESET });
  }, [cleanupPeerConnection]);

  return {
    localStream: state.localStream,
    screenStream: state.screenStream,
    remoteStreams: state.remoteStreams,
    peerStates: state.peerStates,
    isScreenSharing: state.isScreenSharing,
    screenSharingUserId: state.screenSharingUserId,
    error: state.error,
    
    initializeMedia,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    handleRemoteScreenShareStarted,
    handleRemoteScreenShareStopped,
    cleanupPeerConnection,
    cleanup
  };
}

export default useWebRTC;