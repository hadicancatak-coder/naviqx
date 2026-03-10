import { useState } from "react";
import { Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProfileUser {
  id: string;
  user_id: string;
  name: string;
  username?: string;
}

interface BulkRowAssigneePopoverProps {
  users: ProfileUser[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function BulkRowAssigneePopover({
  users,
  selectedIds,
  onSelectionChange,
}: BulkRowAssigneePopoverProps) {
  const [open, setOpen] = useState(false);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const toggleUser = (userId: string) => {
    const newSelection = selectedIds.includes(userId)
      ? selectedIds.filter((id) => id !== userId)
      : [...selectedIds, userId];
    onSelectionChange(newSelection);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            "shrink-0",
            selectedIds.length > 0
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={
            selectedIds.length > 0
              ? `${selectedIds.length} assignee(s)`
              : "Assign users"
          }
        >
          <Users className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0 bg-popover z-popover" align="end">
        <Command>
          <CommandInput placeholder="Search users..." className="h-9" />
          <CommandList className="max-h-[200px] hide-scrollbar">
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <CommandItem
                    key={u.id}
                    value={u.name}
                    onSelect={() => toggleUser(u.id)}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-body-sm truncate">{u.name}</span>
                    <div
                      className={cn(
                        "flex items-center justify-center h-4 w-4 rounded border transition-smooth",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
