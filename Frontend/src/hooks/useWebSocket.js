import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useWebSocket = (token) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const currentChatId = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socketInstance = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'] // Add fallback transport
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setError(null); // Clear any previous errors
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Connection failed');
      setIsConnected(false);
    });

    socketInstance.on('chat_history', (data) => {
      setMessages(data.messages);
    });

    socketInstance.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socketInstance.on('message_notification', (notification) => {
      setNotifications(prev => [...prev, notification]);
    });

    socketInstance.on('user_typing', (data) => {
      // Handle typing indicator
      console.log(`User ${data.userId} is ${data.isTyping ? 'typing' : 'stopped typing'}`);
    });

    socketInstance.on('messages_read', (data) => {
      // Handle read receipts
      console.log(`Messages read by ${data.readBy} at ${data.readAt}`);
    });

    // Handle message sending success
    socketInstance.on('message_sent', (data) => {
      console.log('Message sent successfully:', data);
      // Optionally update the message with server-generated ID
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastMessage = updatedMessages[updatedMessages.length - 1];
        if (lastMessage && !lastMessage._id) {
          lastMessage._id = data._id;
          lastMessage.createdAt = data.createdAt;
        }
        return updatedMessages;
      });
    });

    // Handle message sending errors
    socketInstance.on('message_error', (error) => {
      console.error('Message error:', error);
      setError(error.message || 'Failed to send message');
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'Socket error occurred');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  const joinChat = (receiverId) => {
    if (socket && isConnected) {
      currentChatId.current = receiverId;
      socket.emit('join_chat', { receiverId });
      setMessages([]); // Clear previous messages
      setError(null); // Clear any previous errors
    }
  };

  const sendMessage = (receiverId, message, messageType = 'text') => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        const error = 'Socket not connected';
        setError(error);
        reject(new Error(error));
        return;
      }

      // Add temporary message to UI immediately for better UX
      const tempMessage = {
        _id: `temp_${Date.now()}`,
        sender: 'current_user', // You might want to pass the current user ID
        receiver: receiverId,
        message,
        messageType,
        createdAt: new Date().toISOString(),
        status: 'sending'
      };
      
      setMessages(prev => [...prev, tempMessage]);

      // Set up one-time listeners for this specific message
      const handleSuccess = (data) => {
        // Remove temp message and add real one
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        resolve(data);
      };

      const handleError = (error) => {
        // Remove temp message on error
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        setError(error.message || 'Failed to send message');
        reject(new Error(error.message || 'Failed to send message'));
      };

      // Listen for success/error for this specific message
      socket.once('message_sent', handleSuccess);
      socket.once('message_error', handleError);

      // Send the message
      socket.emit('send_message', {
        receiverId,
        message,
        messageType
      });

      // Set a timeout to handle cases where server doesn't respond
      setTimeout(() => {
        socket.off('message_sent', handleSuccess);
        socket.off('message_error', handleError);
        
        // Check if message is still in sending state
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg._id === tempMessage._id 
              ? { ...msg, status: 'failed' }
              : msg
          );
          return updated;
        });
        
        if (!socket.connected) {
          reject(new Error('Connection lost'));
        }
      }, 10000); // 10 second timeout
    });
  };

  const markAsRead = (chatId) => {
    if (socket && isConnected) {
      socket.emit('mark_read', { chatId });
    }
  };

  const sendTyping = (receiverId, isTyping) => {
    if (socket && isConnected) {
      socket.emit('typing', { receiverId, isTyping });
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    socket,
    isConnected,
    messages,
    notifications,
    error,
    joinChat,
    sendMessage,
    markAsRead,
    sendTyping,
    clearNotifications,
    clearError
  };
};