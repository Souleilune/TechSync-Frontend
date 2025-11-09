// frontend/src/components/chat/ChatInterface.js
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Reply, Edit3, Trash2, X } from 'lucide-react';

const ChatInterface = ({ projectId }) => {
  const { user } = useAuth();
  const {
    connected,
    chatRooms,
    messages,
    activeRoom,
    onlineUsers,
    typingUsers,
    loading,
    setActiveRoom,
    joinProjectRooms,
    sendMessage,
    editMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    fetchChatRooms,
    fetchMessages,
    createChatRoom
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomType, setNewRoomType] = useState('general');
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [typingTimer, setTypingTimer] = useState(null);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Helper function to safely get user display name
  const getUserDisplayName = (userObj) => {
    if (!userObj) return 'Unknown User';
    return userObj.full_name || userObj.username || 'Unknown User';
  };

  // Helper function to safely get user initial
  const getUserInitial = (userObj) => {
    if (!userObj) return '?';
    const displayName = getUserDisplayName(userObj);
    return displayName.charAt(0).toUpperCase();
  };

  // Initialize chat when component mounts
  useEffect(() => {
    if (projectId && connected) {
      console.log('🚀 Initializing chat for project:', projectId);
      joinProjectRooms(projectId);
      fetchChatRooms(projectId);
    }
  }, [projectId, connected, joinProjectRooms, fetchChatRooms]);

  // Load messages when active room changes
  useEffect(() => {
    if (activeRoom && projectId) {
      console.log('📨 Loading messages for room:', activeRoom);
      fetchMessages(projectId, activeRoom);
    }
  }, [activeRoom, projectId, fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeRoom]);

  // ✅ DEBUG: Log messages state when it changes
  useEffect(() => {
    console.log('🟢 Messages state updated:', messages);
    console.log('🟢 Active room:', activeRoom);
    if (activeRoom) {
      const currentRoomMessages = messages[activeRoom] || [];
      console.log(`🟢 Messages in active room (${activeRoom}):`, currentRoomMessages.length);
      currentRoomMessages.forEach((msg, idx) => {
        console.log(`  Message ${idx}:`, {
          id: msg.id,
          hasUser: !!msg.user,
          user: msg.user,
          content: msg.content?.substring(0, 30)
        });
      });
    }
  }, [messages, activeRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeRoom) return;

    console.log('📤 Sending message:', messageInput.substring(0, 50));

    if (editingMessage) {
      editMessage(editingMessage.id, messageInput);
      setEditingMessage(null);
    } else {
      // Send the message
      sendMessage(activeRoom, messageInput, 'text', replyingTo?.id);
      setReplyingTo(null);
      
      // Log activity
      try {
        const { projectService } = await import('../../services/projectService');
        await projectService.logActivity(projectId, {
          action: 'sent message',
          target: messageInput.length > 50 
            ? messageInput.substring(0, 50) + '...' 
            : messageInput,
          type: 'message_sent',
          metadata: { 
            roomId: activeRoom,
            roomName: activeRoomData?.name || 'Unknown Room'
          }
        });
        console.log('✅ Activity logged for message send');
      } catch (activityError) {
        console.error('Failed to log activity:', activityError);
      }
    }

    setMessageInput('');
    if (typingTimer) {
      clearTimeout(typingTimer);
      stopTyping(activeRoom);
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    if (activeRoom) {
      startTyping(activeRoom);
      
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
      
      setTypingTimer(setTimeout(() => {
        stopTyping(activeRoom);
      }, 1000));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      alert('Room name is required');
      return;
    }

    const room = await createChatRoom(projectId, newRoomName, newRoomDescription, newRoomType);
    if (room) {
      setShowCreateRoom(false);
      setNewRoomName('');
      setNewRoomDescription('');
      setNewRoomType('general');
      setActiveRoom(room.id);
    }
  };

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      const oneDay = 24 * 60 * 60 * 1000;

      if (diff < oneDay && date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diff < 7 * oneDay) {
        return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid date';
    }
  };

  const activeRoomData = chatRooms.find(room => room.id === activeRoom);
  const currentMessages = activeRoom ? (messages[activeRoom] || []) : [];
  const currentTypingUsers = activeRoom ? (typingUsers[activeRoom] || {}) : {};

  // ✅ DEBUG: Log current messages before rendering
  console.log('🎨 Rendering ChatInterface');
  console.log('🎨 Current messages count:', currentMessages.length);

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes globalLogoRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .global-loading-spinner {
            animation: globalLogoRotate 2s linear infinite;
          }
        `}</style>
        
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          minHeight: '400px',
          fontSize: '18px',
          color: '#9ca3af'}}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px' 
          }}>
            <div className="global-loading-spinner" style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/images/logo/TechSyncLogo.png" 
                alt="TechSync Logo" 
                style={{
                  width: '125%',
                  height: '125%',
                  objectFit: 'contain'
                }}
              />
            </div>
            <span style={{ color: '#9ca3af', fontSize: '18px' }}>Loading chat...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      backgroundColor: '#0F1116', 
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Sidebar - Chat Rooms */}
      <div style={{ 
        width: '320px', 
        borderRight: '1px solid rgba(255, 255, 255, 0.1)', 
        display: 'flex', 
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: 'rgba(26, 28, 32, 0.95)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white', margin: 0 }}>Project Chat</h2>
            <button
              onClick={() => setShowCreateRoom(true)}
              style={{ 
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              +
            </button>
          </div>
          
          {/* Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', gap: '8px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: connected ? '#10b981' : '#ef4444'
            }}></div>
            <span style={{ color: connected ? '#10b981' : '#ef4444' }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Room List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chatRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              style={{
                width: '100%',
                padding: '16px 20px',
                textAlign: 'left',
                backgroundColor: activeRoom === room.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: 'none',
                borderLeft: activeRoom === room.id ? '4px solid #3b82f6' : '4px solid transparent',
                cursor: 'pointer',
                color: activeRoom === room.id ? '#60a5fa' : '#d1d5db',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span>#</span>
                <span style={{ fontWeight: '500' }}>{room.name}</span>
              </div>
              {room.description && (
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, paddingLeft: '20px' }}>
                  {room.description}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Online Users */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '12px' }}>
            Online ({onlineUsers.length})
          </div>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {onlineUsers.map((onlineUser) => (
              <div key={onlineUser.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: '#10b981'
                }}></div>
                <span>{getUserDisplayName(onlineUser)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden'
      }}>
        {activeRoomData ? (
          <>
            {/* Chat Header */}
            <div style={{ 
              padding: '20px', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(26, 28, 32, 0.95)',
              backdropFilter: 'blur(20px)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', margin: 0 }}>
                # {activeRoomData.name}
              </h3>
              {activeRoomData.description && (
                <p style={{ fontSize: '14px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                  {activeRoomData.description}
                </p>
              )}
            </div>

            {/* Messages Area */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '16px',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              {/* Messages Container */}
              <div style={{ flex: 1, paddingBottom: '16px' }}>
                {currentMessages.length === 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%', 
                    color: '#9ca3af',
                    fontSize: '14px'
                  }}>
                    No messages yet. Start the conversation!
                  </div>
                )}
                
                {currentMessages.map((message, index) => {
                  // ✅ DEBUG: Log each message before processing
                  console.log(`🟡 Processing message ${index}:`, {
                    id: message.id,
                    hasUser: !!message.user,
                    hasUsers: !!message.users, // Check alternative field name
                    user: message.user,
                    users: message.users,
                    user_id: message.user_id,
                    content: message.content?.substring(0, 30)
                  });

                  // ✅ FIX: Handle both 'user' and 'users' field names (Supabase can return either)
                  const messageUser = message.user || message.users;

                  if (!message || !messageUser) {
                    console.warn('❌ Message filtered out - missing user:', message);
                    // ✅ FIX: Try to display the message anyway with fallback user info
                    if (message && message.content) {
                      const fallbackUser = {
                        id: message.user_id,
                        username: 'Unknown',
                        full_name: 'Unknown User'
                      };
                      console.log('⚠️ Using fallback user for message:', message.id);
                      
                      const isOwnMessage = user && message.user_id === user.id;

                      return (
                        <div 
                          key={message.id || index} 
                          style={{ 
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                            width: '100%'
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '4px', 
                            maxWidth: '70%',
                            alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              gap: '8px', 
                              alignItems: 'center',
                              justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
                            }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#d1d5db' }}>
                                {isOwnMessage ? 'You' : getUserDisplayName(fallbackUser)}
                              </span>
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                {formatTime(message.created_at)}
                              </span>
                            </div>
                            
                            <div style={{
                              padding: '10px 14px',
                              borderRadius: '16px',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap',
                              backgroundColor: isOwnMessage ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                              color: 'white',
                              borderBottomRightRadius: isOwnMessage ? '6px' : '16px',
                              borderBottomLeftRadius: isOwnMessage ? '16px' : '6px',
                            }}>
                              {message.content}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }

                  const isOwnMessage = user && messageUser && messageUser.id === user.id;

                  return (
                    <div 
                      key={message.id} 
                      style={{ 
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        const actions = e.currentTarget.querySelector('.message-actions');
                        if (actions) actions.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        const actions = e.currentTarget.querySelector('.message-actions');
                        if (actions) actions.style.opacity = '0';
                      }}
                    >
                      {/* Reply indicator */}
                      {message.reply_to && (
                        <div style={{ 
                          marginBottom: '8px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          maxWidth: '300px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                          color: '#93c5fd',
                          alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                          width: 'fit-content'
                        }}>
                          <div style={{ 
                            marginBottom: '4px', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Reply size={14} />
                            {isOwnMessage ? 'You' : getUserDisplayName(messageUser)} replied to {getUserDisplayName(message.reply_to.user || message.reply_to.users)}
                          </div>
                          <div style={{ opacity: 0.8 }}>
                            {message.reply_to.content}
                          </div>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px', 
                        maxWidth: '70%',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          alignItems: 'center',
                          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#d1d5db' }}>
                            {isOwnMessage ? 'You' : getUserDisplayName(messageUser)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                            {formatTime(message.created_at)}
                          </span>
                          {message.is_edited && (
                            <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>(edited)</span>
                          )}
                        </div>
                        
                        <div style={{ position: 'relative', display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: '16px',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            backgroundColor: isOwnMessage ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            borderBottomRightRadius: isOwnMessage ? '6px' : '16px',
                            borderBottomLeftRadius: isOwnMessage ? '16px' : '6px',
                            width: 'fit-content',
                            maxWidth: '100%'
                          }}>
                            {message.content || 'Message content unavailable'}
                          </div>
                          
                          {/* Message Actions */}
                          {isOwnMessage && (
                            <div 
                              className="message-actions" 
                              style={{
                                position: 'absolute',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                right: '-100px',
                                display: 'flex',
                                gap: '8px',
                                opacity: 0,
                                transition: 'opacity 0.2s ease'
                              }}
                            >
                              <button
                                onClick={() => {
                                  setEditingMessage(message);
                                  setMessageInput(message.content);
                                  messageInputRef.current?.focus();
                                }}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: '#9ca3af',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this message?')) {
                                    deleteMessage(message.id);
                                  }
                                }}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#ef4444',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}

                          {/* Reply button for all messages */}
                          {!isOwnMessage && (
                            <div 
                              className="message-actions" 
                              style={{
                                position: 'absolute',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                left: '-80px',
                                opacity: 0,
                                transition: 'opacity 0.2s ease'
                              }}
                            >
                              <button
                                onClick={() => setReplyingTo(message)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  color: '#9ca3af',
                                  padding: '8px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Reply size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {Object.keys(currentTypingUsers).length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    color: '#9ca3af', 
                    fontSize: '14px', 
                    padding: '8px 0',
                    fontStyle: 'italic'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '4px' 
                    }}>
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: '#9ca3af',
                        animation: 'bounce 1.4s infinite ease-in-out'
                      }}></div>
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: '#9ca3af',
                        animation: 'bounce 1.4s infinite ease-in-out 0.2s'
                      }}></div>
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: '#9ca3af',
                        animation: 'bounce 1.4s infinite ease-in-out 0.4s'
                      }}></div>
                    </div>
                    <span>
                      {Object.values(currentTypingUsers).join(', ')} {Object.keys(currentTypingUsers).length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}
              </div>
              
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Banner */}
            {replyingTo && replyingTo.user && (
              <div style={{ 
                padding: '12px 20px', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderTop: '1px solid rgba(59, 130, 246, 0.2)',
                borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#60a5fa', fontWeight: '600', marginBottom: '6px' }}>
                    Replying to {getUserDisplayName(replyingTo.user)}
                  </div>
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    borderLeft: '3px solid #3b82f6',
                    fontSize: '13px',
                    color: '#d1d5db',
                    fontStyle: 'italic',
                    lineHeight: '1.4',
                    maxHeight: '60px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    "{replyingTo.content || 'Message content unavailable'}"
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#9ca3af',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Edit Banner */}
            {editingMessage && (
              <div style={{ 
                padding: '12px 20px',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                borderTop: '1px solid rgba(251, 191, 36, 0.2)',
                borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '14px', color: '#fbbf24' }}>
                  Editing message
                </div>
                <button
                  onClick={() => {
                    setEditingMessage(null);
                    setMessageInput('');
                  }}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#9ca3af',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Message Input */}
            <div style={{ 
              padding: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(26, 28, 32, 0.95)',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <textarea
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message #${activeRoomData.name}`}
                  disabled={!connected}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    fontSize: '14px',
                    resize: 'none',
                    minHeight: '44px',
                    maxHeight: '120px',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !connected}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: messageInput.trim() && connected ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                    color: messageInput.trim() && connected ? 'white' : '#6b7280',
                    cursor: messageInput.trim() && connected ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    minWidth: '44px',
                    height: '44px'
                  }}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#9ca3af',
            fontSize: '16px'
          }}>
            Select a chat room to start messaging
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1c20',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: '20px' }}>
              Create New Room
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                Room Name *
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
                placeholder="e.g., general, development, announcements"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                Description
              </label>
              <textarea
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                placeholder="Brief description of this room's purpose"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                Room Type
              </label>
              <select
                value={newRoomType}
                onChange={(e) => setNewRoomType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="general">General</option>
                <option value="development">Development</option>
                <option value="announcements">Announcements</option>
                <option value="random">Random</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomName('');
                  setNewRoomDescription('');
                  setNewRoomType('general');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#d1d5db',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;