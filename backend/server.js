// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken'); 

// Import Models
const Post = require('./models/Post');
const Notification = require('./models/Notification');
const Chat = require('./models/Chat');
const User = require('./models/User');
const History = require('./models/History'); 

// Import Routers/Middleware
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/prof'); 
const postsRouter = require('./routes/posts'); // <-- New Import
const { authenticate } = require('./middleware/auth'); // Ensure this file exists and exports 'authenticate'

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

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
app.use('/api/profile', profileRouter);
app.use('/api/posts', postsRouter); // <-- All POST routes are now handled by the router

// ---------------------- NOTIFICATIONS API ----------------------
// GET all connection request notifications for the current user
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id, type: 'connection_request' })
      .populate('sender', 'name')
      .populate('post', 'title type') // Populate post title and type
      .sort({ createdAt: -1 });

    const formattedNotifications = notifications.map(n => ({
        _id: n._id,
        type: 'connection_request',
        senderName: n.sender.name,
        senderId: n.sender._id,
        postId: n.post._id,
        postTitle: n.post.title,
        postType: n.post.type,
        createdAt: n.createdAt
    }));
      
    res.status(200).json(formattedNotifications);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications', error: err.message });
  }
});

// POST to create a new connection request notification
app.post('/api/notifications', authenticate, async (req, res) => {
  try {
    const { postId } = req.body;
    const post = await Post.findById(postId).populate('author', 'name');

    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot start chat with your own post' });
    }

    const existingNotification = await Notification.findOne({
      recipient: post.author._id,
      sender: req.user.id,
      post: postId,
      type: 'connection_request'
    });

    if (existingNotification) {
      return res.status(400).json({ message: 'Connection request already sent for this post.' });
    }

    const notification = await Notification.create({
      recipient: post.author._id,
      sender: req.user.id,
      post: postId,
      type: 'connection_request',
      message: `${req.user.name} wants to connect with you`
    });

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'name')
      .populate('post', 'title type');

    io.to(`user_${post.author._id}`).emit('new_notification', populatedNotification);

    res.status(201).json({ message: 'Connection request sent successfully.' });
  } catch (err) {
    res.status(400).json({ message: 'Error creating notification', error: err.message });
  }
});

// DELETE all notifications (kept for 'Clear All' button)
app.delete('/api/notifications', authenticate, async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user.id });
    res.json({ message: 'All notifications deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting notifications', error: err.message });
  }
});

// ---------------------- CONNECTION ACTION API ----------------------

// Accept Connection Request (Creates Chat and Archives Post)
app.post('/api/connections/accept', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { notificationId, postId, senderId } = req.body;
    const recipientId = req.user.id;

    // 1. Delete the notification
    await Notification.findByIdAndDelete(notificationId, { session });

    // 2. Archive the post (or mark as in-session)
    const post = await Post.findByIdAndUpdate(postId, 
      { status: 'archived', connectedUser: senderId }, 
      { new: true, session }
    );
    if (!post) { throw new Error('Post not found'); }

    // 3. Create the new chat linked to the post
    let chat = await Chat.create([{ 
      participants: [senderId, recipientId],
      post: postId,
      status: 'active'
    }], { session });
    chat = chat[0];

    // 4. Notify the sender (the person who requested the connection) via socket
    io.to(`user_${senderId}`).emit('chat_accepted', {
      recipientId: senderId, 
      postTitle: post.title,
      chatId: chat._id
    });
    
    await session.commitTransaction();
    res.status(200).json({ 
        message: 'Connection accepted. Chat created.', 
        chatId: chat._id 
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Failed to accept connection', error: err.message });
  } finally {
    session.endSession();
  }
});

// Reject Connection Request (Just Deletes Notification)
app.post('/api/connections/reject', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.body;
    await Notification.findByIdAndDelete(notificationId);
    res.status(200).json({ message: 'Connection rejected. Notification deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject connection', error: err.message });
  }
});

// ---------------------- CHAT API ----------------------

