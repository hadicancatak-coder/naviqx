import { parseMarkdownLinks } from "@/lib/markdownParser";
import { cn } from "@/lib/utils";

interface CommentTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
  enableMentions?: boolean;
  profiles?: any[];
  /** Use inverted styling when rendered on primary/colored backgrounds */
  inverted?: boolean;
}

export function CommentText({ 
  text, 
  className = "", 
  linkClassName = "text-primary underline hover:text-primary/80",
  enableMentions = false,
  profiles = [],
  inverted = false
}: CommentTextProps) {
  const segments = parseMarkdownLinks(text);
  
  // Mention styling based on context
  const mentionClassName = inverted
    ? "bg-card/25 text-inherit px-1.5 py-0.5 rounded-md font-semibold text-body-sm inline-block"
    : "bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-md font-semibold text-body-sm inline-block";
  
  return (
    <p className={cn("whitespace-pre-wrap break-words [word-break:break-word] [overflow-wrap:break-word]", className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'link') {
          return (
            <a
              key={index}
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(linkClassName, "transition-colors")}
              onClick={(e) => e.stopPropagation()}
            >
              {segment.content}
            </a>
          );
        }
        
        // Handle mentions - always parse them for visual styling
        return segment.content.split(/(@\w+)/g).map((part, i) => {
          if (part.startsWith('@')) {
            return (
              <span 
                key={`${index}-${i}`} 
                className={mentionClassName}
              >
                {part}
              </span>
            );
          }
          return part;
        });
      })}
    </p>
  );
}
