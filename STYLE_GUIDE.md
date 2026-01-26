# Naviqx Style Guide

> **Single source of truth for all styling.** All new code MUST follow this guide.

---

## Quick Reference Card

### Typography (NEVER use raw text-xs, text-sm, etc.)

| Use This | Instead Of | Size |
|----------|------------|------|
| `text-metadata` | `text-xs`, `text-[12px]` | 12px |
| `text-body-sm` | `text-sm`, `text-[13px]`, `text-[14px]` | 14px |
| `text-body` | `text-base`, `text-[16px]` | 16px |
| `text-heading-sm` | `text-lg`, `text-[18px]` | 18px |
| `text-heading-md` | `text-xl`, `text-[20px]` | 20px |
| `text-heading-lg` | `text-2xl`, `text-[24px]` | 24px |
| `text-page-title` | `text-3xl`, `text-[30px]` | 30px |

### Spacing (NEVER use raw gap-2, p-4, etc.)

| Use This | Instead Of | Size |
|----------|------------|------|
| `gap-xs` / `p-xs` / `space-y-xs` | `gap-1`, `p-1`, `space-y-1` | 4px |
| `gap-sm` / `p-sm` / `space-y-sm` | `gap-2`, `gap-3`, `p-2`, `p-3`, `space-y-2`, `space-y-3` | 8px |
| `gap-md` / `p-md` / `space-y-md` | `gap-4`, `p-4`, `space-y-4` | 16px |
| `gap-lg` / `p-lg` / `space-y-lg` | `gap-6`, `p-6`, `space-y-6` | 24px |
| `gap-xl` / `p-xl` / `space-y-xl` | `gap-8`, `p-8`, `space-y-8` | 32px |
| `gap-2xl` / `p-2xl` / `space-y-2xl` | `gap-12`, `p-12`, `space-y-12` | 48px |
| `p-card` | Card internal padding | 24px |

### Margins

| Use This | Instead Of |
|----------|------------|
| `mt-section` / `mb-section` | `mt-8`, `mb-8` |
| `mt-card` / `mb-card` | `mt-6`, `mb-6` |
| `mt-sm` / `mb-sm` | `mt-2`, `mb-2`, `mt-3`, `mb-3` |
| `mt-md` / `mb-md` | `mt-4`, `mb-4` |
| `mt-lg` / `mb-lg` | `mt-6`, `mb-6` |

### Border Radius

| Use This | Instead Of | Size |
|----------|------------|------|
| `rounded-sm` | `rounded-[4px]`, `rounded-[6px]` | 6px |
| `rounded` or `rounded-md` | `rounded-[8px]` | 8px |
| `rounded-lg` | `rounded-[12px]` | 12px |
| `rounded-xl` | `rounded-[16px]` | 16px |
| `rounded-full` | Pills, avatars, circular buttons | 9999px |

### Row Heights (Density Scale)

| Use This | Instead Of | Size | Usage |
|----------|------------|------|-------|
| `h-row-compact` | `h-7`, `h-8` | 30px | Task rows, table rows, dense lists |
| `h-row-default` | `h-9`, `h-10` | 36px | Standard interactive rows |
| `h-row-comfortable` | `h-10`, `h-11` | 40px | Spacious layouts, form rows |

---

## Rule Classification (HARD vs SOFT)

Rules are classified by enforcement level:

### 🔴 HARD RULES (Build/Lint Enforcement)

These rules MUST be enforced via ESLint warnings and will eventually become build errors:

| Rule | Category | Enforcement |
|------|----------|-------------|
| No raw typography (`text-sm`, `text-lg`, etc.) | Typography | ESLint warn |
| No raw spacing (`gap-4`, `p-6`, `space-y-4`) | Spacing | ESLint warn |
| No hardcoded colors (`text-white`, `bg-gray-*`, hex) | Colors | ESLint warn |
| No arbitrary values (`w-[123px]`) without exception | Sizing | ESLint warn |
| All colors must use semantic tokens | Colors | ESLint warn |
| Z-index must use semantic scale | Layering | ESLint warn |

