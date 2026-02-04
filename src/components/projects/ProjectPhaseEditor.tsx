import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectTimeline } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

interface ProjectPhaseEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase?: ProjectTimeline | null;
  projectId: string;
  onSave: (data: Partial<ProjectTimeline> & { project_id: string; phase_name: string }) => Promise<void>;
}

const colorOptions = [
  { value: "primary", label: "Blue", className: "bg-primary" },
  { value: "success", label: "Green", className: "bg-success" },
  { value: "warning", label: "Orange", className: "bg-warning" },
  { value: "info", label: "Cyan", className: "bg-info" },
  { value: "destructive", label: "Red", className: "bg-destructive" },
  { value: "purple", label: "Purple", className: "bg-purple-500" },
];

export function ProjectPhaseEditor({ open, onOpenChange, phase, projectId, onSave }: ProjectPhaseEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [color, setColor] = useState("primary");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when phase changes
  useEffect(() => {
    if (phase) {
      setName(phase.phase_name);
      setDescription(phase.description || "");
      setStartDate(new Date(phase.start_date));
      setEndDate(new Date(phase.end_date));
      setColor(phase.color || "primary");
    } else {
      const today = new Date();
      const twoWeeksLater = new Date(today);
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
      
      setName("");
      setDescription("");
      setStartDate(today);
      setEndDate(twoWeeksLater);
      setColor("primary");
    }
  }, [phase]);

  const handleSave = async () => {
    if (!name.trim() || !startDate || !endDate) return;
    
    setIsSaving(true);
    try {
      await onSave({
        id: phase?.id,
        project_id: projectId,
        phase_name: name.trim(),
        description: description.trim() || null,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        color,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-heading-md">
            {phase ? "Edit Phase" : "Add Phase"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-lg py-md">
          {/* Name */}
          <div>
            <Label htmlFor="phase-name" className="text-body-sm font-medium">
              Phase Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Discovery, Development, Launch"
              className="mt-xs"
            />
          </div>

          {/* Date range */}
          <div className="flex gap-md">
            <div className="flex-1">
              <Label className="text-body-sm font-medium">Start Date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-xs justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex-1">
              <Label className="text-body-sm font-medium">End Date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full mt-xs justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Color */}
          <div>
            <Label className="text-body-sm font-medium">Color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger className="mt-xs">
                <SelectValue>
                  <div className="flex items-center gap-sm">
                    <div className={cn("h-3 w-3 rounded-full", colorOptions.find((c) => c.value === color)?.className)} />
                    <span>{colorOptions.find((c) => c.value === color)?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-sm">
                      <div className={cn("h-3 w-3 rounded-full", opt.className)} />
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="phase-description" className="text-body-sm font-medium">
              Description
            </Label>
            <Textarea
              id="phase-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will be accomplished in this phase?"
              className="mt-xs resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || !startDate || !endDate || isSaving}
          >
            {isSaving ? "Saving..." : phase ? "Save Changes" : "Add Phase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
