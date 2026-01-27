
# Implementation Plan: MFA Flow Fix, Admin Settings & Comment Icons

## Summary of Issues

| Issue | Status | Solution |
|-------|--------|----------|
| MFA asks for setup again after verification | Root cause identified | Update mfaEnabled cache immediately after setup completes |
| Comment icons not showing on tasks | Data exists, code exists | Refresh materialized view + verify data flow |
| Can't delete version comments | RLS policies exist | Policies are in DB - need to verify user has admin role |
| No Admin Settings page | Missing | Create new settings page with allowed domains |
| Domain "naviqx.com" not working | Already configured | Domain shows as connected in screenshot - wait for DNS propagation |

---

## Part 1: Fix MFA Setup Loop

**Root Cause**: After successful MFA setup, the `mfaEnabled` state in `AuthContext` is cached from session storage with the OLD value (`false`). When the user clicks "I've Saved My Codes" and navigates to `/`, `ProtectedRoute` checks `mfaEnabled` and redirects back to `/mfa-setup`.

**Files to modify**:
- `src/contexts/AuthContext.tsx` - Add `refreshMfaStatus` function to context
- `src/pages/MfaSetup.tsx` - Call `refreshMfaStatus()` after successful setup

**Changes**:

1. Add new function to `AuthContext`:
```typescript
// Add to AuthContextType interface:
refreshMfaStatus: () => void;

// Add function implementation:
const refreshMfaStatus = () => {
  // Update state immediately
  setMfaEnabled(true);
  
  // Update sessionStorage cache
  if (user) {
    sessionStorage.setItem('mfa_status_cache', JSON.stringify({
      mfaEnabled: true,
      mfaEnrollmentRequired: true,
      userId: user.id,
      cachedAt: Date.now()
    }));
  }
};
```

2. Update `MfaSetup.tsx` to call this after successful verification:
```typescript
// Line 88-90: After setMfaVerifiedStatus
const { setMfaVerifiedStatus, refreshMfaStatus } = useAuth();

// After session is created:
if (!sessionError && sessionData?.sessionToken && sessionData?.expiresAt) {
  setMfaVerifiedStatus(true, sessionData.sessionToken, sessionData.expiresAt);
  refreshMfaStatus(); // ADD THIS - Update mfaEnabled cache immediately
}
```

---

## Part 2: Create Admin Settings Page

**Files to create/modify**:
- `src/pages/admin/Settings.tsx` - NEW settings page
- `src/hooks/useAppSettings.ts` - NEW hook for managing app settings
- `src/pages/admin/AdminLayout.tsx` - Add Settings tab
- Database migration - Create `app_settings` table

**Database Schema**:
```sql
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read settings (needed for email validation)
CREATE POLICY "Authenticated users can read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- Insert default allowed domains
INSERT INTO public.app_settings (key, value, description)
VALUES ('allowed_email_domains', '["cfi.trade"]', 'List of allowed email domains for signup');
```

**Settings Page Features**:
- Card showing "Allowed Email Domains" with current domains
- Add/remove domain functionality
- Integration with existing email validation in Auth.tsx

**Admin Layout Update** - Add Settings tab:
```typescript
<TabsTrigger value="settings" className="gap-2">
  <Settings className="h-4 w-4" />
  <span className="hidden sm:inline">Settings</span>
</TabsTrigger>
```

**Settings Page UI**:
```text
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ Application Settings                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📧 Allowed Email Domains                                 │   │
│  │                                                          │   │
│  │ Users can only sign up with these email domains:         │   │
│  │                                                          │   │
│  │  ╔═══════════════════╗  ╔═══╗                           │   │
│  │  ║ @cfi.trade        ║  ║ ✕ ║                           │   │
│  │  ╚═══════════════════╝  ╚═══╝                           │   │
│  │                                                          │   │
│  │  ┌───────────────────────────────┐  ┌──────────┐        │   │
│  │  │ Enter domain (e.g. acme.com)  │  │ + Add    │        │   │
│  │  └───────────────────────────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔒 Security                                              │   │
│  │                                                          │   │
│  │ MFA Enforcement: Required for all users ✓                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Fix Comment Icons on Tasks

**Current Status**: 
- Code for `MessageCircle` icon exists in `TaskBoardView.tsx`, `SortableTaskCard.tsx`, `TaskListView.tsx`
- `task_comment_counts` materialized view has data (verified)
- `useTasks` hook joins with `task_comment_counts`

**Issue**: The materialized view may not be up-to-date with recent comments.

**Solution**:
1. Refresh the materialized view via database query
2. Add a trigger to auto-refresh when comments change (if not already present)

```sql
-- Refresh the materialized view to get latest counts
REFRESH MATERIALIZED VIEW CONCURRENTLY task_comment_counts;
```

---

## Part 4: Verify Comment Deletion Works

**Current Status**:
- RLS policies exist (verified in database):
  - `"Admins can delete external comments"` on `external_campaign_review_comments`
  - `"Admins can delete any version comment"` on `utm_campaign_version_comments`
  - `"Users can delete own comments"` on `utm_campaign_version_comments`

**UI Code**: The delete button in `VersionComments.tsx` already checks `isAdmin`:
```typescript
{((!comment.is_external && (user?.id === comment.author_id || isAdmin)) || 
  (comment.is_external && isAdmin)) && (
  <Button onClick={() => comment.is_external ? deleteExternalComment.mutate(comment.id) : deleteComment.mutate(comment.id)}>
```

**Potential Issue**: The `useUserRole()` hook might not be returning `isAdmin` correctly, or the current user might not have the admin role.

**Verification needed**: Check that the current user's role is correctly set in `user_roles` table.

---

## Implementation Order

1. **Database Migration**: Create `app_settings` table + refresh `task_comment_counts` view
2. **AuthContext.tsx**: Add `refreshMfaStatus` function
3. **MfaSetup.tsx**: Call `refreshMfaStatus()` after successful setup
4. **useAppSettings.ts**: Create hook for managing app settings
5. **Admin Settings Page**: Create `src/pages/admin/Settings.tsx`
6. **AdminLayout.tsx**: Add Settings tab

---

## Testing Checklist

After implementation:
1. New user signs up → Sets up MFA → Clicks "I've Saved My Codes" → Lands on home page (NOT back to setup)
2. Existing user signs in → Enters OTP → Lands on home page 
3. Admin can access Settings page from Admin Dashboard
4. Admin can view/add/remove allowed email domains
5. Task cards show comment icons (MessageCircle + count) on tasks that have comments
6. Admin can delete any version comment (internal or external)
7. Regular users can delete their own comments

---

## Domain Status (naviqx.com)

Your screenshot shows `naviqx.com` is configured as a custom domain. The 403 errors some Windows users are experiencing could be due to:
1. DNS propagation delay (can take up to 72 hours)
2. Browser caching old DNS records
3. SSL certificate provisioning in progress

**Recommended user action**: Clear browser cache, try incognito mode, or wait for DNS propagation to complete.
