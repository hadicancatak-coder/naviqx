import * as React from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check, ChevronDown, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  user_id: string;
  name: string;
  username?: string;
  working_days?: number[];
}

interface TaskAssigneeSelectorProps {
  mode: 'create' | 'edit';
  taskId?: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  users: User[];
  disabled?: boolean;
}

export function TaskAssigneeSelector({
  mode,
  taskId,
  selectedIds,
  onSelectionChange,
  users,
  disabled = false,
}: TaskAssigneeSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { user } = useAuth();

  const selectedUsers = React.useMemo(
    () => users.filter((selectedUser) => selectedIds.includes(selectedUser.id)),
    [selectedIds, users],
  );

  const filteredUsers = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((candidate) => {
      const matchesName = candidate.name.toLowerCase().includes(query);
      const matchesUsername = candidate.username?.toLowerCase().includes(query) ?? false;
      return matchesName || matchesUsername;
    });
  }, [searchQuery, users]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const toggleUser = async (userId: string) => {
    const isSelected = selectedIds.includes(userId);
    const newSelection = isSelected
      ? selectedIds.filter(id => id !== userId)
      : [...selectedIds, userId];

    if (mode === 'edit' && taskId) {
      try {
        if (isSelected) {
          // Remove assignee
          const { error } = await supabase
            .from('task_assignees')
            .delete()
            .eq('task_id', taskId)
            .eq('user_id', userId);
          
          if (error) throw error;
          toast.success('Assignee removed');
        } else {
          // Get current user's profile for assigned_by
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user?.id)
            .single();

          if (profile) {
            const { error } = await supabase
              .from('task_assignees')
              .insert({
                task_id: taskId,
                user_id: userId,
                assigned_by: profile.id,
              });
            
            if (error) throw error;
            toast.success('Assignee added');
          }
        }
      } catch (error: unknown) {
        toast.error('Failed to update assignee');
        return;
      }
    }

    onSelectionChange(newSelection);
  };

  const removeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleUser(userId);
  };

  return (
    <div className="space-y-xs">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) {
            setOpen((previousOpen) => !previousOpen);
          }
        }}
        className={cn(
          "flex min-h-[44px] w-full items-center justify-between rounded-md border border-input bg-card px-sm py-xs text-left transition-smooth",
          "hover:bg-accent hover:text-accent-foreground",
          disabled && "pointer-events-none opacity-50",
          selectedUsers.length === 0 && "text-muted-foreground",
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-sm">
          {selectedUsers.length === 0 ? (
            <span className="flex items-center gap-sm">
              <UserPlus className="h-4 w-4" />
              Select assignees
            </span>
          ) : (
            <div className="flex flex-wrap gap-xs">
              {selectedUsers.map((selectedUser) => (
                <Badge
                  key={selectedUser.id}
                  variant="secondary"
                  className="flex items-center gap-xs pr-xs"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-metadata bg-primary/20 text-primary">
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-metadata">{selectedUser.name}</span>
                  {!disabled && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => removeUser(selectedUser.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          removeUser(selectedUser.id, e as unknown as React.MouseEvent);
                        }
                      }}
                      className="rounded-full p-xs transition-smooth hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && !disabled && (
        <div className="rounded-lg border border-border bg-card p-xs shadow-sm">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search users..."
            className="h-9"
          />

          <div className="mt-xs max-h-[250px] space-y-1 overflow-y-auto hide-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="py-md text-center text-body-sm text-muted-foreground">No users found.</div>
            ) : (
              filteredUsers.map((listedUser) => {
                const isSelected = selectedIds.includes(listedUser.id);

                return (
                  <button
                    key={listedUser.id}
                    type="button"
                    onClick={() => void toggleUser(listedUser.id)}
                    className="flex w-full items-center gap-sm rounded-md px-sm py-xs text-left transition-smooth hover:bg-muted"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-metadata bg-primary/10 text-primary">
                        {getInitials(listedUser.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-body-sm font-medium">{listedUser.name}</div>
                      {listedUser.username && (
                        <div className="truncate text-metadata text-muted-foreground">@{listedUser.username}</div>
                      )}
                    </div>

                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border transition-smooth",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