### 🟡 SOFT RULES (Review Guidance)

These rules are enforced at code review and represent best practices:

| Rule | Category | Enforcement |
|------|----------|-------------|
| Prefer existing UI components | Architecture | PR Review |
| Follow component patterns as shown | Patterns | PR Review |
| Use appropriate density for context | Density | PR Review |
| Maintain consistent hover/focus states | Interactions | PR Review |
| Document exceptions with comments | Documentation | PR Review |

---

## Core Rules

### ❌ NEVER Do This

```tsx
// Raw colors - BANNED
<div className="text-white bg-black">
<div className="text-gray-500 bg-gray-100">
<div className="bg-[#f5f5f5] text-[#333]">

// Raw typography - BANNED
<p className="text-sm">
<h3 className="text-lg font-semibold">
<span className="text-xs">

// Raw spacing - BANNED
<div className="gap-4 p-6">
<div className="space-y-4">
<div className="mt-8 mb-4">
```

### ✅ ALWAYS Do This

```tsx
// Semantic colors
<div className="text-foreground bg-background">
<div className="text-muted-foreground bg-muted">
<div className="bg-card text-card-foreground">

// Semantic typography
<p className="text-body-sm">
<h3 className="text-heading-sm font-semibold">
<span className="text-metadata">

// Semantic spacing
<div className="gap-md p-lg">
<div className="space-y-md">
<div className="mt-section mb-md">
```

---

## Color Tokens

### Background Colors

| Token | Usage |
|-------|-------|
| `bg-background` | Page background |
| `bg-card` | Cards, elevated surfaces |
| `bg-card-hover` | Card hover state |
| `bg-muted` | Muted sections, disabled states |
| `bg-elevated` | Elevated panels, popovers |
| `bg-subtle` | Subtle backgrounds, chips |
| `bg-input` | Form inputs |
| `bg-sidebar` | Sidebar background |

### Text Colors

| Token | Usage |
|-------|-------|
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary/helper text |
| `text-subtle` | Tertiary text, low emphasis |
| `text-card-foreground` | Text on cards |
| `text-primary` | Primary action text |
| `text-primary-foreground` | Text on primary backgrounds |

### Border Colors

| Token | Usage |
|-------|-------|
| `border-border` | Standard borders |
| `border-subtle` | Light separators |
| `border-input` | Input borders |

### Status Colors

```tsx
// Success
<div className="bg-success/15 text-success border-success/30">

// Warning
<div className="bg-warning/15 text-warning border-warning/30">

// Destructive/Error
<div className="bg-destructive/15 text-destructive border-destructive/30">

// Info
<div className="bg-info/15 text-info border-info/30">

// Pending
<div className="bg-pending/15 text-pending border-pending/30">
```

### Priority Colors

```tsx
// High priority
<Badge className="bg-priority-high/15 text-priority-high">High</Badge>

// Medium priority
<Badge className="bg-priority-medium/15 text-priority-medium">Medium</Badge>

// Low priority
<Badge className="bg-priority-low/15 text-priority-low">Low</Badge>
```

---

## Status Semantics (Data-Driven)

### Core Principle

**Status is a DATA VALUE, not a style.** All status-related styling MUST be derived from a single source of truth.

### Requirements

1. **Single Status Mapping**: All status badges, pills, rows, and indicators MUST use the same mapping object
2. **No Manual Styling**: Manual styling of status values is FORBIDDEN
3. **Centralized Definition**: Status configurations belong in `src/lib/constants.ts`

### Correct Pattern

```tsx
// ✅ CORRECT - Use centralized status config
import { TASK_STATUSES } from "@/lib/constants";

const statusConfig = TASK_STATUSES.reduce((acc, s) => ({
  ...acc,
  [s.value]: { bg: s.bgClass, text: s.textClass }
}), {});

// Then use the config:
<Badge className={cn(statusConfig[status].bg, statusConfig[status].text)}>
  {status}
</Badge>
```

