import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Search } from "lucide-react";
import { useEntityAdRules } from "@/hooks/useEntityAdRules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemEntities } from "@/hooks/useSystemEntities";

export function RuleTestPanel() {
  const { data: systemEntities = [] } = useSystemEntities();
  const entityNames = useMemo(() => systemEntities.map(e => e.name), [systemEntities]);
  const [testEntity, setTestEntity] = useState("");
  const [testText, setTestText] = useState("");
  const { rules, isLoading } = useEntityAdRules(testEntity);
  
  // Set default entity when entities load
  useEffect(() => {
    if (!testEntity && entityNames.length > 0) {
      setTestEntity(entityNames.includes("UAE") ? "UAE" : entityNames[0]);
    }
  }, [entityNames, testEntity]);

  const testResult = () => {
    if (!testText.trim() || !rules) {
      return null;
    }

    const lowerText = testText.toLowerCase();
    const violations: string[] = [];

    // Check prohibited words
    if (Array.isArray(rules.prohibited_words)) {
      rules.prohibited_words.forEach(word => {
        if (lowerText.includes(word.toLowerCase())) {
          violations.push(`Prohibited word: "${word}"`);
        }
      });
    }

    // Check competitor names
    if (Array.isArray(rules.competitor_names)) {
      rules.competitor_names.forEach(name => {
        if (lowerText.includes(name.toLowerCase())) {
          violations.push(`Competitor name: "${name}"`);
        }
      });
    }

    return violations.length === 0 
      ? { allowed: true, message: "Text is compliant ✓" }
      : { allowed: false, violations };
  };

  const result = testResult();

  return (
    <Card className="p-md bg-card border-border">
      <div className="space-y-md">
        <div>
          <h3 className="text-heading-sm font-semibold mb-xs">Test Rule</h3>
          <p className="text-body-sm text-muted-foreground">
            Enter text to test against entity-specific rules
          </p>
        </div>

        <div className="space-y-sm">
          <Label>Entity</Label>
          <Select value={testEntity} onValueChange={setTestEntity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GLOBAL">GLOBAL (fallback)</SelectItem>
              {entityNames.map(entity => (
                <SelectItem key={entity} value={entity}>{entity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-sm">
          <Label htmlFor="test-text">Test Text</Label>
          <Input
            id="test-text"
            placeholder="Enter headline or description to test..."
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>

        {testText.trim() && result && (
          <div className={`p-sm rounded-lg border ${
            result.allowed 
              ? 'bg-success/10 border-success/30' 
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <div className="flex items-start gap-sm">
              {result.allowed ? (
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-xs">
                {result.allowed ? (
                  <p className="text-body-sm font-medium text-success">
                    {result.message}
                  </p>
                ) : (
                  <>
                    <p className="text-body-sm font-medium text-destructive">
                      {result.violations.length} violation(s) found:
                    </p>
                    <ul className="space-y-xs">
                      {result.violations.map((violation, idx) => (
                        <li key={idx} className="text-body-sm text-destructive flex items-center gap-xs">
                          <span className="text-destructive">•</span>
                          {violation}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!testText.trim() && (
          <div className="p-sm rounded-lg bg-muted/30 border border-border/50">
            <p className="text-body-sm text-muted-foreground text-center">
              Enter text above to see validation results
            </p>
          </div>
        )}

        {isLoading && (
          <div className="p-sm rounded-lg bg-muted/30 border border-border/50">
            <p className="text-body-sm text-muted-foreground text-center">
              Loading rules...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
