// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const Post = require('./models/Post');
const Notification = require('./models/Notification');
const Chat = require('./models/Chat');
const User = require('./models/User');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/prof'); // <-- NEW
const { authenticate } = require('./middleware/auth');

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

console.log('MONGO_URI loaded?', !!MONGO_URI);

const app = express();
const server = http.createServer(app);

// ---------------------- SOCKET.IO SETUP ----------------------
const allowed = ['http://127.0.0.1:5500', 'http://localhost:5500'];
const io = new Server(server, {
  cors: {
    origin: allowed,
    methods: ['GET', 'POST']
  }
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('authenticate', async (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.sub);

      if (user) {
        connectedUsers.set(socket.id, user._id.toString());
        socket.userId = user._id.toString();
        socket.join(`user_${user._id}`);
        console.log(`User ${user.name} authenticated on socket ${socket.id}`);
      }
    } catch (error) {
      console.error('Socket authentication error:', error);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const { chatId, text, senderId } = data;
      const chat = await Chat.findById(chatId);

      if (chat && chat.participants.some(p => p.toString() === senderId)) {
        chat.messages.push({ sender: senderId, text });
        chat.lastMessage = new Date();
        await chat.save();

        const sender = await User.findById(senderId);
        const otherParticipant = chat.participants.find(p => p.toString() !== senderId);

        if (otherParticipant) {
          io.to(`user_${otherParticipant}`).emit('new_message', {
            chatId,
            message: { sender: { _id: senderId }, text, createdAt: new Date() },
            senderName: sender.name
          });
        }

        socket.emit('message_sent', {
          chatId,
          message: {
            sender: { _id: senderId },
            text,
            createdAt: chat.messages[chat.messages.length - 1].createdAt
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

// ---------------------- MIDDLEWARE ----------------------
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
}));
app.use(express.json());

// ---------------------- ROUTES ----------------------
app.use('/api/auth', authRouter);

// Profile routes (GET/PUT) now handled in ./routes/prof.js
app.use('/api/profile', profileRouter);

// ---------------------- POSTS API ----------------------
// GET all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'name email').sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching posts', error: err.message });
  }
});

// CREATE a new post
app.post('/api/posts', authenticate, async (req, res) => {
  try {
    const postData = { ...req.body, author: req.user.id };
    const newPost = await Post.create(postData);
    const populatedPost = await Post.findById(newPost._id).populate('author', 'name email');
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(400).json({ message: 'Invalid post data', error: err.message });
  }
});

// UPDATE post
app.put('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    ).populate('author', 'name email');

    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(400).json({ message: 'Error updating post', error: err.message });
  }
});

// DELETE post
app.delete('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting post', error: err.message });
  }
});

// SEARCH posts
app.get('/api/posts/search', async (req, res) => {
  try {
    const { qry } = req.query;
    if (!qry) return res.status(400).json({ message: 'Search query is required' });
    const regex = new RegExp(qry, 'i');
    const posts = await Post.find({
      $or: [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { category: { $regex: regex } }
      ]
    }).populate('author', 'name email').sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error searching posts', error: err.message });
  }
});

// SUGGEST posts
app.get('/api/posts/suggest', async (req, res) => {
  try {
    const { qry } = req.query;
    if (!qry) return res.status(400).json({ message: 'Query is required' });
    const regex = new RegExp(qry, 'i');
    const posts = await Post.find({
      $or: [
        { title: { $regex: regex } },
        { category: { $regex: regex } }
      ]
    }).limit(10);
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching suggestions', error: err.message });
  }
});

// GET posts by category
app.get('/api/posts/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const posts = await Post.find({
      category: { $regex: new RegExp(category, 'i') }
    }).populate('author', 'name email').sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching category posts', error: err.message });
  }
});

// ---------------------- NOTIFICATIONS API ----------------------
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'name')
      .populate('post', 'title')
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications', error: err.message });
  }
});

app.post('/api/notifications', authenticate, async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId).populate('author', 'name');

    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot start chat with your own post' });
    }

    const notification = await Notification.create({
      recipient: post.author._id,
      sender: req.user.id,
      post: postId,
      message: `${req.user.name} wants to connect with you`
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'name')
      .populate('post', 'title');

    io.to(`user_${post.author._id}`).emit('new_notification', populatedNotification);

    res.status(201).json(populatedNotification);
  } catch (err) {
    res.status(400).json({ message: 'Error creating notification', error: err.message });
  }
});

app.delete('/api/notifications', authenticate, async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user.id });
    res.json({ message: 'All notifications deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting notifications', error: err.message });
  }
});

app.put('/api/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Error updating notification', error: err.message });
  }
});

// ---------------------- CHAT API ----------------------
app.get('/api/chats', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .populate('participants', 'name email')
      .populate('messages.sender', 'name')
      .sort({ lastMessage: -1 });
    res.status(200).json(chats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching chats', error: err.message });
  }
});

app.post('/api/chats', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, otherUserId] }
    }).populate('participants', 'name email').populate('messages.sender', 'name');

    if (!chat) {
      chat = await Chat.create({ participants: [req.user.id, otherUserId] });
      chat = await Chat.findById(chat._id)
        .populate('participants', 'name email')
        .populate('messages.sender', 'name');
    }

    res.status(200).json(chat);
  } catch (err) {
    res.status(400).json({ message: 'Error creating chat', error: err.message });
  }
});

app.delete('/api/chats/:chatId', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user.id)) return res.status(403).json({ message: 'Not a participant' });

    chat.messages = [];
    await chat.save();

    res.status(200).json({ message: 'Chat cleared successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error clearing chat', error: err.message });
  }
});

app.delete('/api/chats/:chatId/contact', authenticate, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user.id)) return res.status(403).json({ message: 'Not a participant' });

    await Chat.findByIdAndDelete(chatId);
    res.status(200).json({ message: 'Contact deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting contact', error: err.message });
  }
});

// ---------------------- START SERVER ----------------------
(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully!');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Access backend at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
})();