### Forbidden Pattern

```tsx
// ❌ FORBIDDEN - Inline status styling
<Badge className={
  status === 'Completed' ? 'bg-green-100 text-green-800' :
  status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
  'bg-gray-100 text-gray-800'
}>
  {status}
</Badge>
```

### Enforcement

- Status styling violations are caught at PR review
- Any component rendering status MUST import from the centralized mapping
- Custom status colors require adding to the central config, not local overrides

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `z-dropdown` | 50 | Dropdowns, selects |
| `z-sticky` | 100 | Sticky headers |
| `z-modal` | 200 | Modals, dialogs |
| `z-popover` | 250 | Popovers, tooltips |
| `z-tooltip` | 300 | Tooltips |
| `z-toast` | 400 | Toast notifications |
| `z-overlay` | 500 | Full-screen overlays |

---

## Liquid Glass UI

### Classes

| Class | Usage |
|-------|-------|
| `liquid-glass` | Headers, subtle panels, filter bars |
| `liquid-glass-elevated` | Sidebars, sheets, major panels, modals |
| `liquid-glass-dropdown` | Dropdowns, popovers, context menus, tooltips |

### Design Characteristics

- **Blue-tinted gradients** in both light and dark modes
- **Frosted glass effect** via `backdrop-filter: blur() saturate()`
- **Subtle inset shadows** for depth
- **Organic flow** with multiple gradient layers

### Important Rules

1. **Never use `position: relative`** on elements with liquid-glass classes if they need different positioning (e.g., `fixed` for sheets)
2. Liquid glass classes use `isolation: isolate` for proper stacking context
3. Always combine with appropriate border-radius (`rounded-xl`, `rounded-2xl`)
4. Use with subtle borders (`border-border/50` or theme-defined borders)

### Correct Pattern

```tsx
// ✅ CORRECT - Sheet with liquid glass
<SheetContent className="liquid-glass-elevated rounded-l-2xl">
  {/* Content */}
</SheetContent>

// ✅ CORRECT - Dropdown with liquid glass
<PopoverContent className="liquid-glass-dropdown rounded-xl">
  {/* Content */}
</PopoverContent>
```

### Forbidden Pattern

```tsx
// ❌ FORBIDDEN - Adding position that conflicts with component needs
<div className="liquid-glass-elevated relative"> {/* Don't add relative if component needs fixed */}
  {/* This breaks sheets! */}
</div>
```

---

## Density Levels

### Core Principle

Every page and major surface MUST declare ONE density level. Child components MUST inherit this density. **Mixing density tokens on the same surface is FORBIDDEN.**

### Density Definitions

| Density | Typography | Spacing | Use Case |
|---------|------------|---------|----------|
| **Compact** | `text-metadata`, `text-body-sm` | `gap-xs`, `gap-sm`, `p-sm` | Data tables, dense lists, sidebars |
| **Default** | `text-body-sm`, `text-body` | `gap-sm`, `gap-md`, `p-md` | Forms, cards, standard content |
| **Comfortable** | `text-body`, `text-heading-*` | `gap-md`, `gap-lg`, `p-lg` | Marketing pages, dashboards, hero sections |

### Requirements

1. **Page Declaration**: Every page component MUST document its density level in a comment
2. **Inheritance**: Child components MUST NOT use tokens from a different density level
3. **Boundaries**: Density changes are only allowed at explicit surface boundaries (e.g., a card within a page)

### Correct Pattern

```tsx
// ✅ CORRECT - Compact density throughout
// @density: compact
const DataTable = () => (
  <Table>
    <TableRow className="py-xs">
      <TableCell className="text-metadata">...</TableCell>
      <TableCell className="text-body-sm gap-xs">...</TableCell>
    </TableRow>
  </Table>
);
```

### Forbidden Pattern

```tsx
// ❌ FORBIDDEN - Mixed density
const DataTable = () => (
  <Table>
    <TableRow className="py-xs">           {/* Compact */}
      <TableCell className="text-heading-lg p-lg">  {/* Comfortable - WRONG */}
        ...
      </TableCell>
    </TableRow>
  </Table>
);
```

