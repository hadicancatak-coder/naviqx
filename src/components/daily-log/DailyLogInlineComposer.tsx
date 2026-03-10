// @density: compact
import { useState, useRef, useEffect } from "react";
import { Plus, Check, X, HelpCircle, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DAILY_LOG_STATUSES, type DailyLogStatus, type DailyLogPriority, type RecurPattern } from "@/domain/daily-log";
import { useCreateDailyLogEntry } from "@/hooks/useDailyLog";
import { useAuth } from "@/hooks/useAuth";

interface DailyLogInlineComposerProps {
  logDate: string;
  forUserId?: string;
  isAdmin?: boolean;
  users?: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_CYCLE: DailyLogStatus[] = ["Planned", "In Progress", "Done"];
const PRIORITIES: { value: DailyLogPriority; label: string }[] = [
  { value: "High", label: "H" },
  { value: "Medium", label: "M" },
  { value: "Low", label: "L" },
];

const RECUR_OPTIONS: RecurPattern[] = ["Daily", "Weekly", "Monthly"];

export function DailyLogInlineComposer({
  logDate,
  forUserId,
  isAdmin,
  users,
  onClose,
  onSaved,
}: DailyLogInlineComposerProps) {
  const { user } = useAuth();
  const createEntry = useCreateDailyLogEntry();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<DailyLogStatus>("Planned");
  const [priority, setPriority] = useState<DailyLogPriority>("Medium");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [needsHelp, setNeedsHelp] = useState(false);
  const [recurPattern, setRecurPattern] = useState<RecurPattern | null>(null);
  const [selectedUserId, setSelectedUserId] = useState(forUserId || "");
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [recurOpen, setRecurOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const cycleStatus = () => {
    const idx = STATUS_CYCLE.indexOf(status);
    setStatus(STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]);
  };

  const statusConfig = DAILY_LOG_STATUSES.find((s) => s.value === status) ?? DAILY_LOG_STATUSES[0];

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      onClose();
      return;
    }

    const targetUserId = selectedUserId || forUserId || user!.id;

    createEntry.mutate(
      {
        title: trimmed,
        status,
        priority,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        needs_help: needsHelp,
        is_recurring: !!recurPattern,
        recur_pattern: recurPattern,
        user_id: targetUserId,
        log_date: logDate,
        created_by: isAdmin && targetUserId !== user?.id ? user!.id : null,
      },
      {
        onSuccess: () => {
          // Reset for next entry
          setTitle("");
          setStatus("Planned");
          setPriority("Medium");
          setDueDate(undefined);
          setNeedsHelp(false);
          setRecurPattern(null);
          titleRef.current?.focus();
          onSaved();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const adminUser = isAdmin && users && selectedUserId
    ? users.find((u) => u.id === selectedUserId)
    : null;

  return (
    <div className="space-y-xs">
      {/* Admin: "Logging for" pill */}
      {isAdmin && users && users.length > 0 && (
        <Popover open={userOpen} onOpenChange={setUserOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-xs px-sm py-0.5 rounded-full bg-subtle text-metadata text-muted-foreground hover:text-foreground transition-smooth">
              Logging for: <span className="font-medium text-foreground">{adminUser?.name ?? "Select user"}</span> ▾
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[200px] p-xs liquid-glass-dropdown">
            {users.map((u) => (
              <button
                key={u.id}
                className={cn(
                  "w-full text-left px-sm py-xs rounded-md text-body-sm transition-smooth",
                  u.id === selectedUserId ? "bg-primary/10 text-primary" : "hover:bg-card-hover text-foreground"
                )}
                onClick={() => { setSelectedUserId(u.id); setUserOpen(false); }}
              >
                {u.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}

      {/* Composer row */}
      <div className="flex items-center gap-xs px-sm h-row-comfortable bg-subtle border border-dashed border-border/50 rounded-md">
        {/* Status pill */}
        <button onClick={cycleStatus} className="shrink-0">
          <Badge
            className={cn(
              "text-metadata cursor-pointer select-none transition-smooth border-0 hover:opacity-80",
              statusConfig.bgClass,
              statusConfig.textClass,
            )}
          >
            {statusConfig.label}
          </Badge>
        </button>

        {/* Title input */}
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What will you do today?"
          className="flex-1 min-w-0 text-body-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground focus:bg-input focus:border-border rounded-md px-xs py-0.5 transition-smooth"
        />

        {/* Priority toggle */}
        <div className="flex items-center shrink-0">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className={cn(
                "h-6 w-6 rounded-sm text-metadata font-medium transition-smooth flex items-center justify-center",
                priority === p.value
                  ? p.value === "High"
                    ? "bg-destructive-soft text-destructive-text"
                    : p.value === "Low"
                      ? "bg-success-soft text-success-text"
                      : "bg-pending-soft text-pending-text"
                  : "text-muted-foreground hover:bg-muted"
              )}
              title={p.value}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Due date */}
        <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-6 shrink-0 rounded-sm px-xs flex items-center gap-0.5 text-metadata transition-smooth",
                dueDate ? "text-foreground bg-subtle" : "text-muted-foreground hover:bg-muted"
              )}
              title="Due date"
            >
              <CalendarIcon className="h-3 w-3" />
              {dueDate ? format(dueDate, "d MMM") : ""}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={(d) => { setDueDate(d); setDueDateOpen(false); }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Recurring toggle */}
        <Popover open={recurOpen} onOpenChange={setRecurOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-6 w-6 rounded-sm flex items-center justify-center transition-smooth",
                recurPattern ? "text-info-text bg-info-soft" : "text-muted-foreground hover:bg-muted"
              )}
              title="Recurring"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[140px] p-xs liquid-glass-dropdown">
            {RECUR_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={cn(
                  "w-full text-left px-sm py-xs rounded-md text-body-sm transition-smooth",
                  recurPattern === opt ? "bg-info-soft text-info-text" : "hover:bg-card-hover text-foreground"
                )}
                onClick={() => { setRecurPattern(recurPattern === opt ? null : opt); setRecurOpen(false); }}
              >
                {opt}
              </button>
            ))}
            {recurPattern && (
              <button
                className="w-full text-left px-sm py-xs rounded-md text-body-sm text-muted-foreground hover:bg-card-hover transition-smooth"
                onClick={() => { setRecurPattern(null); setRecurOpen(false); }}
              >
                None
              </button>
            )}
          </PopoverContent>
        </Popover>

        {/* Needs help */}
        <button
          onClick={() => setNeedsHelp(!needsHelp)}
          className={cn(
            "h-6 w-6 rounded-sm flex items-center justify-center transition-smooth",
            needsHelp ? "text-warning-text bg-warning-soft" : "text-muted-foreground hover:bg-muted"
          )}
          title="Needs help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>

        {/* Save */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-success-text hover:bg-success-soft shrink-0"
          onClick={handleSave}
          disabled={!title.trim()}
          title="Save (Enter)"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>

        {/* Cancel */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onClose}
          title="Cancel (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* Ghost row trigger */
export function AddEntryTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="w-full flex items-center gap-sm px-sm h-row-comfortable text-muted-foreground text-body-sm hover:text-foreground hover:bg-card-hover rounded-md transition-smooth group"
      onClick={onClick}
    >
      <Plus className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-smooth" />
      Add entry
    </button>
  );
}
