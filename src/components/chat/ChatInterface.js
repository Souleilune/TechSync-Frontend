// frontend/src/components/chat/ChatInterface.js - DIAGNOSTIC VERSION
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
      console.log('🔧 ChatInterface: Initializing for projectId:', projectId);
      joinProjectRooms(projectId);
      fetchChatRooms(projectId);
    }
  }, [projectId, connected, joinProjectRooms, fetchChatRooms]);

  // Load messages when active room changes
  useEffect(() => {
    if (activeRoom && projectId) {
      console.log('🔧 ChatInterface: Loading messages for activeRoom:', activeRoom);
      fetchMessages(projectId, activeRoom);
    }
  }, [activeRoom, projectId, fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeRoom]);

  // DEBUG: Log messages state changes
  useEffect(() => {
    console.log('🔧 ChatInterface: messages state changed:', {
      activeRoom,
      messageCount: activeRoom ? (messages[activeRoom]?.length || 0) : 0,
      allMessagesKeys: Object.keys(messages),
      messagesForActiveRoom: messages[activeRoom]
    });
  }, [messages, activeRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    console.log('🔧 ChatInterface: handleSendMessage called', {
      messageInput: messageInput.substring(0, 50),
      activeRoom,
      editingMessage: !!editingMessage
    });

    if (!messageInput.trim() || !activeRoom) {
      console.warn('🔧 ChatInterface: Cannot send - empty message or no active room');
      return;
    }

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

  // DEBUG: Log what we're about to render
  console.log('🔧 ChatInterface: About to render', {
    activeRoom,
    activeRoomData: activeRoomData?.name,
    currentMessagesLength: currentMessages.length,
    currentMessages: currentMessages.map(m => ({
      id: m.id,
      content: m.content?.substring(0, 30),
      hasUser: !!m.user,
      user: m.user,
      userKeys: m.user ? Object.keys(m.user) : []
    }))
  });

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex',
      backgroundColor: '#0F1116',
      color: 'white'
    }}>
      {/* DIAGNOSTIC INFO PANEL */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#00ff00',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '11px',
        zIndex: 9999,
        maxWidth: '300px',
        fontFamily: 'monospace'
      }}>
        <div><strong>🔧 CHAT DIAGNOSTIC</strong></div>
        <div>Connected: {connected ? '✅' : '❌'}</div>
        <div>Active Room: {activeRoom ? '✅' : '❌'} ({activeRoom?.substring(0, 8)})</div>
        <div>Messages in State: {Object.keys(messages).length} rooms</div>
        <div>Current Room Messages: {currentMessages.length}</div>
        <div>Chat Rooms: {chatRooms.length}</div>
        <div>Loading: {loading ? '⏳' : '✅'}</div>
        {currentMessages.length > 0 && (
          <>
            <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
              <strong>Last Message:</strong>
            </div>
            <div>ID: {currentMessages[currentMessages.length - 1]?.id?.substring(0, 8)}</div>
            <div>Has User: {currentMessages[currentMessages.length - 1]?.user ? '✅' : '❌'}</div>
            <div>User ID: {currentMessages[currentMessages.length - 1]?.user?.id?.substring(0, 8) || 'MISSING'}</div>
            <div>Username: {currentMessages[currentMessages.length - 1]?.user?.username || 'MISSING'}</div>
          </>
        )}
      </div>

      {/* Room Sidebar */}
      <div style={{
        width: '250px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Chat Rooms</h3>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chatRooms.map(room => (
            <div
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                backgroundColor: activeRoom === room.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                borderLeft: activeRoom === room.id ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{room.name}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{room.room_type}</div>
            </div>
          ))}
        </div>
        
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => setShowCreateRoom(true)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            + New Room
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeRoom && activeRoomData ? (
          <>
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
                {currentMessages.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    color: '#9ca3af'
                  }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  currentMessages.map((message, index) => {
                    console.log(`🔧 ChatInterface: Rendering message ${index}:`, {
                      id: message.id,
                      hasUser: !!message.user,
                      user: message.user,
                      content: message.content?.substring(0, 30)
                    });

                    if (!message || !message.user) {
                      console.warn('🔧 ChatInterface: Message or user is undefined:', message);
                      return (
                        <div key={message?.id || index} style={{
                          padding: '12px',
                          margin: '8px 0',
                          backgroundColor: 'rgba(255, 0, 0, 0.1)',
                          border: '1px solid rgba(255, 0, 0, 0.3)',
                          borderRadius: '8px',
                          color: '#ff6b6b',
                          fontFamily: 'monospace',
                          fontSize: '12px'
                        }}>
                          ⚠️ RENDER ERROR: message.user is {message?.user === undefined ? 'undefined' : 'null'}
                          <br />
                          Message ID: {message?.id}
                          <br />
                          User ID from message: {message?.user_id}
                          <br />
                          Content: {message?.content?.substring(0, 50)}
                        </div>
                      );
                    }

                    const isOwnMessage = user && message.user && message.user.id === user.id;

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
                      >
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          maxWidth: '70%'
                        }}>
                          {/* Avatar */}
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            backgroundColor: '#3b82f6', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            flexShrink: 0
                          }}>
                            {getUserInitial(message.user)}
                          </div>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              marginBottom: '4px',
                              justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
                            }}>
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#d1d5db' }}>
                                {isOwnMessage ? 'You' : getUserDisplayName(message.user)}
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
                              borderBottomLeftRadius: isOwnMessage ? '16px' : '6px'
                            }}>
                              {message.content || 'Message content unavailable'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ 
              padding: '16px', 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  ref={messageInputRef}
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    color: 'white',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: messageInput.trim() ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '24px',
                    cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '600'
                  }}
                >
                  <Send size={16} />
                  Send
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
            color: '#9ca3af'
          }}>
            Select a room to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;