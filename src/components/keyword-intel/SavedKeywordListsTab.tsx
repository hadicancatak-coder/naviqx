import { useState } from "react";
import { format } from "date-fns";
import { FolderOpen, Trash2, Download, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { DataCard, DataCardHeader } from "@/components/layout/DataCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useKeywordLists, KeywordList, KeywordListItem } from "@/hooks/useKeywordLists";
import { useToast } from "@/hooks/use-toast";

interface SavedKeywordListsTabProps {
  onAnalyzeList?: (items: KeywordListItem[], listName: string) => void;
}

export function SavedKeywordListsTab({ onAnalyzeList }: SavedKeywordListsTabProps) {
  const { toast } = useToast();
  const { lists, isLoading, deleteList, getListItems } = useKeywordLists();
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [listItems, setListItems] = useState<KeywordListItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [analyzingListId, setAnalyzingListId] = useState<string | null>(null);

  const handleToggleExpand = async (listId: string) => {
    if (expandedListId === listId) {
      setExpandedListId(null);
      setListItems([]);
      return;
    }

    setExpandedListId(listId);
    setLoadingItems(true);
    try {
      const items = await getListItems(listId);
      setListItems(items);
    } catch (error) {
      toast({ title: "Error loading items", variant: "destructive" });
    } finally {
      setLoadingItems(false);
    }
  };

  const handleAnalyzeList = async (list: KeywordList) => {
    setAnalyzingListId(list.id);
    try {
      const items = await getListItems(list.id);
      if (items.length === 0) {
        toast({ title: "No keywords in this list", variant: "destructive" });
        return;
      }
      
      if (onAnalyzeList) {
        onAnalyzeList(items, list.name);
        toast({ title: "Keywords loaded for analysis", description: `${items.length} keywords ready to analyze` });
      } else {
        toast({ title: "Analysis not available", description: "Switch to the Upload tab to analyze keywords", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error loading list for analysis", variant: "destructive" });
    } finally {
      setAnalyzingListId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteList.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
    if (expandedListId === deleteConfirmId) {
      setExpandedListId(null);
      setListItems([]);
    }
  };

  const exportListToCSV = (list: KeywordList, items: KeywordListItem[]) => {
    const headers = [
      "Keyword",
      "Score",
      "Campaign",
      "Ad Group",
      "Match Type",
      "Clicks",
      "Impressions",
      "CTR",
      "Cost",
      "Conversions",
      "Notes",
    ];
    const rows = items.map((item) => [
      `"${item.keyword}"`,
      item.opportunity_score || 0,
      `"${item.campaign || ""}"`,
      `"${item.ad_group || ""}"`,
      item.match_type || "",
      item.clicks,
      item.impressions,
      item.ctr ? (item.ctr * 100).toFixed(2) + "%" : "",
      item.cost?.toFixed(2) || "",
      item.conversions || 0,
      `"${item.notes || ""}"`,
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${list.name.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">-</Badge>;
    if (score >= 70) return <Badge className="bg-success/15 text-success border-success/30">{score}</Badge>;
    if (score >= 40) return <Badge className="bg-warning/15 text-warning border-warning/30">{score}</Badge>;
    return <Badge variant="secondary">{score}</Badge>;
  };

  // Group lists by entity
  const listsByEntity = lists.reduce((acc, list) => {
    const entity = list.entity || "Other";
    if (!acc[entity]) acc[entity] = [];
    acc[entity].push(list);
    return acc;
  }, {} as Record<string, KeywordList[]>);

  if (isLoading) {
    return (
      <DataCard>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Loading saved lists...
        </div>
      </DataCard>
    );
  }

  if (lists.length === 0) {
    return (
      <DataCard>
        <EmptyState
          icon={FolderOpen}
          title="No saved keyword lists"
          description="Upload and analyze search terms, then save your analysis for future reference"
        />
      </DataCard>
    );
  }

  return (
    <>
      <DataCard>
        <DataCardHeader
          title={`Saved Keyword Lists (${lists.length})`}
          description="Your saved keyword analyses organized by trading entity"
        />
        <ScrollArea className="h-[500px]">
          <div className="space-y-lg">
            {Object.entries(listsByEntity).map(([entity, entityLists]) => (
              <div key={entity}>
                <h3 className="text-heading-sm font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">{entity}</Badge>
                  <span className="text-muted-foreground text-sm font-normal">
                    {entityLists.length} {entityLists.length === 1 ? "list" : "lists"}
                  </span>
                </h3>
                <div className="space-y-xs">
                  {entityLists.map((list) => (
                    <Collapsible
                      key={list.id}
                      open={expandedListId === list.id}
                      onOpenChange={() => handleToggleExpand(list.id)}
                    >
                      <div className="border border-border rounded-lg overflow-hidden">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-md bg-elevated hover:bg-card-hover transition-smooth">
                            <div className="flex items-center gap-3">
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                              <div className="text-left">
                                <p className="font-medium">{list.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(list.created_at), "MMM d, yyyy")} · {list.keyword_count} keywords
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeList(list);
                                }}
                                disabled={analyzingListId === list.id}
                              >
                                {analyzingListId === list.id ? (
                                  <span className="flex items-center gap-1">
                                    <span className="animate-spin">⏳</span>
                                    Loading...
                                  </span>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Analyze Now
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (expandedListId === list.id && listItems.length > 0) {
                                    exportListToCSV(list, listItems);
                                  } else {
                                    toast({ title: "Expand the list first to export" });
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(list.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              {expandedListId === list.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-border">
                            {loadingItems ? (
                              <div className="p-md text-center text-muted-foreground">Loading keywords...</div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Keyword</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Campaign</TableHead>
                                    <TableHead>Clicks</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Conv.</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {listItems.slice(0, 50).map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-medium max-w-[200px] truncate">
                                        {item.keyword}
                                      </TableCell>
                                      <TableCell>{getScoreBadge(item.opportunity_score)}</TableCell>
                                      <TableCell className="max-w-[150px] truncate text-muted-foreground">
                                        {item.campaign}
                                      </TableCell>
                                      <TableCell>{item.clicks}</TableCell>
                                      <TableCell>${item.cost?.toFixed(0) || 0}</TableCell>
                                      <TableCell>{item.conversions || 0}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                            {listItems.length > 50 && (
                              <div className="p-3 text-center text-sm text-muted-foreground border-t border-border">
                                Showing first 50 of {listItems.length} keywords. Export to view all.
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DataCard>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this keyword list?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All keywords in this list will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
