import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';

const userSockets = new Map(); // userId -> socketId mapping

export const initializeWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // Your frontend URL
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id) || await Doctor.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.id;
      socket.userType = user.usertype || 'doctor';
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);
    userSockets.set(socket.userId, socket.id);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle joining a chat room
    socket.on('join_chat', async (data) => {
      try {
        const { receiverId } = data;
        const chatId = Chat.generateChatId(socket.userId, receiverId);
        
        socket.join(chatId);
        console.log(`User ${socket.userId} joined chat ${chatId}`);

        // Load chat history
        const messages = await Message.find({ chatId })
          .populate('senderId', 'name')
          .sort({ createdAt: 1 })
          .limit(50);

        socket.emit('chat_history', { messages, chatId });

        // Mark messages as read
        await Message.updateMany(
          { chatId, receiverId: socket.userId, isRead: false },
          { isRead: true, readAt: new Date() }
        );

        // Update chat unread count
        await Chat.findOneAndUpdate(
          { 
            'participants.userId': { $all: [socket.userId, receiverId] }
          },
          { 
            $set: { [`unreadCount.${socket.userId}`]: 0 }
          }
        );

      } catch (error) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, message, messageType = 'text' } = data;
        const chatId = Chat.generateChatId(socket.userId, receiverId);

        // Create message
        const newMessage = new Message({
          chatId,
          senderId: socket.userId,
          senderModel: socket.userType === 'doctor' ? 'Doctor' : 'User',
          receiverId,
          receiverModel: socket.userType === 'doctor' ? 'User' : 'Doctor',
          message,
          messageType
        });

        await newMessage.save();
        await newMessage.populate('senderId', 'name');

        // Update or create chat
        await Chat.findOneAndUpdate(
          { 
            'participants.userId': { $all: [socket.userId, receiverId] }
          },
          {
            $set: {
              lastMessage: {
                message,
                timestamp: new Date(),
                senderId: socket.userId
              }
            },
            $inc: { [`unreadCount.${receiverId}`]: 1 },
            $setOnInsert: {
              participants: [
                { userId: socket.userId, userModel: socket.userType === 'doctor' ? 'Doctor' : 'User' },
                { userId: receiverId, userModel: socket.userType === 'doctor' ? 'User' : 'Doctor' }
              ]
            }
          },
          { upsert: true, new: true }
        );

        // Send to both users in the chat
        io.to(chatId).emit('new_message', {
          ...newMessage.toObject(),
          senderName: newMessage.senderId.name
        });

        // Send notification to receiver if they're online but not in chat
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(`user_${receiverId}`).emit('message_notification', {
            chatId,
            senderId: socket.userId,
            senderName: newMessage.senderId.name,
            message,
            timestamp: new Date()
          });
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      const chatId = Chat.generateChatId(socket.userId, receiverId);
      
      socket.to(chatId).emit('user_typing', {
        userId: socket.userId,
        isTyping
      });
    });

    // Handle marking messages as read
    socket.on('mark_read', async (data) => {
      try {
        const { chatId } = data;
        
        await Message.updateMany(
          { chatId, receiverId: socket.userId, isRead: false },
          { isRead: true, readAt: new Date() }
        );

        await Chat.findOneAndUpdate(
          { 
            'participants.userId': socket.userId
          },
          { 
            $set: { [`unreadCount.${socket.userId}`]: 0 }
          }
        );

        socket.to(chatId).emit('messages_read', {
          readBy: socket.userId,
          readAt: new Date()
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle user going offline
    socket.on('disconnect', async () => {
      console.log(`User ${socket.userId} disconnected`);
      userSockets.delete(socket.userId);

      // Update last seen for all chats
      await Chat.updateMany(
        { 'participants.userId': socket.userId },
        { 
          $set: { 'participants.$.lastSeen': new Date() }
        }
      );
    });
  });

  return io;
};