---

## Component Patterns

### Page Container

```tsx
<div className="max-w-[1400px] mx-auto px-lg">
  <PageHeader title="Page Title" />
  <div className="space-y-lg">
    {/* Page content */}
  </div>
</div>
```

### Card

```tsx
<Card className="p-card">
  <CardHeader className="p-0 mb-md">
    <CardTitle className="text-heading-sm font-semibold">Title</CardTitle>
    <CardDescription className="text-body-sm text-muted-foreground">
      Description text
    </CardDescription>
  </CardHeader>
  <CardContent className="p-0 space-y-md">
    {/* Content */}
  </CardContent>
</Card>
```

### Form

```tsx
<form className="space-y-md">
  <div className="space-y-sm">
    <Label className="text-body-sm font-medium">Field Label</Label>
    <Input placeholder="Enter value" />
    <p className="text-metadata text-muted-foreground">Helper text</p>
  </div>
</form>
```

### Table

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="text-metadata font-medium text-muted-foreground">
        Column Header
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-card-hover">
      <TableCell className="text-body-sm">Cell content</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Dialog

```tsx
<Dialog>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle className="text-heading-md font-semibold">
        Dialog Title
      </DialogTitle>
      <DialogDescription className="text-body-sm text-muted-foreground">
        Description text
      </DialogDescription>
    </DialogHeader>
    <div className="py-md space-y-md">
      {/* Dialog content */}
    </div>
    <DialogFooter className="gap-sm">
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Filter Row

```tsx
<div className="flex items-center gap-md flex-wrap">
  <Input className="w-[250px]" placeholder="Search..." />
  <Select>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Filter by..." />
    </SelectTrigger>
  </Select>
  <Button variant="outline" size="sm">
    <Filter className="h-4 w-4 mr-sm" />
    Filters
  </Button>
</div>
```

### Status Badge

```tsx
// Use the appropriate status color
<Badge className="bg-success/15 text-success border-success/30">
  Completed
</Badge>

<Badge className="bg-warning/15 text-warning border-warning/30">
  Pending
</Badge>

<Badge className="bg-destructive/15 text-destructive border-destructive/30">
  Failed
</Badge>
```

### Button with Icon

```tsx
<Button className="gap-sm">
  <Plus className="h-4 w-4" />
  Add Item
</Button>

// Icon-only button
<Button size="icon" variant="ghost">
  <Settings className="h-4 w-4" />
</Button>
```

---

## Transitions & Animations

| Class | Usage |
|-------|-------|
| `transition-smooth` | Standard 150ms ease-in-out transition |
| `hover-lift` | Subtle translateY + shadow on hover |
| `hover-scale` | Slight scale up (max 1.02) |
| `hover-glow` | Soft focus glow for primary elements |
| `card-glow` | Soft card elevation on hover |

```tsx
// Interactive card
<Card className="transition-smooth hover-lift cursor-pointer">

// Interactive button
<Button className="transition-smooth">
```

---

## Focus & Accessibility

### Focus Ring Requirements

1. **Minimum Contrast**: Focus rings MUST have a contrast ratio of at least 3:1 against adjacent colors
2. **Visibility**: Focus rings MUST use `ring-ring` token which is designed for both light and dark modes
3. **Consistency**: All focusable elements MUST have visible focus states

### Correct Focus Pattern

```tsx
// ✅ CORRECT - Semantic focus ring
<Button className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">

// ✅ CORRECT - Input focus
<Input className="focus-visible:ring-2 focus-visible:ring-ring" />
```

### Disabled vs Read-Only

| State | Visual Treatment | Interaction | Use Case |
|-------|------------------|-------------|----------|
| **Disabled** | `opacity-50 cursor-not-allowed` | No interaction, not focusable | User cannot perform action |
| **Read-Only** | Normal opacity, `cursor-default` | Focusable, selectable text | Display-only, copy-friendly |

```tsx
// Disabled
<Button disabled className="opacity-50 cursor-not-allowed">Submit</Button>

