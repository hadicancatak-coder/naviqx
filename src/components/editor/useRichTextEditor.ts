import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { useEffect, useRef } from 'react';
import { suggestionConfig } from './MentionSuggestion';

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
        openOnClick: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer hover:text-primary/80',
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
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
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: suggestionConfig,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.view.dom as HTMLElement & { __tiptap_editor?: typeof editor }).__tiptap_editor = editor;
    }
    return () => {
      if (editor?.view?.dom) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (editor.view.dom as HTMLElement & { __tiptap_editor?: typeof editor }).__tiptap_editor;
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
 * 
 * CRITICAL: Uses refs to avoid dependency-triggered infinite loops.
 */
export function useSyncEditorContent(
  editor: Editor | null,
  externalValue: string
) {
  // Track the last synced value to prevent redundant updates
  const lastSyncedValueRef = useRef<string>(externalValue);
  // Track if user is actively editing
  const lastEditTimeRef = useRef(0);
  // Flag to skip sync right after setContent
  const isSyncingRef = useRef(false);

  // Track user edits via transaction (but ignore our own setContent calls)
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      // Only track if document actually changed and we're not syncing
      if (transaction.docChanged && !isSyncingRef.current) {
        lastEditTimeRef.current = Date.now();
      }
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor]);

  // Sync external content when it changes
  useEffect(() => {
    if (!editor) return;

    // Skip if value hasn't actually changed
    if (externalValue === lastSyncedValueRef.current) {
      return;
    }

    // Skip sync if editor was recently edited (within 1.5 seconds) - user is typing
    if (Date.now() - lastEditTimeRef.current < 1500) {
      return;
    }

    // Skip if editor is focused - user is actively editing
    if (editor.isFocused) {
      return;
    }

    // Normalize HTML for comparison
    const stripNormalization = (html: string) =>
      (html || '').replace(/<p><\/p>/g, '').replace(/<br\s*\/?>/g, '').trim();

    const currentStripped = stripNormalization(editor.getHTML());
    const valueStripped = stripNormalization(externalValue || '');

    if (currentStripped !== valueStripped) {
      isSyncingRef.current = true;
      const desiredHtml = (externalValue || '').trim() ? externalValue : '<p></p>';
      editor.commands.setContent(desiredHtml, { emitUpdate: false });
      lastSyncedValueRef.current = externalValue;
      // Reset syncing flag after a tick
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    } else {
      // Content is same, just update our tracking ref
      lastSyncedValueRef.current = externalValue;
    }
  }, [externalValue, editor]);
}
