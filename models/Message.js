const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: "" },
    
    // --- ROBUST FILE TRACKING ---
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileType: { type: String, default: null },
    fileSize: { type: Number, default: null }, // Track bytes for frontend display
    
    room: { type: String, required: true },
    status: { type: String, default: 'sent' }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);