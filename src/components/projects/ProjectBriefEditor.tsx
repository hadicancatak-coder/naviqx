import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor, useRichTextEditor } from "@/components/editor";
import { Project } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";

interface ProjectBriefEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSave: (data: Partial<Project>) => Promise<void>;
}

const iconOptions = [
  "folder-kanban", "rocket", "target", "zap", "star", "lightbulb", 
  "trophy", "flag", "compass", "map", "milestone", "workflow"
];

const statusOptions = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

export function ProjectBriefEditor({ open, onOpenChange, project, onSave }: ProjectBriefEditorProps) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [newOutcome, setNewOutcome] = useState("");
  const [icon, setIcon] = useState("folder-kanban");
  const [status, setStatus] = useState<string>("planning");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const editor = useRichTextEditor({
    initialContent: description,
    placeholder: "Describe the project scope, goals, and context...",
    onChange: (html) => setDescription(html),
  });

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name);
      setPurpose(project.purpose || "");
      setDescription(project.description || "");
      setIcon(project.icon || "folder-kanban");
      setStatus(project.status);
      setDueDate(project.due_date ? new Date(project.due_date) : undefined);
      
      // Parse outcomes
      if (project.outcomes) {
        try {
          const parsed = JSON.parse(project.outcomes);
          setOutcomes(Array.isArray(parsed) ? parsed : []);
        } catch {
          setOutcomes(project.outcomes.split('\n').filter(Boolean));
        }
      } else {
        setOutcomes([]);
      }
      
      // Update editor content
      if (editor && project.description) {
        editor.commands.setContent(project.description);
      }
    } else {
      setName("");
      setPurpose("");
      setDescription("");
      setOutcomes([]);
      setIcon("folder-kanban");
      setStatus("planning");
      setDueDate(undefined);
      if (editor) {
        editor.commands.setContent("");
      }
    }
  }, [project, editor]);

  const handleAddOutcome = () => {
    if (newOutcome.trim()) {
      setOutcomes([...outcomes, newOutcome.trim()]);
      setNewOutcome("");
    }
  };

  const handleRemoveOutcome = (index: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        id: project?.id,
        name: name.trim(),
        purpose: purpose.trim() || null,
        description: description.trim() || null,
        outcomes: outcomes.length > 0 ? JSON.stringify(outcomes) : null,
        icon,
        status: status as Project['status'],
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading-md">
            {project ? "Edit Project" : "Create Project"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-lg py-md">
          {/* Name and Icon */}
          <div className="flex gap-md">
            <div className="flex-1">
              <Label htmlFor="name" className="text-body-sm font-medium">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
                className="mt-xs"
              />
            </div>
            
            <div>
              <Label className="text-body-sm font-medium">Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="w-[100px] mt-xs">
                  <SelectValue>
                    {renderIcon(icon)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="grid grid-cols-4 gap-1 p-1">
                    {iconOptions.map((iconOpt) => (
                      <Button
                        key={iconOpt}
                        variant={icon === iconOpt ? "secondary" : "ghost"}
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => setIcon(iconOpt)}
                      >
                        {renderIcon(iconOpt)}
                      </Button>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status and Due Date */}
          <div className="flex gap-md">
            <div className="flex-1">
              <Label className="text-body-sm font-medium">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label className="text-body-sm font-medium">Due Date</Label>
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

          {/* Purpose */}
          <div>
            <Label htmlFor="purpose" className="text-body-sm font-medium">
              Purpose
            </Label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="What is the main goal of this project?"
              className="mt-xs resize-none"
              rows={2}
            />
          </div>

          {/* Description (Rich Text) */}
          <div>
            <Label className="text-body-sm font-medium">Description</Label>
            <div className="mt-xs border border-input rounded-md overflow-hidden min-h-[150px]">
              <RichTextEditor editor={editor} minHeight="150px" />
            </div>
          </div>

          {/* Expected Outcomes */}
          <div>
            <Label className="text-body-sm font-medium">Expected Outcomes</Label>
            <div className="mt-xs space-y-sm">
              {outcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-center gap-sm bg-muted/50 rounded-md px-sm py-xs">
                  <span className="text-success-text">•</span>
                  <span className="flex-1 text-body-sm">{outcome}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOutcome(idx)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              
              <div className="flex gap-sm">
                <Input
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  placeholder="Add an expected outcome"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOutcome())}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddOutcome}
                  disabled={!newOutcome.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? "Saving..." : project ? "Save Changes" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
