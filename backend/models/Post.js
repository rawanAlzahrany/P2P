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
    type: String, // <-- new field
    default: null  // optional, will assign when creating post
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
