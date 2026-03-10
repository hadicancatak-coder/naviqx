import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DailyLogEntryRow } from "./DailyLogEntryRow";
import type { DailyLogEntry } from "@/domain/daily-log";

interface DailyLogUserSectionProps {
  userName: string;
  avatarUrl: string | null;
  entries: DailyLogEntry[];
  onEdit: (entry: DailyLogEntry) => void;
}

export function DailyLogUserSection({ userName, avatarUrl, entries, onEdit }: DailyLogUserSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-sm w-full px-sm py-xs rounded-lg hover:bg-card-hover transition-smooth"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-metadata text-primary font-medium shrink-0">
          {userName?.charAt(0)?.toUpperCase()}
        </div>
        <span className="text-body-sm font-medium text-foreground">{userName}</span>
        <span className="text-metadata text-muted-foreground">({entries.length})</span>
      </button>
      {open && (
        <div className="pl-md">
          {entries.length === 0 ? (
            <p className="text-metadata text-muted-foreground px-sm py-sm">No entries for this day</p>
          ) : (
            entries.map((entry) => (
              <DailyLogEntryRow key={entry.id} entry={entry} onEdit={onEdit} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
