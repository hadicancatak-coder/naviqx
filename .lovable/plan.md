
# Project Pages Redesign: Roadmap-First Architecture

## Overview

This plan redesigns the Projects module from the ground up with a proper roadmap-first architecture. The current implementation has roadmaps bolted onto projects, but the new design makes the **roadmap the central organizing principle** - every project IS a roadmap with briefs, phases, milestones, and deliverables.

## Current Issues Identified

| Problem | Impact |
|---------|--------|
| Roadmap is one tab among many | Users miss the core project timeline |
| No structured project brief | Purpose/outcomes are free-text fields |
| Steps lack rich formatting | Can't add detailed deliverables or notes |
| Public view is bare-bones | Stakeholders see minimal context |
| No phase deliverables | Steps don't track what's actually produced |
| Editor uses plain textarea | No rich text for descriptions |

## New Architecture

```text
+-------------------------------------------+
|              PROJECT SHELL                |
| +---------------------------------------+ |
| |           PROJECT BRIEF               | |
| | (Rich text, objectives, stakeholders) | |
| +---------------------------------------+ |
|                                           |
| +---------------------------------------+ |
| |           ROADMAP TIMELINE            | |
| | (Phases with milestones & tasks)      | |
| +---------------------------------------+ |
|                                           |
| +---------------------------------------+ |
| |           DELIVERABLES                | |
| | (Linked outputs per phase)            | |
| +---------------------------------------+ |
+-------------------------------------------+
```

## Files to Delete

All existing project components will be removed and rebuilt:

**Components to Delete:**
- `src/components/projects/ProjectCard.tsx`
- `src/components/projects/ProjectPageContent.tsx`
- `src/components/projects/ProjectPageEditor.tsx`
- `src/components/projects/ProjectRoadmap.tsx`
- `src/components/projects/ProjectTasksSection.tsx`
- `src/components/projects/ProjectShareDialog.tsx`
- `src/components/projects/ProjectTree.tsx`
- `src/components/projects/index.ts`

**Roadmap subfolder to delete:**
- `src/components/projects/roadmap/DependencyLines.tsx`
- `src/components/projects/roadmap/PhaseExpandedCard.tsx`
- `src/components/projects/roadmap/PhaseMilestones.tsx`
- `src/components/projects/roadmap/PublicPhaseCard.tsx`
- `src/components/projects/roadmap/PublicRoadmapSummary.tsx`
- `src/components/projects/roadmap/QuickMilestoneDialog.tsx`
- `src/components/projects/roadmap/RoadmapSummary.tsx`
- `src/components/projects/roadmap/StepCard.tsx`
- `src/components/projects/roadmap/StepExpandedCard.tsx`
- `src/components/projects/roadmap/StepLanes.tsx`
- `src/components/projects/roadmap/index.ts`

**External review content to delete:**
- `src/components/external/ProjectReviewContent.tsx`

**Page to rewrite:**
- `src/pages/Projects.tsx` (complete rewrite)

## New Component Structure

```text
src/components/projects/
├── index.ts                      # Exports
├── ProjectCard.tsx               # List card with roadmap preview
├── ProjectBrief.tsx              # Collapsible brief section
├── ProjectBriefEditor.tsx        # Rich-text brief editing
├── ProjectRoadmap.tsx            # Timeline visualization
├── ProjectPhaseCard.tsx          # Phase card (collapsed)
├── ProjectPhaseExpanded.tsx      # Phase card (expanded)
├── ProjectPhaseMilestones.tsx    # Milestones within phase
├── ProjectPhaseDeliverables.tsx  # Deliverables per phase
├── ProjectPhaseEditor.tsx        # Add/edit phase dialog
├── ProjectSummaryStats.tsx       # Progress metrics bar
├── ProjectShareDialog.tsx        # Sharing controls
└── ProjectCreateDialog.tsx       # New project wizard

src/components/external/
└── ProjectReviewContent.tsx      # Public roadmap view
```

## Database Schema (No Changes)

The existing schema supports the new design:

**projects table:**
- `name`, `description`, `purpose`, `outcomes` - for brief
- `status`, `due_date`, `icon` - for metadata
- `is_public`, `public_token` - for sharing

