import { useCallback } from "react";
import { List, ListOrdered, Minus, Star, ChevronRight, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}

const FORMATTING_OPTIONS = [
  { icon: List, label: "Bullet list", insert: "• ", prefix: true },
  { icon: ListOrdered, label: "Numbered list", insert: "1. ", prefix: true },
  { icon: Minus, label: "Dash list", insert: "— ", prefix: true },
  { icon: ChevronRight, label: "Arrow point", insert: "▸ ", prefix: true },
  { icon: Star, label: "Star point", insert: "★ ", prefix: true },
  { icon: Sparkles, label: "Checkmark", insert: "✓ ", prefix: true },
] as const;

export function DescriptionToolbar({ textareaRef, value, onChange, maxLength }: Props) {
  const insertFormatting = useCallback(
    (insert: string, prefix: boolean) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      let newValue: string;

      if (prefix && start === end) {
        // No selection: insert at cursor on a new line if not at line start
        const beforeCursor = value.slice(0, start);
        const isLineStart = start === 0 || beforeCursor.endsWith("\n");
        const pre = isLineStart ? "" : "\n";
        newValue = value.slice(0, start) + pre + insert + value.slice(end);
      } else if (prefix) {
        // Selection: prefix each selected line
        const selected = value.slice(start, end);
        const lines = selected.split("\n");
        const formatted = lines.map((l, i) => {
          if (insert.match(/^\d/)) return `${i + 1}. ${l}`;
          return `${insert}${l}`;
        }).join("\n");
        newValue = value.slice(0, start) + formatted + value.slice(end);
      } else {
        newValue = value.slice(0, start) + insert + value.slice(end);
      }

      if (newValue.length <= maxLength) {
        onChange(newValue);
        // Restore focus & cursor after React re-render
        requestAnimationFrame(() => {
          ta.focus();
          const newPos = start + (newValue.length - value.length) + (start === end ? insert.length : 0);
          ta.setSelectionRange(newPos, newPos);
        });
      }
    },
    [textareaRef, value, onChange, maxLength],
  );

  return (
    <div className="flex items-center gap-0.5 p-1 border-b border-border bg-muted/30 rounded-t-lg">
      {FORMATTING_OPTIONS.map(({ icon: Icon, label, insert, prefix }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => insertFormatting(insert, prefix)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-subtle transition-smooth cursor-pointer"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-metadata">
            {label}
          </TooltipContent>
        </Tooltip>
      ))}
      <span className="ml-auto text-[10px] text-muted-foreground pr-1">Plain text · Unicode formatting</span>
    </div>
  );
}
