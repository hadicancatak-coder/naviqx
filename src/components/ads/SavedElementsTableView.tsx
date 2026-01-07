import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Trash, Edit2, Star, ArrowUpDown } from "lucide-react";
import { useUpdateAdElement, useDeleteAdElement } from "@/hooks/useAdElements";
import { toast } from "@/hooks/use-toast";
import { getStatusColor } from "@/lib/constants";
import { UpdateGoogleStatusDialog } from "./UpdateGoogleStatusDialog";
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

interface SavedElementsTableViewProps {
  elements: any[];
  onRefresh?: () => void;
}

export function SavedElementsTableView({ elements, onRefresh }: SavedElementsTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'use_count' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const updateElement = useUpdateAdElement();
  const deleteElement = useDeleteAdElement();

  const sortedElements = [...elements].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = (field: 'use_count' | 'created_at') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === elements.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(elements.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const handleToggleFavorite = async (element: any) => {
    await updateElement.mutateAsync({
      id: element.id,
      updates: { is_favorite: !element.is_favorite }
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showDeleteConfirm) {
      await deleteElement.mutateAsync(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await Promise.all(selectedIds.map(id => deleteElement.mutateAsync(id)));
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
  };

  // Status color now centralized in constants.ts

  return (
    <div className="space-y-md">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-body-sm font-medium">{selectedIds.length} selected</span>
          <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setShowBulkDeleteConfirm(true); }}>
                <Trash className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="z-overlay" onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.length} elements?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === elements.length && elements.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('use_count')}>
                <div className="flex items-center gap-1">
                  Uses <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort('created_at')}>
                <div className="flex items-center gap-1">
                  Created <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedElements.map((element) => (
              <TableRow key={element.id} className="hover:bg-muted/50 transition-smooth">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(element.id)}
                    onCheckedChange={() => toggleSelect(element.id)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleToggleFavorite(element)}
                  >
                    <Star className={element.is_favorite ? 'fill-amber text-amber' : ''} />
                  </Button>
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="line-clamp-2 text-body-sm">{element.content?.text || element.content}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {element.entity?.slice(0, 2).map((ent: string) => (
                      <Badge key={ent} variant="outline" className="text-metadata">{ent}</Badge>
                    ))}
                    {element.entity?.length > 2 && (
                      <Badge variant="outline" className="text-metadata">+{element.entity.length - 2}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-metadata">{element.language || 'EN'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-metadata cursor-pointer ${getStatusColor(element.google_status)}`}
                    onClick={() => {
                      setSelectedElement(element);
                      setStatusDialogOpen(true);
                    }}
                  >
                    {element.google_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-body-sm text-muted-foreground">
                  {element.use_count || 0}
                </TableCell>
                <TableCell className="text-body-sm text-muted-foreground">
                  {new Date(element.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleCopy(element.content?.text || element.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <AlertDialog open={showDeleteConfirm === element.id} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(element.id); }}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="z-overlay" onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this element?</AlertDialogTitle>
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
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedElement && (
        <UpdateGoogleStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          element={selectedElement}
        />
      )}
    </div>
  );
}
