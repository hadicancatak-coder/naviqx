import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// MFA is required for ALL routes when enabled - no exemptions
// Only these routes don't trigger MFA redirect (they handle it themselves)
const MFA_SELF_HANDLING_ROUTES = ['/mfa-setup', '/mfa-verify', '/auth'];

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, mfaVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState<boolean | null>(null);
  const [checkingMfa, setCheckingMfa] = useState(true);

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
      if (!mfaEnabled && mfaEnrollmentRequired !== false) {
        console.log('🔒 MFA not enabled but required, redirecting to setup');
        navigate("/mfa-setup");
        return;
      }

      // If MFA is enabled but not verified, check localStorage token
      if (mfaEnabled && !mfaVerified) {
        const hasStoredToken = localStorage.getItem('mfa_session_data');
        
        if (hasStoredToken) {
          // Token exists - trust it immediately, validate in background
          // Background validation in AuthContext will redirect if invalid
          console.log('✅ MFA token found in localStorage, proceeding');
          return;
        }
        
        // No token at all - redirect to verify
        console.log('🔒 MFA enabled but no token, redirecting to verification');
        navigate("/mfa-verify");
        return;
      }
    }
  }, [user, mfaEnabled, mfaEnrollmentRequired, mfaVerified, checkingMfa, navigate, location]);

  // Only block on initial auth check and MFA status check - NOT on background validation
  if (loading || checkingMfa) {
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
