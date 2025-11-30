// frontend/src/hooks/useWebRTC.js
// Fixed version with separate screen share handling

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
  localStream: null,        // Always camera/mic
  screenStream: null,       // Screen share stream (separate)
  remoteStreams: new Map(),
  peerStates: new Map(),
  isScreenSharing: false,
  screenSharingUserId: null, // 'local' or odată
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
        screenSharingUserId: action.payload.isSharing ? 'local' : null
      };
    
    case ActionTypes.ADD_REMOTE_STREAM: {
      const newRemoteStreams = new Map(state.remoteStreams);
      newRemoteStreams.set(action.payload.peerId, {
        stream: action.payload.stream,
        username: action.payload.username,
        isScreenShare: action.payload.isScreenShare || false
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
      return { ...state, remoteStreams: newRemoteStreams };
    }
    
    case ActionTypes.UPDATE_PEER_STATE: {
      const newPeerStates = new Map(state.peerStates);
      newPeerStates.set(action.payload.peerId, action.payload.state);
      return { ...state, peerStates: newPeerStates };
    }
    
    case ActionTypes.SET_SCREEN_SHARING_USER:
      return { 
        ...state, 
        screenSharingUserId: action.payload,
        isScreenSharing: action.payload === 'local'
      };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ActionTypes.RESET:
      return initialState;
    
    default:
      return state;
  }
}

