import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, ChevronDown, ChevronRight, Calendar, Clock, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface UserTask {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  priority: string | null;
}

interface UserWithTasks {
  id: string;
  name: string;
  avatar_url: string | null;
  tasks: UserTask[];
}

export function TeamTasksOverview() {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const { data: usersWithTasks = [], isLoading } = useQuery({
    queryKey: ["team-tasks-overview"],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .order("name");

      if (profilesError) throw profilesError;

      // Fetch all ongoing task assignments with task details
      const { data: assignments, error: assignmentsError } = await supabase
        .from("task_assignees")
        .select(`
          user_id,
          tasks!inner (
            id,
            title,
            status,
            due_at,
            priority
          )
        `)
        .in("tasks.status", ["Ongoing", "Pending"]);

      if (assignmentsError) throw assignmentsError;

      // Group tasks by user
      const userTasksMap = new Map<string, UserTask[]>();
      
      assignments?.forEach((assignment: any) => {
        const userId = assignment.user_id;
        const task = assignment.tasks;
        
        if (!userTasksMap.has(userId)) {
          userTasksMap.set(userId, []);
        }
        
        // Avoid duplicates
        const existing = userTasksMap.get(userId)!;
        if (!existing.find(t => t.id === task.id)) {
          existing.push({
            id: task.id,
            title: task.title,
            status: task.status,
            due_at: task.due_at,
            priority: task.priority,
          });
        }
      });

      // Combine with profiles and sort by due date
      const result: UserWithTasks[] = (profiles || [])
        .map(profile => ({
          id: profile.id,
          name: profile.name || "Unknown",
          avatar_url: profile.avatar_url,
          tasks: (userTasksMap.get(profile.id) || []).sort((a, b) => {
            if (!a.due_at) return 1;
            if (!b.due_at) return -1;
            return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
          }),
        }))
        .filter(u => u.tasks.length > 0)
        .sort((a, b) => b.tasks.length - a.tasks.length);

      return result;
    },
    staleTime: 60 * 1000,
  });

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDeadlineInfo = (dueAt: string | null) => {
    if (!dueAt) return { label: "No deadline", className: "text-muted-foreground" };
    
    const date = new Date(dueAt);
    const daysUntil = differenceInDays(date, new Date());
    
    if (isPast(date) && !isToday(date)) {
      return { 
        label: `Overdue ${Math.abs(daysUntil)}d`, 
        className: "text-destructive",
        isOverdue: true 
      };
    }
    if (isToday(date)) {
      return { label: "Due today", className: "text-warning-text", isUrgent: true };
    }
    if (isTomorrow(date)) {
      return { label: "Due tomorrow", className: "text-warning-text" };
    }
    if (daysUntil <= 3) {
      return { label: `Due in ${daysUntil}d`, className: "text-warning-text" };
    }
    return { label: format(date, "MMM d"), className: "text-muted-foreground" };
  };

  if (isLoading) {
    return (
      <Card className="p-card">
        <div className="animate-pulse space-y-md">
          <div className="h-6 bg-muted rounded w-48" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-sm">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="flex-1 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-card">
      <h2 className="text-heading-sm font-semibold text-foreground mb-md flex items-center gap-sm">
        <Users className="h-5 w-5 text-muted-foreground" />
        Team Tasks Overview
        <Badge variant="secondary" className="ml-auto text-metadata">
          {usersWithTasks.length} active members
        </Badge>
      </h2>

      <div className="space-y-sm max-h-[500px] overflow-y-auto hide-scrollbar">
        {usersWithTasks.length === 0 ? (
          <p className="text-muted-foreground text-body-sm text-center py-lg">
            No ongoing tasks assigned to team members.
          </p>
        ) : (
          usersWithTasks.map(user => {
            const isExpanded = expandedUsers.has(user.id);
            const overdueCount = user.tasks.filter(t => {
              if (!t.due_at) return false;
              return isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at));
            }).length;

            return (
              <Collapsible
                key={user.id}
                open={isExpanded}
                onOpenChange={() => toggleUser(user.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-sm h-auto hover:bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-sm w-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-metadata">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-body-sm font-medium text-foreground truncate">
                          {user.name}
                        </p>
                        <p className="text-metadata text-muted-foreground">
                          {user.tasks.length} ongoing task{user.tasks.length !== 1 ? "s" : ""}
                          {overdueCount > 0 && (
                            <span className="text-destructive ml-1">
                              • {overdueCount} overdue
                            </span>
                          )}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="ml-12 space-y-1 pb-2">
                    {user.tasks.slice(0, 8).map(task => {
                      const deadline = getDeadlineInfo(task.due_at);
                      
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-smooth text-body-sm"
                        >
                          {deadline.isOverdue && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          )}
                          <span className="flex-1 truncate text-foreground">
                            {task.title}
                          </span>
                          <span className={cn("text-metadata shrink-0 flex items-center gap-1", deadline.className)}>
                            <Clock className="h-3 w-3" />
                            {deadline.label}
                          </span>
                        </div>
                      );
                    })}
                    {user.tasks.length > 8 && (
                      <p className="text-metadata text-muted-foreground pl-3">
                        + {user.tasks.length - 8} more tasks
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>
    </Card>
  );
}