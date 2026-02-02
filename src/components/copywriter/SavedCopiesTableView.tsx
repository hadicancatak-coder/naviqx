import { useState, useEffect, useRef, Fragment, MouseEvent } from "react";
import DOMPurify from "dompurify";
import { CopywriterCopy } from "@/hooks/useCopywriterCopies";
import {
  useUpdateCopywriterCopy,
  useDeleteCopywriterCopy,
  useCreateCopywriterCopy,
} from "@/hooks/useCopywriterCopies";
import { syncCopyToPlanners } from "@/lib/copywriterSync";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { CampaignsTagsInput } from "@/components/copywriter/CampaignsTagsInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENTITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { EntitiesMultiSelect } from "./EntitiesMultiSelect";
import { CopywriterBulkActionsBar } from "./CopywriterBulkActionsBar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ELEMENT_TYPES = ["headline", "description", "primary_text"];

const CHAR_LIMITS: Record<string, number | null> = {
  headline: 45,
  primary_text: 120,
  description: null,
};

const formatElementType = (type: string): string => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface SavedCopiesTableViewProps {
  copies: CopywriterCopy[];
  activeLanguages: string[];
  addingNewRow: boolean;
  onNewRowComplete: () => void;
  onRefresh?: () => void;
}

interface NewRowData {
  entity: string[];
  campaigns: string[];
  element_type: string;
  content_en: string;
  content_ar: string;
  content_es: string;
  content_az: string;
  char_limit_en: number | null;
  char_limit_ar: number | null;
  char_limit_es: number | null;
  char_limit_az: number | null;
  status: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  es: "Spanish",
  az: "Azerice",
};

