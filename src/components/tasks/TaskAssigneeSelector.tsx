import * as React from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check, ChevronDown, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const { user } = useAuth();

  const selectedUsers = users.filter(u => selectedIds.includes(u.id));

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
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "flex items-center w-full justify-between min-h-[44px] h-auto py-2 px-3 rounded border border-input bg-background",
            "hover:bg-accent hover:text-accent-foreground transition-smooth cursor-pointer",
            disabled && "pointer-events-none opacity-50",
            selectedUsers.length === 0 && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-sm flex-wrap flex-1">
            {selectedUsers.length === 0 ? (
              <span className="flex items-center gap-sm">
                <UserPlus className="h-4 w-4" />
                Select assignees
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((selectedUser) => (
                  <Badge
                    key={selectedUser.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 pr-1 py-0.5"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
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
                          if (e.key === 'Enter') {
                            removeUser(selectedUser.id, e as unknown as React.MouseEvent);
                          }
                        }}
                        className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive p-xs transition-smooth cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-popover z-popover" align="start">
        <Command>
          <CommandInput placeholder="Search users..." className="h-10" />
          <CommandList className="max-h-[250px] hide-scrollbar">
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <CommandItem
                    key={u.id}
                    value={u.name}
                    onSelect={() => toggleUser(u.id)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-metadata bg-primary/10 text-primary">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-body-sm truncate">{u.name}</div>
                      {u.username && (
                        <div className="text-metadata text-muted-foreground truncate">@{u.username}</div>
                      )}
                    </div>
                    <div className={cn(
                      "flex items-center justify-center h-5 w-5 rounded border transition-smooth",
                      isSelected 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-input"
                    )}>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
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
