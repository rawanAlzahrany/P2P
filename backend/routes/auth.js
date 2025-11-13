const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req,res)=>{
  try{
    const { name, email, password } = req.body;

    if(!name || !email || !password)
      return res.status(400).json({ message:'Missing fields' });

    const exists = await User.findOne({ email });
    if(exists)
      return res.status(400).json({ message:'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);

    // This matches your User model (passwordHash)
    await User.create({ name, email, passwordHash });

    res.status(201).json({ message:'User created successfully' });
  }
  catch(e){
    res.status(400).json({ message:e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if(!user)
      return res.status(401).json({ message:'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok)
      return res.status(401).json({ message:'Invalid credentials' });

    const token = jwt.sign(
      { sub: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login success',
      token,
      user:{
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  }
  catch(e){
    res.status(500).json({ message:e.message });
  }
});

module.exports = router;
