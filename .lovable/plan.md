
# Critical MFA Authentication Issues - Complete Root Cause Analysis

## Issues Identified After Comprehensive Investigation

I performed a full audit of the entire authentication and MFA system across all related files. Here are the **remaining issues** that are still causing users to get stuck in loops:

---

## Issue 1: sessionStorage Cache Not Validated Against Current User (CRITICAL)

**Location:** `src/contexts/AuthContext.tsx` lines 81-102

**Problem:** The `mfa_status_cache` in sessionStorage stores `userId` but it's **never validated** when the cache is read on initialization. If User A logs out and User B logs in, the cache from User A is trusted without checking.

```typescript
// Current code - NEVER checks userId match
const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(() => {
  const cached = sessionStorage.getItem('mfa_status_cache');
  if (cached) {
    try {
      return JSON.parse(cached).mfaEnabled ?? null;  // ← userId is ignored!
    } catch { return null; }
  }
  return null;
});
```

**Impact:** Wrong user's MFA status is used, causing incorrect routing.

**Fix:** Validate the cached userId matches the current user's ID before trusting the cache.

---

## Issue 2: ProtectedRoute Checks localStorage But Doesn't Sync State (CRITICAL)

**Location:** `src/components/ProtectedRoute.tsx` lines 60-74

**Problem:** When `ProtectedRoute` finds a valid token in localStorage but `mfaVerified` is `false`, it just returns early without setting `mfaVerified = true`. This means:
- Next navigation causes the same check
- React state and localStorage are out of sync
- Causes intermittent behavior

```typescript
// Current code - just returns, doesn't sync state
if (isValid) {
  logger.debug('Valid MFA token in localStorage, allowing access');
  return;  // ← mfaVerified stays FALSE, causing future issues
}
```

**Impact:** User appears logged in but React state is wrong, causing unpredictable redirects on subsequent navigations.

**Fix:** When valid localStorage token is found, call `setMfaVerifiedStatus(true)` to sync React state.

---

## Issue 3: MfaVerify Sign Out Button Doesn't Use Context's signOut (MEDIUM)

**Location:** `src/pages/MfaVerify.tsx` lines 237-241

**Problem:** The Sign Out button calls `supabase.auth.signOut()` directly and only clears `mfa_session_data`, missing the `sessionStorage` cache cleanup that the context's `signOut()` does.

```typescript
// Current code - bypasses proper cleanup
onClick={async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('mfa_session_data');  // ← Missing sessionStorage cleanup
  navigate("/auth");
}}
```

**Impact:** `mfa_status_cache` persists after sign out, causing stale state for next login.

**Fix:** Use the `signOut` function from `useAuth()` hook instead.

---

## Issue 4: Auth.tsx Session Check Uses getSession() Instead of getUser() (MEDIUM)

**Location:** `src/pages/Auth.tsx` line 78

**Problem:** `getSession()` can return stale cached tokens. The more reliable method is `getUser()` which always validates with the server.

```typescript
// Current code - uses cached session
const { data: { session } } = await supabase.auth.getSession();
```

**Impact:** Users with expired/revoked sessions may be incorrectly routed based on stale tokens.

**Fix:** Use `getUser()` like `MfaVerify.tsx` does.

---

## Issue 5: setup-mfa Edge Function Regenerates Secret for Incomplete Setup (LOW-MEDIUM)

**Location:** `supabase/functions/setup-mfa/index.ts` lines 83-94

**Problem:** If a user started MFA setup (secret was saved to `user_mfa_secrets`) but didn't complete verification (no `mfa_enrolled_at`), the edge function regenerates a NEW secret. This invalidates any QR code they may have already scanned.

```typescript
// Current code - regenerates if no existing secret in DB
let secret = mfaSecrets?.mfa_secret as string | undefined;
if (!secret) {
  // Generate new secret
  secret = new OTPAuth.Secret({ size: 20 }).base32;
}
```

But the frontend check in `MfaSetup.tsx` only redirects if ALL THREE conditions are met:
- `profile?.mfa_enabled` (true)
- `mfaSecrets?.mfa_secret` (exists)
- `mfaSecrets?.mfa_enrolled_at` (exists)

