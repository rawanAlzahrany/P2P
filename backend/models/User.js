const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  
  // random pastel avatar color
  avatarColor: { 
    type: String, 
    default: () => {
      const hue = Math.floor(Math.random() * 360);
      return `hsl(${hue}, 70%, 80%)`;
    }
  },

  bio: { type: String, default: '' },
  experience: { type: [String], default: [] },
  skills: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
