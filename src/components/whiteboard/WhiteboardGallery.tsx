import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Layout, MoreHorizontal, Trash2, Edit2, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Whiteboard } from "@/hooks/useWhiteboard";

interface WhiteboardGalleryProps {
  whiteboards: Whiteboard[];
  onSelectWhiteboard: (id: string) => void;
  onCreateWhiteboard: (name: string) => void;
  onDeleteWhiteboard: (id: string) => void;
  onRenameWhiteboard: (id: string, name: string) => void;
}

export function WhiteboardGallery({
  whiteboards,
  onSelectWhiteboard,
  onCreateWhiteboard,
  onDeleteWhiteboard,
  onRenameWhiteboard,
}: WhiteboardGalleryProps) {
  const [newBoardName, setNewBoardName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Whiteboard | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (newBoardName.trim()) {
      onCreateWhiteboard(newBoardName.trim());
      setNewBoardName("");
      setShowCreateDialog(false);
    }
  };

  const handleRename = () => {
    if (editingBoard && editName.trim()) {
      onRenameWhiteboard(editingBoard.id, editName.trim());
      setEditingBoard(null);
      setEditName("");
    }
  };

  return (
    <div className="p-lg">
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h1 className="text-heading-lg font-semibold text-foreground">Whiteboards</h1>
          <p className="text-muted-foreground text-body-sm mt-xs">
            Select a whiteboard to open or create a new one
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-xs">
          <Plus className="h-4 w-4" />
          New Whiteboard
        </Button>
      </div>

      {whiteboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-md">
            <Layout className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-heading-sm font-medium text-foreground mb-xs">No whiteboards yet</h2>
          <p className="text-muted-foreground text-body-sm mb-md max-w-sm">
            Create your first whiteboard to start brainstorming with sticky notes, text, and connected ideas.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-xs">
            <Plus className="h-4 w-4" />
            Create Whiteboard
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          {whiteboards.map((board) => (
            <Card
              key={board.id}
              className={cn(
                "group relative overflow-hidden cursor-pointer transition-all",
                "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
              )}
              onClick={() => onSelectWhiteboard(board.id)}
            >
              {/* Preview area */}
              <div className="h-32 bg-muted/30 border-b border-border relative">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                      linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                    `,
                    backgroundSize: "20px 20px",
                  }}
                />
                {/* Placeholder preview icons */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Layout className="h-10 w-10 text-muted-foreground/30" />
                </div>
              </div>

              {/* Info area */}
              <div className="p-md">
                <div className="flex items-start justify-between gap-sm">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{board.name}</h3>
                    <div className="flex items-center gap-xs text-muted-foreground text-metadata mt-xs">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(board.updated_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBoard(board);
                          setEditName(board.name);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteWhiteboard(board.id);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Whiteboard</DialogTitle>
          </DialogHeader>
          <div className="py-md">
            <Input
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Whiteboard name..."
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newBoardName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!editingBoard} onOpenChange={(open) => !open && setEditingBoard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Whiteboard</DialogTitle>
          </DialogHeader>
          <div className="py-md">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="New name..."
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBoard(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!editName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
