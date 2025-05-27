import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useWebSocket = (token, currentUserId) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [error, setError] = useState(null);
    const [typingUsers, setTypingUsers] = useState(new Map()); // Track who's typing in which chat
    const currentChatId = useRef(null);
    const currentReceiverId = useRef(null);

    useEffect(() => {
        if (!token) return;

        console.log('Initializing WebSocket connection...');

        const socketInstance = io('http://localhost:5000', {
            auth: { token },
            transports: ['websocket', 'polling'],
            forceNew: true
        });

        socketInstance.on('connect', () => {
            console.log('Connected to server with socket ID:', socketInstance.id);
            setIsConnected(true);
            setError(null);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            setIsConnected(false);
            // Clear typing indicators on disconnect
            setTypingUsers(new Map());
        });

        socketInstance.on('connect_error', (err) => {
            console.error('Connection error:', err.message);
            setError(`Connection failed: ${err.message}`);
            setIsConnected(false);
        });

        // Handle chat history when joining a chat
        socketInstance.on('chat_history', (data) => {
            console.log('Received chat history:', data);
            setMessages(data.messages || []);
            currentChatId.current = data.chatId;
        });

        // Handle new incoming messages
        socketInstance.on('new_message', (message) => {
            console.log('Received new message:', message);
            
            setMessages(prev => {
                // Check if message already exists to prevent duplicates
                const messageExists = prev.some(msg => 
                    msg._id === message._id || 
                    (msg.message === message.message && 
                     msg.senderId === message.senderId &&
                     Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
                );

                if (messageExists) {
                    console.log('Message already exists, skipping duplicate');
                    return prev;
                }

                return [...prev, message];
            });

            // Clear typing indicator for the sender when message is received
            if (message.senderId !== currentUserId) {
                setTypingUsers(prev => {
                    const newTypingUsers = new Map(prev);
                    newTypingUsers.delete(message.senderId);
                    return newTypingUsers;
                });
            }
        });

        // Handle message notifications (for messages in other chats)
        socketInstance.on('message_notification', (notification) => {
            console.log('Received notification:', notification);
            setNotifications(prev => {
                // Avoid duplicate notifications
                const exists = prev.some(n => 
                    n.chatId === notification.chatId && 
                    n.senderId === notification.senderId &&
                    n.message === notification.message
                );
                
                if (exists) return prev;
                
                return [...prev, {
                    ...notification,
                    id: `notif_${Date.now()}_${Math.random()}` // Add unique ID
                }];
            });
        });

        // Handle typing indicators - Updated to match server implementation
        socketInstance.on('user_typing', (data) => {
            console.log(`User ${data.userName || data.userId} is ${data.isTyping ? 'typing' : 'stopped typing'}`);
            
            setTypingUsers(prev => {
                const newTypingUsers = new Map(prev);
                
                if (data.isTyping) {
                    newTypingUsers.set(data.userId, {
                        userName: data.userName,
                        timestamp: Date.now()
                    });
                } else {
                    newTypingUsers.delete(data.userId);
                }
                
                return newTypingUsers;
            });

            // Auto-clear typing indicator after 3 seconds of inactivity
            if (data.isTyping) {
                setTimeout(() => {
                    setTypingUsers(prev => {
                        const newTypingUsers = new Map(prev);
                        const user = newTypingUsers.get(data.userId);
                        // Only clear if no newer typing event occurred
                        if (user && Date.now() - user.timestamp >= 3000) {
                            newTypingUsers.delete(data.userId);
                        }
                        return newTypingUsers;
                    });
                }, 3000);
            }
        });

        // Handle messages read confirmation
        socketInstance.on('messages_read', (data) => {
            console.log(`Messages read by ${data.readBy} at ${data.readAt}`);
            
            // Update message read status in current chat
            setMessages(prev => prev.map(msg => {
                if (msg.receiverId === data.readBy && !msg.isRead) {
                    return { ...msg, isRead: true, readAt: data.readAt };
                }
                return msg;
            }));
        });

        // Handle general errors
        socketInstance.on('error', (error) => {
            console.error('Socket error:', error);
            setError(error.message || 'Socket error occurred');
        });

        setSocket(socketInstance);

        return () => {
            console.log('Cleaning up WebSocket connection');
            socketInstance.disconnect();
        };
    }, [token, currentUserId]);

    const joinChat = (receiverId) => {
        return new Promise((resolve, reject) => {
            if (!socket || !isConnected) {
                const error = 'Socket not connected';
                setError(error);
                reject(new Error(error));
                return;
            }

            console.log('Joining chat with:', receiverId);
            currentReceiverId.current = receiverId;
            
            // Clear previous messages, errors, and typing indicators
            setMessages([]);
            setError(null);
            setTypingUsers(new Map());

            // Use callback for acknowledgment - matches server implementation
            socket.emit('join_chat', { receiverId }, (response) => {
                if (response?.success) {
                    console.log('Successfully joined chat:', response.chatId);
                    currentChatId.current = response.chatId;
                    resolve(response);
                } else {
                    console.error('Failed to join chat:', response?.error);
                    setError(response?.error || 'Failed to join chat');
                    reject(new Error(response?.error || 'Failed to join chat'));
                }
            });

            // Timeout for join operation
            setTimeout(() => {
                reject(new Error('Join chat timeout'));
            }, 10000);
        });
    };

    const sendMessage = (receiverId, message, messageType = 'text') => {
        return new Promise((resolve, reject) => {
            if (!socket || !isConnected) {
                const error = 'Socket not connected';
                setError(error);
                reject(new Error(error));
                return;
            }

            if (!message.trim()) {
                reject(new Error('Message cannot be empty'));
                return;
            }

            console.log('Sending message:', { receiverId, message, messageType });

            // Create temporary message for immediate UI feedback
            const tempMessage = {
                _id: `temp_${Date.now()}`,
                senderId: currentUserId,
                receiverId: receiverId,
                message: message.trim(),
                messageType,
                createdAt: new Date().toISOString(),
                status: 'sending',
                senderName: 'You'
            };

            // Add temporary message to UI
            setMessages(prev => [...prev, tempMessage]);

            // Send message with callback - matches server parameters
            socket.emit('send_message', {
                receiverId,
                message: message.trim(),
                messageType
            }, (response) => {
                // Remove temporary message
                setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));

                if (response?.success) {
                    console.log('Message sent successfully:', response.message);
                    // The actual message will come through 'new_message' event
                    resolve(response.message);
                } else {
                    console.error('Failed to send message:', response?.error);
                    setError(response?.error || 'Failed to send message');
                    reject(new Error(response?.error || 'Failed to send message'));
                }
            });

            // Timeout handler
            setTimeout(() => {
                // Remove temp message on timeout
                setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
                reject(new Error('Message send timeout'));
            }, 10000);
        });
    };

    const markAsRead = (chatId) => {
        return new Promise((resolve, reject) => {
            if (!socket || !isConnected) {
                reject(new Error('Socket not connected'));
                return;
            }

            // Use the chatId parameter or current chat - matches server implementation
            const targetChatId = chatId || currentChatId.current;
            
            if (!targetChatId) {
                reject(new Error('No chat ID available'));
                return;
            }

            socket.emit('mark_read', { chatId: targetChatId }, (response) => {
                if (response?.success) {
                    resolve();
                } else {
                    reject(new Error(response?.error || 'Failed to mark as read'));
                }
            });
        });
    };

    const sendTyping = (receiverId, isTyping) => {
        if (socket && isConnected) {
            // Match server implementation exactly
            socket.emit('typing', { receiverId, isTyping });
        }
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const clearError = () => {
        setError(null);
    };

    const clearMessages = () => {
        setMessages([]);
        currentChatId.current = null;
        currentReceiverId.current = null;
        setTypingUsers(new Map());
    };

    const getCurrentChatId = () => {
        return currentChatId.current;
    };

    const getCurrentReceiverId = () => {
        return currentReceiverId.current;
    };

    const getTypingUsers = () => {
        return Array.from(typingUsers.entries()).map(([userId, data]) => ({
            userId,
            userName: data.userName
        }));
    };

    const removeNotification = (notificationId) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    return {
        socket,
        isConnected,
        messages,
        notifications,
        error,
        typingUsers: getTypingUsers(),
        joinChat,
        sendMessage,
        markAsRead,
        sendTyping,
        clearNotifications,
        clearError,
        clearMessages,
        getCurrentChatId,
        getCurrentReceiverId,
        removeNotification
    };
};