// Read-only
<Input readOnly className="cursor-default bg-muted" value="Read only value" />
```

### Required Keyboard Support

All interactive components MUST support:

| Key | Expected Behavior |
|-----|-------------------|
| `Tab` | Move focus to next focusable element |
| `Shift+Tab` | Move focus to previous focusable element |
| `Enter` / `Space` | Activate buttons, toggle checkboxes |
| `Escape` | Close modals, dropdowns, popovers |
| `Arrow Keys` | Navigate within lists, menus, radio groups |

---

## Layout Standards

### Page Structure

```tsx
// Every page should follow this structure
<PageContainer>
  <PageHeader 
    title="Page Title"
    description="Optional description"
    actions={<Button>Action</Button>}
  />
  
  {/* Optional filter bar */}
  <FilterBar className="mb-lg">
    {/* Filters */}
  </FilterBar>
  
  {/* Main content */}
  <div className="space-y-lg">
    {/* Content sections */}
  </div>
</PageContainer>
```

### Grid Layouts

```tsx
// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
  {items.map(item => <Card key={item.id} />)}
</div>

// Stats cards
<div className="grid grid-cols-2 md:grid-cols-4 gap-md">
  {stats.map(stat => <StatCard key={stat.label} />)}
</div>
```

### Section Spacing

```tsx
// Between major sections
<div className="space-y-lg">
  <Section1 />
  <Section2 />
</div>

// Within a section
<div className="space-y-md">
  <SubSection1 />
  <SubSection2 />
</div>

// Dense content (form fields, list items)
<div className="space-y-sm">
  <Item1 />
  <Item2 />
</div>
```

---

## Banned Utility Matrix

The following raw Tailwind utilities are **EXPLICITLY BANNED**. Use semantic tokens instead.

### 🔴 Typography (HARD BAN)

| Banned | Replacement |
|--------|-------------|
| `text-xs` | `text-metadata` |
| `text-sm` | `text-body-sm` |
| `text-base` | `text-body` |
| `text-lg` | `text-heading-sm` |
| `text-xl` | `text-heading-md` |
| `text-2xl` | `text-heading-lg` |
| `text-3xl` | `text-page-title` |
| `leading-*` | Remove - semantic tokens include line-height |
| `tracking-*` | Remove - semantic tokens include letter-spacing |

### 🔴 Spacing (HARD BAN)

| Banned | Replacement |
|--------|-------------|
| `px-*`, `py-*`, `pt-*`, `pb-*`, `pl-*`, `pr-*` | `p-xs`, `p-sm`, `p-md`, `p-lg`, `p-xl`, `p-card` |
| `mx-*`, `my-*`, `mt-*`, `mb-*`, `ml-*`, `mr-*` | `mt-sm`, `mb-md`, `mt-section`, `mb-card` |
| `gap-1` through `gap-12` | `gap-xs`, `gap-sm`, `gap-md`, `gap-lg`, `gap-xl` |
| `space-x-*`, `space-y-*` | `space-y-sm`, `space-y-md`, `space-y-lg` |

### 🔴 Colors (HARD BAN)

| Banned | Replacement |
|--------|-------------|
| `text-white`, `text-black` | `text-foreground`, `text-primary-foreground` |
| `text-gray-*` | `text-muted-foreground`, `text-subtle` |
| `bg-white`, `bg-black` | `bg-background`, `bg-card` |
| `bg-gray-*` | `bg-muted`, `bg-subtle`, `bg-elevated` |
| `border-gray-*` | `border-border`, `border-subtle` |
| Hex values (`#fff`, `#333`) | Use semantic tokens |
| RGB values (`rgb(...)`) | Use semantic tokens |

### 🔴 Arbitrary Values (CONDITIONAL BAN)

| Pattern | Status |
|---------|--------|
| `w-[123px]`, `h-[456px]` | BANNED unless documented in Exceptions |
| `text-[14px]` | BANNED - use semantic typography |
| `bg-[#hexcode]` | BANNED - use semantic colors |
| `p-[20px]` | BANNED - use semantic spacing |

