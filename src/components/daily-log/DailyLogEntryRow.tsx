import { useState, useRef } from "react";
import { GripVertical, Pencil, Trash2, HelpCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DAILY_LOG_STATUSES, type DailyLogEntry, type DailyLogStatus } from "@/domain/daily-log";
import { useUpdateDailyLogEntry, useDeleteDailyLogEntry } from "@/hooks/useDailyLog";
import { format, isBefore, startOfDay } from "date-fns";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";

interface DailyLogEntryRowProps {
  entry: DailyLogEntry;
  onEdit: (entry: DailyLogEntry) => void;
  showUser?: boolean;
  userProfile?: { name: string; avatar_url: string | null } | null;
}

export function DailyLogEntryRow({ entry, onEdit, showUser, userProfile }: DailyLogEntryRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const updateEntry = useUpdateDailyLogEntry();
  const deleteEntry = useDeleteDailyLogEntry();
  const { openTask } = useTaskDrawer();

  const statusConfig = DAILY_LOG_STATUSES.find((s) => s.value === entry.status) ?? DAILY_LOG_STATUSES[0];

  const handleStatusChange = (newStatus: DailyLogStatus) => {
    updateEntry.mutate({ id: entry.id, status: newStatus });
  };

  const handleTitleSave = () => {
    const newTitle = titleRef.current?.value?.trim();
    if (newTitle && newTitle !== entry.title) {
      updateEntry.mutate({ id: entry.id, title: newTitle });
    }
    setIsEditingTitle(false);
  };

  const isOverdue = entry.due_date && isBefore(new Date(entry.due_date), startOfDay(new Date()));

  return (
    <div
      className="group flex items-center gap-sm h-row-comfortable px-sm rounded-lg hover:bg-card-hover transition-smooth"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle */}
      <GripVertical
        className={cn(
          "h-4 w-4 text-muted-foreground shrink-0 cursor-grab transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Admin: user avatar */}
      {showUser && userProfile && (
        <div className="flex items-center gap-xs shrink-0 mr-xs">
          {userProfile.avatar_url ? (
            <img src={userProfile.avatar_url} alt={userProfile.name} className="h-5 w-5 rounded-full" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-metadata text-primary font-medium">
              {userProfile.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <span className="text-metadata text-muted-foreground max-w-[80px] truncate">{userProfile.name}</span>
        </div>
      )}

      {/* Status badge */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0">
            <Badge
              className={cn(
                "text-metadata cursor-pointer select-none transition-smooth",
                statusConfig.bgClass,
                statusConfig.textClass,
                "border-0 hover:opacity-80"
              )}
            >
              {statusConfig.label}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="liquid-glass-dropdown">
          {DAILY_LOG_STATUSES.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => handleStatusChange(s.value)}>
              <Badge className={cn("text-metadata border-0 mr-xs", s.bgClass, s.textClass)}>
                {s.label}
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isEditingTitle ? (
          <input
            ref={titleRef}
            defaultValue={entry.title}
            autoFocus
            className="w-full text-body-sm text-foreground bg-transparent outline-none border-b border-primary/30 py-0.5"
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") setIsEditingTitle(false);
            }}
          />
        ) : (
          <span
            className={cn(
              "text-body-sm text-foreground truncate block cursor-text",
              entry.status === "Done" && "line-through text-muted-foreground"
            )}
            onDoubleClick={() => setIsEditingTitle(true)}
          >
            {entry.title}
          </span>
        )}
      </div>

      {/* Linked task */}
      {entry.linked_task_id && (
        <Badge
          variant="outline"
          className="text-metadata bg-subtle shrink-0 cursor-pointer hover:bg-card-hover transition-smooth"
          onClick={() => openTask(entry.linked_task_id!)}
        >
          🔗 Task
        </Badge>
      )}

      {/* Recurring badge */}
      {entry.is_recurring && entry.recur_pattern && (
        <Badge variant="outline" className="text-metadata text-muted-foreground shrink-0 gap-0.5 border-0 bg-subtle">
          <RefreshCw className="h-3 w-3" />
          {entry.recur_pattern}
        </Badge>
      )}

      {/* Needs help */}
      {entry.needs_help && (
        <HelpCircle className="h-4 w-4 text-warning shrink-0" />
      )}

      {/* Priority (only non-Medium) */}
      {entry.priority && entry.priority !== "Medium" && (
        <Badge
          className={cn(
            "text-metadata border-0 shrink-0",
            entry.priority === "High" && "priority-high",
            entry.priority === "Low" && "priority-low"
          )}
        >
          {entry.priority}
        </Badge>
      )}

      {/* Due date */}
      {entry.due_date && (
        <span className={cn("text-metadata shrink-0", isOverdue ? "text-destructive" : "text-muted-foreground")}>
          {format(new Date(entry.due_date), "d MMM")}
        </span>
      )}

      {/* Row actions */}
      <div className={cn("flex items-center gap-xs shrink-0 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(entry)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => deleteEntry.mutate(entry.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
