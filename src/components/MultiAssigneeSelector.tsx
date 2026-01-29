import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserPlus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";

interface User {
  id: string;        // profiles.id
  user_id: string;
  name: string;
  username?: string;
}

interface MultiAssigneeSelectorProps {
  entityType: "task" | "project" | "campaign" | "blocker";
  entityId: string;
  assignees: User[];
  onAssigneesChange: () => void;
  disabled?: boolean;
}

export function MultiAssigneeSelector({
  entityType,
  entityId,
  assignees,
  onAssigneesChange,
  disabled = false,
}: MultiAssigneeSelectorProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, name, username");
    setUsers(data || []);
  };

  const handleAssign = async (profileId: string) => {
    // Get current user's profile.id (not auth.uid)
    const { data: currentUserData } = await supabase.auth.getUser();
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", currentUserData?.user?.id)
      .single();

    if (!currentUserProfile) {
      toast({
        title: "Error",
        description: "You must be logged in to assign",
        variant: "destructive",
      });
      return;
    }

    let error: any = null;

    if (entityType === "task") {
      const { error: err } = await supabase.from("task_assignees").insert({
        task_id: entityId,
        user_id: profileId,
        assigned_by: currentUserProfile.id,
      });
      error = err;
    } else if (entityType === "project") {
      const { error: err } = await supabase.from("project_assignees").insert({
        project_id: entityId,
        user_id: profileId,
        assigned_by: currentUserProfile.id,
      });
      error = err;
    } else if (entityType === "campaign") {
      const { error: err } = await supabase.from("campaign_assignees").insert({
        campaign_id: entityId,
        user_id: profileId,
        assigned_by: currentUserProfile.id,
      });
      error = err;
    } else if (entityType === "blocker") {
      const { error: err } = await supabase.from("blocker_assignees").insert({
        blocker_id: entityId,
        user_id: profileId,
        assigned_by: currentUserProfile.id,
      });
      error = err;
    }

    if (error) {
      logger.error('Assignment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User assigned successfully",
      });
      onAssigneesChange();
    }
  };

  const handleUnassign = async (profileId: string) => {
    let error: any = null;

    if (entityType === "task") {
      const { error: err } = await supabase
        .from("task_assignees")
        .delete()
        .eq("task_id", entityId)
        .eq("user_id", profileId);
      error = err;
    } else if (entityType === "project") {
      const { error: err } = await supabase
        .from("project_assignees")
        .delete()
        .eq("project_id", entityId)
        .eq("user_id", profileId);
      error = err;
    } else if (entityType === "campaign") {
      const { error: err } = await supabase
        .from("campaign_assignees")
        .delete()
        .eq("campaign_id", entityId)
        .eq("user_id", profileId);
      error = err;
    } else if (entityType === "blocker") {
      const { error: err } = await supabase
        .from("blocker_assignees")
        .delete()
        .eq("blocker_id", entityId)
        .eq("user_id", profileId);
      error = err;
    }

    if (error) {
      logger.error('Unassignment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unassign user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "User unassigned successfully",
      });
      onAssigneesChange();
    }
  };

  const availableUsers = users.filter(
    (u) => !assignees.find((a) => a.id === u.id)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-wrap items-center gap-xs">
      {assignees.map((assignee) => (
        <Badge
          key={assignee.id}
          variant="secondary"
          className="gap-xs pr-xs pl-sm py-xs"
        >
          <Avatar className="h-4 w-4">
            <AvatarFallback className="text-[8px]">
              {getInitials(assignee.name)}
            </AvatarFallback>
          </Avatar>
          <span 
            className="text-metadata cursor-pointer hover:underline" 
            onClick={() => navigate(`/profile/${assignee.user_id}`)}
          >
            {assignee.username || assignee.name}
          </span>
          {!disabled && (
            <button
              onClick={() => handleUnassign(assignee.id)}
              className="hover:bg-background/50 rounded-full p-0.5 ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}

      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-sm gap-xs text-metadata"
            >
              <UserPlus className="h-3 w-3" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-sm bg-background" align="start">
            <ScrollArea className="max-h-64">
              <div className="space-y-xs pr-sm">
                {availableUsers.length > 0 ? (
                  availableUsers.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => {
                        handleAssign(user.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-body-sm rounded hover:bg-accent transition-smooth"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-body-sm text-muted-foreground p-3 text-center">
                    All users assigned
                  </div>
                )}
              </div>
            </ScrollArea>
            {availableUsers.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            )}
          </PopoverContent>
        </Popover>
      )}

      {assignees.length === 0 && disabled && (
        <span className="text-metadata text-muted-foreground">No assignees</span>
      )}
    </div>
  );
}