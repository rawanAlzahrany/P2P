// backend/models/History.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HistorySchema = new Schema({
    // Title of the post or session
    title: {
        type: String,
        required: true,
        trim: true
    },
    // Reference to the original Post (optional, if it was a direct chat)
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: false
    },
    // The user associated with this specific history record
    user: { 
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The other user involved in the session
    partner: { 
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    // Store partner name directly for simpler history display
    partnerName: {
        type: String,
        required: false
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        default: Date.now
    },
    // Status: 'completed' or 'ended_early'
    status: {
        type: String,
        enum: ['completed', 'ended_early'],
        default: 'completed'
    },
    // Who initiated the end of the session
    endedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('History', HistorySchema);