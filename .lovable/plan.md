
# Add Pagination to UTM Archive Table

## Current State
The Archive tab fetches all UTM links at once and renders every row in a single table with no pagination. This becomes unwieldy with many links.

## Solution
Add client-side pagination directly inside `UtmArchiveTable.tsx`. This keeps it self-contained -- no changes needed to the parent page or the data hook.

## Changes

### `src/components/utm/UtmArchiveTable.tsx`
- Add `currentPage` state (default 1), with a constant `PAGE_SIZE = 25`
- Slice the `links` array to show only the current page: `links.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)`
- Update "select all" logic to only select visible (current page) links
- Reset `currentPage` to 1 whenever `links` changes (e.g. filters applied)
- Add a footer below the table with:
  - Left: "Showing X-Y of Z links" text
  - Right: Pagination controls using the existing `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationNext`, `PaginationLink`, and `PaginationEllipsis` components from `src/components/ui/pagination.tsx`
  - Smart page number display: show first, last, and neighbors of current page with ellipsis for gaps

### No other files need changes
- The hook already fetches all data -- pagination is purely presentational
- Filters in the parent still work as before since they affect the `links` prop passed down
