import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StandardSelect } from "@/components/ui/standard-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Globe, Youtube, Smartphone, Plus, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, Upload, Download } from "lucide-react";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useGdnTargetLists } from "@/hooks/useGdnTargetLists";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TargetListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: any;
  onSave: (data: any) => void;
}

interface LocalItem {
  id: string;
  item_type: "website" | "youtube" | "app";
  url: string;
  name?: string;
  ads_txt_has_google?: boolean | null;
  ads_txt_checked_at?: string | null;
  ads_txt_error?: string | null;
}

export function TargetListDialog({ open, onOpenChange, list, onSave }: TargetListDialogProps) {
  const { data: entities = [] } = useSystemEntities();
  const { createList, addItems, deleteItem, updateItem, getItemsByList } = useGdnTargetLists();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [entity, setEntity] = useState("");
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState("websites");
  const [bulkInput, setBulkInput] = useState("");
  const [localItems, setLocalItems] = useState<LocalItem[]>([]);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());

  // Reset form when dialog opens/closes or list changes
  useEffect(() => {
    if (open) {
      if (list) {
        setName(list.name || "");
        setEntity(list.entity || "");
        setDescription(list.description || "");
        // Load existing items from database
        const existingItems = getItemsByList(list.id);
        setLocalItems(existingItems.map(item => ({
          id: item.id,
          item_type: item.item_type as "website" | "youtube" | "app",
          url: item.url,
          name: item.name || undefined,
          ads_txt_has_google: item.ads_txt_has_google,
          ads_txt_checked_at: item.ads_txt_checked_at,
          ads_txt_error: item.ads_txt_error,
        })));
      } else {
        setName("");
        setEntity("");
        setDescription("");
        setLocalItems([]);
      }
      setBulkInput("");
      setActiveTab("websites");
    }
  }, [open, list]);

  const websiteItems = localItems.filter((i) => i.item_type === "website");
  const youtubeItems = localItems.filter((i) => i.item_type === "youtube");
  const appItems = localItems.filter((i) => i.item_type === "app");

  const handleSave = async () => {
    if (!name.trim() || !entity) {
      toast.error("Name and Entity are required");
      return;
    }

    try {
      if (list) {
        // Update existing list
        onSave({ name, entity, description });
        // Add new items (those with temp- prefix) - include ads.txt check results
        const newItems = localItems.filter(item => item.id.startsWith("temp-"));
        if (newItems.length > 0) {
          await addItems.mutateAsync({
            listId: list.id,
            items: newItems.map(item => ({
              item_type: item.item_type,
              url: item.url,
              name: item.name,
              ads_txt_has_google: item.ads_txt_has_google,
              ads_txt_checked_at: item.ads_txt_checked_at,
              ads_txt_error: item.ads_txt_error,
            })),
          });
        }
      } else {
        // Create new list with items - include ads.txt check results
        const newList = await createList.mutateAsync({ name, entity, description });
        if (newList && localItems.length > 0) {
          await addItems.mutateAsync({
            listId: newList.id,
            items: localItems.map(item => ({
              item_type: item.item_type,
              url: item.url,
              name: item.name,
              ads_txt_has_google: item.ads_txt_has_google,
              ads_txt_checked_at: item.ads_txt_checked_at,
              ads_txt_error: item.ads_txt_error,
            })),
          });
        }
        toast.success("Target list created successfully");
      }
      onSave({ name, entity, description });
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save list");
    }
  };

  const handleAddItems = () => {
    if (!bulkInput.trim()) return;

    const lines = bulkInput.split("\n").filter((l) => l.trim());
    const itemType = activeTab === "websites" ? "website" : activeTab === "youtube" ? "youtube" : "app";
    
    const newItems: LocalItem[] = lines.map((line) => ({
      id: `temp-${Date.now()}-${Math.random()}`,
      item_type: itemType,
      url: line.trim(),
    }));

    setLocalItems(prev => [...prev, ...newItems]);
    setBulkInput("");
    toast.success(`Added ${newItems.length} items`);
  };

  const handleDeleteItem = (itemId: string) => {
    // If editing existing list and item is from DB, delete from DB
    if (list && !itemId.startsWith("temp-")) {
      deleteItem.mutate(itemId);
    }
    setLocalItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleCheckAdsTxt = async (item: LocalItem) => {
    if (item.item_type !== "website") return;
    
    setCheckingIds(prev => new Set(prev).add(item.id));
    try {
      const { data, error } = await supabase.functions.invoke("check-ads-txt", {
        body: { url: item.url, itemId: item.id },
      });
      
      if (error) throw error;
      
      const checkedAt = new Date().toISOString();
      const adsTxtResult = {
        ads_txt_has_google: data.hasGoogle,
        ads_txt_checked_at: checkedAt,
        ads_txt_error: data.error || null,
      };
      
      // Update local state with result
      setLocalItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, ...adsTxtResult } : i
      ));
      
      // For existing DB items (not temp), also save to database directly
      if (!item.id.startsWith("temp-")) {
        updateItem.mutate({
          id: item.id,
          ...adsTxtResult,
        });
      }
      
      if (data.hasGoogle) {
        toast.success("Google found in ads.txt!");
      } else if (data.error) {
        toast.warning(`Error: ${data.error}`);
      } else {
        toast.info("No Google entries found in ads.txt");
      }
    } catch (err) {
      toast.error("Failed to check ads.txt");
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleCheckAllAdsTxt = async () => {
    const uncheckedWebsites = websiteItems.filter((i) => !i.ads_txt_checked_at);
    if (uncheckedWebsites.length === 0) {
      toast.info("All websites already checked");
      return;
    }
    
    toast.info(`Checking ${uncheckedWebsites.length} websites...`);
    for (const item of uncheckedWebsites) {
      await handleCheckAdsTxt(item);
    }
    toast.success("Finished checking all websites");
  };

  const handleExport = () => {
    const csv = [
      "type,url,name,ads_txt_status",
      ...localItems.map((item) => 
        `${item.item_type},"${item.url}","${item.name || ""}",${item.ads_txt_has_google === true ? "google_found" : item.ads_txt_has_google === false ? "no_google" : "not_checked"}`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "target-list"}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(1); // Skip header
      
      const importedItems: LocalItem[] = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const [type, url, itemName] = line.split(",").map((s) => s.replace(/"/g, "").trim());
        if (type && url && ["website", "youtube", "app"].includes(type)) {
          importedItems.push({
            id: `temp-${Date.now()}-${Math.random()}`,
            item_type: type as "website" | "youtube" | "app",
            url,
            name: itemName || undefined,
          });
        }
      }

      if (importedItems.length > 0) {
        setLocalItems(prev => [...prev, ...importedItems]);
        toast.success(`Imported ${importedItems.length} items`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const formatLastChecked = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const renderAdsTxtStatus = (item: LocalItem) => {
    if (checkingIds.has(item.id)) {
      return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
    }
    if (item.ads_txt_error) {
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-warning">
            <AlertCircle className="size-4" />
            <span className="text-xs">{item.ads_txt_error}</span>
          </div>
          {item.ads_txt_checked_at && (
            <span className="text-[10px] text-muted-foreground">{formatLastChecked(item.ads_txt_checked_at)}</span>
          )}
        </div>
      );
    }
    if (item.ads_txt_has_google === true) {
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <CheckCircle2 className="size-3 mr-1" />
            Google
          </Badge>
          {item.ads_txt_checked_at && (
            <span className="text-[10px] text-muted-foreground">{formatLastChecked(item.ads_txt_checked_at)}</span>
          )}
        </div>
      );
    }
    if (item.ads_txt_has_google === false) {
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            <XCircle className="size-3 mr-1" />
            No Google
          </Badge>
          {item.ads_txt_checked_at && (
            <span className="text-[10px] text-muted-foreground">{formatLastChecked(item.ads_txt_checked_at)}</span>
          )}
        </div>
      );
    }
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleCheckAdsTxt(item)}
      >
        Check
      </Button>
    );
  };

  const renderItemsTable = (tableItems: LocalItem[], showAdsTxt: boolean) => (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>URL</TableHead>
            {showAdsTxt && <TableHead className="w-[140px]">ads.txt Status</TableHead>}
            <TableHead className="w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showAdsTxt ? 3 : 2} className="text-center text-muted-foreground py-8">
                No items added yet. Paste URLs above to add them.
              </TableCell>
            </TableRow>
          ) : (
            tableItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm truncate max-w-[300px]">{item.url}</TableCell>
                {showAdsTxt && <TableCell>{renderAdsTxtStatus(item)}</TableCell>}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const entityOptions = entities.map((e) => ({ value: e.name, label: e.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{list ? "Edit Target List" : "Create Target List"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-lg">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-xs">
              <Label>List Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Finance Publishers Q1"
              />
            </div>
            <div className="space-y-2">
              <Label>Entity *</Label>
              <StandardSelect
                value={entity}
                onChange={setEntity}
                placeholder="Select entity"
                options={entityOptions}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          {/* Import/Export and Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-md">
              <Badge variant="secondary">
                <Globe className="size-3 mr-1" />
                {websiteItems.length} Websites
              </Badge>
              <Badge variant="secondary">
                <Youtube className="size-3 mr-1" />
                {youtubeItems.length} YouTube
              </Badge>
              <Badge variant="secondary">
                <Smartphone className="size-3 mr-1" />
                {appItems.length} Apps
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1" />
                Import CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={localItems.length === 0}>
                <Download className="mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* 3 Tabs: Websites, YouTube, Apps - ALWAYS VISIBLE */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="websites" className="gap-2">
                <Globe className="size-4" />
                Websites
              </TabsTrigger>
              <TabsTrigger value="youtube" className="gap-2">
                <Youtube className="size-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="apps" className="gap-2">
                <Smartphone className="size-4" />
                Mobile Apps
              </TabsTrigger>
            </TabsList>

            <TabsContent value="websites" className="space-y-md mt-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Add website URLs. We'll check if they have Google in their ads.txt file.
                </p>
                {websiteItems.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleCheckAllAdsTxt}>
                    <Globe className="mr-1" />
                    Check All ads.txt
                  </Button>
                )}
              </div>
              
              <Textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && bulkInput.trim()) {
                    e.preventDefault();
                    handleAddItems();
                  }
                }}
                placeholder="Paste URLs here (one per line), press Enter to add&#10;example.com&#10;another-site.com"
                rows={3}
              />

              {renderItemsTable(websiteItems, true)}
            </TabsContent>

            <TabsContent value="youtube" className="space-y-md mt-md">
              <p className="text-sm text-muted-foreground">
                Add YouTube channel URLs or IDs for your GDN targeting.
              </p>
              <Textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && bulkInput.trim()) {
                    e.preventDefault();
                    handleAddItems();
                  }
                }}
                placeholder="Paste YouTube channel URLs (one per line)&#10;https://youtube.com/@channel&#10;UCxxxxx"
                rows={4}
              />
            </TabsContent>

            <TabsContent value="apps" className="space-y-md mt-md">
              <p className="text-sm text-muted-foreground">
                Add mobile app store URLs or bundle IDs for your GDN targeting.
              </p>
              <Textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && bulkInput.trim()) {
                    e.preventDefault();
                    handleAddItems();
                  }
                }}
                placeholder="Paste app store URLs or bundle IDs (one per line)&#10;com.example.app&#10;https://play.google.com/store/apps/details?id=..."
                rows={4}
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {list ? "Save Changes" : "Create List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
