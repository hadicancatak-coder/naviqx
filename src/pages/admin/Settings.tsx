import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAllowedDomains } from "@/hooks/useAppSettings";
import { Mail, Plus, X, Shield, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { allowedDomains, isLoading, addDomain, removeDomain, isUpdating } = useAllowedDomains();
  const [newDomain, setNewDomain] = useState("");
  const { toast } = useToast();

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
    const normalized = newDomain.toLowerCase().replace(/^@/, '');
    
    if (!domainRegex.test(normalized)) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain (e.g., example.com)",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await addDomain(normalized);
      setNewDomain("");
    } catch (error: unknown) {
      toast({
        title: "Error adding domain",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    if (allowedDomains.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "At least one domain must remain allowed for signups.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await removeDomain(domain);
    } catch (error: unknown) {
      toast({
        title: "Error removing domain",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Allowed Email Domains */}
      <Card className="p-lg">
        <div className="flex items-center gap-sm mb-md">
          <div className="p-sm rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-heading-sm font-semibold">Allowed Email Domains</h3>
            <p className="text-body-sm text-muted-foreground">
              Users can only sign up with email addresses from these domains
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-sm mb-md">
          {allowedDomains.map((domain) => (
            <Badge
              key={domain}
              variant="secondary"
              className="gap-xs pr-xs text-body-sm py-xs px-sm"
            >
              @{domain}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-xs hover:bg-destructive/20 hover:text-destructive"
                onClick={() => handleRemoveDomain(domain)}
                disabled={isUpdating || allowedDomains.length <= 1}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-sm">
          <Input
            placeholder="Enter domain (e.g., example.com)"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            className="max-w-xs"
          />
          <Button
            onClick={handleAddDomain}
            disabled={!newDomain.trim() || isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-sm" />
            ) : (
              <Plus className="h-4 w-4 mr-sm" />
            )}
            Add Domain
          </Button>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="p-lg">
        <div className="flex items-center gap-sm mb-md">
          <div className="p-sm rounded-lg bg-success/10">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="text-heading-sm font-semibold">Security</h3>
            <p className="text-body-sm text-muted-foreground">
              Security settings for the application
            </p>
          </div>
        </div>

        <div className="space-y-md">
          <div className="flex items-center justify-between p-md rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Multi-Factor Authentication</p>
              <p className="text-body-sm text-muted-foreground">
                Required for all users during signup
              </p>
            </div>
            <Badge variant="default" className="gap-xs">
              <Shield className="h-3 w-3" />
              Enforced
            </Badge>
          </div>

          <div className="flex items-center justify-between p-md rounded-lg bg-muted/50">
            <div>
              <p className="font-medium">Email Domain Restriction</p>
              <p className="text-body-sm text-muted-foreground">
                Only allowed domains can register
              </p>
            </div>
            <Badge variant="default" className="gap-xs">
              <Shield className="h-3 w-3" />
              Active
            </Badge>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-md border-amber-500/30 bg-amber-500/5">
        <div className="flex gap-sm">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-xs" />
          <div>
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Domain Validation
            </p>
            <p className="text-body-sm text-muted-foreground">
              Email domain restrictions are enforced at signup. Existing users with non-matching domains 
              will not be affected. The signup form validates email domains against this list.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
