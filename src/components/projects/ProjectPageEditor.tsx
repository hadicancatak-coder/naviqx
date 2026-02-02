import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Project, useProjects, useProjectAssignees } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectPageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  parentId?: string | null;
  onSave: (data: Partial<Project>) => void;
}

const iconOptions = [
  { value: "folder-kanban", label: "Folder Kanban" },
  { value: "rocket", label: "Rocket" },
  { value: "target", label: "Target" },
  { value: "zap", label: "Zap" },
  { value: "lightbulb", label: "Lightbulb" },
  { value: "chart-bar", label: "Chart" },
  { value: "users", label: "Users" },
  { value: "code", label: "Code" },
  { value: "globe", label: "Globe" },
  { value: "layers", label: "Layers" },
];

const statusOptions = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

interface User {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
}

export function ProjectPageEditor({
  open,
  onOpenChange,
  project,
  parentId,
  onSave,
}: ProjectPageEditorProps) {
  const { projects } = useProjects();
  const { assignees, updateAssignees } = useProjectAssignees(project?.id || null);

  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("folder-kanban");
  const [status, setStatus] = useState<string>("planning");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
      if (project) {
        setName(project.name);
        setPurpose(project.purpose || "");
        setOutcomes(project.outcomes || "");
        setDescription(project.description || "");
        setIcon(project.icon || "folder-kanban");
        setStatus(project.status || "planning");
        setSelectedParentId(project.parent_id);
        setDueDate(project.due_date ? new Date(project.due_date) : undefined);
        // Load assignees
        if (assignees) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSelectedUserIds(assignees.map((a: { user_id: string }) => a.user_id));
        }
      } else {
        setName("");
        setPurpose("");
        setOutcomes("");
        setDescription("");
        setIcon("folder-kanban");
        setStatus("planning");
        setSelectedParentId(parentId || null);
        setDueDate(undefined);
        setSelectedUserIds([]);
      }
    }
  }, [open, project, parentId, assignees]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .order("name");
    if (!error && data) {
      setUsers(data);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        id: project?.id,
        name: name.trim(),
        purpose: purpose.trim() || null,
        outcomes: outcomes.trim() || null,
        description: description.trim() || null,
        icon,
        status: status as Project["status"],
        parent_id: selectedParentId,
        due_date: dueDate?.toISOString() || null,
      });

      // Update assignees if editing existing project
      if (project?.id) {
        await updateAssignees.mutateAsync(selectedUserIds);
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Filter out current project and its descendants from parent options
  const availableParents = projects?.filter((p) => {
    if (!project) return true;
    if (p.id === project.id) return false;
    // Check if p is a descendant of current project
    let current = p;
    while (current.parent_id) {
      if (current.parent_id === project.id) return false;
      current = projects.find((pp) => pp.id === current.parent_id) || current;
      if (current.parent_id === current.id) break; // Safety check
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Create Project"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-md py-md">
          {/* Name */}
          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q1 Campaign Launch"
            />
          </div>

          {/* Purpose & Outcomes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Why does this project exist?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Outcomes</Label>
              <Textarea
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
                placeholder="What will be delivered?"
                rows={3}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about the project..."
              rows={4}
            />
          </div>

          {/* Icon, Status, Parent */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Parent Project</Label>
              <Select
                value={selectedParentId || "none"}
                onValueChange={(v) => setSelectedParentId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {availableParents?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Stakeholders */}
          <div className="space-y-2">
            <Label>Stakeholders</Label>
            <ScrollArea className="h-48 border border-border rounded-lg p-2">
              <div className="space-y-1">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover cursor-pointer"
                    onClick={() => toggleUser(user.id)}
                  >
                    <Checkbox checked={selectedUserIds.includes(user.id)} />
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0) || user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-body-sm">{user.name || user.email}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {selectedUserIds.length > 0 && (
              <p className="text-metadata text-muted-foreground">
                {selectedUserIds.length} stakeholder{selectedUserIds.length > 1 ? "s" : ""} selected
              </p>
            )}
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
