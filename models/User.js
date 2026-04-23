const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isPrivate: { type: Boolean, default: false }, // Instagram-like privacy
  privacyLevel: {
      type: String,
      enum: ['standard', 'hide_online', 'hide_read', 'ghost'],
      default: 'standard'
  },
  avatar: { type: String, default: "" },        // Avatar URL from Cloudinary
  requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Pending requests
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]   // Accepted connections
});

module.exports = mongoose.model('User', UserSchema);