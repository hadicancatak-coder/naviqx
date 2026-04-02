import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const dependencyTypeOptions = [
  { value: "blocks", label: "Blocks" },
  { value: "related", label: "Related" },
] as const;

const nativeSelectClass =
  "h-9 w-full rounded-lg border border-input bg-card px-sm text-body-sm text-foreground outline-none transition-smooth focus:border-primary/30 focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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

  const hasIncompleteDependencies = dependencies.some((dep) => dep.task.status !== "Completed");

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completed":
        return "default" as const;
      case "Ongoing":
        return "secondary" as const;
      case "Blocked":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-sm">
        <Link2 className="h-4 w-4" />
        <h3 className="text-body-sm font-semibold">Dependencies</h3>
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

      {dependencies.length > 0 && (
        <div className="space-y-sm">
          <div className="flex items-center gap-sm text-body-sm font-medium text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Depends on ({dependencies.length})</span>
          </div>
          {dependencies.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium">{dep.task.title}</p>
                <div className="mt-1 flex gap-sm">
                  <Badge variant="outline" className="text-metadata">
                    {dep.dependency_type}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(dep.task.status)} className="text-metadata">
                    {dep.task.status}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => removeDependency(dep.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {reverseDependencies.length > 0 && (
        <Collapsible open={showBlocking} onOpenChange={setShowBlocking}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between px-0 hover:bg-transparent">
              <div className="flex items-center gap-sm text-body-sm font-medium text-muted-foreground">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Blocks ({reverseDependencies.length})</span>
              </div>
              {showBlocking ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-sm">
            {reverseDependencies.map((dep) => (
              <div
                key={dep.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-sm",
                  dep.task.status === "Blocked" ? "border-warning/30 bg-warning-soft/30" : "bg-muted/30"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium">{dep.task.title}</p>
                  <Badge variant={getStatusBadgeVariant(dep.task.status)} className="mt-1 text-metadata">
                    {dep.task.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="grid grid-cols-1 gap-sm sm:grid-cols-[minmax(0,1fr)_140px_auto]">
        <select
          value={selectedTaskId}
          onChange={(event) => setSelectedTaskId(event.target.value)}
          className={nativeSelectClass}
          aria-label="Select dependency task"
        >
          <option value="">Select task</option>
          {availableTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title} ({task.status})
            </option>
          ))}
        </select>

        <select
          value={dependencyType}
          onChange={(event) => setDependencyType(event.target.value)}
          className={nativeSelectClass}
          aria-label="Dependency type"
        >
          {dependencyTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <Button onClick={addDependency} size="sm" className="w-full sm:w-auto">
          Add
        </Button>
      </div>
    </div>
  );
}
