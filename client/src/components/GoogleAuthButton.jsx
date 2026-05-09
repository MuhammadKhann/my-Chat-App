import React, { useState, useCallback, useEffect } from 'react';
import authService from '../services/authService';
import { api } from '../services/api';

const TIERS = {
  PKCE_POPUP: 'pkce_popup',
  PKCE_REDIRECT: 'pkce_redirect',
  LEGACY: 'legacy',
  MANUAL: 'manual',
};

const ERROR_MESSAGES = {
  POPUP_BLOCKED: 'Popup was blocked. Please allow popups for this site.',
  POPUP_CLOSED: 'Authentication was cancelled.',
  POPUP_TIMEOUT: 'Authentication timed out. Please try again.',
  AUTH_ABORTED: 'Authentication was interrupted.',
  INIT_FAILED: 'Failed to start authentication. Please try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a few minutes.',
  NETWORK_ERROR: 'Network connection failed. Please check your internet.',
  FALLBACK_TRIGGERED: 'Using alternative sign-in method...',
};

const GoogleAuthButton = ({
  onSuccess,
  onError,
  onUsernameRequired,
  style,
}) => {
  const [tier, setTier] = useState(TIERS.PKCE_POPUP);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fallbackMessage, setFallbackMessage] = useState(null);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Main authentication handler
  const handleAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFallbackMessage(null);

    try {
      // Tier 1: PKCE Popup
      if (tier === TIERS.PKCE_POPUP) {
        try {
          const { authUrl, sessionId, state } =
            await authService.initiatePKCEPopup();

          const popup = authService.openAuthPopup(authUrl);
          const callback = await authService.waitForPopupCallback(popup);

          const result = await authService.completePKCE({
            code: callback.code,
            state,
            sessionId,
            mode: 'popup',
          });

          handleResult(result);
          return;
        } catch (err) {
          console.log('PKCE Popup failed:', err.message);

          // Trigger fallback to redirect mode
          if (err.message === 'POPUP_BLOCKED') {
            setFallbackMessage(ERROR_MESSAGES.FALLBACK_TRIGGERED);
            setTier(TIERS.PKCE_REDIRECT);
            // Auto-trigger redirect after short delay
            setTimeout(() => handleAuth(), 1500);
            return;
          }

          // Other popup errors - fall through to redirect
          setTier(TIERS.PKCE_REDIRECT);
          return handleAuth();
        }
      }

      // Tier 2: PKCE Redirect
      if (tier === TIERS.PKCE_REDIRECT) {
        const response = await fetch(
          api('/api/auth/pkce/initiate'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferredMode: 'redirect' }),
            credentials: 'include',
          }
        );

        const data = await response.json();

        if (data.success && data.authUrl) {
          // Store sessionId for retrieval after redirect
          sessionStorage.setItem('pkce_session_id', data.sessionId);
          // Full page navigation
          window.location.href = data.authUrl;
          return; // Never reaches here
        }

        throw new Error('INIT_FAILED');
      }

      // Tier 3: Legacy (should not reach here)
      if (tier === TIERS.LEGACY) {
        onError?.('Legacy fallback not implemented');
        return;
      }

    } catch (err) {
      console.error('Auth error:', err);
      const message = ERROR_MESSAGES[err.message] ||
        'Authentication failed. Please try again.';
      setError(message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [tier, onSuccess, onError, onUsernameRequired]);

  const handleResult = (result) => {
    if (!result.success) {
      // Handle specific error codes
      if (result.code === 'USERNAME_TAKEN') {
        setError('That username is taken. Please choose another.');
        return;
      }
      if (result.code === 'RATE_LIMITED') {
        setError(ERROR_MESSAGES.RATE_LIMITED);
        return;
      }

      throw new Error(result.code || 'UNKNOWN_ERROR');
    }

    if (result.requiresUsername) {
      onUsernameRequired?.(result);
    } else if (result.user) {
      onSuccess?.(result);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {fallbackMessage && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '8px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#0369a1',
        }}>
          {fallbackMessage}
        </div>
      )}

      {error && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '8px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleAuth}
        disabled={loading}
        style={{
          width: '100%',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: '#ffffff',
          border: '1px solid #dadce0',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          color: '#3c4043',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.7 : 1,
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(60,64,67,0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {loading ? (
          <span>Connecting...</span>
        ) : (
          <>
            <GoogleIcon />
            <span>Sign in with Google</span>
          </>
        )}
      </button>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default GoogleAuthButton;
