import { TaskCard } from "./TaskCard";
import type { TaskWithAssignees } from "@/types/tasks";

interface TaskGridViewProps {
  tasks: TaskWithAssignees[];
  onTaskClick: (taskId: string) => void;
}

export const TaskGridView = ({ tasks, onTaskClick }: TaskGridViewProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskClick(task.id)}
        />
      ))}
    </div>
  );
};
