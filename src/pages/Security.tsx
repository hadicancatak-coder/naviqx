import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Shield, Key, Copy, Check, RefreshCw } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Security() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaEnrolledAt, setMfaEnrolledAt] = useState<string | null>(null);
  
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codesRevealed, setCodesRevealed] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [regeneratingCodes, setRegeneratingCodes] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  useEffect(() => {
    fetchSecurityInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSecurityInfo = async () => {
    if (!user) return;

    // Get MFA enabled status from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("mfa_enabled")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      setMfaEnabled(profile.mfa_enabled || false);
    }

    // Get MFA secrets and backup codes from secure table
    const { data: mfaSecrets } = await supabase
      .from("user_mfa_secrets")
      .select("mfa_enrolled_at, mfa_backup_codes")
      .eq("user_id", user.id)
      .single();

    if (mfaSecrets) {
      setMfaEnrolledAt(mfaSecrets.mfa_enrolled_at);
      
      const codes = mfaSecrets.mfa_backup_codes;
      if (codes && Array.isArray(codes)) {
        setBackupCodes(codes.filter((c): c is string => typeof c === 'string'));
      }
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match",
        variant: "destructive",
      });
      return;
    }

    // Validate new password strength
    const hasMinLength = newPassword.length >= 9;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecial) {
      toast({
        title: "Weak password",
        description: "Please meet all password requirements",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);

    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Incorrect password",
          description: "Current password is incorrect",
          variant: "destructive",
        });
        setChangingPassword(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Update last password change timestamp
      await supabase
        .from("profiles")
        .update({ last_password_change: new Date().toISOString() })
        .eq("user_id", user.id);

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    toast({
      title: "Copied!",
      description: "Backup codes copied to clipboard",
    });
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const regenerateCodes = async () => {
    setRegeneratingCodes(true);
    try {
      const { data, error } = await supabase.rpc("regenerate_backup_codes");

      if (error) throw error;

      setBackupCodes(data || []);
      toast({
        title: "Codes regenerated",
        description: "New backup codes have been generated. Please save them securely.",
      });
      setShowRegenerateDialog(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to regenerate codes";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRegeneratingCodes(false);
    }
  };

  return (
    <div className="p-xl space-y-lg max-w-4xl mx-auto animate-fade-in">
      <PageHeader 
        title="Security Settings" 
        description="Manage your account security and authentication"
        icon={Shield}
      />

      {/* Change Password */}
      <Card className="p-lg">
        <div className="flex items-center gap-xs mb-md">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="text-heading-md font-semibold">Change Password</h2>
        </div>
        
        <div className="space-y-md">
          <div>
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          {newPassword && (
            <PasswordStrengthIndicator password={newPassword} />
          )}

          <div>
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {changingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-sm animate-spin" />
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </div>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="p-lg">
        <div className="flex items-center gap-xs mb-md">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-heading-md font-semibold">Two-Factor Authentication</h2>
        </div>

        <div className="space-y-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-body-sm text-muted-foreground">
                {mfaEnabled ? "Two-factor authentication is enabled" : "Two-factor authentication is disabled"}
              </p>
            </div>
            <Badge variant={mfaEnabled ? "default" : "secondary"}>
              {mfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {mfaEnabled && mfaEnrolledAt && (
            <div>
              <p className="text-body-sm text-muted-foreground">
                Configured {formatDistanceToNow(new Date(mfaEnrolledAt), { addSuffix: true })}
              </p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => navigate("/mfa-setup")}
          >
            {mfaEnabled ? "Reconfigure MFA" : "Set Up MFA"}
          </Button>
        </div>
      </Card>

      {/* Backup Codes */}
      {mfaEnabled && (
        <Card className="p-lg">
          <div className="flex items-center gap-xs mb-md">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-heading-md font-semibold">Backup Recovery Codes</h2>
          </div>

          <p className="text-body-sm text-muted-foreground mb-md">
            Use these codes to access your account if you lose access to your authenticator app. Each code can only be used once.
          </p>

          {backupCodes.length > 0 ? (
            <>
              <div 
                className={`bg-muted rounded-lg p-md mb-md cursor-pointer transition-all ${!codesRevealed ? 'blur-sm hover:blur-none' : ''}`}
                onClick={() => setCodesRevealed(true)}
              >
                <div className="grid grid-cols-2 gap-xs font-mono text-body-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="text-center p-xs bg-background rounded">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {!codesRevealed && (
                <p className="text-metadata text-muted-foreground text-center mb-md">
                  Click to reveal codes
                </p>
              )}

              <div className="flex gap-xs">
                <Button
                  variant="outline"
                  onClick={copyBackupCodes}
                  className="flex-1"
                >
                  {copiedCodes ? (
                    <>
                      <Check className="h-4 w-4 mr-sm" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-sm" />
                      Copy All Codes
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateDialog(true)}
                  disabled={regeneratingCodes}
                >
                  <RefreshCw className="h-4 w-4 mr-sm" />
                  Regenerate
                </Button>
              </div>
            </>
          ) : (
            <p className="text-body-sm text-muted-foreground">No backup codes available. Set up MFA to generate codes.</p>
          )}
        </Card>
      )}

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Backup Codes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate all your existing backup codes and generate new ones. Make sure to save the new codes securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={regenerateCodes} disabled={regeneratingCodes}>
              {regeneratingCodes ? (
                <>
                  <Loader2 className="h-4 w-4 mr-sm animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
