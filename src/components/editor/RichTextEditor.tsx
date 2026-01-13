import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { setGlobalActiveEditor, clearGlobalActiveEditor, registerEditor, unregisterEditor } from './GlobalBubbleMenu';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className,
  disabled = false,
  minHeight = '80px',
  autoFocus = false,
  onBlur,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We configure these here and provide our own instances below
        // to avoid duplicate extension warnings and flaky behavior.
        link: false,
        underline: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer hover:text-primary/80',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      TextStyle,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm max-w-none focus:outline-none min-h-[80px]',
            'prose-headings:font-semibold prose-headings:text-foreground',
            'prose-p:text-foreground prose-p:my-2 prose-p:break-words',
            'prose-strong:text-foreground prose-strong:font-bold',
            'prose-em:text-foreground prose-em:italic',
            'prose-ul:list-disc prose-ul:pl-4 prose-ul:text-foreground',
            'prose-ol:list-decimal prose-ol:pl-4 prose-ol:text-foreground',
            'prose-li:text-foreground prose-li:break-words',
            'prose-a:text-primary prose-a:underline prose-a:cursor-pointer hover:prose-a:text-primary/80',
            '[&_a]:break-all [&_a]:[word-break:break-all] [&_a]:[overflow-wrap:anywhere]',
            '[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
            '[&_p.is-editor-empty:first-child]:before:text-muted-foreground',
            '[&_p.is-editor-empty:first-child]:before:float-left',
            '[&_p.is-editor-empty:first-child]:before:pointer-events-none',
            '[&_p.is-editor-empty:first-child]:before:h-0',
            'break-words [word-break:break-word] [overflow-wrap:break-word]',
          ),
        },
      },
  });

  // Sync editor content when value prop changes
  useEffect(() => {
    if (!editor) return;

    // Helper to strip HTML normalization differences for comparison
    const stripNormalization = (html: string) => 
      (html || '').replace(/<p><\/p>/g, '').replace(/<br\s*\/?>/g, '').trim();

    const currentStripped = stripNormalization(editor.getHTML());
    const valueStripped = stripNormalization(value || '');

    // Only update if actual content differs (ignoring empty tags)
    if (currentStripped !== valueStripped) {
      const desiredHtml = (value || '').trim() ? value : '<p></p>';
      editor.commands.setContent(desiredHtml, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor && autoFocus) {
      editor.commands.focus();
    }
  }, [editor, autoFocus]);

  // Update editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // Register editor in registry on mount (always, not just when focused)
  useEffect(() => {
    if (!editor) return;
    
    // Always register editor so it can be found by DOM lookup
    registerEditor(editor);
    
    return () => {
      unregisterEditor(editor);
    };
  }, [editor]);

  // Handle mouseup to explicitly set active editor (backup for focus issues in dialogs)
  const handleMouseUp = useCallback(() => {
    if (editor && !disabled) {
      setGlobalActiveEditor(editor);
    }
  }, [editor, disabled]);

  // Register with global bubble menu for focus tracking
  useEffect(() => {
    if (!editor || disabled) return;

    const handleFocus = () => setGlobalActiveEditor(editor);
    const handleBlur = () => {
      // Increased delay to allow bubble menu interaction
      setTimeout(() => {
        const activeElement = document.activeElement;
        // Check for bubble menu, popovers, dialogs, portal containers
        const isBubbleMenu = activeElement?.closest('.bubble-menu-container') || 
                            activeElement?.closest('#bubble-menu-portal') ||
                            activeElement?.closest('[class*="bubble"]');
        const isPopover = activeElement?.closest('[data-radix-popper-content-wrapper]');
        const isDialog = activeElement?.closest('[role="dialog"]');
        const isEditorElement = activeElement?.closest('.ProseMirror');
        
        if (!isBubbleMenu && !isPopover && !isDialog && !isEditorElement) {
          clearGlobalActiveEditor(editor);
        }
      }, 300);
    };

    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
      clearGlobalActiveEditor(editor);
    };
  }, [editor, disabled]);

  if (!editor) {
    return null;
  }

  return (
    <div 
      className={cn('border border-input rounded-lg bg-background overflow-hidden', className)}
      onMouseUp={handleMouseUp}
    >
      <div
        className="px-3 py-2 overflow-hidden"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} className="overflow-hidden" />
      </div>
    </div>
  );
}
