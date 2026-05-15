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
    status: { type: String, default: 'sent' },

    // Threaded replies
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    replyCount: { type: Number, default: 0 },

    // Delete fields
    deletedBySender: { type: Boolean, default: false },
    deletedForEveryone: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Edit fields
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    editCount: { type: Number, default: 0 },
    editHistory: [{
        text: String,
        editedAt: { type: Date, default: null },
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    originalText: { type: String, default: null },

    // Optimistic locking
    _version: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);