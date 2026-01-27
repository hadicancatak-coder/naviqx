
# Site-Wide Footer Audit & Standardization Plan

## Current State Analysis

### Footer Implementations Found

| Page | Current Footer | Issue |
|------|---------------|-------|
| **External/Public Pages** |||
| `CampaignReview.tsx` | `ExternalPageFooter` | Correct |
| `KnowledgePublic.tsx` | `ExternalPageFooter` | Correct |
| `LpMapPublic.tsx` | `ExternalPageFooter` | Correct |
| `ProjectsPublic.tsx` | `ExternalPageFooter` | Correct |
| `CampaignsLogExternal.tsx` | Redirects to CampaignReview | OK (deprecated) |
| **Authentication Flow** |||
| `Auth.tsx` | Hardcoded: "CFI Performance Marketing • Secure Access" | Missing year, missing Naviqx |
| `MfaSetup.tsx` | No footer | Missing entirely |
| `MfaVerify.tsx` | No footer | Missing entirely |
| **Internal Pages** |||
| `About.tsx` | Hardcoded: "© 2025 Naviqx. All rights reserved." | Inconsistent style |
| `HowTo.tsx` | No footer | Missing entirely |
| `NotFound.tsx` | No footer | Missing entirely |
| `Layout.tsx` (global) | No footer | Missing for all internal pages |

### Key Problems Identified

1. **Missing "© 2025 Naviqx" branding** - The `ExternalPageFooter` component does NOT include the year or copyright notice you requested
2. **Inconsistent footer patterns** - 3 different footer styles across the app
3. **No global internal footer** - Internal authenticated pages have no footer at all
4. **Auth flow lacks branding** - Login and MFA pages don't show the Naviqx brand

---

## Proposed Architecture

### Create Two Standardized Footer Components

```text
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL PAGE FOOTER                          │
│  (For public-facing pages: CampaignReview, KnowledgePublic, etc)│
├─────────────────────────────────────────────────────────────────┤
│  © 2025 Naviqx. All rights reserved.                            │
│  ™ Proudly presented by the Performance Marketing Team,         │
│    CFI Financial Group.                                          │
│  This asset has been designed and developed internally...        │
│  Confidential material — for internal circulation only.          │
│  Unauthorized distribution or third-party sharing is prohibited. │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    INTERNAL PAGE FOOTER                          │
│  (For authenticated pages + auth flow: Dashboard, Tasks, etc.)  │
├─────────────────────────────────────────────────────────────────┤
│  © 2025 Naviqx                                                   │
│  CFI Performance Marketing • Internal Use Only                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     AUTH PAGE FOOTER                             │
│  (Compact version for Login, MFA Setup, MFA Verify)             │
├─────────────────────────────────────────────────────────────────┤
│  © 2025 Naviqx • CFI Performance Marketing                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Update ExternalPageFooter Component
Add the "© 2025 Naviqx" branding line to the existing component:

**File:** `src/components/layout/ExternalPageFooter.tsx`

```typescript
export function ExternalPageFooter({ className }: ExternalPageFooterProps) {
  return (
    <footer className={cn("border-t border-border bg-card/80 backdrop-blur-sm mt-12", className)}>
      <div className="max-w-5xl mx-auto px-6 py-8 text-center space-y-3">
        {/* NEW: Add copyright line */}
        <p className="text-body-sm font-semibold text-foreground">
          © 2025 Naviqx. All rights reserved.
        </p>
        <p className="text-body-sm text-foreground">
          ™ Proudly presented by the Performance Marketing Team, CFI Financial Group.
        </p>
        <div className="space-y-1">
          <p className="text-metadata text-muted-foreground">
            This asset has been designed and developed internally using proprietary AI-assisted workflows.
          </p>
          <p className="text-metadata text-muted-foreground font-medium">
            Confidential material — for internal circulation only.
          </p>
          <p className="text-metadata text-destructive-text">
            Unauthorized distribution or third-party sharing is strictly prohibited.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

**Impact:** Automatically propagates to all 4 public pages already using this component.

---

### Step 2: Create InternalPageFooter Component
Create a new minimal footer for authenticated internal pages.

**File:** `src/components/layout/InternalPageFooter.tsx`

```typescript
export function InternalPageFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("py-6 text-center", className)}>
      <p className="text-metadata text-muted-foreground">
        © 2025 Naviqx • CFI Performance Marketing • Internal Use Only
      </p>
    </footer>
  );
}
```

---

### Step 3: Create AuthPageFooter Component
Create a compact footer for auth-flow pages.

**File:** `src/components/layout/AuthPageFooter.tsx`

```typescript
export function AuthPageFooter({ className }: { className?: string }) {
  return (
    <div className={cn("mt-lg pt-md border-t border-border", className)}>
      <p className="text-metadata text-center text-muted-foreground">
        © 2025 Naviqx • CFI Performance Marketing
      </p>
    </div>
  );
}
```

---

### Step 4: Update Auth Flow Pages

| Page | Change |
|------|--------|
| `Auth.tsx` | Replace hardcoded footer with `AuthPageFooter` |
| `MfaSetup.tsx` | Add `AuthPageFooter` before closing `</GlassBackground>` |
| `MfaVerify.tsx` | Add `AuthPageFooter` before closing `</GlassBackground>` |

---

### Step 5: Update Internal Pages

| Page | Change |
|------|--------|
| `About.tsx` | Replace hardcoded footer with `InternalPageFooter` |
| `HowTo.tsx` | Add `InternalPageFooter` at bottom |
| `NotFound.tsx` | Add compact copyright below the card |

---

### Step 6: Consider Global Internal Footer (Optional)
For a truly site-wide internal footer, add `InternalPageFooter` to `Layout.tsx` so ALL authenticated pages automatically have it:

**File:** `src/components/Layout.tsx`
```typescript
// At the bottom of the main content area, after <Outlet />
<InternalPageFooter className="mt-auto" />
```

**Trade-off:** This adds a footer to every single page. Recommend discussing if this is desired or if it should remain per-page for internal content.

---

## Summary of Changes

| File | Action |
|------|--------|
| `src/components/layout/ExternalPageFooter.tsx` | Add "© 2025 Naviqx" line |
| `src/components/layout/InternalPageFooter.tsx` | **Create new** |
| `src/components/layout/AuthPageFooter.tsx` | **Create new** |
| `src/pages/Auth.tsx` | Use `AuthPageFooter` |
| `src/pages/MfaSetup.tsx` | Add `AuthPageFooter` |
| `src/pages/MfaVerify.tsx` | Add `AuthPageFooter` |
| `src/pages/About.tsx` | Use `InternalPageFooter` |
| `src/pages/HowTo.tsx` | Add `InternalPageFooter` |
| `src/pages/NotFound.tsx` | Add minimal copyright |
| `src/components/Layout.tsx` | *Optional:* Add global `InternalPageFooter` |

---

## Technical Notes

- All footer components use semantic tokens (`text-foreground`, `text-muted-foreground`, `border-border`) for theme compatibility
- All footer components are in `src/components/layout/` for organization
- The year "2025" could be made dynamic with `new Date().getFullYear()` if desired
- No changes to the 4 external public pages needed since they already use `ExternalPageFooter`

