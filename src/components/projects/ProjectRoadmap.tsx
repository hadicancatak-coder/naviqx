import { useMemo, useState } from "react";
import { format, differenceInDays, addDays, startOfDay, isWithinInterval, parseISO } from "date-fns";
import { Plus, Trash2, ChevronDown, Diamond, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ProjectTimeline, useProjectTimelines } from "@/hooks/useProjects";
import { useAllProjectMilestones, usePhaseDependencies, usePhaseTaskStats } from "@/hooks/useRoadmap";
import { RoadmapSummary, PhaseExpandedCard, DependencyLines } from "./roadmap";

interface ProjectRoadmapProps {
  projectId: string;
  isAdmin?: boolean;
  projectDueDate?: string | null;
}

const phaseColors: Record<string, { bg: string; border: string; text: string }> = {
  primary: { bg: "bg-primary/20", border: "border-primary/40", text: "text-primary" },
  success: { bg: "bg-success/20", border: "border-success/40", text: "text-success-text" },
  warning: { bg: "bg-warning/20", border: "border-warning/40", text: "text-warning-text" },
  info: { bg: "bg-info/20", border: "border-info/40", text: "text-info-text" },
  destructive: { bg: "bg-destructive/20", border: "border-destructive/40", text: "text-destructive-text" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-500/40", text: "text-purple-600 dark:text-purple-400" },
  cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/40", text: "text-cyan-600 dark:text-cyan-400" },
};

const phaseTypes = [
  { value: "planning", label: "Planning" },
  { value: "research", label: "Research" },
  { value: "development", label: "Development" },
  { value: "testing", label: "Testing" },
  { value: "launch", label: "Launch" },
  { value: "review", label: "Review" },
];

export function ProjectRoadmap({ projectId, isAdmin, projectDueDate }: ProjectRoadmapProps) {
  const { timelines, createTimeline, updateTimeline, deleteTimeline } = useProjectTimelines(projectId);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectTimeline | null>(null);
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [newPhase, setNewPhase] = useState({
    phase_name: "",
    start_date: "",
    end_date: "",
    description: "",
    color: "primary",
    progress: 0,
    phase_type: "development",
    depends_on: [] as string[],
  });

  const { minDate, maxDate, totalDays, today, phases } = useMemo(() => {
    if (!timelines || timelines.length === 0) {
      const now = new Date();
      return {
        minDate: now,
        maxDate: addDays(now, 90),
        totalDays: 90,
        today: now,
        phases: [],
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
      phases: timelines.map((t) => ({
        ...t,
        startDate: parseISO(t.start_date),
        endDate: parseISO(t.end_date),
      })),
    };
  }, [timelines]);

  const phaseIds = useMemo(() => phases.map((p) => p.id), [phases]);
  
  // Fetch related data
  const { milestones } = useAllProjectMilestones(projectId, phaseIds);
  const { dependencies, createDependency, deleteDependency } = usePhaseDependencies(projectId, phaseIds);
  const { taskStats } = usePhaseTaskStats(projectId);

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

  const handleAddPhase = async () => {
    if (!newPhase.phase_name || !newPhase.start_date || !newPhase.end_date) return;

    const createdPhase = await createTimeline.mutateAsync({
      project_id: projectId,
      phase_name: newPhase.phase_name,
      start_date: newPhase.start_date,
      end_date: newPhase.end_date,
      description: newPhase.description,
      color: newPhase.color,
      progress: newPhase.progress,
    });

    // Create dependencies
    for (const depId of newPhase.depends_on) {
      await createDependency.mutateAsync({
        phase_id: createdPhase.id,
        depends_on_phase_id: depId,
      });
    }

    setNewPhase({ 
      phase_name: "", 
      start_date: "", 
      end_date: "", 
      description: "", 
      color: "primary", 
      progress: 0,
      phase_type: "development",
      depends_on: [],
    });
    setIsAddingPhase(false);
  };

  const handleUpdatePhase = async () => {
    if (!editingPhase) return;
    await updateTimeline.mutateAsync({
      id: editingPhase.id,
      phase_name: editingPhase.phase_name,
      start_date: editingPhase.start_date,
      end_date: editingPhase.end_date,
      description: editingPhase.description,
      color: editingPhase.color,
      progress: editingPhase.progress,
    });
    setEditingPhase(null);
  };

  const handleDeletePhase = async (id: string) => {
    await deleteTimeline.mutateAsync(id);
    if (expandedPhaseId === id) {
      setExpandedPhaseId(null);
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

  // Get milestones for a specific phase (for diamond markers)
  const getMilestonesForPhase = (phaseId: string) => {
    return (milestones || []).filter((m) => m.phase_id === phaseId);
  };

  return (
    <div className="space-y-md">
      {/* Header with title and add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-heading-sm font-semibold text-foreground">Project Roadmap</h3>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setIsAddingPhase(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Phase
          </Button>
        )}
      </div>

      {/* Summary Metrics - Full Width */}
      {phases.length > 0 && (
        <RoadmapSummary
          phases={phases}
          milestones={milestones || []}
          projectDueDate={projectDueDate}
        />
      )}

      {phases.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl bg-muted/30">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-body font-medium mb-1">No roadmap phases yet</p>
          <p className="text-body-sm text-muted-foreground mb-4">Add phases to visualize your project timeline</p>
          {isAdmin && (
            <Button onClick={() => setIsAddingPhase(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add First Phase
            </Button>
          )}
        </div>
      ) : (
        <div className="relative rounded-xl p-md overflow-x-auto min-h-[350px]">
          {/* Month markers */}
          <div className="relative h-6 mb-2 border-b border-border">
            {monthMarkers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-0 text-metadata text-muted-foreground"
                style={{ left: `${marker.position}%` }}
              >
                {format(marker.date, "MMM yyyy")}
              </div>
            ))}
          </div>

          {/* Timeline container */}
          <div className="relative" style={{ minWidth: "600px" }}>
            {/* Dependency Lines */}
            <DependencyLines
              phases={phases}
              dependencies={dependencies || []}
              minDate={minDate}
              totalDays={totalDays}
              phaseRowHeight={56}
              expandedPhaseId={expandedPhaseId}
            />

            {/* Today marker */}
            {isTodayVisible && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
                style={{ left: `${todayPosition}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded text-metadata whitespace-nowrap">
                  Today
                </div>
              </div>
            )}

            {/* Phase bars */}
            <div className="space-y-3 pt-2">
              {phases.map((phase, idx) => {
                const colors = phaseColors[phase.color] || phaseColors.primary;
                const left = getPosition(phase.startDate);
                const width = getWidth(phase.startDate, phase.endDate);
                const isActive = isWithinInterval(today, { start: phase.startDate, end: phase.endDate });
                const isExpanded = expandedPhaseId === phase.id;
                const phaseMilestones = getMilestonesForPhase(phase.id);
                const phaseTaskStat = taskStats?.find((s) => s.phase_id === phase.id);

                if (isExpanded) {
                  return (
                    <PhaseExpandedCard
                      key={phase.id}
                      phase={phase}
                      phases={phases}
                      dependencies={dependencies || []}
                      taskStats={phaseTaskStat}
                      isAdmin={isAdmin}
                      onEdit={() => setEditingPhase(phase)}
                      onCollapse={() => setExpandedPhaseId(null)}
                      colorClasses={colors}
                    />
                  );
                }

                return (
                  <div key={phase.id} className="relative h-14 group">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute h-full rounded-lg border-2 cursor-pointer transition-all hover:shadow-soft",
                            colors.bg,
                            colors.border,
                            isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          )}
                          style={{ left: `${left}%`, width: `${width}%`, minWidth: "100px" }}
                          onClick={() => setExpandedPhaseId(phase.id)}
                        >
                          <div className="h-full px-3 py-2 flex flex-col justify-between overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-body-sm font-medium truncate", colors.text)}>
                                {phase.phase_name}
                              </span>
                              {phaseMilestones.length > 0 && (
                                <span className="flex items-center gap-0.5 text-metadata text-muted-foreground">
                                  <Diamond className="h-3 w-3" />
                                  {phaseMilestones.length}
                                </span>
                              )}
                              <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 ml-auto" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={phase.progress} className="h-1.5 flex-1" />
                              <span className="text-metadata text-muted-foreground">{phase.progress}%</span>
                            </div>
                          </div>

                          {/* Milestone diamond markers on the bar */}
                          {phaseMilestones.slice(0, 3).map((milestone, mIdx) => {
                            if (!milestone.due_date) return null;
                            const milestoneDate = parseISO(milestone.due_date);
                            const phaseStart = phase.startDate;
                            const phaseEnd = phase.endDate;
                            const phaseDuration = differenceInDays(phaseEnd, phaseStart);
                            const milestoneOffset = differenceInDays(milestoneDate, phaseStart);
                            const milestonePosition = phaseDuration > 0 
                              ? Math.min(Math.max((milestoneOffset / phaseDuration) * 100, 5), 95)
                              : 50;

                            return (
                              <Diamond
                                key={milestone.id}
                                className={cn(
                                  "absolute top-1 h-2.5 w-2.5",
                                  milestone.is_completed 
                                    ? "text-success-text fill-success/30" 
                                    : "text-warning-text fill-warning/30"
                                )}
                                style={{ left: `${milestonePosition}%`, transform: "translateX(-50%)" }}
                              />
                            );
                          })}

                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhase(phase.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{phase.phase_name}</p>
                          <p className="text-metadata">
                            {format(phase.startDate, "MMM d")} – {format(phase.endDate, "MMM d, yyyy")}
                          </p>
                          {phase.description && (
                            <p className="text-metadata text-muted-foreground">{phase.description}</p>
                          )}
                          <p className="text-metadata">Progress: {phase.progress}%</p>
                          {phaseMilestones.length > 0 && (
                            <p className="text-metadata">
                              Milestones: {phaseMilestones.filter((m) => m.is_completed).length}/{phaseMilestones.length}
                            </p>
                          )}
                          <p className="text-metadata text-primary">Click to expand</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Phase Dialog */}
      <Dialog open={isAddingPhase} onOpenChange={setIsAddingPhase}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-md max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Phase Name</Label>
              <Input
                value={newPhase.phase_name}
                onChange={(e) => setNewPhase({ ...newPhase, phase_name: e.target.value })}
                placeholder="e.g., Research & Discovery"
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newPhase.start_date}
                  onChange={(e) => setNewPhase({ ...newPhase, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newPhase.end_date}
                  onChange={(e) => setNewPhase({ ...newPhase, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-2">
                <Label>Phase Type</Label>
                <Select value={newPhase.phase_type} onValueChange={(v) => setNewPhase({ ...newPhase, phase_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {phaseTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={newPhase.color} onValueChange={(v) => setNewPhase({ ...newPhase, color: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(phaseColors).map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", phaseColors[color].bg, phaseColors[color].border)} />
                          <span className="capitalize">{color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {phases.length > 0 && (
              <div className="space-y-2">
                <Label>Depends On (optional)</Label>
                <Select
                  value={newPhase.depends_on[0] || "none"}
                  onValueChange={(v) => setNewPhase({ ...newPhase, depends_on: v === "none" ? [] : [v] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a phase..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {phases.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.phase_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={newPhase.description}
                onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                placeholder="Brief description of this phase..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingPhase(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPhase} disabled={createTimeline.isPending}>
              Add Phase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Phase Dialog */}
      <Dialog open={!!editingPhase} onOpenChange={() => setEditingPhase(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Phase</DialogTitle>
          </DialogHeader>
          {editingPhase && (
            <div className="space-y-md max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label>Phase Name</Label>
                <Input
                  value={editingPhase.phase_name}
                  onChange={(e) => setEditingPhase({ ...editingPhase, phase_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editingPhase.start_date}
                    onChange={(e) => setEditingPhase({ ...editingPhase, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={editingPhase.end_date}
                    onChange={(e) => setEditingPhase({ ...editingPhase, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Progress ({editingPhase.progress}%)</Label>
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={editingPhase.progress}
                  onChange={(e) => setEditingPhase({ ...editingPhase, progress: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={editingPhase.color}
                  onValueChange={(v) => setEditingPhase({ ...editingPhase, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(phaseColors).map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", phaseColors[color].bg, phaseColors[color].border)} />
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
                  value={editingPhase.description || ""}
                  onChange={(e) => setEditingPhase({ ...editingPhase, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhase(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePhase} disabled={updateTimeline.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
