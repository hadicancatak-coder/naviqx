import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TaskRow } from "./TaskRow";
import { cn } from "@/lib/utils";

interface SortableTaskItemProps {
  task: any;
  onClick: (taskId: string, task?: any) => void;
  onComplete?: (taskId: string, completed: boolean) => void;
  onDuplicate?: (task: any, e: React.MouseEvent) => void;
  onDelete?: (taskId: string) => void;
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
  onShiftSelect?: (taskId: string, shiftKey: boolean) => void;
  processingAction?: { taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null;
  userRole?: string | null;
  isFocused?: boolean;
  isDragDisabled?: boolean;
}

function SortableTaskItem({
  task,
  onClick,
  onComplete,
  onDuplicate,
  onDelete,
  isSelected,
  onSelect,
  onShiftSelect,
  processingAction,
  userRole,
  isFocused,
  isDragDisabled = false,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-50")}>
      <TaskRow
        task={task}
        onClick={onClick}
        onComplete={onComplete}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        isSelected={isSelected}
        onSelect={onSelect}
        onShiftSelect={onShiftSelect}
        showSelectionCheckbox
        showDragHandle
        dragHandleProps={{ ...attributes, ...listeners }}
        processingAction={processingAction}
        userRole={userRole}
        isFocused={isFocused}
      />
    </div>
  );
}

interface SortableTaskListProps {
  tasks: any[];
  selectedIds?: string[];
  focusedIndex?: number;
  onSelectionChange?: (ids: string[]) => void;
  onShiftSelect?: (taskId: string, shiftKey: boolean) => void;
  onTaskClick?: (taskId: string, task?: any) => void;
  onComplete?: (taskId: string, completed: boolean) => void;
  onDuplicate?: (task: any, e: React.MouseEvent) => void;
  onDelete?: (taskId: string) => void;
  processingAction?: { taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null;
  userRole?: string | null;
  onOrderChange?: (tasks: any[]) => void;
  isDragDisabled?: boolean;
}

export function SortableTaskList({
  tasks,
  selectedIds = [],
  focusedIndex = -1,
  onSelectionChange,
  onShiftSelect,
  onTaskClick,
  onComplete,
  onDuplicate,
  onDelete,
  processingAction,
  userRole,
  onOrderChange,
  isDragDisabled = false,
}: SortableTaskListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(tasks, oldIndex, newIndex);
    
    // Optimistic update
    onOrderChange?.(newOrder);

    // Calculate new sort_order values
    const updates = newOrder.map((task, index) => ({
      id: task.id,
      sort_order: index,
    }));

    try {
      // Batch update sort_order
      for (const update of updates) {
        await supabase
          .from("tasks")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (error: any) {
      toast({
        title: "Failed to save order",
        description: error.message,
        variant: "destructive",
      });
      // Revert on error
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  }, [tasks, onOrderChange, queryClient, toast]);

  const handleSelect = (taskId: string, selected: boolean) => {
    onSelectionChange?.(
      selected
        ? [...selectedIds, taskId]
        : selectedIds.filter((id) => id !== taskId)
    );
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border">
          {tasks.map((task, index) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onClick={onTaskClick || (() => {})}
              onComplete={onComplete}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              isSelected={selectedIds.includes(task.id)}
              onSelect={handleSelect}
              onShiftSelect={onShiftSelect}
              processingAction={processingAction}
              userRole={userRole}
              isFocused={index === focusedIndex}
              isDragDisabled={isDragDisabled}
            />
          ))}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeTask ? (
          <div className="bg-card shadow-lg rounded-lg border border-primary/50">
            <TaskRow
              task={activeTask}
              onClick={() => {}}
              showSelectionCheckbox
              showDragHandle
              isSelected={selectedIds.includes(activeTask.id)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}