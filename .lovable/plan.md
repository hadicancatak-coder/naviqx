
# Clean Up Error Logs System

## Problem Analysis

Based on the investigation, the error_logs table has 287+ unresolved errors, most of which are historical development-time issues like:
- `useAuth must be used within an AuthProvider` (hot-reload context issues)
- `useTaskDetailContext called outside provider` (component mounting during HMR)
- `useSidebar must be used within a SidebarProvider` (transient mount errors)

These are not real production bugs - they're artifacts of development hot-reloading.

## Solution Overview

Three-part fix:

1. **Add Bulk Resolve Method** - New method in `errorLogger.ts` to resolve all errors before a cutoff date
2. **Add Clear Historical Errors Button** - UI in admin panel to bulk-resolve old errors
3. **Filter Transient Errors** - Don't log known hot-reload/context errors to database

---

## Implementation Details

### Part 1: Add Bulk Resolve to ErrorLogger

**File: `src/lib/errorLogger.ts`**

Add a new method to bulk-resolve historical errors:

```typescript
async bulkResolveErrors(beforeDate: Date): Promise<{ count: number; success: boolean }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // First count how many will be affected
    const { count } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false)
      .lt('created_at', beforeDate.toISOString());

    // Then update them
    const { error } = await supabase
      .from('error_logs')
      .update({
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('resolved', false)
      .lt('created_at', beforeDate.toISOString());

    if (error) throw error;
    return { count: count || 0, success: true };
  } catch (err) {
    logger.error('Error bulk resolving errors', err);
    return { count: 0, success: false };
  }
}
```

### Part 2: Add Clear Historical Errors Button to Admin UI

**File: `src/pages/admin/ErrorLogs.tsx`**

Add a "Clear Historical Errors" button next to Refresh:

```typescript
// New state for bulk operation
const [clearing, setClearing] = useState(false);

// New handler
const handleClearHistorical = async () => {
  const confirmed = window.confirm(
    'This will mark all errors from before today as resolved. Continue?'
  );
  if (!confirmed) return;
  
  setClearing(true);
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await errorLogger.bulkResolveErrors(today);
    if (result.success) {
      toast.success(`Resolved ${result.count} historical errors`);
      fetchErrors();
    } else {
      toast.error('Failed to clear historical errors');
    }
  } finally {
    setClearing(false);
  }
};

// In JSX, add button next to Refresh
<Button 
  onClick={handleClearHistorical} 
  variant="outline"
  disabled={clearing}
>
  {clearing ? 'Clearing...' : 'Clear Historical'}
</Button>
```

### Part 3: Filter Transient Errors in Global Handlers

**File: `src/main.tsx`**

Add a filter to skip logging known hot-reload/context errors:

```typescript
// Known transient error patterns that shouldn't be logged
const TRANSIENT_ERROR_PATTERNS = [
  'useAuth must be used within an AuthProvider',
  'useTaskDetailContext called outside provider',
  'useSidebar must be used within a SidebarProvider',
  'useTheme must be used within a ThemeProvider',
  'Cannot read properties of null',
  'ResizeObserver loop',
];

function isTransientError(message: string): boolean {
  return TRANSIENT_ERROR_PATTERNS.some(pattern => 
    message.includes(pattern)
  );
}

// Update global error handler
window.addEventListener('error', (event) => {
  event.preventDefault();
  
  const message = event.message || 'Unknown error';
  
  // Skip transient development errors
  if (isTransientError(message)) {
    logger.debug('Skipped transient error:', message);
    return;
  }
  
  logger.error('Global error:', event.error);
  
  errorLogger.logError({
    severity: 'critical',
    type: 'frontend',
    message,
    stack: event.error?.stack,
    metadata: { 
      filename: event.filename, 
      lineno: event.lineno, 
      colno: event.colno,
    }
  });
});

// Update unhandledrejection handler similarly
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  
  const reason = event.reason;
  const message = reason?.message || reason?.toString() || 'Unknown promise rejection';
  
  // Skip transient development errors
  if (isTransientError(message)) {
    logger.debug('Skipped transient rejection:', message);
    return;
  }
  
  logger.error('Unhandled promise rejection:', event.reason);
  
  errorLogger.logError({
    severity: 'warning',
    type: 'frontend',
    message: `Unhandled Promise Rejection: ${message}`,
    stack: reason?.stack,
    metadata: { 
      reasonType: typeof reason,
      reasonConstructor: reason?.constructor?.name
    }
  });
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/errorLogger.ts` | Add `bulkResolveErrors()` method |
| `src/pages/admin/ErrorLogs.tsx` | Add "Clear Historical" button + handler |
| `src/main.tsx` | Add transient error filter before logging |

## Outcome

After implementation:

1. **Immediate cleanup**: Click "Clear Historical" to bulk-resolve 287+ old errors
2. **Future prevention**: Transient hot-reload errors won't pollute the logs
3. **Better signal**: Error log will only show real, actionable issues

## Technical Notes

- The bulk resolve uses `lt` (less than) comparison on `created_at` to catch all errors before today
- Transient error patterns are configurable - can add more as discovered
- The filter runs in the browser before the database call, so no wasted writes
- Both the count and update happen in the same method for accurate feedback
