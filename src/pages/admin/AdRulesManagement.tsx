import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, RotateCcw } from "lucide-react";
import { useEntityAdRules } from "@/hooks/useEntityAdRules";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { toast } from "sonner";
import { RuleTestPanel } from "@/components/admin/RuleTestPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdRulesManagement() {
  const [selectedEntity, setSelectedEntity] = useState("GLOBAL");
  const { rules, allRules, updateRules } = useEntityAdRules(selectedEntity);
  const { data: entities } = useSystemEntities();

  const [prohibitedWords, setProhibitedWords] = useState(
    rules?.prohibited_words?.join('\n') || ''
  );
  const [competitorNames, setCompetitorNames] = useState(
    rules?.competitor_names?.join('\n') || ''
  );

  // Update local state when rules change
  useState(() => {
    if (rules) {
      setProhibitedWords(rules.prohibited_words.join('\n'));
      setCompetitorNames(rules.competitor_names.join('\n'));
    }
  });

  const handleSave = () => {
    updateRules.mutate({
      entity: selectedEntity,
      prohibited_words: prohibitedWords.split('\n').filter(w => w.trim().length > 0),
      competitor_names: competitorNames.split('\n').filter(c => c.trim().length > 0),
    });
  };

  const handleReset = () => {
    if (rules) {
      setProhibitedWords(rules.prohibited_words.join('\n'));
      setCompetitorNames(rules.competitor_names.join('\n'));
      toast.info("Reset to current saved values");
    }
  };

  return (
    <div className="space-y-md">
      <div>
        <h2 className="text-page-title">Ad Rules Management</h2>
        <p className="text-body text-muted-foreground mt-sm">
          Configure prohibited words, competitor names, and validation rules per entity
        </p>
      </div>

      {/* Rules Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-lg">Rules Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Prohibited Words</TableHead>
                <TableHead>Competitor Names</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRules?.map((rule) => (
                <TableRow key={rule.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEntity(rule.entity)}>
                  <TableCell>
                    <div className="flex items-center gap-sm">
                      {rule.entity === 'GLOBAL' && (
                        <Badge variant="outline" className="text-metadata">Default</Badge>
                      )}
                      <span className="font-medium">{rule.entity}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {Array.isArray(rule.prohibited_words) ? rule.prohibited_words.length : 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {Array.isArray(rule.competitor_names) ? rule.competitor_names.length : 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-body-sm text-muted-foreground">
                    {new Date(rule.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity(rule.entity);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Test Panel */}
      <RuleTestPanel />

      <Card>
        <CardHeader>
          <CardTitle className="text-heading-lg flex items-center gap-sm">
            <Settings className="h-5 w-5 text-primary" />
            Entity Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-sm">
            <Label>Select Entity</Label>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GLOBAL">
                  <div className="flex items-center gap-sm">
                    <Badge variant="outline">Default</Badge>
                    GLOBAL (All Entities)
                  </div>
                </SelectItem>
                {entities?.map((entity) => (
                  <SelectItem key={entity.id} value={entity.name}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-metadata text-muted-foreground">
              {selectedEntity === "GLOBAL"
                ? "These rules apply to all entities unless overridden"
                : `Rules specific to ${selectedEntity} (merges with GLOBAL rules)`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="prohibited" className="space-y-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prohibited">Prohibited Words</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
        </TabsList>

        <TabsContent value="prohibited" className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-md">Prohibited Words & Phrases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-sm">
                <Label>Banned Terms (one per line)</Label>
                <Textarea
                  value={prohibitedWords}
                  onChange={(e) => setProhibitedWords(e.target.value)}
                  placeholder="#1&#10;guaranteed profits&#10;no risk&#10;free money&#10;get rich quick"
                  rows={10}
                  className="font-mono text-body-sm"
                />
                <div className="text-metadata text-muted-foreground">
                  Terms that should not appear in any ad copy. Case-insensitive matching.
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Button onClick={handleSave} disabled={updateRules.isPending}>
                  <Save className="h-4 w-4 mr-xs" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-xs" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-md">Competitor Names</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-sm">
                <Label>Competitor Brands (one per line)</Label>
                <Textarea
                  value={competitorNames}
                  onChange={(e) => setCompetitorNames(e.target.value)}
                  placeholder="competitor1&#10;competitor2&#10;competitor3"
                  rows={10}
                  className="font-mono text-body-sm"
                />
                <div className="text-metadata text-muted-foreground">
                  Competitor brand names that should not be referenced in ads. Case-insensitive matching.
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Button onClick={handleSave} disabled={updateRules.isPending}>
                  <Save className="h-4 w-4 mr-xs" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-xs" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary of All Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">All Entity Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-sm">
            {allRules?.map((rule) => (
              <div
                key={rule.id}
                className="p-sm rounded-md border border-border bg-card hover:bg-card-hover transition-smooth"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-body">
                    {rule.entity}
                    {rule.entity === "GLOBAL" && (
                      <Badge variant="outline" className="ml-sm">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-xs">
                    <Badge variant="outline">
                      {rule.prohibited_words.length} prohibited
                    </Badge>
                    <Badge variant="outline">
                      {rule.competitor_names.length} competitors
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
