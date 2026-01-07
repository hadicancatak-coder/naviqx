import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Link2, Trash2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Dependency {
  id: string;
  depends_on_task_id: string;
  dependency_type: string;
  task: {
    title: string;
    status: string;
  };
}

interface TaskDependenciesSectionProps {
  taskId: string;
  currentStatus: string;
}

export function TaskDependenciesSection({ taskId, currentStatus }: TaskDependenciesSectionProps) {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<string>("blocks");

  useEffect(() => {
    fetchDependencies();
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
      setDependencies(data as any);
    }
  };

  const fetchAvailableTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, status")
      .neq("id", taskId)
      .order("title");

    if (!error && data) {
      setAvailableTasks(data);
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

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        <h3 className="font-semibold">Dependencies</h3>
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
        <div className="space-y-2">
          {dependencies.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="flex-1">
                <p className="font-medium text-sm">{dep.task.title}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {dep.dependency_type}
                  </Badge>
                  <Badge
                    variant={dep.task.status === "Completed" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {dep.task.status}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeDependency(dep.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

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