So if user scanned QR but didn't enter OTP, they get a NEW secret on page refresh.

**Impact:** User's authenticator app shows wrong codes because secret changed.

**Fix:** The frontend check should also consider if a secret exists but enrollment isn't complete (offer to continue setup vs. regenerate).

---

## Issue 6: No Fallback When MFA Status Fetch Fails (LOW)

**Location:** `src/contexts/AuthContext.tsx` lines 243-248

**Problem:** If `fetchMfaStatus` fails (network error), it sets `mfaEnabled = false` and `mfaEnrollmentRequired = true`. This can force users who already have MFA into setup mode.

```typescript
} catch (err) {
  logger.error('Error fetching MFA status:', err);
  setMfaEnabled(false);  // ← Forces users into MFA setup on network error
  setMfaEnrollmentRequired(true);
}
```

**Impact:** Temporary network issues can incorrectly route users to MFA setup.

**Fix:** On error, defer to existing cache or show an error state rather than forcing setup.

---

## Summary of Required Fixes

| Priority | Issue | File | Fix |
|----------|-------|------|-----|
| CRITICAL | Cache userId not validated | AuthContext.tsx | Validate userId before using cache |
| CRITICAL | localStorage valid but state not synced | ProtectedRoute.tsx | Sync React state when valid token found |
| MEDIUM | Sign Out bypasses context | MfaVerify.tsx | Use `signOut()` from useAuth |
| MEDIUM | getSession() vs getUser() | Auth.tsx | Switch to getUser() |
| LOW-MEDIUM | Secret regenerated on incomplete setup | setup-mfa edge function + MfaSetup.tsx | Handle incomplete setup gracefully |
| LOW | Network error forces setup | AuthContext.tsx | Graceful error handling |

---

## Implementation Plan

### Step 1: Fix sessionStorage cache validation (AuthContext.tsx)

Add a user ID check when reading from cache:

```typescript
// In AuthProvider, after user is determined
useEffect(() => {
  if (user) {
    const cached = sessionStorage.getItem('mfa_status_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.userId !== user.id) {
          // Different user - clear stale cache
          sessionStorage.removeItem('mfa_status_cache');
          setMfaEnabled(null);
          setMfaEnrollmentRequired(null);
          setMfaStatusLoading(true);
        }
      } catch { /* ignore parse errors */ }
    }
  }
}, [user]);
```

### Step 2: Sync React state in ProtectedRoute (ProtectedRoute.tsx)

When valid localStorage token is found, update context:

```typescript
if (isValid) {
  logger.debug('Valid MFA token in localStorage, syncing state');
  // Need to get setMfaVerifiedStatus from context and call it
  // This requires adding it to the useAuth destructuring
  return;
}
```

But there's a complexity: we need `setMfaVerifiedStatus` but can't call it inside the effect without proper dependencies. The cleanest fix is to have AuthContext detect the localStorage token on mount and sync state automatically.

### Step 3: Use signOut from context (MfaVerify.tsx)

Replace direct signOut:

```typescript
const { setMfaVerifiedStatus, refreshMfaStatus, signOut } = useAuth();

// In button onClick:
onClick={() => signOut()}
```

### Step 4: Use getUser in Auth.tsx

Replace getSession with getUser for more reliable session validation.

### Step 5: Handle incomplete MFA setup

In MfaSetup.tsx, check if secret exists but enrollment is incomplete, and offer to continue with existing secret.

### Step 6: Improve error handling in fetchMfaStatus

Don't default to forcing setup on network errors.

---

## Files to Modify

1. **src/contexts/AuthContext.tsx**
   - Add userId validation for sessionStorage cache
   - Add localStorage → state sync on mount
   - Improve fetchMfaStatus error handling

2. **src/components/ProtectedRoute.tsx**
   - Minimal change - most logic moves to AuthContext

3. **src/pages/MfaVerify.tsx**
   - Use signOut from context

4. **src/pages/Auth.tsx**
   - Switch from getSession to getUser

5. **src/pages/MfaSetup.tsx**
   - Handle incomplete setup state

6. **supabase/functions/setup-mfa/index.ts**
   - Reuse existing secret if present (even without enrollment)
