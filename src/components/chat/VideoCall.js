// frontend/src/components/chat/VideoCall.js
// ✅ FINAL CORRECTED VERSION - Screen Share Stream Handling Fixed
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
  Minimize2,
  Users
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
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // camera streams
  const [remoteScreenStreams, setRemoteScreenStreams] = useState(new Map()); // screen streams
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
  const remoteScreenVideoRef = useRef(null);
  const peerConnections = useRef(new Map());
  const screenStream = useRef(null);
  const containerRef = useRef(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
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

      console.log('✅ [VIDEO] Got media stream');
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

  // Create peer connection
  const createPeerConnection = useCallback((userId, username) => {
    try {
      const pc = new RTCPeerConnection(iceServers);

      // Add local camera/mic tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('video_ice_candidate', {
            roomId,
            projectId,
            targetUserId: userId,
            candidate: event.candidate
          });
        }
      };

      // ✅ CRITICAL FIX: Properly handle incoming tracks
      pc.ontrack = (event) => {
        console.log('📹 [VIDEO] Received track from:', username, 'kind:', event.track.kind, 'streamId:', event.streams[0].id);
        
        const incomingStream = event.streams[0];
        const trackKind = event.track.kind;
        
        // Check if this is a screen share stream by checking stream ID or track label
        const isScreenShare = incomingStream.id.includes('screen') || 
                             event.track.label.includes('screen') ||
                             incomingStream.getVideoTracks().length > 0 && 
                             !incomingStream.getAudioTracks().length;
        
        if (isScreenShare && trackKind === 'video') {
          // This is a screen share track
          console.log('🖥️ [VIDEO] Received SCREEN share from:', username);
          setRemoteScreenStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(userId, {
              stream: incomingStream,
              username
            });
            return newMap;
          });
        } else {
          // This is a camera/mic track
          console.log('📹 [VIDEO] Received CAMERA track from:', username);
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            const existingData = newMap.get(userId) || { username };
            
            if (!existingData.stream) {
              existingData.stream = incomingStream;
            } else {
              // Add track to existing stream
              const trackExists = existingData.stream.getTracks().some(t => t.id === event.track.id);
              if (!trackExists) {
                existingData.stream.addTrack(event.track);
              }
            }
            
            newMap.set(userId, existingData);
            return newMap;
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`🔌 [VIDEO] Connection state with ${username}:`, pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          handleRemoveParticipant(userId);
        }
      };

      peerConnections.current.set(userId, pc);
      return pc;
    } catch (error) {
      console.error('❌ [VIDEO] Failed to create peer connection:', error);
      return null;
    }
  }, [localStream, socket, roomId, projectId]);

  const handleNewParticipant = useCallback(async (data) => {
    const { userId, username } = data;
    
    if (userId === currentUser.id) return;

    console.log('👤 [VIDEO] New participant:', username);
    setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);

    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, { 
        stream: null,
        username: username 
      });
      return newMap;
    });

    const pc = createPeerConnection(userId, username);
    if (!pc) return;

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
      console.error('❌ [VIDEO] Failed to create offer:', error);
    }
  }, [currentUser.id, createPeerConnection, socket, roomId, projectId]);

  const handleVideoOffer = useCallback(async (data) => {
    const { userId, username, offer } = data;
    
    console.log('📨 [VIDEO] Received offer from:', username);

    const pc = createPeerConnection(userId, username);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('video_answer', {
        roomId,
        projectId,
        targetUserId: userId,
        answer: pc.localDescription
      });

      setParticipants(prev => [...prev.filter(p => p.userId !== userId), { userId, username }]);
    } catch (error) {
      console.error('❌ [VIDEO] Failed to handle offer:', error);
    }
  }, [createPeerConnection, socket, roomId, projectId]);

  const handleVideoAnswer = useCallback(async (data) => {
    const { userId, answer } = data;
    
    console.log('📨 [VIDEO] Received answer from user:', userId);

    const pc = peerConnections.current.get(userId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('❌ [VIDEO] Failed to handle answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (data) => {
    const { userId, candidate } = data;
    
    const pc = peerConnections.current.get(userId);
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('❌ [VIDEO] Failed to add ICE candidate:', error);
    }
  }, []);

  const handleRemoveParticipant = useCallback((userId) => {
    console.log('👋 [VIDEO] Participant left:', userId);
    
    const pc = peerConnections.current.get(userId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(userId);
    }

    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });

    setRemoteScreenStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });

    setParticipants(prev => prev.filter(p => p.userId !== userId));
  }, []);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        console.log('🎤 [VIDEO] Microphone toggled:', audioTrack.enabled ? 'ON' : 'OFF');
        
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
        
        console.log('📹 [VIDEO] Camera toggled:', videoTrack.enabled ? 'ON' : 'OFF');
        
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

  // ✅ COMPLETELY REWRITTEN: Screen share with separate stream
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        console.log('🖥️ [VIDEO] Starting screen share...');
        
        // Get screen share as SEPARATE stream
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false
        });

        // Mark this stream as screen share
        stream.id = `screen_${currentUser.id}_${Date.now()}`;
        screenStream.current = stream;
        const screenVideoTrack = stream.getVideoTracks()[0];

        console.log('🖥️ [VIDEO] Screen stream ID:', stream.id);

        // Add screen track to ALL peer connections
        for (const [userId, pc] of peerConnections.current.entries()) {
          try {
            pc.addTrack(screenVideoTrack, stream);
            console.log(`✅ [VIDEO] Added screen track to peer ${userId}`);
            
            // Create new offer to renegotiate
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            socket.emit('video_offer', {
              roomId,
              projectId,
              targetUserId: userId,
              offer: pc.localDescription
            });
          } catch (error) {
            console.error(`❌ [VIDEO] Failed to add screen track for ${userId}:`, error);
          }
        }

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
          const screenTrack = screenStream.current.getVideoTracks()[0];
          
          // Remove screen track from ALL peer connections
          for (const [userId, pc] of peerConnections.current.entries()) {
            try {
              const senders = pc.getSenders();
              const screenSender = senders.find(sender => 
                sender.track && sender.track.id === screenTrack.id
              );
              
              if (screenSender) {
                pc.removeTrack(screenSender);
                console.log(`✅ [VIDEO] Removed screen track from peer ${userId}`);
                
                // Renegotiate after removing track
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                socket.emit('video_offer', {
                  roomId,
                  projectId,
                  targetUserId: userId,
                  offer: pc.localDescription
                });
              }
            } catch (error) {
              console.error(`❌ [VIDEO] Failed to remove screen track for ${userId}:`, error);
            }
          }
          
          // Stop the track
          screenTrack.stop();
          screenStream.current = null;
        }

        setIsScreenSharing(false);
        setScreenSharingUser(null);

        socket.emit('screen_share_stopped', {
          roomId,
          projectId,
          userId: currentUser.id
        });

        console.log('✅ [VIDEO] Screen share stopped');
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
      }
    }
  }, [isScreenSharing, socket, roomId, projectId, currentUser.id]);

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
      setRemoteScreenStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
      if (screenSharingUser === data.userId) {
        setScreenSharingUser(null);
      }
    });

    socket.on('video_track_toggle', (data) => {
      const { userId, trackKind, enabled } = data;
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
  }, [socket, handleNewParticipant, handleVideoOffer, handleVideoAnswer, handleIceCandidate, handleRemoveParticipant, screenSharingUser, createPeerConnection, roomId, projectId, currentUser.id]);

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

  // Update remote video elements for camera streams
  useEffect(() => {
    remoteStreams.forEach((data, userId) => {
      const videoElement = remoteVideosRef.current[userId];
      if (videoElement && data.stream) {
        videoElement.srcObject = data.stream;
      }
    });
  }, [remoteStreams]);

  // Update remote screen video element
  useEffect(() => {
    if (screenSharingUser && screenSharingUser !== 'local') {
      const screenData = remoteScreenStreams.get(screenSharingUser);
      if (remoteScreenVideoRef.current && screenData?.stream) {
        remoteScreenVideoRef.current.srcObject = screenData.stream;
      }
    }
  }, [remoteScreenStreams, screenSharingUser]);

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
            ref={remoteScreenVideoRef}
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
  <button
    onClick={toggleMute}
    style={{
      padding: '0',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: isMuted ? '#ef4444' : '#3b82f6',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title={isMuted ? 'Unmute' : 'Mute'}
  >
    {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
  </button>

  <button
    onClick={toggleVideo}
    style={{
      padding: '0',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: isVideoOff ? '#ef4444' : '#3b82f6',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
  >
    {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
  </button>

  <button
    onClick={toggleScreenShare}
    style={{
      padding: '0',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: isScreenSharing ? '#10b981' : '#3b82f6',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
  >
    {isScreenSharing ? <MonitorOff size={28} /> : <Monitor size={28} />}
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
      padding: '0',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: '#3b82f6',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
  >
    {isFullScreen ? <Minimize2 size={28} /> : <Maximize2 size={28} />}
  </button>

  <div style={{ 
    width: '2px', 
    height: '30px', 
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    margin: '0 8px'
  }} />

  <button
    onClick={handleEndCall}
    style={{
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: '#ef4444',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#dc2626';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '#ef4444';
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