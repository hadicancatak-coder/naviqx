import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { mapStatusToDb, mapStatusToUi } from "@/lib/taskStatusMapper";
import { useRealtimeAssignees } from "@/hooks/useRealtimeAssignees";
import { useTaskChangeLogs } from "@/hooks/useTaskChangeLogs";

interface TaskDetailContextValue {
  // Task data
  taskId: string;
  task: any;
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
  
  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<string>("Ongoing");
  const [dueDate, setDueDate] = useState<Date>();
  const [tags, setTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  
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
    setLoading(false);
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

  // Initial load
  useEffect(() => {
    setLoading(true);
    
    // Populate from cached task if available
    if (cachedTask) {
      setTask(cachedTask);
      setTitle(cachedTask.title || "");
      setDescription(cachedTask.description || "");
      setPriority(cachedTask.priority || "Medium");
      setStatus(mapStatusToUi(cachedTask.status));
      setDueDate(cachedTask.due_at ? new Date(cachedTask.due_at) : undefined);
      setTags(Array.isArray(cachedTask.labels) ? cachedTask.labels : []);
      setLoading(false);
    }
    
    // Fetch fresh data in parallel
    Promise.all([fetchTask(), fetchComments(), fetchUsers(), fetchBlocker()]);
  }, [taskId, cachedTask, fetchTask, fetchComments, fetchUsers, fetchBlocker]);

  // Sync realtime assignees
  useEffect(() => {
    setSelectedAssignees(realtimeAssignees.map(a => a.id));
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

  // Mark complete
  const markComplete = useCallback(async () => {
    setStatus("Completed");
    await saveField('status', "Completed");
  }, [saveField]);

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

  const value: TaskDetailContextValue = {
    taskId,
    task,
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
    messagesEndRef,
  };

  return (
    <TaskDetailContext.Provider value={value}>
      {children}
    </TaskDetailContext.Provider>
  );
}
