import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  user_id: string;
  name: string;
  email?: string;
}

interface AssigneeSelectorProps {
  users: User[];
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  disabled?: boolean;
}

export function AssigneeSelector({
  users,
  selectedUserId,
  onSelectUser,
  disabled = false,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedUser = users.find((u) => u.user_id === selectedUserId);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between border-2 border-primary/30 hover:border-primary/50"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-metadata">
                  {getInitials(selectedUser.name)}
                </AvatarFallback>
              </Avatar>
              <span>{selectedUser.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
          <UserCircle className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-popover border-2 border-border bg-background shadow-xl" align="start" sideOffset={4}>
        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            <div
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-body-sm outline-none hover:bg-accent hover:text-accent-foreground",
                !selectedUserId && "bg-accent"
              )}
              onClick={() => {
                onSelectUser(null);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2 flex-1">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
                <span>Unassigned</span>
              </div>
              {!selectedUserId && <Check className="h-4 w-4" />}
            </div>

            {users.map((user) => (
              <div
                key={user.user_id}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-body-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  selectedUserId === user.user_id && "bg-accent"
                )}
                onClick={() => {
                  onSelectUser(user.user_id);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-metadata">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.name}</span>
                </div>
                {selectedUserId === user.user_id && <Check className="h-4 w-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
