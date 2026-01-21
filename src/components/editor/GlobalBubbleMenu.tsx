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

interface Position {
  top: number;
  left: number;
  isBelow: boolean;
}

// Singleton state
let globalActiveEditor: any = null;
let globalUpdateCallback: (() => void) | null = null;

// Editor registry - maps DOM elements to editor instances
const editorRegistry = new Map<Element, any>();

export function registerEditor(editor: any) {
  const view = editor?.view;
  if (view?.dom) {
    editorRegistry.set(view.dom, editor);
  }
}

export function unregisterEditor(editor: any) {
  const view = editor?.view;
  if (view?.dom) {
    editorRegistry.delete(view.dom);
  }
}

export function findEditorByElement(element: Element | null): any {
  if (!element) return null;
  
  // Walk up the DOM to find a registered editor
  let current: Element | null = element;
  while (current) {
    if (editorRegistry.has(current)) {
      return editorRegistry.get(current);
    }
    // Check for ProseMirror class
    if (current.classList?.contains('ProseMirror')) {
      const found = editorRegistry.get(current);
      if (found) return found;
    }
    current = current.parentElement;
  }
  
  // Fallback: check all registered editors to find one containing this element
  for (const [dom, editor] of editorRegistry.entries()) {
    if (dom.contains(element)) {
      return editor;
    }
  }
  
  return null;
}

export function setGlobalActiveEditor(editor: any) {
  globalActiveEditor = editor;
  registerEditor(editor);
  globalUpdateCallback?.();
}

export function clearGlobalActiveEditor(editor: any) {
  if (globalActiveEditor === editor) {
    globalActiveEditor = null;
    globalUpdateCallback?.();
  }
}

// Create or get portal container
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

