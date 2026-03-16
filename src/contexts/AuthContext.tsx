import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { prefetchTasksData } from "@/lib/taskPrefetch";
import { logger } from "@/lib/logger";

// MFA session token storage with expiry
const MFA_SESSION_KEY = 'mfa_session_data';

const getMfaSessionToken = (): string | null => {
  const data = localStorage.getItem(MFA_SESSION_KEY);
  if (!data) return null;
  
  try {
    const { token, expiresAt } = JSON.parse(data);
    // Check if expired locally before server validation
    if (new Date(expiresAt) < new Date()) {
      localStorage.removeItem(MFA_SESSION_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

const setMfaSessionToken = (token: string | null, expiresAt?: string): void => {
  if (token && expiresAt) {
    // Synchronous write to localStorage - MUST complete before navigation
    const data = JSON.stringify({ 
      token, 
      expiresAt,
      storedAt: new Date().toISOString()
    });
    localStorage.setItem(MFA_SESSION_KEY, data);
    logger.debug('MFA token stored in localStorage');
  } else {
    localStorage.removeItem(MFA_SESSION_KEY);
    logger.debug('MFA token removed from localStorage');
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  userRole: "admin" | "member" | null;
  mfaVerified: boolean;
  mfaEnabled: boolean | null;
  mfaEnrollmentRequired: boolean | null;
  mfaStatusLoading: boolean;
  forcePasswordReset: boolean;
  forcePasswordResetLoading: boolean;
  setMfaVerifiedStatus: (verified: boolean, sessionToken?: string, expiresAt?: string) => void;
  validateMfaSession: (currentUser?: User) => Promise<boolean>;
  refreshMfaStatus: () => void;
  clearForcePasswordReset: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // ALL hooks must be called before any conditional returns
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "member" | null>(null);
  // Initialize mfaVerified immediately from localStorage to prevent race conditions
  const [mfaVerified, setMfaVerified] = useState<boolean>(() => {
    const sessionToken = getMfaSessionToken();
    return !!sessionToken; // Trust local token immediately for faster rendering
  });
  const [skipNextValidation, setSkipNextValidation] = useState(false);
  
  // MFA status caching - fetched once per session, not on every navigation
  // NOTE: We don't initialize from cache here - we validate userId first in useEffect
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState<boolean | null>(null);
  // Start with loading=true since we need to validate cache
  const [mfaStatusLoading, setMfaStatusLoading] = useState(true);
  
  // Force password reset state
  const [forcePasswordReset, setForcePasswordReset] = useState(false);
  const [forcePasswordResetLoading, setForcePasswordResetLoading] = useState(true);
  
  const roleCache = useRef<Map<string, "admin" | "member">>(new Map());
  const lastActivityTime = useRef<number>(Date.now());
  
  // Check for public access pages - must be after hooks
  const isPublicAccessPage = location.pathname.startsWith('/review/') ||
                             location.pathname.startsWith('/campaigns-log/review/') || 
                             location.pathname.startsWith('/campaigns-log/external/') ||
                             location.pathname.startsWith('/knowledge/public/') ||
                             location.pathname.startsWith('/projects/public/') ||
                             location.pathname.startsWith('/lp-planner/public/');

  // Validate MFA session with server - Phase 1: Fix closure race condition
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const validateMfaSession = useCallback(async (currentUser?: User): Promise<boolean> => {
    const userToCheck = currentUser || user;
    
    if (skipNextValidation) {
      logger.debug('Skipping validation (just verified)');
      setSkipNextValidation(false);
      return true;
    }

    const sessionToken = getMfaSessionToken();
    
    logger.debug('Validating MFA session', { 
      hasToken: !!sessionToken, 
      hasUser: !!userToCheck 
    });

    if (!sessionToken || !userToCheck) {
      logger.debug('No token or user');
      setMfaVerified(false);
      return false;
    }

    // Phase 3: Skip validation if user was active recently (within 5 minutes)
    const idleTime = Date.now() - lastActivityTime.current;
    const SKIP_VALIDATION_THRESHOLD = 5 * 60 * 1000; // 5 minutes - trust local token if active
    
    // If user was active recently and we already verified, trust the local token
    if (idleTime < SKIP_VALIDATION_THRESHOLD && mfaVerified) {
      logger.debug('User active recently, skipping validation (using cached result)');
      return true;
    }
    
    // Update activity timestamp
    lastActivityTime.current = Date.now();

    try {
      const startTime = performance.now();
      
      const { data, error } = await supabase.functions.invoke('manage-mfa-session', {
        body: { 
          action: 'validate',
          sessionToken 
        }
      });

      const validationTime = performance.now() - startTime;
      
      logger.debug('Validation response', { 
        error: error?.message, 
        valid: data?.valid,
        reason: data?.reason,
        sameIp: data?.sameIp,
        timeMs: validationTime.toFixed(2)
      });

      if (error || !data?.valid) {
        const reason = data?.reason || error?.message || '';
        logger.debug('Validation failed', { reason });
        
        // CRITICAL: If auth session is invalid (401 from edge function), sign out completely
        // This handles cases where JWT references a session that no longer exists
        if (reason.includes('Unauthorized') || reason.includes('Auth session missing') || reason.includes('session_not_found')) {
          logger.warn('Auth session invalid - signing out user');
          setMfaSessionToken(null);
          setMfaVerified(false);
          sessionStorage.removeItem('mfa_status_cache');
          // Use setTimeout to avoid calling signOut during render
          setTimeout(async () => {
            await supabase.auth.signOut();
            window.location.href = '/auth';
          }, 0);
          return false;
        }
        
        // SECURITY: If IP mismatch, clear token and require re-verification
        if (reason === 'ip_mismatch') {
          logger.debug('IP address changed - requiring re-verification');
        }
        setMfaSessionToken(null);
        setMfaVerified(false);
        return false;
      }

      // Phase 5: Auto-refresh if expiring soon (< 1 hour remaining)
      if (data?.expiresAt) {
        const expiryTime = new Date(data.expiresAt).getTime();
        const timeRemaining = expiryTime - Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        
        if (timeRemaining < ONE_HOUR && timeRemaining > 0) {
          logger.debug('Session expiring soon, refreshing...');
          try {
            const { data: refreshData } = await supabase.functions.invoke('manage-mfa-session', {
              body: { 
                action: 'refresh',
                sessionToken 
              }
            });
            
            if (refreshData?.sessionToken && refreshData?.expiresAt) {
              setMfaSessionToken(refreshData.sessionToken, refreshData.expiresAt);
              logger.debug('Session refreshed successfully');
            }
          } catch (refreshErr) {
            logger.warn('Session refresh failed', { error: refreshErr });
          }
        }
      }

      logger.debug('MFA session valid');
      setMfaVerified(true);
      return true;
    } catch (err) {
      logger.error('Validation error', { error: err });
      setMfaSessionToken(null);
      setMfaVerified(false);
      return false;
    }
  };

  // Fetch MFA status once per session - cached in context AND sessionStorage
  // Validate and load MFA status from cache or fetch from DB
  const loadMfaStatusFromCacheOrFetch = (userId: string) => {
    const cached = sessionStorage.getItem('mfa_status_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // CRITICAL: Validate that cache belongs to current user
        if (parsed.userId === userId) {
          logger.debug('Using cached MFA status for user', { userId: userId.substring(0, 8) });
          setMfaEnabled(parsed.mfaEnabled ?? null);
          setMfaEnrollmentRequired(parsed.mfaEnrollmentRequired ?? null);
          setForcePasswordReset(parsed.forcePasswordReset ?? false);
          setMfaStatusLoading(false);
          setForcePasswordResetLoading(false);
          return; // Valid cache found, no need to fetch
        } else {
          // Cache belongs to different user - clear it
          logger.debug('Clearing stale MFA cache from different user');
          sessionStorage.removeItem('mfa_status_cache');
        }
      } catch {
        sessionStorage.removeItem('mfa_status_cache');
      }
    }
    // No valid cache - fetch from DB
    fetchMfaStatus(userId);
  };

  const fetchMfaStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('mfa_enabled, mfa_enrollment_required, force_password_reset')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // ISSUE 6 FIX: On network error, don't force setup - keep null state
        logger.error('Error fetching MFA status:', error);
        // Only set to false/true if we have no existing state
        if (mfaEnabled === null) {
          // Keep null to indicate unknown state - don't force setup
          setMfaStatusLoading(false);
          setForcePasswordResetLoading(false);
        }
        return;
      }
      
      const enabled = data?.mfa_enabled || false;
      const enrollmentRequired = data?.mfa_enrollment_required ?? true;
      const passwordReset = data?.force_password_reset || false;
      
      setMfaEnabled(enabled);
      setMfaEnrollmentRequired(enrollmentRequired);
      setForcePasswordReset(passwordReset);
      
      // Cache in sessionStorage with userId for validation
      sessionStorage.setItem('mfa_status_cache', JSON.stringify({
        mfaEnabled: enabled,
        mfaEnrollmentRequired: enrollmentRequired,
        forcePasswordReset: passwordReset,
        userId: userId,
        cachedAt: Date.now()
      }));
    } catch (err) {
      // ISSUE 6 FIX: Network error - don't default to forcing setup
      logger.error('Error fetching MFA status:', err);
      // Keep loading false but don't change mfaEnabled state
    } finally {
      setMfaStatusLoading(false);
      setForcePasswordResetLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch role and validate/load MFA status in parallel - only once per session
        setRoleLoading(true);
        fetchUserRole(session.user.id);
        loadMfaStatusFromCacheOrFetch(session.user.id);
        
        // Check if we have a valid session token in localStorage
        const sessionToken = getMfaSessionToken();
        if (sessionToken) {
          logger.debug('Found MFA session token in localStorage, setting verified=true');
          setMfaVerified(true);
          // Fire-and-forget background validation - don't block render
          setTimeout(() => validateMfaSession(session.user), 50);
        } else {
          logger.debug('No MFA session token found');
          validateMfaSession(session.user);
        }
      } else {
        // No user - reset MFA status
        setMfaStatusLoading(false);
      }
      
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setRoleLoading(true);
          fetchUserRole(session.user.id);
          
          // Only validate on initial login, not on every state change - Phase 1: Pass user
          if (event === 'SIGNED_IN') {
            validateMfaSession(session.user);
          }
        } else {
          setUserRole(null);
          setRoleLoading(false);
          setMfaVerified(false);
          setMfaSessionToken(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic MFA validation (every 30 minutes) - reduced frequency for once-per-day MFA
  useEffect(() => {
    if (!user || !mfaVerified) return;

    const interval = setInterval(() => {
      validateMfaSession(user);
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mfaVerified]);

  // Phase 6: Enhanced debug logging - State transition tracker
  useEffect(() => {
    logger.debug('Auth State Transition', {
      userId: user?.id?.substring(0, 8),
      email: user?.email,
      mfaVerified,
      hasToken: !!getMfaSessionToken(),
      currentRoute: location.pathname
    });
  }, [user, mfaVerified, location.pathname]);

  const fetchUserRole = async (userId: string) => {
    if (roleCache.current.has(userId)) {
      setUserRole(roleCache.current.get(userId) || null);
      setRoleLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data) {
      const role = data.role as "admin" | "member";
      setUserRole(role);
      roleCache.current.set(userId, role);
    } else {
      setUserRole(null);
    }
    
    setRoleLoading(false);
  };

  const setMfaVerifiedStatus = (verified: boolean, sessionToken?: string, expiresAt?: string) => {
    logger.debug('Setting MFA status', { verified, hasToken: !!sessionToken });
    
    // CRITICAL: Write localStorage BEFORE state update to prevent race condition
    // ProtectedRoute checks localStorage synchronously, so it must be committed first
    if (verified && sessionToken && expiresAt) {
      setMfaSessionToken(sessionToken, expiresAt);
      setSkipNextValidation(true); // Skip immediate re-validation
      
      // Prefetch task data immediately after MFA verification for instant navigation
      logger.debug('Prefetching task data after MFA verification');
      prefetchTasksData();
    } else {
      setMfaSessionToken(null);
    }
    
    // State update happens AFTER localStorage is committed
    setMfaVerified(verified);
  };

  // Refresh MFA status after setup completes - updates cache immediately
  const refreshMfaStatus = () => {
    logger.debug('Refreshing MFA status cache - setting mfaEnabled=true');
    setMfaEnabled(true);
    
    // Update sessionStorage cache immediately
    if (user) {
      sessionStorage.setItem('mfa_status_cache', JSON.stringify({
        mfaEnabled: true,
        mfaEnrollmentRequired: true,
        forcePasswordReset: forcePasswordReset,
        userId: user.id,
        cachedAt: Date.now()
      }));
    }
  };

  // Clear force password reset flag after successful password change
  const clearForcePasswordReset = () => {
    logger.debug('Clearing force password reset flag');
    setForcePasswordReset(false);
    
    // Update sessionStorage cache
    if (user) {
      const cached = sessionStorage.getItem('mfa_status_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.forcePasswordReset = false;
          sessionStorage.setItem('mfa_status_cache', JSON.stringify(parsed));
        } catch {
          // Ignore parse errors
        }
      }
    }
  };

  const signOut = async () => {
    // CRITICAL: Clear all state SYNCHRONOUSLY before async operations
    // This prevents race conditions where stale cache persists during navigation
    setMfaSessionToken(null);
    setMfaVerified(false);
    sessionStorage.removeItem('mfa_status_cache');
    setMfaEnabled(null);
    setMfaEnrollmentRequired(null);
    
    // Now do async signout
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  // For public access pages, provide a simplified context without auth
  if (isPublicAccessPage) {
    logger.debug('Public access page detected, bypassing auth', { path: location.pathname });
    return (
      <AuthContext.Provider value={{
        user: null,
        session: null,
        loading: false,
        roleLoading: false,
        userRole: null,
        mfaVerified: false,
        mfaEnabled: false,
        mfaEnrollmentRequired: false,
        mfaStatusLoading: false,
        forcePasswordReset: false,
        forcePasswordResetLoading: false,
        validateMfaSession: async () => false,
        setMfaVerifiedStatus: () => {},
        refreshMfaStatus: () => {},
        clearForcePasswordReset: () => {},
        signOut: async () => {
          // Sign out on external review page is a no-op
        },
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        loading, 
        roleLoading, 
        userRole, 
        mfaVerified,
        mfaEnabled,
        mfaEnrollmentRequired,
        mfaStatusLoading,
        forcePasswordReset,
        forcePasswordResetLoading,
        validateMfaSession,
        setMfaVerifiedStatus,
        refreshMfaStatus,
        clearForcePasswordReset,
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
