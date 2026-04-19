const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isPrivate: { type: Boolean, default: false }, // Instagram-like privacy
  profilePic: { type: String, default: "" },    // We will use this later
  requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Pending requests
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]   // Accepted connections
});

module.exports = mongoose.model('User', UserSchema);