**Exception Process**: If an arbitrary value is required, you MUST:
1. Document the reason in a code comment
2. Reference the exception category from the Exceptions section
3. Use `// eslint-disable-next-line` with explanation

---

## Exceptions

The following are acceptable exceptions to the token rules:

1. **Device Simulations** (e.g., phone previews in SnapPreview.tsx)
   - May use exact device dimensions and colors
   - Document in component comments

2. **Third-Party Library Overrides**
   - When overriding library styles, document why
   - Keep overrides minimal and scoped

3. **Pixel-Perfect Requirements**
   - When matching exact external designs
   - Document the source requirement

4. **Fixed-Width Inputs**
   - Search fields and filters may use `w-[Npx]` for consistent layouts
   - Must be documented with purpose

---

## Migration Approach

### For Existing Code

1. **DO NOT** mass-migrate existing files
2. **DO** fix files when editing them for other reasons
3. **DO** prioritize high-visibility pages when making fixes

### For New Code

1. **ALL** new code MUST follow this guide
2. **NO** exceptions without documented justification
3. **REVIEW** PRs for token compliance

### When Editing a File

If you're editing a file for any reason:
1. Fix obvious token violations in the code you're touching
2. Don't fix unrelated code in the same file (scope creep)
3. Note large violations for future cleanup

---

## Checklist for New Components

Before submitting new code, verify:

- [ ] No raw colors (`text-white`, `bg-gray-*`, hex values)
- [ ] No raw typography (`text-sm`, `text-xs`, `text-lg`)
- [ ] No raw spacing (`gap-4`, `p-6`, `space-y-4`)
- [ ] Uses semantic tokens for all colors
- [ ] Uses semantic tokens for all typography
- [ ] Uses semantic tokens for all spacing
- [ ] Works correctly in both Light and Dark modes
- [ ] Uses appropriate z-index tokens for overlays
- [ ] Has proper hover/focus states with transitions
- [ ] Declares density level if applicable
- [ ] Status values use centralized config

---

## Common Mistakes to Avoid

### 1. Mixing Systems

```tsx
// ❌ BAD - Mixing semantic and raw tokens
<div className="text-body-sm text-gray-500">

// ✅ GOOD - All semantic
<div className="text-body-sm text-muted-foreground">
```

### 2. Hardcoding Dark Mode

```tsx
// ❌ BAD - Hardcoded dark mode colors
<div className="bg-gray-900 dark:bg-gray-800">

// ✅ GOOD - Semantic tokens handle both modes
<div className="bg-card">
```

### 3. Inline Color Overrides

```tsx
// ❌ BAD - Inline hex colors
<Button style={{ backgroundColor: '#3b82f6' }}>

// ✅ GOOD - Use variant or semantic class
<Button variant="default">
```

### 4. Wrong Token Category

```tsx
// ❌ BAD - Using text token for heading
<h2 className="text-body font-bold">

// ✅ GOOD - Using heading token
<h2 className="text-heading-md font-semibold">
```

### 5. Mixing Density Levels

```tsx
// ❌ BAD - Compact table with comfortable spacing
<TableCell className="text-metadata p-lg">

// ✅ GOOD - Consistent compact density
<TableCell className="text-metadata p-sm">
```

---

## ESLint Enforcement

**Token violations are now enforced via ESLint.** The following patterns will trigger warnings:

### Banned Patterns

| Pattern | Example | Fix |
|---------|---------|-----|
| Raw typography | `text-sm`, `text-lg`, `text-2xl` | Use `text-body-sm`, `text-heading-sm`, etc. |
| Raw gap spacing | `gap-2`, `gap-4`, `gap-8` | Use `gap-sm`, `gap-md`, `gap-lg` |
| Raw padding | `p-4`, `px-6`, `py-2` | Use `p-md`, `px-lg`, `py-sm` |
| Raw margin | `mt-4`, `mb-8` | Use `mt-md`, `mb-section` |
| Hardcoded colors | `text-white`, `bg-gray-500` | Use `text-foreground`, `bg-muted` |

