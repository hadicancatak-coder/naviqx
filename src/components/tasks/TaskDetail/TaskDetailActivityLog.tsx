import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Activity } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ActivityLogEntry } from "@/components/tasks/ActivityLogEntry";
import { useTaskDetailContext } from "./TaskDetailContext";

/**
 * Activity log component showing task history
 * Uses TaskDetailContext for change logs data
 */
export function TaskDetailActivityLog() {
  const { changeLogs } = useTaskDetailContext();
  // Collapsed by default to reduce clutter
  const [activityExpanded, setActivityExpanded] = useState(false);

  // Sort activity logs by date, oldest first for reading order
  const sortedLogs = [...changeLogs].sort((a, b) => 
    new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  return (
    <Collapsible open={activityExpanded} onOpenChange={setActivityExpanded}>
      <CollapsibleTrigger className="flex items-center gap-xs w-full py-xs hover:bg-muted/50 rounded-md -mx-xs px-xs transition-smooth">
        {activityExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Label className="text-body-sm font-medium cursor-pointer flex items-center gap-xs">
          <Activity className="h-4 w-4" />
          Activity Log
          {changeLogs.length > 0 && (
            <Badge variant="secondary" className="text-metadata h-5 px-1.5">{changeLogs.length}</Badge>
          )}
        </Label>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-sm space-y-sm">
        {sortedLogs.length === 0 ? (
          <div className="text-center py-md text-muted-foreground">
            <Activity className="h-6 w-6 mx-auto mb-xs opacity-50" />
            <p className="text-body-sm">No activity recorded</p>
          </div>
        ) : (
          <div className="space-y-xs">
            {sortedLogs.map((log) => (
              <ActivityLogEntry 
                key={log.id}
                field_name={log.field_name}
                old_value={log.old_value}
                new_value={log.new_value}
                description={log.description}
                changed_at={log.changed_at}
                profiles={log.profiles}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
