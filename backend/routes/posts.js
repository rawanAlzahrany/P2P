const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

// Helper: generate random pastel color
function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * 5) + 95; // 95-100%
    const lightness = Math.floor(Math.random() * 5) + 95;  // 95-100%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// GET all posts
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SEARCH posts (for frontend search bar)
router.get('/search', async (req, res) => {
    try {
        const { qry } = req.query;
        let filter = {};
        if (qry) {
            const regex = new RegExp(qry, 'i');
            filter = { 
                $or: [
                    { title: { $regex: regex } },
                    { category: { $regex: regex } }
                ]
            };
        }
        const posts = await Post.find(filter).sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching posts', error: err.message });
    }
});

// POST a new post
router.post('/', async (req, res) => {
    const { title, type, category, description } = req.body;

    const post = new Post({
        title,
        type,
        category,
        description,
        color: getRandomPastelColor() // assign random pastel color
    });

    try {
        const newPost = await post.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT (edit) a post
router.put('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const { title, type, category, description } = req.body;
        post.title = title;
        post.type = type;
        post.category = category;
        post.description = description;
        // color stays the same

        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a post
router.delete('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        await post.remove();
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET live search suggestions (title OR category)
router.get('/suggest', async (req, res) => {
    try {
        const { qry } = req.query;
        if (!qry) return res.status(400).json({ message: 'Query is required' });

        const regex = new RegExp(qry, 'i');
        const posts = await Post.find({
            $or: [
                { title: { $regex: regex } },
                { category: { $regex: regex } }
            ]
        })
        .limit(10)
        .select('title category color'); // include color in suggestions

        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching suggestions', error: err.message });
    }
});

module.exports = router;