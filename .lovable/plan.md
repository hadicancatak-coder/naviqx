
# Fix SecurityScans.tsx - All 40 Errors

## Complete Rewrite Required

The file has **9 TypeScript errors** and **31 ESLint warnings**. Here's the complete fix:

### TypeScript Fixes (9 errors)

| Line | Current | Fix |
|------|---------|-----|
| 25 | `findings: any` | `findings: SecurityFinding[]` |
| 26 | `summary: any` | `summary: ScanSummary` |
| 37 | `details: any` | `details: Record<string, unknown>` |
| 64 | `scansData as any` | `scansData as SecurityScan[]` |
| 76 | `error: any` | `error: unknown` + instanceof check |
| 101 | `error: any` | `error: unknown` + instanceof check |
| 131 | `error: any` | `error: unknown` + instanceof check |
| 142 | `variants: any` | `variants: Record<string, "destructive" \| "default" \| "secondary" \| "outline">` |
| 270 | `finding: any` | `finding: SecurityFinding` |

### New Interfaces to Add

```typescript
interface SecurityFinding {
  type: string;
  severity: string;
  description: string;
  count?: number;
  details?: Record<string, unknown>;
}

interface ScanSummary {
  total_findings: number;
  by_severity?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  };
  scan_duration_ms?: number;
}
```

### ESLint Fixes (31 warnings)

| Issue | Lines | Fix |
|-------|-------|-----|
| Missing `fetchData` dependency | 51 | Wrap `fetchData` in `useCallback`, add `[fetchData]` to `useEffect` |
| `mt-1` | 177 | `mt-xs` |
| `mr-2` | 184, 189 | `mr-sm` |
| `pb-2` | 200, 213, 226, 239 | `pb-xs` |
| `space-y-0` | 200, 213, 226, 239 | Add eslint-disable or use semantic |
| `text-sm` | 201, 214, 227, 240 | `text-body-sm` |
| `text-xs` | 206, 221, 234, 245, 279, 281, 284, 330 | `text-metadata` |
| `mb-2` | 279, 294, 352 | `mb-sm` |
| `p-2` | 284 | `p-sm` |
| `mt-2` | 284 | `mt-sm` |
| `py-8` | 293, 351 | `py-xl` |

### Hook Fix Pattern

```typescript
const fetchData = useCallback(async () => {
  // ... existing logic
}, [toast]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

### Error Handler Pattern

```typescript
} catch (error: unknown) {
  logger.error('Error:', error);
  toast({
    title: "Error",
    description: error instanceof Error ? error.message : "Unknown error",
    variant: "destructive",
  });
}
```

## Summary

- **9 TypeScript `any` → proper types**
- **1 useEffect dependency fix**
- **30 raw utility classes → semantic tokens**
- **Total: 40 problems → 0 problems**
