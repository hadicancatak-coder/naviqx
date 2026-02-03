import { useState } from "react";
import { ImageIcon, Link2, ExternalLink, ZoomIn, FileText, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CampaignVersion } from "@/hooks/useCampaignVersions";
import { VersionComments } from "./VersionComments";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { format } from "date-fns";

interface VersionDetailPanelProps {
  version: CampaignVersion;
  campaignId: string;
}

export function VersionDetailPanel({ version, campaignId }: VersionDetailPanelProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const imageUrl = version.image_url || version.asset_link;

  return (
    <div className="flex gap-lg bg-card rounded-lg p-md border border-border/50">
      {/* Image Section */}
      <div className="shrink-0">
        {imageUrl ? (
          <div 
            className="relative group cursor-pointer"
            onClick={() => setLightboxOpen(true)}
          >
            <img 
              src={imageUrl} 
              alt={`V${version.version_number}`}
              className="w-[250px] h-[180px] object-cover rounded-lg border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 
                            transition-opacity flex items-center justify-center rounded-lg">
              <ZoomIn className="size-8 text-foreground" />
            </div>
          </div>
        ) : (
          <div className="w-[250px] h-[180px] rounded-lg bg-muted flex items-center 
                          justify-center border border-border">
            <ImageIcon className="size-12 text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Content Section */}
      <div className="flex-1 space-y-md min-w-0">
        {/* Header */}
        <div className="flex items-center gap-sm flex-wrap">
          <Badge variant="outline" className="text-metadata">
            Version {version.version_number}
          </Badge>
          <span className="text-metadata text-muted-foreground">
            Created {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
          </span>
          {version.creator_name && (
            <span className="text-metadata text-muted-foreground">
              by {version.creator_name}
            </span>
          )}
        </div>

        {/* Description */}
        {version.description && (
          <div className="space-y-xs">
            <div className="flex items-center gap-xs text-muted-foreground">
              <FileText className="size-3" />
              <span className="text-metadata font-medium">Description</span>
            </div>
            <p className="text-body-sm">{version.description}</p>
          </div>
        )}
        
        {/* Notes */}
        {version.version_notes && (
          <div className="space-y-xs">
            <div className="flex items-center gap-xs text-muted-foreground">
              <StickyNote className="size-3" />
              <span className="text-metadata font-medium">Notes</span>
            </div>
            <div className="bg-muted/50 rounded-md p-sm border border-border/50">
              <p className="text-body-sm">{version.version_notes}</p>
            </div>
          </div>
        )}
        
        {/* Asset Link */}
        {version.asset_link && (
          <a 
            href={version.asset_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline text-body-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Link2 className="size-3" />
            View Asset
            <ExternalLink className="size-3" />
          </a>
        )}

        {/* Landing Page */}
        {version.landing_page && (
          <a 
            href={version.landing_page.startsWith("http") ? version.landing_page : `https://${version.landing_page}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline text-body-sm ml-md"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-3" />
            Landing Page
          </a>
        )}
        
        {/* Comments */}
        <div className="pt-sm border-t border-border/50">
          <VersionComments versionId={version.id} campaignId={campaignId} />
        </div>
      </div>
      
      {/* Lightbox */}
      {imageUrl && (
        <ImageLightbox
          images={[{ url: imageUrl }]}
          initialIndex={0}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
