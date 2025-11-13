// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

const Post = require('./models/Post');
const authRouter = require('./routes/auth'); // auth routes

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

console.log('MONGO_URI loaded?', !!MONGO_URI); // Check if env variable is loaded

const app = express();

// ---------------------- MIDDLEWARE ----------------------
const allowed = ['http://127.0.0.1:5500', 'http://localhost:5500'];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
}));
app.use(express.json()); // Parse JSON body

// ---------------------- ROUTES ----------------------
app.use('/api/auth', authRouter); // connect auth routes

// ---------------------- POSTS API ROUTES ----------------------

// GET all posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching posts', error: err.message });
  }
});

// CREATE a new post
app.post('/api/posts', async (req, res) => {
  try {
    const newPost = await Post.create(req.body);
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ message: 'Invalid post data', error: err.message });
  }
});

// UPDATE a post
app.put('/api/posts/:id', async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!updatedPost) return res.status(404).json({ message: 'Post not found' });
    res.status(200).json(updatedPost);
  } catch (err) {
    res.status(400).json({ message: 'Error updating post', error: err.message });
  }
});

// DELETE a post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ message: 'Post not found' });
    res.status(204).json({ message: 'Post deleted successfully' });
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
    }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error searching posts', error: err.message });
  }
});

// SUGGEST posts for live search
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
    }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching category posts', error: err.message });
  }
});

// ---------------------- START SERVER ----------------------
(async () => {
  try {
    await mongoose.connect(MONGO_URI); // Connect to MongoDB
    console.log('MongoDB connected successfully!');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Access the backend at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
})();

