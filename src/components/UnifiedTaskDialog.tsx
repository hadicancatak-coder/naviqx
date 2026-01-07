import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, AlertTriangle, MessageCircle, Send, ChevronDown, ChevronRight, X, Pencil, Eye } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ENTITIES, TASK_STATUSES } from "@/lib/constants";
import { mapStatusToDb, mapStatusToUi } from "@/lib/taskStatusMapper";
// AttachedAdsSection removed
import { validateDateForUsers, getDayName, formatWorkingDays } from "@/lib/workingDaysHelper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRealtimeAssignees } from "@/hooks/useRealtimeAssignees";
import { TaskChecklistSection } from "./TaskChecklistSection";
import { TaskDependenciesSection } from "./TaskDependenciesSection";
import { BlockerDialog } from "./BlockerDialog";
import { useTaskChangeLogs } from "@/hooks/useTaskChangeLogs";
import { ActivityLogEntry } from "@/components/tasks/ActivityLogEntry";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CommentText } from "@/components/CommentText";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { useQueryClient } from "@tanstack/react-query";
import { TaskAssigneeSelector } from "@/components/tasks/TaskAssigneeSelector";
import { TagsMultiSelect } from "@/components/tasks/TagsMultiSelect";
import { Skeleton } from "@/components/ui/skeleton";

// Loading skeleton component for the dialog
const TaskDialogSkeleton = () => (
  <div className="px-lg py-md space-y-md">
    <div className="space-y-md">
      <div className="space-y-xs">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-xs">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
    <div className="space-y-md">
      <Skeleton className="h-4 w-16" />
      <div className="grid grid-cols-3 gap-md">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-md">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  </div>
);

interface UnifiedTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'view' | 'edit';
  taskId?: string;
  task?: any; // Optional cached task data from parent
}

