import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { mapStatusToDb, mapStatusToUi } from "@/lib/taskStatusMapper";
import { useRealtimeAssignees } from "@/hooks/useRealtimeAssignees";
import { useTaskChangeLogs } from "@/hooks/useTaskChangeLogs";
import { completeTask as completeTaskAction, setTaskCollaborative, getCollaborativeStatus } from "@/domain/tasks/actions";

interface TaskDetailContextValue {
  // Task data
  taskId: string;
  task: any;
  parentTask: { id: string; title: string } | null;
  loading: boolean;
  saving: boolean;
  
  // Editable fields
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  priority: "High" | "Medium" | "Low";
  setPriority: (v: "High" | "Medium" | "Low") => void;
  dueDate: Date | undefined;
  setDueDate: (v: Date | undefined) => void;
  tags: string[];
  setTags: (v: string[]) => void;
  projectId: string | null;
  setProjectId: (v: string | null) => void;
  
  // Collaborative
  isCollaborative: boolean;
  setIsCollaborative: (v: boolean) => void;
  collaborativeStatus: {
    assignees: Array<{ id: string; name: string; completed: boolean; completedAt: string | null }>;
    allCompleted: boolean;
  } | null;
  currentUserCompleted: boolean;
  
  // Assignees
  selectedAssignees: string[];
  setSelectedAssignees: (v: string[]) => void;
  realtimeAssignees: any[];
  refetchAssignees: () => void;
  users: any[];
  
  // Comments
  comments: any[];
  newComment: string;
  setNewComment: (v: string) => void;
  isSubmittingComment: boolean;
  addComment: () => Promise<void>;
  fetchComments: () => Promise<void>;
  
  // Blocker
  blocker: any;
  blockerDialogOpen: boolean;
  setBlockerDialogOpen: (v: boolean) => void;
  fetchBlocker: () => Promise<void>;
  
  // Change logs
  changeLogs: any[];
  
  // Actions
  saveField: (field: string, value: any) => Promise<void>;
  markComplete: () => Promise<void>;
  deleteTask: () => Promise<void>;
  
  // UI state
  isCompleted: boolean;
  isSubtask: boolean;
  
  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

export function useTaskDetailContext() {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error("useTaskDetailContext must be used within TaskDetailProvider");
  }
  return context;
}

interface TaskDetailProviderProps {
  taskId: string;
  cachedTask?: any;
  children: ReactNode;
  onClose?: () => void;
  onTaskDeleted?: () => void;
}