**project_timelines table:**
- `phase_name`, `start_date`, `end_date` - core timeline
- `status`, `progress`, `color` - visual state
- `owner`, `system_name`, `expected_outcomes` - context
- `step_lane`, `auto_progress` - organization

**phase_milestones table:**
- Tracks deliverables within phases

**phase_dependencies table:**
- Tracks phase ordering

## Implementation Phases

### Phase 1: Delete and Scaffold
1. Delete all files listed above
2. Create new component stubs with basic structure
3. Update `src/pages/Projects.tsx` with new architecture
4. Maintain backward compatibility with `/projects/public/:token` route

### Phase 2: Project Brief System
1. **ProjectBrief.tsx** - Collapsible section with:
   - Rich-text rendered description
   - Purpose statement with icon
   - Expected outcomes as bullet list
   - Stakeholders with avatars
   - Timeline metadata (created, updated, deadline)

2. **ProjectBriefEditor.tsx** - Dialog with:
   - RichTextEditor for description (using existing TipTap)
   - Structured purpose/outcomes fields
   - Stakeholder multi-select
   - Due date picker

### Phase 3: Roadmap Timeline (Core)
1. **ProjectRoadmap.tsx** - Timeline container:
   - Month markers at top
   - Today indicator line
   - Phases as horizontal bars
   - Phase cards with expand/collapse
   - Add phase button

2. **ProjectPhaseCard.tsx** - Collapsed view:
   - Phase name with color accent
   - Date range display
   - Progress bar with percentage
   - Status badge (Not Started/In Progress/Blocked/Completed)
   - Owner avatar
   - Milestone count badge
   - Click to expand

3. **ProjectPhaseExpanded.tsx** - Expanded view:
   - Full description with rich text
   - Expected outcomes list
   - Milestones section with checkboxes
   - Deliverables section (new)
   - Linked tasks summary
   - Dependencies display
   - Edit/delete actions

4. **ProjectPhaseMilestones.tsx** - Milestone management:
   - Checklist UI with due dates
   - Quick add inline
   - Completion toggle
   - Delete capability

5. **ProjectPhaseDeliverables.tsx** - New feature:
   - List of deliverables per phase
   - Link type (document, design, code, etc.)
   - Status tracking
   - External URL support

### Phase 4: Summary and Stats
1. **ProjectSummaryStats.tsx** - Progress dashboard:
   - Overall progress circular indicator
   - Phases completed count
   - Milestones completed count
   - Days to deadline (with urgency styling)
   - Active phase indicator
   - Next milestone preview

### Phase 5: Project Cards and List
1. **ProjectCard.tsx** - List view card:
   - Icon and project name
   - Status badge
   - Mini timeline preview (simplified phases)
   - Progress percentage
   - Due date
   - Task count
   - Hover effects with glass styling

2. **ProjectCreateDialog.tsx** - New project wizard:
   - Step 1: Name and purpose
   - Step 2: Timeline and deadline
   - Step 3: Initial phases (optional)
   - Step 4: Stakeholders

### Phase 6: Public Review Page
1. **ProjectReviewContent.tsx** - Stakeholder view:
   - Project header with branding
   - Brief section (read-only)
   - Summary stats
   - Timeline visualization
   - Phase details (expandable)
   - Milestones with status
   - Last updated timestamp
   - CFI Group footer

**Route compatibility maintained:**
- `/projects/public/:token` continues to work
- Uses unified ExternalReviewPage shell
- Comments enabled for identified reviewers

### Phase 7: Sharing System
1. **ProjectShareDialog.tsx** - Sharing controls:
   - Public/Private toggle
   - Copy link button
   - QR code option
   - Access expiry (optional future enhancement)

## UI/UX Improvements

### Project List View
- Card grid layout (current approach, refined)
- Quick roadmap preview on hover
- Search and filter
- Status filter tabs

### Project Detail View
New layout hierarchy:
1. **Header bar**: Back button, project name, status, actions
2. **Brief section**: Collapsible, shows key info
3. **Stats bar**: Progress metrics
4. **Roadmap**: Full timeline visualization
5. **Phase details**: Expanded phase shows everything

