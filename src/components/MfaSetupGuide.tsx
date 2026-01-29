import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle, Smartphone, QrCode, Shield, Key, AlertTriangle } from "lucide-react";

interface MfaSetupGuideProps {
  trigger?: React.ReactNode;
}

export function MfaSetupGuide({ trigger }: MfaSetupGuideProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-xs">
            <HelpCircle className="h-4 w-4" />
            Need help?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-xs">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication Guide
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-lg py-md">
          {/* What is 2FA */}
          <section>
            <h3 className="font-semibold text-foreground mb-xs flex items-center gap-xs">
              <Shield className="h-4 w-4" />
              What is Two-Factor Authentication?
            </h3>
            <p className="text-body-sm text-muted-foreground">
              Two-factor authentication (2FA) adds an extra layer of security to your account. 
              Even if someone knows your password, they can't access your account without the 
              second factor - a time-based code from your authenticator app.
            </p>
          </section>

          {/* Which App to Use */}
          <section>
            <h3 className="font-semibold text-foreground mb-xs flex items-center gap-xs">
              <Smartphone className="h-4 w-4" />
              Which Authenticator App Should I Use?
            </h3>
            <p className="text-body-sm text-muted-foreground mb-sm">
              You can use any TOTP-compatible authenticator app. Popular options include:
            </p>
            <ul className="text-body-sm text-muted-foreground space-y-xs ml-md">
              <li className="flex items-start gap-xs">
                <span className="font-medium text-foreground">Google Authenticator</span> 
                - Simple and reliable (iOS & Android)
              </li>
              <li className="flex items-start gap-xs">
                <span className="font-medium text-foreground">Microsoft Authenticator</span>
                - Great for Microsoft accounts too (iOS & Android)
              </li>
              <li className="flex items-start gap-xs">
                <span className="font-medium text-foreground">Authy</span>
                - Supports cloud backup (iOS, Android, Desktop)
              </li>
              <li className="flex items-start gap-xs">
                <span className="font-medium text-foreground">1Password / Bitwarden</span>
                - Built into password managers
              </li>
            </ul>
          </section>

          {/* How to Set Up */}
          <section>
            <h3 className="font-semibold text-foreground mb-xs flex items-center gap-xs">
              <QrCode className="h-4 w-4" />
              How to Set Up 2FA
            </h3>
            <ol className="text-body-sm text-muted-foreground space-y-sm ml-md list-decimal">
              <li>
                <span className="font-medium text-foreground">Download an authenticator app</span>
                <br />
                Install one of the apps mentioned above on your phone.
              </li>
              <li>
                <span className="font-medium text-foreground">Scan the QR code</span>
                <br />
                Open your authenticator app and scan the QR code shown on screen. 
                If you can't scan, manually enter the secret key.
              </li>
              <li>
                <span className="font-medium text-foreground">Enter the 6-digit code</span>
                <br />
                Your app will show a 6-digit code that changes every 30 seconds. 
                Enter this code to verify the setup.
              </li>
              <li>
                <span className="font-medium text-foreground">Save your backup codes</span>
                <br />
                Store the backup codes in a safe place. You'll need these if you lose access to your phone.
              </li>
            </ol>
          </section>

          {/* Backup Codes */}
          <section>
            <h3 className="font-semibold text-foreground mb-xs flex items-center gap-xs">
              <Key className="h-4 w-4" />
              What Are Backup Codes?
            </h3>
            <p className="text-body-sm text-muted-foreground">
              Backup codes are one-time use codes that let you access your account if you lose your phone 
              or can't use your authenticator app. Each code can only be used once. Store them securely - 
              in a password manager or printed in a safe location.
            </p>
          </section>

          {/* Lost Phone */}
          <section className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-md">
            <h3 className="font-semibold text-foreground mb-xs flex items-center gap-xs">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              What If I Lose My Phone?
            </h3>
            <p className="text-body-sm text-muted-foreground">
              Don't worry! You have options:
            </p>
            <ul className="text-body-sm text-muted-foreground mt-xs space-y-xs ml-md list-disc">
              <li>Use one of your backup codes to log in</li>
              <li>Contact your administrator to reset your 2FA</li>
              <li>If using Authy with cloud backup, restore on a new device</li>
            </ul>
          </section>

          {/* IP-Based Sessions */}
          <section>
            <h3 className="font-semibold text-foreground mb-xs flex items-center gap-xs">
              <Shield className="h-4 w-4" />
              When Will I Be Asked to Verify?
            </h3>
            <p className="text-body-sm text-muted-foreground">
              For your security, you'll need to verify with 2FA:
            </p>
            <ul className="text-body-sm text-muted-foreground mt-xs space-y-xs ml-md list-disc">
              <li>When you log in</li>
              <li>If your IP address changes (different network/location)</li>
              <li>After signing out</li>
              <li>Once every 24 hours for ongoing sessions</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
