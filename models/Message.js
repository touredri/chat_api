import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true }, // Reference to Message
  type: { type: String, enum: ['text', 'image', 'video'], required: true }, // Type of message
  message: { type: String, required: true }, // Content of the message
  likeCount: { type: Number, default: 0 }, // Number of likes for this message
  createAt: { type: Date, default: Date.now }, // Date de création
});

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true }, // ID of the sender
  recipientId: { type: String, required: true }, // ID of the recipient
  lastMessage: { type: String, required: false }, // Last message sent in the chat
  createdAt: { type: Date, default: Date.now }, // Creation date
  modifiedAt: { type: Date, default: Date.now }, // Modification date
});

// Add indexes for frequently queried fields
messageSchema.index({ senderId: 1, recipientId: 1 });
chatSchema.index({ messageId: 1 });

export const Chat = mongoose.model('Chat', chatSchema);
export default mongoose.model('Message', messageSchema);