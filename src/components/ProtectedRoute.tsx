import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// MFA is required for ALL routes when enabled - no exemptions
// Only these routes don't trigger MFA redirect (they handle it themselves)
const MFA_SELF_HANDLING_ROUTES = ['/mfa-setup', '/mfa-verify', '/auth'];

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, mfaVerified, validateMfaSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState<boolean | null>(null);
  const [checkingMfa, setCheckingMfa] = useState(true);
  const [mfaValidating, setMfaValidating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (user && !loading) {
      // Check if user has MFA enabled and if enrollment is required
      const checkMfaStatus = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('mfa_enabled, mfa_enrollment_required')
          .eq('user_id', user.id)
          .single();
        
        // Default mfa_enrollment_required to true for security
        setMfaEnabled(data?.mfa_enabled || false);
        setMfaEnrollmentRequired(data?.mfa_enrollment_required ?? true);
        setCheckingMfa(false);
      };
      
      checkMfaStatus();
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

    if (!checkingMfa && user) {
      // SECURITY: If MFA is not enabled but enrollment is required, force setup
      // This catches all users who haven't set up MFA yet
      if (!mfaEnabled && mfaEnrollmentRequired !== false) {
        console.log('🔒 MFA not enabled but required, redirecting to setup');
        navigate("/mfa-setup");
        return;
      }

      // If MFA is enabled but not verified in current session, require verification
      // BUT wait for validation to complete if we have a token in localStorage
      if (mfaEnabled && !mfaVerified) {
        const hasStoredToken = localStorage.getItem('mfa_session_data');
        
        if (hasStoredToken && !mfaValidating) {
          // Token exists but not verified yet - trigger validation and wait
          console.log('🔄 MFA token found, validating session...');
          setMfaValidating(true);
          validateMfaSession().then((isValid) => {
            setMfaValidating(false);
            // If validation failed and we're not on a self-handling route, redirect
            if (!isValid) {
              const isSelfHandlingRoute = MFA_SELF_HANDLING_ROUTES.some(route => 
                location.pathname === route || location.pathname.startsWith(route + '/')
              );
              if (!isSelfHandlingRoute) {
                console.log('🔒 MFA validation failed, redirecting to verification');
                navigate("/mfa-verify");
              }
            }
          });
          return; // Don't redirect yet, wait for validation
        }
        
        // Only redirect if no token exists (never verified) or validation just failed
        if (!hasStoredToken) {
          console.log('🔒 MFA enabled but not verified and no token, redirecting to verification');
          navigate("/mfa-verify");
          return;
        }
      }
    }
  }, [user, mfaEnabled, mfaEnrollmentRequired, mfaVerified, checkingMfa, navigate, location, mfaValidating, validateMfaSession]);

  if (loading || checkingMfa || mfaValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-md">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-body-sm text-muted-foreground">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
