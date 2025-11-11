const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req,res)=>{
  try{
    const { name, email, password } = req.body;
    if(!name || !email || !password) return res.status(400).json({ error:'Missing fields' });
    const exists = await User.findOne({ email });
    if(exists) return res.status(400).json({ error:'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, email, passwordHash });
    res.status(201).json({ ok:true });
  }catch(e){ res.status(400).json({ error:e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if(!user) return res.status(401).json({ error:'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(401).json({ error:'Invalid credentials' });

    const token = jwt.sign(
      { sub: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ token, user:{ id:user._id, name:user.name, email:user.email }});
  }catch(e){ res.status(500).json({ error:e.message }); }
});

module.exports = router;
