import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Unlink, 
  Settings2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  ExternalLink,
  Circle,
  Save
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { GoogleSheetPicker } from "@/components/reports/GoogleSheetPicker";
import { 
  useGoogleSheetSyncConfigs, 
  useCreateSyncConfig, 
  useDeleteSyncConfig, 
  useUpdateSyncConfig,
  useSyncGoogleSheet,
  SyncConfig 
} from "@/hooks/useGoogleSheetSync";
import { toast } from "sonner";


interface GoogleSheetSyncPanelProps {
  accessToken: string | null;
  onRequestAuth: () => void;
}

export function GoogleSheetSyncPanel({ accessToken, onRequestAuth }: GoogleSheetSyncPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [clientId, setClientId] = useState(localStorage.getItem("GOOGLE_CLIENT_ID") || "");
  const [apiKey, setApiKey] = useState(localStorage.getItem("GOOGLE_API_KEY") || "");
  const [saving, setSaving] = useState(false);
  const [editingMapping, setEditingMapping] = useState<SyncConfig | null>(null);
  const [columnMapping, setColumnMapping] = useState<{
    name: string;
    landing_page: string;
    campaign_type: string;
    description: string;
  }>({
    name: 'Campaign Name',
    landing_page: 'URL',
    campaign_type: 'Type',
    description: 'Notes',
  });

  const { data: syncConfigs = [], isLoading } = useGoogleSheetSyncConfigs();
  const createConfig = useCreateSyncConfig();
  const deleteConfig = useDeleteSyncConfig();
  const updateConfig = useUpdateSyncConfig();
  const syncSheet = useSyncGoogleSheet();

  const activeSyncConfig = syncConfigs[0];
  const isConfigured = Boolean(localStorage.getItem("GOOGLE_CLIENT_ID") && localStorage.getItem("GOOGLE_API_KEY"));

  // Auto-sync on open if enabled
  useEffect(() => {
    if (activeSyncConfig?.auto_sync_on_open && accessToken && !syncSheet.isPending) {
      syncSheet.mutate({ syncConfigId: activeSyncConfig.id, accessToken });
    }
  }, [activeSyncConfig?.id]);

  const handleSheetSelected = async (sheet: { id: string; name: string; url: string }) => {
    await createConfig.mutateAsync({
      sheet_id: sheet.id,
      sheet_url: sheet.url,
      sheet_name: sheet.name,
      column_mapping: columnMapping,
    });
  };

  const handleSync = () => {
    if (!activeSyncConfig || !accessToken) return;
    syncSheet.mutate({ syncConfigId: activeSyncConfig.id, accessToken });
  };

  const handleDisconnect = () => {
    if (!activeSyncConfig) return;
    deleteConfig.mutate(activeSyncConfig.id);
  };

  const handleSaveMapping = () => {
    if (!editingMapping) return;
    updateConfig.mutate({
      id: editingMapping.id,
      column_mapping: columnMapping,
    });
    setEditingMapping(null);
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    if (!activeSyncConfig) return;
    updateConfig.mutate({
      id: activeSyncConfig.id,
      auto_sync_on_open: enabled,
    });
  };

  const handleSaveConfig = async () => {
    if (!clientId.trim() || !apiKey.trim()) {
      toast.error("Please enter both Client ID and API Key");
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem("GOOGLE_CLIENT_ID", clientId.trim());
      localStorage.setItem("GOOGLE_API_KEY", apiKey.trim());
      toast.success("Configuration saved! Reloading...");
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (config: SyncConfig) => {
    switch (config.sync_status) {
      case 'syncing':
        return <Badge variant="secondary" className="status-pending"><Loader2 className="h-3 w-3 animate-spin mr-1" />Syncing</Badge>;
      case 'success':
        return <Badge variant="secondary" className="status-success"><CheckCircle2 className="h-3 w-3 mr-1" />Synced</Badge>;
      case 'error':
        return <Badge variant="secondary" className="status-destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary" className="status-neutral"><Clock className="h-3 w-3 mr-1" />Idle</Badge>;
    }
  };

  // If not authenticated, check if configured first
  if (!accessToken) {
    // Not configured - show button that opens setup dialog
    if (!isConfigured) {
      return (
        <>
          <Button onClick={() => setShowSetupDialog(true)} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4" />
            Connect Sheet
          </Button>

          <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-sm">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Google Sheets Setup
                </DialogTitle>
                <DialogDescription>
                  Complete the setup below to enable Google Sheets sync
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-lg mt-md">
                {/* Setup Guide */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="step-1">
                    <AccordionTrigger>
                      <div className="flex items-center gap-sm">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <span>Step 1: Create Google Cloud Project</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-sm">
                      <ol className="list-decimal list-inside space-y-sm text-body-sm">
                        <li>
                          Go to{" "}
                          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Google Cloud Console <ExternalLink className="h-3 w-3 inline ml-1" />
                          </a>
                        </li>
                        <li>Click "Select a project" → "New Project"</li>
                        <li>Enter a project name and click "Create"</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step-2">
                    <AccordionTrigger>
                      <div className="flex items-center gap-sm">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <span>Step 2: Enable APIs</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-sm">
                      <ol className="list-decimal list-inside space-y-sm text-body-sm">
                        <li>
                          Go to{" "}
                          <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            API Library <ExternalLink className="h-3 w-3 inline ml-1" />
                          </a>
                        </li>
                        <li>Enable "Google Sheets API" and "Google Picker API"</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step-3">
                    <AccordionTrigger>
                      <div className="flex items-center gap-sm">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <span>Step 3: Create OAuth Client ID</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-sm">
                      <ol className="list-decimal list-inside space-y-sm text-body-sm">
                        <li>
                          Go to{" "}
                          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Credentials <ExternalLink className="h-3 w-3 inline ml-1" />
                          </a>
                        </li>
                        <li>Create OAuth 2.0 Client ID (Web application)</li>
                        <li>Add authorized origin: <code className="text-metadata bg-muted px-xs py-0.5 rounded">{window.location.origin}</code></li>
                        <li>Copy the Client ID</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="step-4">
                    <AccordionTrigger>
                      <div className="flex items-center gap-sm">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                        <span>Step 4: Create API Key</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-sm">
                      <ol className="list-decimal list-inside space-y-sm text-body-sm">
                        <li>On Credentials page, create an API key</li>
                        <li>Optionally restrict it to Google Sheets & Picker APIs</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Separator />

                {/* Config Form */}
                <div className="space-y-md">
                  <h4 className="font-medium text-body">Enter Your Credentials</h4>
                  
                  <div className="space-y-sm">
                    <Label htmlFor="client-id">OAuth 2.0 Client ID</Label>
                    <Input
                      id="client-id"
                      type="text"
                      placeholder="123456789-abc.apps.googleusercontent.com"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="font-mono text-body-sm"
                    />
                  </div>

                  <div className="space-y-sm">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono text-body-sm"
                    />
                  </div>

                  <Button onClick={handleSaveConfig} disabled={saving || !clientId || !apiKey} className="w-full">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save & Connect"}
                  </Button>

                  <p className="text-metadata text-muted-foreground text-center">
                    Credentials are stored locally in your browser only
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    // Configured but not authenticated - proceed with auth
    return (
      <Button onClick={onRequestAuth} variant="outline" size="sm">
        <FileSpreadsheet className="h-4 w-4" />
        Connect Sheet
      </Button>
    );
  }

  // If loading, show loader
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // If no config, show picker trigger
  if (!activeSyncConfig) {
    return (
      <GoogleSheetPicker accessToken={accessToken} onSheetSelected={handleSheetSelected} />
    );
  }

  // Show sync panel
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-sm">
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">{activeSyncConfig.sheet_name}</span>
          {getStatusBadge(activeSyncConfig)}
        </Button>
      </SheetTrigger>
      <SheetContent className="liquid-glass-elevated w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-sm">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Google Sheets Sync
          </SheetTitle>
          <SheetDescription>
            Manage your campaign sync from Google Sheets
          </SheetDescription>
        </SheetHeader>

        <div className="mt-lg space-y-lg">
          {/* Connected Sheet Info */}
          <div className="p-md rounded-lg bg-card border border-border space-y-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{activeSyncConfig.sheet_name}</span>
              </div>
              <a 
                href={activeSyncConfig.sheet_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-xs text-sm"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center gap-sm text-sm text-muted-foreground">
              {getStatusBadge(activeSyncConfig)}
              {activeSyncConfig.last_synced_at && (
                <span>
                  Last synced {formatDistanceToNow(new Date(activeSyncConfig.last_synced_at), { addSuffix: true })}
                </span>
              )}
            </div>
            {activeSyncConfig.sync_error && (
              <p className="text-sm text-destructive-text bg-destructive-soft p-sm rounded">
                {activeSyncConfig.sync_error}
              </p>
            )}
          </div>

          {/* Sync Actions */}
          <div className="flex items-center gap-sm">
            <Button 
              onClick={handleSync} 
              disabled={syncSheet.isPending}
              className="flex-1"
            >
              {syncSheet.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Syncing...</>
              ) : (
                <><RefreshCw className="h-4 w-4" />Sync Now</>
              )}
            </Button>
            <Button 
              onClick={handleDisconnect} 
              variant="outline" 
              className="text-destructive-text hover:bg-destructive-soft"
            >
              <Unlink className="h-4 w-4" />
              Disconnect
            </Button>
          </div>

          <Separator />

          {/* Auto-sync Toggle */}
          <div className="flex items-center justify-between p-md rounded-lg bg-subtle">
            <div>
              <Label className="font-medium">Auto-sync on page open</Label>
              <p className="text-sm text-muted-foreground">Automatically sync when you open Campaign Log</p>
            </div>
            <Switch 
              checked={activeSyncConfig.auto_sync_on_open} 
              onCheckedChange={handleToggleAutoSync}
            />
          </div>

          <Separator />

          {/* Column Mapping */}
          <div className="space-y-md">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-sm">
                  <Settings2 className="h-4 w-4" />
                  Column Mapping
                </h4>
                <p className="text-sm text-muted-foreground">Map your sheet columns to campaign fields</p>
              </div>
              {editingMapping ? (
                <div className="flex gap-xs">
                  <Button size="sm" onClick={handleSaveMapping}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingMapping(null)}>Cancel</Button>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingMapping(activeSyncConfig);
                    const mapping = activeSyncConfig.column_mapping;
                    setColumnMapping({
                      name: mapping.name ?? 'Campaign Name',
                      landing_page: mapping.landing_page ?? 'URL',
                      campaign_type: mapping.campaign_type ?? 'Type',
                      description: mapping.description ?? 'Notes',
                    });
                  }}
                >
                  Edit
                </Button>
              )}
            </div>

            <div className="grid gap-sm">
              {Object.entries(editingMapping ? columnMapping : activeSyncConfig.column_mapping).map(([field, sheetColumn]) => (
                <div key={field} className="flex items-center gap-sm">
                  <Label className="w-32 text-sm capitalize">{field.replace('_', ' ')}</Label>
                  {editingMapping ? (
                    <Input 
                      value={sheetColumn} 
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder="Sheet column name"
                      className="flex-1"
                    />
                  ) : (
                    <span className="text-muted-foreground">{sheetColumn || '—'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          {activeSyncConfig.sync_count > 0 && (
            <>
              <Separator />
              <div className="text-sm text-muted-foreground">
                Total syncs: {activeSyncConfig.sync_count}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}