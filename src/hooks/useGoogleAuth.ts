import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const getClientId = () => localStorage.getItem("GOOGLE_CLIENT_ID") || import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

declare global {
  interface Window {
    google: any;
  }
}

export function useGoogleAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    loadGoogleAPI();
  }, []);

  const loadGoogleAPI = () => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleAuth;
    document.body.appendChild(script);
  };

  const initializeGoogleAuth = async () => {
    const clientId = getClientId();
    if (!clientId) {
      logger.error('Google Client ID not configured');
      setIsLoading(false);
      return;
    }

    // Check for existing token
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const storedToken = localStorage.getItem(`google_token_${user.id}`);
      if (storedToken) {
        setAccessToken(storedToken);
        setIsAuthenticated(true);
      }
    }
    
    setIsLoading(false);
  };

  const signIn = () => {
    const clientId = getClientId();
    if (!clientId) {
      // Silent return - the UI will handle showing the setup dialog
      return;
    }
    
    if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        // Use 'popup' UX mode which works better with iframe restrictions
        ux_mode: 'popup',
        callback: (response: any) => {
          if (response.access_token) {
            setAccessToken(response.access_token);
            setIsAuthenticated(true);
            storeToken(response.access_token);
          }
        },
        error_callback: (error: any) => {
          logger.error('Google OAuth error:', error);
          // If popup is blocked, inform user to try from published URL
          if (error?.type === 'popup_closed' || error?.type === 'popup_failed_to_open') {
            alert('Popup was blocked. Please try accessing this feature from the published URL directly in your browser, not the preview iframe.');
          }
        },
      });
      client.requestAccessToken();
    }
  };

  const signOut = () => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setIsAuthenticated(false);
        removeStoredToken();
      });
    }
  };

  const storeToken = async (token: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`google_token_${user.id}`, token);
    }
  };

  const removeStoredToken = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.removeItem(`google_token_${user.id}`);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    accessToken,
    signIn,
    signOut,
  };
}
