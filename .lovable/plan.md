

## Email Notification System with Resend

### Overview
Implement email notifications for task assignments and mentions (instant), plus a daily deadline digest (batched). Uses Resend with test sender `onboarding@resend.dev` (easily switchable to your verified domain later).

### Email Volume Estimate
- Task assignments: ~69/month
- Mentions: ~14/month  
- Deadline digest: ~150/month (1 per user per day max)
- **Total: ~233 emails/month** (11.6% of 2k limit)

---

### What Gets Built

| Component | Type | Description |
|-----------|------|-------------|
| `RESEND_API_KEY` secret | Secret | Store your Resend API key securely |
| `email_enabled` column | Database | Add to `notification_preferences` table |
| `send-notification-email` | Edge Function | Email sender with templates |
| `NotificationPreferences.tsx` | UI Update | Add email toggles for supported types |
| `daily-notification-scheduler` | Edge Function Update | Add deadline digest emails |
| `email_on_notification_insert` | DB Trigger | Auto-send email on instant notifications |

---

### Implementation Steps

**Step 1: Add RESEND_API_KEY Secret**
Store your Resend API key (`re_b7mBeMjn_...`) in the backend secrets.

**Step 2: Database Migration**
Add `email_enabled` column to notification_preferences:
```sql
ALTER TABLE notification_preferences 
ADD COLUMN email_enabled BOOLEAN DEFAULT false;

-- Create helper function
CREATE FUNCTION is_email_notification_enabled(p_user_id uuid, p_type text)
RETURNS boolean AS $$
SELECT COALESCE(email_enabled, false)
FROM notification_preferences
WHERE user_id = p_user_id AND notification_type = p_type;
$$ LANGUAGE sql;
```

**Step 3: Create Email Edge Function**
Create `send-notification-email` with:
- 3 React Email templates (task-assigned, mention, deadline-digest)
- CFI logo branding from existing `src/assets/cfi-logo.png`
- Deep links to tasks using production URL `naviqx.lovable.app`
- Link to preferences page for unsubscribe

**Step 4: Update Notification Preferences UI**
Add email toggle column for email-supported notification types:
- Task assignments
- Mentions  
- Deadline digest (new combined type)

Show two toggles per row: "In-app" | "Email"

**Step 5: Add Database Trigger for Instant Emails**
Create trigger that fires on `notifications` INSERT for types:
- `task_assigned`
- `mention`, `comment_mention`, `description_mention`

Uses `net.http_post` to call the email edge function (requires pg_net extension).

**Step 6: Modify Daily Scheduler for Digest**
Update `daily-notification-scheduler` to:
- Group all deadline tasks (3-day, 1-day, overdue) by user
- Send ONE digest email per user with all their tasks
- Check `email_enabled` preference before sending

---

### Files to Create/Modify

| File | Action |
|------|--------|
| Secret: `RESEND_API_KEY` | Add |
| `notification_preferences` table | Add `email_enabled` column |
| `supabase/functions/send-notification-email/index.ts` | Create |
| `supabase/functions/send-notification-email/_templates/task-assigned.tsx` | Create |
| `supabase/functions/send-notification-email/_templates/mention.tsx` | Create |
| `supabase/functions/send-notification-email/_templates/deadline-digest.tsx` | Create |
| `src/components/NotificationPreferences.tsx` | Modify |
| `supabase/functions/daily-notification-scheduler/index.ts` | Modify |
| `supabase/config.toml` | Add new function registration |

---

### Email Template Preview

**Task Assigned Email:**
```
Subject: You've been assigned to: [Task Title]

[CFI Logo]

New Task Assignment

[Assigner Name] assigned you to:
"[Task Title]"

Due: [Date]

[View Task →]

---
Manage email preferences: [link]
```

**Deadline Digest Email:**
```
Subject: Your task deadline summary - [Date]

[CFI Logo]

⚠️ OVERDUE (2 tasks)
• Task A - 3 days overdue
• Task B - 1 day overdue

📅 DUE TOMORROW (1 task)
• Task C

📆 DUE IN 3 DAYS (2 tasks)
• Task D
• Task E

[View All Tasks →]

---
Manage email preferences: [link]
```

---

### Switching to Your Verified Domain Later

When you verify `naviqx.com` in Resend, you only need to change one line:

```typescript
// In send-notification-email/index.ts
// FROM:
from: "NaviqX <onboarding@resend.dev>"

// TO:
from: "NaviqX <noreply@naviqx.com>"
```

---

### Technical Notes

1. **pg_net Extension**: Required for database trigger to call edge functions. Will be enabled in migration.

2. **Rate Limiting**: Existing `notification_rate_limit` table prevents spam.

3. **Preference Defaults**: Email defaults to OFF (opt-in) - users must enable in settings.

4. **Error Handling**: Failed emails are logged but don't block app functionality.

5. **Cron Timing**: Digest emails sent at 8am daily (same as existing scheduler).

