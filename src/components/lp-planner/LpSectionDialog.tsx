import { useState, useEffect } from "react";
import { Plus, Trash2, Link2, Upload, GripVertical, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LpSection,
  SectionImage,
  WebsiteLink,
  useCreateLpSection,
  useUpdateLpSection,
  useUploadSectionImage,
  useDeleteSectionImage,
} from "@/hooks/useLpSections";
import { useEntities } from "@/hooks/useEntities";

import { LP_SECTION_TYPES } from "@/domain/lp-sections";

interface LpSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section?: LpSection | null;
}

export const LpSectionDialog = ({
  open,
  onOpenChange,
  section,
}: LpSectionDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [briefContent, setBriefContent] = useState("");
  const [sectionType, setSectionType] = useState("custom");
  const [entityId, setEntityId] = useState<string | undefined>();
  const [images, setImages] = useState<SectionImage[]>([]);
  const [links, setLinks] = useState<WebsiteLink[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: entities = [] } = useEntities();
  const createSection = useCreateLpSection();
  const updateSection = useUpdateLpSection();
  const uploadImage = useUploadSectionImage();
  const deleteImage = useDeleteSectionImage();

  const isEditing = !!section;

  useEffect(() => {
    if (section) {
      setName(section.name);
      setDescription(section.description || "");
      setBriefContent(section.brief_content || "");
      setSectionType(section.section_type);
      setEntityId(section.entity_id || undefined);
      setImages(section.sample_images || []);
      setLinks(section.website_links || []);
    } else {
      resetForm();
    }
  }, [section, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setBriefContent("");
    setSectionType("custom");
    setEntityId(undefined);
    setImages([]);
    setLinks([]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      brief_content: briefContent.trim() || undefined,
      section_type: sectionType,
      entity_id: entityId,
      sample_images: images,
      website_links: links,
    };

    if (isEditing && section) {
      await updateSection.mutateAsync({ id: section.id, ...data });
    } else {
      await createSection.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const tempId = section?.id || "temp";
      
      for (const file of Array.from(files)) {
        const url = await uploadImage.mutateAsync({ sectionId: tempId, file });
        setImages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            url,
            caption: "",
            order: prev.length,
          },
        ]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    const image = images.find((i) => i.id === imageId);
    if (image) {
      await deleteImage.mutateAsync(image.url);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    }
  };

  const handleImageCaptionChange = (imageId: string, caption: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, caption } : img))
    );
  };

  const addLink = () => {
    setLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), url: "", label: "" },
    ]);
  };

  const removeLink = (linkId: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  const updateLink = (linkId: string, field: "url" | "label", value: string) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === linkId ? { ...l, [field]: value } : l))
    );
  };

  const isPending = createSection.isPending || updateSection.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Section" : "Create Section"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Section name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={sectionType} onValueChange={setSectionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LP_SECTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity">Entity</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of this section..."
                rows={2}
              />
            </div>

            <Separator />

            {/* Brief Content */}
            <div className="space-y-2">
              <Label htmlFor="brief">Brief / Instructions</Label>
              <Textarea
                id="brief"
                value={briefContent}
                onChange={(e) => setBriefContent(e.target.value)}
                placeholder="Detailed brief or instructions for this section..."
                rows={4}
              />
            </div>

            <Separator />

            {/* Sample Images */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sample Images</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7"
                  disabled={isUploading}
                  onClick={() => document.getElementById("image-upload")?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="relative group rounded-lg overflow-hidden border"
                    >
                      <img
                        src={image.url}
                        alt={image.caption || "Section image"}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <Input
                        value={image.caption || ""}
                        onChange={(e) =>
                          handleImageCaptionChange(image.id, e.target.value)
                        }
                        placeholder="Caption..."
                        className="rounded-none border-0 border-t h-7 text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Website Links */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Website Links</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={addLink}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Link
                </Button>
              </div>

              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link) => (
                    <div key={link.id} className="flex items-center gap-2">
                      <Input
                        value={link.label}
                        onChange={(e) =>
                          updateLink(link.id, "label", e.target.value)
                        }
                        placeholder="Label"
                        className="w-32"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) =>
                          updateLink(link.id, "url", e.target.value)
                        }
                        placeholder="https://..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isPending}>
            {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
