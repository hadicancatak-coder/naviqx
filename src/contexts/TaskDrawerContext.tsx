import { createContext, useContext, useState, ReactNode, useCallback, useRef } from "react";

interface TaskDrawerContextValue {
  isOpen: boolean;
  taskId: string | null;
  task: any | null;
  openTaskDrawer: (taskId: string, task?: any) => void;
  closeTaskDrawer: () => void;
}

const TaskDrawerContext = createContext<TaskDrawerContextValue | undefined>(undefined);

export function TaskDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<any | null>(null);
  const isOpeningRef = useRef(false);

  const openTaskDrawer = useCallback((id: string, cachedTask?: any) => {
    // Prevent race condition when clicking another task while drawer is open
    isOpeningRef.current = true;
    setTaskId(id);
    setTask(cachedTask || null);
    setIsOpen(true);
    // Reset flag after a short delay
    setTimeout(() => {
      isOpeningRef.current = false;
    }, 100);
  }, []);

  const closeTaskDrawer = useCallback(() => {
    // Don't close if we're in the process of opening a new task
    if (isOpeningRef.current) return;
    
    setIsOpen(false);
    // Delay clearing data to allow close animation
    setTimeout(() => {
      setTaskId(null);
      setTask(null);
    }, 300);
  }, []);

  return (
    <TaskDrawerContext.Provider value={{ isOpen, taskId, task, openTaskDrawer, closeTaskDrawer }}>
      {children}
    </TaskDrawerContext.Provider>
  );
}

export function useTaskDrawer() {
  const context = useContext(TaskDrawerContext);
  if (!context) {
    throw new Error("useTaskDrawer must be used within a TaskDrawerProvider");
  }
  return context;
}