export function SavedCopiesTableView({ 
  copies, 
  activeLanguages,
  addingNewRow,
  onNewRowComplete,
  onRefresh 
}: SavedCopiesTableViewProps) {
  const { user } = useAuth();
  const isGuest = user?.user_metadata?.role === "guest";

  const [selected, setSelected] = useState<string[]>([]);
  const [newRow, setNewRow] = useState<NewRowData | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isAnyEditing, setIsAnyEditing] = useState(false);

  const newRowEnglishRef = useRef<HTMLDivElement>(null);

  const updateMutation = useUpdateCopywriterCopy();
  const deleteMutation = useDeleteCopywriterCopy();
  const createMutation = useCreateCopywriterCopy();

  useEffect(() => {
    setIsAnyEditing(editingCell !== null || newRow !== null);
  }, [editingCell, newRow]);

  useEffect(() => {
    if (addingNewRow && !newRow) {
      setNewRow({
        entity: [],
        campaigns: [],
        element_type: "headline",
        content_en: "",
        content_ar: "",
        content_es: "",
        content_az: "",
        char_limit_en: CHAR_LIMITS.headline,
        char_limit_ar: CHAR_LIMITS.headline,
        char_limit_es: CHAR_LIMITS.headline,
        char_limit_az: CHAR_LIMITS.headline,
        status: "draft",
      });
      setTimeout(() => {
        newRowEnglishRef.current?.focus();
      }, 100);
    }
  }, [addingNewRow, newRow]);

  const handleCancelNewRow = () => {
    setNewRow(null);
    onNewRowComplete();
  };

  const handleSaveNewRow = async () => {
    if (!newRow) return;

    if (!newRow.content_en.trim()) {
      toast({ title: "English content is required", variant: "destructive" });
      return;
    }

    try {
      await createMutation.mutateAsync({
        entity: newRow.entity,
        campaigns: newRow.campaigns,
        element_type: newRow.element_type,
        platform: [],
        content_en: newRow.content_en,
        content_ar: newRow.content_ar,
        content_es: newRow.content_es,
        content_az: newRow.content_az,
        char_limit_en: newRow.char_limit_en,
        char_limit_ar: newRow.char_limit_ar,
        char_limit_es: newRow.char_limit_es,
        char_limit_az: newRow.char_limit_az,
        tags: [],
        region: "",
        status: "draft",
      });
      setNewRow(null);
      onNewRowComplete();
      onRefresh?.();
      toast({ title: "Copy created successfully" });
    } catch (error) {
      toast({ title: "Failed to create copy", variant: "destructive" });
    }
  };

  const handleUpdateField = async (id: string, field: string, value: string | string[] | number | null) => {
    try {
      await updateMutation.mutateAsync({
        id,
        updates: { [field]: value },
      });
      onRefresh?.();
    } catch (error) {
      toast({ title: "Failed to update copy", variant: "destructive" });
    }
  };

  const handleDelete = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (showDeleteConfirm) {
      try {
        await deleteMutation.mutateAsync(showDeleteConfirm);
        onRefresh?.();
        toast({ title: "Copy deleted successfully" });
        setShowDeleteConfirm(null);
      } catch (error) {
        toast({ title: "Failed to delete copy", variant: "destructive" });
      }
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selected.map((id) => deleteMutation.mutateAsync(id)));
      setSelected([]);
      onRefresh?.();
      toast({ title: `${selected.length} copies deleted` });
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      toast({ title: "Failed to delete copies", variant: "destructive" });
    }
  };


  const toggleSelectAll = () => {
    if (selected.length === copies.length) {
      setSelected([]);
    } else {
      setSelected(copies.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getCharCount = (content: string): number => {
    const div = document.createElement("div");
    div.innerHTML = content;
    return div.textContent?.length || 0;
  };

  const getStatusBadge = (count: number, limit: number | null) => {
    if (!limit) return null;
    const diff = limit - count;
    if (diff < 0) {
      return <Badge variant="destructive" className="text-xs">Over by {Math.abs(diff)}</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{diff} left</Badge>;
  };

  const renderLanguageColumns = (copy: CopywriterCopy | null, lang: string, isNewRow: boolean = false) => {
    const contentKey = `content_${lang}` as keyof CopywriterCopy;
    const limitKey = `char_limit_${lang}` as keyof CopywriterCopy;
    const content = isNewRow && newRow ? newRow[contentKey as keyof NewRowData] as string : (copy?.[contentKey] as string || "");
    const limit = isNewRow && newRow ? newRow[limitKey as keyof NewRowData] as number | null : (copy?.[limitKey] as number | null);
    const count = getCharCount(content);
    const cellId = isNewRow ? `new-${lang}` : `${copy?.id}-${lang}`;
    const isEditing = editingCell === cellId;

    return (
      <>
        <TableCell className={cn("min-h-[44px] border-r p-2", lang === "ar" && "text-right")}>
          {isEditing ? (
            <RichTextEditor
              value={content}
              onChange={(val) => {
                if (isNewRow && newRow) {
                  setNewRow({ ...newRow, [contentKey]: val });
                } else if (copy) {
                  handleUpdateField(copy.id, contentKey, val);
                }
              }}
              minHeight="32px"
              className="text-xs"
              onBlur={() => setEditingCell(null)}
              autoFocus
            />
          ) : (
            <div
              className={cn(
                "text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 min-h-[32px] max-h-[120px] overflow-y-auto",
                !content && "text-muted-foreground italic",
                lang === "ar" && "text-right"
              )}
              onClick={() => !isGuest && setEditingCell(cellId)}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || "Click to edit...") }}
              title={content ? (new DOMParser().parseFromString(content, 'text/html')).body.textContent || '' : ''}
            />
          )}
        </TableCell>
        <TableCell className="min-h-[44px] border-r p-2 text-center">
          <span className={cn("text-xs font-mono", count > (limit || Infinity) && "text-destructive font-semibold")}>
            {count}
          </span>
        </TableCell>
        <TableCell className="min-h-[44px] border-r p-2">
          <Input
            type="number"
            value={limit ?? ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : parseInt(e.target.value);
              if (isNewRow && newRow) {
                setNewRow({ ...newRow, [limitKey]: val });
              } else if (copy) {
                handleUpdateField(copy.id, limitKey, val);
              }
            }}
            className="h-7 text-xs text-center border-0"
            placeholder="-"
            disabled={isGuest}
          />
        </TableCell>
      </>
    );
  };

  const allLanguages = ["en", "ar", ...activeLanguages.filter((l) => l !== "en" && l !== "ar")];
  const totalWidth = 50 + 200 + 140 + 100 + allLanguages.length * 390 + 100;

  const handleBulkStatusChange = async (status: string) => {
    try {
      await Promise.all(selected.map(id => 
        updateMutation.mutateAsync({ id, updates: { status } })
      ));
      toast({ title: `Updated ${selected.length} copies to ${status}` });
      setSelected([]);
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleBulkExport = () => {
    const selectedCopies = copies.filter(c => selected.includes(c.id));
    const csv = ["Entity,Campaign,Type,Content EN,Content AR,Content ES,Content AZ"]
      .concat(selectedCopies.map(c => 
        `"${c.entity.join(',')}","${c.campaigns?.join(',') || ''}","${c.element_type}","${c.content_en || ''}","${c.content_ar || ''}","${c.content_es || ''}","${c.content_az || ''}"`
      ))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copywriter-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkSync = async () => {
    try {
      const selectedCopies = copies.filter(c => selected.includes(c.id));
      await Promise.all(selectedCopies.map(copy => syncCopyToPlanners({ copy, languages: activeLanguages as ("en" | "ar" | "es" | "az")[] })));
      toast({ title: `Synced ${selected.length} copies to planners` });
      setSelected([]);
    } catch (error) {
      toast({ title: "Failed to sync copies", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-md">
      <CopywriterBulkActionsBar
        selectedCount={selected.length}
        onClearSelection={() => setSelected([])}
        onDelete={handleBulkDelete}
        onStatusChange={handleBulkStatusChange}
        onExport={handleBulkExport}
        onSyncToPlanner={handleBulkSync}
      />

      <div className="border rounded-lg overflow-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
        <Table style={{ width: `${totalWidth}px`, tableLayout: "fixed" }}>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="border-b-2">
              <TableHead className="h-10 w-[50px] border-r">
                <Checkbox
                  checked={selected.length === copies.length && copies.length > 0}
                  onCheckedChange={toggleSelectAll}
                  disabled={isGuest}
                />
              </TableHead>
              <TableHead className="h-10 w-[200px] border-r text-xs font-semibold">Entity</TableHead>
              <TableHead className="h-10 w-[140px] border-r text-xs font-semibold">Campaign</TableHead>
              <TableHead className="h-10 w-[100px] border-r text-xs font-semibold">Type</TableHead>
              {allLanguages.map((lang) => (
                <Fragment key={lang}>
                  <TableHead key={`${lang}-content`} className="h-10 w-[250px] border-r text-xs font-semibold">
                    {LANGUAGE_LABELS[lang]}
                  </TableHead>
                  <TableHead key={`${lang}-count`} className="h-10 w-[60px] border-r text-xs font-semibold text-center">
                    Count
                  </TableHead>
                  <TableHead key={`${lang}-limit`} className="h-10 w-[80px] border-r text-xs font-semibold text-center">
                    Limit
                  </TableHead>
                </Fragment>
              ))}
              <TableHead className="h-10 w-[100px] text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newRow && (
              <TableRow className="min-h-[44px] border-b bg-primary/5">
                <TableCell className="min-h-[44px] border-r" />
                <TableCell className="min-h-[44px] border-r p-2">
                  <EntitiesMultiSelect
                    value={newRow.entity}
                    onChange={(v) => setNewRow({ ...newRow, entity: v })}
                  />
                </TableCell>
                <TableCell className="min-h-[44px] border-r p-2">
                  <CampaignsTagsInput
                    value={newRow.campaigns}
                    onChange={(v) => setNewRow({ ...newRow, campaigns: v })}
                  />
                </TableCell>
                <TableCell className="min-h-[44px] border-r p-2">
                  <Select value={newRow.element_type} onValueChange={(v) => setNewRow({ ...newRow, element_type: v })}>
                    <SelectTrigger className="h-8 text-xs border-0">
                      <SelectValue>
                        {newRow.element_type ? formatElementType(newRow.element_type) : "Select type..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ELEMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{formatElementType(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                {allLanguages.map((lang) => renderLanguageColumns(null, lang, true))}
                <TableCell className="min-h-[44px] p-2">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      onClick={handleSaveNewRow}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveNewRow();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          handleCancelNewRow();
                        }
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      onClick={handleCancelNewRow}
                    >
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {copies.length === 0 && !newRow ? (
              <TableRow>
                <TableCell colSpan={4 + allLanguages.length * 4 + 1} className="text-center py-8 text-muted-foreground">
                  No copies found. Click "Add Row" to create one.
                </TableCell>
              </TableRow>
            ) : (
              copies.map((copy, idx) => (
                <TableRow
                  key={copy.id}
                  className={cn(
                    "min-h-[44px] border-b",
                    idx % 2 === 0 && "bg-muted/30",
                    isAnyEditing ? "transition-none" : "transition-colors hover:bg-muted/50"
                  )}
                >
                  <TableCell className="min-h-[44px] border-r">
                    <Checkbox
                      checked={selected.includes(copy.id)}
                      onCheckedChange={() => toggleSelect(copy.id)}
                      disabled={isGuest}
                    />
                  </TableCell>
                  <TableCell className="min-h-[44px] border-r p-2">
                    <EntitiesMultiSelect
                      value={copy.entity}
                      onChange={(v) => handleUpdateField(copy.id, "entity", v)}
                      disabled={isGuest}
                    />
                  </TableCell>
                  <TableCell className="min-h-[44px] border-r p-2">
                    <CampaignsTagsInput
                      value={copy.campaigns || []}
                      onChange={(v) => handleUpdateField(copy.id, "campaigns", v)}
                      disabled={isGuest}
                    />
                  </TableCell>
                  <TableCell className="min-h-[44px] border-r p-2">
                    <Select
                      value={copy.element_type}
                      onValueChange={(v) => handleUpdateField(copy.id, "element_type", v)}
                      disabled={isGuest}
                    >
                      <SelectTrigger className="h-8 text-xs border-0">
                        <SelectValue>
                          {formatElementType(copy.element_type)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ELEMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{formatElementType(t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {allLanguages.map((lang) => renderLanguageColumns(copy, lang, false))}
                  <TableCell className="min-h-[44px] p-2">
                    <div className="flex gap-1">
                      <AlertDialog open={showDeleteConfirm === copy.id} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isGuest}
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(copy.id); }}
                          >
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="z-overlay" onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this copy?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={handleDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
