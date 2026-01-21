import { EditorContent, Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { useRichTextEditor, useSyncEditorContent } from './useRichTextEditor';

interface RichTextEditorProps {
  /** Pre-created editor instance. If provided, this component only renders. */
  editor?: Editor | null;
  /** HTML content value (only used if no editor prop is provided) */
  value?: string;
  /** Called when content changes (only used if no editor prop is provided) */
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}

/**
 * RichTextEditor - Flexible rich text component
 * 
 * Can be used in two modes:
 * 
 * 1. MANAGED MODE (recommended for simple cases):
 *    <RichTextEditor value={html} onChange={setHtml} />
 *    - Creates its own editor instance internally
 *    - Good for standalone use without toolbar/bubble menu
 * 
 * 2. CONTROLLED MODE (required for toolbar/bubble menu integration):
 *    const editor = useRichTextEditor({ onChange: setHtml });
 *    <EditorToolbar editor={editor} />
 *    <RichTextEditor editor={editor} />
 *    <GlobalBubbleMenu /> // Will find this editor via registry
 *    - Uses externally created editor instance
 *    - Single source of truth for all UI controls
 */
export function RichTextEditor({
  editor: externalEditor,
  value = '',
  onChange,
  placeholder = 'Start typing...',
  className,
  disabled = false,
  minHeight = '80px',
  autoFocus = false,
  onBlur,
}: RichTextEditorProps) {
  // Create internal editor only if no external editor is provided
  const internalEditor = useRichTextEditor(
    externalEditor ? undefined : {
      initialContent: value,
      placeholder,
      disabled,
      onChange,
      onBlur,
    }
  );

  // Use external editor if provided, otherwise use internal
  const editor = externalEditor ?? internalEditor;

  // Sync external value changes (only for managed mode)
  useSyncEditorContent(
    externalEditor ? null : editor, // Only sync if using internal editor
    value
  );

  // Auto-focus if requested
  if (editor && autoFocus && !editor.isFocused) {
    editor.commands.focus();
  }

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border border-input rounded-lg bg-background overflow-hidden', className)}>
      <div
        className="px-3 py-2 overflow-hidden"
        style={{ minHeight }}
      >
        <EditorContent 
          editor={editor} 
          className={cn(
            'overflow-hidden',
            'prose prose-sm max-w-none focus:outline-none',
            'prose-headings:font-semibold prose-headings:text-foreground',
            'prose-p:text-foreground prose-p:my-2 prose-p:break-words',
            'prose-strong:text-foreground prose-strong:font-bold',
            'prose-em:text-foreground prose-em:italic',
            'prose-ul:list-disc prose-ul:pl-4 prose-ul:text-foreground',
            'prose-ol:list-decimal prose-ol:pl-4 prose-ol:text-foreground',
            'prose-li:text-foreground prose-li:break-words',
            'prose-a:text-primary prose-a:underline prose-a:cursor-pointer hover:prose-a:text-primary/80',
            '[&_a]:break-all [&_a]:[word-break:break-all] [&_a]:[overflow-wrap:anywhere]',
            '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[60px]',
            '[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
            '[&_p.is-editor-empty:first-child]:before:text-muted-foreground',
            '[&_p.is-editor-empty:first-child]:before:float-left',
            '[&_p.is-editor-empty:first-child]:before:pointer-events-none',
            '[&_p.is-editor-empty:first-child]:before:h-0',
            'break-words [word-break:break-word] [overflow-wrap:break-word]',
          )}
        />
      </div>
    </div>
  );
}

// Re-export hook for controlled usage
export { useRichTextEditor, useSyncEditorContent } from './useRichTextEditor';
