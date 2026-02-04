
# Admin Dashboard Cleanup and Security Hardening

## Overview

This plan addresses two concerns:
1. **Remove the unused Config tab** - it only manages cities (selector management) which is not frequently used
2. **Enhance the Security tab** - it's currently functional but needs to display real, actionable security findings

## Current State Analysis

### Config Tab (To Be Removed)
- **Location**: `/admin/config` → `SelectorsManagement.tsx`
- **Purpose**: Manages system cities used for location tracking
- **Usage**: Very low - cities rarely change once configured
- **Decision**: **Remove from admin nav** (keep the page accessible via direct URL for occasional use)

### Security Tab (To Be Enhanced)
The Security tab actually has a functional backend:
- **Edge Function**: `security-scanner` runs daily and checks for:
  - Expired MFA sessions (auto-cleans)
  - Excessive MFA failures (brute force detection)
  - Accounts without MFA enabled
  - Stale MFA sessions
  - Multiple active sessions (account sharing)
  - Unresolved suspicious activities
- **Database Tables**: `security_scan_results`, `suspicious_activities`
- **UI**: Shows scan history, findings, and suspicious activities

**Current Security Findings (from linter):**
- 18 RLS policies with `USING(true)` - mostly audit/logging tables (intentional)
- 1 ERROR: Profiles table exposes employee data to all users
- 1 WARN: External reviewer emails publicly accessible
- 1 INFO: Notification preferences lack granular access control

## Implementation Plan

### Phase 1: Remove Config from Admin Nav
1. **Remove Config tab** from `AdminLayout.tsx` tabs
2. **Remove route** from `App.tsx` (or keep for direct access)
3. Keep `SelectorsManagement.tsx` file for potential future use

### Phase 2: Enhance Security Page
Replace the current placeholder-feeling UI with a comprehensive security dashboard:

#### New Security Dashboard Features:

**1. Security Posture Overview**
- Overall security score (based on findings)
- Last scan time with quick run button
- Total findings by severity

**2. Active Security Findings Panel**
Display findings from multiple sources:
- **Database Linter Findings** - RLS policy issues
- **Lovable Security Scanner** - Code-level vulnerabilities
- **Edge Function Scans** - Runtime security checks (MFA failures, sessions)

**3. Action Items**
Prioritized list of security issues with:
- Severity badges (critical/high/medium/low)
- Clear descriptions
- Remediation guidance
- One-click actions where possible

**4. Suspicious Activity Monitor**
- Real-time feed of suspicious activities
- Quick resolve/investigate actions
- Filtering by type/severity

**5. Security Configuration Status**
- MFA enforcement status
- Email domain restrictions
- RLS policy coverage

### Phase 3: Fix Critical Security Issue
The profiles table exposing employee data is an actual vulnerability:

```sql
-- Create policy: Users can only view their own profile or admins can view all
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/AdminLayout.tsx` | Remove Config tab from nav |
| `src/pages/admin/SecurityPage.tsx` | Complete redesign with new dashboard |
| `src/App.tsx` | Optional: Remove config route |

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/SecurityDashboard.tsx` | Main security dashboard component |
| `src/components/admin/SecurityFindings.tsx` | Findings list with actions |
| `src/components/admin/SecurityPosture.tsx` | Security score overview |
| `src/hooks/useSecurityFindings.ts` | Hook to fetch and manage findings |

## Database Migration

```sql
-- Fix profiles table RLS to prevent employee data exposure
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Note: The existing has_role function is already defined as SECURITY DEFINER
```

## New Security Dashboard UI Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Security Dashboard                              [Run Scan]  │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐    │
│ │ Security  │ │ Critical  │ │ Last Scan │ │ Suspicious│    │
│ │ Score: 78 │ │ Issues: 1 │ │ 2h ago    │ │ Activity:3│    │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘    │
├─────────────────────────────────────────────────────────────┤
│ Active Findings                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 ERROR: Profiles table exposes employee data          │ │
│ │    Description: All users can view all profiles...      │ │
│ │    [View Details] [Fix Now]                             │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🟡 WARN: External reviewer emails accessible            │ │
│ │    Description: Access tokens expose email addresses... │ │
│ │    [View Details] [Acknowledge]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Suspicious Activities                          [View All]   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Multiple active sessions - user@cfi.trade - 2 IPs      │ │
│ │ Excessive MFA failures - 6 attempts in 24h             │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Security Controls                                           │
│ ✅ MFA Enforcement: Enabled                                 │
│ ✅ Email Domain Restriction: Active (@cfi.trade)            │
│ ⚠️ RLS Policies: 18 permissive (audit tables - expected)   │
└─────────────────────────────────────────────────────────────┘
```

## Success Criteria

1. Config tab removed from admin nav (cleaner interface)
2. Security page shows actual findings from all sources
3. Admins can see and act on security issues
4. Critical profile data exposure is fixed via RLS
5. Security posture is visible at a glance
