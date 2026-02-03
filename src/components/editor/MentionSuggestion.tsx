import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Editor } from '@tiptap/core';

interface MentionUser {
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string | null;
}

interface MentionListProps {
  items: MentionUser[];
  command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useCallback((index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.user_id, label: item.name });
      }
    }, [items, command]);

    const upHandler = useCallback(() => {
      setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
    }, [items.length]);

    const downHandler = useCallback(() => {
      setSelectedIndex((prev) => (prev + 1) % items.length);
    }, [items.length]);

    const enterHandler = useCallback(() => {
      selectItem(selectedIndex);
    }, [selectItem, selectedIndex]);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }
        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }
        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="liquid-glass-dropdown rounded-lg p-sm border border-border shadow-lg">
          <span className="text-body-sm text-muted-foreground">No users found</span>
        </div>
      );
    }

    return (
      <div className="liquid-glass-dropdown rounded-lg border border-border shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.user_id}
            type="button"
            className={cn(
              "flex items-center gap-sm w-full px-sm py-xs text-left transition-colors",
              index === selectedIndex
                ? "bg-primary/10 text-primary"
                : "hover:bg-card-hover text-foreground"
            )}
            onClick={() => selectItem(index)}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={item.avatar_url || undefined} alt={item.name} />
              <AvatarFallback className="text-[10px] bg-muted">
                {item.name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-body-sm font-medium truncate">{item.name}</span>
            {item.username && (
              <span className="text-metadata text-muted-foreground">@{item.username}</span>
            )}
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';

// Suggestion configuration for TipTap Mention extension
export const suggestionConfig = {
  items: async ({ query }: { query: string }): Promise<MentionUser[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name, username, avatar_url')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error || !data) return [];
    return data as MentionUser[];
  },

  render: () => {
    let component: ReactRenderer<MentionListRef> | null = null;
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props: {
        editor: Editor;
        clientRect?: (() => DOMRect | null) | null;
        command: (item: { id: string; label: string }) => void;
        items: MentionUser[];
      }) => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          zIndex: 10003,
        });
      },

      onUpdate: (props: {
        clientRect?: (() => DOMRect | null) | null;
        command: (item: { id: string; label: string }) => void;
        items: MentionUser[];
      }) => {
        component?.updateProps(props);

        if (!props.clientRect) return;

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};
