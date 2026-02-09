import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { logger } from "@/lib/logger";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedDomains: string[];
}

export function ForgotPasswordModal({ 
  open, 
  onOpenChange, 
  allowedDomains 
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  // Create dynamic email schema based on allowed domains
  const emailSchema = useMemo(() => {
    const domainPattern = allowedDomains.map(d => d.replace('.', '\\.')).join('|');
    const regex = new RegExp(`@(${domainPattern})$`, 'i');
    const domainList = allowedDomains.map(d => `@${d}`).join(', ');
    
    return z.string()
      .email("Invalid email address")
      .refine(
        (email) => regex.test(email),
        `Only ${domainList} email addresses are allowed`
      );
  }, [allowedDomains]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email domain
      emailSchema.parse(email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      logger.debug('Password reset email sent', { email });
      setSuccess(true);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Email",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to send reset email";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md liquid-glass-elevated">
        {success ? (
          <>
            <DialogHeader className="text-center">
              <div className="flex justify-center mb-md">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-success/10">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
              </div>
              <DialogTitle>Check Your Email</DialogTitle>
              <DialogDescription>
                We've sent a password reset link to <strong>{email}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-md mt-md">
              <p className="text-body-sm text-muted-foreground text-center">
                Click the link in the email to reset your password. The link will expire in 24 hours.
              </p>
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-md">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center">Forgot Password?</DialogTitle>
              <DialogDescription className="text-center">
                Enter your CFI email address and we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-md mt-md">
              <div className="flex flex-col gap-xs">
                <label htmlFor="reset-email" className="text-body-sm font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@cfi.trade"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-metadata text-muted-foreground">
                  Only {allowedDomains.map(d => `@${d}`).join(', ')} addresses accepted
                </p>
              </div>

              <div className="flex gap-sm">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-sm" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
