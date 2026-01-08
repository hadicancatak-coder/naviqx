import { useMemo, useState } from "react";
import { format, differenceInDays, addDays, startOfDay, isWithinInterval, parseISO } from "date-fns";
import { Plus, Trash2, GripVertical } from "lucide-react";
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

interface ProjectRoadmapProps {
  projectId: string;
  isAdmin?: boolean;
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

export function ProjectRoadmap({ projectId, isAdmin }: ProjectRoadmapProps) {
  const { timelines, createTimeline, updateTimeline, deleteTimeline } = useProjectTimelines(projectId);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<ProjectTimeline | null>(null);
  const [newPhase, setNewPhase] = useState({
    phase_name: "",
    start_date: "",
    end_date: "",
    description: "",
    color: "primary",
    progress: 0,
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

    await createTimeline.mutateAsync({
      project_id: projectId,
      phase_name: newPhase.phase_name,
      start_date: newPhase.start_date,
      end_date: newPhase.end_date,
      description: newPhase.description,
      color: newPhase.color,
      progress: newPhase.progress,
    });

    setNewPhase({ phase_name: "", start_date: "", end_date: "", description: "", color: "primary", progress: 0 });
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

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h3 className="text-heading-sm font-semibold text-foreground">Roadmap</h3>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setIsAddingPhase(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Phase
          </Button>
        )}
      </div>

      {phases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
          <p className="text-body-sm">No phases defined yet</p>
          {isAdmin && (
            <Button variant="link" className="mt-2" onClick={() => setIsAddingPhase(true)}>
              Add your first phase
            </Button>
          )}
        </div>
      ) : (
        <div className="relative bg-card border border-border rounded-xl p-md overflow-x-auto">
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
          <div className="relative min-h-[200px]" style={{ minWidth: "600px" }}>
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

                return (
                  <div key={phase.id} className="relative h-14 group">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute h-full rounded-lg border-2 cursor-pointer transition-all",
                            colors.bg,
                            colors.border,
                            isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          )}
                          style={{ left: `${left}%`, width: `${width}%`, minWidth: "80px" }}
                          onClick={() => isAdmin && setEditingPhase(phase)}
                        >
                          <div className="h-full px-3 py-2 flex flex-col justify-between overflow-hidden">
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                              )}
                              <span className={cn("text-body-sm font-medium truncate", colors.text)}>
                                {phase.phase_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={phase.progress} className="h-1.5 flex-1" />
                              <span className="text-metadata text-muted-foreground">{phase.progress}%</span>
                            </div>
                          </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-md">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Phase</DialogTitle>
          </DialogHeader>
          {editingPhase && (
            <div className="space-y-md">
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
