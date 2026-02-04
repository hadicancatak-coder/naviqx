
# Fix Security Findings - Session Cleanup and Fresh Scanning

## Problem Summary

The security dashboard is showing stale data from a scan run **3 months ago** (November 2025). I verified the current database state:

| Finding | Old Scan Says | Actual Current State |
|---------|---------------|---------------------|
| Expired MFA Sessions | 18 | **228** (much worse!) |
| Users without MFA | 6 users listed | **0** (all users now have MFA!) |

## Solution

### 1. Immediate Cleanup - Delete All Expired Sessions
Run a one-time cleanup to remove the 228 expired MFA sessions from the database.

```sql
DELETE FROM mfa_sessions WHERE expires_at < NOW();
```

### 2. Run a Fresh Security Scan
Click the "Run Scan" button on the Security Dashboard to get current findings. After cleanup, the expired sessions finding should disappear.

### 3. Set Up Automatic Cleanup (Scheduled Job)
Create a cron job to run the security scanner daily, which will:
- Auto-clean expired MFA sessions
- Detect new security issues
- Keep findings current

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule security scanner to run daily at 3 AM UTC
SELECT cron.schedule(
  'daily-security-scan',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://mwogxqonlzjrkktwbkma.supabase.co/functions/v1/security-scanner',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### 4. Add One-Click "Clean Now" Actions
Enhance the SecurityFindings component to include action buttons:
- **Clean Expired Sessions** - Direct button to purge expired sessions
- **Re-scan** - Already exists with "Run Scan" button

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/SecurityDashboard.tsx` | Add `cleanupExpiredSessions()` function |
| `src/components/admin/SecurityFindings.tsx` | Add action buttons per finding type |

## Implementation Steps

1. **Database cleanup** - Delete 228 expired sessions via SQL
2. **Add cleanup action** - Add "Clean Now" button to expired sessions finding
3. **Set up cron job** - Schedule daily scans to keep data fresh
4. **UI enhancement** - Show "last scan was X ago" warning if stale

## Expected Outcome

After implementation:
- Security score will increase (no stale findings)
- MFA finding will disappear (all users have MFA)
- Expired sessions finding will disappear (cleaned up)
- Automatic daily scans will keep data current
