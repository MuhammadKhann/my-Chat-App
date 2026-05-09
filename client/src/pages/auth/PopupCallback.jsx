import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function PopupCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

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
