// frontend/src/components/FriendsChat.js
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Users, Search, Clock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

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

    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('✅ Friends chat socket connected');
      console.log('✅ Socket ID:', socketInstance.id);
      socketInstance.emit('join_friends_chat');
    });

    socketInstance.on('friend_message', (data) => {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      
    });

    socketInstance.on('friend_online', (data) => {
      setOnlineFriends(prev => new Set([...prev, data.userId]));
    });

    socketInstance.on('friend_offline', (data) => {
      setOnlineFriends(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socketInstance.on('online_friends_list', (data) => {
      setOnlineFriends(new Set(data.onlineFriends));
    });

    socketInstance.on('error', (data) => {
      console.error('❌ Socket error:', data.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

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
      const response = await axios.get(`${API_URL}/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setFriends(response.data.data.friends || []);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/friends/${friendId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setMessages(response.data.data || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedFriend || !socket) return;

    console.log('🔴 EMIT - Socket ID:', socket.id);  // ADD THIS


    console.log('🔴 ABOUT TO EMIT');
    console.log('🔴 Socket:', socket);
    console.log('🔴 Socket.io:', socket.io);  
    console.log('🔴 Socket connected:', socket.connected);
    console.log('🔴 Socket ID:', socket.id);

  const messageData = {
    recipientId: selectedFriend.id,
    content: messageInput.trim()
  };

  socket.emit('send_friend_message', messageData);
  console.log('🔴 EMIT COMPLETED');

    
    
    const newMessage = {
      id: Date.now().toString(),
      sender_id: user.id,
      recipient_id: selectedFriend.id,
      content: messageInput.trim(),
      created_at: new Date().toISOString(),
      read: false
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      transition: 'all 0.3s ease'
    },
    chatWindow: {
      position: 'fixed',
      bottom: '100px',
      right: '24px',
      width: '400px',
      height: '600px',
      backgroundColor: '#1a1c20',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden'
    },
    header: {
      padding: '16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#1f2937'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    closeButton: {
      background: 'transparent',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      transition: 'all 0.3s ease'
    },
    content: {
      display: 'flex',
      height: 'calc(100% - 60px)',
      overflow: 'hidden'
    },
    friendsList: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column'
    },
    searchBar: {
      padding: '12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    },
    searchInput: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      outline: 'none'
    },
    friendsListScroll: {
      flex: 1,
      overflowY: 'auto'
    },
    friendItem: {
      padding: '12px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '16px',
      position: 'relative',
      flexShrink: 0
    },
    onlineIndicator: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: '12px',
      height: '12px',
      backgroundColor: '#22c55e',
      border: '2px solid #1a1c20',
      borderRadius: '50%'
    },
    friendInfo: {
      flex: 1,
      minWidth: 0
    },
    friendName: {
      color: 'white',
      fontSize: '14px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    friendStatus: {
      color: '#9ca3af',
      fontSize: '12px',
      marginTop: '2px'
    },
    chatArea: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column'
    },
    chatHeader: {
      padding: '12px 16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: '#1f2937'
    },
    backButton: {
      background: 'transparent',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      fontSize: '20px'
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      backgroundColor: '#151619'
    },
    message: {
      maxWidth: '70%',
      padding: '10px 14px',
      borderRadius: '12px',
      fontSize: '14px',
      wordWrap: 'break-word',
      lineHeight: '1.4'
    },
    myMessage: {
      alignSelf: 'flex-end',
      backgroundColor: '#3b82f6',
      color: 'white',
      borderBottomRightRadius: '4px'
    },
    theirMessage: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      color: 'white',
      borderBottomLeftRadius: '4px'
    },
    messageTime: {
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.5)',
      marginTop: '4px'
    },
    inputArea: {
      padding: '12px 16px',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      gap: '8px',
      backgroundColor: '#1a1c20'
    },
    input: {
      flex: 1,
      padding: '10px 12px',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      outline: 'none'
    },
    sendButton: {
      padding: '10px 16px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center'
    },
    emptyState: {
      textAlign: 'center',
      color: '#9ca3af',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%'
    }
  };

  return (
    <>
      <button
        style={styles.chatButton}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.backgroundColor = '#2563eb';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.backgroundColor = '#3b82f6';
        }}
      >
        <MessageCircle size={26} />
      </button>

      {isOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.header}>
            <div style={styles.title}>
              <Users size={20} />
              Friends Chat
            </div>
            <button
              style={styles.closeButton}
              onClick={() => setIsOpen(false)}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#9ca3af';
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={styles.content}>
            {!selectedFriend ? (
              <div style={styles.friendsList}>
                <div style={styles.searchBar}>
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                
                <div style={styles.friendsListScroll}>
                  {loading ? (
                    <div style={styles.emptyState}>
                      <Clock size={40} />
                      <div style={{ marginTop: '12px' }}>Loading...</div>
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <div style={styles.emptyState}>
                      <Users size={40} />
                      <div style={{ marginTop: '12px' }}>No friends yet</div>
                    </div>
                  ) : (
                    filteredFriends.map(friend => (
                      <div
                        key={friend.id}
                        style={styles.friendItem}
                        onClick={() => setSelectedFriend(friend)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={styles.avatar}>
                          {friend.avatar_url ? (
                            <img 
                              src={friend.avatar_url} 
                              alt={friend.full_name}
                              style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                            />
                          ) : (
                            (friend.full_name || friend.username).charAt(0).toUpperCase()
                          )}
                          {onlineFriends.has(friend.id) && (
                            <div style={styles.onlineIndicator} />
                          )}
                        </div>
                        <div style={styles.friendInfo}>
                          <div style={styles.friendName}>
                            {friend.full_name || friend.username}
                          </div>
                          <div style={styles.friendStatus}>
                            {onlineFriends.has(friend.id) ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                  <div style={styles.avatar}>
                    {selectedFriend.avatar_url ? (
                      <img 
                        src={selectedFriend.avatar_url} 
                        alt={selectedFriend.full_name}
                        style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                      />
                    ) : (
                      (selectedFriend.full_name || selectedFriend.username).charAt(0).toUpperCase()
                    )}
                    {onlineFriends.has(selectedFriend.id) && (
                      <div style={styles.onlineIndicator} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '15px', fontWeight: '600' }}>
                      {selectedFriend.full_name || selectedFriend.username}
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                      {onlineFriends.has(selectedFriend.id) ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>

                <div style={styles.messagesArea}>
                  {messages.length === 0 ? (
                    <div style={styles.emptyState}>
                      <MessageCircle size={40} />
                      <div style={{ marginTop: '12px' }}>No messages yet</div>
                    </div>
                  ) : (
                    messages.map(message => {
                      const isMyMessage = message.sender_id === user.id;
                      return (
                        <div
                          key={message.id}
                          style={{
                            ...styles.message,
                            ...(isMyMessage ? styles.myMessage : styles.theirMessage)
                          }}
                        >
                          <div>{message.content}</div>
                          <div style={styles.messageTime}>
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div style={styles.inputArea}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && messageInput.trim()) {
                        sendMessage();
                      }
                    }}
                    style={styles.input}
                  />
                  <button
                    onClick={sendMessage}
                    style={styles.sendButton}
                    disabled={!messageInput.trim()}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FriendsChat;