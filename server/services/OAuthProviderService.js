const { OAuth2Client } = require('google-auth-library');

class OAuthProviderService {
  constructor() {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens({ code, codeVerifier, redirectUri }) {
    const { tokens } = await this.googleClient.getToken({
      code,
      codeVerifier,
      redirect_uri: redirectUri,
    });

    return tokens; // { id_token, access_token, refresh_token, expiry_date }
  }

  // Verify ID token locally (no HTTP call)
  async verifyIdToken(idToken) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    return ticket.getPayload(); // { email, name, picture, sub, ... }
  }

  // Get user info from access token (fallback)
  async getUserInfo(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return await response.json();
  }
}

module.exports = new OAuthProviderService();
