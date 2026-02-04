import { useState } from "react";
import { format, addDays } from "date-fns";
import { CalendarIcon, ArrowRight, ArrowLeft, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Project } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

interface ProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Project>) => Promise<void>;
}

const iconOptions = [
  "folder-kanban", "rocket", "target", "zap", "star", "lightbulb", 
  "trophy", "flag", "compass", "map", "milestone", "workflow"
];

export function ProjectCreateDialog({ open, onOpenChange, onSave }: ProjectCreateDialogProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [icon, setIcon] = useState("folder-kanban");
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        purpose: purpose.trim() || null,
        icon,
        status: "planning",
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      });
      
      // Reset form
      setStep(1);
      setName("");
      setPurpose("");
      setIcon("folder-kanban");
      setDueDate(addDays(new Date(), 30));
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const renderIcon = (iconName: string) => {
    const key = iconName.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
    const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[key] || LucideIcons.FolderKanban;
    return <IconComp className="h-5 w-5" />;
  };

  const canProceed = step === 1 ? name.trim().length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-heading-md">
            Create New Project
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-sm mb-md">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        <div className="py-md min-h-[250px]">
          {/* Step 1: Name and Icon */}
          {step === 1 && (
            <div className="space-y-lg">
              <div>
                <Label htmlFor="project-name" className="text-body-sm font-medium">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter project name"
                  className="mt-xs"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-body-sm font-medium">Icon</Label>
                <div className="grid grid-cols-6 gap-sm mt-xs">
                  {iconOptions.map((iconOpt) => (
                    <Button
                      key={iconOpt}
                      variant={icon === iconOpt ? "secondary" : "ghost"}
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => setIcon(iconOpt)}
                    >
                      {renderIcon(iconOpt)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Purpose and Deadline */}
          {step === 2 && (
            <div className="space-y-lg">
              <div>
                <Label htmlFor="project-purpose" className="text-body-sm font-medium">
                  Purpose
                </Label>
                <Textarea
                  id="project-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="What is the main goal of this project?"
                  className="mt-xs resize-none"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-body-sm font-medium">Target Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-xs justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
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
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-sm">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {step < 2 ? (
              <Button onClick={handleNext} disabled={!canProceed}>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
                {isSaving ? "Creating..." : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Create Project
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
