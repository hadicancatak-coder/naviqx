
# Fix Plan: White Screen on /notifications (5 More `any` Errors)

## Root Cause

The white screen is **not** caused by the Notifications page itself. The Vite dev server is crashing due to **5 ESLint errors** in other files that are loaded as part of the app bundle. When ESLint fails on any file, the entire dev server stops rendering.

## Files With Blocking Errors

| File | Line(s) | Issue |
|------|---------|-------|
| `CreateCampaignDialog.tsx` | 73 | `error: any` in catch block |
| `DuplicateAdDialog.tsx` | 95 | `as any` in Supabase insert |
| `DuplicateCampaignDialog.tsx` | 14, 120 | `campaign: any` interface prop + `error: any` catch |
| `DeleteAdDialog.tsx` | 13, 49 | `ad: any` interface prop + `error: any` catch |
| `DuplicateAdGroupDialog.tsx` | 16, 101 | `adGroup: any` interface prop + `error: any` catch |

## Fix Strategy

### 1. CreateCampaignDialog.tsx (Line 73)
Convert `catch (error: any)` to proper error handling:
```typescript
} catch (error: unknown) {
  toast.error(error instanceof Error ? error.message : "Failed to create campaign");
}
```

### 2. DuplicateAdDialog.tsx (Line 95)
The `as any` already has an ESLint disable comment on line 88, but line 95 still shows error. Need to verify the disable is covering the cast properly.

### 3. DuplicateCampaignDialog.tsx
Define a `Campaign` interface and fix error handling:
```typescript
interface Campaign {
  id: string;
  name: string;
  entity?: string;
  languages?: string[];
  // add other fields used
}

interface DuplicateCampaignDialogProps {
  campaign: Campaign;
  // ...
}

// Line 120
} catch (error: unknown) {
  toast.error(error instanceof Error ? error.message : "Failed to duplicate campaign");
}
```

Also fix semantic token violations in JSX (lines 148, 149, 155, 159, 168, 170).

### 4. DeleteAdDialog.tsx
Define an `Ad` interface and fix error handling:
```typescript
interface Ad {
  id: string;
  name: string;
  ad_group_id?: string;
}

interface DeleteAdDialogProps {
  ad: Ad;
  // ...
}

// Line 49
} catch (error: unknown) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : "Failed to delete ad. Please try again.";
  toast.error(errorMessage);
}
```

Also fix gap token on line 62: `gap-2` to `gap-xs`.

### 5. DuplicateAdGroupDialog.tsx
Define an `AdGroup` interface and fix error handling:
```typescript
interface AdGroup {
  id: string;
  name: string;
  campaign_id?: string;
}

interface DuplicateAdGroupDialogProps {
  adGroup: AdGroup;
  // ...
}

// Line 101
} catch (error: unknown) {
  toast.error(error instanceof Error ? error.message : "Failed to duplicate ad group");
}
```

Also fix semantic token violations (lines 144, 150).

## Implementation Order

1. Fix `CreateCampaignDialog.tsx` - single error catch
2. Fix `DuplicateAdDialog.tsx` - verify ESLint disable covers the cast  
3. Fix `DeleteAdDialog.tsx` - interface + error catch + gap token
4. Fix `DuplicateCampaignDialog.tsx` - interface + error catch + token migrations
5. Fix `DuplicateAdGroupDialog.tsx` - interface + error catch + token migrations

## Expected Outcome

- Dev server stops crashing
- White screen resolves
- `/notifications` page renders correctly
- All 5 files pass ESLint validation
