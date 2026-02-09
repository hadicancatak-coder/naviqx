import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { authPasswordSchema } from "@/lib/validationSchemas";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { AuthPageFooter } from "@/components/layout/AuthPageFooter";
import { logger } from "@/lib/logger";

const resetPasswordSchema = z.object({
  password: authPasswordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for valid recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        logger.debug('No session found for password reset');
        setValidSession(false);
        return;
      }
      
      // User has a valid session from recovery link
      setValidSession(true);
    };

    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug('Auth state change in reset password', { event });
      
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password requirements
      resetPasswordSchema.parse({ password, confirmPassword });

      // Update password via Supabase
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Clear the force_password_reset flag if it was set
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ force_password_reset: false })
          .eq('user_id', user.id);
      }

      setSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. Please log in with your new password.",
      });

      // Sign out and redirect to auth
      await supabase.auth.signOut();
      setTimeout(() => navigate("/auth", { replace: true }), 2000);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to reset password";
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

  // Still checking session
  if (validSession === null) {
    return (
      <GlassBackground variant="centered">
        <Card className="w-full max-w-md p-lg liquid-glass-elevated">
          <div className="flex items-center justify-center p-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Card>
      </GlassBackground>
    );
  }

  // Invalid/expired session
  if (validSession === false) {
    return (
      <GlassBackground variant="centered">
        <Card className="w-full max-w-md p-lg liquid-glass-elevated">
          <div className="text-center mb-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-md">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-heading-lg font-bold text-foreground">Link Expired</h1>
            <p className="text-body-sm text-muted-foreground mt-sm">
              This password reset link has expired or is invalid.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={() => navigate("/auth")}
          >
            Return to Login
          </Button>

          <AuthPageFooter />
        </Card>
      </GlassBackground>
    );
  }

  // Success state
  if (success) {
    return (
      <GlassBackground variant="centered">
        <Card className="w-full max-w-md p-lg liquid-glass-elevated">
          <div className="text-center mb-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success/10 mb-md">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-heading-lg font-bold text-foreground">Password Updated</h1>
            <p className="text-body-sm text-muted-foreground mt-sm">
              Redirecting you to login...
            </p>
          </div>

          <AuthPageFooter />
        </Card>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground variant="centered">
      <Card className="w-full max-w-md p-lg liquid-glass-elevated">
        {/* Header */}
        <div className="text-center mb-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-md">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-heading-lg font-bold text-foreground">Reset Password</h1>
          <p className="text-body-sm text-muted-foreground mt-sm">
            Set a new secure password for your account
          </p>
        </div>

        <Alert className="mb-lg border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-body-sm text-muted-foreground ml-sm">
            Choose a strong password that you don't use on other sites.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-md">
          <div className="flex flex-col gap-xs">
            <label htmlFor="password" className="text-body-sm font-medium text-foreground">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            {password && (
              <div className="mt-sm">
                <PasswordStrengthIndicator password={password} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-xs">
            <label htmlFor="confirmPassword" className="text-body-sm font-medium text-foreground">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-metadata text-destructive mt-xs">
                Passwords do not match
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-sm" />
                Updating Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        <AuthPageFooter />
      </Card>
    </GlassBackground>
  );
}
