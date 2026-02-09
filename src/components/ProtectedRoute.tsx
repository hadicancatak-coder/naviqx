import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

// MFA is required for ALL routes when enabled - no exemptions
// Only these routes don't trigger MFA redirect (they handle it themselves)
const MFA_SELF_HANDLING_ROUTES = ['/mfa-setup', '/mfa-verify', '/auth'];

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { 
    user, 
    loading, 
    mfaVerified,
    mfaEnabled,
    mfaEnrollmentRequired,
    mfaStatusLoading
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

    // Wait for MFA status to be loaded from context (only on initial load)
    if (mfaStatusLoading || !user) {
      return;
    }

    // SECURITY: If MFA is explicitly disabled but enrollment is required, force setup
    // Use === false to avoid redirecting when mfaEnabled is null (still loading)
    if (mfaEnabled === false && mfaEnrollmentRequired !== false) {
      logger.debug('MFA explicitly disabled but required, redirecting to setup');
      navigate("/mfa-setup");
      return;
    }

    // If MFA is enabled but not verified, check localStorage token with proper validation
    if (mfaEnabled && !mfaVerified) {
      const storedData = localStorage.getItem('mfa_session_data');
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          const isValid = parsed.token && 
                          parsed.expiresAt && 
                          new Date(parsed.expiresAt) > new Date();
          
          if (isValid) {
            // Valid token exists - trust it and skip redirect
            logger.debug('Valid MFA token in localStorage, allowing access');
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
  }, [user, mfaEnabled, mfaEnrollmentRequired, mfaVerified, mfaStatusLoading, navigate, location]);

  // ALWAYS render children immediately - no loading states, no null returns
  // Auth redirects happen asynchronously via useEffect above
  return <>{children}</>;
};
