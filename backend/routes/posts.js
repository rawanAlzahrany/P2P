const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth'); 

// Helper: generate random pastel color
function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 5) + 95; 
    const lightness = Math.floor(Math.random() * 5) + 95; 
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// GET all active posts
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find({ status: 'active' }) // Filter: Only show active posts
            .populate('author', 'name email')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SEARCH posts (for frontend search bar) - Filter by status: active
router.get('/search', async (req, res) => {
    try {
        const { qry } = req.query;
        let filter = { status: 'active' }; 

        if (qry) {
            const regex = new RegExp(qry, 'i');
            filter = { 
                status: 'active',
                $or: [
                    { title: { $regex: regex } },
                    { category: { $regex: regex } }
                ]
            };
        }
        const posts = await Post.find(filter).populate('author', 'name email').sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching posts', error: err.message });
    }
});

// POST a new post - ADDED AUTHENTICATION
router.post('/', authenticate, async (req, res) => {
    const { title, type, category, description } = req.body;

    const post = new Post({
        title,
        type,
        category,
        description,
        color: getRandomPastelColor(), 
        author: req.user.id, // Set author from authenticated user
        status: 'active' // Set default status
    });

    try {
        const newPost = await post.save();
        const populatedPost = await Post.findById(newPost._id).populate('author', 'name email');
        res.status(201).json(populatedPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT (edit) a post - ADDED AUTHORIZATION CHECK
router.put('/:id', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only edit your own posts' });
        }

        // Only allow edits if the post is active
        if (post.status !== 'active') {
            return res.status(400).json({ message: 'Cannot edit an archived or completed post' });
        }

        const { title, type, category, description } = req.body;
        
        if (title) post.title = title;
        if (type) post.type = type;
        if (category) post.category = category;
        if (description) post.description = description;

        const updatedPost = await post.save();
        const populatedPost = await Post.findById(updatedPost._id).populate('author', 'name email');
        res.json(populatedPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a post - ADDED AUTHORIZATION CHECK
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        
        if (post.author.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own posts' });
        }

        await Post.findByIdAndDelete(req.params.id);

        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET live search suggestions (title OR category) - Filter by status: active
router.get('/suggest', async (req, res) => {
    try {
        const { qry } = req.query;
        if (!qry) return res.status(400).json({ message: 'Query is required' });

        const regex = new RegExp(qry, 'i');
        const posts = await Post.find({
            status: 'active', // Only suggest active posts
            $or: [
                { title: { $regex: regex } },
                { category: { $regex: regex } }
            ]
        })
        .limit(10)
        .select('title category color')
        .populate('author', 'name email'); 

        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching suggestions', error: err.message });
    }
});

module.exports = router;