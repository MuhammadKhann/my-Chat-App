import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

function RedirectCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Authentication was cancelled or failed.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code || !state) {
      setError('Invalid authentication response.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const completeAuth = async () => {
      try {
        const sessionId = sessionStorage.getItem('pkce_session_id');

        const response = await fetch(
          api('/api/auth/pkce/complete?mode=redirect'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, state, sessionId }),
            credentials: 'include',
          }
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Authentication failed');
        }

        if (result.requiresUsername) {
          // Store temp data and redirect to username flow
          sessionStorage.setItem('oauth_pending', JSON.stringify(result));
          sessionStorage.removeItem('pkce_session_id');
          navigate('/login?oauth=pending');
        } else if (result.user) {
          // Success - store and go to chat
          localStorage.setItem('chatAppToken', result.token);
          localStorage.setItem('chatAppUser', JSON.stringify(result.user));
          sessionStorage.removeItem('pkce_session_id');
          navigate('/chat');
        }
      } catch (err) {
        console.error('Auth completion error:', err);
        setError('Failed to complete authentication.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    completeAuth();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        gap: '16px'
      }}>
        <div style={{ color: '#dc2626' }}>{error}</div>
        <div>Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}>Completing sign in...</div>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #4285F4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto',
        }} />
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default RedirectCallback;
