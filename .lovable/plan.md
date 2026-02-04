
# Fix Security Dashboard - Cleanup Action and Design System Compliance

## Problem Summary

Two issues exist with the Security Dashboard:

1. **Clean Now button doesn't refresh findings**: The cleanup successfully deletes expired sessions (verified: 0 remain in database), but the UI still shows stale findings from November 2025 because it only re-fetches old scan results instead of running a new scan.

2. **Design system violations**: The Security Dashboard components don't use the Prisma Design System's liquid glass effects or proper token usage.

## Solution

### Part 1: Fix Clean Now Action

**Current Flow (Broken):**
```
Click "Clean Now" → Delete expired sessions → Re-fetch old scan results → Still shows stale data
```

**Fixed Flow:**
```
Click "Clean Now" → Delete expired sessions → Trigger new security scan → Fetch fresh results
```

**Change in `SecurityDashboard.tsx`:**
```typescript
const cleanupExpiredSessions = async () => {
  try {
    // 1. Delete expired sessions
    const { error } = await supabase
      .from("mfa_sessions")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (error) throw error;

    toast({
      title: "Cleanup complete",
      description: "Running fresh security scan...",
    });

    // 2. Trigger a new scan to refresh findings
    await runManualScan();  // <-- ADD THIS
  } catch (error) {
    // ... error handling
  }
};
```

### Part 2: Apply Design System Tokens

Update all Security Dashboard components to follow the Prisma Design System:

**SecurityPosture.tsx Changes:**
- Add `liquid-glass-elevated` to stat cards
- Use proper border radius tokens (`rounded-xl`)
- Add hover effects with `transition-smooth`

**SecurityFindings.tsx Changes:**
- Use `liquid-glass-elevated` for the main card
- Apply `liquid-glass-dropdown` styles for details dropdowns
- Use proper spacing tokens (`gap-md`, `p-card`)

**SecurityControls.tsx Changes:**
- Add `liquid-glass-elevated` to the panel
- Ensure proper text tokens (`text-body-sm`, `text-metadata`)

**SuspiciousActivityList.tsx Changes:**
- Use `liquid-glass-elevated` for the card
- Apply `hover:bg-card-hover` and `transition-smooth` to list items

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/SecurityDashboard.tsx` | Call `runManualScan()` after cleanup |
| `src/components/admin/SecurityPosture.tsx` | Add liquid glass styling |
| `src/components/admin/SecurityFindings.tsx` | Add liquid glass styling |
| `src/components/admin/SecurityControls.tsx` | Add liquid glass styling |
| `src/components/admin/SuspiciousActivityList.tsx` | Add liquid glass styling |

## Technical Implementation

### SecurityDashboard.tsx
```typescript
// Update cleanupExpiredSessions to trigger a new scan
const cleanupExpiredSessions = async () => {
  try {
    const { error } = await supabase
      .from("mfa_sessions")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;

    toast({
      title: "Cleanup complete",
      description: "Running fresh security scan...",
    });

    // Run a new scan to refresh findings
    await runManualScan();
  } catch (error: unknown) {
    logger.error("Error cleaning up sessions:", error);
    toast({
      title: "Cleanup failed",
      description: error instanceof Error ? error.message : "Unknown error",
      variant: "destructive",
    });
  }
};
```

### SecurityPosture.tsx
```tsx
// Stat cards with liquid glass
<Card className={cn(
  "liquid-glass-elevated rounded-xl hover-lift transition-smooth",
  getScoreBg(securityScore)
)}>
  <CardContent className="p-card">
    ...
  </CardContent>
</Card>
```

### SecurityFindings.tsx
```tsx
// Main card with liquid glass
<Card className="liquid-glass-elevated rounded-xl">
  ...
  // Finding rows with proper hover
  <div className="border border-border rounded-lg p-md hover:bg-card-hover transition-smooth">
    ...
  </div>
</Card>
```

### SecurityControls.tsx
```tsx
<Card className="liquid-glass-elevated rounded-xl">
  <CardHeader className="pb-sm">
    <CardTitle className="text-heading-sm">Security Controls</CardTitle>
  </CardHeader>
  <CardContent className="space-y-md">
    ...
  </CardContent>
</Card>
```

### SuspiciousActivityList.tsx
```tsx
<Card className="liquid-glass-elevated rounded-xl">
  ...
  // Activity rows
  <div className="flex items-center justify-between p-sm border border-border rounded-lg hover:bg-card-hover transition-smooth">
    ...
  </div>
</Card>
```

## Expected Outcome

After implementation:
1. **"Clean Now" button** will delete sessions AND run a fresh scan, updating the display immediately
2. **All components** will have the liquid glass styling consistent with the rest of the app
3. **Design tokens** will be properly applied (spacing, typography, colors)
4. **Hover effects** will be smooth and consistent