### How It Works

1. **Current**: Rules are set to "warn" - violations show in IDE but don't block builds
2. **Future**: Can be escalated to "error" to enforce strictly
3. **Progressive**: Fix violations when editing files, not in bulk batches

### Checking Violations

```bash
# Run ESLint to see all violations
npm run lint

# Or in your IDE, look for yellow underlines
```

### Suppressing False Positives

For legitimate exceptions (documented above), use ESLint disable comments:

```tsx
// eslint-disable-next-line no-restricted-syntax
<div className="text-white"> {/* Device simulation */}
```

---

## AI Instructions

When generating code for this project:

1. **ALWAYS** use semantic tokens from this guide
2. **NEVER** use raw Tailwind colors or typography
3. **CHECK** both Light and Dark modes work correctly
4. **PREFER** existing UI components from `src/components/ui/`
5. **FOLLOW** the component patterns exactly as shown
6. **APPLY** proper spacing using semantic tokens only
7. **ESLINT** will warn you if you use banned patterns - fix them!

---

## AI Compliance Contract

This section defines MANDATORY behavior for AI-generated code in this project.

### Absolute Requirements

1. **Refuse Non-Compliant Output**: If a requested output would violate this style guide, the AI MUST:
   - Refuse to generate the non-compliant code
   - Explain which rule(s) would be violated
   - Provide a compliant alternative

2. **No Token Invention**: The AI MUST NOT:
   - Invent new semantic tokens
   - Guess at token names
   - Use tokens not documented in this guide
   - If uncertain, ASK for clarification

3. **Clarification Over Assumption**: When uncertain about:
   - Which density level applies
   - Which status color to use
   - Whether an exception is valid
   - The AI MUST ask a clarification question before proceeding

4. **Internal Validation**: Before returning any code, the AI MUST internally verify against the checklist below

### Pre-Response Validation Checklist

Before generating ANY component or style code, the AI MUST verify:

```
□ COLORS
  - No text-white, text-black, bg-white, bg-black
  - No text-gray-*, bg-gray-*, border-gray-*
  - No hex values (#fff, #333, etc.)
  - All colors use semantic tokens

□ TYPOGRAPHY  
  - No text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl
  - All text uses text-metadata, text-body-sm, text-body, text-heading-*
  
□ SPACING
  - No gap-1 through gap-12
  - No p-1 through p-12
  - No px-*, py-*, pt-*, pb-*, pl-*, pr-*
  - No mt-*, mb-* (except semantic mt-section, mb-card, etc.)
  - All spacing uses gap-xs/sm/md/lg/xl or p-xs/sm/md/lg/xl/card

□ STATUS VALUES
  - Status styling comes from centralized config
  - No inline status color logic

□ DENSITY
  - Single density level per surface
  - No mixing compact and comfortable tokens

□ THEME
  - Works in both Light and Dark modes
  - No hardcoded dark: prefixes for colors
```

### Violation Response Template

If the AI cannot fulfill a request without violating the style guide:

```
I cannot generate that code as requested because it would violate the Prisma Style Guide:

**Violation**: [Specific rule being violated]
**Requested**: [What was asked for]
**Problem**: [Why it violates the guide]

**Compliant Alternative**:
[Code that follows the style guide]

Would you like me to proceed with the compliant version?
```

### Exception Handling

If the user requests a documented exception:
1. Confirm it matches an exception category
2. Include the required documentation comment
3. Add the ESLint disable comment with explanation

If the user requests an undocumented exception:
1. Explain that it's not in the approved exceptions list
2. Ask if they want to add it to the Exceptions section first
3. Do NOT proceed without explicit approval

---

*Last Updated: December 2024*
*Version: 2.0 - Added HARD/SOFT classification, Density enforcement, Status semantics, Accessibility rules, Banned utility matrix, AI Compliance Contract*
