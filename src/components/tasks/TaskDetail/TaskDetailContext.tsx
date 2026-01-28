import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { mapStatusToDb, mapStatusToUi } from "@/lib/taskStatusMapper";
import { useRealtimeAssignees } from "@/hooks/useRealtimeAssignees";
import { useTaskChangeLogs } from "@/hooks/useTaskChangeLogs";
import { useTask } from "@/hooks/useTask";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { completeTask as completeTaskAction, setTaskCollaborative, getCollaborativeStatus } from "@/domain/tasks/actions";
import { TASK_QUERY_KEY, TASK_DETAIL_KEY } from "@/lib/queryKeys";

interface PendingAttachment {
  type: 'file' | 'link';
  name: string;
  file?: File;
  url?: string;
  size_bytes?: number;
}

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
  phaseId: string | null;
  setPhaseId: (v: string | null) => void;
  
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
  pendingAttachments: PendingAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  
  // Blocker
  blocker: any;
  blockerDialogOpen: boolean;
  setBlockerDialogOpen: (v: boolean) => void;
  fetchBlocker: () => Promise<void>;
  
  // Change logs
  changeLogs: any[];
  
  // Actions
  saveField: (field: string, value: any) => Promise<void>;
  saveDescription: (value: string) => void;
  saveTitle: (value: string) => void;
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
  const mutations = useTaskMutations();
  
  // Use React Query for task data
  const { data: taskData, isLoading: taskLoading, isFetching } = useTask(taskId, cachedTask);
  
  // Local form state for controlled inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<string>("Ongoing");
  const [dueDate, setDueDate] = useState<Date>();
  const [tags, setTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [phaseId, setPhaseId] = useState<string | null>(null);
  
  // Saving state for UI feedback
  const [saving, setSaving] = useState(false);
  
  // Parent task for subtasks
  const [parentTask, setParentTask] = useState<{ id: string; title: string } | null>(null);
  
  // Collaborative state
  const [isCollaborative, setIsCollaborativeState] = useState(false);
  const [collaborativeStatus, setCollaborativeStatus] = useState<{
    assignees: Array<{ id: string; name: string; completed: boolean; completedAt: string | null }>;
    allCompleted: boolean;
  } | null>(null);
  
  // Users for mentions
  const [users, setUsers] = useState<any[]>([]);
  
  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  
  // Blocker
  const [blocker, setBlocker] = useState<any>(null);
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Realtime hooks
  const { assignees: realtimeAssignees, refetch: refetchAssignees } = useRealtimeAssignees("task", taskId);
  const { data: changeLogs = [] } = useTaskChangeLogs(taskId);

  // Sync form state when task data loads or changes
  useEffect(() => {
    if (taskData) {
      setTitle(taskData.title || "");
      setDescription(taskData.description || "");
      setPriority(taskData.priority || "Medium");
      setStatus(taskData.status || "Ongoing");
      setDueDate(taskData.due_at ? new Date(taskData.due_at) : undefined);
      setTags(Array.isArray(taskData.labels) ? taskData.labels : []);
      setProjectId(taskData.project_id || null);
      setPhaseId(taskData.phase_id || null);
      setIsCollaborativeState(taskData.is_collaborative || false);
      
      // Sync assignees from task data
      if (taskData.assignees && taskData.assignees.length > 0) {
        setSelectedAssignees(taskData.assignees.map((a: any) => a.id));
      }
      
      // Fetch collaborative status if needed
      if (taskData.is_collaborative) {
        getCollaborativeStatus(taskId).then(collabStatus => {
          setCollaborativeStatus({
            assignees: collabStatus.assignees,
            allCompleted: collabStatus.allCompleted
          });
        });
      }
      
      // Fetch parent task if subtask
      if (taskData.parent_id && !parentTask) {
        fetchParentTask(taskData.parent_id);
      }
    }
  }, [taskData?.id, taskData?.updated_at]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    
    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("id, task_id, author_id, body, created_at, attachments")
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

  // Fetch users for mentions
  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, user_id, name, username, working_days");
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

  // Fetch parent task
  const fetchParentTask = useCallback(async (parentId: string) => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("id", parentId)
      .single();

    setParentTask(data);
  }, []);

  // Initial data fetch (comments, users, blocker)
  useEffect(() => {
    setParentTask(null);
    Promise.all([fetchComments(), fetchUsers(), fetchBlocker()]);
  }, [taskId, fetchComments, fetchUsers, fetchBlocker]);

  // Sync realtime assignees
  useEffect(() => {
    const realtimeIds = realtimeAssignees.map(a => a.id).sort();
    const currentIds = [...selectedAssignees].sort();
    if (realtimeIds.length > 0 && JSON.stringify(realtimeIds) !== JSON.stringify(currentIds)) {
      setSelectedAssignees(realtimeIds);
    }
  }, [realtimeAssignees]);

  // Save description using mutation (called from TaskDetailDescription with debounce)
  const saveDescription = useCallback((value: string) => {
    if (!taskId) return;
    mutations.updateDescription.mutate({ id: taskId, description: value });
  }, [taskId, mutations.updateDescription]);

  // Save title using mutation
  const saveTitle = useCallback((value: string) => {
    if (!taskId) return;
    mutations.updateTitle.mutate({ id: taskId, title: value });
  }, [taskId, mutations.updateTitle]);

  // Legacy saveField for other fields (priority, status, due_at, etc.)
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
    if (field === 'phase_id') updateData.phase_id = value;
    
    const { error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .select();
    
    if (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } else {
      // Invalidate both caches
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
    }
    
    setSaving(false);
  }, [taskId, queryClient, toast]);

  // Add comment
  const addComment = useCallback(async () => {
    if ((!newComment.trim() && pendingAttachments.length === 0) || !taskId || isSubmittingComment || !user) return;

    setIsSubmittingComment(true);
    const commentText = newComment.trim();
    
    try {
      const uploadedAttachments: Array<{type: string; name: string; url: string; size_bytes?: number}> = [];
      
      for (const attachment of pendingAttachments) {
        if (attachment.type === 'file' && attachment.file) {
          const fileName = `${user.id}/${taskId}/${Date.now()}_${attachment.name}`;
          const { error: uploadError } = await supabase.storage
            .from('comment-attachments')
            .upload(fileName, attachment.file);
          
          if (uploadError) {
            toast({ title: "Error", description: `Failed to upload ${attachment.name}`, variant: "destructive" });
            setIsSubmittingComment(false);
            return;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('comment-attachments')
            .getPublicUrl(fileName);
          
          uploadedAttachments.push({
            type: 'file',
            name: attachment.name,
            url: publicUrl,
            size_bytes: attachment.size_bytes
          });
        } else if (attachment.type === 'link' && attachment.url) {
          uploadedAttachments.push({
            type: 'link',
            name: attachment.name,
            url: attachment.url
          });
        }
      }
      
      const { data: newCommentData, error } = await supabase
        .from("comments")
        .insert({ 
          task_id: taskId, 
          author_id: user.id, 
          body: commentText,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : []
        })
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
      setPendingAttachments([]);
      fetchComments();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally {
      setIsSubmittingComment(false);
    }
  }, [newComment, pendingAttachments, taskId, isSubmittingComment, user, users, toast, fetchComments]);

  // Mark complete
  const markComplete = useCallback(async () => {
    if (isCollaborative && user) {
      const result = await completeTaskAction(taskId, user.id);
      if (result.success) {
        if (result.data?.partialComplete) {
          toast({ 
            title: "Marked as complete", 
            description: result.data.message 
          });
          const collabStatus = await getCollaborativeStatus(taskId);
          setCollaborativeStatus({
            assignees: collabStatus.assignees,
            allCompleted: collabStatus.allCompleted
          });
        } else {
          setStatus("Completed");
          toast({ title: "Task completed", description: "All assignees have completed" });
        }
        queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
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
        setCollaborativeStatus({
          assignees: collabStatus.assignees,
          allCompleted: collabStatus.allCompleted
        });
      } else {
        setCollaborativeStatus(null);
      }
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
      toast({ 
        title: value ? "Collaborative mode enabled" : "Collaborative mode disabled",
        description: value ? "All assignees must complete this task" : "Any assignee can complete this task"
      });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }, [taskId, queryClient, toast]);

  // Get current user's profile ID
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
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
      onTaskDeleted?.();
      onClose?.();
    }
  }, [taskId, toast, queryClient, onTaskDeleted, onClose]);

  // Derived state
  const loading = taskLoading && !taskData;
  const isCompleted = status === 'Completed';
  const isSubtask = !!taskData?.parent_id;

  const value: TaskDetailContextValue = {
    taskId,
    task: taskData,
    parentTask,
    loading,
    saving: saving || mutations.updateDescription.isPending || mutations.updateTitle.isPending,
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
    phaseId,
    setPhaseId,
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
    pendingAttachments,
    setPendingAttachments,
    blocker,
    blockerDialogOpen,
    setBlockerDialogOpen,
    fetchBlocker,
    changeLogs,
    saveField,
    saveDescription,
    saveTitle,
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
