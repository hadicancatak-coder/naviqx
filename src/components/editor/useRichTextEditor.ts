import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';

interface UseRichTextEditorOptions {
  initialContent?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (html: string) => void;
  onBlur?: () => void;
}

/**
 * Single source of truth for editor instantiation.
 * 
 * This hook creates ONE TipTap editor instance that should be passed
 * down to all consumers: EditorContent, Toolbar, BubbleMenu, etc.
 * 
 * NEVER call useEditor() inside child components.
 */
export function useRichTextEditor({
  initialContent = '',
  placeholder = 'Start typing...',
  disabled = false,
  onChange,
  onBlur,
}: UseRichTextEditorOptions = {}): Editor | null {
  // Track if the change was triggered by the editor itself
  const isInternalChange = useRef(false);
  // Track last update time to prevent external sync during active editing
  const lastEditTimeRef = useRef(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable built-in link/underline to use our configured versions
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
    content: initialContent || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      lastEditTimeRef.current = Date.now();
      onChange?.(editor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  // Attach editor to DOM for GlobalBubbleMenu discovery
  useEffect(() => {
    if (editor?.view?.dom) {
      (editor.view.dom as any).__tiptap_editor = editor;
    }
    return () => {
      if (editor?.view?.dom) {
        delete (editor.view.dom as any).__tiptap_editor;
      }
    };
  }, [editor]);

  // Update editable state when disabled prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  return editor;
}

/**
 * Sync external content into an existing editor instance.
 * Only syncs when content actually differs and editor is not focused.
 */
export function useSyncEditorContent(
  editor: Editor | null,
  externalValue: string
) {
  const isInternalChange = useRef(false);
  const lastEditTimeRef = useRef(0);

  // Track internal changes via transaction
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      isInternalChange.current = true;
      lastEditTimeRef.current = Date.now();
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor]);

  // Sync external content when it changes
  useEffect(() => {
    if (!editor) return;

    // Skip if this was triggered by our own change
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    // Skip sync if editor was recently edited (within 1 second)
    if (Date.now() - lastEditTimeRef.current < 1000) {
      return;
    }

    // Skip if editor is focused
    if (editor.isFocused) {
      return;
    }

    // Normalize HTML for comparison
    const stripNormalization = (html: string) =>
      (html || '').replace(/<p><\/p>/g, '').replace(/<br\s*\/?>/g, '').trim();

    const currentStripped = stripNormalization(editor.getHTML());
    const valueStripped = stripNormalization(externalValue || '');

    if (currentStripped !== valueStripped) {
      const desiredHtml = (externalValue || '').trim() ? externalValue : '<p></p>';
      editor.commands.setContent(desiredHtml, { emitUpdate: false });
    }
  }, [externalValue, editor]);
}
