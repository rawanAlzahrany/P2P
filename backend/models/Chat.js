// models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  // NEW: Link to the specific post this chat is about (enables post-specific chats)
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: false
  },
  // NEW: Status to track if the session is ongoing, completed, or ended early/archived
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;