export function GlobalBubbleMenu() {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, isBelow: false });
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [headingPopoverOpen, setHeadingPopoverOpen] = useState(false);
  const [activeEditor, setActiveEditor] = useState<any>(null);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  const bubbleRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const scrollTimerRef = useRef<NodeJS.Timeout>();

  // Initialize portal container
  useEffect(() => {
    setPortalContainer(getPortalContainer());
    return () => {
      // Don't remove the container as other instances might use it
    };
  }, []);

  // Register update callback
  useEffect(() => {
    globalUpdateCallback = () => setActiveEditor(globalActiveEditor);
    return () => {
      globalUpdateCallback = null;
    };
  }, []);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedRange(selection.getRangeAt(0).cloneRange());
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedRange && activeEditor) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
    }
  }, [savedRange, activeEditor]);

  const updatePosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setShow(false);
      return;
    }

    // Check if selection is inside an editor
    const anchorNode = selection.anchorNode;
    if (!anchorNode) {
      setShow(false);
      return;
    }

    // Improved editor element detection - check node and parent hierarchy
    let editorElement: Element | null = null;
    if (anchorNode.nodeType === Node.ELEMENT_NODE) {
      editorElement = (anchorNode as Element).closest?.('.ProseMirror');
    }
    if (!editorElement && anchorNode.parentElement) {
      editorElement = anchorNode.parentElement.closest('.ProseMirror');
    }
    // Also check if we're inside any contenteditable
    if (!editorElement && anchorNode.parentElement) {
      editorElement = anchorNode.parentElement.closest('[contenteditable="true"]');
    }
    
    if (!editorElement) {
      setShow(false);
      return;
    }

    // Try to find editor: first from active state, then from registry
    let currentEditor = activeEditor || globalActiveEditor;
    
    // If no active editor, try to find from registry using the DOM element
    if (!currentEditor && editorElement) {
      currentEditor = findEditorByElement(editorElement);
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

      // Save the current selection
      setSavedRange(range.cloneRange());

      // Bubble dimensions (approximate)
      const bubbleHeight = 44;
      const bubbleWidth = 300;
      const offset = 8;

      // Calculate center of selection
      const selectionCenterX = rect.left + rect.width / 2;

      // Try positioning above first
      let top = rect.top - bubbleHeight - offset;
      let isBelow = false;

      // If not enough space above, position below
      if (top < 20) {
        top = rect.bottom + offset;
        isBelow = true;
      }

      // Horizontal centering with boundary constraints
      let left = selectionCenterX - bubbleWidth / 2;
      
      // Constrain within viewport
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

  // Debounced update on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        updatePosition();
      }, 100);
    };

    // Handle mouseup as backup trigger for bubble menu in dialogs
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as Element;
      // Only trigger if inside a ProseMirror editor
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

  // Handle scroll - hide during scroll, reposition after
  useEffect(() => {
    const handleScroll = () => {
      setShow(false);
      
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
      
      scrollTimerRef.current = setTimeout(() => {
        updatePosition();
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [updatePosition]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (show) {
        updatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [show, updatePosition]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        setShow(false);
        setColorPopoverOpen(false);
        setLinkDialogOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  // Update when editor changes
  useEffect(() => {
    if (activeEditor) {
      const handleUpdate = () => {
        // Don't close menu on transaction updates
        if (show) {
          updatePosition();
        }
      };
      
      activeEditor.on('transaction', handleUpdate);
      activeEditor.on('focus', handleUpdate);

      return () => {
        activeEditor.off('transaction', handleUpdate);
        activeEditor.off('focus', handleUpdate);
      };
    }
  }, [activeEditor, updatePosition, show]);

  const applyFormatting = useCallback((command: () => any) => {
    const currentEditor = activeEditor || globalActiveEditor;
    if (!currentEditor) {
      console.log('[BubbleMenu] No editor available');
      return;
    }

    // Log before command
    const selection = currentEditor.state.selection;
    const contentBefore = currentEditor.getHTML();
    console.log('[BubbleMenu] Before command', {
      hasSelection: !selection.empty,
      from: selection.from,
      to: selection.to,
      editorFocused: currentEditor.isFocused,
      contentPreview: contentBefore.substring(0, 100),
    });

    // Run the command
    const result = command();
    
    // Check content after
    const contentAfter = currentEditor.getHTML();
    console.log('[BubbleMenu] After command', {
      result,
      contentChanged: contentBefore !== contentAfter,
      contentPreview: contentAfter.substring(0, 100),
    });

    // Content change is handled by the transaction listener in RichTextEditor
    // No manual emit needed - the editor's onChange will fire naturally
  }, [activeEditor]);

  const handleLinkClick = () => {
    const currentEditor = activeEditor || globalActiveEditor;
    if (!currentEditor) return;
    
    // Save selection before opening dialog
    saveSelection();
    
    const previousUrl = currentEditor.getAttributes('link').href;
    if (previousUrl) {
      applyFormatting(() => currentEditor.chain().focus().unsetLink().run());
    } else {
      setLinkDialogOpen(true);
    }
  };

  const handleSetLink = (url: string) => {
    const currentEditor = activeEditor || globalActiveEditor;
    if (!currentEditor || !url) return;
    
    applyFormatting(() => {
      currentEditor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    });
    
    setLinkDialogOpen(false);
  };

  const handleColorChange = (color: string) => {
    const currentEditor = activeEditor || globalActiveEditor;
    if (!currentEditor) return;
    
    applyFormatting(() => {
      if (color) {
        currentEditor.chain().focus().setColor(color).run();
      } else {
        currentEditor.chain().focus().unsetColor().run();
      }
    });
    
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
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-accent text-accent-foreground'
      )}
      title={title}
    >
      {children}
    </Button>
  );

  const currentActiveEditor = activeEditor || globalActiveEditor;
  
  // Always render dialog even if bubble menu is hidden
  // Only return null if no editor AND dialog is closed
  if (!currentActiveEditor || !portalContainer) {
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

  // Prevent bubble menu clicks from closing it
  const handleBubbleMouseDown = (e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const bubbleMenu = (
    <div
      ref={bubbleRef}
      onMouseDown={handleBubbleMouseDown}
      onPointerDown={handleBubbleMouseDown}
      onTouchStart={handleBubbleMouseDown}
      className="bubble-menu-container fixed flex items-center gap-1 p-1 bg-popover border border-border rounded-lg shadow-soft pointer-events-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 99999,
      }}
    >
      <BubbleButton
        onClick={() => applyFormatting(() => currentActiveEditor.chain().focus().toggleBold().run())}
        isActive={currentActiveEditor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </BubbleButton>

      <BubbleButton
        onClick={() => applyFormatting(() => currentActiveEditor.chain().focus().toggleItalic().run())}
        isActive={currentActiveEditor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </BubbleButton>

      <BubbleButton
        onClick={() => applyFormatting(() => currentActiveEditor.chain().focus().toggleUnderline().run())}
        isActive={currentActiveEditor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </BubbleButton>

      <BubbleButton
        onClick={() => applyFormatting(() => currentActiveEditor.chain().focus().toggleStrike().run())}
        isActive={currentActiveEditor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </BubbleButton>

      <div className="w-px h-6 bg-border mx-1" />

      <BubbleButton
        onClick={handleLinkClick}
        isActive={currentActiveEditor.isActive('link')}
        title={currentActiveEditor.isActive('link') ? 'Remove Link' : 'Add Link (Ctrl+K)'}
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
              "h-8 px-2 gap-1",
              (currentActiveEditor.isActive('heading', { level: 1 }) ||
               currentActiveEditor.isActive('heading', { level: 2 }) ||
               currentActiveEditor.isActive('heading', { level: 3 })) && 'bg-accent text-accent-foreground'
            )}
            title="Heading"
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
                applyFormatting(() => currentActiveEditor.chain().focus().setParagraph().run());
                setHeadingPopoverOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors text-body-sm",
                !currentActiveEditor.isActive('heading') && 'bg-accent/50'
              )}
            >
              <Type className="h-4 w-4" />
              Paragraph
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                applyFormatting(() => currentActiveEditor.chain().focus().toggleHeading({ level: 1 }).run());
                setHeadingPopoverOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors font-bold text-heading-sm",
                currentActiveEditor.isActive('heading', { level: 1 }) && 'bg-accent/50'
              )}
            >
              H1
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                applyFormatting(() => currentActiveEditor.chain().focus().toggleHeading({ level: 2 }).run());
                setHeadingPopoverOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors font-semibold text-body",
                currentActiveEditor.isActive('heading', { level: 2 }) && 'bg-accent/50'
              )}
            >
              H2
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                applyFormatting(() => currentActiveEditor.chain().focus().toggleHeading({ level: 3 }).run());
                setHeadingPopoverOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors font-medium text-body-sm",
                currentActiveEditor.isActive('heading', { level: 3 }) && 'bg-accent/50'
              )}
            >
              H3
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* List Buttons */}
      <BubbleButton
        onClick={() => applyFormatting(() => currentActiveEditor.chain().focus().toggleBulletList().run())}
        isActive={currentActiveEditor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </BubbleButton>

      <BubbleButton
        onClick={() => applyFormatting(() => currentActiveEditor.chain().focus().toggleOrderedList().run())}
        isActive={currentActiveEditor.isActive('orderedList')}
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
        initialUrl={currentActiveEditor?.getAttributes('link').href || ''}
      />
    </>
  );
}