export function TaskDetailProvider({ 
  taskId, 
  cachedTask, 
  children, 
  onClose, 
  onTaskDeleted 
}: TaskDetailProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [parentTask, setParentTask] = useState<{ id: string; title: string } | null>(null);
  
  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<string>("Ongoing");
  const [dueDate, setDueDate] = useState<Date>();
  const [tags, setTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // Collaborative state
  const [isCollaborative, setIsCollaborativeState] = useState(false);
  const [collaborativeStatus, setCollaborativeStatus] = useState<{
    assignees: Array<{ id: string; name: string; completed: boolean; completedAt: string | null }>;
    allCompleted: boolean;
  } | null>(null);
  
  // Users
  const [users, setUsers] = useState<any[]>([]);
  
  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Blocker
  const [blocker, setBlocker] = useState<any>(null);
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Realtime hooks
  const { assignees: realtimeAssignees, refetch: refetchAssignees } = useRealtimeAssignees("task", taskId);
  const { data: changeLogs = [] } = useTaskChangeLogs(taskId);

  // Fetch task
  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error) {
      console.error("Error fetching task:", error);
      toast({ title: "Error", description: "Failed to load task", variant: "destructive" });
      setLoading(false);
      return;
    }

    setTask(data);
    setTitle(data.title || "");
    setDescription(data.description || "");
    setPriority(data.priority || "Medium");
    setStatus(mapStatusToUi(data.status));
    setDueDate(data.due_at ? new Date(data.due_at) : undefined);
    setTags(Array.isArray(data.labels) ? data.labels : []);
    setProjectId(data.project_id || null);
    setIsCollaborativeState(data.is_collaborative || false);
    setLoading(false);
    
    // Fetch collaborative status if collaborative
    if (data.is_collaborative) {
      const collabStatus = await getCollaborativeStatus(taskId);
      setCollaborativeStatus(collabStatus);
    }
  }, [taskId, toast]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    
    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("id, task_id, author_id, body, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error || !commentsData) {
      setComments([]);
      return;
    }

    const authorIds = [...new Set(commentsData.map(c => c.author_id))];
    
    if (authorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, user_id")
        .in("user_id", authorIds);

      const commentsWithAuthors = commentsData.map(comment => ({
        ...comment,
        author: profilesData?.find(p => p.user_id === comment.author_id) || null
      }));

      setComments(commentsWithAuthors);
    } else {
      setComments(commentsData);
    }
  }, [taskId]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, user_id, name, username");
    setUsers(data || []);
  }, []);

  // Fetch blocker
  const fetchBlocker = useCallback(async () => {
    if (!taskId) return;
    
    const { data } = await supabase
      .from("blockers")
      .select("*")
      .eq("task_id", taskId)
      .eq("resolved", false)
      .maybeSingle();

    setBlocker(data);
  }, [taskId]);

  // Fetch parent task if this is a subtask
  const fetchParentTask = useCallback(async (parentId: string) => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("id", parentId)
      .single();

    setParentTask(data);
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setParentTask(null);
    
    // Populate from cached task if available (including assignees)
    if (cachedTask) {
      setTask(cachedTask);
      setTitle(cachedTask.title || "");
      setDescription(cachedTask.description || "");
      setPriority(cachedTask.priority || "Medium");
      setStatus(mapStatusToUi(cachedTask.status));
      setDueDate(cachedTask.due_at ? new Date(cachedTask.due_at) : undefined);
      setTags(Array.isArray(cachedTask.labels) ? cachedTask.labels : []);
      setProjectId(cachedTask.project_id || null);
      
      // Use cached assignees immediately if available
      if (cachedTask.assignees && cachedTask.assignees.length > 0) {
        setSelectedAssignees(cachedTask.assignees.map((a: any) => a.id));
      }
      
      setLoading(false);
      
      // Fetch parent if subtask
      if (cachedTask.parent_id) {
        fetchParentTask(cachedTask.parent_id);
      }
    }
    
    // Fetch fresh data in parallel
    Promise.all([fetchTask(), fetchComments(), fetchUsers(), fetchBlocker()]);
  }, [taskId, cachedTask, fetchTask, fetchComments, fetchUsers, fetchBlocker, fetchParentTask]);

  // Fetch parent task when task loads
  useEffect(() => {
    if (task?.parent_id && !parentTask) {
      fetchParentTask(task.parent_id);
    }
  }, [task?.parent_id, parentTask, fetchParentTask]);

  // Sync realtime assignees - only update if different from current state
  useEffect(() => {
    const realtimeIds = realtimeAssignees.map(a => a.id).sort();
    const currentIds = [...selectedAssignees].sort();
    // Only update if realtime data differs (avoids overwriting cached data)
    if (realtimeIds.length > 0 && JSON.stringify(realtimeIds) !== JSON.stringify(currentIds)) {
      setSelectedAssignees(realtimeIds);
    }
  }, [realtimeAssignees]);

  // Save field
  const saveField = useCallback(async (field: string, value: any) => {
    if (!taskId) return;
    setSaving(true);
    
    let updateData: any = {};
    
    if (field === 'title') updateData.title = value;
    if (field === 'description') updateData.description = value;
    if (field === 'priority') updateData.priority = value;
    if (field === 'status') updateData.status = mapStatusToDb(value);
    if (field === 'due_at') updateData.due_at = value?.toISOString() || null;
    if (field === 'labels') updateData.labels = value;
    if (field === 'project_id') updateData.project_id = value;
    
    const { error } = await supabase.from("tasks").update(updateData).eq("id", taskId);
    
    if (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
    
    setSaving(false);
  }, [taskId, queryClient, toast]);

  // Add comment
  const addComment = useCallback(async () => {
    if (!newComment.trim() || !taskId || isSubmittingComment || !user) return;

    setIsSubmittingComment(true);
    const commentText = newComment.trim();
    
    try {
      const { data: newCommentData, error } = await supabase
        .from("comments")
        .insert({ task_id: taskId, author_id: user.id, body: commentText })
        .select('id')
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
        return;
      }

      // Parse @mentions
      const mentionRegex = /@(\w+)/g;
      const mentions = [...commentText.matchAll(mentionRegex)];
      
      if (mentions.length > 0 && newCommentData?.id) {
        const mentionInserts = mentions
          .map(match => {
            const username = match[1].toLowerCase();
            const mentionedUser = users.find(u => 
              u.name?.toLowerCase().replace(/\s+/g, '') === username ||
              u.username?.toLowerCase() === username
            );
            return mentionedUser ? { 
              comment_id: newCommentData.id, 
              mentioned_user_id: mentionedUser.user_id 
            } : null;
          })
          .filter(Boolean);

        if (mentionInserts.length > 0) {
          await supabase.from("comment_mentions").insert(mentionInserts);
        }
      }

      setNewComment("");
      fetchComments();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [newComment, taskId, isSubmittingComment, user, users, toast, fetchComments]);

  // Mark complete (with collaborative support)
  const markComplete = useCallback(async () => {
    if (isCollaborative && user) {
      // For collaborative tasks, use the action that tracks individual completion
      const result = await completeTaskAction(taskId, user.id);
      if (result.success) {
        if (result.data?.partialComplete) {
          toast({ 
            title: "Marked as complete", 
            description: result.data.message 
          });
          // Refresh collaborative status
          const collabStatus = await getCollaborativeStatus(taskId);
          setCollaborativeStatus(collabStatus);
        } else {
          setStatus("Completed");
          toast({ title: "Task completed", description: "All assignees have completed" });
        }
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } else {
      setStatus("Completed");
      await saveField('status', "Completed");
    }
  }, [isCollaborative, user, taskId, saveField, toast, queryClient]);

  // Toggle collaborative mode
  const setIsCollaborative = useCallback(async (value: boolean) => {
    const result = await setTaskCollaborative(taskId, value);
    if (result.success) {
      setIsCollaborativeState(value);
      if (value) {
        const collabStatus = await getCollaborativeStatus(taskId);
        setCollaborativeStatus(collabStatus);
      } else {
        setCollaborativeStatus(null);
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ 
        title: value ? "Collaborative mode enabled" : "Collaborative mode disabled",
        description: value ? "All assignees must complete this task" : "Any assignee can complete this task"
      });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }, [taskId, queryClient, toast]);

  // Get current user's profile ID to check if they've completed
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setCurrentUserProfileId(data.id);
        });
    }
  }, [user]);

  const currentUserCompleted = collaborativeStatus?.assignees.find(
    a => a.id === currentUserProfileId
  )?.completed || false;

  // Delete task
  const deleteTask = useCallback(async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    
    if (error) {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } else {
      toast({ title: "Task deleted" });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onTaskDeleted?.();
      onClose?.();
    }
  }, [taskId, toast, queryClient, onTaskDeleted, onClose]);

  const isCompleted = status === 'Completed';
  const isSubtask = !!task?.parent_id;

  const value: TaskDetailContextValue = {
    taskId,
    task,
    parentTask,
    loading,
    saving,
    title,
    setTitle,
    description,
    setDescription,
    status,
    setStatus,
    priority,
    setPriority,
    dueDate,
    setDueDate,
    tags,
    setTags,
    projectId,
    setProjectId,
    selectedAssignees,
    setSelectedAssignees,
    realtimeAssignees,
    refetchAssignees,
    users,
    comments,
    newComment,
    setNewComment,
    isSubmittingComment,
    addComment,
    fetchComments,
    blocker,
    blockerDialogOpen,
    setBlockerDialogOpen,
    fetchBlocker,
    changeLogs,
    saveField,
    markComplete,
    deleteTask,
    isCompleted,
    isSubtask,
    messagesEndRef,
    isCollaborative,
    setIsCollaborative,
    collaborativeStatus,
    currentUserCompleted,
  };

  return (
    <TaskDetailContext.Provider value={value}>
      {children}
    </TaskDetailContext.Provider>
  );
}
