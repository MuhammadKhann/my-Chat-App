const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  type: {
    type: String,
    enum: ['pkce', 'oauth_state', 'temp_google_data'],
    required: true
  },

  // PKCE fields
  codeVerifier: { type: String },
  codeChallenge: { type: String },
  state: { type: String },

  // OAuth flow tracking
  provider: { type: String, enum: ['google', 'microsoft', 'apple'] },
  initiatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },

  // Security
  used: { type: Boolean, default: false },
  usedAt: { type: Date },

  // Temporary data for new users
  tempUserData: {
    email: String,
    name: String,
    picture: String,
    providerId: String
  },

  // Audit
  attempts: { type: Number, default: 0 },
  lastAttemptAt: { type: Date }
});

// Auto-cleanup expired sessions
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuthSession', authSessionSchema);
