import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  user_id: string;
  name: string;
  username?: string;
}

interface AssigneeFilterBarProps {
  selectedAssignees: string[];
  onAssigneesChange: (assignees: string[]) => void;
}

export function AssigneeFilterBar({
  selectedAssignees,
  onAssigneesChange,
}: AssigneeFilterBarProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name, username");
    setUsers(data || []);
  };

  const toggleAssignee = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      onAssigneesChange(selectedAssignees.filter((id) => id !== userId));
    } else {
      onAssigneesChange([...selectedAssignees, userId]);
    }
  };

  const clearAssigneeFilters = () => {
    onAssigneesChange([]);
  };

  return (
    <Select
      value={selectedAssignees.length > 0 ? "selected" : "all"}
      onValueChange={(value) => {
        if (value === "all") clearAssigneeFilters();
      }}
    >
      <SelectTrigger className="w-[120px] flex-shrink-0">
        <SelectValue>
          {selectedAssignees.length > 0
            ? `${selectedAssignees.length} selected`
            : "Assignee"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-background z-dropdown">
        <SelectItem value="all">All Assignees</SelectItem>
        {users.map((user) => (
          <div
            key={user.user_id}
            onClick={(e) => {
              e.preventDefault();
              toggleAssignee(user.user_id);
            }}
            className="flex items-center gap-xs px-xs py-1.5 cursor-pointer hover:bg-accent rounded text-body-sm"
          >
            <input
              type="checkbox"
              checked={selectedAssignees.includes(user.user_id)}
              onChange={() => {}}
              className="cursor-pointer"
            />
            <span>{user.username || user.name}</span>
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
