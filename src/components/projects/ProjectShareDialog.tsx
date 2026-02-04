import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Globe, Link2, MousePointerClick, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getProductionUrl } from "@/lib/utils";
import { Project } from "@/hooks/useProjects";

interface ProjectShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function ProjectShareDialog({ open, onOpenChange, project }: ProjectShareDialogProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Fetch existing unified access link
  const { data: accessLink, isLoading } = useQuery({
    queryKey: ['project-access-link', project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_access_links')
        .select('*')
        .eq('resource_type', 'project')
        .eq('resource_id', project.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Generate or toggle access link
  const toggleAccess = useMutation({
    mutationFn: async (enable: boolean) => {
      if (enable) {
        // Generate new unified token
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('public_access_links') as any)
          .insert({
            access_token: token,
            resource_type: 'project',
            resource_id: project.id,
            entity: project.name,
            is_public: true,
            is_active: true,
            metadata: { project_status: project.status },
          })
          .select()
          .single();

        if (error) throw error;

        // Also update legacy columns for backward compatibility
        await supabase
          .from('projects')
          .update({ 
            is_public: true, 
            public_token: token,
          })
          .eq('id', project.id);

        return data;
      } else {
        // Deactivate unified link
        if (accessLink?.id) {
          await supabase
            .from('public_access_links')
            .update({ is_active: false })
            .eq('id', accessLink.id);
        }

        // Also update legacy columns
        await supabase
          .from('projects')
          .update({ is_public: false })
          .eq('id', project.id);

        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-access-link', project.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['public-access-links'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update sharing settings';
      toast.error(message);
    },
  });

  const isEnabled = !!accessLink;
  const shareUrl = accessLink?.access_token 
    ? `${getProductionUrl()}/projects/review/${accessLink.access_token}`
    : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenPreview = () => {
    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  };

  // Reset copied state when dialog closes
  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            Share "{project.name}" with external stakeholders via a public link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-md">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-md bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-body font-medium">Public Access</Label>
              <p className="text-metadata text-muted-foreground">
                Anyone with the link can view the project roadmap
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => toggleAccess.mutate(checked)}
              disabled={toggleAccess.isPending || isLoading}
            />
          </div>

          {/* Share Link */}
          {isEnabled && accessLink && (
            <div className="space-y-sm">
              <div className="flex items-center justify-between">
                <Label className="text-body-sm font-medium flex items-center gap-xs">
                  <Link2 className="h-4 w-4" />
                  Share Link
                </Label>
                {accessLink.click_count > 0 && (
                  <Badge variant="secondary" className="gap-xs">
                    <MousePointerClick className="h-3 w-3" />
                    {accessLink.click_count} views
                  </Badge>
                )}
              </div>
              <div className="flex gap-xs">
                <Input
                  readOnly
                  value={shareUrl}
                  className="text-body-sm font-mono bg-muted/30"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!shareUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenPreview}
                  disabled={!shareUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Info Note */}
          <p className="text-metadata text-muted-foreground text-center">
            External viewers see the project roadmap, phases, and progress. No authentication required.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