export function UnifiedTaskDialog({ open, onOpenChange, mode, taskId, task: cachedTask }: UnifiedTaskDialogProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Track if initial data has been loaded to prevent refetching
  const initialLoadRef = useRef<string | null>(null);
  
  // Internal mode state to allow switching from view to edit
  const [internalMode, setInternalMode] = useState<'create' | 'view' | 'edit'>(mode);
  
  // Side panel state
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  
  // Advanced settings collapsed state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<string>("Ongoing");
  const [dueDate, setDueDate] = useState<Date>();
  const [entities, setEntities] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<string>("none");
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([]);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | null>(null);
  // attachedAds removed
  const [workingDaysWarning, setWorkingDaysWarning] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  
  // Blocked/Failed reason prompt state
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [reasonType, setReasonType] = useState<'blocked' | 'failed' | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  
  // For backwards compat (used in submit)
  const blockedReason = reasonType === 'blocked' ? reasonText : "";
  const failureReason = reasonType === 'failed' ? reasonText : "";
  
  // View/Edit mode specific
  const [task, setTask] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  const [blocker, setBlocker] = useState<any>(null);
  const [loadedFailureReason, setLoadedFailureReason] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { assignees: realtimeAssignees, refetch: refetchAssignees } = useRealtimeAssignees(
    "task",
    mode === 'create' ? '' : (taskId || '')
  );
  const { data: changeLogs = [], isLoading: changeLogsLoading } = useTaskChangeLogs(
    mode === 'create' ? '' : (taskId || '')
  );

  // Reset internal mode when dialog opens/closes or mode prop changes
  // IMPORTANT: In view mode, auto-open side panel so comments are visible
  useEffect(() => {
    if (open) {
      setInternalMode(mode);
      // Auto-open side panel in view mode so comments are immediately visible
      setSidePanelOpen(mode === 'view');
      setAdvancedOpen(false);
    } else {
      // Reset the load ref when dialog closes to ensure fresh fetch on next open
      initialLoadRef.current = null;
    }
  }, [open, mode]);

  const isReadOnly = internalMode === 'view';
  const isCreate = internalMode === 'create';

  // Reset state immediately when taskId changes to prevent stale data
  useEffect(() => {
    if (open && taskId && taskId !== initialLoadRef.current) {
      // Reset all state immediately before loading
      setTask(null);
      setLoading(true);
      setComments([]);
      setBlocker(null);
      setLoadedFailureReason(null);
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setStatus("Ongoing");
      setDueDate(undefined);
      setEntities([]);
      setTags([]);
      setRecurrence("none");
      setRecurrenceDaysOfWeek([]);
      setRecurrenceDayOfMonth(null);
      
      initialLoadRef.current = taskId;
    }
  }, [open, taskId]);

  // Populate from cached task immediately if available
  useEffect(() => {
    if (open && !isCreate && cachedTask && taskId) {
      populateFromTask(cachedTask);
    }
  }, [open, cachedTask, taskId, isCreate]);

  // Fetch users immediately when dialog opens (needed for @ mentions)
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  // Fetch task data for view/edit modes - parallelized
  // CRITICAL: Always fetch fresh task data to ensure description and all fields are populated
  // The cached task from list views may not include all fields (e.g., description)
  useEffect(() => {
    if (open && !isCreate && taskId) {
      // Always fetch task, comments, and blocker in parallel for complete data
      Promise.all([
        fetchTask(),
        fetchComments(),
        fetchBlocker()
      ]);
    }
  }, [open, taskId, isCreate]);

  // Helper to populate form from task data
  const populateFromTask = (data: any) => {
    setTask(data);
    setTitle(data.title || "");
    setDescription(data.description || "");
    setPriority(data.priority || "Medium");
    setStatus(mapStatusToUi(data.status));
    setDueDate(data.due_at ? new Date(data.due_at) : undefined);
    setEntities(Array.isArray(data.entity) ? data.entity.map(String) : []);
    setTags(Array.isArray(data.labels) ? data.labels : []);
    setLoadedFailureReason(data.failure_reason || null);
    
    // Parse recurrence
    if (data.recurrence_rrule) {
      if (data.recurrence_rrule.includes('DAILY')) setRecurrence('daily');
      else if (data.recurrence_rrule.includes('WEEKLY')) setRecurrence('weekly');
      else if (data.recurrence_rrule.includes('MONTHLY')) setRecurrence('monthly');
      
      if (data.recurrence_days_of_week) {
        setRecurrenceDaysOfWeek(data.recurrence_days_of_week);
      }
      if (data.recurrence_day_of_month) {
        setRecurrenceDayOfMonth(data.recurrence_day_of_month);
      }
    }
    setLoading(false);
  };

  // Working days validation
  useEffect(() => {
    if (dueDate && selectedAssignees.length > 0 && users.length > 0) {
      const assignedUsers = users.filter(u => selectedAssignees.includes(u.id));
      const validation = validateDateForUsers(dueDate, assignedUsers);
      
      if (!validation.isValid) {
        const usersList = validation.invalidUsers.map(u => 
          `${u.name} (${formatWorkingDays(u.workingDays)})`
        ).join(', ');
        setWorkingDaysWarning(
          `⚠️ ${getDayName(dueDate)} is outside working days for: ${usersList}`
        );
      } else {
        setWorkingDaysWarning(null);
      }
    } else {
      setWorkingDaysWarning(null);
    }
  }, [dueDate, selectedAssignees, users]);

  // Update selected assignees from realtime data
  useEffect(() => {
    if (!isCreate) {
      // Sync even if empty - user may have removed all assignees
      setSelectedAssignees(realtimeAssignees.map(a => a.id));
    }
  }, [realtimeAssignees, isCreate]);

  const fetchTask = async () => {
    if (!taskId) return;
    
    const { data, error } = await supabase
      .from("tasks")
      .select(`*`)
      .eq("id", taskId)
      .single();

    if (error) {
      console.error("Error fetching task:", error);
      toast({
        title: "Error",
        description: "Failed to load task details",
        variant: "destructive",
      });
      setLoading(false);
    } else if (data) {
      populateFromTask(data);
    }
  };

  const fetchComments = async () => {
    if (!taskId) return;
    
    // Fetch comments first
    const { data: commentsData, error: commentsError } = await supabase
      .from("comments")
      .select("id, task_id, author_id, body, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (commentsError || !commentsData) {
      console.error("Error fetching comments:", commentsError);
      setComments([]);
      return;
    }

    // Get unique author IDs and fetch their profiles
    const authorIds = [...new Set(commentsData.map(c => c.author_id))];
    
    if (authorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, user_id")
        .in("user_id", authorIds);

      // Map profiles to comments
      const commentsWithAuthors = commentsData.map(comment => ({
        ...comment,
        author: profilesData?.find(p => p.user_id === comment.author_id) || null
      }));

      setComments(commentsWithAuthors);
    } else {
      setComments(commentsData);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, name, username, working_days");
    setUsers(data || []);
  };

  const fetchBlocker = async () => {
    if (!taskId) return;
    
    const { data, error } = await supabase
      .from("blockers")
      .select("*")
      .eq("task_id", taskId)
      .eq("resolved", false)
      .maybeSingle();

    if (error) {
      console.error("Error fetching blocker:", error);
      return;
    }
    
    setBlocker(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate recurrence rule
      let recurrenceRule = null;
      if (recurrence !== "none") {
        if (recurrence === "weekly" && recurrenceDaysOfWeek.length > 0) {
          const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
          const byDay = recurrenceDaysOfWeek.map(d => dayMap[d]).join(',');
          recurrenceRule = `FREQ=WEEKLY;BYDAY=${byDay}`;
        } else if (recurrence === "monthly" && recurrenceDayOfMonth) {
          recurrenceRule = `FREQ=MONTHLY;BYMONTHDAY=${recurrenceDayOfMonth}`;
        } else if (recurrence === "daily") {
          recurrenceRule = `FREQ=DAILY`;
        }
      }

      const taskData: any = {
        title: title.trim(),
        description: description || null,
        priority,
        status: mapStatusToDb(status),
        due_at: dueDate?.toISOString() || null,
        created_by: user!.id,
        entity: entities.length > 0 ? entities : [],
        labels: tags.length > 0 ? tags : [],
        recurrence_rrule: recurrenceRule,
        recurrence_days_of_week: recurrence === 'weekly' ? recurrenceDaysOfWeek : null,
        recurrence_day_of_month: recurrenceDayOfMonth,
        task_type: recurrence !== "none" ? 'recurring' : 'generic',
        visibility: "global" as const,
        // Include failure_reason if setting to Failed
        failure_reason: status === "Failed" && failureReason.trim() ? failureReason.trim() : null,
      };

      if (isCreate) {
        // Create new task
        const { data: createdTask, error } = await supabase
          .from("tasks")
          .insert([taskData])
          .select()
          .single();

        if (error) throw error;

        // Assign users
        if (selectedAssignees.length > 0) {
          console.log('[Task Create] Adding assignees:', selectedAssignees);
          
          const { data: creatorProfile, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", user!.id)
            .single();

          if (profileError) {
            console.error('[Task Create] Failed to get creator profile:', profileError);
          } else if (creatorProfile) {
            const assigneeInserts = selectedAssignees.map(profileId => ({
              task_id: createdTask.id,
              user_id: profileId,
              assigned_by: creatorProfile.id,
            }));

            console.log('[Task Create] Inserting assignees:', assigneeInserts);
            const { error: assigneeError } = await supabase.from("task_assignees").insert(assigneeInserts);
            
            if (assigneeError) {
              console.error('[Task Create] Failed to add assignees:', assigneeError);
              toast({
                title: "Warning",
                description: "Task created but failed to add assignees: " + assigneeError.message,
                variant: "destructive",
              });
            } else {
              console.log('[Task Create] Assignees added successfully');
            }
          }
        }
        
        // If status was Blocked, add the blocked reason as a comment
        if (status === "Blocked" && blockedReason.trim()) {
          await supabase.from("comments").insert({
            task_id: createdTask.id,
            author_id: user!.id,
            body: `🚫 **Blocked:** ${blockedReason.trim()}`,
          });
        }

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      } else {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", taskId!);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
      
      // Reset and close
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setStatus("Ongoing");
    setDueDate(undefined);
    setEntities([]);
    setTags([]);
    setRecurrence("none");
    setRecurrenceDaysOfWeek([]);
    setRecurrenceDayOfMonth(null);
    setSelectedAssignees([]);
    setBlocker(null);
    setWorkingDaysWarning(null);
    setSidePanelOpen(false);
    setAdvancedOpen(false);
    setReasonText("");
    setReasonType(null);
    setPendingStatus(null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const commentText = newComment.trim();
    
    try {
      const { data: newCommentData, error } = await supabase
        .from("comments")
        .insert({
          task_id: taskId,
          author_id: user!.id,
          body: commentText,
        })
        .select('id')
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add comment",
          variant: "destructive",
        });
        return;
      }

      // Parse @mentions and insert into comment_mentions table for notifications
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
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getModeLabel = () => {
    if (isCreate) return "Create";
    if (isReadOnly) return "View";
    return "Edit";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        hideCloseButton
        className={cn(
          "max-h-[90vh] flex flex-col p-0 transition-smooth overflow-hidden",
          "left-[50%] translate-x-[-50%]",
          sidePanelOpen ? "max-w-[1200px]" : "max-w-2xl"
        )}
      >
        <div className={cn("flex", sidePanelOpen && "min-h-[600px]")}>
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* HEADER */}
            <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-heading-md">
                    {isCreate ? "New Task" : "Task Details"}
                  </DialogTitle>
                  <Badge variant="secondary" className="text-metadata">
                    {getModeLabel()}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {!isCreate && (
                    <Button
                      type="button"
                      variant={sidePanelOpen ? "secondary" : "ghost"}
                      size="icon-sm"
                      onClick={() => setSidePanelOpen(!sidePanelOpen)}
                      title="Comments & Activity"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {!isCreate && isReadOnly && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setInternalMode('edit')}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                  {!isCreate && !isReadOnly && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setInternalMode('view')}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onOpenChange(false)}
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!isCreate && task && (
                <DialogDescription className="mt-1">
                  Created {format(new Date(task.created_at), "PPP 'at' p")}
                </DialogDescription>
              )}
            </div>

            {/* MAIN FORM - Show skeleton while loading in view/edit mode */}
            {loading && !isCreate ? (
              <TaskDialogSkeleton />
            ) : (
            <div className="px-6 max-h-[60vh] overflow-y-auto hide-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-5 py-4">
                
                {/* === BASIC INFO === */}
                <div className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter task title"
                      disabled={isReadOnly}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <RichTextEditor
                      value={description}
                      onChange={setDescription}
                      placeholder="Enter task description"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                {/* === PLANNING SECTION === */}
                <div className="space-y-4">
                  <h3 className="text-body-sm font-medium text-muted-foreground uppercase tracking-wide">Planning</h3>
                  
                  {/* Row 1: Status, Priority, Due Date */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Status */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select 
                        value={status} 
                        onValueChange={(v: string) => {
                          if (v === "Blocked") {
                            setPendingStatus(v);
                            setReasonType('blocked');
                            setReasonText("");
                            setShowReasonDialog(true);
                          } else if (v === "Failed") {
                            setPendingStatus(v);
                            setReasonType('failed');
                            setReasonText("");
                            setShowReasonDialog(true);
                          } else {
                            setStatus(v);
                          }
                        }} 
                        disabled={isReadOnly}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Show failure reason if status is Failed */}
                      {status === "Failed" && loadedFailureReason && (
                        <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/30">
                          <p className="text-xs text-destructive font-medium">Failure Reason:</p>
                          <p className="text-sm text-destructive/80">{loadedFailureReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={(v: any) => setPriority(v)} disabled={isReadOnly}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Popover modal={true}>
                        <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isReadOnly || recurrence !== "none"}
                            className="w-full justify-start overflow-hidden"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {recurrence !== "none" ? "N/A" : dueDate ? format(dueDate, "PP") : "Pick date"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover z-popover" align="start">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={setDueDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {workingDaysWarning && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-metadata">
                        {workingDaysWarning}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Row 2: Assignees, Tags */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Assignees */}
                    <div className="space-y-2">
                      <Label>Assignees</Label>
                      <TaskAssigneeSelector
                        mode={isCreate ? 'create' : 'edit'}
                        taskId={taskId}
                        selectedIds={selectedAssignees}
                        onSelectionChange={(ids) => {
                          setSelectedAssignees(ids);
                          if (!isCreate) refetchAssignees();
                        }}
                        users={users}
                        disabled={isReadOnly}
                      />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <TagsMultiSelect
                        value={tags}
                        onChange={setTags}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* === ADVANCED SETTINGS - View Mode: Show directly if data exists === */}
                {isReadOnly && taskId && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    {/* Dependencies - show if task has any */}
                    <div className="space-y-2">
                      <Label>Dependencies</Label>
                      <TaskDependenciesSection taskId={taskId} currentStatus={status} />
                    </div>

                    {/* Checklist - show if task has any */}
                    <div className="space-y-2">
                      <Label>Checklist</Label>
                      <TaskChecklistSection taskId={taskId} readOnly={true} />
                    </div>

                    {/* Blocker - show if exists */}
                    {blocker && (
                      <div className="space-y-2">
                        <Label>Blocker</Label>
                        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-destructive">
                              {blocker.title || "Blocked"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBlockerDialogOpen(true)}
                            >
                              View
                            </Button>
                          </div>
                          {blocker.description && (
                            <p className="text-sm text-muted-foreground">{blocker.description}</p>
                          )}
                          {blocker.stuck_reason && (
                            <p className="text-xs text-muted-foreground">
                              <strong>Reason:</strong> {blocker.stuck_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* === ADVANCED SETTINGS (Collapsed) - Create and Edit modes only === */}
                {!isReadOnly && (
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full justify-between"
                    >
                      <span className="text-body-sm font-medium">
                        Advanced Settings
                      </span>
                      {advancedOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    
                    {/* Countries/Entity */}
                    <div className="space-y-2">
                      <Label>Countries (Entity)</Label>
                      <Popover modal={true}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            {entities.length > 0 ? `${entities.length} selected` : "Select countries"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <ScrollArea className="h-[200px]">
                            <div className="p-2 space-y-1">
                              {ENTITIES.map((ent) => (
                                <div 
                                  key={ent} 
                                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-smooth cursor-pointer"
                                  onClick={() => {
                                    if (entities.includes(ent)) {
                                      setEntities(entities.filter(c => c !== ent));
                                    } else {
                                      setEntities([...entities, ent]);
                                    }
                                  }}
                                >
                                  <Checkbox
                                    id={`entity-${ent}`}
                                    checked={entities.includes(ent)}
                                    onCheckedChange={() => {}}
                                  />
                                  <Label htmlFor={`entity-${ent}`} className="text-sm cursor-pointer flex-1">
                                    {ent}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                      {entities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entities.map((ent) => (
                            <Badge key={ent} variant="secondary" className="text-metadata">
                              {ent}
                              <button
                                type="button"
                                onClick={() => setEntities(entities.filter(c => c !== ent))}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recurrence */}
                    <div className="space-y-2">
                      <Label>Recurring Task</Label>
                      <Select 
                        value={recurrence} 
                        onValueChange={(value) => {
                          setRecurrence(value);
                          if (value !== "none") setDueDate(undefined);
                          if (value !== "weekly") setRecurrenceDaysOfWeek([]);
                          if (value !== "monthly") setRecurrenceDayOfMonth(null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Recurrence</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Weekly Recurrence Days */}
                    {recurrence === "weekly" && (
                      <div className="space-y-2">
                        <Label>Days of Week</Label>
                        <div className="grid grid-cols-7 gap-2">
                          {[
                            { value: 1, label: 'Mon' },
                            { value: 2, label: 'Tue' },
                            { value: 3, label: 'Wed' },
                            { value: 4, label: 'Thu' },
                            { value: 5, label: 'Fri' },
                            { value: 6, label: 'Sat' },
                            { value: 0, label: 'Sun' },
                          ].map(day => (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => {
                                if (recurrenceDaysOfWeek.includes(day.value)) {
                                  setRecurrenceDaysOfWeek(recurrenceDaysOfWeek.filter(d => d !== day.value));
                                } else {
                                  setRecurrenceDaysOfWeek([...recurrenceDaysOfWeek, day.value].sort());
                                }
                              }}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-smooth cursor-pointer hover:border-primary/50 active:scale-95",
                                recurrenceDaysOfWeek.includes(day.value) 
                                  ? 'border-primary bg-primary/10 text-primary' 
                                  : 'border-border'
                              )}
                            >
                              <span className="text-body-sm font-medium">{day.label}</span>
                              {recurrenceDaysOfWeek.includes(day.value) && (
                                <span className="text-xs">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monthly Recurrence Day */}
                    {recurrence === "monthly" && (
                      <div className="space-y-2">
                        <Label>Day of Month</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={recurrenceDayOfMonth || ""}
                          onChange={(e) => setRecurrenceDayOfMonth(parseInt(e.target.value) || null)}
                          placeholder="Day of month (1-31)"
                        />
                      </div>
                    )}

                    {/* Dependencies */}
                    <div className="space-y-2">
                      <Label>Dependencies</Label>
                      {taskId ? (
                        <TaskDependenciesSection taskId={taskId} currentStatus={status} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Save task first to add dependencies</p>
                      )}
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2">
                      <Label>Checklist</Label>
                      {taskId ? (
                        <TaskChecklistSection taskId={taskId} readOnly={false} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Save task first to add checklist items</p>
                      )}
                    </div>

                    {/* Blocker */}
                    <div className="space-y-2">
                      <Label>Blocker</Label>
                      {taskId ? (
                        blocker ? (
                          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-destructive">
                                {blocker.title || "Blocked"}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setBlockerDialogOpen(true)}
                              >
                                Edit
                              </Button>
                            </div>
                            {blocker.description && (
                              <p className="text-sm text-muted-foreground">{blocker.description}</p>
                            )}
                            {blocker.stuck_reason && (
                              <p className="text-xs text-muted-foreground">
                                <strong>Reason:</strong> {blocker.stuck_reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => setBlockerDialogOpen(true)}
                          >
                            No blocker - Click to add
                          </Button>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Save task first to add blocker</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                )}
              </form>
            </div>
            )}

            {/* FOOTER */}
            <div className="px-6 py-4 border-t border-border flex-shrink-0">
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {isReadOnly ? "Close" : "Cancel"}
                </Button>
                {!isReadOnly && (
                  <Button type="submit" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Saving..." : isCreate ? "Create Task" : "Save Changes"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* SIDE PANEL - Comments & Activity */}
          {sidePanelOpen && !isCreate && taskId && (
            <div className="w-[380px] border-l border-border flex flex-col overflow-hidden animate-slide-in-right">
              <div className="px-4 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-body font-semibold">Comments & Activity</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSidePanelOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-3">
                {/* Show failure reason banner if task has one */}
                {loadedFailureReason && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <span className="text-destructive text-lg">❌</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-metadata font-medium text-destructive">Task Failed</p>
                        <p className="text-body-sm text-foreground mt-1">{loadedFailureReason}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Unified Timeline - merge comments and activity */}
                <h4 className="text-body-sm font-medium text-muted-foreground">Timeline</h4>
                {(() => {
                  // Combine comments and activity logs into a single timeline
                  const timelineItems: Array<{ type: 'comment' | 'activity'; data: any; timestamp: Date }> = [];
                  
                  comments.forEach(comment => {
                    timelineItems.push({
                      type: 'comment',
                      data: comment,
                      timestamp: new Date(comment.created_at)
                    });
                  });
                  
                  changeLogs.forEach(log => {
                    timelineItems.push({
                      type: 'activity',
                      data: log,
                      timestamp: new Date(log.changed_at)
                    });
                  });
                  
                  // Sort by timestamp ascending
                  timelineItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                  
                  if (timelineItems.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-body-sm">No activity yet</p>
                        <p className="text-metadata">Be the first to comment</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {timelineItems.map((item, idx) => {
                        if (item.type === 'activity') {
                          return (
                            <div key={`activity-${item.data.id}`} className="py-1">
                              <ActivityLogEntry 
                                field_name={item.data.field_name}
                                old_value={item.data.old_value}
                                new_value={item.data.new_value}
                                description={item.data.description}
                                changed_at={item.data.changed_at}
                                profiles={item.data.profiles}
                              />
                            </div>
                          );
                        }
                        
                        // Comment
                        const comment = item.data;
                        const isCurrentUser = comment.author?.user_id === user?.id;
                        return (
                          <div 
                            key={`comment-${comment.id}`} 
                            className={cn(
                              "flex gap-3",
                              isCurrentUser && "flex-row-reverse"
                            )}
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-metadata bg-primary/10 text-primary">
                                {comment.author?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "flex-1 min-w-0 max-w-[85%]",
                              isCurrentUser && "flex flex-col items-end"
                            )}>
                              <div className={cn(
                                "rounded-lg px-3 py-2 max-w-full break-words overflow-hidden",
                                isCurrentUser 
                                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                                  : "bg-muted/50 rounded-tl-none"
                              )}>
                                {!isCurrentUser && (
                                  <div className="text-metadata font-medium mb-1">
                                    {comment.author?.name}
                                  </div>
                                )}
                                <CommentText 
                                  text={comment.body} 
                                  className={cn(
                                    "text-body-sm break-words",
                                    isCurrentUser && "text-primary-foreground"
                                  )}
                                  linkClassName={isCurrentUser ? "text-primary-foreground underline break-all" : "text-primary underline break-all"}
                                  enableMentions
                                  profiles={users}
                                  inverted={isCurrentUser}
                                />
                              </div>
                              <span className="text-metadata text-muted-foreground mt-1">
                                {format(new Date(comment.created_at), "MMM d, h:mm a")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-border">
                <div className="flex flex-col gap-2">
                  <MentionAutocomplete
                    value={newComment}
                    onChange={setNewComment}
                    users={users}
                    placeholder="Write a comment... Use @ to mention"
                    minRows={2}
                    maxRows={4}
                    noPortal
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-metadata text-muted-foreground">
                      {newComment.trim() ? `⌘+Enter to send` : ''}
                    </span>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="default"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isSubmittingComment}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {isSubmittingComment ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isCreate && <BlockerDialog open={blockerDialogOpen} onOpenChange={setBlockerDialogOpen} taskId={taskId || ''} onSuccess={fetchBlocker} />}
        
        {/* Blocked/Failed Reason Dialog */}
        <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{reasonType === 'failed' ? 'Failure Reason' : 'Blocked Reason'}</DialogTitle>
              <DialogDescription>
                {reasonType === 'failed' 
                  ? 'Please provide a reason why this task failed. This will be stored with the task.'
                  : 'Please provide a reason why this task is blocked. This will be added as a comment.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason-input">Reason</Label>
                <Textarea
                  id="reason-input"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder={reasonType === 'failed' ? "Explain why the task failed..." : "Explain why the task is blocked..."}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowReasonDialog(false);
                  setPendingStatus(null);
                  setReasonText("");
                  setReasonType(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (!reasonText.trim()) {
                    toast({
                      title: "Required",
                      description: reasonType === 'failed' 
                        ? "Please provide a reason for marking this task as failed"
                        : "Please provide a reason for blocking this task",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Set the status
                  setStatus(pendingStatus || (reasonType === 'failed' ? "Failed" : "Blocked"));
                  
                  // If we have a taskId (editing existing task), handle appropriately
                  if (taskId && !isCreate) {
                    if (reasonType === 'blocked') {
                      // Add blocked reason as comment
                      const { error: commentError } = await supabase.from("comments").insert({
                        task_id: taskId,
                        author_id: user!.id,
                        body: `🚫 **Blocked:** ${reasonText.trim()}`,
                      });
                      
                      if (commentError) {
                        console.error("Failed to insert blocked comment:", commentError);
                        toast({
                          title: "Error",
                          description: "Failed to save blocked reason",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Update task status to Blocked
                      await supabase.from("tasks").update({ status: "Blocked" }).eq("id", taskId);
                      
                      fetchComments();
                      queryClient.invalidateQueries({ queryKey: ["tasks"] });
                      toast({
                        title: "Task Updated",
                        description: "Task marked as blocked",
                      });
                    } else if (reasonType === 'failed') {
                      // Store failure_reason AND status in the task
                      const { error: taskError } = await supabase.from("tasks").update({
                        failure_reason: reasonText.trim(),
                        status: "Failed",
                      }).eq("id", taskId);
                      
                      if (taskError) {
                        console.error("Failed to update task:", taskError);
                        toast({
                          title: "Error",
                          description: "Failed to save failure reason",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Add failure reason as comment so it appears in Timeline
                      const { error: commentError } = await supabase.from("comments").insert({
                        task_id: taskId,
                        author_id: user!.id,
                        body: `❌ **Task Failed:** ${reasonText.trim()}`,
                      });
                      
                      if (commentError) {
                        console.error("Failed to insert failure comment:", commentError);
                        // Don't return - the task was already updated, just log the error
                      }
                      
                      fetchComments();
                      queryClient.invalidateQueries({ queryKey: ["tasks"] });
                      
                      setLoadedFailureReason(reasonText.trim());
                      setStatus("Failed");
                      toast({
                        title: "Task Updated",
                        description: "Task marked as failed",
                      });
                    }
                    setReasonText("");
                    setReasonType(null);
                  }
                  // For create mode, keep reasonText so it can be added after task creation
                  
                  // Close dialog
                  setShowReasonDialog(false);
                  setPendingStatus(null);
                }}
                disabled={!reasonText.trim()}
              >
                {reasonType === 'failed' ? 'Set as Failed' : 'Set as Blocked'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
