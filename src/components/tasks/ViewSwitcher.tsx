import { List, Columns3, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ViewMode = 'list' | 'board';
export type BoardGroupBy = 'status' | 'date' | 'assignee';

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  boardGroupBy: BoardGroupBy;
  onBoardGroupByChange: (groupBy: BoardGroupBy) => void;
}

const boardGroupLabels: Record<BoardGroupBy, string> = {
  status: 'Status',
  date: 'Days',
  assignee: 'Assignee',
};

export function ViewSwitcher({ 
  viewMode, 
  onViewModeChange, 
  boardGroupBy, 
  onBoardGroupByChange 
}: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-xxs p-xxs bg-muted rounded-lg">
      {/* List View Button */}
      <button
        onClick={() => onViewModeChange('list')}
        className={cn(
          "flex items-center gap-1.5 px-3 h-row-compact rounded-md text-body-sm font-medium transition-smooth",
          viewMode === 'list' 
            ? "bg-card text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
        )}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </button>

      {/* Board View Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 h-row-compact rounded-md text-body-sm font-medium transition-smooth",
              viewMode === 'board' 
                ? "bg-card text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-card-hover"
            )}
          >
            <Columns3 className="h-4 w-4" />
            <span className="hidden sm:inline">
              Board
              {viewMode === 'board' && (
                <span className="text-muted-foreground ml-1">
                  ({boardGroupLabels[boardGroupBy]})
                </span>
              )}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => {
              onViewModeChange('board');
              onBoardGroupByChange('status');
            }}
            className={cn(
              boardGroupBy === 'status' && viewMode === 'board' && "bg-muted"
            )}
          >
            By Status
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onViewModeChange('board');
              onBoardGroupByChange('date');
            }}
            className={cn(
              boardGroupBy === 'date' && viewMode === 'board' && "bg-muted"
            )}
          >
            By Days
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onViewModeChange('board');
              onBoardGroupByChange('assignee');
            }}
            className={cn(
              boardGroupBy === 'assignee' && viewMode === 'board' && "bg-muted"
            )}
          >
            By Assignee
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
