import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, ChevronDown, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/useProjects";
import type { Whiteboard } from "@/hooks/useWhiteboard";

interface WhiteboardHeaderProps {
  whiteboard: Whiteboard | null;
  allWhiteboards: Whiteboard[];
  onUpdateWhiteboard: (params: { name?: string; project_id?: string | null }) => void;
  onCreateWhiteboard: (name: string) => void;
  onSwitchWhiteboard: (id: string) => void;
}

export function WhiteboardHeader({
  whiteboard,
  allWhiteboards,
  onUpdateWhiteboard,
  onCreateWhiteboard,
  onSwitchWhiteboard,
}: WhiteboardHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(whiteboard?.name || "");
  const [newBoardName, setNewBoardName] = useState("");
  const [showNewBoardInput, setShowNewBoardInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { projects = [] } = useProjects();

  useEffect(() => {
    setLocalName(whiteboard?.name || "");
  }, [whiteboard?.name]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (localName.trim() && localName !== whiteboard?.name) {
      onUpdateWhiteboard({ name: localName.trim() });
    } else {
      setLocalName(whiteboard?.name || "");
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameBlur();
    }
    if (e.key === "Escape") {
      setLocalName(whiteboard?.name || "");
      setIsEditingName(false);
    }
  };

  const handleCreateBoard = () => {
    if (newBoardName.trim()) {
      onCreateWhiteboard(newBoardName.trim());
      setNewBoardName("");
      setShowNewBoardInput(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-md">
      <div className="flex items-center gap-md">
        {/* Whiteboard title - inline editable */}
        {isEditingName ? (
          <Input
            ref={inputRef}
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="text-heading-lg font-semibold h-10 w-64"
          />
        ) : (
          <h1
            onClick={() => setIsEditingName(true)}
            className={cn(
              "text-heading-lg font-semibold text-foreground cursor-pointer",
              "hover:text-primary transition-colors"
            )}
            title="Click to edit name"
          >
            {whiteboard?.name || "Untitled Whiteboard"}
          </h1>
        )}

        {/* Project selector */}
        <div className="flex items-center gap-xs">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <Select
            value={whiteboard?.project_id || "none"}
            onValueChange={(v) => onUpdateWhiteboard({ project_id: v === "none" ? null : v })}
          >
            <SelectTrigger className="w-48 h-8 text-body-sm">
              <SelectValue placeholder="Link to project..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-sm">
        {/* Whiteboard selector */}
        {allWhiteboards.length > 1 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-xs">
                Switch Board
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-xs" align="end">
              <div className="space-y-xs">
                {allWhiteboards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => onSwitchWhiteboard(board.id)}
                    className={cn(
                      "w-full text-left px-sm py-xs rounded-md text-body-sm transition-colors",
                      board.id === whiteboard?.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted"
                    )}
                  >
                    {board.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* New whiteboard button */}
        <Popover open={showNewBoardInput} onOpenChange={setShowNewBoardInput}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-xs">
              <Plus className="h-4 w-4" />
              New Board
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-sm" align="end">
            <div className="space-y-sm">
              <Input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Whiteboard name..."
                onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
                autoFocus
              />
              <Button onClick={handleCreateBoard} size="sm" className="w-full">
                Create Whiteboard
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
