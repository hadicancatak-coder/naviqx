import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReviewerSession {
  name: string;
  email: string;
}

type PageType = 'campaign_review' | 'lp_map';

const STORAGE_KEY_PREFIX = 'reviewer_session_';

/**
 * Hook for managing reviewer identity sessions.
 * Uses localStorage for persistence and syncs to database for cross-device support.
 */
export const useReviewerSession = (pageType: PageType, accessToken?: string) => {
  const [session, setSession] = useState<ReviewerSession | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = `${STORAGE_KEY_PREFIX}${pageType}`;

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // First check localStorage for instant load
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as ReviewerSession;
          if (parsed.name && parsed.email) {
            setSession(parsed);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Ignore localStorage errors
      }

      // If no localStorage, try database (for cross-device support)
      try {
        // Use a fingerprint based on access token if available
        const fingerprint = accessToken || 'anonymous';
        
        const { data } = await supabase
          .from('external_reviewer_sessions')
          .select('reviewer_name, reviewer_email')
          .eq('page_type', pageType)
          .eq('ip_address', fingerprint)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const sessionData = { name: data.reviewer_name, email: data.reviewer_email };
          setSession(sessionData);
          // Also save to localStorage for faster future loads
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
        }
      } catch {
        // Ignore database errors, user can still identify manually
      }

      setLoading(false);
    };

    checkSession();
  }, [pageType, accessToken, storageKey]);

  // Save session to both localStorage and database
  const saveSession = useCallback(async (name: string, email: string) => {
    const sessionData: ReviewerSession = { name, email };
    
    // Save to localStorage immediately
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessionData));
    } catch {
      // Ignore localStorage errors
    }
    
    setSession(sessionData);

    // Sync to database for cross-device support
    try {
      const fingerprint = accessToken || 'anonymous';
      
      await supabase.from('external_reviewer_sessions').upsert(
        {
          ip_address: fingerprint,
          reviewer_name: name,
          reviewer_email: email,
          page_type: pageType,
          access_token: accessToken || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'ip_address,page_type',
        }
      );
    } catch {
      // Database sync is best-effort, local session is already saved
    }
  }, [pageType, accessToken, storageKey]);

  // Clear session (for logout/reset)
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore errors
    }
    setSession(null);
  }, [storageKey]);

  return {
    session,
    loading,
    saveSession,
    clearSession,
    hasSession: !!session,
    reviewerName: session?.name || '',
    reviewerEmail: session?.email || '',
  };
};
