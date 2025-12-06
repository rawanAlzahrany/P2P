// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A post must have a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  type: {
    type: String,
    enum: ['request', 'offer'],
    required: [true, 'A post must be either a request or an offer']
  },
  category: {
    type: String,
    enum: ['coding', 'math', 'science', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    required: [true, 'A post must have a description'],
    trim: true
  },
  color: {
    type: String,
    default: null
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // NEW: Status to handle archiving/reactivating the post
  status: { 
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active'
  },
  // NEW: Store the user who accepted the connection (only relevant when archived)
  connectedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;