const getIceServers = () => ({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
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
  const reconnectAttempts = useRef(new Map());
  const localStreamRef = useRef(null); // Keep ref for cleanup
  
  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_DELAY_BASE = 1000;

  const cleanupPeerConnection = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    
    pendingCandidates.current.delete(peerId);
    reconnectAttempts.current.delete(peerId);
    
    dispatch({ type: ActionTypes.REMOVE_REMOTE_STREAM, payload: peerId });
  }, []);

  const handleConnectionFailure = useCallback((peerId, peerUsername) => {
    const attempts = reconnectAttempts.current.get(peerId) || 0;
    
    if (attempts < MAX_RECONNECT_ATTEMPTS) {
      console.log(`🔄 [WebRTC] Reconnecting to ${peerUsername} (attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      
      reconnectAttempts.current.set(peerId, attempts + 1);
      const delay = RECONNECT_DELAY_BASE * Math.pow(2, attempts);
      
      setTimeout(() => {
        const pc = peerConnections.current.get(peerId);
        if (pc && pc.iceConnectionState === 'failed') {
          pc.restartIce();
        }
      }, delay);
    } else {
      console.log(`❌ [WebRTC] Max reconnection attempts reached for ${peerUsername}`);
      cleanupPeerConnection(peerId);
    }
  }, [cleanupPeerConnection]);

  const createPeerConnection = useCallback((peerId, peerUsername) => {
    if (peerConnections.current.has(peerId)) {
      cleanupPeerConnection(peerId);
    }

    console.log(`🔗 [WebRTC] Creating peer connection for ${peerUsername} (${peerId})`);
    
    const pc = new RTCPeerConnection(getIceServers());
    
    pc.peerId = peerId;
    pc.peerUsername = peerUsername;
    pc.makingOffer = false;
    pc.ignoreOffer = false;
    pc.isSettingRemoteAnswerPending = false;
    pc.polite = currentUser.id.toString() < peerId.toString();
    
    // ✅ Add tracks from local stream (camera/mic)
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
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

    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 [WebRTC] ICE state (${peerUsername}): ${pc.iceConnectionState}`);
      
      dispatch({
        type: ActionTypes.UPDATE_PEER_STATE,
        payload: { peerId, state: pc.iceConnectionState }
      });

      if (pc.iceConnectionState === 'failed') {
        handleConnectionFailure(peerId, peerUsername);
      } else if (pc.iceConnectionState === 'connected') {
        reconnectAttempts.current.set(peerId, 0);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`🔌 [WebRTC] Connection state (${peerUsername}): ${pc.connectionState}`);
      
      if (pc.connectionState === 'failed') {
        handleConnectionFailure(peerId, peerUsername);
      } else if (pc.connectionState === 'disconnected') {
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            handleConnectionFailure(peerId, peerUsername);
          }
        }, 5000);
      }
    };

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

    pc.ontrack = ({ track, streams }) => {
      console.log(`📹 [WebRTC] Received ${track.kind} track from ${peerUsername}`);
      
      const stream = streams[0] || new MediaStream([track]);
      
      track.onunmute = () => {
        dispatch({
          type: ActionTypes.ADD_REMOTE_STREAM,
          payload: {
            peerId,
            stream,
            username: peerUsername,
            isScreenShare: false
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
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      });
      pendingCandidates.current.delete(peerId);
    }

    return pc;
  }, [socket, roomId, projectId, currentUser.id, cleanupPeerConnection, handleConnectionFailure]);

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
      console.log(`⚠️ [WebRTC] Ignoring colliding offer`);
      return;
    }

    try {
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

  const handleAnswer = useCallback(async ({ userId, answer }) => {
    const pc = peerConnections.current.get(userId);
    if (!pc) {
      console.error(`❌ [WebRTC] No peer connection for answer`);
      return;
    }

    try {
      pc.isSettingRemoteAnswerPending = true;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      pc.isSettingRemoteAnswerPending = false;
    } catch (error) {
      console.error(`❌ [WebRTC] Failed to handle answer:`, error);
      pc.isSettingRemoteAnswerPending = false;
    }
  }, []);

  const handleIceCandidate = useCallback(async ({ userId, candidate }) => {
    const pc = peerConnections.current.get(userId);
    
    if (!pc || !pc.remoteDescription) {
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
      
      // Only emit if not screen sharing (peers see screen, not camera)
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

  // ✅ FIXED: Screen share now keeps camera separate
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ [WebRTC] Starting screen share...');
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      
      // ✅ Replace camera track with screen track in peer connections
      // This sends screen to remote peers
      const replacePromises = Array.from(peerConnections.current.values()).map(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          return sender.replaceTrack(screenTrack);
        }
        return Promise.resolve();
      });
      
      await Promise.all(replacePromises);
      
      // Handle browser stop button
      screenTrack.onended = () => {
        console.log('🖥️ [WebRTC] Screen share ended by user');
        stopScreenShare();
      };
      
      // ✅ Store screen stream separately - DON'T touch localStream
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

  // ✅ FIXED: Stop screen share and restore camera to peers
  const stopScreenShare = useCallback(async () => {
    console.log('🛑 [WebRTC] Stopping screen share...');
    
    // Stop screen stream tracks
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => track.stop());
    }

    // ✅ Restore camera track to peer connections
    if (originalVideoTrack.current) {
      const replacePromises = Array.from(peerConnections.current.values()).map(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          return sender.replaceTrack(originalVideoTrack.current);
        }
        return Promise.resolve();
      });
      
      await Promise.all(replacePromises);
      
      // Notify peers about camera state
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
    
    console.log('✅ [WebRTC] Screen share stopped, camera restored');
  }, [state.screenStream, socket, roomId, projectId, currentUser.id]);

  // Handle remote screen share events
  const handleRemoteScreenShareStarted = useCallback((userId) => {
    console.log('🖥️ [WebRTC] Remote user started screen share:', userId);
    dispatch({ type: ActionTypes.SET_SCREEN_SHARING_USER, payload: userId });
  }, []);

  const handleRemoteScreenShareStopped = useCallback((userId) => {
    console.log('🖥️ [WebRTC] Remote user stopped screen share:', userId);
    if (state.screenSharingUserId === userId) {
      dispatch({ type: ActionTypes.SET_SCREEN_SHARING_USER, payload: null });
    }
  }, [state.screenSharingUserId]);

  const cleanup = useCallback(() => {
    console.log('🧹 [WebRTC] Cleaning up...');
    
    peerConnections.current.forEach((_, peerId) => {
      cleanupPeerConnection(peerId);
    });
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (state.screenStream) {
      state.screenStream.getTracks().forEach(track => track.stop());
    }
    
    dispatch({ type: ActionTypes.RESET });
  }, [state.screenStream, cleanupPeerConnection]);

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
    handleRemoteScreenShareStarted,
    handleRemoteScreenShareStopped,
    cleanupPeerConnection,
    cleanup
  };
}

export default useWebRTC;