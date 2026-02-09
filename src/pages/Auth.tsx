import { useState, useEffect, useMemo } from "react";
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
import { logger } from "@/lib/logger";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>(['cfi.trade']);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch allowed domains on mount
  useEffect(() => {
    const fetchAllowedDomains = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'allowed_email_domains')
          .maybeSingle();
        
        if (!error && data?.value && Array.isArray(data.value)) {
          // Cast to string array explicitly
          const domains = (data.value as unknown[]).filter(
            (d): d is string => typeof d === 'string'
          );
          if (domains.length > 0) {
            setAllowedDomains(domains);
          }
        }
      } catch (err) {
        logger.error('Error fetching allowed domains:', err);
        // Fall back to default
      }
    };
    
    fetchAllowedDomains();
  }, []);

  // Create dynamic schema based on allowed domains
  // For login: only validate email format (password validation happens server-side)
  // For signup: validate email + strong password requirements
  const authSchema = useMemo(() => {
    const domainPattern = allowedDomains.map(d => d.replace('.', '\\.')).join('|');
    const regex = new RegExp(`@(${domainPattern})$`, 'i');
    const domainList = allowedDomains.map(d => `@${d}`).join(', ');
    
    const emailSchema = z.string()
      .email("Invalid email address")
      .refine(
        (email) => regex.test(email),
        `Only ${domainList} email addresses are allowed`
      );
    
    return {
      login: z.object({
        email: emailSchema,
        password: z.string().min(1, "Password is required"), // Simple validation for login
      }),
      signup: z.object({
        email: emailSchema,
        password: authPasswordSchema, // Strong validation for signup
        name: z.string()
          .min(1, "Name is required")
          .max(100, "Name must not exceed 100 characters"),
      }),
    };
  }, [allowedDomains]);

  useEffect(() => {
    const checkExistingSession = async () => {
      // ISSUE 4 FIX: Use getUser() instead of getSession() for reliable server validation
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // No valid session, stay on auth page
        return;
      }
      
      // User is already logged in - check their MFA status
      const { data: profile } = await supabase
        .from('profiles')
        .select('mfa_enabled')
        .eq('user_id', user.id)
        .single();

      if (!profile?.mfa_enabled) {
        navigate("/mfa-setup", { replace: true });
      } else {
        // Check if they have a valid MFA session token
        const mfaToken = localStorage.getItem('mfa_session_data');
        if (mfaToken) {
          try {
            const parsed = JSON.parse(mfaToken);
            if (parsed.token && new Date(parsed.expiresAt) > new Date()) {
              navigate("/", { replace: true }); // Valid MFA session, go to home
              return;
            }
          } catch {
            // Invalid token format, need to verify
          }
        }
        navigate("/mfa-verify", { replace: true });
      }
    };
    
    checkExistingSession();
    // No onAuthStateChange listener - handleSubmit handles navigation after login
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationData = isLogin 
        ? { email, password }
        : { email, password, name };
      
      // Use appropriate schema based on login vs signup
      const schema = isLogin ? authSchema.login : authSchema.signup;
      schema.parse(validationData);

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
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : "An error occurred";
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
        {/* Logo & Branding */}
        <div className="text-center mb-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-md">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-heading-lg font-bold text-foreground">Naviqx</h1>
          <p className="text-body-sm text-muted-foreground">
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
            <div className="flex flex-col gap-xs">
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
          
          <div className="flex flex-col gap-xs">
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
              Only {allowedDomains.map(d => `@${d}`).join(', ')} email addresses are accepted
            </p>
          </div>

          <div className="flex flex-col gap-xs">
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
                <Loader2 className="h-4 w-4 animate-spin" />
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