// GET active chats, populating Post data
app.get('/api/chats', authenticate, async (req, res) => {
  try {
    // Only fetch chats that are 'active' (not completed or undone/archived)
    const chats = await Chat.find({ participants: req.user.id, status: 'active' })
      .populate('participants', 'name email')
      .populate('messages.sender', 'name')
      .populate('post', 'title type') 
      .sort({ lastMessage: -1 });
      
    res.status(200).json(chats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching chats', error: err.message });
  }
});

// POST to start a direct chat (Kept for compatibility)
app.post('/api/chats', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.body;
    // Look for an existing general chat (without a post ID)
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, otherUserId] },
      post: { $exists: false } 
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

// Mark session as Completed (Done)
app.post('/api/chats/:chatId/done', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId).populate('participants', 'name').populate('post', 'title');

    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.some(p => p._id.toString() === req.user.id)) return res.status(403).json({ message: 'Not a participant' });
    
    // 1. Update Chat status
    chat.status = 'completed';
    await chat.save({ session });

    // 2. Update Post status
    if (chat.post) {
      await Post.findByIdAndUpdate(chat.post._id, { status: 'completed' }, { session });
    }

    // 3. Create History Record
    const partner = chat.participants.find(p => p._id.toString() !== req.user.id);
    const historyRecord = {
        title: chat.post ? chat.post.title : 'Direct Chat Session',
        post: chat.post ? chat.post._id : null,
        user: req.user.id,
        partner: partner ? partner._id : null,
        partnerName: partner ? partner.name : 'Unknown',
        startDate: chat.createdAt,
        endDate: new Date(),
        status: 'completed',
        endedBy: req.user.id
    };
    await History.create([historyRecord], { session });

    await session.commitTransaction();
    res.status(200).json({ message: 'This session is completed.' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Failed to mark session as completed', error: err.message });
  } finally {
    session.endSession();
  }
});

// Mark session as Not Completed (Undone / End Early)
app.post('/api/chats/:chatId/undone', authenticate, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId).populate('participants', 'name').populate('post', 'title');

    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.some(p => p._id.toString() === req.user.id)) return res.status(403).json({ message: 'Not a participant' });

    // 1. Update Chat status to archived
    chat.status = 'archived';
    await chat.save({ session });
    
    // 2. Reactivate the post
    if (chat.post) {
      await Post.findByIdAndUpdate(chat.post._id, { status: 'active', connectedUser: null }, { session });
    }

    // 3. Create History Record
    const partner = chat.participants.find(p => p._id.toString() !== req.user.id);
    const historyRecord = {
        title: chat.post ? chat.post.title : 'Direct Chat Session',
        post: chat.post ? chat.post._id : null,
        user: req.user.id,
        partner: partner ? partner._id : null,
        partnerName: partner ? partner.name : 'Unknown',
        startDate: chat.createdAt,
        endDate: new Date(),
        status: 'ended_early',
        endedBy: req.user.id
    };
    await History.create([historyRecord], { session });

    await session.commitTransaction();
    res.status(200).json({ message: 'Session ended. Post is reactivated.' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Failed to mark session as not completed', error: err.message });
  } finally {
    session.endSession();
  }
});

// DELETE chat messages (Clear Chat - Kept existing route)
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

// DELETE contact (Delete Chat - Kept existing route)
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


// ---------------------- HISTORY API ----------------------

// GET user's session history
app.get('/api/history', authenticate, async (req, res) => {
  try {
    const history = await History.find({ 
      $or: [
        { user: req.user.id },
        { partner: req.user.id }
      ]
    })
    .populate('post', 'title type')
    .sort({ endDate: -1, createdAt: -1 });

    const formattedHistory = history.map(h => {
        const isUser = h.user.toString() === req.user.id;
        let partnerName = h.partnerName;

        return {
            title: h.title,
            partnerName: partnerName,
            startDate: h.startDate,
            endDate: h.endDate,
            status: h.status,
            endedBy: h.endedBy.toString() === req.user.id ? 'You' : partnerName,
            isCreator: isUser
        };
    });

    res.status(200).json(formattedHistory);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching history', error: err.message });
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