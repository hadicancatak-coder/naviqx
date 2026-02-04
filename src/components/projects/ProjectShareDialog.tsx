import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePublicAccessManagement } from "@/hooks/usePublicAccess";
import { Project } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";

interface ProjectShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

const PUBLIC_URL = "https://naviqx.lovable.app";

export function ProjectShareDialog({ open, onOpenChange, project }: ProjectShareDialogProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(project.is_public);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const { generateLink, deleteLink } = usePublicAccessManagement();

  // Sync with project state when it changes
  useEffect(() => {
    setIsPublic(project.is_public);
    setShareToken(null);
  }, [project.is_public, project.public_token]);

  // Generate share URL
  const shareUrl = shareToken 
    ? `${PUBLIC_URL}/r/${shareToken}`
    : project.public_token 
      ? `${PUBLIC_URL}/r/${project.public_token}`
      : null;

  const handleTogglePublic = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      if (checked) {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({ title: "You must be logged in to share", variant: "destructive" });
          setIsUpdating(false);
          return;
        }

        // Create access link using unified system
        const result = await generateLink.mutateAsync({
          resourceType: "project",
          resourceId: project.id,
          entity: "CFI Group",
          isPublic: true,
        });
        
        setShareToken(result.access_token);
        setIsPublic(true);
        
        // Update project to mark as public
        await supabase.from("projects").update({ 
          is_public: true, 
          public_token: result.access_token 
        }).eq("id", project.id);
        
        toast({ title: "Project is now public" });
      } else {
        // Find and delete the access link
        const tokenToDelete = shareToken || project.public_token;
        if (tokenToDelete) {
          const { data: link } = await supabase
            .from("public_access_links")
            .select("id")
            .eq("access_token", tokenToDelete)
            .single();
          
          if (link) {
            await deleteLink.mutateAsync(link.id);
          }
        }
        
        // Update project to mark as private
        await supabase.from("projects").update({ 
          is_public: false, 
          public_token: null 
        }).eq("id", project.id);
        
        setShareToken(null);
        setIsPublic(false);
        toast({ title: "Project is now private" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Failed to update sharing settings", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-heading-md flex items-center gap-sm">
            {isPublic ? <Globe className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
            Share Project
          </DialogTitle>
          <DialogDescription>
            Share your project roadmap with stakeholders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-lg py-md">
          {/* Public toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-xs">
              <Label htmlFor="public-toggle" className="text-body font-medium">
                Public Access
              </Label>
              <p className="text-metadata text-muted-foreground">
                Anyone with the link can view this project
              </p>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isUpdating}
            />
          </div>

          {/* Share link */}
          {isPublic && shareUrl && (
            <div className="space-y-sm">
              <Label className="text-body-sm font-medium">Share Link</Label>
              <div className="flex gap-sm">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-body-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success-text" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(shareUrl, "_blank")}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Info message */}
          {!isPublic && (
            <div className="bg-muted/50 rounded-lg p-md">
              <p className="text-body-sm text-muted-foreground">
                Enable public access to generate a shareable link. Viewers will see the project brief and roadmap timeline.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
