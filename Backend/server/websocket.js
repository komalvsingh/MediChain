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
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Authentication middleware - FIXED
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Check both collections to determine user type
            let user = null;
            let userType = null;
            
            // First check if user is a Doctor
            user = await Doctor.findById(decoded.id);
            if (user) {
                userType = 'Doctor';
            } else {
                // Then check if user is a Patient/User
                user = await User.findById(decoded.id);
                if (user) {
                    userType = 'User'; // or 'Patient' if you prefer
                }
            }

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.userId = decoded.id;
            socket.userType = userType;
            socket.userName = user.name;
            
            console.log(`Socket authenticated: ${socket.userId} as ${userType} (${user.name})`);
            next();
        } catch (err) {
            console.error('Socket authentication error:', err);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User ${socket.userId} (${socket.userType}) connected`);
        userSockets.set(socket.userId, socket.id);

        // Join user to their personal room
        socket.join(`user_${socket.userId}`);

        // Handle joining a chat room
        socket.on('join_chat', async (data, callback) => {
            try {
                const { receiverId } = data;
                console.log(`User ${socket.userId} (${socket.userType}) trying to join chat with ${receiverId}`);
                
                const chatId = Chat.generateChatId(socket.userId, receiverId);
                socket.join(chatId);
                console.log(`User ${socket.userId} joined chat ${chatId}`);

                // Load chat history with proper population
                const messages = await Message.find({ chatId })
                    .sort({ createdAt: 1 })
                    .limit(50)
                    .lean();

                // Manually populate sender names
                const populatedMessages = await Promise.all(
                    messages.map(async (message) => {
                        let senderName = 'Unknown';
                        try {
                            if (message.senderModel === 'User') {
                                const sender = await User.findById(message.senderId).select('name');
                                senderName = sender?.name || 'Unknown User';
                            } else if (message.senderModel === 'Doctor') {
                                const sender = await Doctor.findById(message.senderId).select('name');
                                senderName = sender?.name || 'Unknown Doctor';
                            }
                        } catch (err) {
                            console.error('Error populating sender:', err);
                        }
                        
                        return {
                            ...message,
                            senderName
                        };
                    })
                );

                console.log(`Sending ${populatedMessages.length} messages to ${socket.userId}`);
                socket.emit('chat_history', { 
                    messages: populatedMessages, 
                    chatId 
                });

                // Mark messages as read
                const readUpdateResult = await Message.updateMany(
                    { chatId, receiverId: socket.userId, isRead: false },
                    { isRead: true, readAt: new Date() }
                );

                // Update chat unread count
                const chat = await Chat.findOne({
                    $and: [
                        { 'participants.userId': socket.userId },
                        { 'participants.userId': receiverId }
                    ]
                });

                if (chat) {
                    if (!chat.unreadCount) {
                        chat.unreadCount = new Map();
                    }
                    chat.unreadCount.set(socket.userId.toString(), 0);
                    await chat.save();
                }

                // Send success callback
                if (callback) callback({ success: true, chatId });

            } catch (error) {
                console.error('Error joining chat:', error);
                socket.emit('error', { message: 'Failed to join chat', details: error.message });
                if (callback) callback({ success: false, error: error.message });
            }
        });

        // Handle sending messages - FIXED
        socket.on('send_message', async (data, callback) => {
            try {
                const { receiverId, message, messageType = 'text' } = data;
                console.log(`Message from ${socket.userId} (${socket.userType}) to ${receiverId}: ${message}`);
                
                const chatId = Chat.generateChatId(socket.userId, receiverId);

                // Determine receiver model - IMPROVED
                let receiverModel = 'User';
                let receiverInDoctors = await Doctor.findById(receiverId);
                if (receiverInDoctors) {
                    receiverModel = 'Doctor';
                } else {
                    const receiverInUsers = await User.findById(receiverId);
                    if (!receiverInUsers) {
                        throw new Error('Receiver not found');
                    }
                }

                // Create message with correct senderModel
                const newMessage = new Message({
                    chatId,
                    senderId: socket.userId,
                    senderModel: socket.userType, // This will now be correct ('User' or 'Doctor')
                    receiverId,
                    receiverModel,
                    message,
                    messageType
                });

                await newMessage.save();
                console.log(`Message saved: ${newMessage._id} from ${socket.userType} ${socket.userId}`);

                // Add sender name to message object
                const messageWithSender = {
                    ...newMessage.toObject(),
                    senderName: socket.userName
                };

                // Update or create chat
                const chatFilter = {
                    $and: [
                        { 'participants.userId': socket.userId },
                        { 'participants.userId': receiverId }
                    ]
                };

                let chat = await Chat.findOne(chatFilter);

                if (chat) {
                    // Update existing chat
                    chat.lastMessage = {
                        message,
                        timestamp: new Date(),
                        senderId: socket.userId
                    };
                    
                    // Initialize unreadCount if it doesn't exist
                    if (!chat.unreadCount) {
                        chat.unreadCount = new Map();
                    }
                    
                    // Increment unread count for receiver
                    const currentUnreadCount = chat.unreadCount.get(receiverId.toString()) || 0;
                    chat.unreadCount.set(receiverId.toString(), currentUnreadCount + 1);
                    
                    await chat.save();
                } else {
                    // Create new chat
                    chat = new Chat({
                        participants: [
                            { userId: socket.userId, userModel: socket.userType },
                            { userId: receiverId, userModel: receiverModel }
                        ],
                        lastMessage: {
                            message,
                            timestamp: new Date(),
                            senderId: socket.userId
                        },
                        unreadCount: new Map([[receiverId.toString(), 1]])
                    });
                    
                    await chat.save();
                }

                // Send to both users in the chat
                io.to(chatId).emit('new_message', messageWithSender);
                console.log(`Message sent to chat room: ${chatId}`);

                // Send notification to receiver if they're online but not in chat
                const receiverSocketId = userSockets.get(receiverId);
                if (receiverSocketId) {
                    io.to(`user_${receiverId}`).emit('message_notification', {
                        chatId,
                        senderId: socket.userId,
                        senderName: socket.userName,
                        message,
                        timestamp: new Date()
                    });
                }

                // Send success callback to sender
                if (callback) {
                    callback({ 
                        success: true, 
                        message: messageWithSender,
                        messageId: newMessage._id
                    });
                }

            } catch (error) {
                console.error('Error sending message:', error);
                const errorMsg = 'Failed to send message: ' + error.message;
                
                socket.emit('error', { message: errorMsg });
                
                if (callback) {
                    callback({ 
                        success: false, 
                        error: errorMsg 
                    });
                }
            }
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            const { receiverId, isTyping } = data;
            const chatId = Chat.generateChatId(socket.userId, receiverId);
            socket.to(chatId).emit('user_typing', {
                userId: socket.userId,
                userName: socket.userName,
                isTyping
            });
        });

        // Handle marking messages as read
        socket.on('mark_read', async (data, callback) => {
            try {
                const { chatId } = data;
                
                await Message.updateMany(
                    { chatId, receiverId: socket.userId, isRead: false },
                    { isRead: true, readAt: new Date() }
                );

                // Find and update chat unread count
                const chat = await Chat.findOne({
                    'participants.userId': socket.userId
                });

                if (chat) {
                    if (!chat.unreadCount) {
                        chat.unreadCount = new Map();
                    }
                    chat.unreadCount.set(socket.userId.toString(), 0);
                    await chat.save();
                }

                socket.to(chatId).emit('messages_read', {
                    readBy: socket.userId,
                    readAt: new Date()
                });

                if (callback) callback({ success: true });

            } catch (error) {
                console.error('Error marking messages as read:', error);
                socket.emit('error', { message: 'Failed to mark messages as read' });
                if (callback) callback({ success: false, error: error.message });
            }
        });

        // Handle user going offline
        socket.on('disconnect', async () => {
            console.log(`User ${socket.userId} (${socket.userType}) disconnected`);
            userSockets.delete(socket.userId);

            // Update last seen for all chats
            try {
                const userChats = await Chat.find({
                    'participants.userId': socket.userId
                });

                for (const chat of userChats) {
                    const participantIndex = chat.participants.findIndex(
                        p => p.userId.toString() === socket.userId.toString()
                    );
                    
                    if (participantIndex !== -1) {
                        chat.participants[participantIndex].lastSeen = new Date();
                        await chat.save();
                    }
                }
            } catch (error) {
                console.error('Error updating last seen:', error);
            }
        });
    });

    return io;
};