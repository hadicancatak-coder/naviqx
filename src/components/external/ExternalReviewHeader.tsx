import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ExternalReviewHeaderProps {
  title: string;
  entity: string | null;
  isIdentified: boolean;
  canComment?: boolean;
  reviewerName: string;
  reviewerEmail: string;
  onIdentify: (name: string, email: string) => Promise<void>;
  requireIdentification?: boolean;
}

export function ExternalReviewHeader({
  title,
  entity,
  isIdentified,
  canComment,
  reviewerName,
  reviewerEmail,
  onIdentify,
  requireIdentification,
}: ExternalReviewHeaderProps) {
  const [name, setName] = useState(reviewerName);
  const [email, setEmail] = useState(reviewerEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(requireIdentification || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!email.trim() || !email.includes('@cfi.trade')) {
      toast.error('Please enter a valid @cfi.trade email');
      return;
    }

    setIsSubmitting(true);
    try {
      await onIdentify(name.trim(), email.trim().toLowerCase());
      toast.success('Identity saved');
      setShowForm(false);
    } catch {
      toast.error('Failed to save identity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <header className="sticky top-0 z-sticky liquid-glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Title and Entity */}
          <div className="flex items-center gap-3">
            <h1 className="text-heading-sm font-semibold text-foreground">
              {title}
            </h1>
            {entity && (
              <Badge variant="secondary" className="text-metadata">
                {entity}
              </Badge>
            )}
          </div>

          {/* Right: Identity status or form toggle */}
          <div className="flex items-center gap-3">
            {isIdentified && reviewerName ? (
              <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline">{reviewerName}</span>
                {!canComment && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(true)}
                    className="text-muted-foreground"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Enable Comments
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(true)}
              >
                <User className="w-4 h-4 mr-2" />
                Identify Yourself
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible identification form */}
        {showForm && (
          <div className="pb-4 border-t border-border/50 pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 bg-card/50">
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewer-name" className="text-metadata">
                    Your Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reviewer-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="pl-10"
                      autoFocus={requireIdentification}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewer-email" className="text-metadata">
                    Work Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reviewer-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@cfi.trade"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-metadata text-muted-foreground">
                  Only @cfi.trade emails are allowed
                </p>
                <div className="flex gap-2">
                  {!requireIdentification && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Confirm Identity'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
