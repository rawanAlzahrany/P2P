const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// ================== AUTH MIDDLEWARE ==================
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub; // store user id in request
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// ================== GET PROFILE ==================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user); // frontend expects full profile here
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== UPDATE PROFILE ==================
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { name, email, skills } = req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (skills) user.skills = skills;

    await user.save();

    // return user without passwordHash
    const safeUser = await User.findById(user._id).select('-passwordHash');

    res.json({ message: 'Profile updated', user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
