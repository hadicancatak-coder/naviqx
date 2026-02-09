
# Critical Fix: MFA Authentication Loop

## Problem Analysis

Users are trapped in an infinite MFA verification loop after successfully entering their credentials and OTP code. The issue has multiple contributing factors:

### Root Causes Identified

1. **Race Condition in State Propagation**
   - After successful MFA verification, `setMfaVerifiedStatus()` updates React state
   - `navigate("/")` is called immediately after
   - The `ProtectedRoute` useEffect runs BEFORE state update propagates
   - Result: User is redirected back to `/mfa-verify`

2. **localStorage Check Timing Issue**
   - The fallback localStorage check in `ProtectedRoute` (line 54-59) uses raw `localStorage.getItem()`
   - This check happens at the right time, but there's a microtask timing issue where the localStorage write from `setMfaSessionToken()` may not have committed yet

3. **Cross-Domain Token Isolation**
   - Users accessing from multiple domains (`naviqx.com`, `naviqx.lovable.app`, preview URL)
   - localStorage is domain-specific, so tokens don't persist across domains
   - This creates the appearance of "missing" tokens

4. **onAuthStateChange Interference**
   - The `refreshSession()` call in MfaVerify can trigger auth state changes
   - These events call `validateMfaSession()` which may clear the token if validation fails transiently

## Solution

### Part 1: Fix Race Condition with Navigation Delay

In `MfaVerify.tsx`, add a small delay before navigation to ensure state has propagated:

```typescript
// After setMfaVerifiedStatus and refreshMfaStatus
// Use a microtask to ensure localStorage write is committed
await new Promise(resolve => setTimeout(resolve, 100));
navigate("/", { replace: true });
```

### Part 2: Improve localStorage Token Check in ProtectedRoute

Instead of checking just `localStorage.getItem()`, use the proper `getMfaSessionToken()` pattern that validates the token:

```typescript
// ProtectedRoute.tsx - line 53-59
if (mfaEnabled && !mfaVerified) {
  // Parse and validate the token properly
  const storedData = localStorage.getItem('mfa_session_data');
  if (storedData) {
    try {
      const { token, expiresAt } = JSON.parse(storedData);
      if (token && new Date(expiresAt) > new Date()) {
        // Valid token exists - trust it and skip redirect
        logger.debug('Valid MFA token found in localStorage, proceeding');
        return;
      }
    } catch (e) {
      // Invalid JSON - clear it
      localStorage.removeItem('mfa_session_data');
    }
  }
  // No valid token - redirect
  logger.debug('MFA enabled but no valid token, redirecting to verification');
  navigate("/mfa-verify");
  return;
}
```

### Part 3: Prevent Auth State Handler from Clearing Token During Verification

Add a flag to skip validation during active MFA verification:

```typescript
// AuthContext.tsx - Add a new state
const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

// In onAuthStateChange handler - skip if actively verifying
if (event === 'SIGNED_IN' && !isVerifyingMfa) {
  validateMfaSession(session.user);
}

// Export setIsVerifyingMfa for MfaVerify to use
```

### Part 4: Ensure Token is Committed Before Navigation

In `setMfaVerifiedStatus`, use synchronous localStorage write:

```typescript
const setMfaVerifiedStatus = (verified: boolean, sessionToken?: string, expiresAt?: string) => {
  logger.debug('Setting MFA status', { verified });
  
  // Write to localStorage FIRST (synchronous)
  if (verified && sessionToken && expiresAt) {
    localStorage.setItem(MFA_SESSION_KEY, JSON.stringify({ 
      token: sessionToken, 
      expiresAt,
      storedAt: new Date().toISOString()
    }));
  } else {
    localStorage.removeItem(MFA_SESSION_KEY);
  }
  
  // Then update React state
  setMfaVerified(verified);
  if (verified && sessionToken) {
    setSkipNextValidation(true);
    prefetchTasksData();
  }
};
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/MfaVerify.tsx` | Add navigation delay and verification flag |
| `src/components/ProtectedRoute.tsx` | Improve token validation logic |
| `src/contexts/AuthContext.tsx` | Add `isVerifyingMfa` flag, ensure token write order |

## Implementation Details

### MfaVerify.tsx Changes

```typescript
// Line 78-106 - Wrap successful verification
if (verifyData.success) {
  // Create MFA session on server
  const { data: sessionData, error: sessionError } = await supabase.functions.invoke('manage-mfa-session', {
    body: { action: 'create' }
  });

  if (sessionError || !sessionData?.sessionToken) {
    throw new Error('Failed to create session');
  }

  const expiresAt = sessionData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Mark MFA as verified with session token and expiry
  setMfaVerifiedStatus(true, sessionData.sessionToken, expiresAt);
  refreshMfaStatus();
  
  toast({
    title: "Verified!",
    description: "You have been successfully authenticated",
  });

  // CRITICAL: Wait for state to propagate before navigation
  await new Promise(resolve => setTimeout(resolve, 150));
  
  logger.debug('Navigating to home page');
  navigate("/", { replace: true });
}
```

### ProtectedRoute.tsx Changes

```typescript
// Replace lines 52-66 with improved validation
if (mfaEnabled && !mfaVerified) {
  // Check localStorage with proper validation
  const storedData = localStorage.getItem('mfa_session_data');
  
  if (storedData) {
    try {
      const parsed = JSON.parse(storedData);
      const isValid = parsed.token && 
                      parsed.expiresAt && 
                      new Date(parsed.expiresAt) > new Date();
      
      if (isValid) {
        logger.debug('Valid MFA token in localStorage, allowing access');
        return; // Don't redirect - valid token exists
      }
      
      // Token expired - clean up
      localStorage.removeItem('mfa_session_data');
    } catch {
      // Malformed data - clean up
      localStorage.removeItem('mfa_session_data');
    }
  }
  
  logger.debug('MFA enabled but no valid token, redirecting to verification');
  navigate("/mfa-verify");
  return;
}
```

### AuthContext.tsx Changes

```typescript
// Lines 28-37 - Ensure proper write order in setMfaSessionToken
const setMfaSessionToken = (token: string | null, expiresAt?: string): void => {
  if (token && expiresAt) {
    // Synchronous write to localStorage
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

// Lines 360-373 - Ensure localStorage is written before state
const setMfaVerifiedStatus = (verified: boolean, sessionToken?: string, expiresAt?: string) => {
  logger.debug('Setting MFA status', { verified, hasToken: !!sessionToken });
  
  // CRITICAL: Write localStorage BEFORE state update
  if (verified && sessionToken && expiresAt) {
    setMfaSessionToken(sessionToken, expiresAt);
    setSkipNextValidation(true);
    prefetchTasksData();
  } else {
    setMfaSessionToken(null);
  }
  
  // State update happens after localStorage is committed
  setMfaVerified(verified);
};
```

## Expected Outcome

After implementation:
1. MFA verification will complete successfully without redirect loops
2. Token will be properly persisted in localStorage before navigation
3. ProtectedRoute will correctly detect valid tokens
4. Users will navigate to the dashboard immediately after MFA verification
5. Cross-domain access will still require re-verification (intended security behavior)

## Testing Checklist

- [ ] Login with email/password → MFA prompt appears
- [ ] Enter valid OTP → Successfully redirected to dashboard
- [ ] Refresh page → Stays on dashboard (token persisted)
- [ ] Close browser, reopen → MFA required again after 24h OR stays logged in if within 24h
- [ ] Use backup code → Successfully authenticated
