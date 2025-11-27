// frontend/src/components/chat/VideoCallChat.js
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Users } from 'lucide-react';

const VideoCallChat = ({ 
  socket, 
  roomId, 
  projectId, 
  currentUser,
  participants 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Setup socket listeners for in-call chat
  useEffect(() => {
    if (!socket) return;

    // Listen for video call messages
    socket.on('video_call_message', (data) => {
      const { userId, username, message, timestamp } = data;
      
      const newMessage = {
        id: Date.now() + Math.random(),
        userId,
        username,
        message,
        timestamp: timestamp || new Date().toISOString(),
        isOwn: userId === currentUser.id
      };

      setMessages(prev => [...prev, newMessage]);
      
      // Increment unread if chat is closed
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // Listen for participant join/leave system messages
    socket.on('video_participant_joined', (data) => {
      if (data.userId !== currentUser.id) {
        addSystemMessage(`${data.username} joined the call`);
      }
    });

    socket.on('video_participant_left', (data) => {
      addSystemMessage(`A participant left the call`);
    });

    return () => {
      socket.off('video_call_message');
      socket.off('video_participant_joined');
      socket.off('video_participant_left');
    };
  }, [socket, currentUser.id, isOpen]);

  const addSystemMessage = (text) => {
    const systemMessage = {
      id: Date.now() + Math.random(),
      message: text,
      isSystem: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !socket) return;

    // Emit message to all participants in the video call
    socket.emit('video_call_message', {
      roomId,
      projectId,
      userId: currentUser.id,
      username: currentUser.username,
      message: messageInput.trim()
    });

    // Add to local state immediately
    const newMessage = {
      id: Date.now(),
      userId: currentUser.id,
      username: currentUser.username,
      message: messageInput.trim(),
      timestamp: new Date().toISOString(),
      isOwn: true
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={toggleChat}
        style={{
          position: 'relative',
          padding: '0',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: 'transparent',
          color: isOpen ? '#10b981' : '#3b82f6',
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
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        <MessageCircle size={28} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #0F1116'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          right: '20px',
          bottom: '100px',
          width: '350px',
          height: '500px',
          backgroundColor: 'rgba(26, 28, 32, 0.98)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={20} color="#3b82f6" />
              <h3 style={{ 
                margin: 0, 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'white' 
              }}>
                In-call messages
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#9ca3af'
              }}>
                <Users size={14} />
                <span>{participants.length + 1}</span>
              </div>
              <button
                onClick={toggleChat}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#9ca3af',
                textAlign: 'center',
                padding: '20px'
              }}>
                <MessageCircle size={40} style={{ opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Messages can only be seen by people in the call
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  if (msg.isSystem) {
                    return (
                      <div
                        key={msg.id}
                        style={{
                          textAlign: 'center',
                          fontSize: '12px',
                          color: '#9ca3af',
                          padding: '8px 0'
                        }}
                      >
                        {msg.message}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.isOwn ? 'flex-end' : 'flex-start',
                        gap: '4px'
                      }}
                    >
                      {!msg.isOwn && (
                        <span style={{
                          fontSize: '12px',
                          color: '#9ca3af',
                          fontWeight: '500'
                        }}>
                          {msg.username}
                        </span>
                      )}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '6px',
                        maxWidth: '80%',
                        flexDirection: msg.isOwn ? 'row-reverse' : 'row'
                      }}>
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          backgroundColor: msg.isOwn 
                            ? 'rgba(59, 130, 246, 0.2)' 
                            : 'rgba(255, 255, 255, 0.08)',
                          color: 'white',
                          fontSize: '14px',
                          lineHeight: '1.5',
                          wordBreak: 'break-word',
                          border: msg.isOwn
                            ? '1px solid rgba(59, 130, 246, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          {msg.message}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          flexShrink: 0
                        }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px'
            }}>
              <input
                ref={inputRef}
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Send a message to everyone"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                style={{
                  padding: '10px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: messageInput.trim() 
                    ? '#3b82f6' 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: messageInput.trim() ? 'white' : '#6b7280',
                  cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (messageInput.trim()) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (messageInput.trim()) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VideoCallChat;