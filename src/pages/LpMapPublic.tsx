import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, Image, FileText, MessageSquare, ChevronDown, ChevronUp, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useLpMapByToken, LpMapSection } from "@/hooks/useLpMaps";
import { useLpExternalComments, useAddLpComment, LpExternalComment } from "@/hooks/useLpComments";
import { useReviewerSession } from "@/hooks/useReviewerSession";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ExternalPageFooter } from "@/components/layout/ExternalPageFooter";
import { sectionTypeCardColors } from "@/domain/lp-sections";

interface SectionCardProps {
  mapSection: LpMapSection;
  comments: LpExternalComment[];
  onAddComment: (sectionId: string | null, text: string) => void;
  reviewerName: string;
  reviewerEmail: string;
}

const SectionCard = ({
  mapSection,
  comments,
  onAddComment,
  reviewerName,
  reviewerEmail,
}: SectionCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const section = mapSection.section;
  if (!section) return null;

  const sectionComments = comments.filter((c) => c.section_id === section.id);
  const typeColor = sectionTypeCardColors[section.section_type] || sectionTypeCardColors.other;

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    onAddComment(section.id, commentText.trim());
    setCommentText("");
  };

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

              {sectionComments.length > 0 && (
                <div className="space-y-sm mb-md">
                  {sectionComments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-sm">
                      <div className="flex items-center gap-xs mb-xxs">
                        <span className="text-body-sm font-medium">{comment.reviewer_name}</span>
                        <span className="text-metadata text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-body-sm">{comment.comment_text}</p>
                    </div>
                  ))}
                </div>
              )}

              {reviewerName && reviewerEmail && (
                <div className="flex gap-xs">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment on this section..."
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const LpMapPublic = () => {
  const { token } = useParams<{ token: string }>();
  const [overallComment, setOverallComment] = useState("");

  // Use the reviewer session hook for IP-based persistence
  const { 
    session: storedSession, 
    loading: sessionLoading, 
    saveSession, 
    hasSession,
    reviewerName,
    reviewerEmail 
  } = useReviewerSession('lp_map', token);
  
  // Local state for the identification form
  const [tempName, setTempName] = useState("");
  const [tempEmail, setTempEmail] = useState("");

  const { data: map, isLoading, error } = useLpMapByToken(token || null);
  const { data: comments = [] } = useLpExternalComments(map?.id || null);
  const addComment = useAddLpComment();

  const handleIdentify = async () => {
    if (tempName.trim() && tempEmail.trim()) {
      await saveSession(tempName.trim(), tempEmail.trim());
    }
  };

  const handleAddComment = (sectionId: string | null, text: string) => {
    if (!map || !token || !hasSession) return;
    addComment.mutate({
      mapId: map.id,
      sectionId: sectionId || undefined,
      reviewerName,
      reviewerEmail,
      commentText: text,
      accessToken: token,
    });
  };

  const handleSubmitOverallComment = () => {
    if (!overallComment.trim()) return;
    handleAddComment(null, overallComment.trim());
    setOverallComment("");
  };

  if (isLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-md" />
          <p className="text-muted-foreground">Loading LP map...</p>
        </div>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-md">
          <h1 className="text-heading-lg font-bold mb-sm">Link Not Found</h1>
          <p className="text-muted-foreground text-body">
            This link may have expired or been deactivated. Please contact the person who shared it with you.
          </p>
        </div>
      </div>
    );
  }

  const sections = map.sections || [];
  const overallComments = comments.filter((c) => !c.section_id);

  return (
    <div className="min-h-screen bg-background">
      {/* CFD Warning Banner */}
      <div className="bg-destructive/10 border-b border-destructive/30">
        <div className="max-w-5xl mx-auto px-md py-sm">
          <div className="flex items-center justify-center gap-xs">
            <AlertTriangle className="h-4 w-4 text-destructive-text" />
            <p className="text-body-sm font-semibold text-destructive-text">
              IMPORTANT: NO CFD WORDS ALLOWED - This is for external review
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-md py-lg">
          <div className="flex items-center gap-sm mb-xs">
            {map.entity && (
              <Badge variant="outline">{map.entity.name}</Badge>
            )}
            <Badge variant="outline" className="capitalize">{map.status}</Badge>
          </div>
          <h1 className="text-heading-lg font-bold">{map.name}</h1>
          {map.description && (
            <p className="text-muted-foreground mt-xs">{map.description}</p>
          )}
          {hasSession && (
            <p className="text-body-sm text-muted-foreground mt-sm">
              Reviewing as {reviewerName}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-md py-xl">
        {/* Inline Identification Bar - shown when not identified */}
        {!hasSession && (
          <Card className="mb-md border-primary/30">
            <CardContent className="py-sm px-md">
              <div className="flex items-center gap-md flex-wrap">
                <span className="text-body-sm text-muted-foreground">To leave comments:</span>
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Your name"
                  className="w-40 h-8"
                />
                <Input
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-48 h-8"
                />
                <Button 
                  size="sm" 
                  onClick={handleIdentify} 
                  disabled={!tempName.trim() || !tempEmail.trim()}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        <div className="space-y-md mb-xl">
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
                onAddComment={handleAddComment}
                reviewerName={reviewerName}
                reviewerEmail={reviewerEmail}
              />
            ))
          )}
        </div>

        {/* Overall Comments */}
        {hasSession && (
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-sm">Overall Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              {overallComments.length > 0 && (
                <div className="space-y-sm">
                  {overallComments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-sm">
                      <div className="flex items-center gap-xs mb-xxs">
                        <span className="text-body-sm font-medium">{comment.reviewer_name}</span>
                        <span className="text-metadata text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-body-sm">{comment.comment_text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-xs">
                <Textarea
                  value={overallComment}
                  onChange={(e) => setOverallComment(e.target.value)}
                  placeholder="Add overall feedback on this LP map..."
                  rows={3}
                  className="resize-none"
                />
                <Button
                  onClick={handleSubmitOverallComment}
                  disabled={!overallComment.trim()}
                >
                  <Send className="h-4 w-4 mr-sm" />
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ExternalPageFooter />
    </div>
  );
};

export default LpMapPublic;
