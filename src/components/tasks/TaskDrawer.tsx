import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TaskDetail } from "./TaskDetail";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";

export function TaskDrawer() {
  const { isOpen, taskId, task, closeTaskDrawer } = useTaskDrawer();

  if (!taskId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeTaskDrawer()}>
      <SheetContent 
        side="right" 
        // eslint-disable-next-line no-restricted-syntax
        className="w-full sm:max-w-xl !p-0 overflow-hidden"
        hideCloseButton
      >
        <TaskDetail 
          taskId={taskId} 
          task={task} 
          onClose={closeTaskDrawer}
        />
      </SheetContent>
    </Sheet>
  );
}
