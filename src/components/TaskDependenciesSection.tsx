import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Link2, Trash2, AlertCircle, ArrowRight, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TaskInfo {
  title: string;
  status: string;
}

interface Dependency {
  id: string;
  depends_on_task_id: string;
  dependency_type: string;
  task: TaskInfo;
}

interface ReverseDependency {
  id: string;
  task_id: string;
  task: TaskInfo;
}

interface AvailableTask {
  id: string;
  title: string;
  status: string;
}

// Raw row from Supabase before narrowing
interface DependencyRow {
  id: string;
  depends_on_task_id: string;
  dependency_type: string;
  task: TaskInfo | null;
}

interface ReverseDependencyRow {
  id: string;
  task_id: string;
  task: TaskInfo | null;
}

interface TaskDependenciesSectionProps {
  taskId: string;
  currentStatus: string;
}

export function TaskDependenciesSection({ taskId, currentStatus }: TaskDependenciesSectionProps) {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [reverseDependencies, setReverseDependencies] = useState<ReverseDependency[]>([]);
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<string>("blocks");
  const [showBlocking, setShowBlocking] = useState(true);

  useEffect(() => {
    fetchDependencies();
    fetchReverseDependencies();
    fetchAvailableTasks();
  }, [taskId]);

  const fetchDependencies = async () => {
    const { data, error } = await supabase
      .from("task_dependencies")
      .select(`
        id,
        depends_on_task_id,
        dependency_type,
        task:tasks!task_dependencies_depends_on_task_id_fkey(title, status)
      `)
      .eq("task_id", taskId);

    if (!error && data) {
      const rows = data as unknown as DependencyRow[];
      // Filter and narrow to valid dependencies
      const validDeps: Dependency[] = rows
        .filter((row): row is DependencyRow & { task: TaskInfo } => row.task !== null)
        .map((row) => ({
          id: row.id,
          depends_on_task_id: row.depends_on_task_id,
          dependency_type: row.dependency_type,
          task: row.task,
        }));
      setDependencies(validDeps);
    }
  };

  const fetchReverseDependencies = async () => {
    const { data, error } = await supabase
      .from("task_dependencies")
      .select(`
        id,
        task_id,
        task:tasks!task_dependencies_task_id_fkey(title, status)
      `)
      .eq("depends_on_task_id", taskId);

    if (!error && data) {
      const rows = data as unknown as ReverseDependencyRow[];
      const validReverse: ReverseDependency[] = rows
        .filter((row): row is ReverseDependencyRow & { task: TaskInfo } => row.task !== null)
        .map((row) => ({
          id: row.id,
          task_id: row.task_id,
          task: row.task,
        }));
      setReverseDependencies(validReverse);
    }
  };

  const fetchAvailableTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, status")
      .neq("id", taskId)
      .neq("status", "Completed")
      .order("title");

    if (!error && data) {
      setAvailableTasks(data as AvailableTask[]);
    }
  };

  const addDependency = async () => {
    if (!selectedTaskId) {
      toast({
        title: "Error",
        description: "Please select a task",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("task_dependencies")
      .insert({
        task_id: taskId,
        depends_on_task_id: selectedTaskId,
        dependency_type: dependencyType,
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Dependency added" });
      fetchDependencies();
      setSelectedTaskId("");
    }
  };

  const removeDependency = async (depId: string) => {
    const { error } = await supabase
      .from("task_dependencies")
      .delete()
      .eq("id", depId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Dependency removed" });
      fetchDependencies();
    }
  };

  const hasIncompleteDependencies = dependencies.some(
    (dep) => dep.task.status !== "Completed"
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed": return "default";
      case "Ongoing": return "secondary";
      case "Blocked": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        <h3 className="font-semibold">Dependencies</h3>
        {(dependencies.length > 0 || reverseDependencies.length > 0) && (
          <Badge variant="secondary" className="text-metadata">
            {dependencies.length + reverseDependencies.length}
          </Badge>
        )}
      </div>

      {currentStatus === "Completed" && hasIncompleteDependencies && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Warning: This task is marked as complete but has incomplete dependencies
          </AlertDescription>
        </Alert>
      )}

      {/* This task depends on (blocked by) */}
      {dependencies.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Depends on ({dependencies.length})</span>
          </div>
          {dependencies.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between p-sm border rounded-lg bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-body-sm truncate">{dep.task.title}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-metadata">
                    {dep.dependency_type}
                  </Badge>
                  <Badge
                    variant={getStatusBadgeVariant(dep.task.status)}
                    className="text-metadata"
                  >
                    {dep.task.status}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeDependency(dep.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Tasks that depend on this task (blocks) */}
      {reverseDependencies.length > 0 && (
        <Collapsible open={showBlocking} onOpenChange={setShowBlocking}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between px-0 hover:bg-transparent">
              <div className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Blocks ({reverseDependencies.length})</span>
              </div>
              {showBlocking ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {reverseDependencies.map((dep) => (
              <div 
                key={dep.id} 
                className={cn(
                  "flex items-center justify-between p-sm border rounded-lg",
                  dep.task.status === "Blocked" 
                    ? "bg-warning-soft/30 border-warning/30" 
                    : "bg-muted/30"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-body-sm truncate">{dep.task.title}</p>
                  <Badge
                    variant={getStatusBadgeVariant(dep.task.status)}
                    className="text-metadata mt-1"
                  >
                    {dep.task.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Add new dependency */}
      <div className="flex gap-2">
        <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select task" />
          </SelectTrigger>
          <SelectContent>
            {availableTasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title} ({task.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dependencyType} onValueChange={setDependencyType}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blocks">Blocks</SelectItem>
            <SelectItem value="related">Related</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={addDependency} size="sm">
          Add
        </Button>
      </div>
    </div>
  );
}
