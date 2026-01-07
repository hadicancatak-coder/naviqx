import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { TechStackPage } from "@/hooks/useTechStackPages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Server, Database, Cloud, Code, Shield, Zap, Globe, Box, Cpu, HardDrive } from "lucide-react";

const ICON_OPTIONS = [
  { value: "server", label: "Server", icon: Server },
  { value: "database", label: "Database", icon: Database },
  { value: "cloud", label: "Cloud", icon: Cloud },
  { value: "code", label: "Code", icon: Code },
  { value: "shield", label: "Security", icon: Shield },
  { value: "zap", label: "Performance", icon: Zap },
  { value: "globe", label: "Web", icon: Globe },
  { value: "box", label: "Package", icon: Box },
  { value: "cpu", label: "Processing", icon: Cpu },
  { value: "hard-drive", label: "Storage", icon: HardDrive },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "planned", label: "Planned" },
  { value: "under_review", label: "Under Review" },
  { value: "deprecated", label: "Deprecated" },
];

interface TechStackPageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: TechStackPage | null;
  parentId?: string | null;
  allPages: TechStackPage[];
  onSave: (data: { 
    title: string; 
    content: string; 
    parent_id: string | null; 
    icon: string;
    integrated_at: string | null;
    status: string | null;
    owner_id: string | null;
  }) => void;
  isLoading?: boolean;
}

export function TechStackPageEditor({
  open,
  onOpenChange,
  page,
  parentId,
  allPages,
  onSave,
  isLoading,
}: TechStackPageEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [icon, setIcon] = useState("server");
  const [integratedAt, setIntegratedAt] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Fetch profiles for owner dropdown
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-owner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      // Create mode
      if (!page?.id) {
        setTitle("");
        setContent("");
        setSelectedParentId(parentId || null);
        setIcon("server");
        setIntegratedAt("");
        setStatus("active");
        setOwnerId(null);
        return;
      }

      // Edit mode: always fetch authoritative data by id
      const { data, error } = await supabase
        .from("tech_stack_pages")
        .select("title, content, parent_id, icon, integrated_at, status, owner_id")
        .eq("id", page.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        toast.error("Failed to load content");
        setTitle(page.title || "");
        setContent(page.content || "");
        setSelectedParentId(page.parent_id || null);
        setIcon(page.icon || "server");
        setIntegratedAt(page.integrated_at || "");
        setStatus(page.status || "active");
        setOwnerId(page.owner_id || null);
        return;
      }

      setTitle(data.title || "");
      setContent(data.content || "");
      setSelectedParentId(data.parent_id || null);
      setIcon(data.icon || "server");
      setIntegratedAt(data.integrated_at || "");
      setStatus(data.status || "active");
      setOwnerId(data.owner_id || null);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, page?.id, parentId]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      content,
      parent_id: selectedParentId,
      icon,
      integrated_at: integratedAt || null,
      status: status || null,
      owner_id: ownerId,
    });
  };

  // Filter out current page and its descendants from parent options
  const getDescendantIds = (pageId: string): string[] => {
    const descendants: string[] = [pageId];
    const findChildren = (id: string) => {
      allPages.filter(p => p.parent_id === id).forEach(child => {
        descendants.push(child.id);
        findChildren(child.id);
      });
    };
    findChildren(pageId);
    return descendants;
  };

  const excludedIds = page ? getDescendantIds(page.id) : [];
  const parentOptions = allPages.filter(p => !excludedIds.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{page ? "Edit Tech Stack Item" : "Add Tech Stack Item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-md py-md">
          <div className="grid grid-cols-[1fr_120px] gap-md">
            <div className="space-y-xs">
              <Label>Name</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Supabase, React, Tailwind CSS..."
              />
            </div>

            <div className="space-y-xs">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-md">
            <div className="space-y-xs">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-xs">
              <Label>When Integrated</Label>
              <Input
                type="date"
                value={integratedAt}
                onChange={(e) => setIntegratedAt(e.target.value)}
              />
            </div>

            <div className="space-y-xs">
              <Label>Owner</Label>
              <Select value={ownerId || "none"} onValueChange={(v) => setOwnerId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No owner</SelectItem>
                  {profiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-xs">
            <Label>Category</Label>
            <Select
              value={selectedParentId || "none"}
              onValueChange={(v) => setSelectedParentId(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No category (root item)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category (root item)</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-xs">
            <Label>Details</Label>
            <p className="text-metadata text-muted-foreground">
              Include: What it is, Why we use it, Who uses it, Who is responsible, Issues, Future plans
            </p>
            <div className="border border-border rounded-lg overflow-hidden min-h-[300px]">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Describe the technology, its purpose, and relevant details..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isLoading}>
            {page ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}