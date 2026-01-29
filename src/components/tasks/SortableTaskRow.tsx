import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskRow } from './TaskRow';

interface SortableTaskRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick: (taskId: string, task?: any) => void;
  onComplete?: (taskId: string, completed: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDuplicate?: (task: any, e: React.MouseEvent) => void;
  onDelete?: (taskId: string) => void;
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
  showSelectionCheckbox?: boolean;
  showDragHandle?: boolean;
  compact?: boolean;
  processingAction?: { taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null;
  userRole?: string | null;
  disabled?: boolean;
}

export function SortableTaskRow({
  task,
  disabled = false,
  ...props
}: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    disabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskRow
        task={task}
        showDragHandle={!disabled}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...props}
      />
    </div>
  );
}
