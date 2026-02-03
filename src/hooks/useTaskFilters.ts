import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { addDays } from "date-fns";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { isTaskOverdue } from "@/lib/overdueHelpers";
import { isTaskStale } from "@/lib/staleTaskHelpers";
import { isUserAssignedToTask, taskMatchesAssigneeFilter } from "@/lib/taskFiltering";
import { AlertCircle, Clock, Shield, TrendingUp, Timer, LucideIcon } from "lucide-react";
import type { TaskWithAssignees } from "@/types/tasks";

export interface DateFilter {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface TaskFilters {
  selectedAssignees: string[];
  selectedTags: string[];
  statusFilters: string[];
  dateFilter: DateFilter | null;
  searchQuery: string;
  activeQuickFilter: string | null;
  showMyTasks: boolean;
  showOnlyRecurring: boolean;
  selectedProjectId: string | null;
  selectedSprintId: string | null;
}

export interface QuickFilter {
  label: string;
  Icon: LucideIcon;
  filter: (task: TaskWithAssignees) => boolean;
  clearOtherFilters?: boolean;
}

const DEFAULT_FILTERS: TaskFilters = {
  selectedAssignees: [],
  selectedTags: [],
  statusFilters: ['Ongoing'],
  dateFilter: null,
  searchQuery: "",
  activeQuickFilter: null,
  showMyTasks: false,
  showOnlyRecurring: false,
  selectedProjectId: null,
  selectedSprintId: null,
};

// Quick filters defined outside component for stable references
export const QUICK_FILTERS: QuickFilter[] = [
  { 
    label: "Overdue", 
    Icon: AlertCircle, 
    filter: (task) => isTaskOverdue(task), 
    clearOtherFilters: true 
  },
  { 
    label: "Due Soon", 
    Icon: Clock, 
    filter: (task) => { 
      if (!task.due_at) return false; 
      const dueDate = new Date(task.due_at); 
      const threeDaysFromNow = addDays(new Date(), 3); 
      return dueDate <= threeDaysFromNow && dueDate >= new Date() && task.status !== 'Completed'; 
    }
  },
  { 
    label: "Blocked", 
    Icon: Shield, 
    filter: (task) => task.status === 'Blocked' 
  },
  { 
    label: "High Priority", 
    Icon: TrendingUp, 
    filter: (task) => task.priority === 'High' && task.status !== 'Completed' 
  },
  { 
    label: "Stale", 
    Icon: Timer, 
    filter: (task) => isTaskStale(task) 
  }
];

/**
 * Extracted task filter logic from Tasks.tsx for better maintainability
 * Handles URL params, debouncing, and all filter state management
 */
export function useTaskFilters(tasks: TaskWithAssignees[], userId?: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filter state
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  
  // Debounced search
  const debouncedSearch = useDebouncedValue(filters.searchQuery, 300);

  // Handle URL filter parameters on mount
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (!filter) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const updates: Partial<TaskFilters> = { showMyTasks: true };

    switch (filter) {
      case 'today':
        updates.dateFilter = { startDate: today, endDate: tomorrow, label: 'Today' };
        updates.statusFilters = ['Backlog', 'Ongoing', 'Blocked', 'Failed'];
        break;
      case 'overdue':
        updates.activeQuickFilter = 'Overdue';
        break;
      case 'week':
        updates.dateFilter = { startDate: today, endDate: weekEnd, label: 'This Week' };
        updates.statusFilters = ['Backlog', 'Ongoing', 'Blocked', 'Failed'];
        break;
      case 'in-progress':
        updates.statusFilters = ['Ongoing'];
        break;
      case 'stale':
        updates.activeQuickFilter = 'Stale';
        break;
    }

    setFilters(prev => ({ ...prev, ...updates }));
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Auto-deselect My Tasks when different assignee is selected
  useEffect(() => {
    if (filters.showMyTasks && userId && filters.selectedAssignees.length > 0) {
      if (!filters.selectedAssignees.includes(userId)) {
        setFilters(prev => ({ ...prev, showMyTasks: false }));
      }
    }
  }, [filters.selectedAssignees, userId, filters.showMyTasks]);

  // Main filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // My Tasks filter
      if (filters.showMyTasks && userId) {
        if (!isUserAssignedToTask(task, userId)) return false;
      }
      
      const assigneeMatch = taskMatchesAssigneeFilter(task, filters.selectedAssignees);
      
      // Date filter
      let dateMatch = true;
      if (filters.dateFilter) {
        if (!task.due_at) { 
          dateMatch = filters.dateFilter.label === "Backlog"; 
        } else { 
          const dueDate = new Date(task.due_at); 
          dateMatch = dueDate >= filters.dateFilter.startDate && dueDate <= filters.dateFilter.endDate; 
        }
      }
      
      // Status filter (bypass when showing recurring)
      const statusMatch = filters.showOnlyRecurring || 
        filters.statusFilters.length === 0 || 
        filters.statusFilters.some(s => task.status === s);
      
      // Tags filter
      const tagsMatch = filters.selectedTags.length === 0 || 
        filters.selectedTags.some(tag => task.labels?.includes(tag));
      
      // Search filter
      const searchMatch = debouncedSearch === "" || 
        task.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        (task.description && task.description.toLowerCase().includes(debouncedSearch.toLowerCase()));
      
      // Recurring filter
      const recurringMatch = !filters.showOnlyRecurring || 
        task.task_type === 'recurring' || 
        !!task.template_task_id;
      
      // Project filter
      const projectMatch = !filters.selectedProjectId || task.project_id === filters.selectedProjectId;
      
      // Sprint filter
      const sprintMatch = !filters.selectedSprintId || task.sprint === filters.selectedSprintId;
      
      return assigneeMatch && dateMatch && statusMatch && tagsMatch && searchMatch && recurringMatch && projectMatch && sprintMatch;
    });
  }, [tasks, filters, debouncedSearch, userId]);

  // Apply quick filter on top of main filter
  const finalFilteredTasks = useMemo(() => {
    if (filters.activeQuickFilter) {
      const quickFilterDef = QUICK_FILTERS.find(f => f.label === filters.activeQuickFilter);
      if (quickFilterDef) return filteredTasks.filter(quickFilterDef.filter);
    }
    return filteredTasks;
  }, [filteredTasks, filters.activeQuickFilter]);

  // Calculate if filters are non-default
  const isDefaultFilters = filters.statusFilters.length === 1 && 
    filters.statusFilters[0] === 'Ongoing' && 
    filters.selectedAssignees.length === 0 && 
    filters.selectedTags.length === 0 && 
    !filters.dateFilter && 
    !filters.activeQuickFilter && 
    !filters.searchQuery && 
    !filters.showMyTasks && 
    !filters.selectedProjectId && 
    !filters.selectedSprintId;
  
  const hasActiveFilters = !isDefaultFilters;

  // Count my tasks
  const myTasksCount = useMemo(() => {
    if (!userId) return 0;
    return tasks.filter((task) => 
      task.assignees?.some((assignee) => assignee.user_id === userId) &&
      task.status !== 'Completed' && task.status !== 'Failed'
    ).length;
  }, [tasks, userId]);

  // Update helpers
  const updateFilter = useCallback(<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  return {
    filters,
    setFilters,
    updateFilter,
    clearAllFilters,
    setSearchQuery,
    debouncedSearch,
    filteredTasks,
    finalFilteredTasks,
    hasActiveFilters,
    isDefaultFilters,
    myTasksCount,
    quickFilters: QUICK_FILTERS,
  };
}