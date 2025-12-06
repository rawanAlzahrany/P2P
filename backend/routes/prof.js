const express = require('express');
const router = express.Router();
// Assuming authenticate is exported from middleware/auth.js
const { authenticate } = require('../middleware/auth'); 
const User = require('../models/User');

// ================== GET PROFILE ==================
router.get('/', authenticate, async (req, res) => {
  try {
    // req.user.id comes from the authenticate middleware payload
    const user = await User.findById(req.user.id).select('-passwordHash'); 
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user); 
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== UPDATE PROFILE ==================
router.put('/', authenticate, async (req, res) => {
  try {
    const { name, email, skills } = req.body;

    const user = await User.findById(req.user.id);
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