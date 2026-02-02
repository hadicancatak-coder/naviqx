import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { toast } from "sonner";
import { parseContentForEditing, serializeContent } from "@/lib/captionHelpers";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Trash2, X } from "lucide-react";
import { logger } from "@/lib/logger";

const CAPTION_TYPES = [
  { value: "headline", label: "Headline", maxLength: 30 },
  { value: "description", label: "Description", maxLength: 90 },
  { value: "primary_text", label: "Primary Text", maxLength: 125 },
  { value: "sitelink", label: "Sitelink", maxLength: 25 },
  { value: "callout", label: "Callout", maxLength: 25 },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface CaptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caption?: {
    id: string;
    element_type: string;
    entity: string[] | null;
    google_status: string | null;
    content: unknown;
  } | null;
  onSuccess?: () => void;
}

export function CaptionDialog({
  open,
  onOpenChange,
  caption,
  onSuccess,
}: CaptionDialogProps) {
  const { user } = useAuth();
  const { data: systemEntities = [] } = useSystemEntities();
  const isEditing = !!caption;

  // Single source of truth: all state initialized to defaults
  const [type, setType] = useState<string>("headline");
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("pending");
  const [activeLanguage, setActiveLanguage] = useState<"en" | "ar">("en");
  const [content, setContent] = useState<{ en: string; ar: string }>({ en: "", ar: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false); // Ensures content is ready before editor renders
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isDirtyRef = useRef(false);
  const contentRef = useRef<{ en: string; ar: string }>({ en: "", ar: "" });

  // Single effect: reset state and fetch from database when dialog opens
  useEffect(() => {
    if (!open) {
      // Reset editor ready state when dialog closes
      setEditorReady(false);
      return;
    }

    // Reset all state to defaults (prevents blank/stale editors)
    isDirtyRef.current = false;
    setActiveLanguage("en");
    setIsLoading(true);
    setEditorReady(false);

    // Always reset form fields as well (edit mode will hydrate from DB)
    setType("headline");
    setSelectedEntities([]);
    setStatus("pending");
    const emptyContent = { en: "", ar: "" };
    setContent(emptyContent);
    contentRef.current = emptyContent;

    const captionId = caption?.id;

    if (!captionId) {
      // Creating new caption - use defaults
      setIsLoading(false);
      // Delay editor render to ensure state is committed
      setTimeout(() => setEditorReady(true), 50);
      return;
    }

    // Fetch the authoritative data from database
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("ad_elements")
        .select("id, element_type, entity, google_status, content")
        .eq("id", captionId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        logger.error("Failed to fetch caption:", error);
        toast.error("Failed to load caption content");
        setIsLoading(false);
        setTimeout(() => setEditorReady(true), 50);
        return;
      }

      // Only update if user hasn't started editing
      if (!isDirtyRef.current) {
        setType(data.element_type || "headline");
        setSelectedEntities((data.entity as string[]) || []);
        setStatus(data.google_status || "pending");
        const parsed = parseContentForEditing(data.content);
        setContent(parsed);
        contentRef.current = parsed;
      }

      setIsLoading(false);
      // Critical: delay editor render until AFTER state is fully committed
      setTimeout(() => setEditorReady(true), 50);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, caption?.id]);

  const toggleEntity = (entity: string) => {
    setSelectedEntities((prev) =>
      prev.includes(entity)
        ? prev.filter((e) => e !== entity)
        : [...prev, entity]
    );
  };

  const currentType = CAPTION_TYPES.find((t) => t.value === type);
  const maxLength = currentType?.maxLength || 90;

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    if (!content.en.trim() && !content.ar.trim()) {
      toast.error("Please enter content in at least one language");
      return;
    }

    if (selectedEntities.length === 0) {
      toast.error("Please select at least one entity");
      return;
    }

    setIsSubmitting(true);

    try {
      // Serialize content as proper JSON object for both languages
      const serializedContent = serializeContent(content);
      
      const data = {
        element_type: type,
        content: serializedContent, // Store as JSONB object with en/ar keys
        entity: selectedEntities,
        google_status: status,
        language: content.ar.trim() ? "MULTI" : "EN", // Mark as multi if AR exists
        updated_at: new Date().toISOString(),
      };

      if (isEditing && caption) {
        const { error } = await supabase
          .from("ad_elements")
          .update(data)
          .eq("id", caption.id);

        if (error) throw error;
        toast.success("Caption updated");
      } else {
        const { error } = await supabase.from("ad_elements").insert({
          ...data,
          created_by: user.id,
          use_count: 0,
          is_favorite: false,
        });

        if (error) throw error;
        toast.success("Caption created");
      }

      onSuccess();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save caption");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!caption) return;

    const { error } = await supabase
      .from("ad_elements")
      .delete()
      .eq("id", caption.id);

    if (error) {
      toast.error("Failed to delete caption");
      return;
    }

    toast.success("Caption deleted");
    setDeleteConfirmOpen(false);
    onSuccess();
  };

  const handleDuplicate = async () => {
    if (!caption || !user) return;

    // Serialize content with both languages for duplicate
    const serializedContent = serializeContent(content);

    const { error } = await supabase.from("ad_elements").insert({
      element_type: type,
      content: serializedContent,
      entity: selectedEntities,
      google_status: "pending",
      language: content.ar.trim() ? "MULTI" : "EN",
      created_by: user.id,
      use_count: 0,
      is_favorite: false,
    });

    if (error) {
      toast.error("Failed to duplicate caption");
      return;
    }

    toast.success("Caption duplicated");
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Caption" : "Create Caption"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify caption content, entities, and status" : "Add a new caption to the library"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-lg py-md">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
        <div className="space-y-lg py-md">
          {/* Type */}
          <div className="space-y-sm">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label} (max {t.maxLength} chars)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entities */}
          <div className="space-y-sm">
            <Label>Entities</Label>
            <div className="flex flex-wrap gap-sm">
              {systemEntities.map((entity) => (
                <Badge
                  key={entity.id}
                  variant={selectedEntities.includes(entity.name) ? "default" : "outline"}
                  className="cursor-pointer transition-smooth hover:bg-primary/80"
                  onClick={() => toggleEntity(entity.name)}
                >
                  {entity.emoji} {entity.name}
                  {selectedEntities.includes(entity.name) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Content with Language Tabs */}
          <div className="space-y-sm">
            <Label>Content</Label>
            <Tabs value={activeLanguage} onValueChange={(val) => setActiveLanguage(val as "en" | "ar")}>
              <TabsList>
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ar">Arabic</TabsTrigger>
              </TabsList>
              <TabsContent value="en" className="mt-sm">
                <div className="space-y-sm">
                  {editorReady ? (
                    <RichTextEditor
                      key={`en-${caption?.id || "new"}`}
                      value={content.en}
                      onChange={(value) => {
                        isDirtyRef.current = true;
                        setContent((prev) => ({ ...prev, en: value }));
                      }}
                      placeholder="Enter English content..."
                      minHeight="100px"
                    />
                  ) : (
                    <Skeleton className="h-24 w-full" />
                  )}
                  <div className="flex justify-between text-metadata text-muted-foreground">
                    <span>Characters: {content.en.replace(/<[^>]*>/g, '').length}</span>
                    <span className={content.en.replace(/<[^>]*>/g, '').length > maxLength ? "text-destructive" : ""}>
                      Max: {maxLength}
                    </span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="ar" className="mt-sm">
                <div className="space-y-sm">
                  {editorReady ? (
                    <RichTextEditor
                      key={`ar-${caption?.id || "new"}`}
                      value={content.ar}
                      onChange={(value) => {
                        isDirtyRef.current = true;
                        setContent((prev) => ({ ...prev, ar: value }));
                      }}
                      placeholder="أدخل المحتوى بالعربية..."
                      minHeight="100px"
                    />
                  ) : (
                    <Skeleton className="h-24 w-full" />
                  )}
                  <div className="flex justify-between text-metadata text-muted-foreground">
                    <span>Characters: {content.ar.replace(/<[^>]*>/g, '').length}</span>
                    <span className={content.ar.replace(/<[^>]*>/g, '').length > maxLength ? "text-destructive" : ""}>
                      Max: {maxLength}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Status */}
          <div className="space-y-sm">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-sm">
            {isEditing && (
              <>
                <Button variant="outline" onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-sm">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Caption</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this caption? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
