import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SortOption = "priority" | "due_time" | "status" | "alphabetical" | "manual";

interface TaskSortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export const TaskSortDropdown = ({ value, onChange }: TaskSortDropdownProps) => {
  const isManualMode = value === "manual";
  
  return (
    <div className="relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority (High→Low)</SelectItem>
                  <SelectItem value="due_time">Due Time (Early→Late)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3 h-3" />
                      Manual Order
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {isManualMode && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 px-1.5 py-0.5 text-metadata pointer-events-none animate-pulse"
                >
                  <GripVertical className="w-3 h-3" />
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          {isManualMode && (
            <TooltipContent>
              <p className="text-metadata">Drag & drop enabled - reorder tasks by dragging</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
