import { useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, Image, FileText, MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const sectionTypeColors: Record<string, string> = {
  hero: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  features: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  testimonials: "bg-green-500/20 text-green-400 border-green-500/30",
  pricing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cta: "bg-red-500/20 text-red-400 border-red-500/30",
  footer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  custom: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

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
  const typeColor = sectionTypeColors[section.section_type] || sectionTypeColors.custom;

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
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
                  {mapSection.position + 1}
                </div>
                <div>
                  <CardTitle className="text-base">{section.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn("text-xs", typeColor)}>
                      {section.section_type}
                    </Badge>
                    {section.sample_images.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        {section.sample_images.length}
                      </span>
                    )}
                    {sectionComments.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
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
          <CardContent className="pt-0 space-y-6">
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}

            {/* Images */}
            {section.sample_images.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Sample Images (click to enlarge)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                        <p className="text-xs text-muted-foreground p-2 bg-muted/50">
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
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Brief / Instructions
                </h4>
                <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-4">
                  {section.brief_content}
                </div>
              </div>
            )}

            {/* Links */}
            {section.website_links.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Reference Links
                </h4>
                <div className="flex flex-wrap gap-2">
                  {section.website_links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors"
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
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Comments ({sectionComments.length})
              </h4>

              {sectionComments.length > 0 && (
                <div className="space-y-3 mb-4">
                  {sectionComments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{comment.reviewer_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{comment.comment_text}</p>
                    </div>
                  ))}
                </div>
              )}

              {reviewerName && reviewerEmail && (
                <div className="flex gap-2">
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
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [hasIdentified, setHasIdentified] = useState(false);
  const [overallComment, setOverallComment] = useState("");

  const { data: map, isLoading, error } = useLpMapByToken(token || null);
  const { data: comments = [] } = useLpExternalComments(map?.id || null);
  const addComment = useAddLpComment();

  const handleIdentify = () => {
    if (reviewerName.trim() && reviewerEmail.trim()) {
      setHasIdentified(true);
    }
  };

  const handleAddComment = (sectionId: string | null, text: string) => {
    if (!map || !token) return;
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading LP map...</p>
        </div>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-2">Link Not Found</h1>
          <p className="text-muted-foreground">
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
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            {map.entity && (
              <Badge variant="outline">{map.entity.name}</Badge>
            )}
            <Badge variant="outline" className="capitalize">{map.status}</Badge>
          </div>
          <h1 className="text-2xl font-bold">{map.name}</h1>
          {map.description && (
            <p className="text-muted-foreground mt-2">{map.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Reviewer Identification */}
        {!hasIdentified && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Identify Yourself</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please enter your details to leave comments on this LP map.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <Button onClick={handleIdentify} disabled={!reviewerName.trim() || !reviewerEmail.trim()}>
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sections */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold">LP Sections ({sections.length})</h2>
          {sections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
        {hasIdentified && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overall Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {overallComments.length > 0 && (
                <div className="space-y-3">
                  {overallComments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{comment.reviewer_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{comment.comment_text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
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
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          Proudly presented by the Performance Marketing Team at CFI Group.
          This page was built internally with AI. Do not share with third parties; internal use only.
        </div>
      </footer>
    </div>
  );
};

export default LpMapPublic;
