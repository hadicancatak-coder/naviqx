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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg bg-card rounded-xl p-lg border border-border/50">
      {/* Left Column: Image + Meta */}
      <div className="space-y-md">
        {/* Large Image */}
        {imageUrl ? (
          <div 
            className="relative group cursor-pointer aspect-[4/3] w-full max-w-[500px]"
            onClick={() => setLightboxOpen(true)}
          >
            <img 
              src={imageUrl} 
              alt={`V${version.version_number}`}
              className="w-full h-full object-cover rounded-lg border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 
                            transition-opacity flex items-center justify-center rounded-lg">
              <ZoomIn className="size-10 text-foreground" />
            </div>
          </div>
        ) : (
          <div className="aspect-[4/3] w-full max-w-[500px] rounded-lg bg-muted flex items-center 
                          justify-center border border-border">
            <ImageIcon className="size-16 text-muted-foreground" />
          </div>
        )}

        {/* Meta Info */}
        <div className="space-y-sm">
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
                <FileText className="size-3.5" />
                <span className="text-body-sm font-medium">Description</span>
              </div>
              <p className="text-body">{version.description}</p>
            </div>
          )}
          
          {/* Notes */}
          {version.version_notes && (
            <div className="space-y-xs">
              <div className="flex items-center gap-xs text-muted-foreground">
                <StickyNote className="size-3.5" />
                <span className="text-body-sm font-medium">Notes</span>
              </div>
              <div className="bg-muted/50 rounded-md p-sm border border-border/50">
                <p className="text-body">{version.version_notes}</p>
              </div>
            </div>
          )}
          
          {/* Links */}
          <div className="flex items-center gap-md flex-wrap">
            {version.asset_link && (
              <a 
                href={version.asset_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-body-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Link2 className="size-3.5" />
                View Asset
                <ExternalLink className="size-3" />
              </a>
            )}

            {version.landing_page && (
              <a 
                href={version.landing_page.startsWith("http") ? version.landing_page : `https://${version.landing_page}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-body-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="size-3.5" />
                Landing Page
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Comments (full height) */}
      <div className="border-t lg:border-t-0 lg:border-l border-border/50 pt-md lg:pt-0 lg:pl-lg">
        <VersionComments versionId={version.id} campaignId={campaignId} />
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
