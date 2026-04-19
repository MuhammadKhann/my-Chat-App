const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    room: { type: String, required: true }, // The unique ID for the private chat
    status: { 
        type: String, 
        enum: ['sent', 'delivered', 'seen'], 
        default: 'sent' 
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);