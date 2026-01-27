import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { authPasswordSchema } from "@/lib/validationSchemas";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { GlassBackground } from "@/components/layout/GlassBackground";
import { AuthPageFooter } from "@/components/layout/AuthPageFooter";

const authSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .regex(/@cfi\.trade$/, "Only @cfi.trade email addresses are allowed"),
  password: authPasswordSchema,
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = isLogin 
        ? { email, password }
        : { email, password, name };
      
      authSchema.parse(validationData);

      if (isLogin) {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check MFA status for this user
        const { data: profile } = await supabase
          .from('profiles')
          .select('mfa_enabled, mfa_enrollment_required')
          .eq('user_id', signInData.user.id)
          .single();

        // SECURITY: MFA is mandatory for ALL users
        // If MFA is not enabled, always force setup regardless of mfa_enrollment_required
        if (!profile?.mfa_enabled) {
          toast({
            title: "2FA Setup Required",
            description: "Two-factor authentication is mandatory for all accounts",
          });
          navigate("/mfa-setup");
          return;
        }

        // If MFA is enabled, require verification
        navigate("/mfa-verify");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name: name,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "Please log in to set up two-factor authentication.",
        });
        
        setIsLogin(true);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An error occurred",
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
        {/* Logo & Branding */}
        <div className="text-center mb-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-md">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-heading-lg font-bold text-foreground">Naviqx</h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            {isLogin ? "Welcome back to CFI PerMar" : "Create your CFI account"}
          </p>
        </div>

        <Alert className="mb-lg border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-body-sm text-muted-foreground ml-sm">
            <strong>Security Notice:</strong> Do not use similar passwords across different platforms. 
            Avoid adding any sensitive or personal information.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-md">
          {!isLogin && (
            <div className="space-y-1">
              <label htmlFor="name" className="text-body-sm font-medium text-foreground">
                Your Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}
          
          <div className="space-y-1">
            <label htmlFor="email" className="text-body-sm font-medium text-foreground">
              CFI Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@cfi.trade"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-metadata text-muted-foreground">
              Only @cfi.trade email addresses are accepted
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-body-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {!isLogin && password && (
              <div className="mt-sm">
                <PasswordStrengthIndicator password={password} />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Please wait...
              </>
            ) : isLogin ? (
              "Log In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-lg text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-body-sm text-primary hover:underline transition-smooth"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Log in"}
          </button>
        </div>

        {/* Footer */}
        <AuthPageFooter />
      </Card>
    </GlassBackground>
  );
}
