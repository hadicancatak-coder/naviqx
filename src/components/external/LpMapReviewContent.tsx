import { useState } from "react";
import { ExternalLink, Image, FileText, MessageSquare, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { cn } from "@/lib/utils";
import { sectionTypeCardColors } from "@/domain/lp-sections";
import { PublicAccessLink, PublicAccessComment } from "@/hooks/usePublicAccess";
import { ExternalCommentFeed } from "./ExternalCommentFeed";
import { ExternalCommentForm } from "./ExternalCommentForm";

interface LpMapSection {
  id: string;
  position: number;
  section: {
    id: string;
    name: string;
    section_type: string;
    description?: string;
    brief_content?: string;
    sample_images: Array<{ id: string; url: string; caption?: string }>;
    website_links: Array<{ id: string; url: string; label?: string }>;
  } | null;
}

interface LpMapData {
  id: string;
  name: string;
  description?: string;
  status: string;
  entity?: { id: string; name: string };
  sections: LpMapSection[];
}

interface SectionCardProps {
  mapSection: LpMapSection;
  comments: PublicAccessComment[];
  canComment: boolean;
  reviewerName: string;
  onSubmit: (params: {
    commentText: string;
    commentType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  isSubmitting: boolean;
}

const SectionCard = ({
  mapSection,
  comments,
  canComment,
  reviewerName,
  onSubmit,
  isSubmitting,
}: SectionCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const section = mapSection.section;
  if (!section) return null;

  const sectionComments = comments.filter((c) => c.resource_id === section.id);
  const typeColor = sectionTypeCardColors[section.section_type] || sectionTypeCardColors.other;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-card-hover transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground text-body-sm font-medium">
                  {mapSection.position + 1}
                </div>
                <div>
                  <CardTitle className="text-body">{section.name}</CardTitle>
                  <div className="flex items-center gap-xs mt-xxs">
                    <Badge variant="outline" className={cn("text-metadata", typeColor)}>
                      {section.section_type}
                    </Badge>
                    {section.sample_images.length > 0 && (
                      <span className="text-metadata text-muted-foreground flex items-center gap-xxs">
                        <Image className="h-3 w-3" />
                        {section.sample_images.length}
                      </span>
                    )}
                    {sectionComments.length > 0 && (
                      <span className="text-metadata text-muted-foreground flex items-center gap-xxs">
                        <MessageSquare className="h-3 w-3" />
                        {sectionComments.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {/* eslint-disable-next-line no-restricted-syntax -- reset padding for collapsible content */}
          <CardContent className="!pt-0 space-y-lg">
            {section.description && (
              <p className="text-body-sm text-muted-foreground">{section.description}</p>
            )}

            {/* Images */}
            {section.sample_images.length > 0 && (
              <div>
                <h4 className="text-metadata font-medium text-muted-foreground uppercase tracking-wider mb-sm">
                  Sample Images (click to enlarge)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
                  {section.sample_images.map((image, index) => (
                    <div 
                      key={image.id} 
                      className="rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => {
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.caption || "Section image"}
                        className="w-full h-32 object-cover"
                      />
                      {image.caption && (
                        <p className="text-metadata text-muted-foreground p-xs bg-muted/50">
                          {image.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <ImageLightbox
                  images={section.sample_images.map((img) => ({
                    url: img.url,
                    caption: img.caption || undefined,
                  }))}
                  initialIndex={lightboxIndex}
                  open={lightboxOpen}
                  onClose={() => setLightboxOpen(false)}
                />
              </div>
            )}

            {/* Brief */}
            {section.brief_content && (
              <div>
                <h4 className="text-metadata font-medium text-muted-foreground uppercase tracking-wider mb-xs">
                  Brief / Instructions
                </h4>
                <div className="text-body-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-md">
                  {section.brief_content}
                </div>
              </div>
            )}

            {/* Links */}
            {section.website_links.length > 0 && (
              <div>
                <h4 className="text-metadata font-medium text-muted-foreground uppercase tracking-wider mb-xs">
                  Reference Links
                </h4>
                <div className="flex flex-wrap gap-xs">
                  {section.website_links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-xxs px-sm py-xs text-body-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {link.label || link.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Comments Section */}
            <div>
              <h4 className="text-metadata font-medium text-muted-foreground uppercase tracking-wider mb-sm">
                Comments ({sectionComments.length})
              </h4>

              <ExternalCommentFeed comments={sectionComments} />

              <ExternalCommentForm
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                canComment={canComment}
                reviewerName={reviewerName}
                placeholder="Add a comment on this section..."
                commentType="section_feedback"
                resourceId={section.id}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

interface LpMapReviewContentProps {
  accessData: PublicAccessLink;
  comments: PublicAccessComment[];
  actions: {
    submitComment: (params: {
      commentText: string;
      commentType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    }) => void;
    isSubmitting: boolean;
  };
  canComment: boolean;
  reviewerName: string;
  lpMapData?: LpMapData;
}

export function LpMapReviewContent({
  accessData,
  comments,
  actions,
  canComment,
  reviewerName,
  lpMapData,
}: LpMapReviewContentProps) {
  if (!lpMapData) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-md" />
        <p className="text-muted-foreground">Loading LP map data...</p>
      </div>
    );
  }

  const sections = lpMapData.sections || [];
  const overallComments = comments.filter((c) => !c.resource_id);

  return (
    <div className="space-y-lg">
      {/* CFD Warning Banner */}
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg">
        <div className="px-md py-sm">
          <div className="flex items-center justify-center gap-xs">
            <AlertTriangle className="h-4 w-4 text-destructive-text" />
            <p className="text-body-sm font-semibold text-destructive-text">
              IMPORTANT: NO CFD WORDS ALLOWED - This is for external review
            </p>
          </div>
        </div>
      </div>

      {/* Map Info Header */}
      <Card>
        <CardContent className="py-md">
          <div className="flex items-center gap-sm mb-xs">
            {lpMapData.entity && (
              <Badge variant="outline">{lpMapData.entity.name}</Badge>
            )}
            <Badge variant="outline" className="capitalize">{lpMapData.status}</Badge>
          </div>
          <h2 className="text-heading-md font-bold">{lpMapData.name}</h2>
          {lpMapData.description && (
            <p className="text-muted-foreground mt-xs">{lpMapData.description}</p>
          )}
          {canComment && reviewerName && (
            <p className="text-body-sm text-muted-foreground mt-sm">
              Reviewing as {reviewerName}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-md">
        <h2 className="text-heading-sm font-semibold">LP Sections ({sections.length})</h2>
        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-2xl text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-md" />
              <p className="text-muted-foreground">No sections have been added to this map yet.</p>
            </CardContent>
          </Card>
        ) : (
          sections.map((mapSection) => (
            <SectionCard
              key={mapSection.id}
              mapSection={mapSection}
              comments={comments}
              canComment={canComment}
              reviewerName={reviewerName}
              onSubmit={actions.submitComment}
              isSubmitting={actions.isSubmitting}
            />
          ))
        )}
      </div>

      {/* Overall Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">Overall Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <ExternalCommentFeed comments={overallComments} />

          <ExternalCommentForm
            onSubmit={actions.submitComment}
            isSubmitting={actions.isSubmitting}
            canComment={canComment}
            reviewerName={reviewerName}
            placeholder="Add overall feedback on this LP map..."
            commentType="general"
          />
        </CardContent>
      </Card>
    </div>
  );
}
