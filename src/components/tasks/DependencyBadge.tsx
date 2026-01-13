import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link2, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DependencyBadgeProps {
  taskId: string;
  className?: string;
}

interface DependencyInfo {
  blocksCount: number;
  blockedByCount: number;
  blockedByTitles: string[];
  blocksTitles: string[];
}

export function DependencyBadge({ taskId, className }: DependencyBadgeProps) {
  const [info, setInfo] = useState<DependencyInfo | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      // Get tasks this task depends on (blocked by)
      const { data: blockedBy } = await supabase
        .from('task_dependencies')
        .select('depends_on_task_id, task:tasks!task_dependencies_depends_on_task_id_fkey(title)')
        .eq('task_id', taskId);

      // Get tasks that depend on this task (blocks)
      const { data: blocks } = await supabase
        .from('task_dependencies')
        .select('task_id, task:tasks!task_dependencies_task_id_fkey(title)')
        .eq('depends_on_task_id', taskId);

      setInfo({
        blockedByCount: blockedBy?.length || 0,
        blocksCount: blocks?.length || 0,
        blockedByTitles: blockedBy?.map((d: any) => d.task?.title).filter(Boolean) || [],
        blocksTitles: blocks?.map((d: any) => d.task?.title).filter(Boolean) || [],
      });
    };

    fetchDependencies();
  }, [taskId]);

  if (!info || (info.blockedByCount === 0 && info.blocksCount === 0)) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "text-metadata px-1.5 py-0 h-4 flex-shrink-0 rounded-full bg-info/10 border-info/30 text-info",
            className
          )}
        >
          <Link2 className="h-2.5 w-2.5 mr-0.5" />
          {info.blockedByCount + info.blocksCount}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {info.blockedByCount > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1 text-metadata font-medium mb-1">
              <ArrowLeft className="h-3 w-3" />
              Depends on ({info.blockedByCount})
            </div>
            <ul className="text-metadata text-muted-foreground space-y-0.5">
              {info.blockedByTitles.slice(0, 3).map((title, i) => (
                <li key={i} className="truncate">• {title}</li>
              ))}
              {info.blockedByTitles.length > 3 && (
                <li>...and {info.blockedByTitles.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
        {info.blocksCount > 0 && (
          <div>
            <div className="flex items-center gap-1 text-metadata font-medium mb-1">
              <ArrowRight className="h-3 w-3" />
              Blocks ({info.blocksCount})
            </div>
            <ul className="text-metadata text-muted-foreground space-y-0.5">
              {info.blocksTitles.slice(0, 3).map((title, i) => (
                <li key={i} className="truncate">• {title}</li>
              ))}
              {info.blocksTitles.length > 3 && (
                <li>...and {info.blocksTitles.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
