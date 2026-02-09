
# Complete Authentication Flow - Passwords, MFA, Forgot Password

## Current Gaps Identified

After thorough investigation, the authentication system is missing these critical user flows:

| Flow | Status | Issue |
|------|--------|-------|
| Login | Partial | No "Forgot Password" link |
| Signup | Works | - |
| MFA Setup | Works | - |
| MFA Verify | Works | - |
| Change Password | Works | Only on /security page, requires current password |
| Forgot Password | Missing | User cannot self-service reset |
| Reset Password | Missing | No page to handle recovery links |
| Force Password Change | Missing | DB field exists but not used |

## Implementation Plan

### 1. New Page: `/reset-password` (Handles Recovery Links)

When a user clicks a password reset link from their email, Supabase redirects them with a special session. This page will:

- Detect the `type=recovery` event from Supabase auth
- Show a "Set New Password" form with the strength indicator
- Require the new password to meet all requirements
- Update password via `supabase.auth.updateUser()`
- Redirect to login on success

**File:** `src/pages/ResetPassword.tsx`

```text
+------------------------------------------+
|           Naviqx Password Reset          |
|                                          |
|  Set a new secure password for your      |
|  account.                                |
|                                          |
|  [New Password Input        ]            |
|                                          |
|  ✓ At least 9 characters                 |
|  ✓ One uppercase letter                  |
|  ✓ One number                            |
|  ✓ One special character                 |
|                                          |
|  [Confirm Password Input    ]            |
|                                          |
|        [ Reset Password ]                |
|                                          |
+------------------------------------------+
```

### 2. New Page: `/change-password` (Force Password Change)

When a user has `force_password_reset = true` OR their password doesn't meet current standards:

- Displayed BEFORE MFA setup/verify
- Shows current password rules with strength indicator
- After successful change, clears the `force_password_reset` flag
- Then proceeds to MFA flow

**File:** `src/pages/ChangePasswordRequired.tsx`

```text
+------------------------------------------+
|       Password Update Required           |
|                                          |
|  ⚠️ Your password doesn't meet our       |
|     current security requirements.        |
|                                          |
|  [Current Password          ]            |
|  [New Password              ]            |
|                                          |
|  ✓ At least 9 characters                 |
|  ✓ One uppercase letter                  |
|  ✓ One number                            |
|  ✓ One special character                 |
|                                          |
|  [Confirm New Password      ]            |
|                                          |
|        [ Update Password ]               |
|                                          |
+------------------------------------------+
```

### 3. Update Auth Page: Add "Forgot Password" Link

Add a clearly visible "Forgot Password?" link to the login form that:

- Shows an email input modal/form
- Calls `supabase.auth.resetPasswordForEmail()`
- Shows success message: "Check your email for a reset link"
- Restricts to allowed domains (same validation as login)

### 4. Update Auth Flow: Check `force_password_reset`

Modify the login flow in `Auth.tsx` to:

1. After successful login, fetch profile with `force_password_reset` flag
2. If `true`, redirect to `/change-password` BEFORE MFA
3. After password changed, continue to MFA setup/verify

### 5. Update ProtectedRoute: Add Force Password Check

Add `force_password_reset` to the auth context and route guards:

```text
Login → Check force_password_reset?
  YES → /change-password → MFA → Dashboard
  NO  → MFA → Dashboard
```

### 6. Routes to Add

| Route | Component | Purpose |
|-------|-----------|---------|
| `/reset-password` | ResetPassword.tsx | Handle recovery email links |
| `/change-password` | ChangePasswordRequired.tsx | Force password update |

## File Changes

### New Files

1. **`src/pages/ResetPassword.tsx`**
   - Handles Supabase `PASSWORD_RECOVERY` event
   - Password form with strength indicator
   - Branded glass UI matching auth pages

2. **`src/pages/ChangePasswordRequired.tsx`**
   - Force password change for weak passwords
   - Current + New password form
   - Updates `force_password_reset = false` on success

### Modified Files

3. **`src/pages/Auth.tsx`**
   - Add "Forgot Password?" link below login button
   - Add email input modal for password reset request
   - Update login handler to check `force_password_reset`

4. **`src/contexts/AuthContext.tsx`**
   - Add `forcePasswordReset: boolean` to context
   - Fetch from profile alongside MFA status
   - Expose `clearForcePasswordReset()` method

5. **`src/components/ProtectedRoute.tsx`**
   - Add `/change-password` to self-handling routes
   - Check `forcePasswordReset` and redirect before MFA

6. **`src/App.tsx`**
   - Add routes for `/reset-password` and `/change-password`

## Complete User Flows

### Flow 1: Forgot Password (Self-Service)

```text
User → /auth → Clicks "Forgot Password?"
     → Enters email → Gets email with link
     → Clicks link → /reset-password
     → Sets new password → Redirected to /auth
     → Logs in → MFA → Dashboard
```

### Flow 2: Weak Password User (Like Akash)

```text
User → /auth → Logs in with old weak password
     → System detects force_password_reset OR admin sets flag
     → Redirected to /change-password
     → Changes to strong password
     → Continues to MFA → Dashboard
```

### Flow 3: Admin Forces Password Reset

```text
Admin → /admin/users → Clicks "Force Password Reset" on user
     → Sets force_password_reset = true in profile
     → Next time user logs in → /change-password → MFA
```

### Flow 4: Password Recovery Link

```text
User → Clicks recovery link from email
     → Supabase redirects to /reset-password with session
     → User sets new strong password
     → Logged out → /auth → Login → MFA → Dashboard
```

## Security Considerations

1. **Password Validation**: Use same `authPasswordSchema` from Zod
2. **Domain Restriction**: Reset emails only sent to allowed domains
3. **Rate Limiting**: Supabase handles rate limiting on `resetPasswordForEmail`
4. **Session Handling**: Recovery links create temporary sessions that expire
5. **Force Reset Flag**: Only cleared after successful password change

## Timeline

This is a significant feature addition requiring:
- 2 new pages
- 4 modified files
- 1 new route handler
- Auth context updates

All changes maintain the existing glass-morphism UI and follow Prisma design system guidelines.
