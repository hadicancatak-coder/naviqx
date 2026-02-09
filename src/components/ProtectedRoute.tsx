import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

// MFA is required for ALL routes when enabled - no exemptions
// Only these routes don't trigger MFA redirect (they handle it themselves)
const MFA_SELF_HANDLING_ROUTES = ['/mfa-setup', '/mfa-verify', '/auth', '/change-password', '/reset-password'];

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { 
    user, 
    loading, 
    mfaVerified,
    mfaEnabled,
    mfaEnrollmentRequired,
    mfaStatusLoading,
    forcePasswordReset,
    forcePasswordResetLoading,
    setMfaVerifiedStatus
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Skip MFA check for self-handling routes
    const isSelfHandlingRoute = MFA_SELF_HANDLING_ROUTES.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    );
    
    if (isSelfHandlingRoute) {
      return;
    }

    // Wait for all status to be loaded from context (only on initial load)
    if (mfaStatusLoading || forcePasswordResetLoading || !user) {
      return;
    }

    // Defensive null check: if mfaEnabled is still null after loading, defer redirect
    // This handles edge cases where fetchMfaStatus failed or is still in progress
    if (mfaEnabled === null) {
      logger.debug('mfaEnabled is null after loading - deferring redirect');
      return;
    }

    // PRIORITY 1: Check force password reset FIRST (before MFA)
    if (forcePasswordReset) {
      logger.debug('Force password reset required, redirecting to change-password');
      navigate("/change-password");
      return;
    }

    // PRIORITY 2: SECURITY: If MFA is explicitly disabled but enrollment is required, force setup
    // Use === false to avoid redirecting when mfaEnabled is null (still loading)
    if (mfaEnabled === false && mfaEnrollmentRequired !== false) {
      logger.debug('MFA explicitly disabled but required, redirecting to setup');
      navigate("/mfa-setup");
      return;
    }

    // PRIORITY 3: If MFA is enabled but not verified, check localStorage token with proper validation
    if (mfaEnabled && !mfaVerified) {
      const storedData = localStorage.getItem('mfa_session_data');
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const isValid = parsed.token && 
                          parsed.expiresAt && 
                          new Date(parsed.expiresAt) > new Date();
          
          if (isValid) {
            // ISSUE 2 FIX: Sync React state with valid localStorage token
            logger.debug('Valid MFA token in localStorage, syncing state and allowing access');
            setMfaVerifiedStatus(true, parsed.token, parsed.expiresAt);
            return;
          }
          
          // Token expired - clean up
          logger.debug('MFA token expired, cleaning up');
          localStorage.removeItem('mfa_session_data');
        } catch {
          // Malformed data - clean up
          logger.debug('Malformed MFA token data, cleaning up');
          localStorage.removeItem('mfa_session_data');
        }
      }
      
      // No valid token - redirect to verify
      logger.debug('MFA enabled but no valid token, redirecting to verification');
      navigate("/mfa-verify");
      return;
    }
  }, [user, mfaEnabled, mfaEnrollmentRequired, mfaVerified, mfaStatusLoading, forcePasswordReset, forcePasswordResetLoading, navigate, location, setMfaVerifiedStatus]);

  // ALWAYS render children immediately - no loading states, no null returns
  // Auth redirects happen asynchronously via useEffect above
  return <>{children}</>;
};
