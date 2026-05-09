import { api, fetchWithAuth } from './api';

class AuthService {
  constructor() {
    this.currentTier = null;
    this.abortControllers = new Map();
  }

  // Cancel pending requests
  abort(tier) {
    if (this.abortControllers.has(tier)) {
      this.abortControllers.get(tier).abort();
      this.abortControllers.delete(tier);
    }
  }

  // Tier 1: PKCE Popup Flow
  async initiatePKCEPopup() {
    this.abort('popup');
    const controller = new AbortController();
    this.abortControllers.set('popup', controller);

    try {
      const response = await fetch(api('/api/auth/pkce/initiate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredMode: 'popup' }),
        signal: controller.signal,
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate auth');
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('AUTH_ABORTED');
      }
      throw error;
    }
  }

  // Open popup with proper sizing and monitoring
  openAuthPopup(authUrl) {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'oauthPopup',
      `width=${width},height=${height},left=${left},top=${top},` +
      `toolbar=no,menubar=no,scrollbars=yes,resizable=yes,location=yes,status=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      throw new Error('POPUP_BLOCKED');
    }

    return popup;
  }

  // Wait for popup callback
  async waitForPopupCallback(popup, timeout = 120000) {
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          clearTimeout(timeoutId);
          reject(new Error('POPUP_CLOSED'));
        }
      }, 500);

      const timeoutId = setTimeout(() => {
        clearInterval(checkClosed);
        popup.close();
        reject(new Error('POPUP_TIMEOUT'));
      }, timeout);

      // Listen for message from callback page
      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'OAUTH_CALLBACK') {
          clearInterval(checkClosed);
          clearTimeout(timeoutId);
          window.removeEventListener('message', handleMessage);
          popup.close();
          resolve(event.data.payload);
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }

  // Complete PKCE flow
  async completePKCE({ code, state, sessionId, mode }) {
    const response = await fetch(
      api(`/api/auth/pkce/complete?mode=${mode}`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state, sessionId }),
        credentials: 'include',
      }
    );

    return await response.json();
  }

  // Complete registration with username
  async completeOAuthRegistration(tempToken, username) {
    const response = await fetch(api('/api/auth/oauth/complete-registration'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken, username }),
      credentials: 'include',
    });

    return await response.json();
  }
}

export default new AuthService();
