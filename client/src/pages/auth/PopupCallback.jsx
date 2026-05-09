import { useEffect } from 'react';

function PopupCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (window.opener) {
      if (error) {
        window.opener.postMessage({
          type: 'OAUTH_CALLBACK',
          payload: { error, state },
        }, window.location.origin);
      } else if (code && state) {
        window.opener.postMessage({
          type: 'OAUTH_CALLBACK',
          payload: { code, state },
        }, window.location.origin);
      }

      // Close this window
      window.close();
    } else {
      // Direct access (shouldn't happen) - redirect to login
      window.location.href = '/login';
    }
  }, [searchParams]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <p>Completing authentication...</p>
    </div>
  );
}

export default PopupCallback;
