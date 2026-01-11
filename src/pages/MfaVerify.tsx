import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { MfaSetupGuide } from "@/components/MfaSetupGuide";
import { GlassBackground } from "@/components/layout/GlassBackground";

export default function MfaVerify() {
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setMfaVerifiedStatus } = useAuth();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const verifyOtp = async () => {
    const code = useBackupCode ? backupCode : otp;

    if (!code || (useBackupCode && code.length < 8) || (!useBackupCode && code.length !== 6)) {
      toast({
        title: "Invalid code",
        description: useBackupCode ? "Please enter a valid backup code" : "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    try {
      // Verify OTP with edge function
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-mfa-otp', {
        body: { 
          otpCode: code,
          isBackupCode: useBackupCode
        }
      });

      if (verifyError) throw verifyError;

      if (verifyData.success) {
        // Create MFA session on server
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke('manage-mfa-session', {
          body: { action: 'create' }
        });

        if (sessionError || !sessionData?.sessionToken) {
          throw new Error('Failed to create session');
        }

        console.log('✅ MFA session created:', { 
          token: sessionData.sessionToken.substring(0, 10) + '...'
        });

        // Calculate expiry (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Mark MFA as verified with session token and expiry
        setMfaVerifiedStatus(true, sessionData.sessionToken, expiresAt);
        
        toast({
          title: "Verified!",
          description: "You have been successfully authenticated",
        });

        // Navigate immediately - state is now properly managed
        console.log('🚀 Navigating to home page');
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      
      let description = "Invalid code. Please try again.";
      if (error.message?.includes("Invalid code")) {
        description = useBackupCode 
          ? "Invalid backup code. Please check and try again."
          : "Invalid code. TOTP codes expire every 30 seconds - try a fresh code from your authenticator app.";
      } else if (error.message?.includes("Too many failed attempts")) {
        description = "Too many failed attempts. Please wait 15 minutes and try again.";
      } else if (error.message?.includes("must be")) {
        description = error.message; // Show validation errors directly
      }
      
      toast({
        title: "Verification failed",
        description,
        variant: "destructive",
      });
      setOtp("");
      setBackupCode("");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <GlassBackground variant="centered">
      <Card className="w-full max-w-md p-lg glass-elevated">
        <div className="text-center mb-lg">
          <Shield className="h-12 w-12 text-primary mx-auto mb-md" />
          <h1 className="text-heading-lg font-bold text-foreground mb-2">Two-Factor Authentication</h1>
          <p className="text-body-sm text-muted-foreground">
            {useBackupCode 
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"
            }
          </p>
        </div>

        <Alert className="mb-lg border-primary/50 bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-body-sm text-muted-foreground ml-2">
            Your session is secured. You'll stay logged in until you sign out, your IP changes, or 24 hours pass.
          </AlertDescription>
        </Alert>

        <div className="space-y-md">
          {useBackupCode ? (
            <div>
              <label className="text-body-sm font-medium text-foreground block mb-2">
                Backup Code
              </label>
              <Input
                type="text"
                placeholder="Enter backup code"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && backupCode.length >= 8) {
                    e.preventDefault();
                    verifyOtp();
                  }
                }}
                className="font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="text-body-sm font-medium text-foreground block mb-2">
                Verification Code
              </label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={() => verifyOtp()}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          )}

          <Button
            onClick={verifyOtp}
            disabled={verifying}
            className="w-full"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setOtp("");
                setBackupCode("");
              }}
              className="flex-1"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {useBackupCode ? "Use app instead" : "Use backup code"}
            </Button>
            <MfaSetupGuide />
          </div>

          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.removeItem('mfa_session_data');
              navigate("/auth");
            }}
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </GlassBackground>
  );
}
