import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true }, // combination of doctor and patient IDs
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderModel: { type: String, required: true, enum: ['User', 'Doctor'] },
  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  receiverModel: { type: String, required: true, enum: ['User', 'Doctor'] },
  message: { type: String, required: true },
  messageType: { type: String, default: 'text', enum: ['text', 'image', 'file', 'voice'] },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  editedAt: { type: Date },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Index for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

export default mongoose.model('Message', messageSchema);