import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarIcon, MessageCircle, Send, X, Check, 
  ChevronDown, ChevronRight, MoreHorizontal, Trash2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TASK_STATUSES, getStatusColor } from "@/lib/constants";
import { mapStatusToDb, mapStatusToUi } from "@/lib/taskStatusMapper";
import { useRealtimeAssignees } from "@/hooks/useRealtimeAssignees";
import { TaskChecklistSection } from "@/components/TaskChecklistSection";
import { TaskDependenciesSection } from "@/components/TaskDependenciesSection";
import { BlockerDialog } from "@/components/BlockerDialog";
import { useTaskChangeLogs } from "@/hooks/useTaskChangeLogs";
import { ActivityLogEntry } from "@/components/tasks/ActivityLogEntry";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CommentText } from "@/components/CommentText";
import { MentionAutocomplete } from "@/components/MentionAutocomplete";
import { useQueryClient } from "@tanstack/react-query";
import { TaskAssigneeSelector } from "@/components/tasks/TaskAssigneeSelector";
import { TagsMultiSelect } from "@/components/tasks/TagsMultiSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Loading skeleton for the panel
const PanelSkeleton = () => (
  <div className="p-md space-y-md">
    <Skeleton className="h-8 w-3/4" />
    <div className="flex gap-sm">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

interface TaskDetailPanelProps {
  taskId: string;
  task?: any; // Cached task from parent
  onClose: () => void;
  onTaskDeleted?: () => void;
}

export function TaskDetailPanel({ taskId, task: cachedTask, onClose, onTaskDeleted }: TaskDetailPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<string>("Ongoing");
  const [dueDate, setDueDate] = useState<Date>();
  const [tags, setTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  
  // Blocker
  const [blocker, setBlocker] = useState<any>(null);
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  
  // Sections
  const [activityExpanded, setActivityExpanded] = useState(true);
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);
  
  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { assignees: realtimeAssignees, refetch: refetchAssignees } = useRealtimeAssignees("task", taskId);
  const { data: changeLogs = [] } = useTaskChangeLogs(taskId);

  // Fetch task data
  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    
    const { data, error } = await supabase
      .from("tasks")
      .select(`*`)
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

  // Fetch users for mentions
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

  // Initial fetch
  useEffect(() => {
    setLoading(true);
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
    
    Promise.all([fetchTask(), fetchComments(), fetchUsers(), fetchBlocker()]);
  }, [taskId, cachedTask, fetchTask, fetchComments, fetchUsers, fetchBlocker]);

  // Sync assignees from realtime
  useEffect(() => {
    setSelectedAssignees(realtimeAssignees.map(a => a.id));
  }, [realtimeAssignees]);

  // Auto-save on field changes (debounced)
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
    
    const { error } = await supabase.from("tasks").update(updateData).eq("id", taskId);
    
    if (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
    
    setSaving(false);
  }, [taskId, queryClient, toast]);

  // Title save handler
  const handleTitleSave = () => {
    if (title.trim() && title !== task?.title) {
      saveField('title', title.trim());
    }
    setIsEditingTitle(false);
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const commentText = newComment.trim();
    
    try {
      const { data: newCommentData, error } = await supabase
        .from("comments")
        .insert({ task_id: taskId, author_id: user!.id, body: commentText })
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
  };

  // Mark complete
  const handleMarkComplete = async () => {
    setStatus("Completed");
    await saveField('status', "Completed");
  };

  // Delete task
  const handleDelete = async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    
    if (error) {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } else {
      toast({ title: "Task deleted" });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onTaskDeleted?.();
      onClose();
    }
    setShowDeleteDialog(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingTitle) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditingTitle]);

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <PanelSkeleton />
      </div>
    );
  }

  const isCompleted = status === 'Completed';

  return (
    <div className="h-full flex flex-col bg-card animate-slide-in-right">
      {/* Header */}
      <div className="flex-shrink-0 px-md py-sm border-b border-border flex items-center justify-between gap-sm">
        <div className="flex items-center gap-sm">
          <Button
            variant={isCompleted ? "default" : "outline"}
            size="sm"
            onClick={handleMarkComplete}
            disabled={isCompleted}
            className={cn(
              "gap-xs",
              isCompleted && "bg-success hover:bg-success/90"
            )}
          >
            <Check className="h-4 w-4" />
            {isCompleted ? "Completed" : "Complete"}
          </Button>
          {saving && (
            <Badge variant="secondary" className="text-metadata">Saving...</Badge>
          )}
        </div>
        <div className="flex items-center gap-xs">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-md space-y-md">
          {/* Title - Inline editable */}
          <div>
            {isEditingTitle ? (
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setTitle(task?.title || "");
                    setIsEditingTitle(false);
                  }
                }}
                className="text-heading-md font-semibold border-0 shadow-none focus-visible:ring-1 p-0 h-auto"
                autoFocus
              />
            ) : (
              <h2 
                className={cn(
                  "text-heading-md font-semibold cursor-text hover:bg-muted/50 rounded-md px-1 -mx-1 py-0.5 transition-smooth",
                  isCompleted && "line-through text-muted-foreground"
                )}
                onClick={() => setIsEditingTitle(true)}
              >
                {title}
              </h2>
            )}
          </div>

          {/* Quick Details Row */}
          <div className="flex flex-wrap items-center gap-sm">
            {/* Status */}
            <Select 
              value={status} 
              onValueChange={(v) => {
                setStatus(v);
                saveField('status', v);
              }}
            >
              <SelectTrigger className="w-auto h-8 gap-xs">
                <Badge variant="outline" className={cn("text-metadata", getStatusColor(status))}>
                  {status}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority */}
            <Select 
              value={priority} 
              onValueChange={(v: any) => {
                setPriority(v);
                saveField('priority', v);
              }}
            >
              <SelectTrigger className="w-auto h-8 gap-xs">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-metadata",
                    priority === 'High' && 'border-destructive/50 text-destructive bg-destructive/10',
                    priority === 'Medium' && 'border-primary/50 text-primary bg-primary/10',
                    priority === 'Low' && 'border-border text-muted-foreground'
                  )}
                >
                  {priority}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>

            {/* Due Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dueDate ? format(dueDate, "MMM d") : "Add due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    setDueDate(date);
                    saveField('due_at', date);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Assignees */}
          <div className="space-y-xs">
            <Label className="text-metadata text-muted-foreground">Assignees</Label>
            <TaskAssigneeSelector
              mode="edit"
              taskId={taskId}
              selectedIds={selectedAssignees}
              onSelectionChange={(ids) => {
                setSelectedAssignees(ids);
                refetchAssignees();
              }}
              users={users}
            />
          </div>

          {/* Tags */}
          <div className="space-y-xs">
            <Label className="text-metadata text-muted-foreground">Tags</Label>
            <TagsMultiSelect
              value={tags}
              onChange={(newTags) => {
                setTags(newTags);
                saveField('labels', newTags);
              }}
            />
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-xs">
            <Label className="text-metadata text-muted-foreground">Description</Label>
            <RichTextEditor
              value={description}
              onChange={(v) => setDescription(v)}
              onBlur={() => {
                if (description !== task?.description) {
                  saveField('description', description);
                }
              }}
              placeholder="Add a description..."
              minHeight="100px"
            />
          </div>

          <Separator />

          {/* Subtasks / Checklist */}
          <Collapsible open={subtasksExpanded} onOpenChange={setSubtasksExpanded}>
            <CollapsibleTrigger className="flex items-center gap-xs w-full py-xs hover:bg-muted/50 rounded-md -mx-xs px-xs transition-smooth">
              {subtasksExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Label className="text-body-sm font-medium cursor-pointer">Subtasks</Label>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-sm">
              <TaskChecklistSection taskId={taskId} readOnly={false} />
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Dependencies */}
          <div className="space-y-xs">
            <Label className="text-metadata text-muted-foreground">Dependencies</Label>
            <TaskDependenciesSection taskId={taskId} currentStatus={status} />
          </div>

          {/* Blocker */}
          {blocker && (
            <>
              <Separator />
              <div className="space-y-xs">
                <Label className="text-metadata text-muted-foreground">Blocker</Label>
                <div className="p-sm rounded-lg border border-destructive/30 bg-destructive/5 space-y-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm font-medium text-destructive">
                      {blocker.title || "Blocked"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBlockerDialogOpen(true)}
                    >
                      Edit
                    </Button>
                  </div>
                  {blocker.description && (
                    <p className="text-metadata text-muted-foreground">{blocker.description}</p>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Activity / Comments */}
          <Collapsible open={activityExpanded} onOpenChange={setActivityExpanded}>
            <CollapsibleTrigger className="flex items-center gap-xs w-full py-xs hover:bg-muted/50 rounded-md -mx-xs px-xs transition-smooth">
              {activityExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Label className="text-body-sm font-medium cursor-pointer flex items-center gap-xs">
                <MessageCircle className="h-4 w-4" />
                Activity
                {comments.length > 0 && (
                  <Badge variant="secondary" className="text-metadata h-5 px-1.5">{comments.length}</Badge>
                )}
              </Label>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-sm space-y-sm">
              {/* Timeline */}
              {(() => {
                const timelineItems: Array<{ type: 'comment' | 'activity'; data: any; timestamp: Date }> = [];
                
                comments.forEach(comment => {
                  timelineItems.push({ type: 'comment', data: comment, timestamp: new Date(comment.created_at) });
                });
                
                changeLogs.forEach(log => {
                  timelineItems.push({ type: 'activity', data: log, timestamp: new Date(log.changed_at) });
                });
                
                timelineItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                
                if (timelineItems.length === 0) {
                  return (
                    <div className="text-center py-lg text-muted-foreground">
                      <MessageCircle className="h-8 w-8 mx-auto mb-sm opacity-50" />
                      <p className="text-body-sm">No activity yet</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-sm">
                    {timelineItems.map((item, idx) => {
                      if (item.type === 'activity') {
                        return (
                          <div key={`activity-${item.data.id}`} className="py-xs">
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
                      
                      const comment = item.data;
                      const isCurrentUser = comment.author?.user_id === user?.id;
                      return (
                        <div 
                          key={`comment-${comment.id}`} 
                          className={cn("flex gap-sm", isCurrentUser && "flex-row-reverse")}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-metadata bg-primary/10 text-primary">
                              {comment.author?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("flex-1 min-w-0 max-w-[85%]", isCurrentUser && "flex flex-col items-end")}>
                            <div className={cn(
                              "rounded-lg px-sm py-xs max-w-full break-words",
                              isCurrentUser 
                                ? "bg-primary text-primary-foreground rounded-tr-none" 
                                : "bg-muted/50 rounded-tl-none"
                            )}>
                              {!isCurrentUser && (
                                <div className="text-metadata font-medium mb-xs">{comment.author?.name}</div>
                              )}
                              <CommentText 
                                text={comment.body} 
                                className={cn("text-body-sm break-words", isCurrentUser && "text-primary-foreground")}
                                linkClassName={isCurrentUser ? "text-primary-foreground underline" : "text-primary underline"}
                                enableMentions
                                profiles={users}
                                inverted={isCurrentUser}
                              />
                            </div>
                            <span className="text-metadata text-muted-foreground mt-xs">
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
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Comment Input - Fixed at bottom */}
      <div className="flex-shrink-0 p-md border-t border-border">
        <div className="flex flex-col gap-xs">
          <MentionAutocomplete
            value={newComment}
            onChange={setNewComment}
            users={users}
            placeholder="Write a comment... Use @ to mention"
            minRows={2}
            maxRows={3}
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
              size="sm" 
              onClick={handleAddComment}
              disabled={!newComment.trim() || isSubmittingComment}
              className="gap-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Blocker Dialog */}
      <BlockerDialog 
        open={blockerDialogOpen} 
        onOpenChange={setBlockerDialogOpen} 
        taskId={taskId} 
        onSuccess={fetchBlocker} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