### Phase Interactions
- Click phase bar to expand details
- Drag phases to reorder (future)
- Inline milestone creation
- Quick status change dropdown
- Progress auto-calculated from milestones + tasks

### Public View
- Clean, stakeholder-focused design
- No edit controls
- Clear progress visibility
- Professional CFI branding
- Mobile responsive

## Technical Details

### Rich Text Support
Using existing RichTextEditor with TipTap:
- Headings (H1, H2, H3)
- Bold, italic, underline
- Bullet and numbered lists
- Links
- Text alignment

### Progress Calculation
Existing logic preserved:
- 60% weight: milestones
- 40% weight: linked tasks
- Override with manual if no milestones/tasks
- `auto_progress` flag controls behavior

### Design Token Compliance
All new components will use:
- Semantic colors: `bg-card`, `text-foreground`, `border-border`
- Typography: `text-heading-sm`, `text-body`, `text-metadata`
- Spacing: `gap-md`, `p-lg`, `mb-section`
- Glass effects: `liquid-glass-elevated`, `liquid-glass`
- Status classes: `status-success`, `status-warning`, etc.

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/projects/ProjectCard.tsx` | List card with roadmap preview |
| `src/components/projects/ProjectBrief.tsx` | Collapsible brief section |
| `src/components/projects/ProjectBriefEditor.tsx` | Brief editing dialog |
| `src/components/projects/ProjectRoadmap.tsx` | Timeline visualization |
| `src/components/projects/ProjectPhaseCard.tsx` | Phase bar (collapsed) |
| `src/components/projects/ProjectPhaseExpanded.tsx` | Phase details (expanded) |
| `src/components/projects/ProjectPhaseMilestones.tsx` | Milestone checklist |
| `src/components/projects/ProjectPhaseDeliverables.tsx` | Deliverables list |
| `src/components/projects/ProjectPhaseEditor.tsx` | Add/edit phase |
| `src/components/projects/ProjectSummaryStats.tsx` | Progress metrics |
| `src/components/projects/ProjectShareDialog.tsx` | Sharing controls |
| `src/components/projects/ProjectCreateDialog.tsx` | New project wizard |
| `src/components/projects/index.ts` | Exports |
| `src/components/external/ProjectReviewContent.tsx` | Public view |
| `src/pages/Projects.tsx` | Main page (rewrite) |

## Hooks (Preserved)

Existing hooks remain unchanged:
- `useProjects` - Project CRUD
- `useProjectTimelines` - Phase CRUD
- `useProjectAssignees` - Stakeholder management
- `useProjectTasks` - Linked tasks
- `usePhaseMilestones` - Milestone CRUD
- `usePhaseDependencies` - Dependency management
- `usePhaseTaskStats` - Task aggregation
- `useAllProjectMilestones` - Cross-phase milestones
- `usePublicAccess` - External review system

## Implementation Order

1. **Delete all existing components** (clean slate)
2. **Create index.ts and ProjectCard.tsx** (list view works)
3. **Create ProjectRoadmap.tsx skeleton** (detail view works)
4. **Add ProjectPhaseCard and ProjectPhaseExpanded** (phases work)
5. **Add ProjectPhaseMilestones** (milestones work)
6. **Add ProjectSummaryStats** (metrics visible)
7. **Add ProjectBrief and ProjectBriefEditor** (brief editing)
8. **Add ProjectPhaseEditor** (phase creation)
9. **Add ProjectShareDialog** (sharing works)
10. **Rebuild ProjectReviewContent** (public view works)
11. **Add ProjectCreateDialog** (new project flow)
12. **Polish and test end-to-end**

## Route Preservation

The public link format is preserved:
```
/projects/public/:token → PublicReview (resourceType="project")
```

The existing route in `App.tsx` (line 79) continues to work. The `ProjectReviewContent` component is rebuilt but maintains the same interface expected by `PublicReview.tsx`.

## Success Criteria

- Projects list shows cards with roadmap preview
- Project detail view is roadmap-first
- Brief section is collapsible with rich text
- Phases display as timeline bars
- Clicking phase expands to show details
- Milestones are checkable within phases
- Progress auto-calculates from milestones + tasks
- Public link `/projects/public/:token` works
- All components use Prisma design tokens
- Mobile responsive layout
