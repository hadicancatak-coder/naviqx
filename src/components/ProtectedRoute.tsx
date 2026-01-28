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

    // If MFA is enabled but not verified, check localStorage token
    if (mfaEnabled && !mfaVerified) {
      const hasStoredToken = localStorage.getItem('mfa_session_data');
      
      if (hasStoredToken) {
        // Token exists - trust it immediately, validate in background
        logger.debug('MFA token found in localStorage, proceeding');
        return;
      }
      
      // No token at all - redirect to verify
      logger.debug('MFA enabled but no token, redirecting to verification');
      navigate("/mfa-verify");
      return;
    }
  }, [user, mfaEnabled, mfaEnrollmentRequired, mfaVerified, mfaStatusLoading, navigate, location]);

  // ALWAYS render children immediately - no loading states, no null returns
  // Auth redirects happen asynchronously via useEffect above
  return <>{children}</>;
};
