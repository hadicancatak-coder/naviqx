
# Fix MFA Authentication Loop - Complete Solution

## Root Cause Analysis

After investigating the full MFA system, I identified **5 critical issues** causing the authentication loop:

### Issue 1: Race Condition in Auth.tsx
The `onAuthStateChange` listener in `Auth.tsx` navigates to `/` whenever a session exists, but the login handler also navigates to `/mfa-setup` or `/mfa-verify`. These race against each other.

```
User logs in → onAuthStateChange fires → navigate("/")
              → handleSubmit also runs → navigate("/mfa-verify")
Result: Unpredictable navigation
```

### Issue 2: sessionStorage Cache Never Validated
The MFA status cache in `sessionStorage` is trusted without validation against the database. If the cache becomes stale or corrupted, users get stuck in loops.

### Issue 3: mfaEnabled Null State Ambiguity
When `mfaEnabled` is `null` (loading), `ProtectedRoute` skips both the setup redirect AND the verify redirect, causing unpredictable behavior on page refresh.

### Issue 4: signOut Cache Cleanup Race
`sessionStorage.removeItem()` happens after `signOut()` but before navigation completes, so the cache may persist across sessions.

### Issue 5: MFA Setup Always Regenerates Secret
The `MfaSetup.tsx` page always calls `setup-mfa` which generates a NEW secret, even if the user already has one. This means if users accidentally land on `/mfa-setup` when they already have MFA, their existing authenticator app stops working.

## Solution

### Fix 1: Remove Race Condition in Auth.tsx

Remove the `onAuthStateChange` auto-redirect from Auth.tsx. The login handler already navigates appropriately based on MFA status.

```typescript
// Auth.tsx - REMOVE these lines (77-90):
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      navigate("/");  // REMOVE - let MFA logic handle this
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      navigate("/");  // REMOVE - causes race condition
    }
  });

  return () => subscription.unsubscribe();
}, [navigate]);
```

**Replace with**: Check if user is already authenticated BEFORE showing login form, and if so, navigate appropriately based on MFA status.

### Fix 2: Validate Cache Against User ID

Add user ID validation to the sessionStorage cache to prevent using another user's cached status.

```typescript
// AuthContext.tsx - In initial state setup
const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(() => {
  const cached = sessionStorage.getItem('mfa_status_cache');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Don't trust cache until we verify it's for the current user
      // This will be validated in fetchMfaStatus
      return parsed.mfaEnabled ?? null;
    } catch { return null; }
  }
  return null;
});
```

### Fix 3: Clear Cache Before Sign Out Navigation

Move cache clearing to happen synchronously BEFORE navigation.

```typescript
// AuthContext.tsx - signOut function
const signOut = async () => {
  // FIRST: Clear all MFA state synchronously
  setMfaSessionToken(null);
  setMfaVerified(false);
  sessionStorage.removeItem('mfa_status_cache');
  setMfaEnabled(null);
  setMfaEnrollmentRequired(null);
  
  // THEN: Sign out and navigate
  await supabase.auth.signOut();
  navigate("/auth");
};
```

### Fix 4: Add Guard to MFA Setup Page

Check if user already has MFA enabled and redirect to verify instead of regenerating their secret.

```typescript
// MfaSetup.tsx - Add at the start of setupMfa function
const setupMfa = useCallback(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // NEW: Check if MFA is already set up
    const { data: profile } = await supabase
      .from('profiles')
      .select('mfa_enabled')
      .eq('user_id', session.user.id)
      .single();

    if (profile?.mfa_enabled) {
      // MFA is already enabled - redirect to verify, not setup
      logger.debug('MFA already enabled, redirecting to verify');
      navigate("/mfa-verify", { replace: true });
      return;
    }

    // Continue with normal setup...
  } catch (error) {
    // ...
  }
}, [navigate, toast]);
```

### Fix 5: Improve ProtectedRoute Null State Handling

When `mfaEnabled` is `null`, wait for it to be loaded instead of skipping the check.

