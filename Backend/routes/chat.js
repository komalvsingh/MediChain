import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { authenticateToken } from '../middleware/authmiddleware.js';

const router = express.Router();

// Get all chats for a user
router.get('/chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const chats = await Chat.find({
      'participants.userId': userId
    })
    .populate('participants.userId', 'name email usertype')
    .populate('lastMessage.senderId', 'name')
    .sort({ 'lastMessage.timestamp': -1 });

    const formattedChats = chats.map(chat => {
      const otherParticipant = chat.participants.find(p => 
        p.userId._id.toString() !== userId
      );
      
      return {
        chatId: Chat.generateChatId(userId, otherParticipant.userId._id),
        participant: otherParticipant.userId,
        lastMessage: chat.lastMessage,
        unreadCount: chat.unreadCount.get(userId) || 0,
        lastSeen: chat.participants.find(p => 
          p.userId._id.toString() === userId
        )?.lastSeen
      };
    });

    res.json(formattedChats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a specific chat
router.get('/messages/:receiverId', authenticateToken, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    
    const chatId = Chat.generateChatId(userId, receiverId);
    
    const messages = await Message.find({ chatId })
      .populate('senderId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a message
router.delete('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    const message = await Message.findOne({
      _id: messageId,
      senderId: userId
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    message.isDeleted = true;
    await message.save();
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Edit a message
router.put('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message: newMessage } = req.body;
    const userId = req.user.id;
    
    const message = await Message.findOne({
      _id: messageId,
      senderId: userId
    });
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    message.message = newMessage;
    message.editedAt = new Date();
    await message.save();
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;