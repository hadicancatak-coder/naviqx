import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface User {
  user_id: string;
  name: string;
  username?: string;
}

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  minRows?: number;
  maxRows?: number;
  noPortal?: boolean; // When true, renders dropdown inline (for use inside dialogs)
  assigneeIds?: string[]; // User IDs of task assignees for @all functionality
}

export function MentionAutocomplete({
  value,
  onChange,
  users,
  placeholder,
  className,
  onKeyDown: externalOnKeyDown,
  onBlur,
  minRows = 2,
  maxRows = 6,
  noPortal = false,
  assigneeIds = [],
}: MentionAutocompleteProps) {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [filteredUsers, setFilteredUsers] = React.useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 });
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const lineHeight = 24;
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    }
  }, [value, minRows, maxRows]);

  // Calculate dropdown position
  const updateDropdownPosition = React.useCallback(() => {
    if (textareaRef.current && containerRef.current) {
      if (noPortal) {
        // Position relative to container for inline rendering
        setDropdownPosition({
          top: textareaRef.current.offsetHeight + 4,
          left: 0,
        });
      } else {
        // Fixed position for document.body portal
        const rect = textareaRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
    }
  }, [noPortal]);

  // Check if @all option should be shown (only when there are assignees)
  const showAllOption = React.useMemo(() => {
    return assigneeIds.length > 0;
  }, [assigneeIds]);

  // Detect @ and filter users
  React.useEffect(() => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\w*)$/);
    
    if (match) {
      const query = match[1].toLowerCase();
      const filtered = users.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.username?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
      // Show dropdown if we have filtered users OR if "all" matches the query and we have assignees
      const allMatches = showAllOption && 'all'.includes(query);
      setShowDropdown(filtered.length > 0 || allMatches);
      setSelectedIndex(0);
      updateDropdownPosition();
    } else {
      setShowDropdown(false);
    }
  }, [value, cursorPosition, users, updateDropdownPosition, showAllOption]);

  // Track cursor position
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart || 0);
  };

  const handleClick = () => {
    setCursorPosition(textareaRef.current?.selectionStart || 0);
  };

  // Insert selected user
  const insertMention = (user: User) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const username = user.username || user.name.toLowerCase().replace(/\s+/g, '');
    const newValue = 
      textBeforeCursor.substring(0, lastAtIndex) + 
      `@${username} ` + 
      textAfterCursor;
    
    onChange(newValue);
    setShowDropdown(false);
    
    // Set focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = lastAtIndex + username.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Insert @all - mentions all assignees
  const insertAllMention = () => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Get all assignee usernames
    const assigneeUsers = users.filter(u => assigneeIds.includes(u.user_id));
    const mentions = assigneeUsers.map(u => {
      const username = u.username || u.name.toLowerCase().replace(/\s+/g, '');
      return `@${username}`;
    }).join(' ');
    
    const newValue = 
      textBeforeCursor.substring(0, lastAtIndex) + 
      mentions + ' ' + 
      textAfterCursor;
    
    onChange(newValue);
    setShowDropdown(false);
    
    // Set focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = lastAtIndex + mentions.length + 1;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Calculate total options for keyboard navigation (includes @all if applicable)
  const textBeforeCursor = value.substring(0, cursorPosition);
  const currentQuery = textBeforeCursor.match(/@(\w*)$/)?.[1]?.toLowerCase() || '';
  const showAllInDropdown = showAllOption && 'all'.includes(currentQuery);
  const totalOptions = filteredUsers.length + (showAllInDropdown ? 1 : 0);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalOptions - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && totalOptions > 0) {
        e.preventDefault();
        // Check if @all is selected (it's the first option when shown)
        if (showAllInDropdown && selectedIndex === 0) {
          insertAllMention();
        } else {
          const userIndex = showAllInDropdown ? selectedIndex - 1 : selectedIndex;
          insertMention(filteredUsers[userIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        return;
      } else if (e.key === 'Tab' && totalOptions > 0) {
        e.preventDefault();
        if (showAllInDropdown && selectedIndex === 0) {
          insertAllMention();
        } else {
          const userIndex = showAllInDropdown ? selectedIndex - 1 : selectedIndex;
          insertMention(filteredUsers[userIndex]);
        }
        return;
      }
    }
    
    externalOnKeyDown?.(e);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const dropdownContent = showDropdown && totalOptions > 0 && (
    <div 
      ref={dropdownRef}
        style={noPortal ? {
          position: 'absolute',
          bottom: '100%',
          marginBottom: '4px',
          left: 0,
          right: 0,
          zIndex: 99999,
        } : {
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 99999,
      }}
      className="w-64 bg-popover border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto hide-scrollbar"
    >
      <div className="p-1">
        <div className="px-2 py-1.5 text-metadata text-muted-foreground">
          Mention someone
        </div>
        {/* @all option - ping all assignees */}
        {showAllInDropdown && (
          <div
            className={cn(
              "flex items-center gap-3 px-2 py-2 cursor-pointer rounded-md transition-smooth",
              selectedIndex === 0 ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
            onClick={() => insertAllMention()}
            onMouseEnter={() => setSelectedIndex(0)}
          >
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-metadata font-semibold text-primary">@</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-body-sm truncate">Mention All</div>
              <div className="text-metadata text-muted-foreground truncate">
                Ping all {assigneeIds.length} assignee{assigneeIds.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
        {filteredUsers.map((user, index) => {
          const optionIndex = showAllInDropdown ? index + 1 : index;
          return (
            <div
              key={user.user_id}
              className={cn(
                "flex items-center gap-3 px-2 py-2 cursor-pointer rounded-md transition-smooth",
                optionIndex === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
              onClick={() => insertMention(user)}
              onMouseEnter={() => setSelectedIndex(optionIndex)}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-metadata bg-primary/10 text-primary">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-body-sm truncate">{user.name}</div>
                {user.username && (
                  <div className="text-metadata text-muted-foreground truncate">@{user.username}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cn(
          "flex w-full rounded-lg border border-input bg-card px-3 py-2 text-body-sm text-card-foreground placeholder:text-muted-foreground",
          "hover:bg-card-hover hover:border-input focus-visible:outline-none focus-visible:bg-card-hover focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/10",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden transition-smooth break-words [word-break:break-word] [overflow-wrap:break-word]",
          className
        )}
        rows={minRows}
      />
      {noPortal 
        ? dropdownContent 
        : (dropdownContent && createPortal(dropdownContent, document.body))
      }
    </div>
  );
}