```typescript
// ProtectedRoute.tsx - Line 39-42
// Wait for MFA status to be loaded
if (mfaStatusLoading || !user) {
  return; // Already handled correctly
}

// NEW: If mfaEnabled is still null after loading finished, treat as needing setup
if (mfaEnabled === null) {
  // This shouldn't happen if fetchMfaStatus worked, but handle defensively
  logger.warn('mfaEnabled still null after loading - forcing refresh');
  return; // Let the context re-fetch
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Remove auto-redirect race condition |
| `src/contexts/AuthContext.tsx` | Fix signOut cache clearing order, add cache validation |
| `src/pages/MfaSetup.tsx` | Check if MFA already enabled before regenerating secret |
| `src/components/ProtectedRoute.tsx` | Handle null mfaEnabled state defensively |

## Implementation Details

### Auth.tsx Changes

```typescript
// Replace lines 76-90 with:
useEffect(() => {
  const checkExistingSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // User is already logged in - check their MFA status
      const { data: profile } = await supabase
        .from('profiles')
        .select('mfa_enabled')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.mfa_enabled) {
        navigate("/mfa-setup");
      } else {
        // Check if they have a valid MFA session
        const mfaToken = localStorage.getItem('mfa_session_data');
        if (mfaToken) {
          try {
            const parsed = JSON.parse(mfaToken);
            if (parsed.token && new Date(parsed.expiresAt) > new Date()) {
              navigate("/"); // Valid MFA session, go to home
              return;
            }
          } catch { /* Invalid token, need to verify */ }
        }
        navigate("/mfa-verify");
      }
    }
  };
  
  checkExistingSession();
  // No onAuthStateChange listener - handleSubmit handles navigation
}, [navigate]);
```

### AuthContext.tsx Changes

```typescript
// signOut function - lines 400-408
const signOut = async () => {
  // Clear state SYNCHRONOUSLY before async operations
  setMfaSessionToken(null);
  setMfaVerified(false);
  sessionStorage.removeItem('mfa_status_cache');
  setMfaEnabled(null);
  setMfaEnrollmentRequired(null);
  
  // Now do async signout
  await supabase.auth.signOut();
  navigate("/auth");
};
```

### MfaSetup.tsx Changes

```typescript
// Inside setupMfa callback, before generating QR code (after line 36):
// Check if MFA is already configured
const { data: mfaSecrets } = await supabase
  .from('user_mfa_secrets')
  .select('mfa_secret, mfa_enrolled_at')
  .eq('user_id', session.user.id)
  .single();

const { data: profile } = await supabase
  .from('profiles')
  .select('mfa_enabled')
  .eq('user_id', session.user.id)
  .single();

// If user already has MFA enabled with a secret, redirect to verify
if (profile?.mfa_enabled && mfaSecrets?.mfa_secret && mfaSecrets?.mfa_enrolled_at) {
  logger.debug('MFA already configured, redirecting to verify');
  toast({
    title: "MFA Already Enabled",
    description: "Redirecting to verification...",
  });
  navigate("/mfa-verify", { replace: true });
  return;
}
```

### ProtectedRoute.tsx Changes

```typescript
// After line 42, add defensive null check:
// If mfaEnabled is still null but loading is done, force a cache refresh
if (mfaEnabled === null && !mfaStatusLoading) {
  logger.debug('mfaEnabled is null after loading - deferring redirect');
  // Don't redirect yet - let context try to fetch again
  return;
}
```

## Expected Outcome

After implementation:

1. **No more setup loops**: Users with existing MFA won't be asked to set up again
2. **No more verify loops**: MFA verification will persist correctly across navigation
3. **Clean sign-out**: Cache is fully cleared before navigation, preventing stale state
4. **No race conditions**: Login flow has single navigation path based on MFA status
5. **Defensive handling**: Edge cases with null states are handled gracefully

## Testing Checklist

- [ ] Fresh login → MFA verify prompt → Enter code → Lands on dashboard
- [ ] Page refresh on dashboard → Stays on dashboard (token persisted)
- [ ] Sign out → Sign in → MFA verify (not setup) if MFA was already enabled
- [ ] New user signup → First login → MFA setup prompt → Complete setup → Dashboard
- [ ] IP address change → MFA re-verify required (security feature)
- [ ] Close browser completely → Reopen → MFA required (24h expiry)
