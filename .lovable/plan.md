
# Fix: MFA Verification Redirect to Dashboard

## Problem

After entering OTP on `/mfa-verify`, you're redirected to `/mfa-setup` instead of the dashboard.

## Root Cause

Two issues creating a race condition:

1. **MfaVerify.tsx** does not call `refreshMfaStatus()` after successful verification - the `mfaEnabled` state remains `null` or stale
2. **ProtectedRoute.tsx** uses `!mfaEnabled` which evaluates to `true` when `mfaEnabled` is `null` (loading state), incorrectly triggering redirect to setup

## Solution

### Fix 1: Update MfaVerify.tsx

Add `refreshMfaStatus()` call after successful OTP verification:

```
Line 24: Change
  const { setMfaVerifiedStatus } = useAuth();

To
  const { setMfaVerifiedStatus, refreshMfaStatus } = useAuth();

Line 94-95: After setMfaVerifiedStatus, add refreshMfaStatus
  setMfaVerifiedStatus(true, sessionData.sessionToken, expiresAt);
  refreshMfaStatus();  // Add this line - updates mfaEnabled cache
```

### Fix 2: Update ProtectedRoute.tsx

Make the redirect logic null-safe:

```
Line 45: Change
  if (!mfaEnabled && mfaEnrollmentRequired !== false) {

To
  if (mfaEnabled === false && mfaEnrollmentRequired !== false) {
```

This ensures redirect to setup only happens when `mfaEnabled` is **explicitly `false`**, not when it's `null` (loading).

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/MfaVerify.tsx` | Add `refreshMfaStatus` to useAuth destructure, call it after verification |
| `src/components/ProtectedRoute.tsx` | Change `!mfaEnabled` to `mfaEnabled === false` |

## Flow After Fix

```text
1. User enters OTP on /mfa-verify
2. OTP verified successfully
3. setMfaVerifiedStatus(true, token, expiry) - stores session token
4. refreshMfaStatus() - sets mfaEnabled = true in context + sessionStorage  [NEW]
5. navigate("/")
6. ProtectedRoute checks:
   - mfaEnabled === false? NO (it's true now)  [FIXED]
   - mfaEnabled && !mfaVerified? NO (both true)
7. Dashboard renders
```
