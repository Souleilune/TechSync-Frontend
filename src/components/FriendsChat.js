// frontend/src/components/FriendsChat.js
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Users, Search, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

// ✅ FIX: Properly construct API and Socket URLs for production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// Remove /api suffix to get base URL for socket connection
const SOCKET_URL = process.env.REACT_APP_API_URL 
  ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') 
  : 'http://localhost:5000';

console.log('🔧 FriendsChat URLs:', { API_URL, SOCKET_URL }); // Debug log

const FriendsChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState(null);
  const [onlineFriends, setOnlineFriends] = useState(new Set());
  const messagesEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    console.log('🔌 Initializing socket connection to:', SOCKET_URL);

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('✅ Friends chat socket connected to:', SOCKET_URL);
      console.log('✅ Socket ID:', socketInstance.id);
      socketInstance.emit('join_friends_chat');
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socketInstance.on('friend_message', (data) => {
      console.log('📨 Received friend_message:', data);
      if (selectedFriend && data.senderId === selectedFriend.id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
    });

    socketInstance.on('friend_message_sent', (data) => {
      console.log('✅ Message sent confirmation:', data);
      // Message already added optimistically, just update with DB data
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== 'temp-' + data.message.id);
        return [...withoutTemp, data.message];
      });
      scrollToBottom();
    });

    socketInstance.on('friend_online', (data) => {
      console.log('🟢 Friend online:', data);
      setOnlineFriends(prev => new Set([...prev, data.userId]));
    });

    socketInstance.on('friend_offline', (data) => {
      console.log('⚫ Friend offline:', data);
      setOnlineFriends(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socketInstance.on('online_friends_list', (data) => {
      console.log('📋 Online friends list:', data);
      setOnlineFriends(new Set(data.onlineFriends));
    });

    socketInstance.on('error', (data) => {
      console.error('❌ Socket error:', data.message);
      alert('Error: ' + data.message);
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 Disconnecting socket');
      socketInstance.disconnect();
    };
  }, [user]); // Removed selectedFriend from dependencies to prevent reconnections

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
    }
  }, [selectedFriend]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('📞 Fetching friends from:', `${API_URL}/friends`);
      const response = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log('✅ Friends fetched:', response.data.data.friends?.length);
        setFriends(response.data.data.friends || []);
      }
    } catch (err) {
      console.error('❌ Error fetching friends:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('📞 Fetching messages from:', `${API_URL}/friends/${friendId}/messages`);
      const response = await axios.get(`${API_URL}/friends/${friendId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log('✅ Messages fetched:', response.data.data?.length);
        setMessages(response.data.data || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('❌ Error fetching messages:', err.response?.data || err.message);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedFriend || !socket) {
      console.log('⚠️ Cannot send message:', { 
        hasInput: !!messageInput.trim(), 
        hasFriend: !!selectedFriend, 
        hasSocket: !!socket 
      });
      return;
    }

    const tempId = 'temp-' + Date.now();
    const messageData = {
      recipientId: selectedFriend.id,
      content: messageInput.trim()
    };

    console.log('📤 Sending message via socket:', messageData);
    socket.emit('send_friend_message', messageData);
    
    // Add optimistic message
    const optimisticMessage = {
      id: tempId,
      sender_id: user.id,
      recipient_id: selectedFriend.id,
      content: messageInput.trim(),
      created_at: new Date().toISOString(),
      read: false
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    scrollToBottom();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };

  const filteredFriends = friends.filter(friend =>
    (friend.full_name || friend.username || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const styles = {
    chatButton: {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: '#10b981',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
      transition: 'all 0.3s ease',
      zIndex: 1000
    },
    chatWindow: {
      position: 'fixed',
      bottom: '100px',
      right: '24px',
      width: '400px',
      height: '600px',
      backgroundColor: '#1f2937',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden'
    },
    header: {
      backgroundColor: '#111827',
      padding: '16px',
      borderTopLeftRadius: '12px',
      borderTopRightRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #374151'
    },
    headerTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#f3f4f6',
      fontSize: '16px',
      fontWeight: '600'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      transition: 'color 0.2s'
    },
    searchContainer: {
      padding: '12px 16px',
      borderBottom: '1px solid #374151'
    },
    searchInput: {
      width: '100%',
      padding: '8px 12px 8px 36px',
      backgroundColor: '#374151',
      border: '1px solid #4b5563',
      borderRadius: '8px',
      color: '#f3f4f6',
      fontSize: '14px',
      outline: 'none'
    },
    searchIcon: {
      position: 'absolute',
      left: '28px',
      top: '22px',
      color: '#9ca3af'
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: selectedFriend ? 'column' : 'row',
      overflow: 'hidden'
    },
    friendsList: {
      flex: 1,
      overflowY: 'auto',
      padding: '8px'
    },
    friendItem: {
      padding: '12px',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    friendAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#4b5563',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f3f4f6',
      fontWeight: '600',
      position: 'relative'
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: '0',
      right: '0',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: '#10b981',
      border: '2px solid #1f2937'
    },
    friendInfo: {
      flex: 1
    },
    friendName: {
      color: '#f3f4f6',
      fontSize: '14px',
      fontWeight: '500'
    },
    friendUsername: {
      color: '#9ca3af',
      fontSize: '12px'
    },
    chatArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    chatHeader: {
      padding: '12px 16px',
      borderBottom: '1px solid #374151',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center'
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    messageGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    message: {
      maxWidth: '80%',
      padding: '8px 12px',
      borderRadius: '12px',
      fontSize: '14px',
      wordWrap: 'break-word'
    },
    myMessage: {
      alignSelf: 'flex-end',
      backgroundColor: '#10b981',
      color: '#fff'
    },
    theirMessage: {
      alignSelf: 'flex-start',
      backgroundColor: '#374151',
      color: '#f3f4f6'
    },
    timestamp: {
      fontSize: '11px',
      color: '#9ca3af',
      marginTop: '2px'
    },
    inputContainer: {
      padding: '12px 16px',
      borderTop: '1px solid #374151',
      display: 'flex',
      gap: '8px'
    },
    messageInput: {
      flex: 1,
      padding: '10px 12px',
      backgroundColor: '#374151',
      border: '1px solid #4b5563',
      borderRadius: '8px',
      color: '#f3f4f6',
      fontSize: '14px',
      outline: 'none',
      resize: 'none'
    },
    sendButton: {
      padding: '10px 16px',
      backgroundColor: '#10b981',
      border: 'none',
      borderRadius: '8px',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.2s'
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#9ca3af',
      gap: '12px'
    }
  };

  if (!isOpen) {
    return (
      <button
        style={styles.chatButton}
        onClick={() => setIsOpen(true)}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageCircle size={28} color="#fff" />
      </button>
    );
  }

  return (
    <div style={styles.chatWindow}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Users size={20} />
          <span>Friends Chat</span>
        </div>
        <button
          style={styles.closeButton}
          onClick={() => setIsOpen(false)}
          onMouseOver={(e) => e.currentTarget.style.color = '#f3f4f6'}
          onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
        >
          <X size={20} />
        </button>
      </div>

      {!selectedFriend && (
        <div style={styles.searchContainer}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>
      )}

      <div style={styles.content}>
        {!selectedFriend ? (
          <div style={styles.friendsList}>
            {loading ? (
              <div style={styles.emptyState}>Loading friends...</div>
            ) : filteredFriends.length === 0 ? (
              <div style={styles.emptyState}>
                <Users size={48} />
                <p>No friends found</p>
              </div>
            ) : (
              filteredFriends.map(friend => (
                <div
                  key={friend.id}
                  style={styles.friendItem}
                  onClick={() => setSelectedFriend(friend)}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={styles.friendAvatar}>
                    {friend.avatar_url ? (
                      <img 
                        src={friend.avatar_url} 
                        alt={friend.full_name}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      (friend.full_name || friend.username || 'U')[0].toUpperCase()
                    )}
                    {onlineFriends.has(friend.id) && (
                      <div style={styles.onlineIndicator} />
                    )}
                  </div>
                  <div style={styles.friendInfo}>
                    <div style={styles.friendName}>
                      {friend.full_name || friend.username}
                    </div>
                    <div style={styles.friendUsername}>
                      @{friend.username}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={styles.chatArea}>
            <div style={styles.chatHeader}>
              <button
                style={styles.backButton}
                onClick={() => setSelectedFriend(null)}
              >
                ←
              </button>
              <div style={styles.friendAvatar}>
                {selectedFriend.avatar_url ? (
                  <img 
                    src={selectedFriend.avatar_url} 
                    alt={selectedFriend.full_name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  (selectedFriend.full_name || selectedFriend.username || 'U')[0].toUpperCase()
                )}
                {onlineFriends.has(selectedFriend.id) && (
                  <div style={styles.onlineIndicator} />
                )}
              </div>
              <div style={styles.friendInfo}>
                <div style={styles.friendName}>
                  {selectedFriend.full_name || selectedFriend.username}
                </div>
                <div style={styles.friendUsername}>
                  {onlineFriends.has(selectedFriend.id) ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>

            <div style={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div style={styles.emptyState}>
                  <MessageCircle size={48} />
                  <p>No messages yet</p>
                  <p style={{ fontSize: '12px' }}>Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isMyMessage = message.sender_id === user.id;
                  return (
                    <div
                      key={message.id}
                      style={{
                        ...styles.messageGroup,
                        alignItems: isMyMessage ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          ...styles.message,
                          ...(isMyMessage ? styles.myMessage : styles.theirMessage)
                        }}
                      >
                        {message.content}
                      </div>
                      <div 
                        style={{
                          ...styles.timestamp,
                          textAlign: isMyMessage ? 'right' : 'left'
                        }}
                      >
                        {formatTimestamp(message.created_at)}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputContainer}>
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                style={styles.messageInput}
                rows={1}
              />
              <button
                onClick={sendMessage}
                style={styles.sendButton}
                disabled={!messageInput.trim()}
                onMouseOver={(e) => !messageInput.trim() ? null : e.currentTarget.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsChat;