

## Fix Build-Blocking `no-useless-escape` Errors

### Problem Summary

The build is failing due to 17+ `no-useless-escape` errors across 4 files. These errors occur because regex patterns contain unnecessarily escaped characters inside character classes `[]`.

---

### Files to Fix

#### 1. `src/lib/keywordEngine.ts` (3 locations)

**Line 204** - ASCII normalization regex:
```javascript
// Before:
const asciiNorm = norm.replace(/[.,\/;:_\-\(\)\[\]\{\}\"'`!@#$%^&*+=<>?\\|~]/g, ' ')

// After:
const asciiNorm = norm.replace(/[.,/;:_()\[\]{}\"'`!@#$%^&*+=<>?\\|~-]/g, ' ')
```

**Line 467** - Junk pattern regex:
```javascript
// Before:
const JUNK_PATTERN = /^[0-9\s\-\.]+$|^\s*$/;

// After:
const JUNK_PATTERN = /^[0-9\s.]+$|^\s*$/;  // hyphen removed as not needed
```

**Line 510** - Dictionary matching regex:
```javascript
// Before:
const aliasAscii = aliasNorm.replace(/[.,/;:_\-()[\]{}\"'`!@#$%^&*+=<>?\\|~]/g, ' ')

// After:
const aliasAscii = aliasNorm.replace(/[.,/;:_()[\]{}\"'`!@#$%^&*+=<>?\\|~-]/g, ' ')
```

**Line 863** - Token extraction regex:
```javascript
// Before:
const norm = text.toLowerCase().replace(/[.,\/;:_\-\(\)\[\]\{\}\"'`!@#$%^&*+=<>?\\|~]/g, ' ')

// After:
const norm = text.toLowerCase().replace(/[.,/;:_()\[\]{}\"'`!@#$%^&*+=<>?\\|~-]/g, ' ')
```

#### 2. `src/components/PasswordStrengthIndicator.tsx` (Line 17)

```javascript
// Before:
{ label: "One special character", met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) }

// After:
{ label: "One special character", met: /[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(password) }
```

#### 3. `src/pages/Security.tsx` (Line 93)

```javascript
// Before:
const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

// After:
const hasSpecial = /[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(newPassword);
```

#### 4. `src/lib/validationSchemas.ts` (Line ~202)

```javascript
// Before:
.regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "...")

// After:
.regex(/[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/, "...")
```

---

### Regex Escape Rules (Reference)

Inside a character class `[]`:
| Character | Needs Escape? | Notes |
|-----------|--------------|-------|
| `/` | No | Only needs escape outside `[]` in regex literals |
| `(` `)` | No | Not special inside `[]` |
| `{` `}` | No | Not special inside `[]` |
| `"` | No | Not special in regex |
| `.` | No | Literal dot inside `[]` |
| `-` | **Sometimes** | Only if in the middle; safe at start/end |
| `[` `]` | **Yes** | Must escape `]` to include it; `[` is safe |
| `\` | **Yes** | Always needs escaping |
| `^` | **Sometimes** | Only at the start of `[]` |

---

### Prevention Strategy

After fixing these issues, add a pre-commit check or CI step to catch regex issues early:

1. **ESLint runs on save** - Already configured in Vite
2. **Consider adding a utility function** for the common punctuation strip pattern to avoid duplication:

```typescript
// src/lib/stringUtils.ts
export const PUNCTUATION_PATTERN = /[.,/;:_()[\]{}\"'`!@#$%^&*+=<>?\\|~-]/g;

export function stripPunctuation(text: string): string {
  return text.replace(PUNCTUATION_PATTERN, ' ').replace(/\s+/g, ' ').trim();
}
```

This would:
- Centralize the pattern (fix once, apply everywhere)
- Reduce duplication across 3+ locations in `keywordEngine.ts`
- Make future maintenance easier

---

### Implementation Order

1. Fix `src/lib/keywordEngine.ts` (4 regex patterns)
2. Fix `src/components/PasswordStrengthIndicator.tsx` (1 pattern)
3. Fix `src/pages/Security.tsx` (1 pattern)
4. Fix `src/lib/validationSchemas.ts` (1 pattern)
5. Verify build passes
6. (Optional) Refactor to use shared utility function

---

### Expected Outcome

After these changes:
- All 17 `no-useless-escape` errors will be resolved
- Build will succeed without suppression comments
- Regex patterns will be more readable and maintainable

