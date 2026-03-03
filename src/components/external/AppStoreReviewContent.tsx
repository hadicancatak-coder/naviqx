import { useState } from "react";
import type { PublicAccessLink } from "@/hooks/usePublicAccess";
import type { AppStoreListing } from "@/domain/app-store";
import { AppleStorePreview } from "@/components/app-store/AppleStorePreview";
import { GooglePlayPreview } from "@/components/app-store/GooglePlayPreview";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Apple, Play, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Props {
  accessData: PublicAccessLink;
  listing: AppStoreListing | null | undefined;
  isLoading?: boolean;
}

export function AppStoreReviewContent({ accessData, listing, isLoading }: Props) {
  const [previewStore, setPreviewStore] = useState<"apple" | "google">("apple");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"approve" | "request_changes" | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] w-[300px] mx-auto rounded-[36px]" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Listing not found or no longer available.
      </div>
    );
  }

  const handleAction = async (action: "approve" | "request_changes") => {
    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/approve-app-listing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessData.access_token,
            action,
            reviewer_name: accessData.reviewer_name ?? "",
            reviewer_email: accessData.reviewer_email ?? "",
            review_notes: action === "request_changes" ? feedbackText : undefined,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      setSubmitted(action);
      toast.success(action === "approve" ? "Listing approved!" : "Feedback submitted!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-lg">
      <div className="text-center">
        <h2 className="text-heading-md font-semibold text-foreground">{listing.name}</h2>
        <p className="text-body-sm text-muted-foreground mt-xs">
          {listing.store_type === "apple" ? "Apple App Store" : "Google Play Store"} · {listing.locale.toUpperCase()}
        </p>
      </div>

      {/* Store toggle */}
      <div className="flex justify-center">
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setPreviewStore("apple")}
            className={`px-3 py-1.5 text-body-sm font-medium transition-smooth flex items-center gap-1.5 ${
              previewStore === "apple"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-subtle"
            }`}
          >
            <Apple className="h-4 w-4" /> iOS
          </button>
          <button
            onClick={() => setPreviewStore("google")}
            className={`px-3 py-1.5 text-body-sm font-medium transition-smooth flex items-center gap-1.5 ${
              previewStore === "google"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-subtle"
            }`}
          >
            <Play className="h-4 w-4" /> Android
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        {previewStore === "apple" ? (
          <AppleStorePreview listing={listing} />
        ) : (
          <GooglePlayPreview listing={listing} />
        )}
      </div>

      {/* Approval actions */}
      {submitted ? (
        <div className="text-center py-lg">
          <div className={`inline-flex items-center gap-sm px-lg py-md rounded-xl ${
            submitted === "approve" ? "bg-success-soft text-success-text" : "bg-warning-soft text-warning-text"
          }`}>
            <Check className="h-5 w-5" />
            <span className="text-body font-medium">
              {submitted === "approve" ? "You approved this listing" : "Your feedback has been submitted"}
            </span>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-md">
          {showFeedback && (
            <div className="space-y-sm">
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe what needs to change…"
                className="min-h-[100px] text-body-sm"
              />
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleAction("request_changes")}
                disabled={submitting || !feedbackText.trim()}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {submitting ? "Submitting…" : "Submit Feedback"}
              </Button>
            </div>
          )}
          <div className="flex gap-sm">
            <Button
              className="flex-1"
              onClick={() => handleAction("approve")}
              disabled={submitting}
            >
              <Check className="h-4 w-4 mr-2" />
              {submitting ? "…" : "Approve"}
            </Button>
            {!showFeedback && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowFeedback(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Request Changes
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
