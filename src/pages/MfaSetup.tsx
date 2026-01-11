import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Copy, Check, AlertTriangle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import QRCode from "qrcode";
import { useAuth } from "@/hooks/useAuth";
import { MfaSetupGuide } from "@/components/MfaSetupGuide";
import { GlassBackground } from "@/components/layout/GlassBackground";

export default function MfaSetup() {
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setMfaVerifiedStatus } = useAuth();

  useEffect(() => {
    setupMfa();
  }, []);

  const setupMfa = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke('setup-mfa');

      if (error) throw error;

      // Generate QR code on the frontend
      const qrCodeDataUrl = await QRCode.toDataURL(data.otpauth);

      setQrCode(qrCodeDataUrl);
      setSecret(data.secret);
      setLoading(false);
    } catch (error: any) {
      console.error('Error setting up MFA:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set up MFA",
        variant: "destructive",
      });
    }
  };

  const verifyAndEnable = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('setup-mfa', {
        body: { verifyOtp: otp }
      });

      if (error) throw error;

      setBackupCodes(data.backupCodes);
      setShowBackupCodes(true);

      // Create MFA session after successful setup
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('manage-mfa-session', {
        body: { action: 'create' }
      });

      if (!sessionError && sessionData?.sessionToken && sessionData?.expiresAt) {
        setMfaVerifiedStatus(true, sessionData.sessionToken, sessionData.expiresAt);
      }

      toast({
        title: "MFA Enabled!",
        description: "Two-factor authentication has been enabled for your account",
      });
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedCodes(true);
    toast({
      title: "Copied!",
      description: "Backup codes copied to clipboard",
    });
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const finishSetup = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <GlassBackground variant="centered">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </GlassBackground>
    );
  }

  if (showBackupCodes) {
    return (
      <GlassBackground variant="centered">
        <Card className="w-full max-w-md p-lg glass-elevated">
          <div className="text-center mb-lg">
            <Shield className="h-12 w-12 text-primary mx-auto mb-md" />
            <h1 className="text-heading-lg font-bold text-foreground mb-2">Save Your Backup Codes</h1>
            <p className="text-body-sm text-muted-foreground">
              Store these codes in a safe place. You can use them to access your account if you lose your authenticator.
            </p>
          </div>

          <div className="bg-muted rounded-lg p-md mb-md">
            <div className="grid grid-cols-2 gap-sm font-mono text-body-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="text-center p-2 bg-background rounded">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={copyBackupCodes}
            variant="outline"
            className="w-full mb-md"
          >
            {copiedCodes ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy All Codes
              </>
            )}
          </Button>

          <Button onClick={finishSetup} className="w-full">
            I've Saved My Codes
          </Button>
        </Card>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground variant="centered">
      <Card className="w-full max-w-md p-lg glass-elevated">
        <div className="text-center mb-lg">
          <Shield className="h-12 w-12 text-primary mx-auto mb-md" />
          <h1 className="text-heading-lg font-bold text-foreground mb-2">Set Up Two-Factor Authentication</h1>
          <p className="text-body-sm text-muted-foreground">
            Two-factor authentication is required for all accounts
          </p>
        </div>

        <Alert className="mb-lg border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-body-sm text-muted-foreground ml-2">
            <strong>Required:</strong> Scan the QR code with an authenticator app like 
            Google Authenticator, Authy, or Microsoft Authenticator.
          </AlertDescription>
        </Alert>

        <div className="flex justify-center mb-lg">
          <img src={qrCode} alt="QR Code" className="w-48 h-48" />
        </div>

        <div className="mb-lg">
          <p className="text-metadata text-muted-foreground text-center mb-2">
            Can't scan? Enter this code manually:
          </p>
          <div className="bg-muted p-3 rounded text-center font-mono text-body-sm break-all">
            {secret}
          </div>
        </div>

        <div className="space-y-md">
          <div>
            <label className="text-body-sm font-medium text-foreground block mb-2">
              Enter the 6-digit code from your app
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
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

          <div className="flex justify-center mb-md">
            <MfaSetupGuide />
          </div>

          <Button
            onClick={verifyAndEnable}
            disabled={verifying || otp.length !== 6}
            className="w-full"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify and Enable MFA"
            )}
          </Button>
        </div>
      </Card>
    </GlassBackground>
  );
}
