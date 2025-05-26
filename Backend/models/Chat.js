import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userModel: { type: String, required: true, enum: ['User', 'Doctor'] },
    lastSeen: { type: Date, default: Date.now }
  }],
  lastMessage: {
    message: String,
    timestamp: Date,
    senderId: mongoose.Schema.Types.ObjectId
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

// Generate chatId from participant IDs
chatSchema.statics.generateChatId = function(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
};

export default mongoose.model('Chat', chatSchema);