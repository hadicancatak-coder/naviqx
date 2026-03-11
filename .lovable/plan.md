

## Tickets Page — Dev Ticket Tracker

### Overview
A new standalone page at `/tickets` (under Resources in the sidebar, alongside Library and Projects) to track tickets raised to dev. Simple table with add/filter capabilities.

### Database

**New table: `dev_tickets`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| title | text NOT NULL | ticket description |
| link | text | URL to the ticket (Jira, GitHub, etc.) |
| status | text NOT NULL | 'pending', 'update_needed', 'successful', 'failed' — default 'pending' |
| created_by | uuid | references auth.users(id) |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

RLS: authenticated users can select all, insert own (created_by = auth.uid()), update all, delete (admin only via has_role).
Add an updated_at trigger reusing `update_updated_at_column()`.

### Frontend

**1. New page: `src/pages/Tickets.tsx`**
- PageHeader with Ticket icon, title "Tickets", description "Track tickets raised to dev"
- FilterBar with search (title), status filter (Select with all/pending/update_needed/successful/failed)
- "Add Ticket" button opens a Dialog with form: title (required), link (optional), status (select, default pending)
- Table showing: Title (with clickable link icon if link exists), Status (color-coded Badge), Created By (profile name), Created At (formatted date)
- Status badges: pending = warning, update_needed = info, successful = success, failed = destructive
- Inline status editing via Select dropdown in the table row

**2. Sidebar update: `src/components/AppSidebar.tsx`**
- Add `{ title: "Tickets", url: "/tickets", icon: Ticket }` to `resourcesItems`

**3. Route: `src/App.tsx`**
- Add `<Route path="/tickets" element={<Tickets />} />`

**4. TopHeader breadcrumb**
- Add `if (path === "/tickets") return "Tickets";`

**5. Hook: `src/hooks/useTickets.ts`**
- React Query hook for CRUD on `dev_tickets` table, joining profiles for creator name

### Files to create/modify
- **Create**: migration SQL, `src/pages/Tickets.tsx`, `src/hooks/useTickets.ts`
- **Modify**: `src/App.tsx` (route), `src/components/AppSidebar.tsx` (nav item), `src/components/layout/TopHeader.tsx` (breadcrumb)

