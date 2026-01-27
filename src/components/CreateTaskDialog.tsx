import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, AlertTriangle, ChevronDown, ChevronRight, Repeat } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ENTITIES, TASK_STATUSES } from "@/lib/constants";
import { mapStatusToDb } from "@/lib/taskStatusMapper";
import { validateDateForUsers, getDayName, formatWorkingDays } from "@/lib/workingDaysHelper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQueryClient } from "@tanstack/react-query";
import { TaskAssigneeSelector } from "@/components/tasks/TaskAssigneeSelector";
import { TagsMultiSelect } from "@/components/tasks/TagsMultiSelect";
import { useProjects } from "@/hooks/useProjects";
import { FolderKanban } from "lucide-react";
import { 
  RecurrenceRule, 
  buildRecurrenceConfig, 
  getRecurrenceLabelNew,
  calculateFirstOccurrence 
} from "@/lib/recurrenceUtils";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string | null;
}

export function CreateTaskDialog({ open, onOpenChange, defaultProjectId }: CreateTaskDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { projects } = useProjects();
  
  // Advanced settings collapsed state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<string>("Ongoing");
  const [dueDate, setDueDate] = useState<Date>();
  const [entities, setEntities] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<string[]>([]);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | null>(null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'after_n' | 'until_date'>('never');
  const [recurrenceEndValue, setRecurrenceEndValue] = useState<string>('');
  const [workingDaysWarning, setWorkingDaysWarning] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // Blocked/Failed reason prompt state
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [reasonType, setReasonType] = useState<'blocked' | 'failed' | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  
  const blockedReason = reasonType === 'blocked' ? reasonText : "";
  const failureReason = reasonType === 'failed' ? reasonText : "";

  // Initialize projectId from defaultProjectId when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
      setProjectId(defaultProjectId || null);
    }
  }, [open, defaultProjectId]);

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

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, name, username, working_days");
    setUsers(data || []);
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
      // Build recurrence configuration for templates
      const isRecurring = recurrence !== 'none';
      let recurrenceConfig: any = {};
      let nextRunAt: Date | null = null;
      
      if (isRecurring) {
        const rule: RecurrenceRule = {
          type: recurrence,
          interval: 1,
          days_of_week: recurrence === 'weekly' ? recurrenceDaysOfWeek : undefined,
          day_of_month: recurrence === 'monthly' ? (recurrenceDayOfMonth || undefined) : undefined,
          end_condition: recurrenceEndType,
          end_value: recurrenceEndType === 'after_n' 
            ? parseInt(recurrenceEndValue) || 10 
            : recurrenceEndType === 'until_date' 
              ? recurrenceEndValue 
              : undefined,
        };
        
        const config = buildRecurrenceConfig(rule, new Date());
        recurrenceConfig = {
          recurrence_rrule: JSON.stringify(rule),
          recurrence_end_type: config.recurrence_end_type,
          recurrence_end_value: config.recurrence_end_value,
          next_run_at: config.next_run_at,
          is_recurrence_template: true,
          occurrence_count: 0,
        };
        nextRunAt = config.next_run_at ? new Date(config.next_run_at) : null;
      }

      const taskData = {
        title: title.trim(),
        description: description || null,
        priority,
        status: isRecurring ? 'Pending' : mapStatusToDb(status) as "Ongoing" | "Pending" | "Blocked" | "Completed" | "Failed",
        due_at: isRecurring ? null : (dueDate?.toISOString() || null),
        created_by: user!.id,
        entity: entities.length > 0 ? entities : [],
        labels: tags.length > 0 ? tags : [],
        task_type: (isRecurring ? "recurring" : "generic") as "generic" | "recurring" | "campaign",
        visibility: "global" as const,
        failure_reason: status === "Failed" && failureReason.trim() ? failureReason.trim() : null,
        project_id: projectId || null,
        ...recurrenceConfig,
      };

      const { data: createdTask, error } = await supabase
        .from("tasks")
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;

      // Assign users
      if (selectedAssignees.length > 0) {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user!.id)
          .single();

        if (creatorProfile) {
          const assigneeInserts = selectedAssignees.map(profileId => ({
            task_id: createdTask.id,
            user_id: profileId,
            assigned_by: creatorProfile.id,
          }));

          await supabase.from("task_assignees").insert(assigneeInserts);
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

      const toastMsg = isRecurring && nextRunAt
        ? `Recurring template created. First task on ${format(nextRunAt, 'PP')}`
        : "Task created successfully";
      
      toast({
        title: "Success",
        description: toastMsg,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-templates"] });
      
      // Reset and close
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
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
    setRecurrenceEndType('never');
    setRecurrenceEndValue('');
    setSelectedAssignees([]);
    setWorkingDaysWarning(null);
    setAdvancedOpen(false);
    setShowReasonDialog(false);
    setReasonText("");
    setReasonType(null);
    setPendingStatus(null);
    setProjectId(null);
  };

  const handleStatusChange = (value: string) => {
    if (value === "Blocked") {
      setPendingStatus(value);
      setReasonType('blocked');
      setReasonText("");
      setShowReasonDialog(true);
    } else if (value === "Failed") {
      setPendingStatus(value);
      setReasonType('failed');
      setReasonText("");
      setShowReasonDialog(true);
    } else {
      setStatus(value);
    }
  };

  const confirmStatusWithReason = () => {
    if (pendingStatus) {
      setStatus(pendingStatus);
    }
    setShowReasonDialog(false);
  };

  const cancelStatusChange = () => {
    setPendingStatus(null);
    setReasonType(null);
    setReasonText("");
    setShowReasonDialog(false);
  };

  // Auto-save task to backlog when closing with title filled
  const handleSheetClose = async (isOpen: boolean) => {
    if (!isOpen && title.trim() && !loading) {
      // User clicked outside or closed - auto-save to backlog
      try {
        const taskData = {
          title: title.trim(),
          description: description || null,
          priority: "Medium" as const,
          status: "Pending" as const,
          created_by: user!.id,
          visibility: "global" as const,
          task_type: "generic" as const,
        };

        await supabase.from("tasks").insert([taskData]);
        
        toast({
          title: "Task saved",
          description: "Task auto-saved to backlog",
        });
        
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        resetForm();
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }
    onOpenChange(isOpen);
  };

  const weekDays = [
    { value: 'sun', label: "Sun" },
    { value: 'mon', label: "Mon" },
    { value: 'tue', label: "Tue" },
    { value: 'wed', label: "Wed" },
    { value: 'thu', label: "Thu" },
    { value: 'fri', label: "Fri" },
    { value: 'sat', label: "Sat" },
  ];
  
  // Preview text for recurrence
  const getRecurrencePreview = () => {
    if (recurrence === 'none') return null;
    
    const rule: RecurrenceRule = {
      type: recurrence,
      interval: 1,
      days_of_week: recurrence === 'weekly' ? recurrenceDaysOfWeek : undefined,
      day_of_month: recurrence === 'monthly' ? (recurrenceDayOfMonth || undefined) : undefined,
      end_condition: recurrenceEndType,
      end_value: recurrenceEndType === 'after_n' 
        ? parseInt(recurrenceEndValue) || undefined 
        : recurrenceEndType === 'until_date' 
          ? recurrenceEndValue 
          : undefined,
    };
    
    const label = getRecurrenceLabelNew(rule);
    const nextRun = calculateFirstOccurrence(rule, new Date());
    
    return { label, nextRun };
  };
  
  const recurrencePreview = getRecurrencePreview();

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetClose}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Create New Task</SheetTitle>
            <SheetDescription>
              Fill in the details to create a new task.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-md">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Add task description..."
                minHeight="120px"
              />
            </div>

            {/* Row 1: Status, Priority, Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
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

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={recurrence !== "none"}
                      className="w-full justify-start overflow-hidden"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {recurrence !== "none" ? "N/A" : dueDate ? format(dueDate, "PP") : "Pick date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div className="space-y-2">
                <Label>Assignees</Label>
                <TaskAssigneeSelector
                  mode="create"
                  selectedIds={selectedAssignees}
                  onSelectionChange={setSelectedAssignees}
                  users={users}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagsMultiSelect
                  value={tags}
                  onChange={setTags}
                />
              </div>
            </div>

            {/* Project */}
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <FolderKanban className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span className="text-body-sm font-medium">Advanced Settings</span>
                  {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-md pt-md">
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
                                setEntities(prev => 
                                  prev.includes(ent) 
                                    ? prev.filter(e => e !== ent)
                                    : [...prev, ent]
                                );
                              }}
                            >
                              <Checkbox checked={entities.includes(ent)} />
                              <span className="text-body-sm">{ent}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Recurrence */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Recurrence
                  </Label>
                  <Select 
                    value={recurrence} 
                    onValueChange={(v) => setRecurrence(v as 'none' | 'daily' | 'weekly' | 'monthly')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (one-time task)</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrence === "weekly" && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          size="sm"
                          variant={recurrenceDaysOfWeek.includes(day.value) ? "default" : "outline"}
                          onClick={() => {
                            setRecurrenceDaysOfWeek(prev =>
                              prev.includes(day.value)
                                ? prev.filter(d => d !== day.value)
                                : [...prev, day.value]
                            );
                          }}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {recurrence === "monthly" && (
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Select 
                      value={recurrenceDayOfMonth?.toString() || ""} 
                      onValueChange={(v) => setRecurrenceDayOfMonth(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Recurrence End Condition */}
                {recurrence !== 'none' && (
                  <div className="space-y-2">
                    <Label>Ends</Label>
                    <Select 
                      value={recurrenceEndType} 
                      onValueChange={(v) => setRecurrenceEndType(v as 'never' | 'after_n' | 'until_date')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="after_n">After X occurrences</SelectItem>
                        <SelectItem value="until_date">Until date</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {recurrenceEndType === 'after_n' && (
                      <Input
                        type="number"
                        min={1}
                        placeholder="Number of occurrences"
                        value={recurrenceEndValue}
                        onChange={(e) => setRecurrenceEndValue(e.target.value)}
                      />
                    )}
                    
                    {recurrenceEndType === 'until_date' && (
                      <Popover modal={true}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {recurrenceEndValue ? format(new Date(recurrenceEndValue), 'PP') : 'Pick end date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={recurrenceEndValue ? new Date(recurrenceEndValue) : undefined}
                            onSelect={(date) => setRecurrenceEndValue(date?.toISOString().split('T')[0] || '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}

                {/* Recurrence Preview */}
                {recurrencePreview && (
                  <Alert>
                    <Repeat className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{recurrencePreview.label}</strong>
                      {recurrencePreview.nextRun && (
                        <span className="block text-muted-foreground text-metadata">
                          First task: {format(recurrencePreview.nextRun, 'PPP')}
                        </span>
                      )}
                      <span className="block text-muted-foreground text-metadata mt-1">
                        This creates a template. New tasks are generated automatically.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </CollapsibleContent>
            </Collapsible>

            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Task"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Reason Dialog for Blocked/Failed status */}
      <Dialog open={showReasonDialog} onOpenChange={cancelStatusChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reasonType === 'blocked' ? 'Reason for Blocking' : 'Reason for Failure'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for setting this status.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder={reasonType === 'blocked' ? "What's blocking this task?" : "Why did this task fail?"}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={cancelStatusChange}>Cancel</Button>
            <Button onClick={confirmStatusWithReason}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
