import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { authPasswordSchema } from "@/lib/validationSchemas";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { AuthPageFooter } from "@/components/layout/AuthPageFooter";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: authPasswordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

export default function ChangePasswordRequired() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, clearForcePasswordReset, mfaEnabled } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password requirements
      changePasswordSchema.parse({ currentPassword, newPassword, confirmPassword });

      if (!user?.email) {
        throw new Error("No user email found");
      }

      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update password via Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Clear the force_password_reset flag
      await supabase
        .from('profiles')
        .update({ force_password_reset: false })
        .eq('user_id', user.id);

      // Update context state
      clearForcePasswordReset();

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      logger.debug('Password changed, proceeding to MFA flow');

      // Continue to MFA flow
      if (!mfaEnabled) {
        navigate("/mfa-setup", { replace: true });
      } else {
        navigate("/mfa-verify", { replace: true });
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to change password";
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

  return (
    <GlassBackground variant="centered">
      <Card className="w-full max-w-md p-lg liquid-glass-elevated">
        {/* Header */}
        <div className="text-center mb-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-warning/10 mb-md">
            <Shield className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-heading-lg font-bold text-foreground">Password Update Required</h1>
          <p className="text-body-sm text-muted-foreground mt-sm">
            Your password doesn't meet our current security requirements
          </p>
        </div>

        <Alert className="mb-lg border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-body-sm text-muted-foreground ml-sm">
            For your account security, please create a new password that meets all requirements below.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-md">
          <div className="flex flex-col gap-xs">
            <label htmlFor="currentPassword" className="text-body-sm font-medium text-foreground">
              Current Password
            </label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label htmlFor="newPassword" className="text-body-sm font-medium text-foreground">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {newPassword && (
              <div className="mt-sm">
                <PasswordStrengthIndicator password={newPassword} />
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
            {confirmPassword && newPassword !== confirmPassword && (
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
              "Update Password & Continue"
            )}
          </Button>
        </form>

        <AuthPageFooter />
      </Card>
    </GlassBackground>
  );
}
