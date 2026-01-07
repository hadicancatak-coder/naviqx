import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useExternalAccess } from "@/hooks/useExternalAccess";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { Copy, ExternalLink, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExternalAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  campaignName?: string;
}

export function ExternalAccessDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: ExternalAccessDialogProps) {
  const { generateLink } = useExternalAccess();
  const { data: entities = [] } = useSystemEntities();
  const [selectedEntity, setSelectedEntity] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkGenerated, setLinkGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerateLink = async () => {
    // Validate inputs
    if (!selectedEntity) {
      toast.error("Please select an entity");
      return;
    }

    if (!reviewerName.trim()) {
      toast.error("Please enter reviewer name");
      return;
    }

    if (!reviewerEmail.trim() || !reviewerEmail.endsWith("@cfi.trade")) {
      toast.error("Email must be from @cfi.trade domain");
      return;
    }

    setLoading(true);
    try {
      // Calculate expiration date
      let expiresAt: string | undefined;
      if (expiration === "7days") {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        expiresAt = date.toISOString();
      } else if (expiration === "30days") {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        expiresAt = date.toISOString();
      }

      const result = await generateLink.mutateAsync({
        entity: selectedEntity,
        reviewerName,
        reviewerEmail,
        expiresAt,
        campaignId,
      });

      setGeneratedLink(result.url);
      setLinkGenerated(true);
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied to clipboard");
  };

  const handleClose = () => {
    setSelectedEntity("");
    setReviewerName("");
    setReviewerEmail("");
    setExpiration("never");
    setGeneratedLink("");
    setLinkGenerated(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Generate External Review Link
          </DialogTitle>
          <DialogDescription>
            {campaignId 
              ? `Share this link for external review of "${campaignName}"`
              : "Share this link with external reviewers to get comments"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-md">
          {!linkGenerated ? (
            <>
              <div className="space-y-xs">
                <Label htmlFor="entity">Entity *</Label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger id="entity">
                    <SelectValue placeholder="Choose entity" />
                  </SelectTrigger>
                  <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.name} value={entity.name}>
                      {entity.emoji} {entity.name}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-xs">
                <Label htmlFor="reviewer-name">Reviewer Name *</Label>
                <Input
                  id="reviewer-name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-xs">
                <Label htmlFor="reviewer-email">
                  Reviewer Email (@cfi.trade) *
                </Label>
                <Input
                  id="reviewer-email"
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="john.doe@cfi.trade"
                />
                <p className="text-xs text-muted-foreground">
                  Must be a @cfi.trade email address
                </p>
              </div>

              <div className="space-y-xs">
                <Label htmlFor="expiration">Link Expiration (Optional)</Label>
                <Select value={expiration} onValueChange={setExpiration}>
                  <SelectTrigger id="expiration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="7days">7 Days</SelectItem>
                    <SelectItem value="30days">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerateLink}
                disabled={loading}
                className="w-full mt-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Link"
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-muted p-md rounded-lg space-y-sm">
                <p className="text-body-sm font-medium">Review Link:</p>
                <div className="flex gap-xs">
                  <Input value={generatedLink} readOnly className="flex-1" />
                  <Button onClick={copyToClipboard} size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This link allows <strong>{reviewerName}</strong> to view
                  campaign assignments and add comments. They cannot drag, edit,
                  or delete campaigns.
                </AlertDescription>
              </Alert>

              <Button onClick={handleClose} className="w-full" variant="outline">
                Close
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
