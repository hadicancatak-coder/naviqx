import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  Palette,
  Heading,
  List,
  ListOrdered,
  ChevronDown,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorLinkDialog } from './EditorLinkDialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { EDITOR_COLORS } from '@/lib/constants';
import type { Editor } from '@tiptap/react';

interface Position {
  top: number;
  left: number;
  isBelow: boolean;
}

/**
 * Find the TipTap editor instance from a DOM element.
 * 
 * The useRichTextEditor hook attaches the editor to the ProseMirror DOM element
 * via __tiptap_editor. This is the canonical way to access it.
 */
function findEditorFromElement(element: Element | null): Editor | null {
  if (!element) return null;

  // Walk up the DOM tree to find a ProseMirror element with the editor attached
  let current: Element | null = element;
  let iterations = 0;
  while (current && iterations < 50) {
    iterations++;
    // Check for __tiptap_editor property (attached by useRichTextEditor)
    if ((current as any).__tiptap_editor) {
      return (current as any).__tiptap_editor as Editor;
    }
    // Check if this is a ProseMirror element
    if (current.classList?.contains('ProseMirror')) {
      const editor = (current as any).__tiptap_editor;
      if (editor) {
        return editor as Editor;
      }
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Get portal container for bubble menu
 */
function getPortalContainer(): HTMLElement {
  let container = document.getElementById('bubble-menu-portal');
  if (!container) {
    container = document.createElement('div');
    container.id = 'bubble-menu-portal';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'visible';
    container.style.zIndex = '99999';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * GlobalBubbleMenu - Site-wide formatting menu for TipTap editors
 * 
 * This component finds the active editor from the DOM selection,
 * ensuring it always operates on the correct editor instance.
 * 
 * Mount once in App.tsx - it will work with all RichTextEditor instances.
 */
export function GlobalBubbleMenu() {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, isBelow: false });
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [headingPopoverOpen, setHeadingPopoverOpen] = useState(false);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const scrollTimerRef = useRef<NodeJS.Timeout>();

  // Initialize portal container
  useEffect(() => {
    setPortalContainer(getPortalContainer());
  }, []);

  /**
   * Find editor from current selection and update position
   */
  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setShow(false);
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      setShow(false);
      return;
    }

    // Find the ProseMirror element containing the selection
    let editorElement: Element | null = null;
    if (anchorNode.nodeType === Node.ELEMENT_NODE) {
      editorElement = (anchorNode as Element).closest?.('.ProseMirror');
    }
    if (!editorElement && anchorNode.parentElement) {
      editorElement = anchorNode.parentElement.closest('.ProseMirror');
    }

    if (!editorElement) {
      setShow(false);
      return;
    }

    // Get the editor instance from the DOM element
    let currentEditor = findEditorFromElement(editorElement);

    // Fallback: use actively tracked editor if it contains this element
    if (!currentEditor && activeEditor?.view?.dom) {
      const editorDom = activeEditor.view.dom;
      if (editorDom === editorElement || editorDom.contains(editorElement)) {
        currentEditor = activeEditor;
      }
    }

    if (!currentEditor) {
      setShow(false);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        setShow(false);
        return;
      }

      const bubbleHeight = 44;
      const bubbleWidth = 340;
      const offset = 8;

      const selectionCenterX = rect.left + rect.width / 2;

      let top = rect.top - bubbleHeight - offset;
      let isBelow = false;

      if (top < 20) {
        top = rect.bottom + offset;
        isBelow = true;
      }

      let left = selectionCenterX - bubbleWidth / 2;
      if (left < 20) left = 20;
      if (left + bubbleWidth > window.innerWidth - 20) {
        left = window.innerWidth - bubbleWidth - 20;
      }

      setPosition({ top, left, isBelow });
      setActiveEditor(currentEditor);
      setShow(true);
    } catch (error) {
      console.error('Error positioning bubble menu:', error);
      setShow(false);
    }
  }, [activeEditor]);

  // Debounced selection change handler
  useEffect(() => {
    const handleSelectionChange = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(updatePosition, 100);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target?.closest('.ProseMirror')) {
        setTimeout(updatePosition, 50);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleMouseUp);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [updatePosition]);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setShow(false);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = setTimeout(updatePosition, 150);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [updatePosition]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (show) updatePosition();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [show, updatePosition]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        setShow(false);
        setColorPopoverOpen(false);
        setHeadingPopoverOpen(false);
        setLinkDialogOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  // Update position on editor transaction
  useEffect(() => {
    if (!activeEditor) return;

    const handleUpdate = () => {
      if (show) updatePosition();
    };

    activeEditor.on('transaction', handleUpdate);
    return () => {
      activeEditor.off('transaction', handleUpdate);
    };
  }, [activeEditor, updatePosition, show]);

  /**
   * Apply a formatting command to the active editor
   */
  const applyFormatting = useCallback((command: () => boolean) => {
    if (!activeEditor) {
      console.warn('[GlobalBubbleMenu] No active editor');
      return;
    }
    const result = command();
    console.log('[GlobalBubbleMenu] Command executed, result:', result);
  }, [activeEditor]);

  const handleLinkClick = () => {
    if (!activeEditor) return;
    const previousUrl = activeEditor.getAttributes('link').href;
    if (previousUrl) {
      applyFormatting(() => activeEditor.chain().focus().unsetLink().run());
    } else {
      setLinkDialogOpen(true);
    }
  };

  const handleSetLink = (url: string) => {
    if (!activeEditor || !url) return;
    applyFormatting(() =>
      activeEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    );
    setLinkDialogOpen(false);
  };

  const handleColorChange = (color: string) => {
    if (!activeEditor) return;
    applyFormatting(() =>
      color
        ? activeEditor.chain().focus().setColor(color).run()
        : activeEditor.chain().focus().unsetColor().run()
    );
    setColorPopoverOpen(false);
  };

  const BubbleButton = ({
    onClick,
    isActive = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('h-8 w-8 p-0', isActive && 'bg-accent text-accent-foreground')}
      title={title}
    >
      {children}
    </Button>
  );

  // Always render link dialog if open
  if (!activeEditor || !portalContainer) {
    return linkDialogOpen ? (
      <EditorLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSave={handleSetLink}
        initialUrl=""
      />
    ) : null;
  }

  if (!show && !linkDialogOpen) return null;

  const handleBubbleMouseDown = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const bubbleMenu = (
    <div
      ref={bubbleRef}
      onMouseDown={handleBubbleMouseDown}
      onPointerDown={handleBubbleMouseDown}
      className="bubble-menu-container fixed flex items-center gap-1 p-1 bg-popover border border-border rounded-lg shadow-soft pointer-events-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999,
      }}
    >
      <BubbleButton
        onClick={() => applyFormatting(() => activeEditor.chain().focus().toggleBold().run())}
        isActive={activeEditor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </BubbleButton>

      <BubbleButton
        onClick={() => applyFormatting(() => activeEditor.chain().focus().toggleItalic().run())}
        isActive={activeEditor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </BubbleButton>

      <BubbleButton
        onClick={() => applyFormatting(() => activeEditor.chain().focus().toggleUnderline().run())}
        isActive={activeEditor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </BubbleButton>

      <BubbleButton
        onClick={() => applyFormatting(() => activeEditor.chain().focus().toggleStrike().run())}
        isActive={activeEditor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </BubbleButton>

      <div className="w-px h-6 bg-border mx-1" />

      <BubbleButton
        onClick={handleLinkClick}
        isActive={activeEditor.isActive('link')}
        title={activeEditor.isActive('link') ? 'Remove Link' : 'Add Link (Ctrl+K)'}
      >
        <LinkIcon className="h-4 w-4" />
      </BubbleButton>

      <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Text Color"
            onPointerDown={(e) => e.preventDefault()}
          >
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="center" style={{ zIndex: 100000 }}>
          <div className="grid grid-cols-4 gap-1">
            {EDITOR_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => handleColorChange(color.value)}
                className={cn(
                  'h-8 w-8 rounded border border-border hover:scale-110 transition-transform',
                  !color.value && 'bg-background'
                )}
                style={{ backgroundColor: color.value || 'transparent' }}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Heading Selector */}
      <Popover open={headingPopoverOpen} onOpenChange={setHeadingPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 px-2 gap-1',
              (activeEditor.isActive('heading', { level: 1 }) ||
                activeEditor.isActive('heading', { level: 2 }) ||
                activeEditor.isActive('heading', { level: 3 })) &&
                'bg-accent text-accent-foreground'
            )}
            title="Heading"
            onPointerDown={(e) => e.preventDefault()}
          >
            <Heading className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-1" align="center" style={{ zIndex: 100000 }}>
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                applyFormatting(() => activeEditor.chain().focus().setParagraph().run());
                setHeadingPopoverOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors text-body-sm',
                !activeEditor.isActive('heading') && 'bg-accent/50'
              )}
            >
              <Type className="h-4 w-4" />
              Paragraph
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                applyFormatting(() => activeEditor.chain().focus().toggleHeading({ level: 1 }).run());
                setHeadingPopoverOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors font-bold text-heading-sm',
                activeEditor.isActive('heading', { level: 1 }) && 'bg-accent/50'
              )}
            >
              H1
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                applyFormatting(() => activeEditor.chain().focus().toggleHeading({ level: 2 }).run());
                setHeadingPopoverOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors font-semibold text-body',
                activeEditor.isActive('heading', { level: 2 }) && 'bg-accent/50'
              )}
            >
              H2
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                applyFormatting(() => activeEditor.chain().focus().toggleHeading({ level: 3 }).run());
                setHeadingPopoverOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors font-medium text-body-sm',
                activeEditor.isActive('heading', { level: 3 }) && 'bg-accent/50'
              )}
            >
              H3
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* List Buttons */}
      <BubbleButton
        onClick={() => {
          // Diagnostic logging
          const canToggle = activeEditor.can().toggleBulletList();
          const schema = activeEditor.schema;
          console.log('[GlobalBubbleMenu] Bullet List Debug:', {
            canToggle,
            hasListItem: !!schema.nodes.listItem,
            hasBulletList: !!schema.nodes.bulletList,
            hasParagraph: !!schema.nodes.paragraph,
            selection: activeEditor.state.selection.toJSON(),
            isCollapsed: activeEditor.state.selection.empty,
            currentNodeType: activeEditor.state.selection.$head.parent.type.name,
          });
          
          // If cannot toggle, try normalizing first
          if (!canToggle) {
            console.log('[GlobalBubbleMenu] Cannot toggle bullet list, attempting setParagraph first');
            activeEditor.chain().focus().setParagraph().run();
          }
          
          applyFormatting(() => activeEditor.chain().focus().toggleBulletList().run());
          
          // Check DOM after
          setTimeout(() => {
            const html = activeEditor.getHTML();
            console.log('[GlobalBubbleMenu] HTML after bullet list:', html.substring(0, 200));
          }, 50);
        }}
        isActive={activeEditor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </BubbleButton>

      <BubbleButton
        onClick={() => {
          // Diagnostic logging
          const canToggle = activeEditor.can().toggleOrderedList();
          console.log('[GlobalBubbleMenu] Ordered List Debug:', {
            canToggle,
            isCollapsed: activeEditor.state.selection.empty,
            currentNodeType: activeEditor.state.selection.$head.parent.type.name,
          });
          
          if (!canToggle) {
            console.log('[GlobalBubbleMenu] Cannot toggle ordered list, attempting setParagraph first');
            activeEditor.chain().focus().setParagraph().run();
          }
          
          applyFormatting(() => activeEditor.chain().focus().toggleOrderedList().run());
        }}
        isActive={activeEditor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </BubbleButton>
    </div>
  );

  return (
    <>
      {show && createPortal(bubbleMenu, portalContainer)}
      <EditorLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSave={handleSetLink}
        initialUrl={activeEditor?.getAttributes('link').href || ''}
      />
    </>
  );
}
