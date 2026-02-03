import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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
    localStorage.setItem(MFA_SESSION_KEY, JSON.stringify({ 
      token, 
      expiresAt,
      storedAt: new Date().toISOString()
    }));
  } else {
    localStorage.removeItem(MFA_SESSION_KEY);
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
  setMfaVerifiedStatus: (verified: boolean, sessionToken?: string, expiresAt?: string) => void;
  validateMfaSession: (currentUser?: User) => Promise<boolean>;
  refreshMfaStatus: () => void;
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
  // Initialize from sessionStorage for instant navigation (no waiting for DB)
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(() => {
    const cached = sessionStorage.getItem('mfa_status_cache');
    if (cached) {
      try {
        return JSON.parse(cached).mfaEnabled ?? null;
      } catch { return null; }
    }
    return null;
  });
  const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState<boolean | null>(() => {
    const cached = sessionStorage.getItem('mfa_status_cache');
    if (cached) {
      try {
        return JSON.parse(cached).mfaEnrollmentRequired ?? null;
      } catch { return null; }
    }
    return null;
  });
  // Only show loading if we have NO cached data at all
  const [mfaStatusLoading, setMfaStatusLoading] = useState(() => {
    return !sessionStorage.getItem('mfa_status_cache');
  });
  
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
  const validateMfaSession = async (currentUser?: User): Promise<boolean> => {
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
        const reason = data?.reason || error?.message;
        logger.debug('Validation failed', { reason });
        
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
  const fetchMfaStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('mfa_enabled, mfa_enrollment_required')
        .eq('user_id', userId)
        .single();
      
      const enabled = data?.mfa_enabled || false;
      const enrollmentRequired = data?.mfa_enrollment_required ?? true;
      
      setMfaEnabled(enabled);
      setMfaEnrollmentRequired(enrollmentRequired);
      
      // Cache in sessionStorage for instant page loads
      sessionStorage.setItem('mfa_status_cache', JSON.stringify({
        mfaEnabled: enabled,
        mfaEnrollmentRequired: enrollmentRequired,
        userId: userId,
        cachedAt: Date.now()
      }));
    } catch (err) {
      logger.error('Error fetching MFA status:', err);
      setMfaEnabled(false);
      setMfaEnrollmentRequired(true);
    } finally {
      setMfaStatusLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch role and MFA status in parallel - only once per session
        setRoleLoading(true);
        fetchUserRole(session.user.id);
        fetchMfaStatus(session.user.id);
        
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
    logger.debug('Setting MFA status', { verified });
    setMfaVerified(verified);
    if (verified && sessionToken && expiresAt) {
      setMfaSessionToken(sessionToken, expiresAt);
      setSkipNextValidation(true); // Skip immediate re-validation
      
      // Prefetch task data immediately after MFA verification for instant navigation
      logger.debug('Prefetching task data after MFA verification');
      prefetchTasksData();
    } else {
      setMfaSessionToken(null);
    }
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
        userId: user.id,
        cachedAt: Date.now()
      }));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMfaSessionToken(null);
    setMfaVerified(false);
    // Clear MFA status cache on logout
    sessionStorage.removeItem('mfa_status_cache');
    setMfaEnabled(null);
    setMfaEnrollmentRequired(null);
    navigate("/auth");
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
        validateMfaSession: async () => false,
        setMfaVerifiedStatus: () => {},
        refreshMfaStatus: () => {},
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
        validateMfaSession,
        setMfaVerifiedStatus,
        refreshMfaStatus,
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
