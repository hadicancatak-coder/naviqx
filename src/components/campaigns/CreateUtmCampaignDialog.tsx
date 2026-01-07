import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useCreateUtmCampaign } from "@/hooks/useUtmCampaigns";
import { useCampaignMetadata } from "@/hooks/useCampaignMetadata";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";
import { toast } from "sonner";
import { Loader2, FileImage, X } from "lucide-react";

interface CreateUtmCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUtmCampaignDialog({ open, onOpenChange }: CreateUtmCampaignDialogProps) {
  const [name, setName] = useState("");
  const [landingPage, setLandingPage] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [assetLink, setAssetLink] = useState("");
  
  const createMutation = useCreateUtmCampaign();
  const { uploadImage, upsertMetadata } = useCampaignMetadata();
  const { createVersion } = useCampaignVersions();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    try {
      // 1. Create campaign
      const campaign = await createMutation.mutateAsync({
        name: name.trim(),
        landingPage: landingPage.trim() || undefined,
      });
      
      // 2. Upload image if provided
      let imageUrl: string | undefined;
      let imageFileSize: number | undefined;
      
      if (imageFile) {
        const uploadResult = await uploadImage.mutateAsync({
          file: imageFile,
          campaignId: campaign.id,
        });
        imageUrl = uploadResult.publicUrl;
        imageFileSize = uploadResult.fileSize;
      }

      // 3. Create initial version (v1) with all data
      await createVersion.mutateAsync({
        campaignId: campaign.id,
        name: name.trim(),
        landingPage: landingPage.trim() || undefined,
        description: description.trim() || undefined,
        imageUrl,
        imageFileSize,
        assetLink: assetLink.trim() || undefined,
        versionNotes: "Initial version",
      });

      // 4. Save metadata
      if (imageUrl || assetLink) {
        await upsertMetadata.mutateAsync({
          campaignId: campaign.id,
          imageUrl,
          imageFileSize,
          assetLink: assetLink.trim() || undefined,
        });
      }
      
      toast.success("Campaign created with version 1");
      setName("");
      setLandingPage("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      setAssetLink("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error("Failed to create campaign");
    }
  };

  const handleClose = () => {
    if (!createMutation.isPending && !uploadImage.isPending && !createVersion.isPending) {
      setName("");
      setLandingPage("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      setAssetLink("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Add a new campaign to your library
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter campaign name"
              className="mt-1"
              disabled={createMutation.isPending}
              maxLength={100}
              required
            />
          </div>

          <div>
            <Label htmlFor="landing-page">Landing Page URL</Label>
            <Input
              id="landing-page"
              value={landingPage}
              onChange={(e) => setLandingPage(e.target.value)}
              placeholder="https://example.com"
              className="mt-1"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Campaign description (optional)"
              className="mt-1"
              rows={3}
              disabled={createMutation.isPending}
              maxLength={500}
            />
          </div>

          <div>
            <Label htmlFor="creative">Creative / Image</Label>
            <div className="mt-1 space-y-xs">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    disabled={createMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-lg text-center hover:border-primary/50 transition-colors">
                  <FileImage className="h-8 w-8 mx-auto mb-xs text-muted-foreground" />
                  <Input
                    id="creative"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={createMutation.isPending}
                  />
                  <Label htmlFor="creative" className="cursor-pointer">
                    <span className="text-sm text-muted-foreground">
                      Click to upload image (max 2MB)
                    </span>
                  </Label>
                </div>
              )}
              <p className="text-metadata text-muted-foreground">
                Upload campaign creative or use asset link below for larger files
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="asset-link">Asset Link</Label>
            <Input
              id="asset-link"
              value={assetLink}
              onChange={(e) => setAssetLink(e.target.value)}
              placeholder="https://drive.google.com/... (for files >2MB)"
              className="mt-1"
              disabled={createMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              For large files, provide a link to Google Drive, Dropbox, etc.
            </p>
          </div>

          <div className="flex gap-xs justify-end pt-md">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending || uploadImage.isPending || createVersion.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || uploadImage.isPending || createVersion.isPending}
            >
              {(createMutation.isPending || uploadImage.isPending || createVersion.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Campaign"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
