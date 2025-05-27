import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { authenticateToken } from '../middleware/authmiddleware.js';

const router = express.Router();

// Get all chats for a user
router.get('/chats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const chats = await Chat.find({
            'participants.userId': userId
        }).sort({ updatedAt: -1 });

        // Populate participant details
        const populatedChats = await Promise.all(
            chats.map(async (chat) => {
                const otherParticipant = chat.participants.find(
                    p => p.userId.toString() !== userId.toString()
                );
                
                let participantDetails = null;
                if (otherParticipant) {
                    if (otherParticipant.userModel === 'User') {
                        participantDetails = await User.findById(otherParticipant.userId)
                            .select('name email usertype');
                    } else {
                        participantDetails = await Doctor.findById(otherParticipant.userId)
                            .select('name specialization');
                    }
                }

                return {
                    ...chat.toObject(),
                    participantDetails,
                    unreadCount: chat.unreadCount?.get(userId.toString()) || 0
                };
            })
        );

        res.json(populatedChats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ message: 'Failed to fetch chats' });
    }
});

// Get messages for a specific chat
router.get('/messages/:chatId', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        
        const skip = (page - 1) * limit;
        
        const messages = await Message.find({ chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Populate sender names
        const populatedMessages = await Promise.all(
            messages.map(async (message) => {
                let senderName = 'Unknown';
                try {
                    if (message.senderModel === 'User') {
                        const sender = await User.findById(message.senderId).select('name');
                        senderName = sender?.name || 'Unknown User';
                    } else {
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

        res.json(populatedMessages.reverse()); // Reverse to get chronological order
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
});

// Create or get existing chat
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user._id;
        
        if (!receiverId) {
            return res.status(400).json({ message: 'Receiver ID is required' });
        }

        // Check if receiver exists
        let receiverModel = 'User';
        let receiver = await User.findById(receiverId);
        
        if (!receiver) {
            receiver = await Doctor.findById(receiverId);
            receiverModel = 'Doctor';
        }

        if (!receiver) {
            return res.status(404).json({ message: 'Receiver not found' });
        }

        const chatId = Chat.generateChatId(senderId, receiverId);
        
        // Find or create chat using proper query
        let chat = await Chat.findOne({
            $and: [
                { 'participants.userId': senderId },
                { 'participants.userId': receiverId }
            ]
        });

        if (!chat) {
            chat = new Chat({
                participants: [
                    { 
                        userId: senderId, 
                        userModel: req.user.usertype === 'Doctor' ? 'Doctor' : 'User' 
                    },
                    { 
                        userId: receiverId, 
                        userModel: receiverModel 
                    }
                ],
                unreadCount: new Map()
            });
            await chat.save();
        }

        res.json({ 
            chat, 
            chatId,
            receiverDetails: {
                _id: receiver._id,
                name: receiver.name,
                type: receiverModel
            }
        });
    } catch (error) {
        console.error('Error creating/getting chat:', error);
        res.status(500).json({ message: 'Failed to create chat' });
    }
});

// Mark messages as read
router.put('/read/:chatId', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        // Update messages
        await Message.updateMany(
            { chatId, receiverId: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        // Update chat unread count
        const chat = await Chat.findOne({
            'participants.userId': userId
        });

        if (chat) {
            if (!chat.unreadCount) {
                chat.unreadCount = new Map();
            }
            chat.unreadCount.set(userId.toString(), 0);
            await chat.save();
        }

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ message: 'Failed to mark messages as read' });
    }
});

// Delete a message
router.delete('/message/:messageId', authenticateToken, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findOne({
            _id: messageId,
            senderId: userId
        });

        if (!message) {
            return res.status(404).json({ message: 'Message not found or unauthorized' });
        }

        message.isDeleted = true;
        message.message = 'This message was deleted';
        await message.save();

        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'Failed to delete message' });
    }
});

export default router;