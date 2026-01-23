import { useMemo, useState } from "react";
import { format, differenceInDays, addDays, startOfDay, isWithinInterval, parseISO } from "date-fns";
import { Plus, Trash2, Layers, User2, Target, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectTimeline, useProjectTimelines } from "@/hooks/useProjects";
import { useAllProjectMilestones, usePhaseDependencies, usePhaseTaskStats } from "@/hooks/useRoadmap";
import { calculatePhaseProgress } from "@/hooks/usePhaseProgress";
import { RoadmapSummary, StepExpandedCard, StepCard, DependencyLines, QuickMilestoneDialog, STEP_LANES } from "./roadmap";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProjectRoadmapProps {
  projectId: string;
  isAdmin?: boolean;
  projectDueDate?: string | null;
}

// Status-based colors (not priority)
const stepColors: Record<string, { bg: string; border: string; text: string }> = {
  primary: { bg: "bg-primary/20", border: "border-primary/40", text: "text-primary" },
  success: { bg: "bg-success/20", border: "border-success/40", text: "text-success-text" },
  warning: { bg: "bg-warning/20", border: "border-warning/40", text: "text-warning-text" },
  info: { bg: "bg-info/20", border: "border-info/40", text: "text-info-text" },
  destructive: { bg: "bg-destructive/20", border: "border-destructive/40", text: "text-destructive-text" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-500/40", text: "text-purple-600 dark:text-purple-400" },
  cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-600 dark:text-cyan-400" },
};

// Step status options
const stepStatuses = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

export function ProjectRoadmap({ projectId, isAdmin, projectDueDate }: ProjectRoadmapProps) {
  const { timelines, createTimeline, updateTimeline, deleteTimeline } = useProjectTimelines(projectId);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [editingStep, setEditingStep] = useState<ProjectTimeline | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [quickMilestoneStep, setQuickMilestoneStep] = useState<{ id: string; name: string } | null>(null);
  const [newStep, setNewStep] = useState({
    phase_name: "",
    start_date: "",
    end_date: "",
    description: "",
    color: "primary",
    progress: 0,
    owner: "",
    system_name: "",
    status: "not_started",
    step_lane: "execution",
    expected_outcomes: [""],
    depends_on: [] as string[],
  });

  // Fetch all users for the owner dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  };
  const { minDate, maxDate, totalDays, today, steps } = useMemo(() => {
    if (!timelines || timelines.length === 0) {
      const now = new Date();
      return {
        minDate: now,
        maxDate: addDays(now, 90),
        totalDays: 90,
        today: now,
        steps: [],
      };
    }

    const dates = timelines.flatMap((t) => [parseISO(t.start_date), parseISO(t.end_date)]);
    const min = startOfDay(new Date(Math.min(...dates.map((d) => d.getTime()))));
    const max = startOfDay(new Date(Math.max(...dates.map((d) => d.getTime()))));
    const paddedMin = addDays(min, -7);
    const paddedMax = addDays(max, 14);

    return {
      minDate: paddedMin,
      maxDate: paddedMax,
      totalDays: differenceInDays(paddedMax, paddedMin),
      today: startOfDay(new Date()),
      steps: timelines.map((t) => ({
        ...t,
        startDate: parseISO(t.start_date),
        endDate: parseISO(t.end_date),
      })),
    };
  }, [timelines]);

  const stepIds = useMemo(() => steps.map((p) => p.id), [steps]);
  
  // Fetch related data
  const { milestones } = useAllProjectMilestones(projectId, stepIds);
  const { dependencies, createDependency } = usePhaseDependencies(projectId, stepIds);
  const { taskStats } = usePhaseTaskStats(projectId);

  // Compute steps with calculated progress for summary/display
  const stepsWithProgress = useMemo(() => {
    return steps.map((step) => {
      const stepMilestones = milestones?.filter((m) => m.phase_id === step.id) || [];
      const stepTaskStat = taskStats?.find((s) => s.phase_id === step.id);
      const { calculatedProgress } = calculatePhaseProgress(stepMilestones, stepTaskStat);
      return { ...step, progress: calculatedProgress };
    });
  }, [steps, milestones, taskStats]);

  const getPosition = (date: Date) => {
    const days = differenceInDays(date, minDate);
    return (days / totalDays) * 100;
  };

  const getWidth = (start: Date, end: Date) => {
    const days = differenceInDays(end, start) + 1;
    return (days / totalDays) * 100;
  };

  const todayPosition = getPosition(today);
  const isTodayVisible = todayPosition >= 0 && todayPosition <= 100;

  const handleAddStep = async () => {
    if (!newStep.phase_name || !newStep.start_date || !newStep.end_date) return;

    // Filter empty outcomes
    const outcomes = newStep.expected_outcomes.filter(o => o.trim() !== "");

    const createdStep = await createTimeline.mutateAsync({
      project_id: projectId,
      phase_name: newStep.phase_name,
      start_date: newStep.start_date,
      end_date: newStep.end_date,
      description: newStep.description,
      color: newStep.color,
      progress: newStep.progress,
      owner: newStep.owner || null,
      system_name: newStep.system_name || null,
      status: newStep.status,
      step_lane: newStep.step_lane,
      expected_outcomes: outcomes,
    } as any);

    // Create dependencies
    for (const depId of newStep.depends_on) {
      await createDependency.mutateAsync({
        phase_id: createdStep.id,
        depends_on_phase_id: depId,
      });
    }

    setNewStep({ 
      phase_name: "", 
      start_date: "", 
      end_date: "", 
      description: "", 
      color: "primary", 
      progress: 0,
      owner: "",
      system_name: "",
      status: "not_started",
      step_lane: "execution",
      expected_outcomes: [""],
      depends_on: [],
    });
    setIsAddingStep(false);
  };

  const handleUpdateStep = async () => {
    if (!editingStep) return;
    await updateTimeline.mutateAsync({
      id: editingStep.id,
      phase_name: editingStep.phase_name,
      start_date: editingStep.start_date,
      end_date: editingStep.end_date,
      description: editingStep.description,
      color: editingStep.color,
      progress: editingStep.progress,
      owner: (editingStep as any).owner || null,
      system_name: (editingStep as any).system_name || null,
      status: (editingStep as any).status || "not_started",
      step_lane: (editingStep as any).step_lane || "execution",
      expected_outcomes: (editingStep as any).expected_outcomes || [],
    } as any);
    setEditingStep(null);
  };

  const handleDeleteStep = async (id: string) => {
    await deleteTimeline.mutateAsync(id);
    if (expandedStepId === id) {
      setExpandedStepId(null);
    }
  };

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const markers: { date: Date; position: number }[] = [];
    let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

    while (current <= maxDate) {
      if (current >= minDate) {
        markers.push({ date: current, position: getPosition(current) });
      }
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return markers;
  }, [minDate, maxDate, totalDays]);

  // Get milestones for a specific step
  const getMilestonesForStep = (stepId: string) => {
    return (milestones || []).filter((m) => m.phase_id === stepId);
  };

  // Add/remove expected outcome fields
  const addOutcomeField = () => {
    setNewStep({ ...newStep, expected_outcomes: [...newStep.expected_outcomes, ""] });
  };

  const updateOutcome = (index: number, value: string) => {
    const updated = [...newStep.expected_outcomes];
    updated[index] = value;
    setNewStep({ ...newStep, expected_outcomes: updated });
  };

  const removeOutcome = (index: number) => {
    const updated = newStep.expected_outcomes.filter((_, i) => i !== index);
    setNewStep({ ...newStep, expected_outcomes: updated.length > 0 ? updated : [""] });
  };

  return (
    <div className="space-y-md">
      {/* Header with title and add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-heading-sm font-semibold text-foreground">Project Roadmap</h3>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setIsAddingStep(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Step
          </Button>
        )}
      </div>

      {/* Summary Metrics - Full Width */}
      {stepsWithProgress.length > 0 && (
        <RoadmapSummary
          phases={stepsWithProgress}
          milestones={milestones || []}
          projectDueDate={projectDueDate}
        />
      )}

      {steps.length === 0 ? (
        <div className="liquid-glass-elevated text-center py-16 text-muted-foreground rounded-xl">
          <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-body font-medium mb-1">No roadmap steps yet</p>
          <p className="text-body-sm text-muted-foreground mb-4">
            Add steps to visualize what must happen, in what order, and with what outcome
          </p>
          {isAdmin && (
            <Button onClick={() => setIsAddingStep(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Step
            </Button>
          )}
        </div>
      ) : (
        <div className="liquid-glass rounded-xl p-md overflow-x-auto min-h-[400px]">
          {/* Month markers */}
          <div className="relative h-8 mb-3 border-b border-border/50">
            {monthMarkers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-0 text-metadata font-medium text-muted-foreground"
                style={{ left: `${marker.position}%` }}
              >
                {format(marker.date, "MMM yyyy")}
              </div>
            ))}
          </div>

          {/* Timeline container - horizontal scroll canvas */}
          <div className="relative" style={{ minWidth: "800px" }}>
            {/* Dependency Lines */}
            <DependencyLines
              phases={steps}
              dependencies={dependencies || []}
              minDate={minDate}
              totalDays={totalDays}
              phaseRowHeight={120}
              expandedPhaseId={expandedStepId}
            />

            {/* Today marker */}
            {isTodayVisible && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-destructive via-destructive to-transparent z-10"
                style={{ left: `${todayPosition}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-destructive text-destructive-foreground rounded-md text-metadata font-medium whitespace-nowrap shadow-lg">
                  Today
                </div>
              </div>
            )}

            {/* Step cards */}
            <div className="space-y-4 pt-2">
              {steps.map((step) => {
                const colors = stepColors[step.color] || stepColors.primary;
                const left = getPosition(step.startDate);
                const width = getWidth(step.startDate, step.endDate);
                const isActive = isWithinInterval(today, { start: step.startDate, end: step.endDate });
                const isExpanded = expandedStepId === step.id;
                const stepMilestones = getMilestonesForStep(step.id);
                const stepTaskStat = taskStats?.find((s) => s.phase_id === step.id);
                
                // Calculate auto-progress based on milestones and tasks
                const progressResult = calculatePhaseProgress(stepMilestones, stepTaskStat);
                const displayProgress = progressResult.calculatedProgress;

                if (isExpanded) {
                  return (
                    <StepExpandedCard
                      key={step.id}
                      step={step}
                      steps={steps}
                      dependencies={dependencies || []}
                      taskStats={stepTaskStat}
                      progress={displayProgress}
                      isAdmin={isAdmin}
                      onEdit={() => setEditingStep(step)}
                      onCollapse={() => setExpandedStepId(null)}
                      colorClasses={colors}
                    />
                  );
                }

                return (
                  <div key={step.id} className="relative h-28">
                    <StepCard
                      step={step}
                      left={left}
                      width={width}
                      colorClasses={colors}
                      progress={displayProgress}
                      isActive={isActive}
                      onClick={() => setExpandedStepId(step.id)}
                      isAdmin={isAdmin}
                      onDelete={() => handleDeleteStep(step.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Step Dialog */}
      <Dialog open={isAddingStep} onOpenChange={setIsAddingStep}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Add Step
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-md">
            {/* Step Name */}
            <div className="space-y-2">
              <Label>Step Title</Label>
              <Input
                value={newStep.phase_name}
                onChange={(e) => setNewStep({ ...newStep, phase_name: e.target.value })}
                placeholder="e.g., Analyze current attribution setup"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newStep.start_date}
                  onChange={(e) => setNewStep({ ...newStep, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newStep.end_date}
                  onChange={(e) => setNewStep({ ...newStep, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Owner & System */}
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User2 className="h-3.5 w-3.5" />
                  Owner (Team/Person)
                </Label>
                <Input
                  value={newStep.owner}
                  onChange={(e) => setNewStep({ ...newStep, owner: e.target.value })}
                  placeholder="e.g., Data Team, Marketing"
                />
              </div>
              <div className="space-y-2">
                <Label>System</Label>
                <Input
                  value={newStep.system_name}
                  onChange={(e) => setNewStep({ ...newStep, system_name: e.target.value })}
                  placeholder="e.g., GA4, Meta CAPI"
                />
              </div>
            </div>

            {/* Status & Lane */}
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStep.status} onValueChange={(v) => setNewStep({ ...newStep, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stepStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lane</Label>
                <Select value={newStep.step_lane} onValueChange={(v) => setNewStep({ ...newStep, step_lane: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STEP_LANES.map((lane) => (
                      <SelectItem key={lane.id} value={lane.id}>
                        {lane.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={newStep.color} onValueChange={(v) => setNewStep({ ...newStep, color: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(stepColors).map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", stepColors[color].bg, stepColors[color].border)} />
                        <span className="capitalize">{color}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dependencies */}
            {steps.length > 0 && (
              <div className="space-y-2">
                <Label>Depends On (optional)</Label>
                <Select
                  value={newStep.depends_on[0] || "none"}
                  onValueChange={(v) => setNewStep({ ...newStep, depends_on: v === "none" ? [] : [v] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a step..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {steps.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.phase_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newStep.description}
                onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                placeholder="Brief description of this step..."
                rows={2}
              />
            </div>

            {/* Expected Outcomes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                Expected Outcomes (mandatory for clarity)
              </Label>
              <div className="space-y-2">
                {newStep.expected_outcomes.map((outcome, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input
                      value={outcome}
                      onChange={(e) => updateOutcome(idx, e.target.value)}
                      placeholder="e.g., Clean attribution data flowing to dashboard"
                    />
                    {newStep.expected_outcomes.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeOutcome(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addOutcomeField} className="mt-1">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Outcome
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-md">
            <Button variant="outline" onClick={() => setIsAddingStep(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStep} disabled={createTimeline.isPending}>
              Add Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Step Dialog */}
      <Dialog open={!!editingStep} onOpenChange={() => setEditingStep(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Edit Step
            </DialogTitle>
          </DialogHeader>
          {editingStep && (
            <div className="space-y-md">
              <div className="space-y-2">
                <Label>Step Title</Label>
                <Input
                  value={editingStep.phase_name}
                  onChange={(e) => setEditingStep({ ...editingStep, phase_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editingStep.start_date}
                    onChange={(e) => setEditingStep({ ...editingStep, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={editingStep.end_date}
                    onChange={(e) => setEditingStep({ ...editingStep, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Select 
                    value={(editingStep as any).owner || "none"} 
                    onValueChange={(v) => setEditingStep({ ...editingStep, owner: v === "none" ? "" : v } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">No owner</span>
                      </SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.name || user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(user.name || "")}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.name || "Unknown"}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>System</Label>
                  <Input
                    value={(editingStep as any).system_name || ""}
                    onChange={(e) => setEditingStep({ ...editingStep, system_name: e.target.value } as any)}
                    placeholder="e.g., GA4, Meta"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={(editingStep as any).status || "not_started"} 
                    onValueChange={(v) => setEditingStep({ ...editingStep, status: v } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stepStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Progress ({editingStep.progress}%)</Label>
                  <Input
                    type="range"
                    min={0}
                    max={100}
                    value={editingStep.progress}
                    onChange={(e) => setEditingStep({ ...editingStep, progress: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={editingStep.color}
                  onValueChange={(v) => setEditingStep({ ...editingStep, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(stepColors).map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", stepColors[color].bg, stepColors[color].border)} />
                          <span className="capitalize">{color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingStep.description || ""}
                  onChange={(e) => setEditingStep({ ...editingStep, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-md">
            <Button variant="outline" onClick={() => setEditingStep(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStep} disabled={updateTimeline.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Milestone Dialog */}
      {quickMilestoneStep && (
        <QuickMilestoneDialog
          phaseId={quickMilestoneStep.id}
          phaseName={quickMilestoneStep.name}
          open={!!quickMilestoneStep}
          onOpenChange={(open) => {
            if (!open) setQuickMilestoneStep(null);
          }}
        />
      )}
    </div>
  );
}
