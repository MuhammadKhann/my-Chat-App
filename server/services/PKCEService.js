const crypto = require('crypto');
const AuthSession = require('../models/AuthSession');

class PKCEService {
  // Generate cryptographically secure PKCE pair
  static generatePKCE() {
    const verifier = crypto.randomBytes(64).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return { verifier, challenge };
  }

  // Create new PKCE session
  static async createSession({ ipAddress, userAgent, provider = 'google' }) {
    const state = crypto.randomUUID();
    const { verifier, challenge } = this.generatePKCE();

    const session = await AuthSession.create({
      sessionId: crypto.randomUUID(),
      type: 'pkce',
      codeVerifier: verifier,
      codeChallenge: challenge,
      state,
      provider,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    return {
      sessionId: session.sessionId,
      state,
      codeChallenge: challenge
    };
  }

  // Validate and consume session
  static async validateSession({ sessionId, state, ipAddress }) {
    const session = await AuthSession.findOne({
      sessionId,
      state,
      type: 'pkce',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // IP binding (configurable strictness)
    if (process.env.PKCE_STRICT_IP_BINDING === 'true') {
      if (session.ipAddress !== ipAddress) {
        throw new Error('Session IP mismatch');
      }
    }

    return session;
  }

  // Mark session as used
  static async consumeSession(sessionId) {
    await AuthSession.updateOne(
      { sessionId },
      {
        $set: {
          used: true,
          usedAt: new Date()
        },
        $inc: { attempts: 1 },
        $currentDate: { lastAttemptAt: true }
      }
    );
  }

  // Create temp session for new users (before username selection)
  static async createTempUserSession({ email, name, picture, providerId, ipAddress }) {
    const tempToken = crypto.randomUUID();

    await AuthSession.create({
      sessionId: tempToken,
      type: 'temp_google_data',
      tempUserData: { email, name, picture, providerId },
      ipAddress,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    return tempToken;
  }

  // Get and delete temp session
  static async getTempSession(tempToken) {
    const session = await AuthSession.findOneAndDelete({
      sessionId: tempToken,
      type: 'temp_google_data',
      expiresAt: { $gt: new Date() }
    });

    return session?.tempUserData;
  }
}

module.exports = PKCEService;
